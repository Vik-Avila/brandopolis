import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import { AppError, validate } from '../domain/contracts.js';
import { holds } from '../domain/brand-capabilities.js';
import { contentFingerprint } from '../domain/editorial-versions.js';
import {
  closureWindowEnd, dispatchBlockers, jobStatusFromSteps, mayStillOpenConnection, needsBudgetConfirmation, retryGate,
  UNRESOLVED_STEP_STATUSES, type AuthorizationStatus, type EmitImpossibleEvidence, type JobStatus, type Operation,
  type OutcomeKind, type RemoteResolution, type StepStatus
} from '../domain/external-operations.js';
import type { Database, Transaction } from '../persistence/database.js';
import * as t from '../persistence/schema.js';
import { grantedCapabilities, type BrandActor } from './brand-access.js';
import type { Vault } from './credential-vault.js';
import type { ProviderAdapter } from './provider-adapter.js';
import { campaignMeasurement } from './campaigns.js';

export type ExternalConfig = {
  leaseMs: number;               // worker lease length
  dispatchWindowMs: number;      // dispatchBy = attempt start + this
  requestTimeoutMs: number;      // provider request time limit
  clockSkewMs: number;           // margin for clock differences
  processingWindowMs: number;    // provider processing margin after emit-impossible evidence
  authorizationTtlMs: number;    // human authorization lifetime (never extended by a reservation)
};
export const DEFAULT_EXTERNAL_CONFIG: ExternalConfig = {
  leaseMs: 60_000, dispatchWindowMs: 5_000, requestTimeoutMs: 30_000, clockSkewMs: 2_000, processingWindowMs: 300_000, authorizationTtlMs: 30 * 60_000
};

const PROVIDERS = ['GOOGLE_ADS', 'META_ADS', 'CANVA'] as const;
const TERMINAL_JOB: readonly JobStatus[] = ['SUCCEEDED', 'FAILED', 'EXPIRED', 'CANCELLED'];
/** Remote steps per provider and operation (ADR-0031 coverage). Unknown pairs are rejected. */
const STEP_PLANS: Record<string, Partial<Record<Operation, string[]>>> = {
  GOOGLE_ADS: { CREATE_PAUSED: ['budget', 'campaign', 'ad_group', 'keywords', 'ad'], ACTIVATE: ['activate'], PAUSE: ['pause'], UPDATE_BUDGET: ['budget_update'] },
  META_ADS: { CREATE_PAUSED: ['campaign', 'ad_set', 'creative', 'ad'], ACTIVATE: ['activate'], PAUSE: ['pause'], UPDATE_BUDGET: ['budget_update'] }
};

type Hooks = { beforeNetworkWrite?: (attemptId: string) => Promise<void> | void };

/**
 * ADR-0031 · persisted queue, worker leases, per-step attempts and reconciliation. Human-facing methods receive a
 * BrandActor resolved by Engine.withBrandActor inside the caller's transaction; worker methods are system-only.
 */
export class ExternalOperations {
  constructor(private db: Database, private vault: Vault | undefined, private adapter: ProviderAdapter, private config: ExternalConfig = DEFAULT_EXTERNAL_CONFIG, private clock: () => Date = () => new Date(), private hooks: Hooks = {}) {}

  private requireVault(): Vault {
    if (!this.vault) throw new AppError('UNAVAILABLE', 'Credential storage is not configured');
    return this.vault;
  }
  private aad = (workspaceId: string, connectionId: string) => `${workspaceId}:${connectionId}`;

  // ── Connections ───────────────────────────────────────────────────────────────────────────────────────────────
  /** Stores a provider credential obtained by a completed authorization flow. The secret is sealed, never returned. */
  async storeConnection(tx: Transaction, actor: BrandActor, input: { provider: string; accountLabel: string; scopes: string[]; secret: string; perUser: boolean }) {
    if (!holds(actor.role, actor.capabilities, 'MANAGE_CONNECTIONS')) throw new AppError('FORBIDDEN', 'Managing connections requires its capability');
    if (!(PROVIDERS as readonly string[]).includes(input.provider)) throw new AppError('INVALID', 'Unknown provider');
    if (!input.secret || !input.accountLabel || input.accountLabel.length > 200) throw new AppError('INVALID', 'Invalid connection');
    if (!Array.isArray(input.scopes) || input.scopes.length > 20 || input.scopes.some(s => typeof s !== 'string' || !s || s.length > 200)) throw new AppError('INVALID', 'Invalid scopes');
    const vault = this.requireVault(), id = randomUUID(), now = this.clock();
    await tx.insert(t.connections).values({ id, workspaceId: actor.workspaceId, provider: input.provider, accountLabel: input.accountLabel, scopes: input.scopes, ownerUserId: input.perUser ? actor.userId : null, connectedBy: actor.userId, status: 'ACTIVE', credentialCiphertext: vault.seal(input.secret, this.aad(actor.workspaceId, id)), credentialKeyId: vault.keyId, createdAt: now, updatedAt: now });
    return { id, provider: input.provider, accountLabel: input.accountLabel, status: 'ACTIVE' };
  }

  /** Links one external account of a workspace connection to this brand. One active link per account. */
  async linkAccount(tx: Transaction, actor: BrandActor, input: { connectionId: string; externalAccountId: string; externalAccountLabel: string }) {
    if (!holds(actor.role, actor.capabilities, 'MANAGE_CONNECTIONS')) throw new AppError('FORBIDDEN', 'Managing connections requires its capability');
    const [connection] = await tx.select().from(t.connections).where(and(eq(t.connections.workspaceId, actor.workspaceId), eq(t.connections.id, input.connectionId)));
    if (!connection || connection.status !== 'ACTIVE') throw new AppError('NOT_FOUND', 'Connection not available');
    if (connection.ownerUserId && connection.ownerUserId !== actor.userId) throw new AppError('NOT_FOUND', 'Connection not available');
    // A workspace credential is linked to a brand by the person who connected it or by an ADMIN, never by any member.
    if (actor.role !== 'ADMIN' && connection.connectedBy !== actor.userId) throw new AppError('FORBIDDEN', 'Only who connected this account or an administrator can link it');
    if (typeof input.externalAccountId !== 'string' || !input.externalAccountId || input.externalAccountId.length > 200 || typeof input.externalAccountLabel !== 'string' || !input.externalAccountLabel || input.externalAccountLabel.length > 200) throw new AppError('INVALID', 'Invalid account');
    // The account must really be accessible with this credential (provider list), not just typed by a user.
    const secret = this.requireVault().open(connection.credentialCiphertext ?? '', connection.credentialKeyId ?? '', this.aad(connection.workspaceId, connection.id));
    if (!(await this.adapter.listAccounts(connection.provider, secret)).some(a => a.id === input.externalAccountId)) throw new AppError('NOT_FOUND', 'Account not accessible with this connection');
    const id = randomUUID();
    const inserted = await tx.insert(t.connectionBrandLinks).values({ id, workspaceId: actor.workspaceId, brandId: actor.brandId, connectionId: connection.id, externalAccountId: input.externalAccountId, externalAccountLabel: input.externalAccountLabel, linkedBy: actor.userId, linkedAt: this.clock() }).onConflictDoNothing().returning({ id: t.connectionBrandLinks.id });
    if (!inserted.length) throw new AppError('CONFLICT', 'That account is already linked to a brand');
    return { id, connectionId: connection.id, externalAccountLabel: input.externalAccountLabel };
  }

