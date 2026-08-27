import React, { useRef } from 'react';
import {
  AccessibilityRole,
  Animated,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { haptics } from '../lib/haptics';
import { useTheme } from '../theme/ThemeProvider';

type Feedback = 'scale' | 'fade' | 'none';

export type PressProps = {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  /**
   * The raw press lifecycle, for a control that repeats while held rather than
   * acting once on release. Both still fire when `onPress` is set — they are
   * the press beginning and ending, not an alternative to it.
   */
  onPressIn?: () => void;
  onPressOut?: () => void;
  disabled?: boolean;
  /** How the surface reacts. Cards scale; text and icons fade. */
  feedback?: Feedback;
  /** Which haptic to fire, if any. Navigation should fire none. */
  haptic?: keyof typeof haptics | null;
  style?: StyleProp<ViewStyle>;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: PressableProps['accessibilityState'];
  hitSlop?: PressableProps['hitSlop'];
  delayLongPress?: number;
};

/**
 * The single pressable in the app, so press physics are identical everywhere —
 * a spring to 97.5% and back, not a linear scale or an opacity flash.
 *
 * The release spring is deliberately under-damped: the faint overshoot is what
 * reads as mass. Fully damped reads as dead.
 */
export function Press({
  children,
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
  disabled,
  feedback = 'scale',
  haptic = null,
  style,
  accessibilityRole = 'button',
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
  hitSlop,
  delayLongPress = 320,
}: PressProps) {
  const { motion } = useTheme();
  const value = useRef(new Animated.Value(0)).current;

  /**
   * How this thing sizes itself inside its parent belongs on the touchable;
   * everything else belongs on the view that scales under it.
   *
   * Splitting them is not a nicety. `style` looks like it styles the pressable
   * and does not — it lands on an inner view — so a `flexGrow: 1` meant to
   * split a row evenly was being applied inside a box that had already sized
   * itself to its text, and did nothing. That is how the segmented control
   * ended up with both its options crammed against the left edge.
   *
   * They have to MOVE rather than be copied: `flexBasis: 0` on the inner view
   * is a basis on the cross axis of the row it was written for — a height of
   * zero — which is its own quiet bug.
   */
  const { flex, flexGrow, flexShrink, flexBasis, alignSelf, ...inner } =
    (StyleSheet.flatten(style) ?? {}) as ViewStyle;
  const box = { flex, flexGrow, flexShrink, flexBasis, alignSelf };

  const animate = (to: number) =>
    Animated.spring(value, {
      toValue: to,
      ...motion.spring.press,
      useNativeDriver: true,
    }).start();

  const animatedStyle =
    feedback === 'scale'
      ? {
          transform: [
            { scale: value.interpolate({ inputRange: [0, 1], outputRange: [1, motion.pressScale] }) },
          ],
        }
      : feedback === 'fade'
        ? { opacity: value.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] }) }
        : undefined;

  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(disabled), ...accessibilityState }}
      hitSlop={hitSlop}
      style={box}
      disabled={disabled}
      delayLongPress={delayLongPress}
      onPressIn={() => {
        if (feedback !== 'none') animate(1);
        onPressIn?.();
      }}
      onPressOut={() => {
        if (feedback !== 'none') animate(0);
        onPressOut?.();
      }}
      onLongPress={onLongPress}
      onPress={
        onPress
          ? () => {
              if (haptic) haptics[haptic]();
              onPress();
            }
          : undefined
      }>
      <Animated.View style={[animatedStyle, inner]}>{children}</Animated.View>
    </Pressable>
  );
}
