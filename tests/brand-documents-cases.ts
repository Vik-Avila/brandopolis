import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { and, eq } from 'drizzle-orm';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { connect } from '../src/persistence/database.js';
import { Engine } from '../src/application/engine.js';
import { createApp } from '../src/transport/http.js';
import { buildBlueprintPdf } from '../src/application/blueprint-pdf.js';
import { buildBrandBookPdf, brandBookFilename } from '../src/application/brandbook-pdf.js';
import { DECISION_ORDER, DECISION_LABELS, type BrandDocumentInput } from '../src/application/brand-documents.js';
import { seedIdentity } from '../scripts/seed.js';
import * as t from '../src/persistence/schema.js';

/** Reads a PDF back as a reader would: per-page text, the bookmarks and the page each bookmark opens. */
async function readPdf(bytes: Uint8Array) {
  const doc = await getDocument({ data: bytes, useSystemFonts: true }).promise;
  const pages: string[][] = [];
  for (let page = 1; page <= doc.numPages; page++)
    pages.push((await (await doc.getPage(page)).getTextContent()).items.map(item => ('str' in item ? item.str : '')).filter(s => s.trim()));
  const outline = await Promise.all(((await doc.getOutline()) ?? []).map(async item => {
    const dest = typeof item.dest === 'string' ? await doc.getDestination(item.dest) : item.dest;
    return { title: item.title, page: await doc.getPageIndex(dest![0] as never) };
  }));
  return { pages, text: pages.map(p => p.join(' ')).join('\n'), outline };
}

/** A synthetic projection in the shape engine.context() returns, for the pure document scenarios. */
function projection(opts: { decided: number; review?: number[]; superseded?: boolean; evidence?: boolean }): BrandDocumentInput {
  const modules = [...DECISION_ORDER];
  const questions = modules.map((module, i) => ({ id: `q${i}`, module }));
  const decisions = modules.slice(0, opts.decided).map((_, i) => ({ id: `d${i}`, questionId: `q${i}`, activeVersionId: `v${i}`, reviewStatus: opts.review?.includes(i) ? 'NEEDS_REVIEW' : 'CURRENT' }));
  const versions = decisions.map((d, i) => ({ id: `v${i}`, decisionId: d.id, sequence: opts.superseded ? 2 : 1, selectedOption: `VIGENTE-${modules[i].replaceAll(' ', '-').toUpperCase()}`, rationale: `CRITERIO-${i}`, approvedAt: '2026-10-01T12:00:00Z' }));
  if (opts.superseded) versions.push(...decisions.map((d, i) => ({ id: `old${i}`, decisionId: d.id, sequence: 1, selectedOption: `SUPERSEDIDA-${i}`, rationale: 'viejo', approvedAt: '2026-09-01T12:00:00Z' })));
  const dependencies = decisions.slice(1).map((d, i) => ({ upstreamDecisionId: `d${i}`, downstreamDecisionId: d.id, kind: 'HARD' }));
  return {
    brand: { name: 'Escenario Café', isDemo: false, geographicInfluence: 'LOCAL', primaryMarket: 'Xalapa' },
    competitiveStatus: 'Revisado', generatedAt: new Date('2026-10-08T12:00:00Z'),
    context: {
      questions, decisions, versions, dependencies, reviews: [],
      userInputs: [{ statement: 'Qué está construyendo: DECLARADO-CAFETERIA' }],
      evidence: opts.evidence ? [{ claim: 'EVIDENCIA-VENTAS', source: 'Registro de caja', sourceDate: '2026-09-01', provenance: 'Estratega', limitations: ['Una sucursal'] }, { claim: 'Entorno competitivo — HALLAZGO-COMPETENCIA', source: 'Recorrido', sourceDate: '2026-09-02', provenance: 'Entorno competitivo', limitations: [] }] : [],
      hypotheses: opts.evidence ? [{ statement: 'HIPOTESIS-EN-PRUEBA', status: 'TESTING' }, { statement: 'HIPOTESIS-RECHAZADA', status: 'REJECTED' }] : [],
      learnings: opts.evidence ? [{ interpretation: 'APRENDIZAJE-ACEPTADO', status: 'ACCEPTED', limitations: ['Muestra pequeña'] }, { interpretation: 'APRENDIZAJE-BORRADOR', status: 'DRAFT', limitations: [] }] : [],
      intelligence: opts.review?.length ? { evaluatorResult: 'REVIEW_REQUIRED', issues: [{ kind: 'MISSING_BASIS', severity: 'REVIEW', modules: ['Positioning', 'Primary Customer'] }] } : { evaluatorResult: 'PASS', issues: [] }
    }
  };
}

