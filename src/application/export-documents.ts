/**
 * ADR-0030 «Exportaciones» · document builders. Pure: they receive the export source (exact versions), the font choice
 * and the image bytes, and return the file plus the notices the person sees with the download. They never read
 * storage, never write anything and never include comments, approvals or internal notes.
 */
import JSZip from 'jszip';
import { BrandPdf, hexRgb, jpegSize, type Rgb } from './pdf-brand.js';
import type { ExportNotice, FontChoice } from '../domain/export-fonts.js';
import type { ExportSource } from './exports.js';
import type { KitContent } from '../domain/brand-kit.js';

export type Image = { bytes: Buffer; format: string };
export type BuiltDocument = { bytes: Buffer; filename: string; mediaType: string; notices: ExportNotice[] };

const TYPE_WORDS: Record<string, string> = { SALES_PRESENTATION: 'Presentación comercial', OFFER_COPY: 'Textos de producto o servicio', SOCIAL_POST: 'Publicación para redes', AD: 'Anuncio', DESIGN_BRIEF: 'Brief para diseñador o Canva' };
const STATUS_WORDS: Record<string, string> = { DRAFT: 'Borrador', IN_REVIEW: 'En revisión', CHANGES_REQUESTED: 'Cambios solicitados', APPROVED: 'Aprobada', SUPERSEDED: 'Reemplazada' };
const NETWORK: Record<string, string> = { INSTAGRAM: 'Instagram', FACEBOOK: 'Facebook', LINKEDIN: 'LinkedIn', TIKTOK: 'TikTok', X: 'X', OTHER: 'Otra red' };
const FORMAT: Record<string, string> = { POST: 'Publicación', CAROUSEL: 'Carrusel', REEL: 'Reel', STORY: 'Historia', VIDEO: 'Video', ARTICLE: 'Artículo' };
const CHANNEL: Record<string, string> = { GOOGLE: 'Google', META: 'Meta (Facebook e Instagram)', LINKEDIN: 'LinkedIn', OTHER: 'Otro canal' };
const OBJECTIVE: Record<string, string> = { AWARENESS: 'Que te conozcan', TRAFFIC: 'Visitas al sitio', LEADS: 'Contactos o solicitudes', SALES: 'Ventas' };
const ROLE: Record<string, string> = { PRIMARY: 'Principal', ACCENT: 'Acento', BACKGROUND: 'Fondo', TEXT: 'Texto', SUPPORT: 'Apoyo' };
const USE: Record<string, string> = { HEADINGS: 'Títulos', BODY: 'Textos', ACCENT: 'Acentos' };
const EMBED: Record<string, string> = { ALLOWED: 'permitida', NOT_ALLOWED: 'no permitida', UNKNOWN: 'sin confirmar' };
const CH: Record<string, string> = { SOCIAL: 'Redes', WEBSITE: 'Sitio web', ADS: 'Anuncios', PRESENTATION: 'Presentaciones', PRINT: 'Impresos', CANVA: 'Canva' };

const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'documento';
const day = (d: Date) => d.toISOString().slice(0, 10);
const primary = (kit: KitContent | null): Rgb => hexRgb(kit?.palette.find(p => p.role === 'PRIMARY')?.hex ?? kit?.palette[0]?.hex ?? '#1D2A26');
const logoFor = (src: ExportSource, images: Map<string, Image>) => {
  const kit = src.kit?.content;
  const order = ['PRIMARY', 'SYMBOL', 'OTHER', 'MONOCHROME', 'ON_DARK'];
  const logos = [...(kit?.logos ?? [])].sort((a, b) => order.indexOf(a.variant) - order.indexOf(b.variant));
  for (const l of logos) { const img = images.get(l.assetId); if (img && (img.format === 'PNG' || img.format === 'JPEG')) return img; }
  return null;
};
/** Pixel size of a PNG (IHDR) or JPEG (SOF) so images keep their proportions. */
const imageSize = (img: Image) => img.format === 'PNG' && img.bytes.length > 24 ? { width: img.bytes.readUInt32BE(16), height: img.bytes.readUInt32BE(20) } : img.format === 'JPEG' ? jpegSize(img.bytes) : { width: 1, height: 1 };
/** Fits an image inside a box (EMU), keeping its aspect ratio. */
const fit = (img: Image, maxW: number, maxH: number) => { const { width, height } = imageSize(img); const k = Math.min(maxW / Math.max(width, 1), maxH / Math.max(height, 1)); return { cx: Math.round(width * k), cy: Math.round(height * k) }; };
const kitLine = (src: ExportSource) => src.kit ? `Kit de marca versión ${src.kit.sequence}${src.kit.published ? ' (publicada)' : ''}` : 'Sin versión del kit';

