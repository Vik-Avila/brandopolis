import { change, inRange, readingOverlaps, resultsPeriod } from '../domain/results-period.js';
import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { AppError, validate } from '../domain/contracts.js';
import {
  attention, calendarDate, contactEmail, contactPhone, DEV_PRIVACY_NOTICE, evidence, fingerprint, formName, isOpportunityStatus,
  need, newPublicFormId, nextAction, personName, RESULTS_TIMEZONE, segmentName, today, validPublicFormId, validSubmissionId, type Evidence,
} from '../domain/clients.js';
import type { Transaction } from '../persistence/database.js';
import * as t from '../persistence/schema.js';
import type { BrandActor } from './brand-access.js';
import { budgetRule, plannedMinor, type CampaignContent } from '../domain/campaign.js';

/**
 * ADR-0035 · Clientes (Phase 4 capture). Team operations receive a BrandActor (membership + brand scope from
 * Engine.withBrandActor), so a client guest (ADR-0033, no membership) never reaches them. The public web form is the
 * only entry without a session: the brand comes from the active form, never from the browser.
 */
type Scoped = { workspaceId: string; brandId: string };
const byBrand = (table: { workspaceId: AnyPgColumn; brandId: AnyPgColumn }, a: Scoped) => and(eq(table.workspaceId, a.workspaceId), eq(table.brandId, a.brandId));
const key = (v: unknown) => { if (typeof v !== 'string' || !v.trim() || v.length > 200) throw new AppError('INVALID', 'Invalid idempotency key'); return v; };
const idOf = (v: unknown, what: string) => { if (typeof v !== 'string' || !v || v.length > 200) throw new AppError('INVALID', `${what} required`); return v; };
const optionalId = (v: unknown, what: string) => (v == null || v === '' ? null : idOf(v, what));
const needsPublish = (a: BrandActor) => { if (!a.capabilities.includes('PUBLISH_SITE')) throw new AppError('FORBIDDEN', 'Opening a public form needs the publish permission'); };

/** People who may own an opportunity of this brand: active ADMINs of the workspace and active MEMBERs assigned to it. */
async function assignable(tx: Transaction, a: Scoped) {
  const members = await tx.select().from(t.memberships).where(and(eq(t.memberships.workspaceId, a.workspaceId), eq(t.memberships.active, true)));
  const assigned = new Set((await tx.select({ userId: t.assignments.userId }).from(t.assignments).where(and(eq(t.assignments.workspaceId, a.workspaceId), eq(t.assignments.brandId, a.brandId)))).map(r => r.userId));
  return members.filter(m => m.role === 'ADMIN' || (m.role === 'MEMBER' && assigned.has(m.userId))).map(m => m.userId);
}
async function names(tx: Transaction, ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const rows = await tx.select({ userId: t.userAccounts.userId, displayName: t.userAccounts.displayName, email: t.userAccounts.email }).from(t.userAccounts).where(inArray(t.userAccounts.userId, ids));
  return new Map(rows.map(r => [r.userId, r.displayName || r.email]));
}
async function offerChoices(tx: Transaction, a: Scoped) {
  const offers = await tx.select({ id: t.offers.id, status: t.offers.status, approvedVersionId: t.offers.approvedVersionId }).from(t.offers).where(byBrand(t.offers, a)).orderBy(asc(t.offers.createdAt));
  if (!offers.length) return [];
  const versions = await tx.select({ id: t.offerVersions.id, offerId: t.offerVersions.offerId, content: t.offerVersions.content }).from(t.offerVersions).where(byBrand(t.offerVersions, a)).orderBy(desc(t.offerVersions.sequence));
  return offers.map(o => { const shown = versions.find(v => v.id === o.approvedVersionId) ?? versions.find(v => v.offerId === o.id); return { id: o.id, active: o.status === 'ACTIVE', name: String((shown?.content as { name?: string } | undefined)?.name ?? 'Oferta') }; });
}
/** Every reference must belong to this brand (composite FKs repeat the check in the database). */
async function checkReferences(tx: Transaction, a: Scoped, refs: { ownerUserId?: string | null; segmentId?: string | null; offerId?: string | null }) {
  if (refs.ownerUserId && !(await assignable(tx, a)).includes(refs.ownerUserId)) throw new AppError('INVALID', 'The owner must be an active member with access to this brand');
  if (refs.segmentId) { const [s] = await tx.select().from(t.clientSegments).where(and(byBrand(t.clientSegments, a), eq(t.clientSegments.id, refs.segmentId))); if (!s || !s.active) throw new AppError('INVALID', 'Unknown segment for this brand'); }
  if (refs.offerId) { const [o] = await tx.select({ id: t.offers.id }).from(t.offers).where(and(byBrand(t.offers, a), eq(t.offers.id, refs.offerId))); if (!o) throw new AppError('INVALID', 'Unknown offer for this brand'); }
}