  // ── Authorization (human) ─────────────────────────────────────────────────────────────────────────────────────
  /** Share lock on the brand row: serializes human external operations with a concurrent brand deletion (FOR UPDATE). */
  private async lockBrand(tx: Transaction, actor: BrandActor) {
    const [brand] = await tx.select({ id: t.brands.id }).from(t.brands).where(and(eq(t.brands.workspaceId, actor.workspaceId), eq(t.brands.id, actor.brandId))).for('share');
    if (!brand) throw new AppError('NOT_FOUND', 'Brand not available');
  }

  /** Runs `write` in a savepoint and maps the one-open-job-per-subject unique index to a CONFLICT. */
  private async onlyOpenJob<T>(tx: Transaction, write: (sp: Transaction) => Promise<T>): Promise<T> {
    try { return await tx.transaction(write); }
    catch (error) {
      const code = (error as { code?: string })?.code ?? (error as { cause?: { code?: string } })?.cause?.code;
      if (code === '23505') throw new AppError('CONFLICT', 'Another operation on this campaign is still open');
      throw error;
    }
  }

  private async subjectBlocked(tx: Transaction, workspaceId: string, brandId: string, subjectKind: string, subjectId: string) {
    const rows = await tx.select({ status: t.externalSteps.status }).from(t.externalSteps)
      .innerJoin(t.externalJobs, and(eq(t.externalJobs.id, t.externalSteps.jobId), eq(t.externalJobs.workspaceId, t.externalSteps.workspaceId)))
      .where(and(eq(t.externalJobs.workspaceId, workspaceId), eq(t.externalJobs.brandId, brandId), eq(t.externalJobs.subjectKind, subjectKind), eq(t.externalJobs.subjectId, subjectId), inArray(t.externalSteps.status, [...UNRESOLVED_STEP_STATUSES])));
    return rows.length > 0;
  }

  /**
   * Records the human confirmation of one operation over the exact summary shown (account, brand, version,
   * destination, currency, budget and its rules, dates, time zone). Requires AUTHORIZE_SPEND. Idempotent per actor+key.
   * Refused while the same subject has an uncertain step (no shortcut through a new authorization, ADR-0031 C1).
   */
  async authorize(tx: Transaction, actor: BrandActor, input: { linkId: string; operation: Operation; subject: { kind: 'CAMPAIGN'; id: string; versionId: string }; summary: Record<string, unknown>; contentFingerprint: string; idempotencyKey: string }) {
    if (!holds(actor.role, actor.capabilities, 'AUTHORIZE_SPEND')) throw new AppError('FORBIDDEN', 'Authorizing spend requires its capability');
    const now = this.clock(), id = randomUUID(), expiresAt = new Date(now.getTime() + this.config.authorizationTtlMs);
    const candidate = { id, brandId: actor.brandId, connectionId: input.linkId, operation: input.operation, subject: input.subject, summary: input.summary, contentFingerprint: input.contentFingerprint, status: 'AUTHORIZED', expiresAt: expiresAt.toISOString() };
    validate('operation-authorization', candidate);
    if (needsBudgetConfirmation(input.operation) && !(input.summary as { budget?: unknown }).budget) throw new AppError('INVALID', 'This operation needs a confirmed budget');
    await this.lockBrand(tx, actor);
    const [prior] = await tx.select().from(t.operationAuthorizations).where(and(eq(t.operationAuthorizations.workspaceId, actor.workspaceId), eq(t.operationAuthorizations.brandId, actor.brandId), eq(t.operationAuthorizations.actorUserId, actor.userId), eq(t.operationAuthorizations.idempotencyKey, input.idempotencyKey)));
    const summaryFingerprint = contentFingerprint(input.summary);
    if (prior) {
      if (prior.summaryFingerprint !== summaryFingerprint || prior.contentFingerprint !== input.contentFingerprint || prior.operation !== input.operation || prior.subjectVersionId !== input.subject.versionId || prior.subjectId !== input.subject.id || prior.linkId !== input.linkId) throw new AppError('CONFLICT', 'Idempotency key already used for another authorization');
      return { id: prior.id, status: prior.status, expiresAt: prior.expiresAt.toISOString() };
    }
    const [link] = await tx.select().from(t.connectionBrandLinks).where(and(eq(t.connectionBrandLinks.workspaceId, actor.workspaceId), eq(t.connectionBrandLinks.brandId, actor.brandId), eq(t.connectionBrandLinks.id, input.linkId), isNull(t.connectionBrandLinks.unlinkedAt)));
    if (!link) throw new AppError('NOT_FOUND', 'Linked account not available');
    if (await this.subjectBlocked(tx, actor.workspaceId, actor.brandId, input.subject.kind, input.subject.id)) throw new AppError('CONFLICT', 'An earlier operation on this campaign is pending verification');
    await tx.insert(t.operationAuthorizations).values({ id, workspaceId: actor.workspaceId, brandId: actor.brandId, linkId: link.id, operation: input.operation, subjectKind: input.subject.kind, subjectId: input.subject.id, subjectVersionId: input.subject.versionId, summary: input.summary, summaryFingerprint, contentFingerprint: input.contentFingerprint, status: 'AUTHORIZED', actorUserId: actor.userId, idempotencyKey: input.idempotencyKey, expiresAt, createdAt: now, decidedAt: now });
    return { id, status: 'AUTHORIZED' as AuthorizationStatus, expiresAt: expiresAt.toISOString() };
  }

  /** Cancels an authorization whose job has not dispatched any step. After dispatch, nothing is presented as cancelled. */
  async cancelAuthorization(tx: Transaction, actor: BrandActor, authorizationId: string) {
    await this.lockBrand(tx, actor);
    const [auth] = await tx.select().from(t.operationAuthorizations).where(and(eq(t.operationAuthorizations.workspaceId, actor.workspaceId), eq(t.operationAuthorizations.brandId, actor.brandId), eq(t.operationAuthorizations.id, authorizationId))).for('update');
    if (!auth) throw new AppError('NOT_FOUND', 'Authorization not available');
    if (auth.actorUserId !== actor.userId && !holds(actor.role, actor.capabilities, 'AUTHORIZE_SPEND')) throw new AppError('FORBIDDEN', 'Cancelling requires the spend capability');
    if (auth.status === 'CANCELLED') return { status: 'CANCELLED' as const };
    if (auth.status !== 'AUTHORIZED' && auth.status !== 'RESERVED') throw new AppError('CONFLICT', 'Authorization can no longer be cancelled');
    if (auth.reservedJobId) {
      const started = await tx.select({ id: t.externalAttempts.id }).from(t.externalAttempts).innerJoin(t.externalSteps, eq(t.externalSteps.id, t.externalAttempts.stepId)).where(eq(t.externalSteps.jobId, auth.reservedJobId)).limit(1);
      if (started.length) {
        // Steps already started may still reach the provider: block further steps, never claim cancellation.
        await tx.update(t.operationAuthorizations).set({ status: 'CANCELLED' }).where(eq(t.operationAuthorizations.id, auth.id));
        await tx.update(t.externalJobs).set({ blockedReason: 'AUTHORIZATION_CANCELLED', updatedAt: this.clock() }).where(eq(t.externalJobs.id, auth.reservedJobId));
        return { status: 'CANCELLED' as const, inFlight: true };
      }
      await tx.update(t.externalJobs).set({ status: 'CANCELLED', claimedBy: null, leaseUntil: null, blockedReason: 'AUTHORIZATION_CANCELLED', updatedAt: this.clock() }).where(eq(t.externalJobs.id, auth.reservedJobId));
    }
    await tx.update(t.operationAuthorizations).set({ status: 'CANCELLED' }).where(eq(t.operationAuthorizations.id, auth.id));
    return { status: 'CANCELLED' as const, inFlight: false };
  }