/** Labelled rows of a deliverable version (the same fields the product shows). */
export function deliverableRows(c: ExportSource['deliverable'] & object): { title: string; rows: [string, string][]; blocks: { title: string; text: string }[] } {
  const b = c.content.body as Record<string, unknown>, s = (k: string) => String(b[k] ?? ''), list = (k: string) => (Array.isArray(b[k]) ? (b[k] as string[]) : []);
  const rows: [string, string][] = [], blocks: { title: string; text: string }[] = [];
  if (c.offerName) rows.push(['Oferta', c.offerName]);
  switch (c.content.type) {
    case 'SALES_PRESENTATION': rows.push(['Para', s('audience')]); (b.slides as { title: string; text: string }[]).forEach((sl, i) => blocks.push({ title: `${i + 1}. ${sl.title}`, text: sl.text })); break;
    case 'OFFER_COPY': rows.push(['Título', s('headline')], ['Texto corto', s('short')], ['Llamada a la acción', s('callToAction')]); if (s('long')) blocks.push({ title: 'Texto largo', text: s('long') }); break;
    case 'SOCIAL_POST': rows.push(['Red y formato', `${NETWORK[s('network')] ?? ''} · ${FORMAT[s('format')] ?? ''}`], ['Fecha prevista', s('scheduledDate')], ['Para qué', s('objective')], ['Etiquetas', list('hashtags').join(' ')], ['Materiales', s('materials')]); blocks.push({ title: 'Texto', text: s('text') }); break;
    case 'AD': rows.push(['Canal', CHANNEL[s('channel')] ?? ''], ['Objetivo', OBJECTIVE[s('objective')] ?? ''], ['Llamada a la acción', s('callToAction')], ['Lleva a', s('landingUrl')]); blocks.push({ title: 'Títulos', text: list('headlines').map(h => `• ${h}`).join('\n') }, { title: 'Descripciones', text: list('descriptions').map(d => `• ${d}`).join('\n') }); break;
    case 'DESIGN_BRIEF': rows.push(['Para', s('for') === 'CANVA' ? 'Canva' : 'Diseñador'], ['Pieza', s('piece')], ['Formato', s('format')], ['Público', s('audience')], ['Mensaje', s('message')], ['Debe incluir', s('mustInclude')], ['Evitar', s('avoid')], ['Fecha de entrega', s('dueDate')]); break;
  }
  return { title: c.content.name || TYPE_WORDS[c.content.type], rows: rows.filter(([, v]) => v.trim()), blocks: blocks.filter(x => x.text.trim()) };
}

function finishPdf(pdf: BrandPdf, fonts: FontChoice, footer: string, title: string, subject: string, filename: string, now: Date): BuiltDocument {
  pdf.footer(footer);
  const bytes = pdf.build({ title, subject, created: now });
  const notices = [...fonts.notices];
  if (pdf.missingCharacters.length) notices.push({ code: 'MISSING_CHARACTERS', message: `Algunos caracteres no están en la tipografía del documento y se muestran con la estándar o como «?»: ${pdf.missingCharacters.join(' ')}` });
  if (pdf.notices.has('IMAGE_FORMAT')) notices.push({ code: 'IMAGE_FORMAT', message: 'Una imagen del kit no es PNG ni JPEG y no se incluyó.' });
  return { bytes, filename, mediaType: 'application/pdf', notices };
}

