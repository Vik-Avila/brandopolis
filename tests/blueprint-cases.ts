import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { connect } from '../src/persistence/database.js';
import { Engine } from '../src/application/engine.js';
import { createApp } from '../src/transport/http.js';
import { blueprintFilename } from '../src/application/blueprint-pdf.js';
import { seedIdentity } from '../scripts/seed.js';
import * as t from '../src/persistence/schema.js';

/** Reads every page of a PDF back to text, so assertions are about what a reader actually shows. */
async function pdfText(bytes: Uint8Array) {
  const doc = await getDocument({ data: bytes, useSystemFonts: true }).promise;
  let text = '';
  for (let page = 1; page <= doc.numPages; page++) {
    const content = await (await doc.getPage(page)).getTextContent();
    text += content.items.map(item => ('str' in item ? item.str : '')).join(' ') + '\n';
  }
  return { pages: doc.numPages, text };
}

export function blueprintCases(connection: () => ReturnType<typeof connect>) {
  describe('Blueprint PDF export', () => {
    /** A brand with one twice-decided question, so there is a superseded version to keep out. */
    async function brandWithStrategy(engine: Engine) {
      const who = await seedIdentity(connection().db);
      const brand = await engine.createBrand(who.token, 'Marca Exportación');
      const ctx = await engine.context(who.token, brand.id);
      const customer = ctx.questions.find(q => q.module === 'Primary Customer')!;
      const ready = async () => {
        const q = (await engine.context(who.token, brand.id)).questions.find(x => x.id === customer.id)!;
        if (q.status === 'DECIDED') await engine.transitionQuestion(who.token, brand.id, customer.id, 'REOPENED');
        if (['OPEN', 'DECIDED', 'REOPENED'].includes(q.status)) await engine.transitionQuestion(who.token, brand.id, customer.id, 'IN_ANALYSIS');
        if (q.status !== 'READY_FOR_DECISION') await engine.transitionQuestion(who.token, brand.id, customer.id, 'READY_FOR_DECISION');
      };
      await ready();
      const first = await engine.commitDecision(who.token, {
        brandId: brand.id, questionId: customer.id, selectedOption: 'DECISION-SUPERSEDIDA-UNO',
        rationale: 'Criterio inicial', expectedActiveVersion: null, sourceRecommendationId: null,
        actorUserId: who.userId, idempotencyKey: randomUUID()
      });
      await ready();
      await engine.commitDecision(who.token, {
        brandId: brand.id, questionId: customer.id, selectedOption: 'DECISION-VIGENTE-DOS',
        rationale: 'Criterio actualizado por el Estratega de Marca', expectedActiveVersion: first.versionId,
        sourceRecommendationId: null, actorUserId: who.userId, idempotencyKey: randomUUID()
      });
      await engine.captureContext(who.token, brand.id, 'hypothesis', { statement: 'HIPOTESIS-POR-COMPROBAR' });
      return { who, brand };
    }

    async function serve(engine: Engine) {
      const app = createApp(engine);
      await new Promise<void>(resolve => app.listen(0, '127.0.0.1', resolve));
      const base = `http://127.0.0.1:${(app.address() as AddressInfo).port}`;
      const session = async (token: string) => {
        const login = await fetch(base + '/api/session', {
          method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ token })
        });
        return (login.headers.get('set-cookie') ?? '').split(';')[0];
      };
      const exportPdf = (cookie: string, brandId: string) =>
        fetch(`${base}/api/blueprint/pdf?brandId=${encodeURIComponent(brandId)}`, { headers: { Cookie: cookie } });
      return { app, session, exportPdf, close: () => new Promise<void>(resolve => app.close(() => resolve())) };
    }

    it('exports the current strategy as a real PDF, and never a superseded decision', async () => {
      const engine = new Engine(connection().db);
      const { who, brand } = await brandWithStrategy(engine);
      const server = await serve(engine);
      try {
        const response = await server.exportPdf(await server.session(who.token), brand.id);
        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toBe('application/pdf');
        expect(response.headers.get('cache-control')).toBe('no-store');
        const disposition = response.headers.get('content-disposition') ?? '';
        expect(disposition).toMatch(/^attachment; filename="Brandopolis-Blueprint-marca-exportacion-\d{4}-\d{2}-\d{2}\.pdf"$/);

        const bytes = new Uint8Array(await response.arrayBuffer());
        expect(bytes.byteLength).toBeGreaterThan(1000);
        expect(Buffer.from(bytes.subarray(0, 5)).toString('latin1')).toBe('%PDF-');
        expect(Buffer.from(bytes.subarray(-6)).toString('latin1').trim()).toBe('%%EOF');

        const { pages, text } = await pdfText(bytes);
        expect(pages).toBeGreaterThanOrEqual(2);
        // Canonical sections.
        for (const section of ['Mapa estratégico de la marca', 'Estado estratégico', 'Decisiones estratégicas', 'Cómo se conectan', 'Contexto competitivo', 'Contexto estratégico'])
          expect(text, section).toContain(section);
        // The old jargon must not survive anywhere a participant reads.
        expect(text, 'the exported document uses the participant-facing name').not.toContain('Blueprint');
        expect(text).toContain('Marca Exportación');
        // Current state only: the active version appears, the superseded one never does.
        expect(text).toContain('DECISION-VIGENTE-DOS');
        expect(text, 'a superseded decision must never be exported as current').not.toContain('DECISION-SUPERSEDIDA-UNO');
        expect(text).toContain('Criterio actualizado por el Estratega de Marca');
        expect(text).toMatch(/Versión vigente v2/);
        // Hypotheses are labelled as unvalidated, never presented as fact.
        expect(text).toContain('HIPOTESIS-POR-COMPROBAR');
        expect(text).toMatch(/HIP[ÓO]TESIS · SIN VALIDAR, NO SON HECHOS/);
        // Sections without approved data say so instead of inventing content.
        expect(text).toContain('Aún no definido');
        expect(text).toContain('Este documento refleja el estado estratégico vigente al momento de su generación');
      } finally { await server.close(); }
    });

    it('labels the demo sandbox inside the document', async () => {
      const engine = new Engine(connection().db);
      const who = await seedIdentity(connection().db);
      const brand = await engine.createBrand(who.token, 'CoffeePolis Export');
      await connection().db.insert(t.brandProfiles).values({
        workspaceId: who.workspaceId, brandId: brand.id, isDemo: true,
        geographicInfluence: 'LOCAL', primaryMarket: 'Xalapa, Veracruz'
      });
      const server = await serve(engine);
      try {
        const response = await server.exportPdf(await server.session(who.token), brand.id);
        expect(response.status).toBe(200);
        const { text } = await pdfText(new Uint8Array(await response.arrayBuffer()));
        expect(text).toContain('Marca demo');
        // Declared geography travels with the document when it exists.
        expect(text).toContain('Local');
        expect(text).toContain('Xalapa, Veracruz');
      } finally { await server.close(); }
    });

    it('refuses export across tenants and to an unassigned member, leaking no strategy', async () => {
      const engine = new Engine(connection().db);
      const { who, brand } = await brandWithStrategy(engine);
      // A participant in a different workspace, and a member of the same workspace with no assignment.
      const foreign = await seedIdentity(connection().db);
      const unassigned = await seedIdentity(connection().db, 'MEMBER', who.workspaceId);
      const server = await serve(engine);
      try {
        const foreignResponse = await server.exportPdf(await server.session(foreign.token), brand.id);
        expect(foreignResponse.status).toBe(404);
        const foreignBody = await foreignResponse.text();
        expect(foreignBody).not.toContain('DECISION-VIGENTE-DOS');
        expect(foreignBody).not.toContain('Marca Exportación');
        expect(foreignBody).not.toContain('%PDF-');

        const memberResponse = await server.exportPdf(await server.session(unassigned.token), brand.id);
        expect(memberResponse.status).toBe(403);
        expect(await memberResponse.text()).not.toContain('DECISION-VIGENTE-DOS');

        // No session at all.
        const anonymous = await server.exportPdf('', brand.id);
        expect(anonymous.status).toBe(401);
        expect(await anonymous.text()).not.toContain('DECISION-VIGENTE-DOS');
      } finally { await server.close(); }
    });

    it('builds a safe file name from any brand name', () => {
      const day = new Date('2026-09-29T12:00:00.000Z');
      expect(blueprintFilename('CoffeePolis · Café & Cultura', day)).toBe('Brandopolis-Blueprint-coffeepolis-cafe-cultura-2026-09-29.pdf');
      // Path separators, quotes and control characters can never reach the header.
      expect(blueprintFilename('../../etc/passwd', day)).toBe('Brandopolis-Blueprint-etc-passwd-2026-09-29.pdf');
      expect(blueprintFilename('a"b;c\r\n', day)).toBe('Brandopolis-Blueprint-a-b-c-2026-09-29.pdf');
      expect(blueprintFilename('   ', day)).toBe('Brandopolis-Blueprint-marca-2026-09-29.pdf');
      for (const name of ['../../etc/passwd', 'a"b;c\r\n', '<script>', 'ñandú ÁÉÍ'])
        expect(blueprintFilename(name, day)).toMatch(/^Brandopolis-Blueprint-[a-z0-9-]+-\d{4}-\d{2}-\d{2}\.pdf$/);
    });
  });
}
