import type { DayPoint } from '../../api/types';

/**
 * How well one day matched its calorie target.
 *
 * **This is closeness, not completion, and the difference is the whole point.**
 * The obvious reading of a coloured calendar — the one the reference app uses —
 * is "how much of your goal did you complete", so more is greener. That is
 * right for a step count and wrong for a calorie target in an app where most
 * people are trying to lose weight: eating 3,000 against a 2,000 target would
 * come out bright green, and the day somebody most overshot would look like
 * their best one.
 *
 * So the score is symmetric. A day is good when it lands NEAR the target from
 * either side, and both 1,000 and 3,000 against a 2,000 target score zero.
 *
 * The trade is that undershooting reads as badly as overshooting, which is
 * arguably harsh — 1,800 against 2,000 is not a bad day. The tolerance bands
 * are wide enough to absorb that: 1,800 scores 0.9 and stays green.
 */

/** Calories eaten as a share of target, folded so either direction costs. */
export function adherenceOf(day: DayPoint, targetKcal: number): number | null {
  if (!day.logged) return null;
  if (targetKcal <= 0) return null;

  const off = Math.abs(day.kcal - targetKcal) / targetKcal;
  return Math.max(0, 1 - off);
}

export type Band = 'on' | 'near' | 'off' | 'none';

/**
 * Three bands, and the thresholds are deliberately generous.
 *
 * A person eating to a target hits it within 15% on a good day and within 40%
 * on an ordinary one. Tighter bands would paint a mostly-red calendar for
 * somebody doing fine, which teaches them to stop opening the screen.
 */
export const ON_TARGET = 0.85;
export const NEAR_TARGET = 0.6;

export function bandOf(score: number | null): Band {
  if (score === null) return 'none';
  if (score >= ON_TARGET) return 'on';
  if (score >= NEAR_TARGET) return 'near';
  return 'off';
}

/**
 * What each band means in words, for the legend.
 */
export const BAND_LABEL: Record<Exclude<Band, 'none'>, string> = {
  on: 'On target',
  near: 'Close',
  off: 'Well off',
};

/**
 * The same three bands as percentages, DERIVED from the thresholds above.
 *
 * Written out because a legend of three coloured words leaves the reader
 * guessing where one band ends and the next begins, and the guess is usually
 * "green must be most of the way there" — which is the reading this scale
 * specifically does not have.
 *
 * Said as distance FROM the target, not as a share of it. The reference this
 * comes from grades completion, so its ">66%" means "you got two thirds of the
 * way"; here 66% of a 2,000 target is 1,320 kcal, which is a day well under,
 * and printing ">66%" next to a green dot would be telling somebody their worst
 * undershoot was their best day. "Within 15%" is a distance anybody can check
 * against a number they can see.
 *
 * Computed rather than typed, so moving a threshold cannot leave the legend
 * quietly describing the old one — which is the only way a key like this ever
 * goes wrong.
 */
export const BAND_RANGE: Record<Exclude<Band, 'none'>, string> = {
  on: `within ${pct(1 - ON_TARGET)}`,
  near: `${pct(1 - ON_TARGET)}–${pct(1 - NEAR_TARGET)} off`,
  off: `over ${pct(1 - NEAR_TARGET)} off`,
};

function pct(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}