  /**
   * Reserves the authorization and queues its job in ONE transaction (unique per authorization and operation key).
   * The reservation never extends the authorization's deadline.
   */
  async enqueue(tx: Transaction, actor: BrandActor, authorizationId: string) {
    await this.lockBrand(tx, actor);
    const [auth] = await tx.select().from(t.operationAuthorizations).where(and(eq(t.operationAuthorizations.workspaceId, actor.workspaceId), eq(t.operationAuthorizations.brandId, actor.brandId), eq(t.operationAuthorizations.id, authorizationId))).for('update');
    if (!auth) throw new AppError('NOT_FOUND', 'Authorization not available');
    if (!holds(actor.role, actor.capabilities, 'AUTHORIZE_SPEND')) throw new AppError('FORBIDDEN', 'Queuing an operation requires the spend capability');
    if (auth.status === 'RESERVED' && auth.reservedJobId) return { jobId: auth.reservedJobId, replayed: true };
    if (auth.status !== 'AUTHORIZED') throw new AppError('CONFLICT', `Authorization is ${auth.status}`);
    if (auth.expiresAt <= this.clock()) { await tx.update(t.operationAuthorizations).set({ status: 'EXPIRED' }).where(eq(t.operationAuthorizations.id, auth.id)); throw new AppError('CONFLICT', 'Authorization expired'); }
    if (await this.subjectBlocked(tx, actor.workspaceId, actor.brandId, auth.subjectKind, auth.subjectId)) throw new AppError('CONFLICT', 'An earlier operation on this campaign is pending verification');
    const [link] = await tx.select().from(t.connectionBrandLinks).where(eq(t.connectionBrandLinks.id, auth.linkId));
    const [connection] = await tx.select().from(t.connections).where(and(eq(t.connections.workspaceId, actor.workspaceId), eq(t.connections.id, link.connectionId)));
    const plan = STEP_PLANS[connection.provider]?.[auth.operation as Operation];
    if (!plan) throw new AppError('INVALID', 'Operation not supported for this provider');
    // A new authorization over the same subject, operation and content CONTINUES an interrupted job instead of
    // creating another one: its succeeded steps and remote tags are kept, so nothing already created is repeated.
    const unfinished = await tx.select().from(t.externalJobs).where(and(eq(t.externalJobs.workspaceId, actor.workspaceId), eq(t.externalJobs.brandId, actor.brandId), eq(t.externalJobs.subjectKind, auth.subjectKind), eq(t.externalJobs.subjectId, auth.subjectId), eq(t.externalJobs.operation, auth.operation), inArray(t.externalJobs.status, ['PARTIAL', 'FAILED', 'EXPIRED']))).for('update');
    for (const job of unfinished) {
      const steps = await tx.select({ status: t.externalSteps.status }).from(t.externalSteps).where(eq(t.externalSteps.jobId, job.id));
      if (!steps.some(s => s.status === 'SUCCEEDED')) continue;
      const [previous] = await tx.select().from(t.operationAuthorizations).where(eq(t.operationAuthorizations.id, job.authorizationId));
      if (previous.contentFingerprint !== auth.contentFingerprint || previous.subjectVersionId !== auth.subjectVersionId) throw new AppError('CONFLICT', 'An interrupted operation exists for another version of this campaign');
      // Same account and provider only: the remaining steps use the parent ids created in that account.
      if (previous.linkId !== auth.linkId || job.provider !== connection.provider) throw new AppError('CONFLICT', 'An interrupted operation exists in another account');
      await this.onlyOpenJob(tx, sp => sp.update(t.externalJobs).set({ authorizationId: auth.id, status: 'QUEUED', claimedBy: null, leaseUntil: null, blockedReason: null, updatedAt: this.clock() }).where(eq(t.externalJobs.id, job.id)));
      // The previous authorization is closed so it can no longer act on the continued job.
      if (previous.status === 'RESERVED' || previous.status === 'AUTHORIZED') await tx.update(t.operationAuthorizations).set({ status: 'CANCELLED' }).where(eq(t.operationAuthorizations.id, previous.id));
      await tx.update(t.operationAuthorizations).set({ status: 'RESERVED', reservedJobId: job.id }).where(eq(t.operationAuthorizations.id, auth.id));
      return { jobId: job.id, replayed: false, continued: true };
    }
    const jobId = randomUUID(), operationKey = contentFingerprint({ authorizationId: auth.id }).slice(0, 32), now = this.clock();
    // At most one open job per campaign (unique index): a second authorization never creates a parallel job.
    await this.onlyOpenJob(tx, sp => sp.insert(t.externalJobs).values({ id: jobId, workspaceId: actor.workspaceId, brandId: actor.brandId, authorizationId: auth.id, operationKey, subjectKind: auth.subjectKind, subjectId: auth.subjectId, provider: connection.provider, operation: auth.operation, status: 'QUEUED', createdAt: now, updatedAt: now }));
    await tx.insert(t.externalSteps).values(plan.map((stepKey, ordinal) => ({ id: randomUUID(), workspaceId: actor.workspaceId, brandId: actor.brandId, jobId, ordinal, stepKey, remoteTag: `bp-${operationKey}-${stepKey}`, status: 'PENDING', updatedAt: now })));
    await tx.update(t.operationAuthorizations).set({ status: 'RESERVED', reservedJobId: jobId }).where(eq(t.operationAuthorizations.id, auth.id));
    return { jobId, replayed: false };
  }

  /** Read model for the interface: editorial/publication/provider states stay separate; secrets never appear. */
  async jobView(tx: Transaction, actor: BrandActor, jobId: string) {
    const [job] = await tx.select().from(t.externalJobs).where(and(eq(t.externalJobs.workspaceId, actor.workspaceId), eq(t.externalJobs.brandId, actor.brandId), eq(t.externalJobs.id, jobId)));
    if (!job) throw new AppError('NOT_FOUND', 'Operation not available');
    const steps = await tx.select().from(t.externalSteps).where(eq(t.externalSteps.jobId, job.id)).orderBy(asc(t.externalSteps.ordinal));
    const view = { id: job.id, brandId: job.brandId, authorizationId: job.authorizationId, status: job.status, blockedReason: job.blockedReason, lastErrorCode: job.lastErrorCode, steps: steps.map(s => ({ key: s.stepKey, status: s.status, providerIds: s.providerIds })) };
    validate('external-job', { id: view.id, brandId: view.brandId, authorizationId: view.authorizationId, status: view.status, steps: view.steps });
    return view;
  }

  // ── Worker (system) ───────────────────────────────────────────────────────────────────────────────────────────
  async registerWorker(host: string, pid: number) {
    const id = randomUUID(), now = this.clock();
    await this.db.insert(t.workerInstances).values({ id, host, pid, startedAt: now, heartbeatAt: now });
    return id;
  }

