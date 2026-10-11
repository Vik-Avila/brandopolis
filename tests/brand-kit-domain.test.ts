// ADR-0034 · brand kit pure rules (no database): certainty, adoption, contrast, channel needs and differences.
import { describe, it, expect } from 'vitest';
import { adoptValues, assertNoSilentConfirmation, channelGaps, contrastRatio, emptyKit, kitDiff, normalizeKit, pairContrast, type KitContent } from '../src/domain/brand-kit.js';

const origin = { kind: 'DOCUMENT' as const, assetId: 'manual', page: 12, note: '' };
const kit = (extra: Partial<KitContent> = {}) => normalizeKit({ ...emptyKit(), palette: [
  { id: 'red', name: 'Rojo', hex: '#c8102e', role: 'PRIMARY', reference: 'Pantone 186 C', certainty: 'DECLARED', origin },
  { id: 'white', name: 'Blanco', hex: '#FFFFFF', role: 'BACKGROUND', reference: '', certainty: 'ESTIMATED', origin: { kind: 'IMAGE', assetId: 'logo', page: null, note: 'muestreado' } },
  { id: 'black', name: 'Negro', hex: '#111111', role: 'TEXT', reference: '', certainty: 'PROPOSED', origin: { kind: 'PERSON', assetId: null, page: null, note: '' } }
], ...extra });

describe('ADR-0034 · brand kit domain', () => {
  it('normalizes values (hex upper case, sorted weights) and validates against brand-kit-version v1', () => {
    const k = kit({ typography: [{ id: 'sans', family: 'Inter', use: 'BODY', weights: [700, 400, 400], source: 'Google Fonts', webEmbedding: 'ALLOWED', documentEmbedding: 'UNKNOWN', alternatives: [], certainty: 'DECLARED', origin }] as KitContent['typography'] });
    expect(k.palette[0].hex).toBe('#C8102E');
    expect(k.typography[0].weights).toEqual([400, 700]);
    expect(() => kit({ palette: [{ id: 'x', name: 'Mal', hex: 'red', role: 'PRIMARY', reference: '', certainty: 'DECLARED', origin }] as KitContent['palette'] })).toThrow();
    expect(() => normalizeKit({ ...emptyKit(), pairs: [{ text: 'nope', background: 'white', use: '' }] })).toThrow(/colors of this kit/);
    expect(() => kit({ logos: [{ id: 'red', variant: 'PRIMARY', assetId: 'a', fingerprint: 'f'.repeat(64), minWidthPx: null, usage: '', certainty: 'DECLARED', origin }] as KitContent['logos'] })).toThrow(/own id/);
  });

  it('IDN-003: an ESTIMATED or PROPOSED value never becomes CONFIRMED by saving; only an explicit adoption confirms it', () => {
    const before = kit();
    const silent = { ...before, palette: before.palette.map(c => c.id === 'white' ? { ...c, certainty: 'CONFIRMED' as const } : c) };
    expect(() => assertNoSilentConfirmation(before, silent)).toThrow(/explicit adoption/);
    const adopted = adoptValues(before, ['white']);
    expect(adopted.palette.find(c => c.id === 'white')!.certainty).toBe('CONFIRMED');
    expect(adopted.palette.find(c => c.id === 'black')!.certainty).toBe('PROPOSED');
    expect(() => assertNoSilentConfirmation(adopted, adopted)).not.toThrow();
    // Editing a confirmed value without a new adoption is refused (it would carry a confirmation it never had).
    const edited = { ...adopted, palette: adopted.palette.map(c => c.id === 'white' ? { ...c, hex: '#FAFAFA' } : c) };
    expect(() => assertNoSilentConfirmation(adopted, edited)).toThrow();
    expect(() => adoptValues(before, ['unknown'])).toThrow();
  });

  it('contrast is measured pair by pair with the WCAG formula', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBe(21);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBe(1);
    const k = kit({ pairs: [{ text: 'black', background: 'white', use: 'Texto' }, { text: 'red', background: 'white', use: 'Botón' }, { text: 'white', background: 'white', use: 'Error' }] });
    const [a, b, c] = pairContrast(k);
    expect(a).toMatchObject({ normalText: 'AA', largeText: 'AA' });
    expect(b.ratio).toBeGreaterThan(5);
    expect(c).toMatchObject({ ratio: 1, normalText: 'FAILS', largeText: 'FAILS' });
  });

  it('channel needs depend on the channels the brand uses, not a universal list', () => {
    expect(channelGaps(normalizeKit({ ...emptyKit(), channels: ['ADS'] }))).toEqual([{ channel: 'ALL', need: 'PALETTE' }, { channel: 'ALL', need: 'TONE' }]);
    const web = channelGaps(kit({ channels: ['WEBSITE', 'PRESENTATION'], verbal: { tone: 'Cercano', messages: [], examples: [] } }));
    expect(web.map(g => `${g.channel}:${g.need}`)).toEqual(['WEBSITE:PRIMARY_LOGO', 'WEBSITE:FAVICON', 'WEBSITE:WEB_FONT', 'WEBSITE:CONTRAST_PAIRS', 'PRESENTATION:PRIMARY_LOGO', 'PRESENTATION:DOCUMENT_FONT']);
  });

  it('«completar» shows added, removed and changed values between versions', () => {
    const a = kit(), b = { ...a, palette: [...a.palette.filter(c => c.id !== 'black').map(c => c.id === 'red' ? { ...c, name: 'Rojo marca' } : c), { id: 'gold', name: 'Oro', hex: '#C9A227', role: 'ACCENT' as const, reference: '', certainty: 'PROPOSED' as const, origin }] };
    expect(kitDiff(a, b)).toEqual({ added: ['gold'], removed: ['black'], changed: ['red'] });
  });
});

describe('ADR-0034 · candidates from a brand manual', () => {
  it('extracts declared colors and typefaces with their page, never confirmed', async () => {
    const { kitCandidatesFromText } = await import('../src/domain/brand-kit.js');
    const c = kitCandidatesFromText([{ index: 3, text: 'Color principal #c8102e Pantone 186 C. Fondo RGB(255, 255, 255).' }, { index: 7, text: 'Tipografía principal: Montserrat Bold. Fuente secundaria: Lora. Repetido #C8102E' }], 'manual-1');
    expect(c.palette.map(p => [p.hex, p.reference, p.origin.page, p.certainty])).toEqual([['#C8102E', 'Pantone 186 C', 3, 'DECLARED'], ['#FFFFFF', '', 3, 'DECLARED']]);
    expect(c.typography.map(f => [f.family, f.origin.page, f.certainty])).toEqual([['Montserrat Bold', 7, 'DECLARED'], ['Lora', 7, 'DECLARED']]);
    expect(c.palette.every(p => p.origin.assetId === 'manual-1')).toBe(true);
  });
});
