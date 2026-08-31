import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Icon } from '../../components/Icon';
import { Gap, Row } from '../../components/Layout';
import { Press } from '../../components/Press';
import { Txt } from '../../components/Text';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * Gradient ids resolve by name, and three of these are on screen at once, so
 * each instance gets its own. Not `useId`, whose colons are invalid in a
 * `url(#…)` reference.
 */
let instances = 0;

/**
 * One dial: a ring, a figure inside it, and a label under it.
 *
 * Three of these across the top of Today, in the shape the reference uses —
 * equal circles, equal weight, each one a whole measure rather than a slice of
 * a bigger one. The single large ring said one thing very loudly; a row of
 * three says what the day actually consists of, and lets two of them be about
 * something other than calories.
 *
 * `progress` of null draws the track and nothing else, and the value shows
 * whatever the caller passes for "we do not know" — an em dash, never a zero.
 * A dial with no data must not look like a dial reading nought: the difference
 * between "you have not weighed yourself" and "you weigh nothing" is the whole
 * credibility of the screen.
 */
export function Dial({
  size,
  progress,
  value,
  unit,
  label,
  over,
  onPress,
  accessibilityLabel,
}: {
  size: number;
  /** 0–1, or null when there is nothing to draw. Over 1 is clamped by the caller. */
  progress: number | null;
  /** Pre-formatted. This draws numbers; it does not decide what they say. */
  value: string;
  unit?: string;
  label: string;
  /** Past the target: the arc completes and turns amber, as the old ring did. */
  over?: boolean;
  onPress?: () => void;
  accessibilityLabel: string;
}) {
  const { c, space } = useTheme();

  const id = React.useRef<string | null>(null);
  if (id.current === null) id.current = `dial${(instances += 1)}`;

  const stroke = Math.max(5, Math.round(size * 0.05));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = progress === null ? 0 : Math.max(0, Math.min(progress, 1));

  return (
    <Press
      onPress={onPress}
      disabled={!onPress}
      feedback={onPress ? 'scale' : 'none'}
      haptic={onPress ? 'select' : null}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={accessibilityLabel}
      style={{ alignItems: 'center', flexGrow: 1, flexBasis: 0 }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg
          width={size}
          height={size}
          style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
          <Defs>
            <LinearGradient id={id.current} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={over ? c.attention : c.ringFrom} />
              <Stop offset="1" stopColor={over ? c.attention : c.ringTo} />
            </LinearGradient>
          </Defs>

          <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c.sunken} strokeWidth={stroke} />

          {progress === null ? null : (
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={`url(#${id.current})`}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - filled)}
            />
          )}
        </Svg>

        <Row gap={2} align="baseline">
          <Txt
            role="h2"
            numeric
            tone={progress === null ? 'tertiary' : over ? 'attention' : 'ink'}
            style={{ fontSize: Math.round(size * 0.23), lineHeight: Math.round(size * 0.28) }}>
            {value}
          </Txt>
          {unit ? (
            <Txt role="caption" tone="tertiary">
              {unit}
            </Txt>
          ) : null}
        </Row>
      </View>

      <Gap h={space.sm} />

      {/* Label and chevron, as in the reference — the chevron is what says the
          dial is a door, and it is omitted when the dial does not open. */}
      <Row gap={3} align="center">
        <Txt role="caption" tone="secondary" caps style={{ letterSpacing: 1.2 }}>
          {label}
        </Txt>
        {onPress ? <Icon name="chevronRight" size={12} color={c.inkTertiary} weight={2.2} /> : null}
      </Row>
    </Press>
  );
}