  /**
   * Supervisor on the same host: records that a worker process was observed terminated. This is the only process
   * evidence accepted by the C1 retry gate; lease loss, suspension or an expired deadline never is.
   */
  async recordWorkerTermination(instanceId: string, observer: string) {
    const observedAt = this.clock();
    await this.db.transaction(async tx => {
      const [worker] = await tx.update(t.workerInstances).set({ terminatedAt: observedAt, terminationEvidence: { type: 'PROCESS_TERMINATED', observer, observedAt: observedAt.toISOString() } }).where(and(eq(t.workerInstances.id, instanceId), isNull(t.workerInstances.terminatedAt))).returning();
      if (!worker) return;
      // Traceability: every attempt of that process still without a provider answer gets an EMIT_IMPOSSIBLE record.
      const attempts = await tx.select().from(t.externalAttempts).where(eq(t.externalAttempts.workerInstanceId, instanceId));
      for (const a of attempts) {
        const outcomes = await tx.select({ kind: t.externalAttemptOutcomes.kind }).from(t.externalAttemptOutcomes).where(eq(t.externalAttemptOutcomes.attemptId, a.id));
        if (outcomes.some(o => ['PROVIDER_SUCCESS', 'PROVIDER_REJECTED', 'NOT_SENT_DEADLINE', 'EMIT_IMPOSSIBLE'].includes(o.kind))) continue;
        await this.outcome(tx, a, 'EMIT_IMPOSSIBLE', {}, { type: 'PROCESS_TERMINATED', observer, observedAt: observedAt.toISOString() });
      }
    });
  }

  private async outcome(tx: Transaction, attempt: { id: string; workspaceId: string; brandId: string }, kind: OutcomeKind, providerIds: Record<string, string>, evidence: Record<string, unknown> | null) {
    await tx.insert(t.externalAttemptOutcomes).values({ id: randomUUID(), workspaceId: attempt.workspaceId, brandId: attempt.brandId, attemptId: attempt.id, kind, providerIds, evidence, recordedAt: this.clock() });
  }

  /**
   * Claims one runnable job with SKIP LOCKED and persists the lease. A job reclaimed after its lease expired has every
   * step that was DISPATCHING without an answer moved to NEEDS_CHECK: it may have been sent and is never resent.
   */
  async claimNext(instanceId: string, onlyBrandId?: string) {
    return this.db.transaction(async tx => {
      const now = this.clock();
      // Fencing: an instance recorded as terminated never claims work again.
      const [worker] = await tx.select({ terminatedAt: t.workerInstances.terminatedAt }).from(t.workerInstances).where(eq(t.workerInstances.id, instanceId));
      if (!worker || worker.terminatedAt) return undefined;
      const runnable = or(eq(t.externalJobs.status, 'QUEUED'), and(inArray(t.externalJobs.status, ['CLAIMED', 'RUNNING']), lt(t.externalJobs.leaseUntil, now)));
      // Optional brand filter for scoped workers (and isolated tests); the default worker serves every brand.
      const [job] = await tx.select().from(t.externalJobs)
        .where(onlyBrandId ? and(runnable, eq(t.externalJobs.brandId, onlyBrandId)) : runnable)
        .orderBy(asc(t.externalJobs.createdAt)).limit(1).for('update', { skipLocked: true });
      if (!job) return undefined;
      const leaseNumber = job.leaseNumber + 1;
      let status: JobStatus = job.status === 'QUEUED' ? 'CLAIMED' : job.status as JobStatus;
      if (job.status !== 'QUEUED') {
        const inFlight = await tx.select().from(t.externalSteps).where(and(eq(t.externalSteps.jobId, job.id), eq(t.externalSteps.status, 'DISPATCHING')));
        for (const step of inFlight) await tx.update(t.externalSteps).set({ status: 'NEEDS_CHECK', updatedAt: now }).where(and(eq(t.externalSteps.id, step.id), eq(t.externalSteps.status, 'DISPATCHING')));
        if (inFlight.length) status = 'NEEDS_CHECK';
      }
      await tx.update(t.externalJobs).set({ claimedBy: status === 'NEEDS_CHECK' ? null : instanceId, leaseNumber, leaseUntil: status === 'NEEDS_CHECK' ? null : new Date(now.getTime() + this.config.leaseMs), status, updatedAt: now }).where(eq(t.externalJobs.id, job.id));
      return status === 'NEEDS_CHECK' ? undefined : { jobId: job.id, leaseNumber };
    });
  }

  /**
   * Block 8 · the content a step may still send: the campaign's CURRENT approved version (a newer approval, or none,
   * changes it → CONTENT_CHANGED and nothing is sent). Subjects without a campaign row keep the authorized fingerprint.
   */
  private async currentContentFingerprint(tx: Transaction, workspaceId: string, brandId: string, subjectKind: string, subjectId: string, authorized: string) {
    if (subjectKind !== 'CAMPAIGN') return authorized;
    const [campaign] = await tx.select({ approvedVersionId: t.campaigns.approvedVersionId }).from(t.campaigns).where(and(eq(t.campaigns.workspaceId, workspaceId), eq(t.campaigns.brandId, brandId), eq(t.campaigns.id, subjectId)));
    if (!campaign) return authorized;
    if (!campaign.approvedVersionId) return '';
    const [v] = await tx.select({ fingerprint: t.campaignVersions.fingerprint }).from(t.campaignVersions).where(eq(t.campaignVersions.id, campaign.approvedVersionId));
    return v?.fingerprint ?? '';
  }

  private async actorHoldsSpend(tx: Transaction, workspaceId: string, brandId: string, userId: string) {
    const [member] = await tx.select().from(t.memberships).where(and(eq(t.memberships.workspaceId, workspaceId), eq(t.memberships.userId, userId)));
    if (!member?.active) return false;
    if (member.role === 'ADMIN') return true;
    if (member.role !== 'MEMBER') return false;
    const [assignment] = await tx.select().from(t.assignments).where(and(eq(t.assignments.workspaceId, workspaceId), eq(t.assignments.brandId, brandId), eq(t.assignments.userId, userId)));
    return !!assignment && holds('MEMBER', await grantedCapabilities(tx, workspaceId, brandId, userId), 'AUTHORIZE_SPEND');
  }

