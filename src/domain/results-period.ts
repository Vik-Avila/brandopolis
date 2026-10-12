import { AppError } from './contracts.js';
import { RESULTS_TIMEZONE } from './clients.js';

/**
 * PHASE4_SPEC §13 · periods for Resultados. Days are calendar days in the results time zone; each period is
 * [from 00:00, to 24:00) in that zone, turned into UTC instants for filtering. A comparison is either the immediately
 * preceding period of the same length or the same dates one year earlier. Pure: `now` is a parameter.
 */
export const PERIOD_PRESETS = ['LAST_7', 'LAST_30', 'LAST_90', 'THIS_MONTH', 'LAST_MONTH', 'THIS_QUARTER', 'THIS_YEAR', 'CUSTOM'] as const;
export type PeriodPreset = typeof PERIOD_PRESETS[number];
export const COMPARISONS = ['NONE', 'PREVIOUS', 'YEAR_AGO'] as const;
export type Comparison = typeof COMPARISONS[number];
export type DayRange = { from: string; to: string; days: number; label: string; fromInstant: string; toInstant: string };
export type ResultsPeriod = { preset: PeriodPreset; compare: Comparison; timezone: string; current: DayRange; comparison: DayRange | null };

const MAX_DAYS = 366;
const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;
const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000) + 1;
/** Calendar day of an instant in a time zone. */
export const dayIn = (instant: Date, timeZone = RESULTS_TIMEZONE) => new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant);
/** UTC instant of 00:00 of a calendar day in a time zone (handles any offset, including daylight saving). */
export function startOfDay(day: string, timeZone = RESULTS_TIMEZONE): Date {
  const guess = new Date(`${day}T00:00:00Z`);
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(guess).map(p => [p.type, p.value]));
  const asIfUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
  return new Date(guess.getTime() - (asIfUtc - guess.getTime()));
}
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const short = (day: string) => { const [y, m, d] = day.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };
function range(from: string, to: string, timeZone: string): DayRange {
  return { from, to, days: daysBetween(from, to), label: from === to ? short(from) : `${short(from)} – ${short(to)}`, fromInstant: startOfDay(from, timeZone).toISOString(), toInstant: startOfDay(addDays(to, 1), timeZone).toISOString() };
}

/** Resolves the period chosen in Resultados. Invalid custom dates are refused, never silently replaced. */
export function resultsPeriod(input: { preset?: unknown; from?: unknown; to?: unknown; compare?: unknown }, now = new Date(), timeZone = RESULTS_TIMEZONE): ResultsPeriod {
  const preset = (PERIOD_PRESETS as readonly string[]).includes(String(input.preset)) ? input.preset as PeriodPreset : 'LAST_30';
  const compare = (COMPARISONS as readonly string[]).includes(String(input.compare)) ? input.compare as Comparison : 'NONE';
  const today = dayIn(now, timeZone), [y, m] = today.split('-').map(Number);
  const monthStart = (yy: number, mm: number) => `${yy}-${String(mm).padStart(2, '0')}-01`;
  let from: string, to = today;
  switch (preset) {
    case 'LAST_7': from = addDays(today, -6); break;
    case 'LAST_90': from = addDays(today, -89); break;
    case 'THIS_MONTH': from = monthStart(y, m); break;
    case 'LAST_MONTH': { const py = m === 1 ? y - 1 : y, pm = m === 1 ? 12 : m - 1; from = monthStart(py, pm); to = addDays(monthStart(y, m), -1); break; }
    case 'THIS_QUARTER': from = monthStart(y, Math.floor((m - 1) / 3) * 3 + 1); break;
    case 'THIS_YEAR': from = `${y}-01-01`; break;
    case 'CUSTOM': {
      if (!isDay(input.from) || !isDay(input.to)) throw new AppError('INVALID', 'Choose valid start and end dates');
      if (input.from > input.to) throw new AppError('INVALID', 'The start date is after the end date');
      if (input.to > today) throw new AppError('INVALID', 'The period cannot end after today');
      if (daysBetween(input.from, input.to) > MAX_DAYS) throw new AppError('INVALID', `A period covers at most ${MAX_DAYS} days`);
      from = input.from; to = input.to; break;
    }
    default: from = addDays(today, -29);
  }
  const current = range(from, to, timeZone);
  let comparison: DayRange | null = null;
  if (compare === 'PREVIOUS') comparison = range(addDays(from, -current.days), addDays(from, -1), timeZone);
  if (compare === 'YEAR_AGO') {
    // Same calendar dates one year earlier (29 February falls back to 28 February).
    const back = (day: string) => { const [yy, mm, dd] = day.split('-').map(Number); const last = new Date(Date.UTC(yy - 1, mm, 0)).getUTCDate(); return `${yy - 1}-${String(mm).padStart(2, '0')}-${String(Math.min(dd, last)).padStart(2, '0')}`; };
    comparison = range(back(from), back(to), timeZone);
  }
  return { preset, compare, timezone: timeZone, current, comparison };
}

/** Change against the comparison, only when it means something: no percentage over a zero or unknown base. */
export function change(current: number, previous: number | null) {
  if (previous === null) return { previous: null, difference: null, percent: null, note: 'Sin periodo de comparación.' };
  const difference = current - previous;
  if (previous === 0) return { previous, difference, percent: null, note: 'Sin porcentaje: el periodo de comparación tiene cero.' };
  return { previous, difference, percent: Math.round((difference / previous) * 1000) / 10, note: null };
}

export const inRange = (instant: Date, r: DayRange) => instant.toISOString() >= r.fromInstant && instant.toISOString() < r.toInstant;
/** A provider reading covers [periodStart, periodEnd] days; it counts when it overlaps the chosen days. */
export const readingOverlaps = (reading: { periodStart: string; periodEnd: string }, r: DayRange) => reading.periodEnd >= r.from && reading.periodStart <= r.to;
