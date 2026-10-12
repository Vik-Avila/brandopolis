import { createHash } from 'node:crypto';

/**
 * ADR-0031 · Canva Connect (product integration, per user). Each capability is «verified» only after testing it with
 * the real integration and a concrete account; until then the simulator reports SIMULATED, and plan-dependent
 * capabilities the account lacks are UNAVAILABLE (CNV-002). The simulator proves local logic, never compatibility.
 */
export type CanvaCapabilityState = 'VERIFIED' | 'SIMULATED' | 'UNAVAILABLE' | 'NOT_VERIFIED';
export type CanvaCapability = { key: 'UPLOAD_ASSETS' | 'CREATE_DESIGN' | 'LINK_DESIGN' | 'OPEN_EDITOR' | 'EXPORT' | 'AUTOFILL' | 'BRAND_TEMPLATES'; state: CanvaCapabilityState };
export interface CanvaAdapter {
  readonly name: string;
  readonly simulated: boolean;
  capabilities(credential: string): Promise<CanvaCapability[]>;
  /** Creates a design from a brief and allowed kit files. Returns the provider's design reference (never a secret). */
  createDesign(input: { title: string; brief: string; assetCount: number; credential: string }): Promise<{ designRef: string; editUrl: string | null }>;
  /** Exports the current design; the file's digest identifies what was retrieved. */
  exportDesign(input: { designRef: string; credential: string }): Promise<{ format: 'PNG'; sha256: string; pages: number }>;
  /** Read-only: whether a design reference exists and this person may access it (to link an existing design). */
  findDesign(input: { designRef: string; credential: string }): Promise<{ designRef: string } | null>;
}

export class SimulatedCanva implements CanvaAdapter {
  readonly name = 'SIMULATOR';
  readonly simulated = true;
  private seq = 0;
  /** Which credential created each design: another person's design is not found with your credential. */
  private owners = new Map<string, string>();
  async capabilities(): Promise<CanvaCapability[]> {
    return [
      { key: 'UPLOAD_ASSETS', state: 'SIMULATED' }, { key: 'CREATE_DESIGN', state: 'SIMULATED' }, { key: 'LINK_DESIGN', state: 'SIMULATED' }, { key: 'OPEN_EDITOR', state: 'NOT_VERIFIED' },
      { key: 'EXPORT', state: 'SIMULATED' }, { key: 'AUTOFILL', state: 'UNAVAILABLE' }, { key: 'BRAND_TEMPLATES', state: 'UNAVAILABLE' },
    ];
  }
  async createDesign(input: { title: string; credential: string }) { const designRef = `sim-design-${Date.now().toString(36)}-${++this.seq}-${createHash('sha256').update(input.title).digest('hex').slice(0, 6)}`; this.owners.set(designRef, input.credential); return { designRef, editUrl: null }; }
  /** Simulated: «sim-design-existing-…» stands for a design already in the person's account; designs created here are
   *  found only with the credential that created them (another person's or brand's design is not accessible). */
  async findDesign(input: { designRef: string; credential: string }) {
    if (!input.credential) return null;
    if (/^sim-design-existing-[a-z0-9-]{1,40}$/.test(input.designRef)) return { designRef: input.designRef };
    return this.owners.get(input.designRef) === input.credential ? { designRef: input.designRef } : null;
  }
  async exportDesign(input: { designRef: string }) { return { format: 'PNG' as const, sha256: createHash('sha256').update(`export:${input.designRef}`).digest('hex'), pages: 1 }; }
}
