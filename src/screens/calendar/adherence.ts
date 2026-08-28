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
const ON_TARGET = 0.85;
const NEAR_TARGET = 0.6;

export function bandOf(score: number | null): Band {
  if (score === null) return 'none';
  if (score >= ON_TARGET) return 'on';
  if (score >= NEAR_TARGET) return 'near';
  return 'off';
}

/**
 * What each band means in words, for the legend.
 *
 * Written as distance from the target rather than as a percentage, because the
 * percentage is of a quantity nobody is holding in their head. "Within 15% of
 * target" is checkable; "> 66%" is a number about a number.
 */
export const BAND_LABEL: Record<Exclude<Band, 'none'>, string> = {
  on: 'On target',
  near: 'Close',
  off: 'Well off',
};
