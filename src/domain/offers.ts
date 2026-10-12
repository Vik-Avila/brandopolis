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
  /** PHASE4_SPEC §13 · several price plans per version (absent in versions created before them). */
  pricePlans?: PricePlan[];
};
export type Periodicity = 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';
export type PricePlan = { name: string; amountMinor: number; currency: string; periodicity: Periodicity | null; customPeriod: string; unit: 'PER_SERVICE' | 'PER_PERSON' | 'PER_UNIT' | 'OTHER'; unitLabel: string; conditions: string; validFrom: string | null; validUntil: string | null; certainty: 'CONFIRMED' | 'ESTIMATED' };

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const list = (value: unknown) => (Array.isArray(value) ? value.map(text).filter(Boolean) : []);
const ids = (value: unknown) => [...new Set(list(value))];
const dateOrNull = (value: unknown) => text(value) || null;

/**
 * A plan keeps what the person wrote: periodicity null means «not stated» (a legacy single price carried over keeps it
 * that way; nothing is invented). CUSTOM needs its description and OTHER units their label.
 */
function normalizePlan(raw: unknown): PricePlan {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    name: text(p.name), amountMinor: p.amountMinor as number, currency: text(p.currency).toUpperCase(),
    periodicity: p.periodicity == null || p.periodicity === '' ? null : p.periodicity as Periodicity,
    customPeriod: p.periodicity === 'CUSTOM' ? text(p.customPeriod) : '',
    unit: (p.unit ?? 'PER_SERVICE') as PricePlan['unit'], unitLabel: p.unit === 'OTHER' ? text(p.unitLabel) : '',
    conditions: text(p.conditions), validFrom: dateOrNull(p.validFrom), validUntil: dateOrNull(p.validUntil),
    certainty: p.certainty as 'CONFIRMED'
  };
}

/** A legacy single price shown and edited as one plan, without inventing a periodicity or a unit label. */
export function legacyPlan(price: NonNullable<OfferContent['price']>): PricePlan {
  return { name: 'Precio', amountMinor: price.amountMinor, currency: price.currency, periodicity: null, customPeriod: '', unit: 'PER_SERVICE', unitLabel: '', conditions: '', validFrom: price.validFrom, validUntil: price.validUntil, certainty: price.certainty };
}

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
    } : null,
    ...(raw.pricePlans !== undefined ? { pricePlans: (Array.isArray(raw.pricePlans) ? raw.pricePlans : [null]).map(normalizePlan) } : {})
  };
  validate('offer-version', content);
  if (content.price?.validFrom && content.price.validUntil && content.price.validUntil < content.price.validFrom) throw new AppError('INVALID', 'Price validity ends before it starts');
  for (const plan of content.pricePlans ?? []) {
    if (plan.validFrom && plan.validUntil && plan.validUntil < plan.validFrom) throw new AppError('INVALID', 'Price validity ends before it starts');
    if (plan.periodicity === 'CUSTOM' && !plan.customPeriod) throw new AppError('INVALID', 'Describe the custom periodicity');
    if (plan.unit === 'OTHER' && !plan.unitLabel) throw new AppError('INVALID', 'Describe the unit');
  }
  if (new Set((content.pricePlans ?? []).map(p => p.name.toLowerCase())).size !== (content.pricePlans ?? []).length) throw new AppError('INVALID', 'Each price plan needs its own name');
  return content;
}

/**
 * «Create from this offer»: a new draft with the same content and plans. Nothing that belongs to the source travels
 * (approvals, reviewers, invitations, publications and authorizations live outside the content); the name says it is
 * a copy so both can be told apart.
 */
export function derivedContent(source: OfferContent): OfferContent {
  const name = `${source.name} (copia)`.slice(0, 160);
  return normalizeOfferContent({ ...source, name, ...(source.pricePlans === undefined && source.price ? { pricePlans: [legacyPlan(source.price)], price: null } : {}) });
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
