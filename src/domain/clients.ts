/**
 * ADR-0035 · Clientes. Pure rules for the Phase 4 capture: field limits, contact validation, the allow-listed
 * acquisition evidence (UTM, click identifiers, landing path, referrer host), campaign status with its cause, the
 * content fingerprint that turns a reused capture key into a conflict, and follow-up attention. No I/O.
 */
import { createHash, randomBytes } from 'node:crypto';
import { AppError, states } from './contracts.js';

export type OpportunityStatus = 'NEW' | 'IN_PROGRESS';
export const OPPORTUNITY_STATUSES = states('client-opportunity', 'status') as OpportunityStatus[];
export const ATTENTION_CHANNELS = states('client-interaction', 'attentionChannel');
export const ACQUISITION_PLATFORMS = states('client-interaction', 'acquisitionPlatform');
export const UTM_KEYS = ['source', 'medium', 'campaign', 'id', 'content', 'term'] as const;
export const CLICK_ID_KEYS = ['gclid', 'gbraid', 'wbraid', 'fbclid', 'ttclid', 'li_fat_id', 'msclkid'] as const;
/** Results timezone until brands carry their own (declared next to every figure). */
export const RESULTS_TIMEZONE = 'America/Mexico_City';
/** Development notice version shown by the dev form; the final text is an owner decision (EXT-REQ-13). */
export const DEV_PRIVACY_NOTICE = 'dev-2026-10-11';

const text = (v: unknown, what: string, max: number, required: boolean) => {
  if (v == null || v === '') { if (required) throw new AppError('INVALID', `${what} required`); return null; }
  if (typeof v !== 'string') throw new AppError('INVALID', `Invalid ${what}`);
  const s = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  if (!s) { if (required) throw new AppError('INVALID', `${what} required`); return null; }
  if (s.length > max) throw new AppError('INVALID', `${what} too long`);
  return s;
};
export const personName = (v: unknown) => text(v, 'Name', 160, true)!;
export const need = (v: unknown) => text(v, 'Need', 2000, true)!;
export const nextAction = (v: unknown) => text(v, 'Next action', 300, false);
export const declaredOrigin = (v: unknown) => text(v, 'Declared origin', 300, false);
export const segmentName = (v: unknown) => text(v, 'Segment name', 120, true)!;
export const formName = (v: unknown) => text(v, 'Form name', 120, true)!;

