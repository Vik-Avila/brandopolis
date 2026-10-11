import { randomUUID } from 'node:crypto';
import type { SuggestionScope } from './brando-suggestions.js';
import type { KitContent } from './brand-kit.js';

/**
 * ADR-0034 · Brando for «Quiero crearla» (B2, propose-only). Minimum authorized context of one brand (name, active
 * decision versions, approved offers); the person's request is untrusted data. Brando proposes directions; it never
 * adopts, approves, publishes or generates a logo. Chosen values enter the draft as PROPOSED with origin BRANDO.
 */
export type IdentityPacket = {
  contextVersion: string;
  brand: { name: string };
  request: { trust: 'UNTRUSTED_USER_TEXT'; text: string };
  decisions: { id: string; area: string; text: string }[];
  offers: { id: string; name: string; outcome: string }[];
  includedIds: string[];
};
export type IdentityDirection = {
  name: string; intent: string;
  palette: { name: string; hex: string; role: 'PRIMARY' | 'ACCENT' | 'BACKGROUND' | 'TEXT' | 'SUPPORT' }[];
  typography: { family: string; use: 'HEADINGS' | 'BODY' | 'ACCENT'; licenseNote: string }[];
  imagery: string; examples: string[]; toConfirm: string[];
};
export type IdentityProposal = { directions: IdentityDirection[]; sourceIds: string[]; missing: string[]; questions: string[] };

export function identityPacket(input: Omit<IdentityPacket, 'includedIds' | 'request'> & { request: string }): IdentityPacket {
  return { ...input, request: { trust: 'UNTRUSTED_USER_TEXT', text: input.request.slice(0, 1000) }, includedIds: [...input.decisions.map(d => d.id), ...input.offers.map(o => o.id)] };
}

/** Server checks: only ids of this packet; colors normalized; at least one direction. */
export function validIdentityProposal(p: IdentityProposal, packet: IdentityPacket): IdentityProposal | null {
  if (!p.directions.length || p.sourceIds.some(id => !packet.includedIds.includes(id))) return null;
  return { ...p, directions: p.directions.map(d => ({ ...d, palette: d.palette.map(c => ({ ...c, hex: c.hex.toUpperCase() })) })) };
}

/** Deterministic DEMO directions built only from the packet. Never presented as live AI. */
export function demoIdentityProposal(packet: IdentityPacket): IdentityProposal {
  const positioning = packet.decisions.find(d => d.area === 'Positioning') ?? packet.decisions[0] ?? null;
  const promise = packet.decisions.find(d => d.area === 'Brand Promise') ?? null;
  const about = positioning?.text ?? packet.brand.name;
  const open = 'Tipografía de licencia abierta (SIL Open Font License); confirmar que cubre web y documentos';
  const directions: IdentityDirection[] = [
    { name: 'Claridad cercana', intent: `Transmitir orden y confianza alrededor de «${about}» con un tono cercano.`, palette: [{ name: 'Azul profundo', hex: '#1F4E79', role: 'PRIMARY' }, { name: 'Coral', hex: '#E8735A', role: 'ACCENT' }, { name: 'Blanco cálido', hex: '#FAF7F2', role: 'BACKGROUND' }, { name: 'Tinta', hex: '#1D2A33', role: 'TEXT' }], typography: [{ family: 'Source Serif 4', use: 'HEADINGS', licenseNote: open }, { family: 'Inter', use: 'BODY', licenseNote: open }], imagery: 'Fotografía natural, luz suave y personas reales trabajando; sin fotos de archivo genéricas.', examples: ['Publicación con el mensaje principal en tinta sobre blanco cálido', 'Botón principal en azul profundo con texto blanco'], toConfirm: ['Que el azul se distinga de tu competencia', 'Que las tipografías tengan permiso para tu sitio y documentos'] },
    { name: 'Energía directa', intent: 'Comunicar decisión y movimiento: una marca que va al grano.', palette: [{ name: 'Negro', hex: '#151515', role: 'TEXT' }, { name: 'Amarillo señal', hex: '#F2C230', role: 'PRIMARY' }, { name: 'Gris claro', hex: '#EDEDED', role: 'BACKGROUND' }], typography: [{ family: 'Space Grotesk', use: 'HEADINGS', licenseNote: open }, { family: 'Inter', use: 'BODY', licenseNote: open }], imagery: 'Composiciones con mucho contraste, recortes limpios e iconos lineales.', examples: ['Anuncio con titular grande en negro sobre amarillo', 'Presentación con una idea por diapositiva'], toConfirm: ['Que el amarillo no se use para texto pequeño (bajo contraste sobre blanco)'] },
    { name: 'Calma experta', intent: `Mostrar experiencia serena${promise ? `, coherente con la promesa «${promise.text}»` : ''}.`, palette: [{ name: 'Verde bosque', hex: '#2F5D50', role: 'PRIMARY' }, { name: 'Arena', hex: '#E9E1D3', role: 'BACKGROUND' }, { name: 'Terracota', hex: '#B5654A', role: 'ACCENT' }, { name: 'Carbón', hex: '#222222', role: 'TEXT' }], typography: [{ family: 'Fraunces', use: 'HEADINGS', licenseNote: open }, { family: 'Work Sans', use: 'BODY', licenseNote: open }], imagery: 'Texturas naturales, espacios amplios y detalles del trabajo bien hecho.', examples: ['Portada de guía con titular en verde sobre arena'], toConfirm: ['Que el tono sereno encaje con la urgencia de tus clientes'] }
  ];
  return {
    directions,
    sourceIds: [positioning?.id, promise?.id].filter((id): id is string => Boolean(id) && packet.includedIds.includes(id!)),
    missing: [...(!positioning ? ['Tu posicionamiento definido en Estrategia'] : []), ...(!promise ? ['Tu promesa de marca'] : [])],
    questions: ['¿Hay colores que tu marca no debería usar?', '¿Qué marcas admiras visualmente y por qué?']
  };
}

