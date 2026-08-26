import React from 'react';
import { ActivityIndicator, StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Icon, IconName } from './Icon';
import { Row } from './Layout';
import { Press } from './Press';
import { Txt } from './Text';

type Variant = 'primary' | 'tonal' | 'outline' | 'ghost' | 'danger';
type Size = 'lg' | 'md' | 'sm';

const HEIGHTS: Record<Size, number> = { lg: 56, md: 48, sm: 38 };

/**
 * `lg` is the full-width commit at the bottom of a screen, one per screen. `md`
 * is for cards and sheets, `sm` for inline actions.
 *
 * Disabled keeps a readable label rather than dropping to 30% opacity — the
 * blocking reason is always stated in the line directly above it.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  iconRight,
  disabled,
  loading,
  full = true,
  haptic,
  accessibilityLabel,
  accessibilityHint,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
  haptic?: React.ComponentProps<typeof Press>['haptic'];
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { c, radius, space, elevation } = useTheme();
  const inert = Boolean(disabled || loading);

  const skin: Record<Variant, { bg: string; fg: string; border: string; raise: boolean }> = {
    primary: { bg: c.primary, fg: c.onPrimary, border: 'transparent', raise: true },
    tonal: { bg: c.primarySoft, fg: c.primarySoftInk, border: 'transparent', raise: false },
    outline: { bg: 'transparent', fg: c.ink, border: c.borderStrong, raise: false },
    ghost: { bg: 'transparent', fg: c.primary, border: 'transparent', raise: false },
    danger: { bg: c.dangerSoft, fg: c.danger, border: 'transparent', raise: false },
  };

  const s = skin[variant];
  const bg = inert ? c.sunken : s.bg;
  const fg = inert ? c.inkTertiary : s.fg;
  const height = HEIGHTS[size];
  const iconSize = size === 'sm' ? 16 : 19;

  return (
    <Press
      onPress={onPress}
      disabled={inert}
      haptic={haptic}
      feedback="scale"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      style={[
        {
          height,
          alignSelf: full ? 'stretch' : 'flex-start',
          paddingHorizontal: size === 'sm' ? space.lg : space.xxl,
          borderRadius: radius.pill,
          backgroundColor: bg,
          borderWidth: variant === 'outline' && !inert ? 1.5 : 0,
          borderColor: s.border,
          justifyContent: 'center',
          ...(s.raise && !inert ? elevation.e1 : {}),
        },
        style,
      ]}>
      <Row gap={space.sm} justify="center">
        {loading ? (
          <ActivityIndicator size="small" color={fg} />
        ) : (
          <>
            {icon && <Icon name={icon} size={iconSize} color={fg} weight={2.1} />}
            <Txt role={size === 'sm' ? 'labelSm' : 'label'} color={fg}>
              {label}
            </Txt>
            {iconRight && <Icon name={iconRight} size={iconSize} color={fg} weight={2.1} />}
          </>
        )}
      </Row>
    </Press>
  );
}

/** A circular icon-only target. Never smaller than 44pt regardless of glyph size. */
export function IconButton({
  name,
  onPress,
  size = 22,
  color,
  variant = 'plain',
  accessibilityLabel,
  style,
}: {
  name: IconName;
  onPress?: () => void;
  size?: number;
  color?: string;
  variant?: 'plain' | 'surface' | 'tonal';
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { c, hit, radius } = useTheme();

  const bg =
    variant === 'surface' ? c.surface : variant === 'tonal' ? c.primarySoft : 'transparent';
  const fg = color ?? (variant === 'tonal' ? c.primarySoftInk : c.ink);

  return (
    <Press
      onPress={onPress}
      feedback="scale"
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          width: hit,
          height: hit,
          borderRadius: radius.pill,
          backgroundColor: bg,
          borderWidth: variant === 'surface' ? 1 : 0,
          borderColor: c.border,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}>
      <Icon name={name} size={size} color={fg} />
    </Press>
  );
}

/** An inline text action — "Edit", "Cancel", "See all". */
export function TextButton({
  label,
  onPress,
  tone = 'primary',
  role = 'label',
  icon,
}: {
  label: string;
  onPress?: () => void;
  tone?: 'primary' | 'secondary' | 'danger';
  role?: 'label' | 'labelSm';
  icon?: IconName;
}) {
  const { c, hit } = useTheme();
  const color = tone === 'primary' ? c.primary : tone === 'danger' ? c.danger : c.inkSecondary;

  return (
    <Press
      onPress={onPress}
      feedback="fade"
      accessibilityLabel={label}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={{ minHeight: hit / 2, justifyContent: 'center' }}>
      <Row gap={5}>
        <Txt role={role} color={color}>
          {label}
        </Txt>
        {icon && <Icon name={icon} size={15} color={color} weight={2.2} />}
      </Row>
    </Press>
  );
}

/** A 44pt minimum wrapper for anything that is not already a target. */
export const Target = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) => {
  const { hit } = useTheme();
  return <View style={[{ minHeight: hit, justifyContent: 'center' }, style]}>{children}</View>;
};