/** Every TOC line names a chapter and the page that chapter really starts on, matching its bookmark. */
function expectRealToc(read: Awaited<ReturnType<typeof readPdf>>) {
  const toc = read.pages[1];
  expect(toc).toContain('Contenido');
  const chapters = read.outline.filter(o => o.title !== 'Índice');
  expect(chapters.length).toBeGreaterThan(3);
  for (const chapter of chapters) {
    const at = toc.indexOf(chapter.title);
    expect(at, `TOC lists ${chapter.title}`).toBeGreaterThan(-1);
    expect(toc[at + 1], `TOC page of ${chapter.title}`).toBe(String(chapter.page + 1));
    expect(read.pages[chapter.page].join(' ').toLowerCase(), `${chapter.title} starts on its page`).toContain(chapter.title.toLowerCase());
  }
}

export function brandDocumentsCases(connection: () => ReturnType<typeof connect>) {
  describe('Brand documents (ADR-0028): Mapa estratégico ejecutivo and Brand Book integral', () => {
    it('scenario A · abundant: every chapter, real index, bookmarks, standings and no draft content', async () => {
      const read = await readPdf(buildBrandBookPdf(projection({ decided: 9, evidence: true })));
      for (const title of ['Introducción a la marca', 'Contexto de mercado', 'Cliente principal', 'Propuesta de valor', 'Posicionamiento', 'Promesa de marca', 'Mensaje central', 'Prioridades de implementación', 'Consistencia estratégica', 'Validación y evidencia', 'Lo que aún no está documentado', 'Anexo · Fuentes y trazabilidad'])
        expect(read.outline.map(o => o.title), title).toContain(title);
      expectRealToc(read);
      for (const marker of ['VIGENTE-PRIMARY-CUSTOMER', 'VIGENTE-CORE-MESSAGE', 'EVIDENCIA-VENTAS', 'HALLAZGO-COMPETENCIA', 'APRENDIZAJE-ACEPTADO', 'HIPOTESIS-EN-PRUEBA', 'DECLARADO-CAFETERIA']) expect(read.text, marker).toContain(marker);
      for (const standing of ['APROBADO', 'OBSERVACIÓN DOCUMENTADA', 'APRENDIZAJE ACEPTADO', 'HIPÓTESIS', 'DECLARADO', 'NO DOCUMENTADO']) expect(read.text, standing).toContain(standing);
      expect(read.text, 'an unaccepted learning is not knowledge').not.toContain('APRENDIZAJE-BORRADOR');
      expect(read.text).toContain('Elaborado con Brandopolis');
      // Identity that was never documented is declared missing, never invented.
      expect(read.text).toContain('Propósito, misión, visión y valores');
      expect(read.text).toContain('Identidad visual (logotipo, paleta, tipografías)');
      expect(read.text).not.toContain('Blueprint');
    });

    it('scenario B · partial: empty chapters are omitted and listed as not documented', async () => {
      const read = await readPdf(buildBrandBookPdf(projection({ decided: 1 })));
      const titles = read.outline.map(o => o.title);
      for (const absent of ['Cliente principal', 'Propuesta de valor', 'Posicionamiento', 'Promesa de marca', 'Mensaje central', 'Prioridades de implementación', 'Validación y evidencia'])
        expect(titles, absent).not.toContain(absent);
      expect(titles).toContain('Introducción a la marca');
      expect(titles).toContain('Lo que aún no está documentado');
      expectRealToc(read);
      expect(read.text).toContain('VIGENTE-STRATEGIC-OBJECTIVE');
      expect(read.text).toMatch(/Decisiones pendientes: Mercado objetivo/);
      expect(read.text).toContain('La decisión aún no está definida.');
    });

    it('scenario C · older versions and contradictions: only current versions, review and tensions visible', async () => {
      const input = projection({ decided: 9, review: [4], superseded: true, evidence: true });
      for (const bytes of [buildBrandBookPdf(input), buildBlueprintPdf(input)]) {
        const read = await readPdf(bytes);
        expect(read.text).toContain('VIGENTE-POSITIONING');
        for (let i = 0; i < 9; i++) expect(read.text, 'a superseded version is never current').not.toContain(`SUPERSEDIDA-${i}`);
        expect(read.text).toMatch(/EN REVISIÓN|En revisión/);
        expect(read.text).toContain('Posicionamiento se decidió antes que Cliente principal, que es su base.');
      }
    });

    it('the Mapa ejecutivo shows the nine decisions at a glance plus foundations, validation and next steps', async () => {
      const read = await readPdf(buildBlueprintPdf(projection({ decided: 6, evidence: true })));
      for (const label of Object.values(DECISION_LABELS)) expect(read.text, label).toContain(label);
      for (const section of ['Estado estratégico', 'Decisiones estratégicas', 'Fundamentos de cada decisión', 'Cómo se conectan', 'Validación', 'Próximas decisiones', 'Anexo · Trazabilidad'])
        expect(read.outline.map(o => o.title), section).toContain(section);
      expect(read.text).toMatch(/6 de 9/);
      expect(read.text).toContain('Decidir 07 · Mensaje principal.');
      expect(read.text, 'a rejected hypothesis is not presented as open').not.toContain('HIPOTESIS-RECHAZADA');
    });

    it('builds a safe Brand Book file name', () => {
      const day = new Date('2026-10-08T12:00:00.000Z');
      expect(brandBookFilename('CoffeePolis · Café & Cultura', day)).toBe('Brandopolis-Brand-Book-coffeepolis-cafe-cultura-2026-10-08.pdf');
      for (const name of ['../../etc/passwd', 'a"b;c\r\n', '<script>', '   '])
        expect(brandBookFilename(name, day)).toMatch(/^Brandopolis-Brand-Book-[a-z0-9-]+-\d{4}-\d{2}-\d{2}\.pdf$/);
    });

    async function serve(engine: Engine) {
      const app = createApp(engine);
      await new Promise<void>(resolve => app.listen(0, '127.0.0.1', resolve));
      const base = `http://127.0.0.1:${(app.address() as AddressInfo).port}`;
      const session = async (token: string) => {
        const login = await fetch(base + '/api/session', { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
        return (login.headers.get('set-cookie') ?? '').split(';')[0];
      };
      const get = (cookie: string, path: string, brandId: string) => fetch(`${base}${path}?brandId=${encodeURIComponent(brandId)}`, { headers: { Cookie: cookie } });
      return { session, get, close: () => new Promise<void>(resolve => app.close(() => resolve())) };
    }

    it('exports the Brand Book of the authorized brand only, without reflections, other brands or any strategic write', async () => {
      const engine = new Engine(connection().db);
      const who = await seedIdentity(connection().db);
      const brand = await engine.createBrand(who.token, 'Libro Exportación');
      const other = await engine.createBrand(who.token, 'OTRA-MARCA-PRIVADA');
      const ctx = await engine.context(who.token, brand.id);
      const customer = ctx.questions.find(q => q.module === 'Primary Customer')!;
      await engine.prepareQuestion(who.token, brand.id, customer.id, null);
      const first = await engine.commitDecision(who.token, { brandId: brand.id, questionId: customer.id, selectedOption: 'CLIENTE-SUPERSEDIDO', rationale: 'Inicial', expectedActiveVersion: null, sourceRecommendationId: null, actorUserId: who.userId, idempotencyKey: randomUUID() });
      await engine.prepareQuestion(who.token, brand.id, customer.id, first.versionId);
      await engine.commitDecision(who.token, { brandId: brand.id, questionId: customer.id, selectedOption: 'CLIENTE-VIGENTE', rationale: 'CRITERIO-HUMANO', expectedActiveVersion: first.versionId, sourceRecommendationId: null, actorUserId: who.userId, idempotencyKey: randomUUID() });
      await engine.captureContext(who.token, brand.id, 'hypothesis', { statement: 'HIPOTESIS-LIBRO' });
      await engine.captureContext(who.token, other.id, 'hypothesis', { statement: 'HIPOTESIS-DE-OTRA-MARCA' });
      await engine.createReflection(who.token, { changedThinking: 'REFLEXION-PRIVADA-NO-EXPORTAR', brandId: brand.id, idempotencyKey: randomUUID() });
      const before = await engine.context(who.token, brand.id);
      const server = await serve(engine);
      try {
        const cookie = await server.session(who.token);
        const response = await server.get(cookie, '/api/brandbook/pdf', brand.id);
        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toBe('application/pdf');
        expect(response.headers.get('cache-control')).toBe('no-store');
        expect(response.headers.get('content-disposition') ?? '').toMatch(/^attachment; filename="Brandopolis-Brand-Book-libro-exportacion-\d{4}-\d{2}-\d{2}\.pdf"$/);
        const read = await readPdf(new Uint8Array(await response.arrayBuffer()));
        expectRealToc(read);
        expect(read.text).toContain('Libro Exportación');
        expect(read.text).toContain('CLIENTE-VIGENTE');
        expect(read.text).toContain('CRITERIO-HUMANO');
        expect(read.text).toContain('HIPOTESIS-LIBRO');
        for (const leak of ['CLIENTE-SUPERSEDIDO', 'REFLEXION-PRIVADA-NO-EXPORTAR', 'OTRA-MARCA-PRIVADA', 'HIPOTESIS-DE-OTRA-MARCA', 'Blueprint']) expect(read.text, leak).not.toContain(leak);

        const viewed = async () => (await connection().db.select().from(t.telemetry).where(and(eq(t.telemetry.workspaceId, who.workspaceId), eq(t.telemetry.brandId, brand.id)))).filter(e => (e.payload as { name: string }).name === 'blueprint_viewed').length;
        expect(await viewed(), 'a Brand Book download is not a view of the Mapa').toBe(0);
        const map = await server.get(cookie, '/api/blueprint/pdf', brand.id);
        expect(map.status).toBe(200);
        const mapText = (await readPdf(new Uint8Array(await map.arrayBuffer()))).text;
        expect(mapText).toContain('Mapa estratégico ejecutivo');
        for (const leak of ['REFLEXION-PRIVADA-NO-EXPORTAR', 'OTRA-MARCA-PRIVADA', 'HIPOTESIS-DE-OTRA-MARCA']) expect(mapText, leak).not.toContain(leak);

        // Exports are reads: the Brand Context, its versions and its decisions are unchanged.
        const after = await engine.context(who.token, brand.id);
        expect(after.contextVersion).toBe(before.contextVersion);
        expect(after.brandoContextVersion).toBe(before.brandoContextVersion);
        expect(after.versions).toEqual(before.versions);
        expect(after.decisions).toEqual(before.decisions);
        const events = await connection().db.select().from(t.telemetry).where(and(eq(t.telemetry.workspaceId, who.workspaceId), eq(t.telemetry.brandId, brand.id)));
        expect(events.filter(e => (e.payload as { name: string }).name === 'brandbook_pdf_exported')).toHaveLength(1);
      } finally { await server.close(); }
    });

    it('refuses the Brand Book across tenants, to an unassigned member and without a session', async () => {
      const engine = new Engine(connection().db);
      const who = await seedIdentity(connection().db);
      const brand = await engine.createBrand(who.token, 'Libro Privado');
      const foreign = await seedIdentity(connection().db);
      const unassigned = await seedIdentity(connection().db, 'MEMBER', who.workspaceId);
      const server = await serve(engine);
      try {
        const foreignResponse = await server.get(await server.session(foreign.token), '/api/brandbook/pdf', brand.id);
        expect(foreignResponse.status).toBe(404);
        const body = await foreignResponse.text();
        expect(body).not.toContain('%PDF-'); expect(body).not.toContain('Libro Privado');
        expect((await server.get(await server.session(unassigned.token), '/api/brandbook/pdf', brand.id)).status).toBe(403);
        expect((await server.get('', '/api/brandbook/pdf', brand.id)).status).toBe(401);
      } finally { await server.close(); }
    });
  });
}
