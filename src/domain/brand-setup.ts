/**
 * PHASE4_SPEC §4.10 · guided start. Guide and ficha share one set of fields; confirming turns the confirmed fields into
 * declared context (the prefixed user-input statements Strategic Intelligence already projects, ADR-0025). Pure: no
 * I/O. Nothing here creates a decision, a version, a kit or a plan; the work priority lives in work-priority.
 */
import { AppError } from './contracts.js';
import { GEOGRAPHIC_INFLUENCE } from './brand-context.js';
import type { WorkIntent } from './work-priority.js';

export const SETUP_FIELDS = ['name', 'ownership', 'stage', 'offer', 'audience', 'geography', 'market', 'goal', 'references'] as const;
export type SetupField = typeof SETUP_FIELDS[number];
export type FieldSource = { documentId: string; claimId: string; documentName: string } | null;
export type FieldValue = { value: string | null; state: 'CONFIRMED' | 'UNKNOWN'; source: FieldSource };
export type SetupFields = Partial<Record<SetupField, FieldValue>>;
export const IDENTITY_CHOICES = ['HAVE', 'COMPLETE', 'CREATE', 'LATER'] as const;
export type IdentityChoice = typeof IDENTITY_CHOICES[number];

const CHOICES: Partial<Record<SetupField, readonly string[]>> = {
  ownership: ['OWN', 'CLIENT'], stage: ['IDEA', 'EXISTING'], geography: GEOGRAPHIC_INFLUENCE
};
const MAX: Record<SetupField, number> = { name: 160, ownership: 10, stage: 10, offer: 6000, audience: 2000, geography: 10, market: 160, goal: 2000, references: 2500 };

/**
 * Validates one field written by the person. `UNKNOWN` is «No lo sé todavía» (no value). A document source names the
 * claim the person chose; the caller checks that the claim belongs to the brand.
 */
export function fieldValue(field: SetupField, raw: unknown): FieldValue {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new AppError('INVALID', `Invalid ${field}`);
  const { value, state, source } = raw as Record<string, unknown>;
  if (state === 'UNKNOWN') {
    if (field === 'name') throw new AppError('INVALID', 'A brand needs a name');
    return { value: null, state: 'UNKNOWN', source: null };
  }
  if (state !== 'CONFIRMED' || typeof value !== 'string' || !value.trim() || value.length > MAX[field]) throw new AppError('INVALID', `Invalid ${field}`);
  const trimmed = value.trim();
  if (CHOICES[field] && !CHOICES[field]!.includes(trimmed)) throw new AppError('INVALID', `Invalid ${field}`);
  let src: FieldSource = null;
  if (source != null) {
    if ((field !== 'offer' && field !== 'audience') || typeof source !== 'object') throw new AppError('INVALID', `Invalid ${field} source`);
    const s = source as Record<string, unknown>;
    if (typeof s.documentId !== 'string' || typeof s.claimId !== 'string' || !s.documentId || !s.claimId) throw new AppError('INVALID', `Invalid ${field} source`);
    src = { documentId: s.documentId, claimId: s.claimId, documentName: '' };
  }
  return { value: trimmed, state: 'CONFIRMED', source: src };
}

/** Merges a partial update (null removes a field: back to pending). Unknown keys are rejected. */
export function mergeFields(current: SetupFields, patch: unknown): SetupFields {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new AppError('INVALID', 'Invalid fields');
  const next: SetupFields = { ...current };
  for (const [key, raw] of Object.entries(patch as Record<string, unknown>)) {
    if (!(SETUP_FIELDS as readonly string[]).includes(key)) throw new AppError('INVALID', `Unknown field ${key}`);
    const field = key as SetupField;
    if (raw === null) { if (field === 'name') throw new AppError('INVALID', 'A brand needs a name'); delete next[field]; continue; }
    next[field] = fieldValue(field, raw);
  }
  return next;
}

/**
 * What the guide asks for each priority, in order. Only these fields are asked; everything else stays available in
 * the ficha. Confirmed or «No lo sé todavía» fields are never asked again.
 */
const ASKED: Record<WorkIntent, SetupField[]> = {
  STRATEGY_FULL: ['offer', 'audience', 'geography', 'goal', 'stage'],
  STRATEGY_POINT: ['offer', 'goal'],
  SELL_OFFER: ['offer', 'audience', 'geography'],
  VISUAL_IDENTITY: ['offer', 'audience'],
  MARKETING_PLAN: ['offer', 'audience', 'geography', 'goal'],
  SOCIAL_MEDIA: ['audience', 'offer', 'goal'],
  WEBSITE: ['offer', 'audience', 'geography'],
  CAMPAIGN: ['offer', 'audience', 'geography', 'goal'],
  SALES_MATERIALS: ['offer', 'audience'],
  OTHER: ['offer', 'goal'],
  HELP_ME_CHOOSE: ['offer', 'goal'],
  CONTENT: ['offer', 'audience']
};
export const askedFor = (intent: WorkIntent | null) => ASKED[intent ?? 'HELP_ME_CHOOSE'];
/** Fields the guide still has to ask for this priority (absent ones only). */
export const missingFor = (intent: WorkIntent | null, fields: SetupFields) => askedFor(intent).filter(f => !fields[f]);
/** The identity step can be postponed unless the chosen priority is the visual identity itself. */
export const identityPostponable = (intent: WorkIntent | null) => intent !== 'VISUAL_IDENTITY';

