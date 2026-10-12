/**
 * ADR-0031 · provider adapter contract. Real Google Ads, Meta and Canva adapters implement it once their access is
 * granted (PHASE4_EXTERNAL_REQUIREMENTS). The simulator implements the same contract for DEMO and tests; it proves the
 * local logic, never a commercial integration.
 */
export type StepRequest = {
  provider: string;
  operation: string;
  stepKey: string;
  remoteTag: string;
  /** The external account the human confirmed (from the brand link); adapters must target exactly this account. */
  externalAccountId: string;
  parentIds: Record<string, string>;
  credential: string;
  timeoutMs: number;
};

export type StepResponse =
  | { kind: 'SUCCESS'; providerIds: Record<string, string> }
  | { kind: 'REJECTED'; code: string }
  | { kind: 'AMBIGUOUS'; code: string };

export type ChangeHistory = { coveredFrom: Date; coveredUntil: Date; creations: { remoteTag: string; providerIds: Record<string, string> }[] };

export interface ProviderAdapter {
  readonly name: string;
  /** Accounts this credential can really access; linking an account requires it to be in this list. */
  listAccounts(provider: string, credential: string): Promise<{ id: string; label: string }[]>;
  /** Sends one remote step. Must not retry internally; ambiguous results are reported as AMBIGUOUS. */
  send(request: StepRequest): Promise<StepResponse>;
  /** Read-only lookup of a resource created by a step, by its deterministic tag. */
  findByTag(provider: string, remoteTag: string, credential: string): Promise<Record<string, string> | null>;
  /** Read-only provider change history over an interval, when the provider offers one; null otherwise. */
  changeHistory(provider: string, from: Date, until: Date, credential: string): Promise<ChangeHistory | null>;
  /**
   * ADR-0031 C1 · optional. Asks the PROVIDER whether the credential used by one attempt can no longer be accepted
   * (revoked or expired on the provider side). Only a positive provider answer is evidence; a date stored in
   * Brandopolis never is. Adapters whose provider cannot confirm this simply omit the method.
   */
  confirmAttemptCredentialUnusable?(provider: string, attemptId: string, credential: string): Promise<{ reason: 'REVOKED' | 'EXPIRED'; confirmedAt: Date } | null>;
  /** Block 8 · read-only status and basic metrics of a created campaign (provider data, or simulated by the simulator). */
  campaignStatus?(provider: string, providerIds: Record<string, string>, credential: string, currency: string): Promise<CampaignStatus | null>;
}
export type CampaignStatus = { status: 'PAUSED' | 'ENABLED' | 'REMOVED'; reviewStatus: 'UNDER_REVIEW' | 'APPROVED' | 'DISAPPROVED'; periodStart: string; periodEnd: string; currency: string; spendMinor: number; impressions: number; clicks: number; providerConversions: number };

export type Fault = 'TIMEOUT_AFTER_SEND' | 'REJECT' | 'DELAYED_VISIBILITY' | 'NO_HISTORY' | 'RATE_LIMIT' | 'PERMISSION_DENIED';
/** Optional persistence so separate processes (worker and web server in DEMO) share one simulated provider. */
export type SimulatorStore = { load(): SimulatorSnapshot | null; save(snapshot: SimulatorSnapshot): void };
export type SimulatorSnapshot = { seq: number; faults: Record<string, Fault[]>; created: Record<string, { providerIds: Record<string, string>; at: string; hidden: boolean }> };

/**
 * Deterministic simulator. Faults are armed per step key. TIMEOUT_AFTER_SEND creates the resource but returns
 * AMBIGUOUS (lost response); DELAYED_VISIBILITY hides a created resource from findByTag/changeHistory until released.
 * RATE_LIMIT and PERMISSION_DENIED are rejections without remote effect (provider limit; access revoked or insufficient).
 * Faults can also be armed for one remote tag (one step of one job). Created campaigns stay PAUSED with zero spend:
 * the simulator never invents spend.
 */