type Opportunity = typeof t.clientOpportunities.$inferSelect;
const view = (o: Opportunity, day: string) => ({
  id: o.id, reference: reference(o.id), revision: o.revision, status: o.status, source: o.source, formId: o.formId, personName: o.personName, contactEmail: o.contactEmail,
  contactPhone: o.contactPhone, need: o.need, ownerUserId: o.ownerUserId, segmentId: o.segmentId, offerId: o.offerId, nextAction: o.nextAction,
  nextActionDate: o.nextActionDate, receivedAt: o.receivedAt.toISOString(), updatedAt: o.updatedAt.toISOString(), attention: attention(o, day),
});

// ─── Reading ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** Clientes of one brand: opportunities with their first origin, pending work, segments, forms and choices. */
export async function readClients(tx: Transaction, a: BrandActor) {
  const day = today();
  const rows = await tx.select().from(t.clientOpportunities).where(byBrand(t.clientOpportunities, a)).orderBy(desc(t.clientOpportunities.receivedAt), desc(t.clientOpportunities.id));
  const interactions = rows.length ? await tx.select().from(t.clientInteractions).where(byBrand(t.clientInteractions, a)).orderBy(asc(t.clientInteractions.receivedAt), asc(t.clientInteractions.id)) : [];
  const events = rows.length ? await tx.select().from(t.clientOpportunityEvents).where(byBrand(t.clientOpportunityEvents, a)).orderBy(desc(t.clientOpportunityEvents.createdAt), desc(t.clientOpportunityEvents.revision)) : [];
  const segments = await tx.select().from(t.clientSegments).where(byBrand(t.clientSegments, a)).orderBy(asc(t.clientSegments.name));
  const forms = await tx.select().from(t.leadForms).where(byBrand(t.leadForms, a)).orderBy(asc(t.leadForms.createdAt));
  const members = await assignable(tx, a);
  const who = await names(tx, [...new Set([...members, ...events.map(e => e.actorId).filter((x): x is string => !!x), ...rows.map(r => r.ownerUserId).filter((x): x is string => !!x)])]);
  const nameOf = (id: string | null) => (id === null ? null : id === a.userId ? 'Tú' : who.get(id) ?? 'Persona del equipo');
  const firstOrigin = new Map<string, typeof interactions[number]>();
  for (const i of interactions) if (!firstOrigin.has(i.opportunityId)) firstOrigin.set(i.opportunityId, i);
  return {
    today: day, timezone: RESULTS_TIMEZONE, canManageForms: a.capabilities.includes('PUBLISH_SITE'),
    opportunities: rows.map(o => {
      const i = firstOrigin.get(o.id);
      return {
        ...view(o, day), ownerName: nameOf(o.ownerUserId),
        origin: i ? { kind: i.kind, attentionChannel: i.attentionChannel, acquisitionPlatform: i.acquisitionPlatform, declaredOrigin: i.declaredOrigin, utm: i.utm, clickIds: i.clickIds, landingPath: i.landingPath, referrerHost: i.referrerHost, campaignStatus: i.campaignStatus, campaignCause: i.campaignCause, occurredAt: i.occurredAt?.toISOString() ?? null } : null,
        history: events.filter(e => e.opportunityId === o.id).map(e => ({ kind: e.kind, actor: e.actorId ? nameOf(e.actorId) : 'Formulario web', revision: e.revision, detail: e.detail, createdAt: e.createdAt.toISOString() })),
      };
    }),
    segments: segments.map(s => ({ id: s.id, name: s.name, active: s.active })),
    forms: forms.map(f => ({ id: f.id, publicId: f.publicId, name: f.name, segmentId: f.segmentId, status: f.status, privacyNoticeVersion: f.privacyNoticeVersion, createdAt: f.createdAt.toISOString() })),
    members: members.map(id => ({ userId: id, name: nameOf(id)! })),
    offers: await offerChoices(tx, a),
  };
}

// ─── Capture (shared by manual entry and the web form) ───────────────────────────────────────────────────────────

type Capture = { personName: string; contactEmail: string | null; contactPhone: string | null; need: string; ownerUserId: string | null; segmentId: string | null; offerId: string | null; nextAction: string | null; nextActionDate: string | null };
/**
 * Stores opportunity + first interaction + CREATED event in the caller's transaction, so the confirmation is only
 * returned after all three are committed. A retry with the same (scope, key) and content returns the original row;
 * the same key with other content is a conflict. ON CONFLICT DO NOTHING + re-read makes two simultaneous submissions
 * produce one row.
 */
