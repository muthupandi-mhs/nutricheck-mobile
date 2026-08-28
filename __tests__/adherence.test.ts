import { adherenceOf, bandOf } from '../src/screens/calendar/adherence';
import type { DayPoint } from '../src/api/types';

/**
 * The calendar's colour rule.
 *
 * Worth its own test because it is the one place the app deliberately departs
 * from the convention it was modelled on. The reference calendar scores
 * COMPLETION — more is greener — and this scores CLOSENESS, so that a day well
 * over target cannot come out looking like a good one. That inversion is easy
 * to "fix" back into a bug, and these cases are what would catch it.
 */

const day = (kcal: number, logged = true): DayPoint => ({
  date: '2026-08-14',
  kcal,
  proteinG: 90,
  carbsG: 180,
  fatG: 60,
  fiberG: 20,
  logged,
});

const TARGET = 2000;

describe('scoring a day against its calorie target', () => {
  it('scores a day on target at 1', () => {
    expect(adherenceOf(day(2000), TARGET)).toBe(1);
  });

  it('scores overshooting and undershooting by the same amount identically', () => {
    // The whole point. 1,600 and 2,400 are each 400 off, and neither is the
    // day the person was aiming for.
    expect(adherenceOf(day(1600), TARGET)).toBeCloseTo(0.8);
    expect(adherenceOf(day(2400), TARGET)).toBeCloseTo(0.8);
  });

  it('does NOT reward eating more, which is the convention it departs from', () => {
    const onTarget = adherenceOf(day(2000), TARGET)!;
    const wayOver = adherenceOf(day(3000), TARGET)!;

    expect(wayOver).toBeLessThan(onTarget);
    // A completion score would put 3,000 against 2,000 at 150% and paint it
    // the best day of the month.
    expect(bandOf(wayOver)).toBe('off');
  });

  it('floors at zero rather than going negative on a huge overshoot', () => {
    expect(adherenceOf(day(6000), TARGET)).toBe(0);
  });

  it('returns null for a day with nothing logged, never zero', () => {
    // A day you did not track is not a day you ate nothing. Scoring it zero
    // would paint an untracked day the same red as a badly blown one.
    expect(adherenceOf(day(0, false), TARGET)).toBeNull();
  });

  it('returns null when no target is set, rather than dividing by zero', () => {
    expect(adherenceOf(day(1800), 0)).toBeNull();
  });
});

describe('banding a score', () => {
  it('puts a day within 15% of target on target', () => {
    expect(bandOf(adherenceOf(day(1800), TARGET))).toBe('on');
    expect(bandOf(adherenceOf(day(2200), TARGET))).toBe('on');
  });

  it('puts a day 15 to 40 percent out in the middle band', () => {
    expect(bandOf(adherenceOf(day(1400), TARGET))).toBe('near');
    expect(bandOf(adherenceOf(day(2600), TARGET))).toBe('near');
  });

  it('puts anything further out in the last band', () => {
    expect(bandOf(adherenceOf(day(900), TARGET))).toBe('off');
  });

  it('gives an unlogged day no band at all', () => {
    expect(bandOf(null)).toBe('none');
  });
});
