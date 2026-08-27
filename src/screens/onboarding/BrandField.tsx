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
 * The brand zone. Welcome is the only screen that carries it now.
 *
 * It was shared with sign-in and sign-up, and stayed a component when they
 * dropped it: everything scales off `markSize`, so the composition survives
 * being placed at any size, and that is the part worth not re-deriving next
 * time something wants a mark.
 *
 * `flex: 1` with a low `minHeight` lets the caller decide how much room it
 * takes — Welcome gives it whatever the copy below does not use.
 */
export function BrandField({
  markSize = 76,
  wordmark = true,
  minHeight = 260,
  style,
}: {
  markSize?: number;
  wordmark?: boolean;
  minHeight?: number;
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
          paddingTop: insets.top,
          overflow: 'hidden',
        },
        style,
      ]}>
      {/* A halo, not a top-to-bottom wash. A linear one piles its tint against
          the bottom edge of the field, where it reads as a light leak rather
          than as something the mark is giving off. */}
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
        {/* A plain box the size of the mark, holding both. The rings hang off
            it rather than off the field, offset by exactly half the difference
            in their sizes, so they are concentric with the mark by
            construction rather than by both happening to be centred.

            They used to be siblings of the mark and drifted apart two ways:
            the field's `paddingTop` shrinks the box the mark is centred in but
            not the one an absolute child resolves against, and with the
            wordmark showing the mark sits above the centre of its own block
            while the rings stayed on the field's. Either way the mark sat low
            in its own halo.

            The anchor carries no elevation on purpose — an elevated parent
            clips its children to its bounds on Android, which would take the
            rings with it. */}
        <View style={{ width: markSize, height: markSize }}>
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: (markSize - box) / 2,
              left: (markSize - box) / 2,
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

          {/* Painted after the rings, so it sits over them. */}
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