async function capture(tx: Transaction, s: Scoped, input: { source: 'MANUAL' | 'WEB_FORM'; formId: string | null; captureScope: string; captureKey: string; actorId: string | null; data: Capture; evidence: Evidence; consent: Record<string, unknown> | null; occurredAt: Date | null; kind: 'MANUAL_ENTRY' | 'WEB_FORM_SUBMISSION' }) {
  const print = fingerprint({ source: input.source, formId: input.formId, data: input.data, evidence: input.evidence, consent: input.consent, occurredAt: input.occurredAt?.toISOString() ?? null });
  const where = and(byBrand(t.clientOpportunities, s), eq(t.clientOpportunities.captureScope, input.captureScope), eq(t.clientOpportunities.captureKey, input.captureKey));
  const replay = (row: Opportunity) => {
    if (row.captureFingerprint !== print) throw new AppError('CONFLICT', 'This submission reference was already used with other content');
    return { opportunityId: row.id, reference: reference(row.id), replayed: true };
  };
  const [prior] = await tx.select().from(t.clientOpportunities).where(where);
  if (prior) return replay(prior);
  const now = new Date(), id = randomUUID();
  const row = { id, workspaceId: s.workspaceId, brandId: s.brandId, revision: 0, status: 'NEW', source: input.source, formId: input.formId, ...input.data, receivedAt: now, captureScope: input.captureScope, captureKey: input.captureKey, captureFingerprint: print, createdBy: input.actorId, updatedBy: input.actorId, createdAt: now, updatedAt: now };
  validate('client-opportunity', { id, brandId: s.brandId, revision: 0, status: 'NEW', source: input.source, formId: input.formId, ...input.data, receivedAt: now.toISOString() });
  const inserted = await tx.insert(t.clientOpportunities).values(row).onConflictDoNothing().returning({ id: t.clientOpportunities.id });
  if (!inserted.length) { const [winner] = await tx.select().from(t.clientOpportunities).where(where); if (!winner) throw new AppError('CONFLICT', 'Submission could not be confirmed; retry'); return replay(winner); }
  const interaction = { id: randomUUID(), opportunityId: id, kind: input.kind, ...input.evidence, eventId: input.captureKey, occurredAt: input.occurredAt?.toISOString() ?? null, receivedAt: now.toISOString() };
  validate('client-interaction', interaction);
  await tx.insert(t.clientInteractions).values({ ...interaction, workspaceId: s.workspaceId, brandId: s.brandId, consent: input.consent, occurredAt: input.occurredAt, receivedAt: now, createdAt: now });
  await tx.insert(t.clientOpportunityEvents).values({ id: randomUUID(), workspaceId: s.workspaceId, brandId: s.brandId, opportunityId: id, kind: 'CREATED', actorId: input.actorId, revision: 0, detail: { source: input.source, owner: input.data.ownerUserId ? 'ASSIGNED' : 'QUEUE', followUp: Boolean(input.data.nextActionDate) }, createdAt: now });
  return { opportunityId: id, reference: reference(id), replayed: false };
}
/** Short human reference of an opportunity (first 8 characters of its id). */
export const reference = (id: string) => `OP-${id.slice(0, 8).toUpperCase()}`;

/** Manual entry by a team member of the brand. */
export async function createOpportunity(tx: Transaction, a: BrandActor, input: Record<string, unknown>) {
  const data: Capture = { personName: personName(input.personName), contactEmail: contactEmail(input.contactEmail), contactPhone: contactPhone(input.contactPhone), need: need(input.need), ownerUserId: optionalId(input.ownerUserId, 'Owner'), segmentId: optionalId(input.segmentId, 'Segment'), offerId: optionalId(input.offerId, 'Offer'), nextAction: nextAction(input.nextAction), nextActionDate: calendarDate(input.nextActionDate) };
  if (data.nextActionDate && !data.nextAction) throw new AppError('INVALID', 'Say what the follow-up is');
  const captureKey = key(input.idempotencyKey);
  const ev = evidence({ attentionChannel: input.attentionChannel, acquisitionPlatform: input.acquisitionPlatform, declaredOrigin: input.declaredOrigin, utm: input.utm, clickIds: input.clickIds }, { attentionChannel: 'UNKNOWN' });
  const occurredAt = input.occurredAt == null || input.occurredAt === '' ? null : new Date(`${calendarDate(input.occurredAt)}T12:00:00Z`);
  await checkReferences(tx, a, data);
  return capture(tx, a, { source: 'MANUAL', formId: null, captureScope: `user:${a.userId}`, captureKey, actorId: a.userId, data, evidence: ev, consent: null, occurredAt, kind: 'MANUAL_ENTRY' });
}