/** Values proposed by the brand's documents (OFFER → offer, AUDIENCE → audience), grouped; conflicts stay visible. */
export type Proposal = { field: 'offer' | 'audience'; claimId: string; documentId: string; documentName: string; statement: string };
export function proposalsFrom(claims: { id: string; documentId: string; claimType: string; statement: string; reviewStatus: string; reviewedStatement: string | null }[], names: Map<string, string>) {
  const out: Proposal[] = [];
  for (const c of claims) {
    const field = c.claimType === 'OFFER' ? 'offer' : c.claimType === 'AUDIENCE' ? 'audience' : null;
    if (!field || c.reviewStatus === 'REJECTED') continue;
    out.push({ field, claimId: c.id, documentId: c.documentId, documentName: names.get(c.documentId) ?? 'Documento', statement: (c.reviewedStatement ?? c.statement).trim() });
  }
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const conflicts = (['offer', 'audience'] as const).filter(f => {
    const of = out.filter(p => p.field === f);
    return new Set(of.map(p => norm(p.statement))).size > 1 && new Set(of.map(p => p.documentId)).size > 1;
  });
  return { proposals: out, conflicts };
}

/**
 * Summary for «Revisa y comienza»: confirmed (written or chosen by the person), proposed (from documents, not chosen)
 * and pending (missing or «No lo sé todavía»). Real stages, never a percentage.
 */
export function setupSummary(fields: SetupFields, proposals: Proposal[], intent: WorkIntent | null) {
  const confirmed = SETUP_FIELDS.filter(f => fields[f]?.state === 'CONFIRMED');
  const proposed = [...new Set(proposals.map(p => p.field))].filter(f => !fields[f]);
  const pending = [...new Set([...askedFor(intent), 'name' as SetupField])].filter(f => fields[f]?.state !== 'CONFIRMED' && !proposed.includes(f as 'offer'));
  return { confirmed, proposed, pending };
}

/** Prefixes of declared context (ADR-0025 projection). The first four are the historical brand-creation prefixes. */
export const DECLARED_PREFIX = {
  offer: 'Qué está construyendo:', goal: 'Objetivo inmediato:', stage: 'Punto de partida declarado:',
  references: 'Entorno competitivo — referencias aportadas por el usuario:', audience: 'A quién atiende:', ownership: 'Relación con la marca:'
} as const;
const STAGE_TEXT: Record<string, string> = { EXISTING: 'Mi marca ya existe.', IDEA: 'Tengo una idea.' };
const OWNERSHIP_TEXT: Record<string, string> = { OWN: 'Es mi marca.', CLIENT: 'Es la marca de un cliente.' };

/** Statements to record on confirmation, one per confirmed field with a declared-context prefix. */
export function declaredStatements(fields: SetupFields) {
  const out: { field: keyof typeof DECLARED_PREFIX; statement: string }[] = [];
  for (const field of Object.keys(DECLARED_PREFIX) as (keyof typeof DECLARED_PREFIX)[]) {
    const f = fields[field];
    if (f?.state !== 'CONFIRMED' || !f.value) continue;
    const text = field === 'stage' ? STAGE_TEXT[f.value] : field === 'ownership' ? OWNERSHIP_TEXT[f.value] : f.value;
    out.push({ field, statement: `${DECLARED_PREFIX[field]} ${text}` });
  }
  return out;
}

/**
 * Latest declared value per prefix (by createdAt, then id): a later correction wins over an earlier statement.
 * Shared by the Strategic Intelligence projection and the ficha of an existing brand.
 */
export function latestDeclared(userInputs: Record<string, unknown>[]) {
  const ordered = [...userInputs].sort((a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')) || String(a.id ?? '').localeCompare(String(b.id ?? '')));
  const out: Partial<Record<keyof typeof DECLARED_PREFIX, string>> = {};
  for (const input of ordered) {
    const s = typeof input.statement === 'string' ? input.statement : '';
    for (const [key, prefix] of Object.entries(DECLARED_PREFIX)) if (s.startsWith(prefix)) out[key as keyof typeof DECLARED_PREFIX] = s.slice(prefix.length).trim();
  }
  return out;
}

/** Ficha fields of an existing brand without a draft, read back from its declared context and geography. */
export function fieldsFromDeclared(name: string, declared: ReturnType<typeof latestDeclared>, geography: { influence: string | null; market: string | null }): SetupFields {
  const confirmed = (value: string): FieldValue => ({ value, state: 'CONFIRMED', source: null });
  const fields: SetupFields = { name: confirmed(name) };
  const back = (map: Record<string, string>, text?: string) => Object.entries(map).find(([, v]) => v === text)?.[0];
  for (const f of ['offer', 'goal', 'references', 'audience'] as const) if (declared[f]) fields[f] = confirmed(declared[f]!);
  const stage = back(STAGE_TEXT, declared.stage), ownership = back(OWNERSHIP_TEXT, declared.ownership);
  if (stage) fields.stage = confirmed(stage);
  if (ownership) fields.ownership = confirmed(ownership);
  if (geography.influence) fields.geography = confirmed(geography.influence);
  if (geography.market) fields.market = confirmed(geography.market);
  return fields;
}
