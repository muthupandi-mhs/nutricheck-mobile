import React from 'react';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Line,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import type { WeightPoint } from '../../api/types';
import { useTheme } from '../../theme/ThemeProvider';
import { dayMonth, parseLocalDate } from '../../lib/format';

/**
 * Weight over time: a line, not bars.
 *
 * Bars are for quantities that start at zero and could have been any size —
 * calories in a day. Weight is a level, it never approaches zero, and the only
 * thing anybody reads off it is the shape of the change. A bar chart of body
 * weight is eight columns of nearly equal height with the entire story
 * compressed into their top 3%.
 *
 * Which is why the y-axis is NOT zero-based. It fits the data and then pads,
 * because a scale from 0 to 80 kg draws a two-kilo loss as a flat line, and a
 * flat line is a false statement about somebody's month.
 *
 * The padding is the other half of that: a minimum span (`MIN_SPAN_KG`) stops
 * the scale collapsing onto noise. Without it, three readings inside 200 g fill
 * the frame with a mountain range, and the chart converts a rounding error
 * into a dramatic trend.
 */

/** The smallest range the axis will show. Below this, the wobble IS the noise. */
const MIN_SPAN_KG = 2;

export function WeightChart({
  points,
  height = 168,
}: {
  points: WeightPoint[];
  height?: number;
}) {
  const { c } = useTheme();

  const width = 340;
  const padLeft = 34;
  const padRight = 8;
  const plotTop = 12;
  const axisY = height - 20;

  const values = points.map(p => p.weightKg);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const mid = (lo + hi) / 2;
  const span = Math.max(hi - lo, MIN_SPAN_KG);
  // An eighth of the span in headroom top and bottom, so the extremes are
  // points on a chart rather than marks jammed against its edges.
  const top = mid + span * 0.625;
  const bottom = mid - span * 0.625;

  const days = dayIndex(points);
  const lastDay = days[days.length - 1] || 1;

  const x = (i: number) => padLeft + (days[i]! / lastDay) * (width - padLeft - padRight);
  const y = (v: number) => axisY - ((v - bottom) / (top - bottom)) * (axisY - plotTop);

  /**
   * A single reading is drawn as a dot, not a line to nowhere.
   *
   * `points.length === 1` reaches here from a real state — the day after
   * onboarding, when the profile's weight is the only reading there is — and a
   * one-element path renders as nothing at all, which reads as a broken chart
   * rather than as "one reading".
   */
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)} ${y(p.weightKg)}`).join(' ');
  const area = `${line} L${x(points.length - 1)} ${axisY} L${x(0)} ${axisY} Z`;

  const last = points.length - 1;

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <LinearGradient id="weight-fill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c.primary} stopOpacity="0.22" />
          <Stop offset="1" stopColor={c.primary} stopOpacity="0" />
        </LinearGradient>
      </Defs>

      {/* Two gridlines and their labels, at the top and bottom of the fitted
          range. Not a full grid: the axis is unlabelled-by-default territory
          for most charts here, but a weight axis that does not say where it
          starts is a shape with no scale, and the whole reason this axis is
          not zero-based is that the numbers have to be read off it. */}
      {[top, bottom].map(v => (
        <React.Fragment key={v}>
          <Line
            x1={padLeft}
            y1={y(v)}
            x2={width - padRight}
            y2={y(v)}
            stroke={c.border}
            strokeWidth={1}
          />
          <SvgText x={0} y={y(v) + 4} fontSize={10} fill={c.inkTertiary}>
            {v.toFixed(1)}
          </SvgText>
        </React.Fragment>
      ))}

      {points.length > 1 ? <Path d={area} fill="url(#weight-fill)" /> : null}
      {points.length > 1 ? (
        <Path
          d={line}
          fill="none"
          stroke={c.primary}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ) : null}

      {/* Every reading gets a dot when they are sparse enough to tell apart.
          Past that they become a texture that hides the line they belong to,
          so only the newest one is marked — which is the one the eye is
          looking for anyway. */}
      {points.map((p, i) =>
        points.length <= 14 || i === last ? (
          <Circle
            key={p.date}
            cx={x(i)}
            cy={y(p.weightKg)}
            r={i === last ? 4.5 : 2.5}
            fill={i === last ? c.primary : c.canvas}
            stroke={c.primary}
            strokeWidth={i === last ? 0 : 1.5}
          />
        ) : null,
      )}

      <SvgText x={padLeft} y={height - 4} fontSize={10} fill={c.inkTertiary}>
        {shortDate(points[0]!.date)}
      </SvgText>
      {points.length > 1 ? (
        <SvgText
          x={width - padRight}
          y={height - 4}
          fontSize={10}
          fill={c.inkTertiary}
          textAnchor="end">
          {shortDate(points[last]!.date)}
        </SvgText>
      ) : null}
    </Svg>
  );
}

/**
 * Days elapsed from the first reading, per point — the x positions.
 *
 * Elapsed time, not array index. Weighing daily for a week and weighing weekly
 * for two months produce the same number of points, and spacing them evenly
 * would draw those two very different months as the same picture. It also
 * matches how the server fits the trend, so the line and the figure printed
 * beside it describe the same thing.
 */
function dayIndex(points: WeightPoint[]): number[] {
  const first = Date.parse(points[0]!.date);
  return points.map(p => Math.round((Date.parse(p.date) - first) / 86_400_000));
}

const shortDate = (date: string): string => dayMonth(parseLocalDate(date));
