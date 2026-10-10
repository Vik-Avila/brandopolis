import { AppError, schema, states } from './contracts.js';

/**
 * ADR-0031 · external operations (Google Ads, Meta Ads, Canva). Pure rules shared by the engine, the worker and the
 * tests. The database enforces the same dispatch conditions atomically; this module explains them and decides what
 * a human may do with an uncertain step. Nothing here performs I/O.
 *
 * Contract highlights:
 * - The confirmed transition of a step to DISPATCHING is the logical start of an attempt. From then on the attempt is
 *   "in flight" even without a provider answer.
 * - A worker without a valid lease can never START another attempt (conditional transition). Losing a lease does not,
 *   by itself, stop an attempt that already started from reaching the provider late.
 * - An uncertain step is never resent automatically. A human retry needs, at the same time: verifiable evidence that
 *   the attempt can no longer emit the call, a remote result resolved AFTER that evidence, and a valid authorization.
 *   A lease loss, a suspension, an expired deadline or an empty lookup is never such evidence.
 */
export type AuthorizationStatus = 'PENDING' | 'AUTHORIZED' | 'RESERVED' | 'CONSUMED' | 'CANCELLED' | 'EXPIRED';
export type JobStatus = 'QUEUED' | 'CLAIMED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'NEEDS_CHECK' | 'PARTIAL' | 'EXPIRED' | 'CANCELLED';
export type StepStatus = 'PENDING' | 'DISPATCHING' | 'SUCCEEDED' | 'REJECTED' | 'NEEDS_CHECK' | 'NOT_CREATED';
export type Operation = 'CREATE_PAUSED' | 'ACTIVATE' | 'PAUSE' | 'UPDATE_BUDGET';
export type OutcomeKind = 'PROVIDER_SUCCESS' | 'PROVIDER_REJECTED' | 'AMBIGUOUS' | 'NOT_SENT_DEADLINE' | 'RECONCILED_FOUND' | 'REMOTE_ABSENCE_CONFIRMED' | 'EMIT_IMPOSSIBLE' | 'LATE_RESULT';

// JSON schemas are the executable source of states; the unions above must match them (checked in tests).
export const AUTHORIZATION_STATUSES = states('operation-authorization', 'status') as AuthorizationStatus[];
export const OPERATIONS = states('operation-authorization', 'operation') as Operation[];
export const JOB_STATUSES = states('external-job', 'status') as JobStatus[];
export const STEP_STATUSES = schema('external-job').properties.steps.items.properties.status.enum as StepStatus[];
export const OUTCOME_KINDS = states('external-attempt-outcome', 'kind') as OutcomeKind[];

const AUTHORIZATION_TRANSITIONS: Record<AuthorizationStatus, readonly AuthorizationStatus[]> = {
  PENDING: ['AUTHORIZED', 'CANCELLED', 'EXPIRED'],
  AUTHORIZED: ['RESERVED', 'CANCELLED', 'EXPIRED'],
  // The reservation never extends the human-approved deadline: a reserved authorization can still expire or be
  // cancelled while steps remain unsent.
  RESERVED: ['CONSUMED', 'CANCELLED', 'EXPIRED'],
  CONSUMED: [], CANCELLED: [], EXPIRED: []
};
const STEP_TRANSITIONS: Record<StepStatus, readonly StepStatus[]> = {
  PENDING: ['DISPATCHING'],
  // Back to PENDING only when the worker itself records that it never opened the connection (deadline passed).
  DISPATCHING: ['SUCCEEDED', 'REJECTED', 'NEEDS_CHECK', 'PENDING'],
  SUCCEEDED: [],
  // A definite provider rejection without remote effect admits a NEW attempt under a valid authorization.
  REJECTED: ['DISPATCHING'],
  NEEDS_CHECK: ['SUCCEEDED', 'NOT_CREATED'],
  // Human retry with the three conditions of retryGate().
  NOT_CREATED: ['DISPATCHING']
};

export function authorizationTransition(from: AuthorizationStatus, to: AuthorizationStatus) {
  if (!AUTHORIZATION_TRANSITIONS[from].includes(to)) throw new AppError('CONFLICT', `Authorization ${from} -> ${to} is not allowed`);
  return to;
}
export function stepTransition(from: StepStatus, to: StepStatus) {
  if (!STEP_TRANSITIONS[from].includes(to)) throw new AppError('CONFLICT', `Step ${from} -> ${to} is not allowed`);
  return to;
}

