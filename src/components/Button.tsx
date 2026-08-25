import React, { useRef } from 'react';
import {
  AccessibilityRole,
  Animated,
  Easing,
  Pressable,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Icon, IconName } from './Icon';
import { Mono, Title } from './Type';

/**
 * Press feedback is a 40 ms opacity dip, not a scale or a ripple.
 *
 * The layout is built from hard edges meeting at right angles; a scaled button
 * momentarily breaks every alignment it participates in, and on this design
 * that is very visible.
 */
function usePressFade() {
  const opacity = useRef(new Animated.Value(1)).current;
  const to = (v: number) =>
    Animated.timing(opacity, {
      toValue: v,
      duration: v === 1 ? 140 : 40,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  return { opacity, onPressIn: () => to(0.62), onPressOut: () => to(1) };
}

type BaseProps = {
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * The one primary action per screen: a 52pt inverted slab.
 *
 * `disabled` keeps the button visible and readable rather than dimming it to
 * 30% — the user needs to see what they are being blocked from, and the
 * blocking reason is always stated in the line above it.
 */
export function PrimaryButton({
  label,
  icon,
  onPress,
  disabled,
  loading,
  style,
  accessibilityLabel,
}: BaseProps & { label: string; icon?: IconName; loading?: boolean }) {
  const { c, space } = useTheme();
  const fade = usePressFade();
  const inert = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: Boolean(inert) }}
      onPress={inert ? undefined : onPress}
      onPressIn={inert ? undefined : fade.onPressIn}
      onPressOut={inert ? undefined : fade.onPressOut}>
      <Animated.View
        style={[
          {
            height: 52,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: space.sm + 1,
            backgroundColor: inert ? c.surface : c.heavy,
            borderWidth: inert ? 1 : 0,
            borderColor: c.rule,
            opacity: inert ? 1 : undefined,
          },
          !inert && { opacity: fade.opacity },
          style,
        ]}>
        {icon && <Icon name={icon} size={17} color={inert ? c.ink3 : c.onHeavy} weight={2.4} />}
        <Title size={15.5} weight="700" color={inert ? c.ink3 : c.onHeavy}>
          {loading ? 'Working…' : label}
        </Title>
      </Animated.View>
    </Pressable>
  );
}

/** The alternative action: same slab, outlined instead of filled. */
export function SecondaryButton({
  label,
  icon,
  onPress,
  disabled,
  style,
}: BaseProps & { label: string; icon?: IconName }) {
  const { c, space } = useTheme();
  const fade = usePressFade();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      onPress={disabled ? undefined : onPress}
      onPressIn={fade.onPressIn}
      onPressOut={fade.onPressOut}>
      <Animated.View
        style={[
          {
            height: 52,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: space.sm,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.ink,
            opacity: fade.opacity,
          },
          style,
        ]}>
        {icon && <Icon name={icon} size={16} color={c.ink} />}
        <Title size={15.5} weight="700" tone="ink">
          {label}
        </Title>
      </Animated.View>
    </Pressable>
  );
}

/** An inline mono action — "Edit", "Cancel", "Skip". Teal, never underlined. */
export function TextAction({
  label,
  onPress,
  tone = 'det',
  size = 12,
  style,
}: BaseProps & { label: string; tone?: 'det' | 'est' | 'ink2'; size?: number }) {
  const { hit } = useTheme();
  const fade = usePressFade();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={fade.onPressIn}
      onPressOut={fade.onPressOut}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={[{ minHeight: hit / 2, justifyContent: 'center' }, style]}>
      <Animated.View style={{ opacity: fade.opacity }}>
        <Mono size={size} tone={tone}>
          {label}
        </Mono>
      </Animated.View>
    </Pressable>
  );
}

/** A 44pt icon-only target. Never smaller, even when the glyph is 17px. */
export function IconButton({
  name,
  onPress,
  color,
  size = 20,
  accessibilityLabel,
  accessibilityRole = 'button',
  style,
}: BaseProps & {
  name: IconName;
  color?: string;
  size?: number;
  accessibilityRole?: AccessibilityRole;
}) {
  const { hit } = useTheme();
  const fade = usePressFade();
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onPressIn={fade.onPressIn}
      onPressOut={fade.onPressOut}
      style={[{ width: hit, height: hit, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Animated.View style={{ opacity: fade.opacity }}>
        <Icon name={name} size={size} color={color} />
      </Animated.View>
    </Pressable>
  );
}

/** A whole row that presses. Used for list rows, option rows, and recents tiles. */
export function PressableRow({
  children,
  onPress,
  onLongPress,
  accessibilityLabel,
  accessibilityHint,
  disabled,
  style,
}: BaseProps & {
  children: React.ReactNode;
  onLongPress?: () => void;
  accessibilityHint?: string;
}) {
  const fade = usePressFade();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(disabled) }}
      onPress={disabled ? undefined : onPress}
      onLongPress={onLongPress}
      delayLongPress={320}
      onPressIn={fade.onPressIn}
      onPressOut={fade.onPressOut}>
      <Animated.View style={[{ opacity: fade.opacity }, style]}>{children}</Animated.View>
    </Pressable>
  );
}

/** A 44pt tap target wrapper for anything that is not already one. */
export const Target = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => {
  const { hit } = useTheme();
  return <View style={[{ minHeight: hit, justifyContent: 'center' }, style]}>{children}</View>;
};
