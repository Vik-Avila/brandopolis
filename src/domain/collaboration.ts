import { createHash, randomBytes } from 'node:crypto';
import { AppError } from './contracts.js';

/**
 * ADR-0033 · invitations, guests and the portal. Pure rules: recipient normalization, single-use tokens (only the
 * hash is stored), expiry, what can be shared and how comments are bounded. Persistence lives in the application.
 */
export const INVITATION_DAYS = 7;
export const SHARE_TARGETS = ['STRATEGY_SNAPSHOT', 'PLAN_SNAPSHOT', 'DELIVERABLE_VERSION', 'KIT_VERSION'] as const;
export type ShareTarget = typeof SHARE_TARGETS[number];
export type ActorContext = 'TEAM' | 'GUEST';

export const isShareTarget = (v: unknown): v is ShareTarget => typeof v === 'string' && (SHARE_TARGETS as readonly string[]).includes(v);

/** Lower-case, trimmed address with one @ and a dot in the domain; the identity is still (issuer, subject). */
export function normalizeEmail(value: unknown): string {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError('INVALID', 'Write a valid email address');
  return email;
}

export const tokenHash = (token: string) => createHash('sha256').update(`brand-invitation:${token}`).digest('hex');
export function newInvitationToken() { const token = randomBytes(32).toString('base64url'); return { token, hash: tokenHash(token) }; }
export function validInvitationToken(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(value)) throw new AppError('NOT_FOUND', 'Invitation not available');
  return value;
}

/** Whether an invitation can still be accepted at `now`. Expired, accepted or revoked ones never can. */
export const invitationOpen = (row: { status: string; expiresAt: Date }, now = new Date()) => row.status === 'PENDING' && row.expiresAt > now;

/** Display status of an invitation: EXPIRED is derived from the date, never stored. */
export const invitationState = (row: { status: string; expiresAt: Date }, now = new Date()) => (row.status === 'PENDING' && row.expiresAt <= now ? 'EXPIRED' : row.status);

export function commentBody(value: unknown): string {
  const body = typeof value === 'string' ? value.trim() : '';
  if (!body || body.length > 2000) throw new AppError('INVALID', 'Write a comment of up to 2000 characters');
  return body;
}

export function approvalComment(decision: unknown, value: unknown): { decision: 'APPROVE' | 'REQUEST_CHANGES'; comment: string } {
  if (decision !== 'APPROVE' && decision !== 'REQUEST_CHANGES') throw new AppError('INVALID', 'Decision must be APPROVE or REQUEST_CHANGES');
  const comment = typeof value === 'string' ? value.trim() : '';
  if (comment.length > 2000) throw new AppError('INVALID', 'Comment too long');
  if (decision === 'REQUEST_CHANGES' && !comment) throw new AppError('INVALID', 'Say what should change');
  return { decision, comment };
}
