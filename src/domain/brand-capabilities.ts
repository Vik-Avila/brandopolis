/**
 * ADR-0033 · per-brand capabilities. Reading/editing follow the existing membership + assignment rules (Engine.scope);
 * these capabilities gate the operations that publish, spend or change access. A workspace ADMIN holds them all; a
 * MEMBER only when an ADMIN grants them for that brand; a guest never (guests have no membership).
 */
import { states } from './contracts.js';

export type BrandCapability = 'PUBLISH_SITE' | 'PUBLISH_BRAND_KIT' | 'AUTHORIZE_SPEND' | 'MANAGE_CONNECTIONS' | 'MANAGE_GUESTS';
// The JSON schema is the executable source; the type above must match it (checked in tests).
export const BRAND_CAPABILITIES = states('brand-capability', 'capability') as BrandCapability[];

export const isBrandCapability = (value: unknown): value is BrandCapability =>
  typeof value === 'string' && (BRAND_CAPABILITIES as readonly string[]).includes(value);

export function effectiveCapabilities(role: string, granted: readonly string[]): BrandCapability[] {
  if (role === 'ADMIN') return [...BRAND_CAPABILITIES];
  if (role !== 'MEMBER') return [];
  return BRAND_CAPABILITIES.filter(c => granted.includes(c));
}

export const holds = (role: string, granted: readonly string[], capability: BrandCapability) =>
  effectiveCapabilities(role, granted).includes(capability);
