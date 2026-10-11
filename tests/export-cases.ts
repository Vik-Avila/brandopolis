import { describe, it, expect } from 'vitest';
import { randomUUID, createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import type { AddressInfo } from 'node:net';
import JSZip from 'jszip';
import type { connect } from '../src/persistence/database.js';
import { Engine } from '../src/application/engine.js';
import { seedIdentity } from '../scripts/seed.js';
import { createApp } from '../src/transport/http.js';
import { emptyKit, type KitContent } from '../src/domain/brand-kit.js';
import { FontError, fontKind, parseTrueType, subsetTrueType, woffToSfnt } from '../src/domain/ttf.js';
import { chooseFonts } from '../src/domain/export-fonts.js';
import { BrandPdf } from '../src/application/pdf-brand.js';
import { deliverableDocx, deliverablePdf, deliverablePptx } from '../src/application/export-documents.js';
import type { ExportSource } from '../src/application/exports.js';
import type { KitAssetInfo } from '../src/domain/kit-assets.js';

// Liberation Sans (SIL Open Font License) ships with pdfjs-dist: test input only, never copied into the repository.
const require = createRequire(import.meta.url);
const fontDir = require.resolve('pdfjs-dist/package.json').replace(/package\.json$/, 'standard_fonts/');
const regularBytes = () => readFileSync(fontDir + 'LiberationSans-Regular.ttf');
const boldBytes = () => readFileSync(fontDir + 'LiberationSans-Bold.ttf');
/** A copy of the font with another OS/2 fsType (embedding permission). */
function withFsType(bytes: Buffer, fsType: number) {
  const copy = Buffer.from(bytes), n = copy.readUInt16BE(4);
  for (let i = 0; i < n; i++) { const o = 12 + i * 16; if (copy.toString('latin1', o, o + 4) === 'OS/2') copy.writeUInt16BE(fsType, copy.readUInt32BE(o + 8) + 8); }
  return copy;
}
/** Minimal WOFF 1.0 wrapper around a TrueType font (zlib tables), to test the decoder. */
function toWoff(ttf: Buffer) {
  const n = ttf.readUInt16BE(4), entries: { tag: string; data: Buffer; comp: Buffer }[] = [];
  for (let i = 0; i < n; i++) { const o = 12 + i * 16, off = ttf.readUInt32BE(o + 8), len = ttf.readUInt32BE(o + 12), data = ttf.subarray(off, off + len), comp = deflateSync(data); entries.push({ tag: ttf.toString('latin1', o, o + 4), data, comp: comp.length < data.length ? comp : data }); }
  const header = Buffer.alloc(44 + n * 20); header.write('wOFF', 0, 'latin1'); header.writeUInt32BE(0x00010000, 4); header.writeUInt16BE(n, 12);
  let offset = header.length; const bodies: Buffer[] = [];
  entries.forEach((e, i) => { const o = 44 + i * 20; header.write(e.tag, o, 'latin1'); header.writeUInt32BE(offset, o + 4); header.writeUInt32BE(e.comp.length, o + 8); header.writeUInt32BE(e.data.length, o + 12); const pad = Buffer.alloc((4 - (e.comp.length % 4)) % 4); bodies.push(e.comp, pad); offset += e.comp.length + pad.length; });
  const out = Buffer.concat([header, ...bodies]); out.writeUInt32BE(out.length, 8); return out;
}
async function pdfText(bytes: Buffer) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), standardFontDataUrl: fontDir, useSystemFonts: false }).promise;
  let text = '';
  for (let p = 1; p <= doc.numPages; p++) text += (await (await doc.getPage(p)).getTextContent()).items.map(i => ('str' in i ? i.str : '')).join('') + '\n';
  return { text, pages: doc.numPages };
}
const origin = { kind: 'PERSON' as const, assetId: null, page: null, note: '' };
const kitWith = (typography: Partial<KitContent['typography'][number]>[]): KitContent => ({ ...emptyKit(), palette: [{ id: 'c1', name: 'Rojo', hex: '#8B2E1F', role: 'PRIMARY', reference: '', certainty: 'CONFIRMED', origin }],
  typography: typography.map((f, i) => ({ id: `f${i}`, family: 'Liberation Sans', use: i ? 'BODY' : 'HEADINGS', weights: [], source: '', webEmbedding: 'UNKNOWN', documentEmbedding: 'ALLOWED', alternatives: [], certainty: 'CONFIRMED', origin, ...f })) } as KitContent);
