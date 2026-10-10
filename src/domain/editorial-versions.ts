import { createHash } from 'node:crypto';
import { AppError, states } from './contracts.js';

/**
 * ADR-0030 · editorial versions shared by offers, deliverables, brand kit, site and campaign. Pure rules: the
 * application persists versions and pointers; nothing here touches storage.
 *
 * - A version is immutable once it leaves DRAFT.
 * - Three separate pointers on the parent: working draft, current approved, published. A new draft never moves the
 *   approved or published pointer.
 * - SUPERSEDED applies to an approved version only when a LATER version is approved.
 * - An approval binds to (version, content fingerprint, actor); it never transfers to another version or content.
 */
export type EditorialStatus = 'DRAFT' | 'IN_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'SUPERSEDED';
// The JSON schema is the executable source of states; the type above must match it (checked in tests).
export const EDITORIAL_STATUSES = states('editorial-version', 'status') as EditorialStatus[];

const TRANSITIONS: Record<EditorialStatus, readonly EditorialStatus[]> = {
  DRAFT: ['IN_REVIEW'],
  IN_REVIEW: ['CHANGES_REQUESTED', 'APPROVED'],
  // Requested changes are made in a new version; the reviewed one stays as history.
  CHANGES_REQUESTED: [],
  // Only approving a later version supersedes this one (see approve()).
  APPROVED: ['SUPERSEDED'],
  SUPERSEDED: []
};

export function editorialTransition(from: EditorialStatus, to: EditorialStatus) {
  if (!TRANSITIONS[from].includes(to)) throw new AppError('CONFLICT', `Editorial transition ${from} -> ${to} is not allowed`);
  return to;
}

export type EditorialVersion = { id: string; sequence: number; status: EditorialStatus; fingerprint: string };
export type EditorialPointers = { draftVersionId: string | null; approvedVersionId: string | null; publishedVersionId: string | null };

/** Canonical JSON (sorted keys, no whitespace) so the same content always yields the same fingerprint. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
}

export const contentFingerprint = (content: unknown) => createHash('sha256').update(canonicalJson(content)).digest('hex');

/** Creating a draft only moves the draft pointer. */
export function withNewDraft(pointers: EditorialPointers, draftVersionId: string): EditorialPointers {
  return { ...pointers, draftVersionId };
}

/**
 * Approving `target` (which must be IN_REVIEW, with the fingerprint the approver saw) moves the approved pointer and
 * supersedes the previously approved version only when the target is later. The published pointer never moves here.
 */
export function approve(pointers: EditorialPointers, versions: readonly EditorialVersion[], targetId: string, seenFingerprint: string) {
  const target = versions.find(v => v.id === targetId);
  if (!target) throw new AppError('NOT_FOUND', 'Version not available');
  if (target.fingerprint !== seenFingerprint) throw new AppError('CONFLICT', 'Content changed since it was shared for approval');
  editorialTransition(target.status, 'APPROVED');
  const previous = pointers.approvedVersionId ? versions.find(v => v.id === pointers.approvedVersionId) : undefined;
  const superseded = previous && previous.sequence < target.sequence ? previous.id : null;
  return {
    pointers: { ...pointers, approvedVersionId: target.id, draftVersionId: pointers.draftVersionId === target.id ? null : pointers.draftVersionId },
    superseded
  };
}

/** Publishing requires an approved version; it moves only the published pointer. */
export function publish(pointers: EditorialPointers, versions: readonly EditorialVersion[], versionId: string): EditorialPointers {
  const version = versions.find(v => v.id === versionId);
  if (!version) throw new AppError('NOT_FOUND', 'Version not available');
  if (version.status !== 'APPROVED' && version.status !== 'SUPERSEDED') throw new AppError('CONFLICT', 'Only an approved version can be published');
  return { ...pointers, publishedVersionId: version.id };
}

/** An approval applies only to the exact version and content it was given on. */
export const approvalApplies = (approval: { versionId: string; fingerprint: string }, version: { id: string; fingerprint: string }) =>
  approval.versionId === version.id && approval.fingerprint === version.fingerprint;
