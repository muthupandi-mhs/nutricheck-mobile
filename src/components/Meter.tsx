import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { clamp01, grams, plural } from '../lib/format';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from './Icon';
import { Row, Split, Stack } from './Layout';
import { Txt } from './Text';

/**
 * A protein or fibre meter.
 *
 * `unmeasured` is why this is not four lines long: a food whose source carries
 * no fibre figure is excluded from the numerator *and* the exclusion is stated
 * underneath. Counting unknown as zero under-reports the day undetectably.
 */
export function Meter({
  label,
  value,
  target,
  unit = 'g',
  unmeasured = 0,
  compact,
}: {
  label: string;
  value: number;
  target: number;
  unit?: string;
  unmeasured?: number;
  /** Drops the note and tightens the type, for side-by-side stat cards. */
  compact?: boolean;
}) {
  const { c, radius, space } = useTheme();
  const pct = target > 0 ? clamp01(value / target) : 0;
  const over = target > 0 && value > target;

  const width = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(width, { toValue: pct, damping: 26, stiffness: 110, mass: 1, useNativeDriver: false }).start();
  }, [pct, width]);

  return (
    <Stack
      gap={compact ? 8 : 9}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${label}: ${grams(value)} of ${target} ${unit}${
        unmeasured > 0 ? `, ${plural(unmeasured, 'item')} unmeasured` : ''
      }`}>
      <Split align="baseline">
        <Txt role="labelSm" tone="secondary">
          {label}
        </Txt>
        <Row gap={2} align="baseline">
          <Txt role="labelSm" numeric>
            {grams(value)}
          </Txt>
          <Txt role="caption" tone="tertiary" numeric>
            / {target} {unit}
          </Txt>
        </Row>
      </Split>

      <View style={{ height: 8, borderRadius: radius.pill, backgroundColor: c.sunken, overflow: 'hidden' }}>
        <Animated.View
          style={{
            height: 8,
            borderRadius: radius.pill,
            backgroundColor: over ? c.attention : c.primary,
            width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          }}
        />
      </View>

      {!compact && unmeasured > 0 && (
        <Row gap={6} style={{ marginTop: -space.xs / 2 }}>
          <Icon name="info" size={13} color={c.attention} weight={2} />
          <Txt role="caption" tone="attention">
            {plural(unmeasured, 'item')} unmeasured
          </Txt>
        </Row>
      )}
    </Stack>
  );
}
