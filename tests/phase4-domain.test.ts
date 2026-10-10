// Phase 4 · block 2 · pure rules (no database): editorial versions, capabilities, work priority, external operations
// (ADR-0031 C1 retry gate) and the credential vault. Matrix ids in test names (PHASE4_ACCEPTANCE_MATRIX).
import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { approve, approvalApplies, contentFingerprint, editorialTransition, publish, withNewDraft, EDITORIAL_STATUSES, type EditorialVersion } from '../src/domain/editorial-versions.js';
import { BRAND_CAPABILITIES, effectiveCapabilities, holds } from '../src/domain/brand-capabilities.js';
import { WORK_INTENTS, INTENT_ENTRY, campaignNeedsVerifiedMeasurement } from '../src/domain/work-priority.js';
import { AUTHORIZATION_STATUSES, JOB_STATUSES, STEP_STATUSES, OUTCOME_KINDS, authorizationTransition, stepTransition, dispatchBlockers, retryGate, closureWindowEnd, mayStillOpenConnection, jobStatusFromSteps, type DispatchSnapshot } from '../src/domain/external-operations.js';
import { createVault } from '../src/application/credential-vault.js';

const fp = (n: number) => contentFingerprint({ n });

describe('Phase 4 · schemas are the executable source of states', () => {
  it('the TypeScript unions match the v1 JSON schemas', () => {
    expect(EDITORIAL_STATUSES).toEqual(['DRAFT', 'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'SUPERSEDED']);
    expect(BRAND_CAPABILITIES).toEqual(['PUBLISH_SITE', 'PUBLISH_BRAND_KIT', 'AUTHORIZE_SPEND', 'MANAGE_CONNECTIONS', 'MANAGE_GUESTS']);
    expect(WORK_INTENTS).toEqual(['STRATEGY_FULL', 'STRATEGY_POINT', 'MARKETING_PLAN', 'CAMPAIGN', 'CONTENT', 'WEBSITE', 'VISUAL_IDENTITY', 'SELL_OFFER', 'HELP_ME_CHOOSE']);
    expect(AUTHORIZATION_STATUSES).toEqual(['PENDING', 'AUTHORIZED', 'RESERVED', 'CONSUMED', 'CANCELLED', 'EXPIRED']);
    expect(JOB_STATUSES).toEqual(['QUEUED', 'CLAIMED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'NEEDS_CHECK', 'PARTIAL', 'EXPIRED', 'CANCELLED']);
    expect(STEP_STATUSES).toEqual(['PENDING', 'DISPATCHING', 'SUCCEEDED', 'REJECTED', 'NEEDS_CHECK', 'NOT_CREATED']);
    expect(OUTCOME_KINDS).toContain('EMIT_IMPOSSIBLE');
  });
});

describe('ADR-0030 · editorial versions (VER-001…003, APR-001)', () => {
  const versions: EditorialVersion[] = [
    { id: 'v1', sequence: 1, status: 'APPROVED', fingerprint: fp(1) },
    { id: 'v2', sequence: 2, status: 'IN_REVIEW', fingerprint: fp(2) }
  ];
  const base = { draftVersionId: null, approvedVersionId: 'v1', publishedVersionId: 'v1' };

  it('VER-001: a new draft moves only the draft pointer', () => {
    expect(withNewDraft(base, 'v3')).toEqual({ draftVersionId: 'v3', approvedVersionId: 'v1', publishedVersionId: 'v1' });
  });
  it('VER-002: approving a later version supersedes the earlier approved one; the published pointer does not move', () => {
    const { pointers, superseded } = approve({ ...base, draftVersionId: 'v2' }, versions, 'v2', fp(2));
    expect(superseded).toBe('v1');
    expect(pointers).toEqual({ draftVersionId: null, approvedVersionId: 'v2', publishedVersionId: 'v1' });
  });
  it('APR-002: approving with a stale fingerprint is a conflict; a reviewed version is immutable', () => {
    expect(() => approve(base, versions, 'v2', fp(99))).toThrow(/Content changed/);
    expect(() => editorialTransition('APPROVED', 'IN_REVIEW')).toThrow();
    expect(() => editorialTransition('CHANGES_REQUESTED', 'IN_REVIEW')).toThrow();
    expect(() => editorialTransition('DRAFT', 'APPROVED')).toThrow();
  });
  it('VER-003 / APR-001: an approval applies only to its exact version and content', () => {
    expect(approvalApplies({ versionId: 'v1', fingerprint: fp(1) }, { id: 'v1', fingerprint: fp(1) })).toBe(true);
    expect(approvalApplies({ versionId: 'v1', fingerprint: fp(1) }, { id: 'v2', fingerprint: fp(1) })).toBe(false);
    expect(approvalApplies({ versionId: 'v1', fingerprint: fp(1) }, { id: 'v1', fingerprint: fp(2) })).toBe(false);
    expect(() => publish(base, versions, 'v2')).toThrow(/approved/);
  });
  it('fingerprints are canonical: key order never changes them', () => {
    expect(contentFingerprint({ a: 1, b: [1, { c: 2, d: 3 }] })).toBe(contentFingerprint({ b: [1, { d: 3, c: 2 }], a: 1 }));
    expect(contentFingerprint({ a: 1 })).not.toBe(contentFingerprint({ a: 2 }));
  });
});

describe('ADR-0033 · per-brand capabilities (PRT-005)', () => {
  it('an ADMIN holds every capability; a MEMBER only what was granted; anything else none', () => {
    expect(effectiveCapabilities('ADMIN', [])).toEqual(BRAND_CAPABILITIES);
    expect(effectiveCapabilities('MEMBER', ['AUTHORIZE_SPEND', 'NOT_A_CAPABILITY'])).toEqual(['AUTHORIZE_SPEND']);
    expect(effectiveCapabilities('GUEST', ['AUTHORIZE_SPEND'])).toEqual([]);
    expect(holds('MEMBER', [], 'PUBLISH_SITE')).toBe(false);
  });
});

describe('PHASE4_SPEC §4.9 · work priority (INT-001, INT-004)', () => {
  it('every intent has an entry; full strategy and a single point are distinct intents in Estrategia', () => {
    for (const intent of WORK_INTENTS) expect(INTENT_ENTRY[intent]).toBeDefined();
    expect(INTENT_ENTRY.STRATEGY_FULL.area).toBe('Estrategia');
    expect(INTENT_ENTRY.MARKETING_PLAN).toEqual({ area: 'Marketing', section: 'Plan de Marketing' });
    expect(INTENT_ENTRY.VISUAL_IDENTITY).toEqual({ area: 'Marca y recursos', section: 'Identidad visual' });
  });
  it('INT-004: verified measurement is required for lead campaigns, never for traffic', () => {
    expect(campaignNeedsVerifiedMeasurement('TRAFFIC')).toBe(false);
    expect(campaignNeedsVerifiedMeasurement('LEADS')).toBe(true);
  });
});

describe('ADR-0031 · external operations', () => {
  const now = new Date('2026-10-10T12:00:00Z');
  const ok: DispatchSnapshot = {
    now, jobId: 'j1',
    job: { status: 'CLAIMED', claimedBy: 'w1', leaseNumber: 3, leaseUntil: new Date(now.getTime() + 60_000) },
    worker: { instanceId: 'w1', leaseNumber: 3, terminated: false },
    step: { status: 'PENDING', released: false },
    authorization: { status: 'RESERVED', reservedJobId: 'j1', expiresAt: new Date(now.getTime() + 600_000), contentFingerprint: fp(1) },
    expectedFingerprint: fp(1),
    connection: { status: 'ACTIVE', linkedToBrand: true },
    actorHoldsSpend: true,
    brandClosing: false
  };

  it('EXT-001/007: dispatch conditions — lease holder and number, unexpired reserved authorization, same content, live connection, capability', () => {
    expect(dispatchBlockers(ok)).toEqual([]);
    expect(dispatchBlockers({ ...ok, worker: { instanceId: 'w1', leaseNumber: 2, terminated: false } })).toContain('LEASE_NOT_HELD');
    expect(dispatchBlockers({ ...ok, worker: { instanceId: 'w1', leaseNumber: 3, terminated: true } })).toContain('WORKER_TERMINATED');
    // C1: a NOT_CREATED or REJECTED step is dispatched only after a persisted human release for that attempt.
    expect(dispatchBlockers({ ...ok, step: { status: 'NOT_CREATED', released: false } })).toContain('HUMAN_RELEASE_REQUIRED');
    expect(dispatchBlockers({ ...ok, step: { status: 'REJECTED', released: false } })).toContain('HUMAN_RELEASE_REQUIRED');
    expect(dispatchBlockers({ ...ok, step: { status: 'NOT_CREATED', released: true } })).toEqual([]);
    expect(dispatchBlockers({ ...ok, job: { ...ok.job, leaseUntil: new Date(now.getTime() - 1) } })).toContain('LEASE_EXPIRED');
    expect(dispatchBlockers({ ...ok, authorization: { ...ok.authorization, expiresAt: now } })).toContain('AUTHORIZATION_EXPIRED');
    expect(dispatchBlockers({ ...ok, authorization: { ...ok.authorization, reservedJobId: 'other' } })).toContain('AUTHORIZATION_NOT_RESERVED');
    expect(dispatchBlockers({ ...ok, expectedFingerprint: fp(2) })).toContain('CONTENT_CHANGED');
    expect(dispatchBlockers({ ...ok, connection: { status: 'REVOKED', linkedToBrand: true } })).toContain('CONNECTION_UNAVAILABLE');
    expect(dispatchBlockers({ ...ok, actorHoldsSpend: false })).toContain('CAPABILITY_REVOKED');
    expect(dispatchBlockers({ ...ok, step: { status: 'NEEDS_CHECK', released: true } })).toContain('STEP_NOT_DISPATCHABLE');
    expect(dispatchBlockers({ ...ok, measurement: { required: true, verifiedForLivePublication: false } })).toContain('MEASUREMENT_NOT_VERIFIED');
  });

  it('state machines: a reservation can still expire; an uncertain step only resolves to found or confirmed absence', () => {
    expect(authorizationTransition('RESERVED', 'EXPIRED')).toBe('EXPIRED');
    expect(() => authorizationTransition('CONSUMED', 'RESERVED')).toThrow();
    expect(() => stepTransition('NEEDS_CHECK', 'DISPATCHING')).toThrow();
    expect(stepTransition('NOT_CREATED', 'DISPATCHING')).toBe('DISPATCHING');
    expect(stepTransition('REJECTED', 'DISPATCHING')).toBe('DISPATCHING');
  });

  it('EXT-016: the connection is never opened after dispatchBy; the closure window adds request time and skew', () => {
    const dispatchBy = new Date(now.getTime() + 5_000);
    expect(mayStillOpenConnection(now, dispatchBy, 2_000)).toBe(true);
    expect(mayStillOpenConnection(new Date(now.getTime() + 3_500), dispatchBy, 2_000)).toBe(false);
    expect(closureWindowEnd(dispatchBy, 30_000, 2_000).getTime()).toBe(now.getTime() + 37_000);
  });

  describe('EXT-018 · C1 human retry gate', () => {
    const started = now, processing = 300_000;
    const evidence = { type: 'PROCESS_TERMINATED' as const, observer: 'supervisor@host', observedAt: new Date(now.getTime() + 60_000) };
    const absence = (until: number, consulted = until, from = started.getTime()) => ({ type: 'ABSENCE_CONFIRMED' as const, source: 'CHANGE_HISTORY' as const, coveredFrom: new Date(from), coveredUntil: new Date(until), consultedAt: new Date(consulted) });
    const base = { stepStatus: 'NOT_CREATED' as const, attemptStartedAt: started, processingWindowMs: processing, authorizationValid: true, actorHoldsSpend: true, criterion: 'Comprobado en el registro de cambios del proveedor' };
    const enough = evidence.observedAt.getTime() + processing;

    it('allows only with emit-impossible evidence, absence covering the attempt after the window, valid authorization, capability and criterion', () => {
      expect(retryGate({ ...base, evidence, resolution: absence(enough) })).toEqual({ allowed: true });
    });
    it('denies without evidence — a lost lease, a suspension, an expired deadline or an empty lookup never count', () => {
      expect(retryGate({ ...base, stepStatus: 'NEEDS_CHECK', evidence: null, resolution: { type: 'UNRESOLVED' } })).toMatchObject({ allowed: false, reason: 'NO_EVIDENCE_THAT_ATTEMPT_CANNOT_EMIT', action: 'KEEP_PENDING' });
      expect(retryGate({ ...base, evidence: null, resolution: absence(enough) })).toMatchObject({ allowed: false, reason: 'NO_EVIDENCE_THAT_ATTEMPT_CANNOT_EMIT' });
    });
    it('a provider-confirmed success is linked, never retried', () => {
      expect(retryGate({ ...base, evidence, resolution: { type: 'FOUND', providerIds: { campaign: '1' } } })).toMatchObject({ allowed: false, action: 'LINK_RESULT' });
    });
    it('absence consulted too early or not covering the start keeps it pending', () => {
      expect(retryGate({ ...base, evidence, resolution: absence(enough - 1) })).toMatchObject({ allowed: false, reason: 'ABSENCE_CHECKED_TOO_EARLY' });
      expect(retryGate({ ...base, evidence, resolution: absence(enough, enough, started.getTime() + 1) })).toMatchObject({ allowed: false, reason: 'ABSENCE_DOES_NOT_COVER_ATTEMPT_START' });
      expect(retryGate({ ...base, evidence, resolution: { type: 'UNRESOLVED' } })).toMatchObject({ allowed: false, reason: 'REMOTE_RESULT_UNRESOLVED' });
    });
    it('needs a valid authorization, the capability and a criterion', () => {
      expect(retryGate({ ...base, evidence, resolution: absence(enough), authorizationValid: false })).toMatchObject({ allowed: false, action: 'NEW_AUTHORIZATION' });
      expect(retryGate({ ...base, evidence, resolution: absence(enough), actorHoldsSpend: false })).toMatchObject({ allowed: false, reason: 'CAPABILITY_REQUIRED' });
      expect(retryGate({ ...base, evidence, resolution: absence(enough), criterion: 'no lo veo' })).toMatchObject({ allowed: false, reason: 'CRITERION_REQUIRED' });
      expect(retryGate({ ...base, stepStatus: 'SUCCEEDED' as never, evidence, resolution: absence(enough) })).toMatchObject({ allowed: false, reason: 'STEP_NOT_UNCERTAIN' });
    });
  });

  it('job status follows its steps; an unusable authorization never leaves it runnable', () => {
    expect(jobStatusFromSteps(['SUCCEEDED', 'SUCCEEDED'], true)).toBe('SUCCEEDED');
    expect(jobStatusFromSteps(['SUCCEEDED', 'NEEDS_CHECK', 'PENDING'], true)).toBe('NEEDS_CHECK');
    expect(jobStatusFromSteps(['SUCCEEDED', 'NOT_CREATED', 'PENDING'], true), 'NOT_CREATED waits for a human').toBe('NEEDS_CHECK');
    expect(jobStatusFromSteps(['SUCCEEDED', 'REJECTED'], true)).toBe('PARTIAL');
    expect(jobStatusFromSteps(['REJECTED', 'PENDING'], true)).toBe('FAILED');
    expect(jobStatusFromSteps(['SUCCEEDED', 'PENDING'], false)).toBe('PARTIAL');
    expect(jobStatusFromSteps(['PENDING'], false)).toBe('EXPIRED');
    expect(jobStatusFromSteps(['SUCCEEDED', 'PENDING'], true)).toBe('RUNNING');
  });
});

describe('ADR-0031 · credential vault (EXT-009)', () => {
  const vault = createVault(randomBytes(32), 'k1');
  it('seals with AES-256-GCM bound to its context; tampering, another context or another key fails', () => {
    const sealed = vault.seal('secreto-de-prueba', 'ws:conn');
    expect(sealed).not.toContain('secreto-de-prueba');
    expect(vault.open(sealed, 'k1', 'ws:conn')).toBe('secreto-de-prueba');
    expect(() => vault.open(sealed, 'k1', 'ws:other')).toThrow(/integrity/);
    expect(() => vault.open(sealed.slice(0, -2) + 'AA', 'k1', 'ws:conn')).toThrow();
    expect(() => vault.open(sealed, 'k2', 'ws:conn')).toThrow(/another key/);
    expect(() => createVault(randomBytes(16), 'k1')).toThrow(/32 bytes/);
  });
});
