import React from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Line, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { Row, Split, Stack } from '../../components/Layout';
import { Txt } from '../../components/Text';
import { dayInitial, parseLocalDate } from '../../lib/format';
import { useTheme } from '../../theme/ThemeProvider';

export type Bar = { date: string; value: number; logged: boolean };

/**
 * A seven-bar column chart with the target as a dashed rule.
 *
 * The scale is anchored to the target, not the tallest bar — rescaling to its
 * own maximum makes a 1,400 and a 2,400 kcal day look identical.
 *
 * An unlogged day is drawn as a stub, not a zero-height bar: nobody ate zero
 * calories, and rendering those the same turns a data gap into a claim.
 */
export function WeekChart({
  label,
  target,
  targetLabel,
  bars,
  height = 128,
}: {
  label: string;
  target: number;
  targetLabel: string;
  bars: Bar[];
  height?: number;
}) {
  const { c, radius } = useTheme();

  const width = 340;
  const slot = width / bars.length;
  const barWidth = Math.min(slot - 12, 30);
  const axisY = height - 22;
  const plotTop = 8;

  // Headroom above the target line so an over-target day reads as over.
  const ceiling = Math.max(target * 1.18, ...bars.map(b => b.value)) || 1;
  const y = (v: number) => axisY - (v / ceiling) * (axisY - plotTop);

  return (
    <Stack gap={10}>
      <Split align="baseline">
        <Txt role="labelSm" tone="secondary">
          {label}
        </Txt>
        <Txt role="caption" tone="tertiary" numeric>
          {targetLabel}
        </Txt>
      </Split>

      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id={`bar-${label}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.ringFrom} />
            <Stop offset="1" stopColor={c.ringTo} />
          </LinearGradient>
        </Defs>

        {bars.map((b, i) => {
          const x = i * slot + (slot - barWidth) / 2;
          const isToday = i === bars.length - 1;

          if (!b.logged) {
            return <Rect key={b.date} x={x} y={axisY - 5} width={barWidth} height={5} rx={2.5} fill={c.border} />;
          }

          const top = y(b.value);
          return (
            <Rect
              key={b.date}
              x={x}
              y={top}
              width={barWidth}
              height={Math.max(axisY - top, 3)}
              rx={radius.xs}
              fill={isToday ? `url(#bar-${label})` : c.primary}
              opacity={isToday ? 1 : 0.28}
            />
          );
        })}

        <Line x1={0} y1={y(target)} x2={width} y2={y(target)} stroke={c.inkTertiary} strokeWidth={1.5} strokeDasharray="5 4" />
        <Line x1={0} y1={axisY} x2={width} y2={axisY} stroke={c.border} strokeWidth={1.5} />

        {bars.map((b, i) => {
          const isToday = i === bars.length - 1;
          return (
            <SvgText
              key={`t-${b.date}`}
              x={i * slot + slot / 2}
              y={height - 5}
              textAnchor="middle"
              fontSize={11}
              fontWeight={isToday ? '700' : '400'}
              fill={isToday ? c.ink : c.inkTertiary}>
              {dayInitial(parseLocalDate(b.date))}
            </SvgText>
          );
        })}
      </Svg>
    </Stack>
  );
}

/** The legend. Three marks, stated once, above all three charts. */
export function ChartLegend() {
  const { c, space } = useTheme();
  return (
    <Row gap={space.lg}>
      <Row gap={6}>
        <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c.primary }} />
        <Txt role="caption" tone="secondary">
          Today
        </Txt>
      </Row>
      <Row gap={6}>
        <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c.primary, opacity: 0.28 }} />
        <Txt role="caption" tone="secondary">
          Earlier
        </Txt>
      </Row>
      <Row gap={6}>
        <View style={{ width: 14, borderTopWidth: 2, borderStyle: 'dashed', borderColor: c.inkTertiary }} />
        <Txt role="caption" tone="secondary">
          Target
        </Txt>
      </Row>
    </Row>
  );
}