/** Brand guide PDF from the published kit version. */
export function guidePdf(src: ExportSource, fonts: FontChoice, images: Map<string, Image>, now = new Date()): BuiltDocument {
  const kit = src.kit!.content, accent = primary(kit), pdf = new BrandPdf({ heading: fonts.heading, body: fonts.body, bodyBold: fonts.bodyBold });
  pdf.text('Guía de marca', { size: 11, role: 'body', bold: true, color: accent, after: 2 });
  pdf.text(src.brand.name, { size: 28, role: 'heading', bold: true, after: 6 });
  pdf.text(`${kitLine(src)} · generada el ${day(now)}`, { size: 9, color: [0.4, 0.42, 0.41], after: 10 });
  const logo = logoFor(src, images);
  if (logo) pdf.image(logo.bytes, logo.format, 220, 120);
  pdf.rule(accent);
  if (kit.logos.length) {
    pdf.text('Logotipos', { size: 16, role: 'heading', bold: true, after: 6 });
    pdf.facts(kit.logos.map(l => [({ PRIMARY: 'Principal', ON_DARK: 'Sobre fondo oscuro', MONOCHROME: 'Monocromo', SYMBOL: 'Símbolo', FAVICON: 'Favicon', OTHER: 'Otro' } as Record<string, string>)[l.variant] ?? l.variant, [l.minWidthPx ? `Ancho mínimo ${l.minWidthPx} px` : '', l.usage].filter(Boolean).join(' · ') || 'Sin indicaciones de uso']));
    pdf.gap(8);
  }
  if (kit.palette.length) {
    pdf.text('Colores', { size: 16, role: 'heading', bold: true, after: 6 });
    for (const p of kit.palette) pdf.swatch(p.hex, p.name, [ROLE[p.role] ?? p.role, p.hex, p.reference].filter(Boolean).join(' · '));
    pdf.gap(4);
  }
  if (kit.pairs.length) {
    pdf.text('Combinaciones de texto y fondo', { size: 13, role: 'heading', bold: true, after: 4 });
    pdf.facts(kit.pairs.map(pair => { const fg = kit.palette.find(x => x.id === pair.text), bg = kit.palette.find(x => x.id === pair.background); return [`${fg?.name ?? ''} sobre ${bg?.name ?? ''}`, pair.use || 'Sin uso indicado']; }));
    pdf.gap(8);
  }
  if (kit.typography.length) {
    pdf.text('Tipografías', { size: 16, role: 'heading', bold: true, after: 6 });
    pdf.facts(kit.typography.map(f => [f.family, [USE[f.use] ?? f.use, f.weights.length ? `pesos ${f.weights.join(', ')}` : '', `incrustar en documentos: ${EMBED[f.documentEmbedding] ?? f.documentEmbedding}`, f.alternatives.filter(a => a.reviewed).map(a => `${CH[a.channel] ?? a.channel}: ${a.family}`).join('; ')].filter(Boolean).join(' · ')]));
    pdf.gap(8);
  }
  if (kit.verbal.tone || kit.verbal.messages.length || kit.verbal.examples.length) {
    pdf.text('Cómo habla la marca', { size: 16, role: 'heading', bold: true, after: 6 });
    if (kit.verbal.tone) pdf.text(kit.verbal.tone, { after: 6 });
    if (kit.verbal.messages.length) { pdf.text('Mensajes', { bold: true }); for (const m of kit.verbal.messages) pdf.text(`• ${m}`, { indent: 10 }); pdf.gap(4); }
    if (kit.verbal.examples.length) { pdf.text('Ejemplos', { bold: true }); for (const m of kit.verbal.examples) pdf.text(`• ${m}`, { indent: 10 }); pdf.gap(4); }
  }
  if (kit.style.do.length || kit.style.dont.length) {
    pdf.text('Usos', { size: 16, role: 'heading', bold: true, after: 6 });
    if (kit.style.do.length) { pdf.text('Sí', { bold: true }); for (const m of kit.style.do) pdf.text(`• ${m}`, { indent: 10 }); }
    if (kit.style.dont.length) { pdf.text('No', { bold: true }); for (const m of kit.style.dont) pdf.text(`• ${m}`, { indent: 10 }); }
  }
  const name = `Guia-de-marca-${slug(src.brand.name)}-kit-v${src.kit!.sequence}.pdf`;
  return finishPdf(pdf, fonts, `${src.brand.name} · Guía de marca · ${kitLine(src)} · Brandopolis`, `Guía de marca · ${src.brand.name}`, kitLine(src), name, now);
}

