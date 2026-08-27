import type {
  ActivityLevel,
  FoodNutrientsPer100g,
  Goal,
  LogEntry,
  Nutrients,
  UserProfile,
} from '../api/types';

/**
 * Nutrient arithmetic, client-side for optimistic rendering only — the server
 * refreezes its own numbers at commit and history reads the frozen copy.
 */

/** Scale a per-100 g row to an actual portion. Unknown fiber stays unknown. */
export function scale(per100g: FoodNutrientsPer100g, gramsAmount: number): Nutrients {
  const f = gramsAmount / 100;
  // Each nutrient carries its own state through the arithmetic. An unknown
  // stays unknown: multiplying a missing measurement by a portion does not
  // measure it.
  return {
    kcal: per100g.kcal * f,
    proteinG: per100g.proteinG * f,
    carbsG: per100g.carbsG === null ? null : per100g.carbsG * f,
    carbsState: per100g.carbsState,
    fatG: per100g.fatG === null ? null : per100g.fatG * f,
    fatState: per100g.fatState,
    fiberG: per100g.fiberG === null ? null : per100g.fiberG * f,
    fiberState: per100g.fiberState,
  };
}

/**
 * Unknown fiber is skipped, not coerced to zero, and counted separately — so the
 * ring can say "12 of 28 g, 2 items unmeasured" instead of under-reporting.
 */
export function total(items: Nutrients[]): {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  carbsUnmeasuredItems: number;
  fatUnmeasuredItems: number;
  fiberUnmeasuredItems: number;
} {
  let kcal = 0;
  let proteinG = 0;
  let carbsG = 0;
  let fatG = 0;
  let fiberG = 0;
  let carbsUnmeasuredItems = 0;
  let fatUnmeasuredItems = 0;
  let fiberUnmeasuredItems = 0;

  for (const n of items) {
    kcal += n.kcal;
    proteinG += n.proteinG;
    // Counted per nutrient, never shared: the item missing fibre is usually
    // not the item missing carbs.
    if (n.carbsG === null) carbsUnmeasuredItems += 1;
    else carbsG += n.carbsG;
    if (n.fatG === null) fatUnmeasuredItems += 1;
    else fatG += n.fatG;
    if (n.fiberG === null) fiberUnmeasuredItems += 1;
    else fiberG += n.fiberG;
  }

  return {
    kcal,
    proteinG,
    carbsG,
    fatG,
    fiberG,
    carbsUnmeasuredItems,
    fatUnmeasuredItems,
    fiberUnmeasuredItems,
  };
}

export const entryTotals = (entry: LogEntry) => total(entry.items.map(i => i.nutrients));

// ── target derivation ────────────────────────────────────────────────────────

/** Plain-language levels, and the multiplier the user never sees. */
/**
 * `label` is the sentence, `short` is the name.
 *
 * Both, because they are read in different places: the sentence is what makes
 * the question answerable about yourself and is what a screen reader says, and
 * the name is what fits on a tile next to an icon. Deriving one from the other
 * — splitting the label on its dash — works for four of these five and breaks
 * on the one that has no dash.
 */
export const ACTIVITY: Record<
  ActivityLevel,
  { label: string; short: string; detail: string; factor: number }
> = {
  sedentary: { label: 'Desk job, little exercise', short: 'Desk job', detail: 'Mostly seated', factor: 1.2 },
  light: { label: 'Light — 1–2 workouts a week', short: 'Light', detail: 'On your feet some days', factor: 1.375 },
  moderate: { label: 'Moderate — 3–4 a week', short: 'Moderate', detail: 'Regular training', factor: 1.55 },
  very_active: { label: 'Very active — physical job', short: 'Very active', detail: 'Or twice-daily training', factor: 1.9 },
};

export const OBJECTIVE_LABEL = {
  lose: 'Lose weight',
  maintain: 'Stay where I am',
  gain: 'Gain weight',
} as const;

export function ageFrom(birthDate: string, now = new Date()): number {
  const [y, m, d] = birthDate.split('-').map(Number);
  let age = now.getFullYear() - y;
  const beforeBirthday =
    now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d);
  if (beforeBirthday) age -= 1;
  return age;
}

