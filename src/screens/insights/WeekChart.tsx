import React from 'react';
import { View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';
import { Row, SplitRow } from '../../components/Layout';
import { Eyebrow, Num } from '../../components/Type';
import { dayInitial, parseLocalDate } from '../../lib/format';

export type Bar = { date: string; value: number; logged: boolean };

/**
 * A seven-bar column chart with the target drawn as a dashed rule.
 *
 * The scale is anchored to the target, not to the tallest bar. A chart that
 * rescales to its own maximum makes a 1,400 kcal day and a 2,400 kcal day look
 * identical, which is exactly the comparison the user came here to make.
 *
 * Bars are square-cornered and flat-filled; today is at full strength and the
 * rest at 40%, so "where am I now" is legible without a legend — though there
 * is one anyway, because a colour-only distinction is not one for everybody.
 */
export function WeekChart({
  label,
  target,
  targetLabel,
  bars,
  height = 60,
}: {
  label: string;
  target: number;
  targetLabel: string;
  bars: Bar[];
  height?: number;
}) {
  const { c } = useTheme();

  const width = 350;
  const slot = width / bars.length;
  const barWidth = slot - 6;
  const axisY = height - 16;
  const plotTop = 3;

  // Headroom above the target line so an over-target day is visibly over.
  const ceiling = Math.max(target * 1.15, ...bars.map(b => b.value)) || 1;
  const scaleY = (v: number) => axisY - (v / ceiling) * (axisY - plotTop);

  return (
    <View style={{ paddingTop: 12 }}>
      <SplitRow align="baseline" style={{ paddingBottom: 7 }}>
        <Eyebrow size={10.5} tone="ink2">
          {label}
        </Eyebrow>
        <Num size={11} tone="ink3">
          {targetLabel}
        </Num>
      </SplitRow>

      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {bars.map((b, i) => {
          const x = i * slot + 3;
          const y = scaleY(b.value);
          const isToday = i === bars.length - 1;
          if (!b.logged) {
            // A day with nothing logged is not a zero-calorie day. Drawing it as
            // a full-height empty slot says "no data" without implying a fast.
            return (
              <Rect
                key={b.date}
                x={x}
                y={axisY - 6}
                width={barWidth}
                height={6}
                fill={c.rule}
              />
            );
          }
          return (
            <Rect
              key={b.date}
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(axisY - y, 1)}
              fill={c.det}
              opacity={isToday ? 1 : 0.4}
            />
          );
        })}

        <Line x1={0} y1={scaleY(target)} x2={width} y2={scaleY(target)} stroke={c.ink3} strokeWidth={1.5} strokeDasharray="4 3" />
        <Line x1={0} y1={axisY} x2={width} y2={axisY} stroke={c.rule} strokeWidth={1.5} />

        {bars.map((b, i) => {
          const isToday = i === bars.length - 1;
          return (
            <SvgText
              key={`t-${b.date}`}
              x={i * slot + slot / 2}
              y={height - 4}
              textAnchor="middle"
              fontSize={9.5}
              fill={isToday ? c.ink : c.ink3}>
              {dayInitial(parseLocalDate(b.date))}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

/** The legend. Three marks, stated once, above all three charts. */
export function ChartLegend() {
  const { c } = useTheme();
  return (
    <Row gap={14} style={{ paddingVertical: 11 }}>
      <Row gap={6}>
        <View style={{ width: 10, height: 10, backgroundColor: c.det }} />
        <Num size={10} tone="ink2">
          Today
        </Num>
      </Row>
      <Row gap={6}>
        <View style={{ width: 10, height: 10, backgroundColor: c.det, opacity: 0.4 }} />
        <Num size={10} tone="ink2">
          Earlier
        </Num>
      </Row>
      <Row gap={6}>
        <View style={{ width: 14, height: 0, borderTopWidth: 2, borderStyle: 'dashed', borderColor: c.ink3 }} />
        <Num size={10} tone="ink2">
          Target
        </Num>
      </Row>
    </Row>
  );
}