/** Changes of an opportunity with the revision the client saw: a stale revision is a 409 and nothing is lost. */
export async function updateOpportunity(tx: Transaction, a: BrandActor, input: Record<string, unknown>) {
  const [row] = await tx.select().from(t.clientOpportunities).where(and(byBrand(t.clientOpportunities, a), eq(t.clientOpportunities.id, idOf(input.opportunityId, 'Opportunity')))).for('update');
  if (!row) throw new AppError('NOT_FOUND', 'Opportunity not available');
  if (input.expectedRevision !== row.revision) throw new AppError('CONFLICT', 'This opportunity changed; reload to see the current version');
  const next = { ...row };
  const has = (k: string) => Object.hasOwn(input, k);
  if (has('personName')) next.personName = personName(input.personName);
  if (has('contactEmail')) next.contactEmail = contactEmail(input.contactEmail);
  if (has('contactPhone')) next.contactPhone = contactPhone(input.contactPhone);
  if (has('need')) next.need = need(input.need);
  if (has('ownerUserId')) next.ownerUserId = optionalId(input.ownerUserId, 'Owner');
  if (has('segmentId')) next.segmentId = optionalId(input.segmentId, 'Segment');
  if (has('offerId')) next.offerId = optionalId(input.offerId, 'Offer');
  if (has('nextAction')) next.nextAction = nextAction(input.nextAction);
  if (has('nextActionDate')) next.nextActionDate = calendarDate(input.nextActionDate);
  if (has('status')) { if (!isOpportunityStatus(input.status)) throw new AppError('INVALID', 'Unknown status'); next.status = input.status; }
  if (next.nextActionDate && !next.nextAction) throw new AppError('INVALID', 'Say what the follow-up is');
  // Only references that change are checked again (an owner who left keeps showing until someone reassigns).
  await checkReferences(tx, a, { ownerUserId: next.ownerUserId !== row.ownerUserId ? next.ownerUserId : null, segmentId: next.segmentId !== row.segmentId ? next.segmentId : null, offerId: next.offerId !== row.offerId ? next.offerId : null });
  const kinds: string[] = [];
  if (next.ownerUserId !== row.ownerUserId) kinds.push(next.ownerUserId ? 'ASSIGNED' : 'UNASSIGNED');
  if (next.nextAction !== row.nextAction || next.nextActionDate !== row.nextActionDate) kinds.push(next.nextActionDate || next.nextAction ? 'FOLLOW_UP_SET' : 'FOLLOW_UP_CLEARED');
  if (next.status !== row.status) kinds.push('STATUS_CHANGED');
  if (['personName', 'contactEmail', 'contactPhone', 'need', 'segmentId', 'offerId'].some(k => next[k as keyof Opportunity] !== row[k as keyof Opportunity])) kinds.push('DETAILS_EDITED');
  if (!kinds.length) return { opportunityId: row.id, revision: row.revision, changed: false };
  const now = new Date(), revision = row.revision + 1;
  await tx.update(t.clientOpportunities).set({ revision, status: next.status, personName: next.personName, contactEmail: next.contactEmail, contactPhone: next.contactPhone, need: next.need, ownerUserId: next.ownerUserId, segmentId: next.segmentId, offerId: next.offerId, nextAction: next.nextAction, nextActionDate: next.nextActionDate, updatedBy: a.userId, updatedAt: now }).where(eq(t.clientOpportunities.id, row.id));
  for (const kind of kinds) await tx.insert(t.clientOpportunityEvents).values({ id: randomUUID(), workspaceId: a.workspaceId, brandId: a.brandId, opportunityId: row.id, kind, actorId: a.userId, revision, detail: kind === 'ASSIGNED' ? { ownerUserId: next.ownerUserId } : kind === 'FOLLOW_UP_SET' ? { nextActionDate: next.nextActionDate } : kind === 'STATUS_CHANGED' ? { from: row.status, to: next.status } : {}, createdAt: now });
  return { opportunityId: row.id, revision, changed: true };
}

// ─── Segments and forms ──────────────────────────────────────────────────────────────────────────────────────────

export async function createSegment(tx: Transaction, a: BrandActor, input: { name?: unknown; idempotencyKey?: unknown }) {
  const name = segmentName(input.name), idempotencyKey = key(input.idempotencyKey);
  const [prior] = await tx.select().from(t.clientSegments).where(and(byBrand(t.clientSegments, a), eq(t.clientSegments.createdBy, a.userId), eq(t.clientSegments.idempotencyKey, idempotencyKey)));
  if (prior) { if (prior.name !== name) throw new AppError('CONFLICT', 'Idempotency key already used with other content'); return { segmentId: prior.id, replayed: true }; }
  const [same] = await tx.select().from(t.clientSegments).where(and(byBrand(t.clientSegments, a), eq(t.clientSegments.name, name)));
  if (same) throw new AppError('CONFLICT', 'A segment with this name already exists');
  const id = randomUUID();
  await tx.insert(t.clientSegments).values({ id, workspaceId: a.workspaceId, brandId: a.brandId, name, active: true, createdBy: a.userId, idempotencyKey, createdAt: new Date() });
  return { segmentId: id, replayed: false };
}

