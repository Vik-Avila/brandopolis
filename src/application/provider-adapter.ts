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
}

type Fault = 'TIMEOUT_AFTER_SEND' | 'REJECT' | 'DELAYED_VISIBILITY' | 'NO_HISTORY';

/**
 * Deterministic simulator. Faults are armed per step key. TIMEOUT_AFTER_SEND creates the resource but returns
 * AMBIGUOUS (lost response); DELAYED_VISIBILITY hides a created resource from findByTag/changeHistory until released.
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
  constructor(private clock: () => Date = () => new Date()) {}
  arm(stepKey: string, ...faults: Fault[]) { this.faults.set(stepKey, new Set(faults)); }
  release(remoteTag: string) { const r = this.created.get(remoteTag); if (r) r.hidden = false; }
  createdCount(remoteTag: string) { return this.created.has(remoteTag) ? 1 : 0; }
  private has(stepKey: string, fault: Fault) { return this.faults.get(stepKey)?.has(fault) ?? false; }
  async send(request: StepRequest): Promise<StepResponse> {
    this.calls.push({ ...request, credential: '[redacted]' });
    if (!request.credential) return { kind: 'REJECTED', code: 'UNAUTHENTICATED' };
    if (this.has(request.stepKey, 'REJECT')) return { kind: 'REJECTED', code: 'INVALID_ARGUMENT' };
    if (this.created.has(request.remoteTag)) return { kind: 'REJECTED', code: 'DUPLICATE_NAME' };
    const providerIds = { [request.stepKey]: `sim-${++this.seq}` };
    this.created.set(request.remoteTag, { providerIds, at: this.clock(), hidden: this.has(request.stepKey, 'DELAYED_VISIBILITY') });
    if (this.has(request.stepKey, 'TIMEOUT_AFTER_SEND')) return { kind: 'AMBIGUOUS', code: 'DEADLINE_EXCEEDED' };
    return { kind: 'SUCCESS', providerIds };
  }
  async listAccounts() { return this.accounts; }
  async confirmAttemptCredentialUnusable(_provider: string, attemptId: string) {
    const reason = this.revokedAttemptCredentials.get(attemptId);
    return reason ? { reason, confirmedAt: this.clock() } : null;
  }
  async findByTag(_provider: string, remoteTag: string) {
    const r = this.created.get(remoteTag);
    return r && !r.hidden ? r.providerIds : null;
  }
  async changeHistory(_provider: string, from: Date, until: Date): Promise<ChangeHistory | null> {
    if ([...this.faults.values()].some(f => f.has('NO_HISTORY'))) return null;
    const creations = [...this.created.entries()].filter(([, r]) => !r.hidden && r.at >= from && r.at <= until).map(([remoteTag, r]) => ({ remoteTag, providerIds: r.providerIds }));
    return { coveredFrom: from, coveredUntil: until, creations };
  }
}
