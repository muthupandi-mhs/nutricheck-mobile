import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { clamp01 } from '../../lib/format';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * The fasting clock: one arc, and whatever the screen puts inside it.
 *
 * Two things separate this from `Ring`, and both are about what the arc is
 * drawing rather than about looks.
 *
 * **It does not animate.** `Ring` springs to each new value, which is right for
 * a figure that jumps when a meal is logged — a calorie total moves in steps of
 * three hundred and the travel is what makes the step legible. This one is
 * redrawn every second by a clock, and a spring on a value that has moved
 * 0.017% would be permanently mid-flight and permanently behind. Set directly,
 * a one-second tick reads as a smooth sweep on its own.
 *
 * **Past the target it completes and stops, and it does NOT turn amber.** The
 * calorie ring goes amber over its target because being over is the thing
 * worth flagging. Here the opposite is true: passing sixteen hours is the point
 * of the exercise, and amber in this app means one thing — a number the app
 * cannot vouch for. Spending it to congratulate somebody would be spending the
 * signal that protects every unmeasured figure elsewhere. Overshoot is said in
 * words under the clock instead.
 */
export function FastingRing({
  progress,
  size = 224,
  children,
}: {
  /** 0–1. Null draws the track alone — nobody is fasting, and an empty arc is not zero progress. */
  progress: number | null;
  size?: number;
  children?: React.ReactNode;
}) {
  const { c } = useTheme();

  /**
   * Thicker than the Home dials at 7%, thinner than the old calorie ring.
   *
   * This is the only ring on its screen and it is the screen's subject, so it
   * carries more weight than one of three across a row — but the figure inside
   * it is a running clock in eight characters, and a heavier arc starts
   * crowding the one thing anybody is looking at.
   */
  const stroke = Math.max(6, Math.round(size * 0.07));
  const r = (size - stroke) / 2 - 2;
  const circumference = 2 * Math.PI * r;
  const filled = progress === null ? 0 : clamp01(progress);

  /**
   * Whether there is enough arc to be an arc.
   *
   * Below one stroke width there is nothing to draw but the two round caps,
   * which meet and paint a bead at twelve o'clock — and a bead sitting on an
   * otherwise empty ring reads as a defect, not as two seconds of progress.
   * This was `filled === 0`, which is the only value that case never takes: a
   * fast two seconds into sixteen hours is 0.00003, not zero.
   *
   * The threshold is the stroke rather than a percentage because that is what
   * the problem actually is — a cap is half a stroke wide at each end, so an
   * arc shorter than one stroke is entirely caps. At this size it clears in
   * about ten minutes of a sixteen-hour fast, which is also about when
   * somebody would first believe the ring had moved.
   */
  const drawable = progress !== null && filled * circumference >= stroke;

  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg
        width={size}
        height={size}
        /* A quarter turn anticlockwise, so the arc starts at twelve o'clock
           rather than at three. Every other ring in this app does the same,
           and on a clock face in particular the top is where a reader assumes
           time begins. */
        style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <LinearGradient id="fastRing" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={c.ringFrom} />
            <Stop offset="1" stopColor={c.ringTo} />
          </LinearGradient>
        </Defs>

        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={c.sunken}
          strokeWidth={stroke}
        />

        {/* Absent, not zero-length, when there is not yet enough to draw —
            see `drawable`. A round cap on a hairline dash paints a bead at
            twelve o'clock, and a bead on an empty ring reads as a defect. */}
        {!drawable ? null : (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="url(#fastRing)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - filled)}
          />
        )}
      </Svg>

      {/* The clock and its captions. Hidden from assistive tech, which is given
          one sentence by the caller instead of six fragments read in the order
          they happen to be laid out. */}
      <View
        style={{ alignItems: 'center', paddingHorizontal: stroke + 8 }}
        accessibilityElementsHidden
        importantForAccessibility="no">
        {children}
      </View>
    </View>
  );
}