export function contactEmail(v: unknown) {
  const s = text(v, 'Email', 254, false);
  if (s === null) return null;
  const e = s.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) throw new AppError('INVALID', 'Invalid email');
  return e;
}
export function contactPhone(v: unknown) {
  const s = text(v, 'Phone', 40, false);
  if (s === null) return null;
  if (!/^\+?[0-9 ()./-]{7,40}$/.test(s) || (s.match(/[0-9]/g) ?? []).length < 7) throw new AppError('INVALID', 'Invalid phone');
  return s;
}
/** A calendar date YYYY-MM-DD that exists (no timezone: it is the day the person chose). */
export function calendarDate(v: unknown) {
  if (v == null || v === '') return null;
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new AppError('INVALID', 'Invalid date');
  const d = new Date(`${v}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) throw new AppError('INVALID', 'Invalid date');
  return v;
}
export const isOpportunityStatus = (v: unknown): v is OpportunityStatus => typeof v === 'string' && (OPPORTUNITY_STATUSES as string[]).includes(v);
export const oneOf = (v: unknown, allowed: readonly string[], fallback: string) => (typeof v === 'string' && allowed.includes(v) ? v : fallback);

/** A reference value: trimmed, bounded and restricted to characters campaign tools actually use. */
const reference = (v: unknown) => {
  if (typeof v !== 'string') return null;
  const s = v.trim().slice(0, 200);
  return s && /^[\p{L}\p{N} ._~:+\-|/()%,]+$/u.test(s) ? s : null;
};
function pick<K extends string>(input: unknown, keys: readonly K[]) {
  const out: Partial<Record<K, string>> = {};
  if (input && typeof input === 'object' && !Array.isArray(input)) for (const k of keys) { const v = reference((input as Record<string, unknown>)[k]); if (v) out[k] = v; }
  return out;
}
/** Landing path without query or fragment (they may carry personal data); bounded. */
export function landingPath(v: unknown) {
  if (typeof v !== 'string' || !v.startsWith('/')) return null;
  const p = v.split(/[?#]/)[0].slice(0, 300);
  return /^\/[A-Za-z0-9._~\-/%]*$/.test(p) ? p : null;
}
/** Only the referrer's host name is kept. */
export function referrerHost(v: unknown) {
  if (typeof v !== 'string' || !v) return null;
  try { const h = new URL(v).hostname.toLowerCase(); return /^[a-z0-9.-]{1,253}$/.test(h) ? h : null; } catch { return null; }
}

export type Evidence = {
  attentionChannel: string; acquisitionPlatform: string; declaredOrigin: string | null;
  utm: Record<string, string>; clickIds: Record<string, string>; landingPath: string | null; referrerHost: string | null;
  campaignStatus: 'UNIDENTIFIED' | 'CAPTURED_UNVERIFIED'; campaignCause: 'NO_REFERENCE' | 'DECLARED_ONLY' | null;
};
/**
 * The acquisition evidence of one interaction. A campaign reference supplied by a browser or a person is captured,
 * never verified (verification needs a connector or catalogue of the brand's account, Phase 5). Without a reference
 * the campaign stays unidentified, with its cause.
 */
export function evidence(input: { attentionChannel?: unknown; acquisitionPlatform?: unknown; declaredOrigin?: unknown; utm?: unknown; clickIds?: unknown; landingPath?: unknown; referrer?: unknown }, defaults: { attentionChannel: string }): Evidence {
  const utm = pick(input.utm, UTM_KEYS), clickIds = pick(input.clickIds, CLICK_ID_KEYS), declared = declaredOrigin(input.declaredOrigin);
  const captured = !!(utm.campaign || utm.id || Object.keys(clickIds).length);
  return {
    attentionChannel: oneOf(input.attentionChannel, ATTENTION_CHANNELS, defaults.attentionChannel),
    acquisitionPlatform: oneOf(input.acquisitionPlatform, ACQUISITION_PLATFORMS, inferPlatform(utm, clickIds)),
    declaredOrigin: declared, utm, clickIds, landingPath: landingPath(input.landingPath), referrerHost: referrerHost(input.referrer),
    campaignStatus: captured ? 'CAPTURED_UNVERIFIED' : 'UNIDENTIFIED',
    campaignCause: captured ? null : declared ? 'DECLARED_ONLY' : 'NO_REFERENCE',
  };
}
/** Platform from the click identifier the platform itself issues; a utm_source alone is not proof. */
function inferPlatform(utm: Record<string, string>, clickIds: Record<string, string>) {
  if (clickIds.gclid || clickIds.gbraid || clickIds.wbraid) return 'GOOGLE';
  if (clickIds.fbclid) return 'META';
  if (clickIds.ttclid) return 'TIKTOK';
  if (clickIds.li_fat_id) return 'LINKEDIN';
  return utm.source ? 'OTHER' : 'UNKNOWN';
}

/** Stable JSON (sorted keys) so the fingerprint does not depend on property order. */
export function stableJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableJson).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v as object).sort().map(k => `${JSON.stringify(k)}:${stableJson((v as Record<string, unknown>)[k])}`).join(',')}}`;
  return JSON.stringify(v ?? null);
}
export const fingerprint = (v: unknown) => createHash('sha256').update(stableJson(v)).digest('hex');
export const newPublicFormId = () => randomBytes(16).toString('base64url');
export const validPublicFormId = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9_-]{22}$/.test(v);
export const validSubmissionId = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9-]{16,64}$/.test(v);

/** Today's calendar date in the results timezone. */
export function today(now = new Date(), timeZone = RESULTS_TIMEZONE) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
/** Pending work of an opportunity: no owner, no follow-up, or a follow-up date already past. */
export function attention(o: { ownerUserId: string | null; nextActionDate: string | null }, day: string) {
  const out: ('UNASSIGNED' | 'NO_FOLLOW_UP' | 'OVERDUE')[] = [];
  if (!o.ownerUserId) out.push('UNASSIGNED');
  if (!o.nextActionDate) out.push('NO_FOLLOW_UP');
  else if (o.nextActionDate < day) out.push('OVERDUE');
  return out;
}
