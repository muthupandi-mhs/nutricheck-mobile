import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Icon } from '../../components/Icon';
import { Gap } from '../../components/Layout';
import { Txt } from '../../components/Text';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * SVG gradient ids are resolved by name, and two of these are mounted at once
 * during a stack transition — Welcome sliding out as Sign in slides in. A fixed
 * id makes that a collision; a per-instance one cannot collide. Not `useId`,
 * whose output contains colons that are not valid in a `url(#…)` reference.
 */
let instances = 0;

/**
 * The brand zone shared by Welcome, Sign in and Sign up.
 *
 * It exists as a component rather than three copies so the three screens cannot
 * drift apart — the halo geometry, the ring opacities and the mark's corner
 * radius are decided once. Everything scales off `markSize`, so the auth
 * screens get the same composition at a smaller size instead of a different one.
 *
 * `flex: 1` with a low `minHeight` is deliberate: the field is the part that
 * gives way when a keyboard opens, so the fields below it stay reachable.
 */
export function BrandField({
  markSize = 76,
  wordmark = true,
  minHeight = 260,
  collapsed = false,
  style,
}: {
  markSize?: number;
  wordmark?: boolean;
  minHeight?: number;
  /**
   * Hides the contents without unmounting. Collapsing the height alone leaves a
   * 320pt ring set overflowing a zero-height box; unmounting instead would
   * replay the entrance animation every time the keyboard closes.
   */
  collapsed?: boolean;
  style?: ViewStyle;
}) {
  const { c, space, radius, elevation } = useTheme();
  const insets = useSafeAreaInsets();

  // Assigned once, lazily. `useRef(expr)` evaluates `expr` on every render, so
  // incrementing inside the call would advance the counter forever.
  const halo = useRef<string | null>(null);
  if (halo.current === null) halo.current = `halo${(instances += 1)}`;
  const haloId = halo.current;

  const enter = useRef(new Animated.Value(0)).current;
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(v => alive && setReduced(v));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (reduced) {
      enter.setValue(1);
      return;
    }
    const anim = Animated.timing(enter, {
      toValue: 1,
      duration: 780,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [enter, reduced]);

  const fade = (from: number, to: number) =>
    enter.interpolate({ inputRange: [from, to], outputRange: [0, 1], extrapolate: 'clamp' });

  // The ring set is sized off the mark so the proportions survive any scale.
  const box = Math.round(markSize * 4.2);
  const radii = [0.475, 0.3625, 0.25].map(f => box * f);

  return (
    <View
      style={[
        {
          flex: 1,
          minHeight,
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: collapsed ? 0 : insets.top,
          overflow: 'hidden',
        },
        collapsed && { display: 'none' },
        style,
      ]}>
      {/* A halo centred on the mark, not a top-to-bottom wash. A linear one
          piles its tint against the sheet's top edge, which reads as a light
          leak and muddies the boundary the sheet depends on. */}
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id={haloId} cx="50%" cy="46%" r="62%">
            <Stop offset="0" stopColor={c.primary} stopOpacity={0.2} />
            <Stop offset="0.55" stopColor={c.primary} stopOpacity={0.06} />
            <Stop offset="1" stopColor={c.primary} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${haloId})`} />
      </Svg>

      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          opacity: fade(0, 0.7),
          transform: [
            { scale: enter.interpolate({ inputRange: [0, 0.7], outputRange: [0.88, 1], extrapolate: 'clamp' }) },
          ],
        }}>
        <Svg width={box} height={box} viewBox={`0 0 ${box} ${box}`}>
          {radii.map((r, i) => (
            <Circle
              key={r}
              cx={box / 2}
              cy={box / 2}
              r={r}
              stroke={c.primary}
              strokeWidth={1.5}
              // Farther out, fainter — one shape fading into the field, not three hoops.
              strokeOpacity={0.07 + i * 0.05}
              fill="none"
            />
          ))}
        </Svg>
      </Animated.View>

      <Animated.View
        style={{
          alignItems: 'center',
          opacity: fade(0.15, 0.8),
          transform: [
            {
              translateY: enter.interpolate({
                inputRange: [0.15, 0.8],
                outputRange: [10, 0],
                extrapolate: 'clamp',
              }),
            },
          ],
        }}>
        <View
          style={{
            width: markSize,
            height: markSize,
            borderRadius: radius.xl,
            backgroundColor: c.primary,
            alignItems: 'center',
            justifyContent: 'center',
            ...elevation.e2,
          }}>
          <Icon name="leaf" size={Math.round(markSize / 2)} color={c.onPrimary} weight={1.9} />
        </View>
        {wordmark && (
          <>
            <Gap h={space.lg} />
            <Txt role="h3" tone="secondary" style={{ letterSpacing: 1.6 }}>
              NutriCheck
            </Txt>
          </>
        )}
      </Animated.View>
    </View>
  );
}

/** The sheet's chrome. Shared for the same reason the field is. */
export function useSheetStyle(): ViewStyle {
  const { c, radius, elevation } = useTheme();
  return {
    backgroundColor: c.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    // borderStrong, not border. This edge is the only thing separating two
    // dark surfaces, and the shadow behind it contributes almost nothing.
    borderTopWidth: 1,
    borderColor: c.borderStrong,
    ...elevation.e3,
  };
}