  /**
   * Starts the next PENDING step of a job if, and only if, every dispatch condition holds on rows locked in this
   * transaction (lease holder + lease number + lease time, step state, reserved and unexpired authorization, same
   * content, active linked connection, actor still holding AUTHORIZE_SPEND, brand not closing). The committed
   * DISPATCHING transition is the logical start of the attempt.
   */
  private async startAttempt(instanceId: string, leaseNumber: number, jobId: string) {
    return this.db.transaction(async tx => {
      const now = this.clock();
      // Lock order everywhere: authorization, then job, then steps (avoids deadlocks with enqueue/cancel).
      const [peek] = await tx.select({ authorizationId: t.externalJobs.authorizationId }).from(t.externalJobs).where(eq(t.externalJobs.id, jobId));
      if (!peek) return { kind: 'GONE' as const };
      const [auth] = await tx.select().from(t.operationAuthorizations).where(eq(t.operationAuthorizations.id, peek.authorizationId)).for('update');
      const [job] = await tx.select().from(t.externalJobs).where(eq(t.externalJobs.id, jobId)).for('update');
      if (!job || job.authorizationId !== auth.id) return { kind: 'LEASE_LOST' as const };
      const [worker] = await tx.select({ terminatedAt: t.workerInstances.terminatedAt }).from(t.workerInstances).where(eq(t.workerInstances.id, instanceId));
      const steps = await tx.select().from(t.externalSteps).where(eq(t.externalSteps.jobId, job.id)).orderBy(asc(t.externalSteps.ordinal)).for('update');
      const next = steps.find(s => s.status !== 'SUCCEEDED');
      if (!next) return { kind: 'DONE' as const };
      const [link] = await tx.select().from(t.connectionBrandLinks).where(eq(t.connectionBrandLinks.id, auth.linkId));
      const [connection] = await tx.select().from(t.connections).where(and(eq(t.connections.workspaceId, job.workspaceId), eq(t.connections.id, link.connectionId)));
      const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(t.externalAttempts).where(eq(t.externalAttempts.stepId, next.id));
      const [release] = await tx.select({ id: t.externalStepReleases.id }).from(t.externalStepReleases).where(and(eq(t.externalStepReleases.stepId, next.id), eq(t.externalStepReleases.attemptNumber, n + 1)));
      const blockers = dispatchBlockers({
        now, jobId: job.id,
        job: { status: job.status as JobStatus, claimedBy: job.claimedBy, leaseNumber: job.leaseNumber, leaseUntil: job.leaseUntil },
        worker: { instanceId, leaseNumber, terminated: !worker || !!worker.terminatedAt },
        step: { status: next.status as StepStatus, released: !!release },
        authorization: { status: auth.status as AuthorizationStatus, reservedJobId: auth.reservedJobId, expiresAt: auth.expiresAt, contentFingerprint: auth.contentFingerprint },
        expectedFingerprint: await this.currentContentFingerprint(tx, job.workspaceId, job.brandId, auth.subjectKind, auth.subjectId, auth.contentFingerprint),
        connection: { status: connection.status, linkedToBrand: !link.unlinkedAt && link.brandId === job.brandId },
        actorHoldsSpend: await this.actorHoldsSpend(tx, job.workspaceId, job.brandId, auth.actorUserId),
        brandClosing: false,
        // Activating a lead campaign needs measurement verified for the LIVE publication of its destination, re-read
        // here right before the attempt (ADR-0031 point 3, ADR-0032 «Vigencia de la medición»).
        measurement: job.subjectKind === 'CAMPAIGN' && job.operation === 'ACTIVATE' ? await campaignMeasurement(tx, { workspaceId: job.workspaceId, brandId: job.brandId }, job.subjectId) : undefined
      });
      // A worker without the lease, or fenced as terminated, changes nothing and sends nothing.
      if (blockers.includes('LEASE_NOT_HELD') || blockers.includes('LEASE_EXPIRED') || blockers.includes('WORKER_TERMINATED')) return { kind: 'LEASE_LOST' as const };
      if (blockers.length) {
        // Nothing is sent. The job stops with a visible reason; continuing needs a human (and, when the authorization is
        // no longer usable, a new authorization that continues this same job).
        const done = steps.some(s => s.status === 'SUCCEEDED');
        let status: JobStatus;
        if (blockers.includes('STEP_NOT_DISPATCHABLE')) status = 'NEEDS_CHECK';
        else if (blockers.includes('HUMAN_RELEASE_REQUIRED')) status = next.status === 'NOT_CREATED' ? 'NEEDS_CHECK' : (done ? 'PARTIAL' : 'FAILED');
        else if (blockers.includes('AUTHORIZATION_EXPIRED')) {
          if (auth.status === 'RESERVED') await tx.update(t.operationAuthorizations).set({ status: 'EXPIRED' }).where(eq(t.operationAuthorizations.id, auth.id));
          status = done ? 'PARTIAL' : 'EXPIRED';
        } else if (blockers.includes('AUTHORIZATION_NOT_RESERVED')) status = done ? 'PARTIAL' : 'CANCELLED';
        else status = done ? 'PARTIAL' : 'FAILED';
        await tx.update(t.externalJobs).set({ status, blockedReason: blockers[0], claimedBy: null, leaseUntil: null, updatedAt: now }).where(eq(t.externalJobs.id, job.id));
        return { kind: 'BLOCKED' as const, blockers };
      }
      const attempt = { id: randomUUID(), workspaceId: job.workspaceId, brandId: job.brandId, stepId: next.id, attemptNumber: n + 1, workerInstanceId: instanceId, leaseNumber, startedAt: now, dispatchBy: new Date(now.getTime() + this.config.dispatchWindowMs), requestTimeoutMs: this.config.requestTimeoutMs, credentialExpiresAt: null };
      await tx.insert(t.externalAttempts).values(attempt);
      await tx.update(t.externalSteps).set({ status: 'DISPATCHING', updatedAt: now }).where(eq(t.externalSteps.id, next.id));
      await tx.update(t.externalJobs).set({ status: 'RUNNING', blockedReason: null, leaseUntil: new Date(now.getTime() + this.config.leaseMs), updatedAt: now }).where(eq(t.externalJobs.id, job.id));
      // Ids created earlier for the same campaign (creation in pause) are the parents of ACTIVATE / PAUSE steps.
      const earlier = job.operation === 'CREATE_PAUSED' ? [] : await tx.select({ providerIds: t.externalSteps.providerIds }).from(t.externalSteps).innerJoin(t.externalJobs, eq(t.externalJobs.id, t.externalSteps.jobId)).where(and(eq(t.externalJobs.workspaceId, job.workspaceId), eq(t.externalJobs.brandId, job.brandId), eq(t.externalJobs.subjectKind, job.subjectKind), eq(t.externalJobs.subjectId, job.subjectId), eq(t.externalJobs.operation, 'CREATE_PAUSED'), eq(t.externalJobs.status, 'SUCCEEDED')));
      const parentIds = Object.assign({}, ...earlier.map(s => s.providerIds), ...steps.filter(s => s.status === 'SUCCEEDED').map(s => s.providerIds));
      const secret = this.requireVault().open(connection.credentialCiphertext ?? '', connection.credentialKeyId ?? '', this.aad(connection.workspaceId, connection.id));
      return { kind: 'STARTED' as const, attempt, step: next, provider: connection.provider, operation: job.operation, parentIds, secret, externalAccountId: link.externalAccountId };
    });
  }

  /** Runs a claimed job step by step until it finishes, blocks, loses its lease or meets an uncertain step. */
  async runJob(instanceId: string, claim: { jobId: string; leaseNumber: number }) {
    for (;;) {
      const started = await this.startAttempt(instanceId, claim.leaseNumber, claim.jobId);
      if (started.kind !== 'STARTED') { if (started.kind === 'DONE') await this.settle(claim.jobId); return started.kind; }
      // Right before the network write: never open the connection after dispatchBy.
      await this.hooks.beforeNetworkWrite?.(started.attempt.id);
      if (!mayStillOpenConnection(this.clock(), started.attempt.dispatchBy, this.config.clockSkewMs)) {
        await this.db.transaction(async tx => {
          await this.outcome(tx, started.attempt, 'NOT_SENT_DEADLINE', {}, null);
          await tx.update(t.externalSteps).set({ status: 'PENDING', updatedAt: this.clock() }).where(and(eq(t.externalSteps.id, started.step.id), eq(t.externalSteps.status, 'DISPATCHING')));
        });
        return 'NOT_SENT';
      }
      const response = await this.adapter.send({ provider: started.provider, operation: started.operation, stepKey: started.step.stepKey, remoteTag: started.step.remoteTag, externalAccountId: started.externalAccountId, parentIds: started.parentIds, credential: started.secret, timeoutMs: this.config.requestTimeoutMs })
        .catch(() => ({ kind: 'AMBIGUOUS' as const, code: 'TRANSPORT_ERROR' }));
      const next = await this.recordResponse(started.attempt, started.step.id, response);
      if (next !== 'CONTINUE') return next;
    }
  }