/** Operations that change what is published or what may be spent need a confirmed amount summary; PAUSE reduces spend. */
export const needsBudgetConfirmation = (operation: Operation) => operation === 'CREATE_PAUSED' || operation === 'ACTIVATE' || operation === 'UPDATE_BUDGET';

export type DispatchSnapshot = {
  now: Date;
  job: { status: JobStatus; claimedBy: string | null; leaseNumber: number; leaseUntil: Date | null };
  worker: { instanceId: string; leaseNumber: number; terminated: boolean };
  // REJECTED / NOT_CREATED steps need a persisted human release for this exact next attempt (C1).
  step: { status: StepStatus; released: boolean };
  authorization: { status: AuthorizationStatus; reservedJobId: string | null; expiresAt: Date; contentFingerprint: string };
  jobId: string;
  expectedFingerprint: string;
  connection: { status: string; linkedToBrand: boolean };
  actorHoldsSpend: boolean;
  brandClosing: boolean;
  measurement?: { required: boolean; verifiedForLivePublication: boolean };
};

/**
 * Every reason why a step may NOT be dispatched now. Empty means the conditional transition to DISPATCHING may be
 * attempted. The SQL statement repeats these conditions atomically; this list explains a refusal.
 */
export function dispatchBlockers(s: DispatchSnapshot): string[] {
  const out: string[] = [];
  if (s.job.claimedBy !== s.worker.instanceId || s.job.leaseNumber !== s.worker.leaseNumber) out.push('LEASE_NOT_HELD');
  if (!s.job.leaseUntil || s.job.leaseUntil <= s.now) out.push('LEASE_EXPIRED');
  // Fencing: a worker recorded as terminated never starts an attempt, even if it is in fact still alive.
  if (s.worker.terminated) out.push('WORKER_TERMINATED');
  if (s.job.status !== 'CLAIMED' && s.job.status !== 'RUNNING') out.push('JOB_NOT_RUNNABLE');
  if (s.step.status !== 'PENDING' && s.step.status !== 'REJECTED' && s.step.status !== 'NOT_CREATED') out.push('STEP_NOT_DISPATCHABLE');
  else if (s.step.status !== 'PENDING' && !s.step.released) out.push('HUMAN_RELEASE_REQUIRED');
  if (s.authorization.status !== 'RESERVED' || s.authorization.reservedJobId !== s.jobId) out.push('AUTHORIZATION_NOT_RESERVED');
  if (s.authorization.expiresAt <= s.now) out.push('AUTHORIZATION_EXPIRED');
  if (s.authorization.contentFingerprint !== s.expectedFingerprint) out.push('CONTENT_CHANGED');
  if (s.connection.status !== 'ACTIVE' || !s.connection.linkedToBrand) out.push('CONNECTION_UNAVAILABLE');
  if (!s.actorHoldsSpend) out.push('CAPABILITY_REVOKED');
  if (s.brandClosing) out.push('BRAND_CLOSING');
  if (s.measurement?.required && !s.measurement.verifiedForLivePublication) out.push('MEASUREMENT_NOT_VERIFIED');
  return out;
}

/** The end of the window after which a contract-abiding worker can no longer send that attempt. */
export const closureWindowEnd = (dispatchBy: Date, requestTimeoutMs: number, clockSkewMs: number) =>
  new Date(dispatchBy.getTime() + requestTimeoutMs + clockSkewMs);

/** Right before opening the connection: a worker past dispatchBy (minus skew margin) must not send. */
export const mayStillOpenConnection = (now: Date, dispatchBy: Date, clockSkewMs: number) => now.getTime() + clockSkewMs < dispatchBy.getTime();

export type EmitImpossibleEvidence =
  | { type: 'PROCESS_TERMINATED'; observer: string; observedAt: Date }
  | { type: 'CREDENTIAL_UNUSABLE'; reason: 'EXPIRED' | 'REVOKED'; at: Date };

export type RemoteResolution =
  | { type: 'FOUND'; providerIds: Record<string, string> }
  | { type: 'ABSENCE_CONFIRMED'; source: 'CHANGE_HISTORY'; coveredFrom: Date; coveredUntil: Date; consultedAt: Date }
  | { type: 'UNRESOLVED' };