/** Opening a public entry point: needs PUBLISH_SITE. The public id is random and unrelated to the brand id. */
export async function createForm(tx: Transaction, a: BrandActor, input: { name?: unknown; segmentId?: unknown; idempotencyKey?: unknown }) {
  needsPublish(a);
  const name = formName(input.name), segmentId = optionalId(input.segmentId, 'Segment'), idempotencyKey = key(input.idempotencyKey);
  const [prior] = await tx.select().from(t.leadForms).where(and(byBrand(t.leadForms, a), eq(t.leadForms.createdBy, a.userId), eq(t.leadForms.idempotencyKey, idempotencyKey)));
  if (prior) { if (prior.name !== name || prior.segmentId !== segmentId) throw new AppError('CONFLICT', 'Idempotency key already used with other content'); return { formId: prior.id, publicId: prior.publicId, replayed: true }; }
  await checkReferences(tx, a, { segmentId });
  const id = randomUUID(), publicId = newPublicFormId();
  validate('lead-form', { id, brandId: a.brandId, publicId, name, segmentId, status: 'ACTIVE', privacyNoticeVersion: DEV_PRIVACY_NOTICE });
  await tx.insert(t.leadForms).values({ id, workspaceId: a.workspaceId, brandId: a.brandId, publicId, name, segmentId, status: 'ACTIVE', privacyNoticeVersion: DEV_PRIVACY_NOTICE, createdBy: a.userId, idempotencyKey, createdAt: new Date() });
  return { formId: id, publicId, replayed: false };
}
export async function disableForm(tx: Transaction, a: BrandActor, input: { formId?: unknown }) {
  needsPublish(a);
  const [row] = await tx.select().from(t.leadForms).where(and(byBrand(t.leadForms, a), eq(t.leadForms.id, idOf(input.formId, 'Form')))).for('update');
  if (!row) throw new AppError('NOT_FOUND', 'Form not available');
  if (row.status !== 'ACTIVE') throw new AppError('CONFLICT', 'This form is already disabled');
  await tx.update(t.leadForms).set({ status: 'DISABLED', disabledBy: a.userId, disabledAt: new Date() }).where(eq(t.leadForms.id, row.id));
  return { formId: row.id, status: 'DISABLED' };
}

// ─── Public web form ─────────────────────────────────────────────────────────────────────────────────────────────

/** What the public page may show about an active form: its name and notice version, nothing about the brand id. */
export async function publicForm(tx: Transaction, publicId: unknown) {
  if (!validPublicFormId(publicId)) throw new AppError('NOT_FOUND', 'Form not available');
  const [form] = await tx.select().from(t.leadForms).where(eq(t.leadForms.publicId, publicId));
  if (!form || form.status !== 'ACTIVE') throw new AppError('NOT_FOUND', 'Form not available');
  const [brand] = await tx.select({ name: t.brands.name }).from(t.brands).where(and(eq(t.brands.workspaceId, form.workspaceId), eq(t.brands.id, form.brandId)));
  return { name: form.name, brandName: brand?.name ?? '', privacyNoticeVersion: form.privacyNoticeVersion };
}

/**
 * A submission of the brand's web form. The brand is the active form's; the browser supplies only the allow-listed
 * fields. At least one contact means and the contact purpose are required; marketing consent is optional and false
 * by default. The submission id (generated by the page and kept until confirmed) makes a retry return the same row.
 */
export async function submitWebForm(tx: Transaction, input: Record<string, unknown>) {
  if (!validPublicFormId(input.form)) throw new AppError('NOT_FOUND', 'Form not available');
  const [form] = await tx.select().from(t.leadForms).where(eq(t.leadForms.publicId, input.form));
  if (!form || form.status !== 'ACTIVE') throw new AppError('NOT_FOUND', 'Form not available');
  if (!validSubmissionId(input.submissionId)) throw new AppError('INVALID', 'Invalid submission reference');
  const consent = (input.consent && typeof input.consent === 'object' ? input.consent : {}) as Record<string, unknown>;
  if (consent.contactPurpose !== true) throw new AppError('INVALID', 'Accept being contacted about your request');
  const data: Capture = { personName: personName(input.name), contactEmail: contactEmail(input.email), contactPhone: contactPhone(input.phone), need: need(input.need), ownerUserId: null, segmentId: form.segmentId, offerId: null, nextAction: null, nextActionDate: null };
  if (!data.contactEmail && !data.contactPhone) throw new AppError('INVALID', 'Leave an email or a phone so the team can reply');
  const ev = evidence({ attentionChannel: 'WEB_FORM', utm: input.utm, clickIds: input.clickIds, landingPath: input.landingPath, referrer: input.referrer, declaredOrigin: input.declaredOrigin }, { attentionChannel: 'WEB_FORM' });
  const s = { workspaceId: form.workspaceId, brandId: form.brandId };
  return capture(tx, s, { source: 'WEB_FORM', formId: form.id, captureScope: `form:${form.id}`, captureKey: input.submissionId, actorId: null, data, evidence: ev, consent: { contactPurpose: true, privacyNoticeVersion: form.privacyNoticeVersion, marketingOptIn: consent.marketingOptIn === true }, occurredAt: null, kind: 'WEB_FORM_SUBMISSION' });
}

// ─── Resultados ──────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Results of one brand, computed on the server within the caller's scope. Each figure says what kind of source it
 * comes from (internal operational record, planned budget or provider data), what it counts, for which period and
 * timezone, its limitations and when it was computed. A zero is a measured zero; a dimension without a source says
 * so instead of showing a number. A budget is never spend; an opportunity is never a sale.
 */
