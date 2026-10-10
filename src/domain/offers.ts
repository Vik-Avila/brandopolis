import { AppError, validate } from './contracts.js';

/**
 * ADR-0030 / PHASE4_SPEC §4.1 · offers (products and services). Pure rules: normalization of the editable content,
 * price coherence and the read-only «origin updated» projection. Persistence and authorization live in the
 * application layer.
 */
export type OfferContent = {
  name: string;
  kind: 'PRODUCT' | 'SERVICE';
  audience: { customerDecisionVersionId: string | null; segment: string };
  need: string;
  outcome: string;
  benefits: string[];
  differentiators: string[];
  conditions: string;
  proofIds: string[];
  sourceDecisionVersionIds: string[];
  hypothesisIds: string[];
  price: { amountMinor: number; currency: string; validFrom: string | null; validUntil: string | null; certainty: 'CONFIRMED' | 'ESTIMATED' } | null;
};

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const list = (value: unknown) => (Array.isArray(value) ? value.map(text).filter(Boolean) : []);
const ids = (value: unknown) => [...new Set(list(value))];

/** Trims and fills defaults, then validates against offer-version v1 and the price rules (MKT-006). */
export function normalizeOfferContent(input: unknown): OfferContent {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new AppError('INVALID', 'Invalid offer');
  const raw = input as Record<string, unknown>;
  const audience = (raw.audience && typeof raw.audience === 'object' ? raw.audience : {}) as Record<string, unknown>;
  const price = raw.price && typeof raw.price === 'object' ? raw.price as Record<string, unknown> : null;
  const content: OfferContent = {
    name: text(raw.name),
    kind: raw.kind === 'PRODUCT' ? 'PRODUCT' : raw.kind === 'SERVICE' ? 'SERVICE' : (raw.kind as 'PRODUCT'),
    audience: { customerDecisionVersionId: text(audience.customerDecisionVersionId) || null, segment: text(audience.segment) },
    need: text(raw.need),
    outcome: text(raw.outcome),
    benefits: list(raw.benefits),
    differentiators: list(raw.differentiators),
    conditions: text(raw.conditions),
    proofIds: ids(raw.proofIds),
    sourceDecisionVersionIds: ids(raw.sourceDecisionVersionIds),
    hypothesisIds: ids(raw.hypothesisIds),
    price: price ? {
      amountMinor: price.amountMinor as number,
      currency: text(price.currency).toUpperCase(),
      validFrom: text(price.validFrom) || null,
      validUntil: text(price.validUntil) || null,
      certainty: price.certainty as 'CONFIRMED'
    } : null
  };
  validate('offer-version', content);
  if (content.price?.validFrom && content.price.validUntil && content.price.validUntil < content.price.validFrom) throw new AppError('INVALID', 'Price validity ends before it starts');
  return content;
}

/** What is still missing for a useful offer (shown as guidance; never blocks a draft). */
export function offerGaps(content: OfferContent): string[] {
  const gaps: string[] = [];
  if (!content.audience.segment && !content.audience.customerDecisionVersionId) gaps.push('AUDIENCE');
  if (!content.need) gaps.push('NEED');
  if (!content.benefits.length) gaps.push('BENEFITS');
  if (!content.proofIds.length) gaps.push('PROOF');
  return gaps;
}

/**
 * «Origin updated» is a read-only projection (INV-008, no cascade): an approved offer cites decision versions that are
 * no longer the active ones. It never rewrites the offer nor creates a review; a person decides.
 */
export function originOutdated(content: OfferContent, activeVersionByDecision: Map<string, string>, decisionOfVersion: Map<string, string>) {
  return content.sourceDecisionVersionIds.filter(versionId => {
    const decisionId = decisionOfVersion.get(versionId);
    return decisionId !== undefined && activeVersionByDecision.get(decisionId) !== versionId;
  });
}
