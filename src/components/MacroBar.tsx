import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { clamp01, grams, plural } from '../lib/format';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from './Icon';
import { Row, SplitRow } from './Layout';
import { Mono, Num } from './Type';

/**
 * A protein or fiber bar.
 *
 * `unmeasuredItems` is the whole reason this component is not four lines long.
 * When a food's source carries no fiber figure, that food is excluded from the
 * numerator *and* said out loud underneath — because the alternative, counting
 * unknown as zero, under-reports every such day invisibly and the user has no
 * way to discover it. Zero is a claim; unknown is the truth.
 */
export function MacroBar({
  label,
  value,
  target,
  unmeasuredItems = 0,
  unit = 'g',
}: {
  label: string;
  value: number;
  target: number;
  unmeasuredItems?: number;
  unit?: string;
}) {
  const { c, type } = useTheme();
  const pct = target > 0 ? clamp01(value / target) : 0;
  const over = target > 0 && value > target;

  const width = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(width, {
      toValue: pct,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct, width]);

  return (
    <View
      style={{ gap: 5 }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${label}: ${grams(value)} of ${target} ${unit}${
        unmeasuredItems > 0 ? `, ${plural(unmeasuredItems, 'item')} unmeasured` : ''
      }`}>
      <SplitRow align="baseline">
        <Mono size={10} tone="ink2" style={type.eyebrow(10)}>
          {label}
        </Mono>
        <Num size={12}>
          {grams(value)}
          <Num size={12} tone="ink3">{`/${target} ${unit}`}</Num>
        </Num>
      </SplitRow>

      <View style={{ height: 7, backgroundColor: c.rule }}>
        <Animated.View
          style={{
            height: 7,
            backgroundColor: over ? c.est : c.det,
            width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          }}
        />
      </View>

      {unmeasuredItems > 0 && (
        <Row gap={5}>
          <Icon name="info" size={11} color={c.est} weight={2.2} />
          <Mono size={9.5} tone="est">
            {plural(unmeasuredItems, 'item')} unmeasured
          </Mono>
        </Row>
      )}
    </View>
  );
}