export async function readResults(tx: Transaction, a: BrandActor, query: { preset?: unknown; from?: unknown; to?: unknown; compare?: unknown } = {}, now = new Date()) {
  // PHASE4_SPEC §13 · the chosen period (and its comparison) filters every activity figure; state figures say so.
  const period = resultsPeriod(query, now), day = today(now);
  const rows = await tx.select().from(t.clientOpportunities).where(byBrand(t.clientOpportunities, a));
  const recent = rows.filter(r => inRange(r.receivedAt, period.current));
  const before = period.comparison ? rows.filter(r => inRange(r.receivedAt, period.comparison!)) : null;
  const both = [...recent, ...(before ?? [])];
  const firsts = new Map<string, string>();
  const firstUtm = new Map<string, string | null>();
  if (both.length) for (const i of await tx.select({ opportunityId: t.clientInteractions.opportunityId, campaignStatus: t.clientInteractions.campaignStatus, utm: t.clientInteractions.utm }).from(t.clientInteractions).where(and(byBrand(t.clientInteractions, a), inArray(t.clientInteractions.opportunityId, both.map(r => r.id)))).orderBy(asc(t.clientInteractions.receivedAt))) if (!firsts.has(i.opportunityId)) { firsts.set(i.opportunityId, i.campaignStatus); firstUtm.set(i.opportunityId, (i.utm as Record<string, string>)?.campaign ?? null); }
  const forms = await tx.select({ id: t.leadForms.id }).from(t.leadForms).where(byBrand(t.leadForms, a));
  const year = Number(day.slice(0, 4));
  const [plan] = await tx.select({ id: t.marketingPlans.id }).from(t.marketingPlans).where(and(byBrand(t.marketingPlans, a), eq(t.marketingPlans.year, year)));
  const actions = plan ? await tx.select({ content: t.planActions.content }).from(t.planActions).where(and(byBrand(t.planActions, a), eq(t.planActions.planId, plan.id))) : [];
  const budgets = new Map<string, { minor: number; estimated: boolean; count: number }>();
  for (const { content } of actions) {
    const c = content as { status?: string; budget?: { amountMinor: number; currency: string; certainty: string } | null };
    if (!c.budget || c.status === 'CANCELLED') continue;
    const b = budgets.get(c.budget.currency) ?? { minor: 0, estimated: false, count: 0 };
    b.minor += c.budget.amountMinor; b.estimated ||= c.budget.certainty !== 'CONFIRMED'; b.count++; budgets.set(c.budget.currency, b);
  }
  const pending = rows.map(r => attention(r, day));
  const computedAt = now.toISOString();
  const last30 = { label: period.current.label, from: period.current.fromInstant, to: period.current.toInstant }, current = { label: 'Estado actual (no depende del periodo)', from: null, to: computedAt }, planYear = { label: `Plan de Marketing ${year}`, from: null, to: computedAt };
  const comparisonPeriod = period.comparison ? { label: period.comparison.label, from: period.comparison.fromInstant, to: period.comparison.toInstant } : null;
  /** Activity in the period, with its comparison when one was chosen (never a percentage over zero). */
  const compared = (count: (set: typeof rows) => number) => ({ comparison: before ? { period: comparisonPeriod, ...change(count(recent), count(before)) } : null });
  const clients = 'Clientes · oportunidades guardadas de esta marca';
  type Period = { label: string; from: string | null; to: string };
  type Kind = 'INTERNAL_RECORD' | 'PLANNED_BUDGET' | 'PROVIDER' | 'SIMULATED';
  const metric = (id: string, label: string, value: number, definition: string, period: Period, limitations: string, kind: Kind = 'INTERNAL_RECORD', source = clients, extra: Record<string, unknown> = {}) =>
    ({ id, label, value, available: true, kind, definition, source, limitations, scope: 'Marca activa', period, timezone: RESULTS_TIMEZONE, computedAt, ...extra });
  const missing = (id: string, label: string, reason: string, state: 'NOT_CONNECTED' | 'NO_DATA', kind: Kind) =>
    ({ id, label, value: null, available: false, state, kind, reason, scope: 'Marca activa', timezone: RESULTS_TIMEZONE, computedAt });
  const web = recent.filter(r => r.source === 'WEB_FORM');
  const inPeriod = (r: { periodStart: string; periodEnd: string }) => readingOverlaps(r, period.current);
  const budgetMetrics = budgets.size
    ? [...budgets.entries()].map(([currency, b]) => metric(`planned_budget_${currency}`, `Presupuesto planificado (${currency})`, b.minor / 100,
      `Suma de los presupuestos registrados en ${b.count} acción(es) no canceladas del Plan de Marketing ${year}.`, planYear,
      `Es un presupuesto previsto${b.estimated ? ', con importes estimados' : ''}, no gasto real ni inversión ejecutada. Cada moneda se muestra aparte, sin conversión.`,
      'PLANNED_BUDGET', `Plan de Marketing ${year} · acciones de esta marca`, { currency }))
    : [missing('planned_budget', 'Presupuesto planificado', `Sin datos: el Plan de Marketing ${year} no tiene acciones con presupuesto.`, 'NO_DATA', 'PLANNED_BUDGET')];
  // Block 8 · per campaign: planned budget of its approved version, spend only from the provider, simulator readings
  // apart, opportunities that arrived with its campaign reference (captured, unverified). Never a ROAS without both
  // real spend and attributable revenue.
  const campaignRows = await tx.select().from(t.campaigns).where(byBrand(t.campaigns, a)).orderBy(asc(t.campaigns.createdAt));
  const approvedVersions = campaignRows.some(c => c.approvedVersionId) ? await tx.select().from(t.campaignVersions).where(and(byBrand(t.campaignVersions, a), inArray(t.campaignVersions.id, campaignRows.map(c => c.approvedVersionId).filter((x): x is string => !!x)))) : [];
  const readings = campaignRows.length ? await tx.select().from(t.campaignMetrics).where(and(byBrand(t.campaignMetrics, a), inArray(t.campaignMetrics.campaignId, campaignRows.map(c => c.id)))).orderBy(desc(t.campaignMetrics.recordedAt)) : [];
  const campaigns = campaignRows.map(c => {
    const v = approvedVersions.find(x => x.id === c.approvedVersionId), content = v?.content as CampaignContent | undefined;
    const planned = content ? plannedMinor(content) : null, provider = readings.find(r => r.campaignId === c.id && r.source === 'PROVIDER' && inPeriod(r)), sim = readings.find(r => r.campaignId === c.id && r.source === 'SIMULATED' && inPeriod(r));
    const arrivedIn = (set: typeof rows) => set.filter(r => firstUtm.get(r.id) === c.utmCampaign).length, arrived = arrivedIn(recent);
    const conversationsLabel = c.objective === 'MESSAGES';
    const window = content ? { label: content.schedule.endDate ? `${content.schedule.startDate} a ${content.schedule.endDate}` : `Desde ${content.schedule.startDate}`, from: content.schedule.startDate || null, to: content.schedule.endDate ?? computedAt } : current;
    return {
      id: c.id, name: c.name, provider: c.provider, utmCampaign: c.utmCampaign, version: v?.sequence ?? null,
      metrics: [
        planned !== null && content
          ? metric(`planned_${c.id}`, `Presupuesto planificado (${content.budget.currency})`, planned / 100, `${budgetRule(content)} Calculado sobre la versión aprobada ${v!.sequence}.`, window, 'Es lo previsto en la campaña, no gasto: la campaña sólo se crea en pausa en esta fase.', 'PLANNED_BUDGET', `Campaña «${c.name}» · versión ${v!.sequence}`, { currency: content.budget.currency })
          : missing(`planned_${c.id}`, 'Presupuesto planificado', content ? 'Sin datos: el presupuesto diario necesita fecha de fin para calcular un total.' : 'Sin datos: la campaña todavía no tiene una versión aprobada.', 'NO_DATA', 'PLANNED_BUDGET'),
        provider
          ? metric(`spend_${c.id}`, `Gasto confirmado por el proveedor (${provider.currency})`, (provider.spendMinor ?? 0) / 100, 'Gasto informado por la cuenta publicitaria.', { label: `${provider.periodStart} a ${provider.periodEnd}`, from: provider.periodStart, to: provider.periodEnd }, 'Dato del proveedor en su última lectura.', 'PROVIDER', c.provider === 'GOOGLE_ADS' ? 'Google Ads' : 'Meta Ads', { currency: provider.currency })
          : missing(`spend_${c.id}`, 'Gasto confirmado por el proveedor', 'Sin conectar: no hay una cuenta real de Google o Meta conectada. El presupuesto no lo sustituye. Sin conexión no es cero.', 'NOT_CONNECTED', 'PROVIDER'),
        ...(sim ? [metric(`simulated_${c.id}`, `Lectura del simulador (${sim.currency})`, (sim.spendMinor ?? 0) / 100, `Estado simulado: ${sim.providerStatus === 'PAUSED' ? 'en pausa' : sim.providerStatus}; ${sim.impressions ?? 0} impresiones, ${sim.clicks ?? 0} clics.`, { label: `${sim.periodStart} a ${sim.periodEnd}`, from: sim.periodStart, to: sim.periodEnd }, 'Simulado: no es gasto ni actividad real y no se suma a ningún resultado.', 'SIMULATED' as Kind, 'Simulador de Brandopolis', { currency: sim.currency })] : []),
        // RES-002 · conversions attributed by the provider: its own model, per provider; never people, never added to
        // opportunities or to another provider's conversions.
        ...((provider ?? sim) ? [metric(`attributed_${c.id}`, conversationsLabel ? 'Conversaciones iniciadas según Meta Ads' : `Conversiones atribuidas por ${c.provider === 'GOOGLE_ADS' ? 'Google Ads' : 'Meta Ads'}`, (provider ?? sim)!.providerConversions ?? 0, 'Conversiones que el proveedor atribuye a esta campaña con su propio modelo de atribución.', { label: `${(provider ?? sim)!.periodStart} a ${(provider ?? sim)!.periodEnd}`, from: (provider ?? sim)!.periodStart, to: (provider ?? sim)!.periodEnd }, `No son personas únicas ni oportunidades: no se suman con las de otro proveedor ni con Clientes.${provider ? '' : ' Simulado: no es un dato real.'}`, (provider ? 'PROVIDER' : 'SIMULATED') as Kind, provider ? (c.provider === 'GOOGLE_ADS' ? 'Google Ads' : 'Meta Ads') : 'Simulador de Brandopolis')] : []),
        metric(`arrived_${c.id}`, 'Oportunidades con su referencia de campaña', arrived, `Oportunidades del periodo cuyo primer origen trae utm_campaign=${c.utmCampaign}.`, last30, 'Referencia capturada sin verificar: no es atribución ni una venta.', 'INTERNAL_RECORD', clients, compared(arrivedIn)),
        missing(`sales_${c.id}`, 'Ventas', 'Sin datos: las ventas y sus importes llegan con el núcleo comercial de la Fase 5. Una oportunidad no es una venta.', 'NO_DATA', 'INTERNAL_RECORD'),
        missing(`roas_${c.id}`, 'Retorno de la inversión publicitaria (ROAS)', 'No disponible: hacen falta gasto real confirmado por el proveedor e ingresos atribuibles a la campaña. Hoy no hay ninguno de los dos.', 'NO_DATA', 'PROVIDER'),
      ],
    };
  });
  return {
    computedAt, timezone: RESULTS_TIMEZONE, period, campaigns,
    marketing: [
      forms.length
        ? metric('web_requests', 'Solicitudes del formulario web', web.length, 'Oportunidades recibidas por un formulario web de la marca.', last30, 'Son solicitudes guardadas en Brandopolis, no conversiones de Google, Meta u otro proveedor. Por ahora el formulario es la página de desarrollo.', 'INTERNAL_RECORD', clients, compared(set => set.filter(r => r.source === 'WEB_FORM').length))
        : missing('web_requests', 'Solicitudes del formulario web', 'Sin conectar: la marca aún no tiene un formulario web.', 'NOT_CONNECTED', 'INTERNAL_RECORD'),
      metric('campaign_captured', 'Con referencia de campaña (sin verificar)', recent.filter(r => firsts.get(r.id) === 'CAPTURED_UNVERIFIED').length, 'Oportunidades cuyo primer origen trae UTM o un identificador de clic.', last30, 'La referencia llegó con la visita; nadie la ha comprobado contra la cuenta publicitaria. No es atribución ni prueba de que la campaña causara la solicitud.', 'INTERNAL_RECORD', clients, compared(set => set.filter(r => firsts.get(r.id) === 'CAPTURED_UNVERIFIED').length)),
      metric('campaign_unidentified', 'Campaña no identificada', recent.filter(r => firsts.get(r.id) !== 'CAPTURED_UNVERIFIED').length, 'Oportunidades sin referencia de campaña (sólo origen declarado o ninguno).', last30, 'Incluye registros manuales: lo que dice la persona se guarda como origen declarado, no como campaña.', 'INTERNAL_RECORD', clients, compared(set => set.filter(r => firsts.get(r.id) !== 'CAPTURED_UNVERIFIED').length)),
      ...budgetMetrics,
      missing('ad_spend', 'Gasto real en anuncios', 'Sin conectar: el gasto real llega de las cuentas de Google y Meta, que todavía no están conectadas. El presupuesto del plan no lo sustituye.', 'NOT_CONNECTED', 'PROVIDER'),
      missing('site_campaigns', 'Visitas al sitio y resultados de campañas', 'Sin conectar: la medición del sitio y las cuentas publicitarias todavía no están conectadas.', 'NOT_CONNECTED', 'PROVIDER'),
    ],
    operations: [
      metric('new_opportunities', 'Oportunidades nuevas', recent.length, 'Oportunidades registradas a mano o por formulario en el periodo.', last30, 'Cuenta registros, no personas: dos solicitudes de la misma persona son dos oportunidades.', 'INTERNAL_RECORD', clients, compared(set => set.length)),
      metric('unassigned', 'Por asignar', pending.filter(p => p.includes('UNASSIGNED')).length, 'Oportunidades sin responsable.', current, 'Foto del momento del cálculo; todavía no se conservan cortes históricos (Fase 5).'),
      metric('no_follow_up', 'Sin seguimiento', pending.filter(p => p.includes('NO_FOLLOW_UP')).length, 'Oportunidades sin fecha de siguiente seguimiento.', current, 'Foto del momento del cálculo.'),
      metric('overdue', 'Seguimiento vencido', pending.filter(p => p.includes('OVERDUE')).length, `Oportunidades cuya fecha de seguimiento es anterior a hoy (${day}).`, current, `«Hoy» se calcula en ${RESULTS_TIMEZONE} mientras las marcas no tengan zona horaria propia.`),
      missing('response_time', 'Primera respuesta y carga por responsable', 'Sin datos: se medirán cuando existan conversaciones y tareas (Fase 5).', 'NO_DATA', 'INTERNAL_RECORD'),
    ],
    sales: [
      missing('won_lost', 'Ganadas, perdidas e importes', 'Sin datos: el cierre ganado o perdido llega con el núcleo comercial de la Fase 5. Una oportunidad nueva no es una venta.', 'NO_DATA', 'INTERNAL_RECORD'),
      missing('goals_forecast', 'Metas y forecast de ganados', 'Sin datos: metas, históricos y forecast de negocios ganados se implementan en la Fase 5. Nada previsto se muestra como venta realizada.', 'NO_DATA', 'INTERNAL_RECORD'),
    ],
  };
}