/** Mifflin–St Jeor. The basis line on the targets screen quotes this number. */
export function bmr(p: UserProfile, now = new Date()): number {
  const age = ageFrom(p.birthDate, now);
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * age;
  return Math.round(p.sex === 'male' ? base + 5 : base - 161);
}

/**
 * The calorie target is floored at BMR — an aggressive rate gets the floor and
 * is told so, rather than a number that endorses an unsafe deficit.
 */
export function deriveGoal(p: UserProfile, now = new Date()): Goal {
  const factor = ACTIVITY[p.activityLevel].factor;
  const restingBurn = bmr(p, now);
  const tdee = Math.round(restingBurn * factor);

  // 1 kg of body mass ≈ 7,700 kcal, spread across seven days.
  const dailyDelta = (p.rateKgPerWeek * 7700) / 7;
  const signed = p.objective === 'lose' ? -dailyDelta : p.objective === 'gain' ? dailyDelta : 0;

  const uncapped = Math.round(tdee + signed);
  const flooredAtBmr = uncapped < restingBurn;
  const kcal = Math.max(uncapped, restingBurn);

  // Upper end of the evidence-backed range, because a deficit is catabolic.
  const perKg = p.objective === 'lose' ? 1.9 : p.objective === 'gain' ? 1.7 : 1.6;
  const proteinG = Math.round(p.weightKg * perKg);

  // 14 g per 1,000 kcal — the dietary-guidelines basis.
  const fiberG = Math.round((kcal / 1000) * 14);

  // Fat is a POLICY share; carbohydrate takes the remainder by difference.
  // Both mirror the server's goal-calculator exactly — the targets screen
  // previews live as the profile changes, and a preview that disagreed with
  // the goal the user then accepts would be worse than no preview at all.
  const fatPctOfKcal = 0.25;
  const fatG = Math.round((kcal * fatPctOfKcal) / 9);
  const carbsG = Math.max(0, Math.round((kcal - proteinG * 4 - fatG * 9) / 4));

  return {
    id: 'goal-derived',
    kcal: Math.round(kcal / 10) * 10,
    proteinG,
    carbsG,
    fatG,
    fiberG,
    effectiveFrom: new Date(now).toISOString().slice(0, 10),
    basis: {
      bmr: restingBurn,
      tdee,
      activityFactor: factor,
      adjustmentPct: tdee === 0 ? 0 : Math.round((signed / tdee) * 100),
      flooredAtBmr,
      fatPctOfKcal,
    },
  };
}

/** The sentence under each target on the reveal screen. */
export function goalReasoning(goal: Goal, p: UserProfile): Record<'kcal' | 'protein' | 'fiber', string> {
  const { basis } = goal;
  const adj = Math.abs(basis.adjustmentPct);
  const direction = basis.adjustmentPct < 0 ? 'minus' : 'plus';
  const kcalLine = basis.flooredAtBmr
    ? `Held at your resting burn of ${basis.bmr.toLocaleString('en-US')} kcal. The rate you picked would have gone below it, and we do not set a target under what your body spends at rest.`
    : basis.adjustmentPct === 0
      ? `Resting burn ${basis.bmr.toLocaleString('en-US')} × ${basis.activityFactor} for your activity. No adjustment — you are maintaining.`
      : `Resting burn ${basis.bmr.toLocaleString('en-US')} × ${basis.activityFactor} for your activity, ${direction} ${adj}% to ${p.objective} ${p.rateKgPerWeek} kg a week.`;

  const perKg = (goal.proteinG / p.weightKg).toFixed(1);
  return {
    kcal: kcalLine,
    protein:
      p.objective === 'lose'
        ? `${perKg} g per kg of bodyweight — the upper end, because you are in a deficit.`
        : `${perKg} g per kg of bodyweight, the middle of the evidence-backed range.`,
    fiber: '14 g per 1,000 kcal, the dietary-guidelines basis. Most people land near half this.',
  };
}