/** Any deliverable version as a readable PDF. */
export function deliverablePdf(src: ExportSource, fonts: FontChoice, images: Map<string, Image>, now = new Date()): BuiltDocument {
  const d = src.deliverable!, accent = primary(src.kit?.content ?? null), pdf = new BrandPdf({ heading: fonts.heading, body: fonts.body, bodyBold: fonts.bodyBold }), r = deliverableRows(d);
  const logo = logoFor(src, images);
  if (logo) pdf.image(logo.bytes, logo.format, 140, 60);
  pdf.text(TYPE_WORDS[d.content.type], { size: 11, bold: true, color: accent, after: 2 });
  pdf.text(r.title, { size: 24, role: 'heading', bold: true, after: 6 });
  pdf.text(`${src.brand.name} · versión ${d.sequence} · ${STATUS_WORDS[d.status] ?? d.status} · ${kitLine(src)}`, { size: 9, color: [0.4, 0.42, 0.41], after: 8 });
  pdf.rule(accent);
  if (r.rows.length) { pdf.facts(r.rows); pdf.gap(10); }
  for (const blk of r.blocks) { pdf.text(blk.title, { size: 14, role: 'heading', bold: true, after: 4 }); pdf.text(blk.text, { after: 10 }); }
  const name = `${slug(r.title)}-v${d.sequence}.pdf`;
  return finishPdf(pdf, fonts, `${src.brand.name} · ${r.title} · versión ${d.sequence} (${STATUS_WORDS[d.status] ?? d.status}) · Brandopolis`, r.title, `${TYPE_WORDS[d.content.type]} · versión ${d.sequence}`, name, now);
}

