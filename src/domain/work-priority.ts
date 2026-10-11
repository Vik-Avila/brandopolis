/**
 * PHASE4_SPEC §4.9 · «¿Qué te gustaría trabajar primero con tu marca?». The priority orders suggestions and the next
 * step; it never hides an area, changes permissions, approves anything or writes Strategic Objective.
 */
import { states } from './contracts.js';

// Eleven choices offered since 2026-10-11; CONTENT is the earlier «contenidos o materiales» value, kept valid for history.
export type WorkIntent = 'STRATEGY_FULL' | 'STRATEGY_POINT' | 'SELL_OFFER' | 'VISUAL_IDENTITY' | 'MARKETING_PLAN' | 'SOCIAL_MEDIA' | 'WEBSITE' | 'CAMPAIGN' | 'SALES_MATERIALS' | 'OTHER' | 'HELP_ME_CHOOSE' | 'CONTENT';
// The JSON schema is the executable source; the type above must match it (checked in tests).
export const WORK_INTENTS = states('work-priority', 'intent') as WorkIntent[];

export const isWorkIntent = (value: unknown): value is WorkIntent =>
  typeof value === 'string' && (WORK_INTENTS as readonly string[]).includes(value);

/** Where each intent starts (one of the seven areas and its internal section). Plain data for the interface. */
export const INTENT_ENTRY: Record<WorkIntent, { area: string; section: string | null }> = {
  STRATEGY_FULL: { area: 'Estrategia', section: 'Decisiones' },
  STRATEGY_POINT: { area: 'Estrategia', section: 'Decisiones' },
  MARKETING_PLAN: { area: 'Marketing', section: 'Plan de Marketing' },
  CAMPAIGN: { area: 'Marketing', section: 'Campañas digitales' },
  CONTENT: { area: 'Marketing', section: 'Redes sociales' },
  WEBSITE: { area: 'Marketing', section: 'Sitio web' },
  VISUAL_IDENTITY: { area: 'Marca y recursos', section: 'Identidad visual' },
  SELL_OFFER: { area: 'Productos y servicios', section: null },
  HELP_ME_CHOOSE: { area: 'Inicio', section: null },
  SOCIAL_MEDIA: { area: 'Marketing', section: 'Redes sociales' },
  SALES_MATERIALS: { area: 'Productos y servicios', section: 'Materiales de venta' },
  OTHER: { area: 'Inicio', section: null }
};

/** Verified measurement is required for lead-generation campaigns only, never for traffic (ADR-0032). */
export const campaignNeedsVerifiedMeasurement = (objective: 'TRAFFIC' | 'LEADS') => objective === 'LEADS';
