import { randomUUID } from 'node:crypto';
import { normalizeDeliverable, type DeliverableContent, type DeliverableType } from './deliverables.js';
import type { SuggestionScope } from './brando-suggestions.js';

/**
 * ADR-0030 · Brando for marketing (B2, propose-only). The packet carries the minimum authorized context of one brand:
 * its name, the active decision versions, approved offers and active 90-day priorities. Never Mi aprendizaje, drafts,
 * other brands, credentials or comments. The person's request travels as untrusted data, never as instructions.
 */
export type MarketingPacket = {
  contextVersion: string;
  brand: { name: string };
  target: { type: DeliverableType; offerId: string | null };
  request: { trust: 'UNTRUSTED_USER_TEXT'; text: string };
  decisions: { id: string; area: string; text: string }[];
  offers: { id: string; name: string; need: string; outcome: string; benefits: string[]; differentiators: string[]; audience: string }[];
  priorities: { id: string; title: string }[];
  includedIds: string[];
};
export type MarketingProposal = { name: string; body: Record<string, unknown>; rationale: string; sourceIds: string[]; missing: string[]; questions: string[] };

export function marketingPacket(input: Omit<MarketingPacket, 'includedIds' | 'request'> & { request: string }): MarketingPacket {
  return { ...input, request: { trust: 'UNTRUSTED_USER_TEXT', text: input.request.slice(0, 1000) }, includedIds: [...input.decisions.map(d => d.id), ...input.offers.map(o => o.id), ...input.priorities.map(p => p.id)] };
}

/**
 * Server-side checks on a model proposal: it only cites ids of this packet, and its body is a valid draft of the
 * requested type. Returns the deliverable content it would become (decision citations kept as origin), or null.
 */
export function proposalContent(p: MarketingProposal, packet: MarketingPacket): DeliverableContent | null {
  if (p.sourceIds.some(id => !packet.includedIds.includes(id))) return null;
  const decisionIds = new Set(packet.decisions.map(d => d.id));
  try {
    return normalizeDeliverable({ type: packet.target.type, name: p.name, offerId: packet.target.offerId, sourceDecisionVersionIds: p.sourceIds.filter(id => decisionIds.has(id)), body: p.body });
  } catch { return null; }
}

/** Deterministic DEMO proposal built only from the packet. Never presented as live AI or market evidence. */
export function demoMarketingProposal(packet: MarketingPacket): MarketingProposal {
  const offer = packet.offers.find(o => o.id === packet.target.offerId) ?? packet.offers[0] ?? null;
  const message = packet.decisions.find(d => d.area === 'Core Message') ?? packet.decisions[0] ?? null;
  const customer = packet.decisions.find(d => d.area === 'Primary Customer') ?? null;
  const subject = offer?.name ?? packet.brand.name;
  const line = message?.text ?? `Conoce ${subject}`;
  const audience = offer?.audience || customer?.text || '';
  const benefit = offer?.benefits[0] ?? offer?.outcome ?? '';
  const sources = [...new Set([offer?.id, message?.id, customer?.id].filter((id): id is string => Boolean(id) && packet.includedIds.includes(id!)))];
  const bodies: Record<DeliverableType, Record<string, unknown>> = {
    SALES_PRESENTATION: { audience, slides: [{ title: 'El problema', text: offer?.need ?? '' }, { title: subject, text: line }, { title: 'Qué consigues', text: offer?.outcome ?? benefit }, { title: 'Siguiente paso', text: 'Agenda una conversación.' }] },
    OFFER_COPY: { headline: line.slice(0, 160), short: (benefit || line).slice(0, 300), long: [offer?.need, offer?.outcome, ...(offer?.differentiators ?? [])].filter(Boolean).join('\n\n').slice(0, 3000), callToAction: 'Agenda una conversación' },
    SOCIAL_POST: { network: 'LINKEDIN', format: 'POST', objective: `Dar a conocer ${subject}`.slice(0, 300), scheduledDate: null, text: [line, benefit].filter(Boolean).join('\n\n').slice(0, 2200), hashtags: [], materials: 'Imagen con el mensaje principal.' },
    AD: { channel: 'GOOGLE', objective: 'TRAFFIC', headlines: [subject.slice(0, 90), line.slice(0, 90)].filter(Boolean), descriptions: benefit ? [benefit.slice(0, 300)] : [], callToAction: 'Conoce más', landingUrl: null },
    DESIGN_BRIEF: { for: 'DESIGNER', piece: `Pieza para presentar ${subject}`.slice(0, 300), format: '', audience: audience.slice(0, 500), message: line.slice(0, 1000), mustInclude: offer ? `Nombre de la oferta: ${offer.name}` : '', avoid: '', dueDate: null }
  };
  const missing = [...(!offer && packet.target.type !== 'DESIGN_BRIEF' ? ['Una oferta aprobada que respalde el contenido.'] : []), ...(!message ? ['Un mensaje principal definido en tu estrategia.'] : []), ...(!audience ? ['A quién va dirigido.'] : [])];
  return {
    name: `Propuesta de ejemplo · ${subject}`.slice(0, 160),
    body: bodies[packet.target.type],
    rationale: 'Propuesta DEMO fija: reutiliza tu información aprobada tal como está, sin inventar datos. Edítala antes de usarla.',
    sourceIds: sources,
    missing,
    questions: ['¿Qué resultado concreto quieres que provoque esta pieza?', '¿Hay una fecha o un evento que deba mencionar?']
  };
}

/**
 * Server-side, single-use proof that a person asked Brando for a proposal of this type. Never sent to the provider;
 * it only lets the server record a deliverable's provenance as AI_ASSISTED, and is consumed on first use.
 */
export type MarketingProofScope = SuggestionScope & { type: DeliverableType; offerId: string | null; contextVersion: string };
export class MarketingAssistance {
  private proofs = new Map<string, MarketingProofScope & { expiresAt: number }>();
  constructor(private now = Date.now, private ttlMs = 30 * 60 * 1000, private capacity = 512, private perPerson = 16) {}
  issue(value: MarketingProofScope) {
    for (const [k, p] of this.proofs) if (p.expiresAt <= this.now()) this.proofs.delete(k);
    // A person's own oldest proofs make room first; the global cap applies only beyond that.
    const own = [...this.proofs].filter(([, p]) => p.userId === value.userId);
    for (const [k] of own.slice(0, Math.max(0, own.length - this.perPerson + 1))) this.proofs.delete(k);
    while (this.proofs.size >= this.capacity) this.proofs.delete(this.proofs.keys().next().value!);
    const proofId = randomUUID(), expiresAt = this.now() + this.ttlMs;
    this.proofs.set(proofId, { ...value, expiresAt });
    return { proofId, expiresAt: new Date(expiresAt).toISOString() };
  }
  /**
   * The proof of this actor and brand for this type, when current (does not consume it). The caller still checks that
   * the draft cites the same offer and that the brand context has not changed since the proposal (VAL-011).
   */
  read(proofId: unknown, scope: SuggestionScope, type: DeliverableType) {
    if (typeof proofId !== 'string') return null;
    const p = this.proofs.get(proofId);
    return p && p.expiresAt > this.now() && p.userId === scope.userId && p.workspaceId === scope.workspaceId && p.brandId === scope.brandId && p.type === type ? p : null;
  }
  consume(proofId: string) { this.proofs.delete(proofId); }
}
