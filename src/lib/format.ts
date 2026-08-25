/**
 * Display formatting. Every number the user sees passes through here, which is
 * how "unknown" stays visibly different from zero across every screen.
 */

/** 2100 → "2,100". Grouping only; kcal is never shown with a decimal. */
export const kcal = (n: number): string => Math.round(n).toLocaleString('en-US');

/** Grams: one decimal under 10, whole numbers above. 9.4 g reads; 217.3 g does not. */
export function grams(n: number): string {
  if (n < 10) return (Math.round(n * 10) / 10).toString();
  return Math.round(n).toString();
}

/**
 * The unknown marker. An em dash, never "0" — zero is a claim, unknown is the
 * truth (PLAN §5). Anything nullable in the nutrient triple renders through this.
 */
export const DASH = '—';

export const gramsOrDash = (n: number | null): string => (n === null ? DASH : grams(n));

/** "+520" / "−120". Uses a real minus sign so it aligns with tabular figures. */
export function delta(n: number): string {
  const r = Math.round(n);
  if (r === 0) return '0';
  return r > 0 ? `+${kcal(r)}` : `−${kcal(Math.abs(r))}`;
}

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** "TUE 25 AUG" — the masthead eyebrow. */
export function dateEyebrow(d: Date): string {
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** Single-letter axis label for the week chart. */
export const dayInitial = (d: Date): string => DAYS[d.getDay()][0];

/** "YYYY-MM-DD" in the device's own zone. A day in the tracker is local, not UTC. */
export function localDate(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const parseLocalDate = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export function addDays(s: string, n: number): string {
  const d = parseLocalDate(s);
  d.setDate(d.getDate() + n);
  return localDate(d);
}

/** "08:42" — the time a meal was logged, on the entry detail screen. */
export function clockTime(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** "in 4 h", "in 18 min" — how long until a quota resets. */
export function untilReset(iso: string, now = new Date()): string {
  const mins = Math.max(0, Math.round((new Date(iso).getTime() - now.getTime()) / 60000));
  if (mins < 60) return `in ${mins} min`;
  const hours = Math.round(mins / 60);
  return `in ${hours} h`;
}

/**
 * The slot a timestamp belongs to. Used to group the day list, to bias the
 * recents strip by time of day, and to pick the slot for a one-tap repeat.
 */
export function mealSlotFor(d: Date = new Date()): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const h = d.getHours();
  if (h < 11) return 'breakfast';
  if (h < 16) return 'lunch';
  if (h < 22) return 'dinner';
  return 'snack';
}

export const MEAL_LABEL: Record<string, string> = {
  breakfast: 'BREAKFAST',
  lunch: 'LUNCH',
  dinner: 'DINNER',
  snack: 'SNACK',
};

export const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

/** Clamp for progress bars — a 3,000 kcal day must not paint past the track. */
export const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

/** Pluralise without a library. `plural(1,'item')` → "1 item". */
export const plural = (n: number, one: string, many = `${one}s`): string =>
  `${n} ${n === 1 ? one : many}`;