const files = (bytes = regularBytes()) => [{ assetId: 'a1', originalName: 'LiberationSans-Regular.ttf', bytes }, { assetId: 'a2', originalName: 'LiberationSans-Bold.ttf', bytes: boldBytes() }];
const SAMPLE = 'Señal de año: ¿Qué pasó? ¡Bien! «Comillas» “tipográficas” – raya — 1 500 € · $2,000 MXN';

/** ADR-0030 «Exportaciones» · EXP-001…005 (structure and content), fonts and permissions. */
export function exportCases(connection: () => ReturnType<typeof connect>) {
  describe('ADR-0030 · exports: fonts, PDF, PPTX and DOCX', () => {
    it('TrueType reading as untrusted input: metadata, permissions by purpose, malformed files, WOFF and unsupported containers', () => {
      const f = parseTrueType(regularBytes());
      expect(f).toMatchObject({ family: 'Liberation Sans', unitsPerEm: 2048 });
      expect(f.glyphFor('ñ'.codePointAt(0)!)).toBeGreaterThan(0);
      expect(f.permission).toMatchObject({ pdf: true, editable: true, subsetting: true });
      expect(parseTrueType(withFsType(regularBytes(), 0x0002)).permission).toMatchObject({ pdf: false, editable: false, reason: 'RESTRICTED' });
      expect(parseTrueType(withFsType(regularBytes(), 0x0004)).permission).toMatchObject({ pdf: true, editable: false, reason: 'PREVIEW_AND_PRINT_ONLY' });
      expect(parseTrueType(withFsType(regularBytes(), 0x0008)).permission).toMatchObject({ pdf: true, editable: true });
      expect(parseTrueType(withFsType(regularBytes(), 0x0100)).permission.subsetting).toBe(false);
      expect(parseTrueType(withFsType(regularBytes(), 0x0200)).permission).toMatchObject({ pdf: false, reason: 'BITMAP_ONLY' });
      for (const bad of [Buffer.alloc(8), Buffer.from('not a font at all'), regularBytes().subarray(0, 2000), Buffer.concat([Buffer.from('OTTO'), Buffer.alloc(100)]), Buffer.concat([Buffer.from('wOF2'), Buffer.alloc(100)])]) expect(() => parseTrueType(bad)).toThrow(FontError);
      expect(fontKind(Buffer.concat([Buffer.from('OTTO'), Buffer.alloc(20)]))).toBe('CFF');
      // A table pointing outside the file is refused, never read.
      const broken = Buffer.from(regularBytes()); broken.writeUInt32BE(0x7fffffff, 12 + 8);
      expect(() => parseTrueType(broken)).toThrow(FontError);
      const fromWoff = parseTrueType(toWoff(regularBytes()));
      expect(fromWoff.family).toBe('Liberation Sans');
      expect(woffToSfnt(toWoff(regularBytes())).readUInt32BE(0)).toBe(0x00010000);
    });

    it('subset keeps used glyphs (and composite components), stays a valid font and is much smaller', () => {
      const f = parseTrueType(regularBytes());
      const used = [...'Ñandú €'].map(c => f.glyphFor(c.codePointAt(0)!));
      const sub = subsetTrueType(f, used);
      expect(sub.length).toBeLessThan(regularBytes().length / 2);
      const tables = new Map<string, { offset: number; length: number }>();
      for (let i = 0; i < sub.readUInt16BE(4); i++) { const o = 12 + i * 16; tables.set(sub.toString('latin1', o, o + 4), { offset: sub.readUInt32BE(o + 8), length: sub.readUInt32BE(o + 12) }); }
      expect([...tables.keys()].sort()).toEqual(expect.arrayContaining(['glyf', 'head', 'hhea', 'hmtx', 'loca', 'maxp']));
      expect(sub.readUInt32BE(tables.get('head')!.offset + 12)).toBe(0x5f0f3cf5);
      expect(sub.readInt16BE(tables.get('head')!.offset + 50)).toBe(1); // long loca
      const loca = tables.get('loca')!.offset, length = (g: number) => sub.readUInt32BE(loca + (g + 1) * 4) - sub.readUInt32BE(loca + g * 4);
      for (const g of used.filter(g => g !== f.glyphFor(32))) expect(length(g), `glyph ${g}`).toBeGreaterThan(0);
      const unused = f.glyphFor('Q'.codePointAt(0)!);
      expect(length(unused)).toBe(0);
    });

    it('EXP-004 · font choice: embedded when allowed; licence, technical restriction and missing file fall back with a notice; editable documents never embed', () => {
      const allowed = chooseFonts(kitWith([{}]), files(), 'PDF');
      expect(allowed.heading?.family).toBe('Liberation Sans');
      expect(allowed.notices).toEqual([]);
      const unknown = chooseFonts(kitWith([{ documentEmbedding: 'UNKNOWN' }]), files(), 'PDF');
      expect(unknown.heading).not.toBeNull();
      expect(unknown.notices.map(n => n.code)).toContain('LICENSE_UNCONFIRMED');
      const notAllowed = chooseFonts(kitWith([{ documentEmbedding: 'NOT_ALLOWED' }]), files(), 'PDF');
      expect(notAllowed.heading).toBeNull();
      expect(notAllowed.notices.map(n => n.code)).toEqual(['LICENSE_NOT_ALLOWED', 'STANDARD_FONT_USED']);
      const restricted = chooseFonts(kitWith([{}]), [{ assetId: 'r', originalName: 'x.ttf', bytes: withFsType(regularBytes(), 0x0002) }], 'PDF');
      expect(restricted.heading).toBeNull();
      expect(restricted.notices.map(n => n.code)).toContain('FONT_RESTRICTED');
      const alt = chooseFonts(kitWith([{ family: 'Marca Display', alternatives: [{ channel: 'PRINT', family: 'Liberation Sans', reviewed: true }] }]), files(), 'PDF');
      expect(alt.heading?.family).toBe('Liberation Sans');
      expect(alt.notices.map(n => n.code)).toEqual(['FONT_FILE_MISSING', 'ALTERNATIVE_USED']);
      const editable = chooseFonts(kitWith([{ alternatives: [{ channel: 'PRESENTATION', family: 'Arial', reviewed: true }] }]), files(), 'EDITABLE');
      expect(editable.heading).toBeNull();
      expect(editable.declared.heading).toBe('Liberation Sans');
      expect(editable.notices[0].message).toContain('Alternativa revisada del kit: «Arial»');
      expect(chooseFonts(null, [], 'PDF').notices.map(n => n.code)).toEqual(['NO_KIT']);
      expect(chooseFonts(kitWith([{}]), [{ assetId: 'w', originalName: 'marca.woff2', bytes: Buffer.concat([Buffer.from('wOF2'), Buffer.alloc(64)]) }], 'PDF').notices.map(n => n.code)).toEqual(['FONT_UNSUPPORTED', 'FONT_FILE_MISSING', 'STANDARD_FONT_USED']);
    });

    it('EXP-003 · PDF with the embedded kit font: text selectable and identical, long text paginated, unsupported characters reported', async () => {
      const f = parseTrueType(regularBytes());
      const pdf = new BrandPdf({ heading: f, body: f });
      pdf.text(SAMPLE + ' · ₡ · 🙂');
      for (let i = 0; i < 80; i++) pdf.text(`Línea ${i + 1} con acentos áéíóú y eñe.`);
      pdf.footer('Brandopolis · prueba');
      const bytes = pdf.build({ title: 'Prueba · Ñandú', created: new Date('2026-10-11T12:00:00Z') });
      const raw = bytes.toString('latin1');
      expect(raw).toContain('/FontFile2');
      expect(raw).toContain('/ToUnicode');
      expect(raw).toMatch(/\/BaseFont \/[A-Z]{6}\+LiberationSans/);
      expect(pdf.missingCharacters).toEqual(['₡', '🙂']);
      const { text, pages } = await pdfText(bytes);
      expect(pages).toBeGreaterThanOrEqual(2);
      expect(text).toContain(SAMPLE);
      expect(text).toContain('Línea 80 con acentos áéíóú y eñe.');
      // Deterministic for the same input and timestamp.
      const again = new BrandPdf({ heading: f, body: f }); again.text(SAMPLE + ' · ₡ · 🙂'); for (let i = 0; i < 80; i++) again.text(`Línea ${i + 1} con acentos áéíóú y eñe.`); again.footer('Brandopolis · prueba');
      expect(again.build({ title: 'Prueba · Ñandú', created: new Date('2026-10-11T12:00:00Z') }).equals(bytes)).toBe(true);
    });

    const deck = (): ExportSource => ({ brand: { id: 'b', name: 'Café Ñandú' }, kit: { versionId: 'k', sequence: 2, status: 'APPROVED', published: true, content: kitWith([{}]) }, assets: [], deliverable: { id: 'd', versionId: 'v', sequence: 3, status: 'APPROVED', offerName: 'Suscripción', content: { type: 'SALES_PRESENTATION', name: 'Presentación <comercial> & más', offerId: null, sourceDecisionVersionIds: [], body: { audience: 'Cafeterías', slides: [{ title: 'Problema', text: SAMPLE }, { title: 'Propuesta', text: 'Línea 1\nLínea 2' }, { title: 'Siguiente paso', text: 'Cata · 30 min' }] } } } });

    it('EXP-001/003 · PPTX: complete OOXML package, one native text box per text, kit colours and fonts by name, version and brand identified', async () => {
      const doc = await deliverablePptx(deck(), chooseFonts(deck().kit!.content, [], 'EDITABLE'), new Map());
      const zip = await JSZip.loadAsync(doc.bytes);
      for (const part of ['[Content_Types].xml', '_rels/.rels', 'ppt/presentation.xml', 'ppt/_rels/presentation.xml.rels', 'ppt/slideMasters/slideMaster1.xml', 'ppt/slideLayouts/slideLayout1.xml', 'ppt/theme/theme1.xml', 'docProps/core.xml', 'docProps/app.xml']) expect(zip.file(part), part).not.toBeNull();
      const slides = Object.keys(zip.files).filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n));
      expect(slides).toHaveLength(4);
      const s2 = await zip.file('ppt/slides/slide2.xml')!.async('string');
      expect(s2).toContain('<p:cNvSpPr txBox="1"/>');
      expect(s2).toContain(SAMPLE.replace(/&/g, '&amp;'));
      expect(await zip.file('ppt/slides/slide1.xml')!.async('string')).toContain('Presentación &lt;comercial&gt; &amp; más');
      const theme = await zip.file('ppt/theme/theme1.xml')!.async('string');
      expect(theme).toContain('<a:accent1><a:srgbClr val="8B2E1F"/>');
      expect(theme).toContain('<a:latin typeface="Liberation Sans"/>');
      expect(s2).toContain('versión 3 (Aprobada)');
      expect(doc.notices.map(n => n.code)).toContain('NOT_EMBEDDED_EDITABLE');
      expect(doc.filename).toBe('Presentacion-comercial-mas-v3.pptx');
      await expect(deliverablePptx({ ...deck(), deliverable: { ...deck().deliverable!, content: { ...deck().deliverable!.content, type: 'OFFER_COPY', body: { headline: 'h', short: 's', long: '', callToAction: '' } } } }, chooseFonts(null, [], 'EDITABLE'), new Map())).rejects.toThrow();
    });

    it('EXP-003 · DOCX: real headings, table and paragraphs, escaped text, kit fonts by name', async () => {
      const doc = await deliverableDocx(deck(), chooseFonts(deck().kit!.content, [], 'EDITABLE'));
      const zip = await JSZip.loadAsync(doc.bytes);
      const body = await zip.file('word/document.xml')!.async('string'), styles = await zip.file('word/styles.xml')!.async('string');
      expect(body).toContain('<w:pStyle w:val="Title"/>');
      expect(body).toContain('<w:pStyle w:val="Heading1"/>');
      expect(body).toContain('<w:tbl>');
      expect(body).toContain(SAMPLE.replace(/&/g, '&amp;'));
      expect(body).toContain('Presentación &lt;comercial&gt; &amp; más');
      expect(styles).toContain('w:ascii="Liberation Sans"');
      expect(await zip.file('word/footer1.xml')!.async('string')).toContain('versión 3');
    });

    it('exports read the exact versions in the brand scope: published kit only for the guide, other workspaces and guests refused, HTTP download with notices', async () => {
      const db = connection().db, engine = new Engine(db), who = await seedIdentity(db);
      const brand = await engine.createBrand(who.token, 'Marca exportable');
      await expect(engine.exportGuideSource(who.token, brand.id)).rejects.toMatchObject({ code: 'CONFLICT' });
      // Kit with a typography and its font file stored privately; approve and publish.
      const root = mkdtempSync(join(tmpdir(), 'brandopolis-exports-')), previous = process.env.BRANDOPOLIS_DOCUMENT_ROOT;
      process.env.BRANDOPOLIS_DOCUMENT_ROOT = root;
      try {
        const storageKey = `${who.workspaceId}/${brand.id}/kit-font/original`;
        mkdirSync(join(root, who.workspaceId, brand.id, 'kit-font'), { recursive: true });
        writeFileSync(join(root, storageKey), regularBytes());
        const font = await engine.registerKitAsset(who.token, brand.id, { id: randomUUID(), role: 'FONT', originalName: 'LiberationSans-Regular.ttf', info: { format: 'TTF', kind: 'FONT', mediaType: 'font/ttf', width: null, height: null, alpha: null, previewable: false } as KitAssetInfo, bytes: regularBytes().length, sha256: createHash('sha256').update(regularBytes()).digest('hex'), storageKey });
        expect(font.assetId).toBeTruthy();
        const kit = (a: string, i: Record<string, unknown>) => engine.kitCommand(who.token, a as 'start', { brandId: brand.id, ...i });
        await kit('start', { entry: 'INGEST', expectedRevision: 0 });
        let k = (await engine.brandKit(who.token, brand.id)).kit!;
        await kit('draft', { expectedRevision: k.revision, content: { ...kitWith([{}]), typography: kitWith([{}]).typography.map(f => ({ ...f, certainty: 'PROPOSED' })), palette: kitWith([{}]).palette.map(p => ({ ...p, certainty: 'PROPOSED' })) } });
        k = (await engine.brandKit(who.token, brand.id)).kit!;
        const v = (await kit('submit', { expectedRevision: k.revision })) as { versionId: string; fingerprint: string };
        await kit('decide', { versionId: v.versionId, fingerprint: v.fingerprint, decision: 'APPROVE', criterion: 'Kit revisado por el equipo', idempotencyKey: randomUUID() });
        await kit('publish', { versionId: v.versionId, fingerprint: v.fingerprint, idempotencyKey: randomUUID() });
        const guide = await engine.exportGuideSource(who.token, brand.id);
        expect(guide.kit).toMatchObject({ versionId: v.versionId, published: true });
        expect(guide.assets.map(a => a.role)).toEqual(['FONT']);
        // A deliverable approved with this kit, and an internal comment that must never reach the export.
        const created = (await engine.deliverableCommand(who.token, 'create', { brandId: brand.id, content: deck().deliverable!.content, idempotencyKey: randomUUID() })) as { deliverableId: string };
        const sub = (await engine.deliverableCommand(who.token, 'submit', { brandId: brand.id, deliverableId: created.deliverableId, expectedRevision: 0 })) as { versionId: string; fingerprint: string };
        await engine.deliverableCommand(who.token, 'decide', { brandId: brand.id, deliverableId: created.deliverableId, versionId: sub.versionId, fingerprint: sub.fingerprint, decision: 'APPROVE', criterion: 'Lista para el cliente', idempotencyKey: randomUUID() });
        await engine.collaborationCommand(who.token, 'share', { brandId: brand.id, targetType: 'DELIVERABLE_VERSION', targetId: sub.versionId, idempotencyKey: randomUUID() });
        const shareId = (await engine.collaboration(who.token, brand.id)).shares[0].id;
        await engine.collaborationCommand(who.token, 'comment', { brandId: brand.id, shareId, body: 'NOTA INTERNA SECRETA', visibility: 'INTERNAL', idempotencyKey: randomUUID() });
        const source = await engine.exportDeliverableSource(who.token, brand.id, sub.versionId);
        expect(source.deliverable).toMatchObject({ versionId: sub.versionId, sequence: 1, status: 'APPROVED' });
        expect(source.kit?.versionId).toBe(v.versionId);
        expect(JSON.stringify(source)).not.toContain('NOTA INTERNA SECRETA');
        // Other workspace and a client guest never reach exports.
        const outsider = await seedIdentity(db);
        await expect(engine.exportDeliverableSource(outsider.token, brand.id, sub.versionId)).rejects.toMatchObject({ code: 'NOT_FOUND' });
        const other = await engine.createBrand(who.token, 'Otra marca');
        await expect(engine.exportDeliverableSource(who.token, other.id, sub.versionId)).rejects.toMatchObject({ code: 'NOT_FOUND' });
        const inv = (await engine.collaborationCommand(who.token, 'invite', { brandId: brand.id, email: 'cliente@empresa.com', idempotencyKey: randomUUID() })) as { token: string };
        const guest = await seedIdentity(db); await engine.acceptInvitation(guest.token, { token: inv.token });
        await expect(engine.exportGuideSource(guest.token, brand.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
        // HTTP: the PDF embeds the kit font read from private storage; notices travel in a header; formats are checked.
        const server = createApp(engine); await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
        const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`, get = (path: string, token = who.token) => fetch(base + path, { headers: { Authorization: `Bearer ${token}` } });
        try {
          const r = await get(`/api/exports/deliverable?brandId=${brand.id}&versionId=${sub.versionId}&format=pdf`);
          expect(r.status).toBe(200);
          expect(r.headers.get('content-type')).toBe('application/pdf');
          expect(r.headers.get('content-disposition')).toMatch(/^attachment; filename="Presentacion-comercial-mas-v1\.pdf"$/);
          const bytes = Buffer.from(await r.arrayBuffer());
          expect(bytes.toString('latin1')).toContain('/FontFile2');
          expect((await pdfText(bytes)).text).toContain(SAMPLE);
          expect(JSON.parse(decodeURIComponent(r.headers.get('x-brandopolis-notices')!))).toEqual([]);
          const g = await get(`/api/exports/guide?brandId=${brand.id}&format=pdf`);
          expect(g.status).toBe(200);
          expect((await pdfText(Buffer.from(await g.arrayBuffer()))).text).toContain('Marca exportable');
          const pptx = await get(`/api/exports/deliverable?brandId=${brand.id}&versionId=${sub.versionId}&format=pptx`);
          expect(pptx.status).toBe(200);
          expect(JSON.parse(decodeURIComponent(pptx.headers.get('x-brandopolis-notices')!)).map((n: { code: string }) => n.code)).toContain('NOT_EMBEDDED_EDITABLE');
          expect((await get(`/api/exports/deliverable?brandId=${brand.id}&versionId=${sub.versionId}&format=exe`)).status).toBe(400);
          expect((await get(`/api/exports/guide?brandId=${brand.id}&format=docx`)).status).toBe(400);
          expect((await get(`/api/exports/deliverable?brandId=${brand.id}&versionId=${sub.versionId}&format=pdf`, outsider.token)).status).toBe(404);
          // Exporting never changes or approves the source.
          const after = await engine.exportDeliverableSource(who.token, brand.id, sub.versionId);
          expect(after.deliverable).toEqual(source.deliverable);
        } finally { server.close(); }
      } finally { if (previous === undefined) delete process.env.BRANDOPOLIS_DOCUMENT_ROOT; else process.env.BRANDOPOLIS_DOCUMENT_ROOT = previous; rmSync(root, { recursive: true, force: true }); }
    });

    it('deliverable PDF names brand, version, state and kit; no kit → standard font with a notice', async () => {
      const src = deck();
      const doc = deliverablePdf({ ...src, kit: null }, chooseFonts(null, [], 'PDF'), new Map());
      expect(doc.notices.map(n => n.code)).toEqual(['NO_KIT']);
      const { text } = await pdfText(doc.bytes);
      expect(text).toContain('Café Ñandú · versión 3 · Aprobada · Sin versión del kit');
    });
  });
}