export type RetryDecision = { allowed: true } | { allowed: false; reason: string; action: 'LINK_RESULT' | 'KEEP_PENDING' | 'NEW_AUTHORIZATION' };

/**
 * ADR-0031 C1 · may a person retry an uncertain step? Only when all three hold:
 * 1. evidence that the attempt can no longer emit (terminated process observed by its supervisor, or the PROVIDER's
 *    confirmation that the attempt's credential is no longer accepted — a date stored in Brandopolis is not evidence);
 * 2. the remote result is resolved after that evidence: a found resource is LINKED and never retried; absence must be
 *    confirmed by the provider's change history covering the whole attempt, consulted after evidence + processing window;
 * 3. a valid authorization covering the step, a human criterion and the spend capability.
 */
export function retryGate(input: {
  stepStatus: StepStatus;
  attemptStartedAt: Date;
  evidence: EmitImpossibleEvidence | null;
  resolution: RemoteResolution;
  processingWindowMs: number;
  authorizationValid: boolean;
  actorHoldsSpend: boolean;
  criterion: string;
}): RetryDecision {
  if (input.stepStatus !== 'NEEDS_CHECK' && input.stepStatus !== 'NOT_CREATED') return { allowed: false, reason: 'STEP_NOT_UNCERTAIN', action: 'KEEP_PENDING' };
  if (input.resolution.type === 'FOUND') return { allowed: false, reason: 'PROVIDER_CONFIRMED_SUCCESS', action: 'LINK_RESULT' };
  if (!input.evidence) return { allowed: false, reason: 'NO_EVIDENCE_THAT_ATTEMPT_CANNOT_EMIT', action: 'KEEP_PENDING' };
  const evidenceAt = input.evidence.type === 'PROCESS_TERMINATED' ? input.evidence.observedAt : input.evidence.at;
  if (input.resolution.type !== 'ABSENCE_CONFIRMED') return { allowed: false, reason: 'REMOTE_RESULT_UNRESOLVED', action: 'KEEP_PENDING' };
  const mustCoverUntil = evidenceAt.getTime() + input.processingWindowMs;
  if (input.resolution.coveredFrom.getTime() > input.attemptStartedAt.getTime()) return { allowed: false, reason: 'ABSENCE_DOES_NOT_COVER_ATTEMPT_START', action: 'KEEP_PENDING' };
  if (input.resolution.coveredUntil.getTime() < mustCoverUntil || input.resolution.consultedAt.getTime() < mustCoverUntil) return { allowed: false, reason: 'ABSENCE_CHECKED_TOO_EARLY', action: 'KEEP_PENDING' };
  if (!input.actorHoldsSpend) return { allowed: false, reason: 'CAPABILITY_REQUIRED', action: 'KEEP_PENDING' };
  if (input.criterion.trim().length < 10) return { allowed: false, reason: 'CRITERION_REQUIRED', action: 'KEEP_PENDING' };
  if (!input.authorizationValid) return { allowed: false, reason: 'AUTHORIZATION_REQUIRED', action: 'NEW_AUTHORIZATION' };
  return { allowed: true };
}

/** Steps whose state blocks any new job (or duplicate) for the same subject until resolved. */
export const UNRESOLVED_STEP_STATUSES: readonly StepStatus[] = ['DISPATCHING', 'NEEDS_CHECK'];

/** Job status derived from its steps after an outcome is recorded (authorization handled by the caller). */
export function jobStatusFromSteps(steps: readonly StepStatus[], authorizationUsable: boolean): JobStatus {
  if (steps.every(s => s === 'SUCCEEDED')) return 'SUCCEEDED';
  // NOT_CREATED waits for a human decision: it never makes a job runnable by itself.
  if (steps.some(s => s === 'NEEDS_CHECK' || s === 'DISPATCHING' || s === 'NOT_CREATED')) return 'NEEDS_CHECK';
  const done = steps.filter(s => s === 'SUCCEEDED').length;
  if (!authorizationUsable) return done ? 'PARTIAL' : 'EXPIRED';
  if (steps.some(s => s === 'REJECTED')) return done ? 'PARTIAL' : 'FAILED';
  return 'RUNNING';
}