  /**
   * Adds the provider answer to its attempt (append-only). Updates the step only if it is still DISPATCHING for this
   * attempt; otherwise the answer is a LATE_RESULT and, if it contradicts what was recorded, an incident.
   */
  private async recordResponse(attempt: { id: string; workspaceId: string; brandId: string }, stepId: string, response: { kind: 'SUCCESS'; providerIds: Record<string, string> } | { kind: 'REJECTED' | 'AMBIGUOUS'; code: string }) {
    return this.db.transaction(async tx => {
      const now = this.clock();
      const [step] = await tx.select().from(t.externalSteps).where(eq(t.externalSteps.id, stepId)).for('update');
      const [latest] = await tx.select().from(t.externalAttempts).where(eq(t.externalAttempts.stepId, stepId)).orderBy(desc(t.externalAttempts.attemptNumber)).limit(1);
      const kind: OutcomeKind = response.kind === 'SUCCESS' ? 'PROVIDER_SUCCESS' : response.kind === 'REJECTED' ? 'PROVIDER_REJECTED' : 'AMBIGUOUS';
      const providerIds = response.kind === 'SUCCESS' ? response.providerIds : {};
      if (step.status !== 'DISPATCHING' || latest?.id !== attempt.id) {
        // A late answer is added as evidence; it never overwrites what was recorded before.
        await this.outcome(tx, attempt, 'LATE_RESULT', providerIds, { original: kind, code: 'code' in response ? response.code : null });
        if (step.status === 'NEEDS_CHECK' && latest?.id === attempt.id && response.kind !== 'AMBIGUOUS') {
          // The provider itself answered for this very attempt: success is linked (never retried); a definite rejection
          // proves no remote effect.
          await tx.update(t.externalSteps).set({ status: response.kind === 'SUCCESS' ? 'SUCCEEDED' : 'REJECTED', providerIds: response.kind === 'SUCCESS' ? providerIds : step.providerIds, updatedAt: now }).where(eq(t.externalSteps.id, step.id));
          await this.refreshJobStatus(tx, step.jobId);
        } else if (response.kind === 'SUCCESS' && (step.status === 'NOT_CREATED' || step.status === 'SUCCEEDED' || latest?.id !== attempt.id)) {
          // Contradicts a recorded absence or another attempt: keep all evidence, flag it and stop further steps.
          await tx.update(t.externalJobs).set({ blockedReason: 'POSSIBLE_DUPLICATE', status: 'NEEDS_CHECK', claimedBy: null, leaseUntil: null, updatedAt: now }).where(eq(t.externalJobs.id, step.jobId));
        }
        return 'LATE' as const;
      }
      await this.outcome(tx, attempt, kind, providerIds, response.kind === 'SUCCESS' ? null : { code: response.code });
      const stepStatus: StepStatus = response.kind === 'SUCCESS' ? 'SUCCEEDED' : response.kind === 'REJECTED' ? 'REJECTED' : 'NEEDS_CHECK';
      await tx.update(t.externalSteps).set({ status: stepStatus, providerIds: response.kind === 'SUCCESS' ? providerIds : step.providerIds, updatedAt: now }).where(eq(t.externalSteps.id, step.id));
      if (stepStatus === 'SUCCEEDED') return 'CONTINUE' as const;
      await tx.update(t.externalJobs).set({ status: stepStatus === 'REJECTED' ? 'FAILED' : 'NEEDS_CHECK', lastErrorCode: 'code' in response ? response.code : null, claimedBy: null, leaseUntil: null, updatedAt: now }).where(eq(t.externalJobs.id, step.jobId));
      await this.refreshJobStatus(tx, step.jobId);
      return stepStatus;
    });
  }

  /** Steps a person released for their next attempt count as PENDING; without a release they wait for a human. */
  private async effectiveStatuses(tx: Transaction, jobId: string) {
    const steps = await tx.select().from(t.externalSteps).where(eq(t.externalSteps.jobId, jobId));
    const out: StepStatus[] = [];
    for (const s of steps) {
      if (s.status !== 'REJECTED' && s.status !== 'NOT_CREATED') { out.push(s.status as StepStatus); continue; }
      const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(t.externalAttempts).where(eq(t.externalAttempts.stepId, s.id));
      const [release] = await tx.select({ id: t.externalStepReleases.id }).from(t.externalStepReleases).where(and(eq(t.externalStepReleases.stepId, s.id), eq(t.externalStepReleases.attemptNumber, n + 1)));
      out.push(release ? 'PENDING' : s.status as StepStatus);
    }
    return out;
  }

  private async refreshJobStatus(tx: Transaction, jobId: string) {
    const [job] = await tx.select().from(t.externalJobs).where(eq(t.externalJobs.id, jobId));
    // A possible duplicate is lifted only by an explicit human resolution, never by deriving the status again.
    if (job.blockedReason === 'POSSIBLE_DUPLICATE') return 'NEEDS_CHECK' as JobStatus;
    const [auth] = await tx.select().from(t.operationAuthorizations).where(eq(t.operationAuthorizations.id, job.authorizationId));
    const usable = auth.status === 'RESERVED' && auth.expiresAt > this.clock();
    let status = jobStatusFromSteps(await this.effectiveStatuses(tx, jobId), usable);
    // A person cancelled before anything was created: that is a cancellation, not an expiry.
    if (status === 'EXPIRED' && auth.status === 'CANCELLED') status = 'CANCELLED';
    // Runnable but nobody holds the lease (e.g. resolved by a late answer after a relay): back to the queue.
    if (status === 'RUNNING' && !job.claimedBy) status = 'QUEUED';
    await tx.update(t.externalJobs).set({ status, updatedAt: this.clock() }).where(eq(t.externalJobs.id, jobId));
    if (status === 'SUCCEEDED' && auth.status === 'RESERVED') await tx.update(t.operationAuthorizations).set({ status: 'CONSUMED' }).where(eq(t.operationAuthorizations.id, auth.id));
    return status;
  }

  private async settle(jobId: string) {
    await this.db.transaction(async tx => {
      const status = await this.refreshJobStatus(tx, jobId);
      if (TERMINAL_JOB.includes(status)) await tx.update(t.externalJobs).set({ claimedBy: null, leaseUntil: null }).where(eq(t.externalJobs.id, jobId));
    });
  }

  /**
   * Evidence that an attempt can no longer emit its call (C1). Only a termination observed AFTER the attempt started,
   * or the PROVIDER's own confirmation that the attempt's credential is no longer accepted (recorded as an
   * EMIT_IMPOSSIBLE outcome with source PROVIDER_CONFIRMED), counts. A credential expiry stored only in Brandopolis,
   * lease loss, suspension or deadlines never do.
   */
  private async emitEvidence(tx: Transaction, attempt: typeof t.externalAttempts.$inferSelect): Promise<EmitImpossibleEvidence | null> {
    const [worker] = await tx.select().from(t.workerInstances).where(eq(t.workerInstances.id, attempt.workerInstanceId));
    if (worker?.terminatedAt && worker.terminatedAt > attempt.startedAt && worker.terminationEvidence?.type === 'PROCESS_TERMINATED') return { type: 'PROCESS_TERMINATED', observer: String(worker.terminationEvidence.observer), observedAt: worker.terminatedAt };
    const outcomes = await tx.select().from(t.externalAttemptOutcomes).where(and(eq(t.externalAttemptOutcomes.attemptId, attempt.id), eq(t.externalAttemptOutcomes.kind, 'EMIT_IMPOSSIBLE')));
    const confirmed = outcomes.find(o => o.evidence?.type === 'CREDENTIAL_UNUSABLE' && o.evidence?.source === 'PROVIDER_CONFIRMED' && o.recordedAt > attempt.startedAt);
    if (confirmed) return { type: 'CREDENTIAL_UNUSABLE', reason: confirmed.evidence?.reason === 'EXPIRED' ? 'EXPIRED' : 'REVOKED', at: confirmed.recordedAt };
    return null;
  }

