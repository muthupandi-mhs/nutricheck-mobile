import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Row, Stack } from './Layout';

/**
 * Skeletons. There is no spinner anywhere in this app — the confirm sheet opens
 * on these and swaps in real rows as the resolve lands.
 *
 * Reduce Motion suppresses the pulse but keeps the shapes: they are the layout,
 * not decoration.
 */
export function Shimmer({
  width,
  height,
  radius: r,
  delay = 0,
}: {
  width: number | string;
  height: number;
  radius?: number;
  delay?: number;
}) {
  const { c, radius } = useTheme();
  const pulse = useRef(new Animated.Value(0.45)).current;
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(v => alive && setReduced(v));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [delay, pulse, reduced]);

  return (
    <Animated.View
      style={{
        width: width as number,
        height,
        borderRadius: r ?? radius.sm,
        backgroundColor: c.sunken,
        opacity: reduced ? 0.7 : pulse,
      }}
    />
  );
}

/** A placeholder food row: glyph, two lines, a trailing number. */
export function SkeletonRow({ index = 0, widths }: { index?: number; widths?: [string, string] }) {
  const { space, radius } = useTheme();
  const [w1, w2] = widths ?? (['62%', '38%'] as [string, string]);
  const delay = index * 140;

  return (
    <Row gap={space.md} style={{ paddingVertical: space.md }}>
      <Shimmer width={44} height={44} radius={radius.md} delay={delay} />
      <Stack gap={8} style={{ flexGrow: 1 }}>
        <Shimmer width={w1} height={14} delay={delay} />
        <Shimmer width={w2} height={11} delay={delay + 120} />
      </Stack>
      <Shimmer width={40} height={14} delay={delay} />
    </Row>
  );
}

/** A placeholder card, for the home hero before the day arrives. */
export function SkeletonCard({ height = 180 }: { height?: number }) {
  const { radius, space } = useTheme();
  return (
    <View style={{ paddingHorizontal: space.gutter }}>
      <Shimmer width="100%" height={height} radius={radius.lg} />
    </View>
  );
}
