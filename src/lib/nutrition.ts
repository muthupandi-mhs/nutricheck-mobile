import type {
  ActivityLevel,
  FoodNutrientsPer100g,
  Goal,
  LogEntry,
  Nutrients,
  UserProfile,
} from '../api/types';

/**
 * Nutrient arithmetic.
 *
 * The client recomputes these only for optimistic rendering — the server
 * refreezes its own numbers at commit and history reads from the frozen copy.
 * Keeping the maths here anyway is what lets a portion chip retotal the sheet
 * without a round-trip.
 */

/** Scale a per-100 g row to an actual portion. Unknown fiber stays unknown. */
export function scale(per100g: FoodNutrientsPer100g, gramsAmount: number): Nutrients {
  const f = gramsAmount / 100;
  return {
    kcal: per100g.kcal * f,
    proteinG: per100g.proteinG * f,
    fiberG: per100g.fiberG === null ? null : per100g.fiberG * f,
    fiberState: per100g.fiberState,
  };
}

/**
 * Sum a list of nutrient triples.
 *
 * Unknown fiber is *skipped*, not coerced to zero, and counted separately —
 * which is what lets the ring say "12 of 28 g, 2 items unmeasured" instead of
 * quietly under-reporting every day that contains one unmeasured food.
 */
export function total(items: Nutrients[]): {
  kcal: number;
  proteinG: number;
  fiberG: number;
  fiberUnmeasuredItems: number;
} {
  let kcal = 0;
  let proteinG = 0;
  let fiberG = 0;
  let fiberUnmeasuredItems = 0;
  for (const n of items) {
    kcal += n.kcal;
    proteinG += n.proteinG;
    if (n.fiberG === null) fiberUnmeasuredItems += 1;
    else fiberG += n.fiberG;
  }
  return { kcal, proteinG, fiberG, fiberUnmeasuredItems };
}

export const entryTotals = (entry: LogEntry) => total(entry.items.map(i => i.nutrients));

// ── target derivation ────────────────────────────────────────────────────────

/** Plain-language levels, and the multiplier the user never sees. */
export const ACTIVITY: Record<ActivityLevel, { label: string; detail: string; factor: number }> = {
  sedentary: { label: 'Desk job, little exercise', detail: 'Mostly seated', factor: 1.2 },
  light: { label: 'Light — 1–2 workouts a week', detail: 'On your feet some days', factor: 1.375 },
  moderate: { label: 'Moderate — 3–4 a week', detail: 'Regular training', factor: 1.55 },
  active: { label: 'Active — 5–6 a week', detail: 'Hard training most days', factor: 1.725 },
  very_active: { label: 'Very active — physical job', detail: 'Or twice-daily training', factor: 1.9 },
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
 * Derive the three targets from a profile, and keep the reasoning attached.
 *
 * The calorie target is floored at BMR: a user who asks for 1 kg a week at
 * 55 kg gets the floor and is told so, rather than a number that would make the
 * app complicit in an unsafe deficit.
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

  return {
    id: 'goal-derived',
    kcal: Math.round(kcal / 10) * 10,
    proteinG,
    fiberG,
    effectiveFrom: new Date(now).toISOString().slice(0, 10),
    basis: {
      bmr: restingBurn,
      tdee,
      activityFactor: factor,
      adjustmentPct: tdee === 0 ? 0 : Math.round((signed / tdee) * 100),
      flooredAtBmr,
    },
  };
}

/** The sentence under each target on the reveal screen. Users who see the math trust it. */
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
