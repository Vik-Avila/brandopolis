/** Declared brand geography: onboarding context, never a strategic decision (ADR-0025). */
export const GEOGRAPHIC_INFLUENCE=Object.freeze(['LOCAL','REGIONAL','STATE','NATIONAL','LATAM','GLOBAL'] as const);
export type GeographicInfluence=typeof GEOGRAPHIC_INFLUENCE[number];