/** Values a chosen direction adds to a draft: PROPOSED with origin BRANDO (never confirmed, never a logo). */
export function directionValues(d: IdentityDirection, used: Set<string>): Pick<KitContent, 'palette' | 'typography'> {
  const fresh = (prefix: string) => { let i = 1; while (used.has(`${prefix}-${i}`)) i++; used.add(`${prefix}-${i}`); return `${prefix}-${i}`; };
  const origin = { kind: 'BRANDO' as const, assetId: null, page: null, note: `Dirección «${d.name}»`.slice(0, 300) };
  return {
    palette: d.palette.map(c => ({ id: fresh('b'), name: c.name, hex: c.hex.toUpperCase(), role: c.role, reference: '', certainty: 'PROPOSED' as const, origin })),
    typography: d.typography.map(f => ({ id: fresh('bf'), family: f.family, use: f.use, weights: [], source: f.licenseNote.slice(0, 200), webEmbedding: 'UNKNOWN', documentEmbedding: 'UNKNOWN', alternatives: [], certainty: 'PROPOSED' as const, origin }))
  };
}

/** Server-held directions of one answer, single use, so a client cannot present invented values as Brando's. */
export class IdentityDirectionsStore {
  private items = new Map<string, SuggestionScope & { directions: IdentityDirection[]; expiresAt: number }>();
  constructor(private now = Date.now, private ttlMs = 30 * 60 * 1000, private perPerson = 8) {}
  issue(scope: SuggestionScope, directions: IdentityDirection[]) {
    for (const [k, v] of this.items) if (v.expiresAt <= this.now()) this.items.delete(k);
    const own = [...this.items].filter(([, v]) => v.userId === scope.userId);
    for (const [k] of own.slice(0, Math.max(0, own.length - this.perPerson + 1))) this.items.delete(k);
    const id = randomUUID(); this.items.set(id, { ...scope, directions, expiresAt: this.now() + this.ttlMs });
    return id;
  }
  take(id: unknown, scope: SuggestionScope, index: unknown) {
    if (typeof id !== 'string' || !Number.isInteger(index)) return null;
    const v = this.items.get(id);
    if (!v || v.expiresAt <= this.now() || v.userId !== scope.userId || v.workspaceId !== scope.workspaceId || v.brandId !== scope.brandId) return null;
    const d = v.directions[index as number];
    if (!d) return null;
    this.items.delete(id);
    return d;
  }
}
