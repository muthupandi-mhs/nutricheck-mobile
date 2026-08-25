import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Hairline } from './Layout';

/**
 * Skeleton rows.
 *
 * There is no spinner anywhere in this app. The composer waits about two
 * seconds on the resolver, and two seconds of a blank sheet feels materially
 * longer than two seconds of a sheet that is visibly filling in — so the sheet
 * opens immediately on these and swaps them for real rows as results land.
 *
 * The pulse is suppressed under Reduce Motion; the shapes stay, at a fixed
 * opacity, because they are still the layout, not decoration.
 */
export function Shimmer({
  width,
  height,
  delay = 0,
}: {
  width: number | string;
  height: number;
  delay?: number;
}) {
  const { c } = useTheme();
  const pulse = useRef(new Animated.Value(0.38)).current;
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then(v => !cancelled && setReduced(v));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(pulse, { toValue: 0.85, duration: 675, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.38, duration: 675, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
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
        backgroundColor: c.surface2,
        opacity: reduced ? 0.6 : pulse,
      }}
    />
  );
}

/** One placeholder line of the confirm sheet: name, portion, calories. */
export function SkeletonItemRow({ index = 0, widths }: { index?: number; widths?: [string, string] }) {
  const [w1, w2] = widths ?? (['58%', '34%'] as [string, string]);
  const delay = index * 180;
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 17 }}>
        <View style={{ flexGrow: 1, gap: 8 }}>
          <Shimmer width={w1} height={15} delay={delay} />
          <Shimmer width={w2} height={11} delay={delay + 180} />
        </View>
        <Shimmer width={40} height={15} delay={delay} />
      </View>
      <Hairline />
    </View>
  );
}