  /**
   * Read-only reconciliation of uncertain steps. Provider lookups run OUTSIDE any transaction; results are written in a
   * short transaction only if the step is still NEEDS_CHECK for the same attempt. A found resource is linked (never
   * retried). Absence is confirmed only from the provider's change history consulted after emit-impossible evidence plus
   * the processing window. A job flagged as a possible duplicate is left untouched for a human.
   */
  async reconcile(jobId: string) {
    const plan = await this.db.transaction(async tx => {
      const [job] = await tx.select().from(t.externalJobs).where(eq(t.externalJobs.id, jobId));
      if (!job || job.blockedReason === 'POSSIBLE_DUPLICATE') return null;
      const [auth] = await tx.select().from(t.operationAuthorizations).where(eq(t.operationAuthorizations.id, job.authorizationId));
      const [link] = await tx.select().from(t.connectionBrandLinks).where(eq(t.connectionBrandLinks.id, auth.linkId));
      const [connection] = await tx.select().from(t.connections).where(and(eq(t.connections.workspaceId, job.workspaceId), eq(t.connections.id, link.connectionId)));
      const steps = await tx.select().from(t.externalSteps).where(and(eq(t.externalSteps.jobId, jobId), eq(t.externalSteps.status, 'NEEDS_CHECK')));
      // Without valid access nothing can be checked: the steps stay pending and the person is told to reconnect.
      // Nothing is inferred (never «not created», never «cancelled») from a lookup that could not be made.
      if (connection.status !== 'ACTIVE' || link.unlinkedAt) return { accessUnavailable: steps.map(st => st.stepKey) };
      const secret = this.requireVault().open(connection.credentialCiphertext ?? '', connection.credentialKeyId ?? '', this.aad(connection.workspaceId, connection.id));
      const items = [];
      for (const step of steps) {
        const [attempt] = await tx.select().from(t.externalAttempts).where(eq(t.externalAttempts.stepId, step.id)).orderBy(desc(t.externalAttempts.attemptNumber)).limit(1);
        items.push({ step, attempt, evidence: await this.emitEvidence(tx, attempt) });
      }
      return { provider: connection.provider, secret, items };
    });
    if (!plan) return [];
    if ('accessUnavailable' in plan) return plan.accessUnavailable!.map(step => ({ step, resolution: 'ACCESS_UNAVAILABLE' as const }));
    const results: { step: string; resolution: RemoteResolution['type'] | 'ACCESS_UNAVAILABLE' }[] = [];
    for (const { step, attempt, evidence } of plan.items) {
      // Network (read-only), no transaction open.
      let write: { kind: OutcomeKind; providerIds: Record<string, string>; evidence: Record<string, unknown> | null; status: StepStatus } | null = null;
      const found = await this.adapter.findByTag(plan.provider, step.remoteTag, plan.secret);
      if (found) write = { kind: 'RECONCILED_FOUND', providerIds: found, evidence: null, status: 'SUCCEEDED' };
      else if (!evidence && this.adapter.confirmAttemptCredentialUnusable) {
        // C1: only the provider can confirm that the attempt's credential is no longer accepted. Recorded as evidence
        // now; absence can be confirmed on a later run, after the processing window.
        const confirmation = await this.adapter.confirmAttemptCredentialUnusable(plan.provider, attempt.id, plan.secret);
        if (confirmation) await this.db.transaction(tx => this.outcome(tx, attempt, 'EMIT_IMPOSSIBLE', {}, { type: 'CREDENTIAL_UNUSABLE', source: 'PROVIDER_CONFIRMED', reason: confirmation.reason, confirmedAt: confirmation.confirmedAt.toISOString() }));
      }
      else if (evidence) {
        const evidenceAt = evidence.type === 'PROCESS_TERMINATED' ? evidence.observedAt : evidence.at;
        if (this.clock().getTime() >= evidenceAt.getTime() + this.config.processingWindowMs) {
          const until = this.clock(), history = await this.adapter.changeHistory(plan.provider, attempt.startedAt, until, plan.secret);
          if (history && history.coveredFrom <= attempt.startedAt && history.coveredUntil.getTime() >= evidenceAt.getTime() + this.config.processingWindowMs) {
            const created = history.creations.find(c => c.remoteTag === step.remoteTag);
            write = created
              ? { kind: 'RECONCILED_FOUND', providerIds: created.providerIds, evidence: { source: 'CHANGE_HISTORY' }, status: 'SUCCEEDED' }
              : { kind: 'REMOTE_ABSENCE_CONFIRMED', providerIds: {}, evidence: { source: 'CHANGE_HISTORY', coveredFrom: history.coveredFrom.toISOString(), coveredUntil: history.coveredUntil.toISOString(), consultedAt: until.toISOString(), evidence: { type: evidence.type, at: evidenceAt.toISOString() } }, status: 'NOT_CREATED' };
          }
        }
      }
      if (!write) { results.push({ step: step.stepKey, resolution: 'UNRESOLVED' }); continue; }
      const applied = await this.db.transaction(async tx => {
        const [current] = await tx.select().from(t.externalSteps).where(eq(t.externalSteps.id, step.id)).for('update');
        const [latest] = await tx.select({ id: t.externalAttempts.id }).from(t.externalAttempts).where(eq(t.externalAttempts.stepId, step.id)).orderBy(desc(t.externalAttempts.attemptNumber)).limit(1);
        if (current.status !== 'NEEDS_CHECK' || latest?.id !== attempt.id) return false; // changed meanwhile: nothing written
        await this.outcome(tx, attempt, write!.kind, write!.providerIds, write!.evidence);
        await tx.update(t.externalSteps).set({ status: write!.status, providerIds: write!.status === 'SUCCEEDED' ? write!.providerIds : current.providerIds, updatedAt: this.clock() }).where(eq(t.externalSteps.id, step.id));
        return true;
      });
      results.push({ step: step.stepKey, resolution: !applied ? 'UNRESOLVED' : write.status === 'SUCCEEDED' ? 'FOUND' : 'ABSENCE_CONFIRMED' });
    }
    await this.db.transaction(async tx => {
      // Resolved without uncertainty and still authorized: the remaining steps continue through the queue (QUEUED).
      const status = await this.refreshJobStatus(tx, jobId);
      if (status === 'QUEUED') await tx.update(t.externalJobs).set({ claimedBy: null, leaseUntil: null, blockedReason: null }).where(eq(t.externalJobs.id, jobId));
    });
    return results;
  }