// ─── OOXML (PPTX, DOCX) with jszip ───────────────────────────────────────────────────────────────────────────────
const x = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
const hex6 = (rgb: Rgb) => rgb.map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
const NS = { a: 'http://schemas.openxmlformats.org/drawingml/2006/main', r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships', p: 'http://schemas.openxmlformats.org/presentationml/2006/main', rel: 'http://schemas.openxmlformats.org/package/2006/relationships', ct: 'http://schemas.openxmlformats.org/package/2006/content-types', w: 'http://schemas.openxmlformats.org/wordprocessingml/2006/main' };
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const rels = (items: [string, string, string][]) => `${XML}<Relationships xmlns="${NS.rel}">${items.map(([id, type, target]) => `<Relationship Id="${id}" Type="${NS.r}/${type}" Target="${target}"/>`).join('')}</Relationships>`;
function core(title: string, now: Date) {
  return `${XML}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${x(title)}</dc:title><dc:creator>Brandopolis</dc:creator><dc:language>es-MX</dc:language><dcterms:created xsi:type="dcterms:W3CDTF">${now.toISOString().replace(/\.\d+Z$/, 'Z')}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now.toISOString().replace(/\.\d+Z$/, 'Z')}</dcterms:modified></cp:coreProperties>`;
}
const fixedZipDate = (now: Date) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

function theme(kit: KitContent | null, headingFont: string, bodyFont: string) {
  const c = (role: string, fallback: string) => (kit?.palette.find(p => p.role === role)?.hex ?? fallback).replace('#', '').toUpperCase();
  const dk2 = c('TEXT', '1D2A26'), acc1 = c('PRIMARY', '0B6B4F'), acc2 = c('ACCENT', 'C9A86A'), lt2 = c('BACKGROUND', 'F4F1EA');
  const support = (kit?.palette.filter(p => p.role === 'SUPPORT').map(p => p.hex.replace('#', '').toUpperCase()) ?? []).concat(['5B6B66', '8A9A94', 'B8C4BF', 'DDE3E0']);
  const solid = (v: string) => `<a:solidFill><a:schemeClr val="${v}"/></a:solidFill>`;
  return `${XML}<a:theme xmlns:a="${NS.a}" name="Brandopolis"><a:themeElements><a:clrScheme name="Marca"><a:dk1><a:srgbClr val="000000"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="${dk2}"/></a:dk2><a:lt2><a:srgbClr val="${lt2}"/></a:lt2><a:accent1><a:srgbClr val="${acc1}"/></a:accent1><a:accent2><a:srgbClr val="${acc2}"/></a:accent2><a:accent3><a:srgbClr val="${support[0]}"/></a:accent3><a:accent4><a:srgbClr val="${support[1]}"/></a:accent4><a:accent5><a:srgbClr val="${support[2]}"/></a:accent5><a:accent6><a:srgbClr val="${support[3]}"/></a:accent6><a:hlink><a:srgbClr val="${acc1}"/></a:hlink><a:folHlink><a:srgbClr val="${dk2}"/></a:folHlink></a:clrScheme><a:fontScheme name="Marca"><a:majorFont><a:latin typeface="${x(headingFont)}"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="${x(bodyFont)}"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="Marca"><a:fillStyleLst>${solid('phClr')}${solid('phClr')}${solid('phClr')}</a:fillStyleLst><a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst>${solid('phClr')}${solid('phClr')}${solid('phClr')}</a:bgFillStyleLst></a:fmtScheme></a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>`;
}

/** Sales presentation as an editable PPTX: native text boxes, theme colours and fonts from the kit. */
export async function deliverablePptx(src: ExportSource, fonts: FontChoice, images: Map<string, Image>, now = new Date()): Promise<BuiltDocument> {
  const d = src.deliverable!;
  if (d.content.type !== 'SALES_PRESENTATION') throw new Error('PPTX is only offered for sales presentations');
  const kit = src.kit?.content ?? null, r = deliverableRows(d), accent = hex6(primary(kit));
  const headingFont = fonts.declared.heading ?? 'Calibri', bodyFont = fonts.declared.body ?? headingFont;
  const logo = logoFor(src, images);
  const zip = new JSZip(), date = fixedZipDate(now), add = (path: string, data: string | Buffer) => zip.file(path, data, { date });
  const W = 12192000, H = 6858000;
  const slides = [{ title: r.title, text: [`${src.brand.name}`, r.rows.find(([k]) => k === 'Para') ? `Para: ${r.rows.find(([k]) => k === 'Para')![1]}` : ''].filter(Boolean).join('\n'), cover: true }, ...((d.content.body.slides as { title: string; text: string }[]).map(s => ({ title: s.title, text: s.text, cover: false })))];
  const box = (id: number, name: string, xPos: number, y: number, w: number, h: number, paragraphs: string[], size: number, opts: { bold?: boolean; color?: string; font: 'major' | 'minor' }) =>
    `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${x(name)}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${xPos}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0"><a:normAutofit/></a:bodyPr><a:lstStyle/>${paragraphs.map(t => `<a:p><a:r><a:rPr lang="es-MX" sz="${size * 100}"${opts.bold ? ' b="1"' : ''} dirty="0">${opts.color ? `<a:solidFill><a:srgbClr val="${opts.color}"/></a:solidFill>` : '<a:solidFill><a:schemeClr val="tx2"/></a:solidFill>'}<a:latin typeface="${opts.font === 'major' ? '+mj-lt' : '+mn-lt'}"/></a:rPr><a:t>${x(t)}</a:t></a:r></a:p>`).join('') || '<a:p><a:endParaRPr lang="es-MX"/></a:p>'}</p:txBody></p:sp>`;
  const band = `<p:sp><p:nvSpPr><p:cNvPr id="9" name="Banda de color"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${W}" cy="182880"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="${accent}"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr></p:sp>`;
  const footer = (n: number) => box(8, 'Pie', 457200, H - 457200, W - 914400, 228600, [`${src.brand.name} · ${r.title} · versión ${d.sequence} (${STATUS_WORDS[d.status] ?? d.status}) · ${n}/${slides.length}`], 10, { font: 'minor', color: '7A8580' });
  const media = logo ? `image1.${logo.format === 'PNG' ? 'png' : 'jpeg'}` : null;
  const logoBox = logo ? fit(logo, 2743200, 1188720) : { cx: 0, cy: 0 };
  slides.forEach((s, i) => {
    const pic = s.cover && media ? `<p:pic><p:nvPicPr><p:cNvPr id="7" name="Logotipo" descr="Logotipo de ${x(src.brand.name)}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId2"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="609600" y="609600"/><a:ext cx="${logoBox.cx}" cy="${logoBox.cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>` : '';
    const body = s.cover
      ? box(2, 'Título', 609600, 2286000, W - 1219200, 1371600, [s.title], 40, { bold: true, font: 'major', color: accent }) + box(3, 'Subtítulo', 609600, 3810000, W - 1219200, 1143000, s.text.split('\n'), 20, { font: 'minor' })
      : box(2, 'Título', 609600, 609600, W - 1219200, 1143000, [s.title], 32, { bold: true, font: 'major', color: accent }) + box(3, 'Texto', 609600, 1905000, W - 1219200, 3962400, s.text.split('\n').filter(Boolean), 20, { font: 'minor' });
    add(`ppt/slides/slide${i + 1}.xml`, `${XML}<p:sld xmlns:a="${NS.a}" xmlns:r="${NS.r}" xmlns:p="${NS.p}"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${band}${pic}${body}${footer(i + 1)}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`);
    add(`ppt/slides/_rels/slide${i + 1}.xml.rels`, rels([['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml'], ...(s.cover && media ? [['rId2', 'image', `../media/${media}`] as [string, string, string]] : [])]));
  });
  if (logo && media) add(`ppt/media/${media}`, logo.bytes);
  add('[Content_Types].xml', `${XML}<Types xmlns="${NS.ct}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>${slides.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('')}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`);
  add('_rels/.rels', rels([['rId1', 'officeDocument', 'ppt/presentation.xml']]).replace('</Relationships>', `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="${NS.r}/extended-properties" Target="docProps/app.xml"/></Relationships>`));
  add('docProps/core.xml', core(r.title, now));
  add('docProps/app.xml', `${XML}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Brandopolis</Application><Slides>${slides.length}</Slides></Properties>`);
  add('ppt/presentation.xml', `${XML}<p:presentation xmlns:a="${NS.a}" xmlns:r="${NS.r}" xmlns:p="${NS.p}" saveSubsetFonts="1"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 3}"/>`).join('')}</p:sldIdLst><p:sldSz cx="${W}" cy="${H}"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`);
  add('ppt/_rels/presentation.xml.rels', rels([['rId1', 'slideMaster', 'slideMasters/slideMaster1.xml'], ['rId2', 'theme', 'theme/theme1.xml'], ...slides.map((_, i) => [`rId${i + 3}`, 'slide', `slides/slide${i + 1}.xml`] as [string, string, string])]));
  const emptyTree = '<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree>';
  add('ppt/slideMasters/slideMaster1.xml', `${XML}<p:sldMaster xmlns:a="${NS.a}" xmlns:r="${NS.r}" xmlns:p="${NS.p}"><p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg>${emptyTree}</p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle><a:lvl1pPr><a:defRPr sz="3200"><a:latin typeface="+mj-lt"/></a:defRPr></a:lvl1pPr></p:titleStyle><p:bodyStyle><a:lvl1pPr><a:defRPr sz="2000"><a:latin typeface="+mn-lt"/></a:defRPr></a:lvl1pPr></p:bodyStyle><p:otherStyle><a:lvl1pPr><a:defRPr sz="1800"><a:latin typeface="+mn-lt"/></a:defRPr></a:lvl1pPr></p:otherStyle></p:txStyles></p:sldMaster>`);
  add('ppt/slideMasters/_rels/slideMaster1.xml.rels', rels([['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml'], ['rId2', 'theme', '../theme/theme1.xml']]));
  add('ppt/slideLayouts/slideLayout1.xml', `${XML}<p:sldLayout xmlns:a="${NS.a}" xmlns:r="${NS.r}" xmlns:p="${NS.p}" type="blank" preserve="1"><p:cSld name="En blanco">${emptyTree}</p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`);
  add('ppt/slideLayouts/_rels/slideLayout1.xml.rels', rels([['rId1', 'slideMaster', '../slideMasters/slideMaster1.xml']]));
  add('ppt/theme/theme1.xml', theme(kit, headingFont, bodyFont));
  const bytes = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', platform: 'DOS' });
  return { bytes, filename: `${slug(r.title)}-v${d.sequence}.pptx`, mediaType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', notices: [...fonts.notices] };
}

/** Text deliverables (and any deliverable) as an editable DOCX with real headings and paragraphs. */
export async function deliverableDocx(src: ExportSource, fonts: FontChoice, now = new Date()): Promise<BuiltDocument> {
  const d = src.deliverable!, r = deliverableRows(d), accent = hex6(primary(src.kit?.content ?? null));
  const headingFont = fonts.declared.heading ?? 'Calibri', bodyFont = fonts.declared.body ?? headingFont;
  const run = (t: string, props = '') => t.split('\n').map((line, i) => `${i ? '<w:r><w:br/></w:r>' : ''}<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}<w:t xml:space="preserve">${x(line)}</w:t></w:r>`).join('');
  const p = (style: string, t: string, props = '') => `<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr>${run(t, props)}</w:p>`;
  const rows = r.rows.map(([k, v]) => `<w:tr><w:tc><w:tcPr><w:tcW w:w="2600" w:type="dxa"/></w:tcPr><w:p>${run(k, '<w:b/>')}</w:p></w:tc><w:tc><w:tcPr><w:tcW w:w="6400" w:type="dxa"/></w:tcPr><w:p>${run(v)}</w:p></w:tc></w:tr>`).join('');
  const table = rows ? `<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/><w:tblBorders><w:insideH w:val="single" w:sz="4" w:color="DDDDDD"/><w:bottom w:val="single" w:sz="4" w:color="DDDDDD"/></w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="2600"/><w:gridCol w:w="6400"/></w:tblGrid>${rows}</w:tbl>` : '';
  const body = [p('Kicker', TYPE_WORDS[d.content.type]), p('Title', r.title), p('Meta', `${src.brand.name} · versión ${d.sequence} · ${STATUS_WORDS[d.status] ?? d.status} · ${kitLine(src)}`), table, ...r.blocks.flatMap(b => [p('Heading1', b.title), p('Normal', b.text)])].join('');
  const sect = `<w:sectPr><w:footerReference w:type="default" r:id="rId2"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1418" w:bottom="1418" w:left="1418" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>`;
  const zip = new JSZip(), date = fixedZipDate(now), add = (path: string, data: string) => zip.file(path, data, { date });
  add('[Content_Types].xml', `${XML}<Types xmlns="${NS.ct}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`);
  add('_rels/.rels', rels([['rId1', 'officeDocument', 'word/document.xml']]).replace('</Relationships>', '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>'));
  add('docProps/core.xml', core(r.title, now));
  add('word/_rels/document.xml.rels', rels([['rId1', 'styles', 'styles.xml'], ['rId2', 'footer', 'footer1.xml']]));
  add('word/document.xml', `${XML}<w:document xmlns:w="${NS.w}" xmlns:r="${NS.r}"><w:body>${body}${sect}</w:body></w:document>`);
  add('word/footer1.xml', `${XML}<w:ftr xmlns:w="${NS.w}" xmlns:r="${NS.r}">${p('Meta', `${src.brand.name} · ${r.title} · versión ${d.sequence} · Brandopolis`)}</w:ftr>`);
  const style = (id: string, name: string, rpr: string, ppr = '', type = 'paragraph') => `<w:style w:type="${type}" w:styleId="${id}"><w:name w:val="${name}"/>${id !== 'Normal' ? '<w:basedOn w:val="Normal"/>' : ''}<w:qFormat/>${ppr ? `<w:pPr>${ppr}</w:pPr>` : ''}<w:rPr>${rpr}</w:rPr></w:style>`;
  const font = (f: string) => `<w:rFonts w:ascii="${x(f)}" w:hAnsi="${x(f)}" w:cs="${x(f)}"/>`;
  add('word/styles.xml', `${XML}<w:styles xmlns:w="${NS.w}"><w:docDefaults><w:rPrDefault><w:rPr>${font(bodyFont)}<w:sz w:val="22"/><w:lang w:val="es-MX"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>${style('Normal', 'Normal', font(bodyFont))}${style('Title', 'Title', `${font(headingFont)}<w:b/><w:sz w:val="48"/><w:color w:val="${accent}"/>`, '<w:spacing w:after="120"/>')}${style('Heading1', 'heading 1', `${font(headingFont)}<w:b/><w:sz w:val="30"/><w:color w:val="${accent}"/>`, '<w:keepNext/><w:spacing w:before="320" w:after="120"/><w:outlineLvl w:val="0"/>')}${style('Kicker', 'Kicker', `<w:b/><w:caps/><w:sz w:val="18"/><w:color w:val="${accent}"/>`)}${style('Meta', 'Meta', '<w:sz w:val="18"/><w:color w:val="6B7570"/>')}</w:styles>`);
  const bytes = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', platform: 'DOS' });
  return { bytes, filename: `${slug(r.title)}-v${d.sequence}.docx`, mediaType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', notices: [...fonts.notices] };
}
