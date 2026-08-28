import type { UserProfile } from '../src/api/types';
import { deriveGoal, scale, total } from '../src/lib/nutrition';
import { capPhrase, DASH, grams, gramsOrDash, kcal } from '../src/lib/format';

/**
 * The arithmetic behind every number on screen.
 *
 * These are the tests worth having: the formatting is visible the moment you
 * open the app, but a fiber total that silently counts unknowns as zero looks
 * completely normal and is wrong on every day it happens.
 */

const per100g = {
  kcal: 200,
  proteinG: 20,
  carbsG: 20,
  carbsState: 'known' as const,
  fatG: 5,
  fatState: 'known' as const,
  fiberG: 4,
  fiberState: 'known' as const,
};
/** Only fibre is missing here — carbs and fat are measured, which is the shape a
 * real corpus gap has: USDA reports carbs and fat for every row and fibre for 93%. */
const unknownFiber = {
  kcal: 61,
  proteinG: 3.5,
  carbsG: 4.7,
  carbsState: 'known' as const,
  fatG: 3.3,
  fatState: 'known' as const,
  fiberG: null,
  fiberState: 'unknown' as const,
};

describe('scale', () => {
  it('scales linearly from the per-100 g row', () => {
    expect(scale(per100g, 250)).toEqual({
      kcal: 500,
      proteinG: 50,
      // Every macro scales with the portion, not just the two the app started with.
      carbsG: 50,
      carbsState: 'known',
      fatG: 12.5,
      fatState: 'known',
      fiberG: 10,
      fiberState: 'known',
    });
  });

  it('keeps unknown fiber unknown at any portion', () => {
    const out = scale(unknownFiber, 150);
    expect(out.fiberG).toBeNull();
    expect(out.fiberState).toBe('unknown');
  });
});

describe('total', () => {
  it('excludes unknown fiber from the sum and counts it separately', () => {
    const out = total([scale(per100g, 100), scale(unknownFiber, 200)]);

    // 4 g from the known row, and nothing invented for the unknown one.
    expect(out.fiberG).toBe(4);
    expect(out.fiberUnmeasuredItems).toBe(1);
  });

  it('never treats unknown fiber as zero', () => {
    const onlyUnknown = total([scale(unknownFiber, 100)]);
    expect(onlyUnknown.fiberG).toBe(0);
    // The distinction the ring depends on: 0 g measured vs nothing measured.
    expect(onlyUnknown.fiberUnmeasuredItems).toBe(1);
  });
});

describe('deriveGoal', () => {
  const base: UserProfile = {
    sex: 'male',
    birthDate: '1994-06-15',
    heightCm: 178,
    weightKg: 74,
    activityLevel: 'moderate',
    objective: 'lose',
    rateKgPerWeek: 0.5,
    units: 'metric',
  };

  it('produces a target below maintenance when losing', () => {
    const goal = deriveGoal(base, new Date('2025-06-15T12:00:00Z'));
    expect(goal.kcal).toBeLessThan(goal.basis.tdee);
    expect(goal.basis.flooredAtBmr).toBe(false);
  });

  it('floors the target at resting burn and says so', () => {
    // A rate this aggressive on a light frame would otherwise produce a target
    // under what the body spends at rest.
    const extreme = deriveGoal(
      { ...base, weightKg: 52, heightCm: 160, activityLevel: 'sedentary', rateKgPerWeek: 1.5 },
      new Date('2025-06-15T12:00:00Z'),
    );
    expect(extreme.basis.flooredAtBmr).toBe(true);
    expect(extreme.kcal).toBeGreaterThanOrEqual(extreme.basis.bmr - 10);
  });

  it('applies no adjustment when maintaining', () => {
    const goal = deriveGoal({ ...base, objective: 'maintain', rateKgPerWeek: 0 }, new Date('2025-06-15T12:00:00Z'));
    expect(goal.basis.adjustmentPct).toBe(0);
  });

  it('derives fiber from the calorie target, not the profile', () => {
    const goal = deriveGoal(base, new Date('2025-06-15T12:00:00Z'));
    expect(goal.fiberG).toBe(Math.round((goal.kcal / 1000) * 14));
  });
});

describe('formatting', () => {
  it('groups calories and drops decimals', () => {
    expect(kcal(2100.4)).toBe('2,100');
  });

  it('keeps one decimal on small gram amounts only', () => {
    expect(grams(9.44)).toBe('9.4');
    expect(grams(217.3)).toBe('217');
  });

  it('renders unknown as an em dash, never zero', () => {
    expect(gramsOrDash(null)).toBe(DASH);
    expect(gramsOrDash(0)).toBe('0');
  });
});

/**
 * The cap the resolver applies, applied at the field instead — so an over-long
 * sentence is shortened while it is being written rather than refused after the
 * button, which costs a round trip to say something unactionable.
 */
describe('capPhrase', () => {
  it('leaves a sentence inside the cap exactly as it was', () => {
    expect(capPhrase('two rotis and dal', 500)).toBe('two rotis and dal');
    expect(capPhrase('', 500)).toBe('');
  });

  // What is left goes to a model. A sentence ending mid-word invites it to
  // guess at a food nobody said.
  it('cuts at a word boundary, not mid-word', () => {
    expect(capPhrase('two rotis and a bowl of rice', 20)).toBe('two rotis and a bowl');
  });

  it('leaves no trailing space where the cut was', () => {
    expect(capPhrase('rice and dal', 5)).toBe('rice');
  });

  it('falls back to a hard cut when there is no boundary to cut at', () => {
    expect(capPhrase('a'.repeat(40), 10)).toBe('a'.repeat(10));
  });

  // The boundary search finds index 0 here, and cutting there would return an
  // empty string — the field blanking itself for no reason the user can see.
  // Hence `cut > 0` rather than `>= 0`.
  it('does not empty a phrase whose only space is at the front', () => {
    expect(capPhrase(' ' + 'a'.repeat(40), 10)).toHaveLength(10);
  });
});