  /**
   * C1 · human release of an uncertain (NOT_CREATED) or rejected step. Re-evaluates retryGate from stored evidence of
   * EVERY attempt of the step (a late provider success counts as found), requires a valid authorization covering the
   * step, the spend capability and a criterion, and refuses a job flagged as a possible duplicate. On success it writes
   * a persisted release for the exact next attempt number and requeues the job; earlier attempts are kept.
   */
  async humanRetry(tx: Transaction, actor: BrandActor, input: { jobId: string; stepKey: string; criterion: string }) {
    await this.lockBrand(tx, actor);
    const [peek] = await tx.select({ authorizationId: t.externalJobs.authorizationId }).from(t.externalJobs).where(and(eq(t.externalJobs.workspaceId, actor.workspaceId), eq(t.externalJobs.brandId, actor.brandId), eq(t.externalJobs.id, input.jobId)));
    if (!peek) throw new AppError('NOT_FOUND', 'Operation not available');
    const [auth] = await tx.select().from(t.operationAuthorizations).where(eq(t.operationAuthorizations.id, peek.authorizationId)).for('update');
    const [job] = await tx.select().from(t.externalJobs).where(eq(t.externalJobs.id, input.jobId)).for('update');
    const [step] = await tx.select().from(t.externalSteps).where(and(eq(t.externalSteps.jobId, job.id), eq(t.externalSteps.stepKey, String(input.stepKey)))).for('update');
    if (!step) throw new AppError('NOT_FOUND', 'Step not available');
    if (job.blockedReason === 'POSSIBLE_DUPLICATE') throw new AppError('CONFLICT', 'Retry not allowed: POSSIBLE_DUPLICATE');
    const authorizationValid = auth.status === 'RESERVED' && auth.reservedJobId === job.id && auth.expiresAt > this.clock();
    const holdsSpend = holds(actor.role, actor.capabilities, 'AUTHORIZE_SPEND');
    const criterion = typeof input.criterion === 'string' ? input.criterion : '';
    const attempts = await tx.select().from(t.externalAttempts).where(eq(t.externalAttempts.stepId, step.id)).orderBy(desc(t.externalAttempts.attemptNumber));
    if (step.status === 'REJECTED') {
      if (!holdsSpend) throw new AppError('FORBIDDEN', 'Retrying requires the spend capability');
      if (criterion.trim().length < 10) throw new AppError('INVALID', 'Criterion required');
      if (!authorizationValid) throw new AppError('CONFLICT', 'A new authorization is required');
    } else {
      const attempt = attempts[0];
      if (!attempt) throw new AppError('CONFLICT', 'Nothing to retry');
      const outcomes = attempts.length ? await tx.select().from(t.externalAttemptOutcomes).where(inArray(t.externalAttemptOutcomes.attemptId, attempts.map(a => a.id))).orderBy(asc(t.externalAttemptOutcomes.recordedAt)) : [];
      const found = outcomes.find(o => o.kind === 'RECONCILED_FOUND' || o.kind === 'PROVIDER_SUCCESS' || (o.kind === 'LATE_RESULT' && o.evidence?.original === 'PROVIDER_SUCCESS'));
      const absence = outcomes.filter(o => o.attemptId === attempt.id).find(o => o.kind === 'REMOTE_ABSENCE_CONFIRMED');
      const evidence = await this.emitEvidence(tx, attempt);
      const resolution: RemoteResolution = found ? { type: 'FOUND', providerIds: found.providerIds } : absence?.evidence
        ? { type: 'ABSENCE_CONFIRMED', source: 'CHANGE_HISTORY', coveredFrom: new Date(String(absence.evidence.coveredFrom)), coveredUntil: new Date(String(absence.evidence.coveredUntil)), consultedAt: new Date(String(absence.evidence.consultedAt)) }
        : { type: 'UNRESOLVED' };
      const decision = retryGate({ stepStatus: step.status as StepStatus, attemptStartedAt: attempt.startedAt, evidence, resolution, processingWindowMs: this.config.processingWindowMs, authorizationValid, actorHoldsSpend: holdsSpend, criterion });
      if (!decision.allowed) throw new AppError(decision.reason === 'CAPABILITY_REQUIRED' ? 'FORBIDDEN' : 'CONFLICT', `Retry not allowed: ${decision.reason}`);
    }
    await tx.insert(t.externalStepReleases).values({ id: randomUUID(), workspaceId: actor.workspaceId, brandId: actor.brandId, stepId: step.id, attemptNumber: attempts.length + 1, releasedBy: actor.userId, criterion: criterion.trim().slice(0, 2000), releasedAt: this.clock() }).onConflictDoNothing();
    await this.onlyOpenJob(tx, sp => sp.update(t.externalJobs).set({ status: 'QUEUED', claimedBy: null, leaseUntil: null, blockedReason: null, updatedAt: this.clock() }).where(eq(t.externalJobs.id, job.id)));
    return { jobId: job.id, stepKey: step.stepKey, queued: true };
  }

  /**
   * Brand deletion guard (ADR-0031 closure, minimal form until BrandClosure exists): any non-terminal job, or a campaign
   * whose last successful operation left it live (ACTIVATE / UPDATE_BUDGET without a later verified PAUSE), blocks
   * deletion. Deleting local records never stops remote spend.
   */
  static async unresolvedForBrand(tx: Transaction, workspaceId: string, brandId: string) {
    const jobs = await tx.select({ status: t.externalJobs.status, subjectId: t.externalJobs.subjectId, operation: t.externalJobs.operation, updatedAt: t.externalJobs.updatedAt }).from(t.externalJobs).where(and(eq(t.externalJobs.workspaceId, workspaceId), eq(t.externalJobs.brandId, brandId)));
    const open = jobs.filter(j => !TERMINAL_JOB.includes(j.status as JobStatus)).length;
    // Safe default: a campaign is live if it was activated (or its budget changed) and no PAUSE succeeded strictly after.
    const liveAt = new Map<string, number>(), pausedAt = new Map<string, number>();
    for (const j of jobs.filter(j => j.status === 'SUCCEEDED')) {
      const at = j.updatedAt.getTime(), target = j.operation === 'PAUSE' ? pausedAt : (j.operation === 'ACTIVATE' || j.operation === 'UPDATE_BUDGET') ? liveAt : null;
      if (target) target.set(j.subjectId, Math.max(target.get(j.subjectId) ?? -Infinity, at));
    }
    const live = [...liveAt.entries()].filter(([subject, at]) => !((pausedAt.get(subject) ?? -Infinity) > at)).length;
    return open + live;
  }

  /**
   * Block 8 · read-only status and basic metrics of what a succeeded job created. The credential is opened here and
   * only handed to the adapter; the lookup runs outside any transaction; null when the provider has nothing to report.
   */
  async campaignStatus(jobId: string, currency: string) {
    const plan = await this.db.transaction(async tx => {
      const [job] = await tx.select().from(t.externalJobs).where(eq(t.externalJobs.id, jobId));
      if (!job || job.status !== 'SUCCEEDED') return null;
      const [auth] = await tx.select().from(t.operationAuthorizations).where(eq(t.operationAuthorizations.id, job.authorizationId));
      const [link] = await tx.select().from(t.connectionBrandLinks).where(eq(t.connectionBrandLinks.id, auth.linkId));
      const [connection] = await tx.select().from(t.connections).where(and(eq(t.connections.workspaceId, job.workspaceId), eq(t.connections.id, link.connectionId)));
      if (connection.status !== 'ACTIVE') throw new AppError('CONFLICT', 'Reconnect the account to read its status');
      const steps = await tx.select().from(t.externalSteps).where(eq(t.externalSteps.jobId, job.id));
      return { provider: connection.provider, providerIds: Object.assign({}, ...steps.map(s => s.providerIds)), secret: this.requireVault().open(connection.credentialCiphertext ?? '', connection.credentialKeyId ?? '', this.aad(connection.workspaceId, connection.id)), scopes: connection.scopes as string[] };
    });
    if (!plan || !this.adapter.campaignStatus) return null;
    const reading = await this.adapter.campaignStatus(plan.provider, plan.providerIds, plan.secret, currency);
    return reading ? { reading, scopes: plan.scopes } : null;
  }

  /** Closure window helper exposed for the interface (when a human retry could first become possible). */
  closureWindow(attempt: { dispatchBy: Date; requestTimeoutMs: number }) {
    return closureWindowEnd(attempt.dispatchBy, attempt.requestTimeoutMs, this.config.clockSkewMs);
  }
}