export class SimulatedProvider implements ProviderAdapter {
  readonly name = 'SIMULATOR';
  private faults = new Map<string, Set<Fault>>();
  private created = new Map<string, { providerIds: Record<string, string>; at: Date; hidden: boolean }>();
  readonly calls: StepRequest[] = [];
  accounts: { id: string; label: string }[] = [{ id: '123-456', label: 'Cuenta de prueba' }];
  private seq = 0;
  private revokedAttemptCredentials = new Map<string, 'REVOKED' | 'EXPIRED'>();
  /** Test hook: the provider side stops accepting the credential issued for one attempt. */
  revokeAttemptCredential(attemptId: string, reason: 'REVOKED' | 'EXPIRED' = 'REVOKED') { this.revokedAttemptCredentials.set(attemptId, reason); }
  constructor(private clock: () => Date = () => new Date(), private store?: SimulatorStore) {}
  private load() {
    const snap = this.store?.load();
    if (!snap) return;
    this.seq = snap.seq;
    this.faults = new Map(Object.entries(snap.faults).map(([k, v]) => [k, new Set(v)]));
    this.created = new Map(Object.entries(snap.created).map(([k, v]) => [k, { providerIds: v.providerIds, at: new Date(v.at), hidden: v.hidden }]));
  }
  private save() { this.store?.save({ seq: this.seq, faults: Object.fromEntries([...this.faults].map(([k, v]) => [k, [...v]])), created: Object.fromEntries([...this.created].map(([k, v]) => [k, { ...v, at: v.at.toISOString() }])) }); }
  arm(stepKey: string, ...faults: Fault[]) { this.load(); this.faults.set(stepKey, new Set(faults)); this.save(); }
  /** Arms faults for one remote tag only (one step of one job), e.g. a DEMO scenario chosen for one campaign. */
  armTag(remoteTag: string, ...faults: Fault[]) { this.arm(`tag:${remoteTag}`, ...faults); }
  release(remoteTag: string) { this.load(); const r = this.created.get(remoteTag); if (r) r.hidden = false; this.save(); }
  createdCount(remoteTag: string) { this.load(); return this.created.has(remoteTag) ? 1 : 0; }
  private has(request: { stepKey: string; remoteTag: string }, fault: Fault) { return (this.faults.get(request.stepKey)?.has(fault) ?? false) || (this.faults.get(`tag:${request.remoteTag}`)?.has(fault) ?? false); }
  async send(request: StepRequest): Promise<StepResponse> {
    this.load();
    this.calls.push({ ...request, credential: '[redacted]' });
    if (!request.credential) return { kind: 'REJECTED', code: 'UNAUTHENTICATED' };
    if (this.has(request, 'PERMISSION_DENIED')) return { kind: 'REJECTED', code: 'PERMISSION_DENIED' };
    if (this.has(request, 'RATE_LIMIT')) { this.faults.delete(`tag:${request.remoteTag}`); this.save(); return { kind: 'REJECTED', code: 'RESOURCE_EXHAUSTED' }; }
    if (this.has(request, 'REJECT')) return { kind: 'REJECTED', code: 'INVALID_ARGUMENT' };
    if (this.created.has(request.remoteTag)) return { kind: 'REJECTED', code: 'DUPLICATE_NAME' };
    const providerIds = { [request.stepKey]: `sim-${++this.seq}` };
    this.created.set(request.remoteTag, { providerIds, at: this.clock(), hidden: this.has(request, 'DELAYED_VISIBILITY') });
    this.save();
    if (this.has(request, 'TIMEOUT_AFTER_SEND')) return { kind: 'AMBIGUOUS', code: 'DEADLINE_EXCEEDED' };
    return { kind: 'SUCCESS', providerIds };
  }
  async campaignStatus(_provider: string, providerIds: Record<string, string>, _credential: string, currency: string): Promise<CampaignStatus | null> {
    this.load();
    const ids = new Set(Object.values(providerIds));
    if (![...this.created.values()].some(r => Object.values(r.providerIds).some(id => ids.has(id)))) return null;
    const day = this.clock().toISOString().slice(0, 10);
    return { status: 'PAUSED', reviewStatus: 'UNDER_REVIEW', periodStart: day, periodEnd: day, currency, spendMinor: 0, impressions: 0, clicks: 0, providerConversions: 0 };
  }
  async listAccounts() { return this.accounts; }
  async confirmAttemptCredentialUnusable(_provider: string, attemptId: string) {
    const reason = this.revokedAttemptCredentials.get(attemptId);
    return reason ? { reason, confirmedAt: this.clock() } : null;
  }
  async findByTag(_provider: string, remoteTag: string) {
    this.load();
    const r = this.created.get(remoteTag);
    return r && !r.hidden ? r.providerIds : null;
  }
  async changeHistory(_provider: string, from: Date, until: Date): Promise<ChangeHistory | null> {
    this.load();
    if ([...this.faults.values()].some(f => f.has('NO_HISTORY'))) return null;
    const creations = [...this.created.entries()].filter(([, r]) => !r.hidden && r.at >= from && r.at <= until).map(([remoteTag, r]) => ({ remoteTag, providerIds: r.providerIds }));
    return { coveredFrom: from, coveredUntil: until, creations };
  }
}
