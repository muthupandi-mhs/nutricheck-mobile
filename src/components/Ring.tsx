import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { clamp01 } from '../lib/format';
import { useTheme } from '../theme/ThemeProvider';
import { Row, Stack } from './Layout';
import { Txt } from './Text';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * The calorie ring.
 *
 * The big figure is what has been EATEN, with the target under it: "1,404 /
 * of 2,041 kcal". It counted down for a long time, on the reasoning that
 * "637 left" is the question people open the app with — true at four in the
 * afternoon, and wrong at every other moment. A remaining figure is a budget,
 * and a budget is only readable if you already know the two numbers behind it;
 * what somebody has eaten is a fact they can check against their own day, and
 * it is also the number the arc is drawing. Ring and figure now say the same
 * thing, which is the point of putting one inside the other.
 *
 * What is left is still there, under the target, as a line rather than a
 * headline — the caller supplies it, because only the caller knows whether
 * this is today's ring or a past day's.
 *
 * Overshoot does not wrap: past the target the arc completes and the figure
 * turns amber, since resetting to a thin sliver at 2,041 kcal would read as
 * progress.
 */
export function Ring({
  consumed,
  goal,
  size = 208,
  stroke = 16,
  children,
}: {
  consumed: number;
  goal: number;
  size?: number;
  stroke?: number;
  /** Rendered under the big number — a delta, a subtitle. */
  children?: React.ReactNode;
}) {
  const { c, tabular } = useTheme();
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  const progress = goal > 0 ? consumed / goal : 0;
  const over = progress > 1;
  const remaining = Math.round(goal - consumed);

  const anim = useRef(new Animated.Value(0)).current;
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(v => alive && setReduced(v));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    Animated.spring(anim, {
      toValue: clamp01(progress),
      damping: 30,
      stiffness: 90,
      mass: 1,
      // strokeDashoffset is an SVG attribute, not a transform, so this cannot run
      // natively. One property on one element — acceptable.
      useNativeDriver: false,
    }).start();
  }, [anim, progress]);

  const dashOffset = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0.001],
  });

  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={
        over
          ? `${Math.round(consumed)} calories eaten, ${Math.abs(remaining)} over your target of ${goal}`
          : `${Math.round(consumed)} calories eaten of ${goal}, ${remaining} left`
      }>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <LinearGradient id="ringFill" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={over ? c.attention : c.ringFrom} />
            <Stop offset="1" stopColor={over ? c.attention : c.ringTo} />
          </LinearGradient>
        </Defs>

        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c.sunken} strokeWidth={stroke} />

        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ringFill)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={reduced ? circumference * (1 - clamp01(progress)) : dashOffset}
        />
      </Svg>

      <Stack gap={2} align="center" accessibilityElementsHidden importantForAccessibility="no">
        <Row gap={4} align="flex-end">
          <Txt role="display" numeric tone={over ? 'attention' : 'ink'} style={tabular}>
            {Math.round(consumed).toLocaleString('en-US')}
          </Txt>
        </Row>
        <Txt role="caption" tone="secondary" numeric>
          of {Math.round(goal).toLocaleString('en-US')} kcal
        </Txt>
        {children}
      </Stack>
    </View>
  );
}
