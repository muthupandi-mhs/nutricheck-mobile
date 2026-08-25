import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { clamp01 } from '../lib/format';
import { useTheme } from '../theme/ThemeProvider';
import { Display, Mono } from './Type';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * The calorie ring.
 *
 * Two decisions worth stating, because both are load-bearing:
 *
 * 1. It counts *down*, not up. "853 kcal left" answers the question the user
 *    actually opened the app with; "1,247 of 2,100" makes them do the
 *    subtraction themselves, four times a day.
 *
 * 2. The stroke has butt caps, not round ones. A rounded cap overhangs the arc
 *    by half the stroke width, which reads as ~4% more progress than there is.
 *    On a number people are dieting against, that is not a rounding error.
 *
 * Overshoot past the target does not wrap around: the arc fills and the
 * remaining number goes amber and negative. A ring that resets to a thin sliver
 * at 2,101 kcal is the least honest possible way to show that.
 */
export function Ring({
  consumed,
  goal,
  size = 128,
  stroke = 11,
}: {
  consumed: number;
  goal: number;
  size?: number;
  stroke?: number;
}) {
  const { c, type, tabular } = useTheme();
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  const progress = goal > 0 ? consumed / goal : 0;
  const over = progress > 1;
  const remaining = Math.round(goal - consumed);

  const anim = useRef(new Animated.Value(0)).current;
  const reduceMotion = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(v => {
      reduceMotion.current = v;
    });
  }, []);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: clamp01(progress),
      duration: reduceMotion.current ? 0 : 620,
      easing: Easing.out(Easing.cubic),
      // strokeDashoffset is not a transform, so this cannot run on the UI thread.
      useNativeDriver: false,
    }).start();
  }, [anim, progress]);

  const dashOffset = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={
        over
          ? `${Math.abs(remaining)} calories over your target of ${goal}`
          : `${remaining} calories left of ${goal}`
      }>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c.rule} strokeWidth={stroke} />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={over ? c.est : c.det}
          strokeWidth={stroke}
          strokeLinecap="butt"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </Svg>

      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Display
          size={size * 0.266}
          style={tabular}
          tone={over ? 'est' : 'ink'}
          accessibilityElementsHidden
          importantForAccessibility="no">
          {Math.abs(remaining).toLocaleString('en-US')}
        </Display>
        <Mono
          size={size * 0.074}
          tone="ink2"
          style={[type.eyebrow(size * 0.074), { marginTop: 1 }]}
          accessibilityElementsHidden
          importantForAccessibility="no">
          {over ? 'KCAL OVER' : 'KCAL LEFT'}
        </Mono>
      </View>
    </View>
  );
}
