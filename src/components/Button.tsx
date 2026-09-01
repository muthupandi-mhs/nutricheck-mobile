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
 * Rounded rectangles, not pills.
 *
 * Every button was `radius.pill`, which on a 56pt full-width commit means the
 * two ends are half-circles 28pt across — round enough that the control stops
 * reading as a surface and starts reading as a capsule floating on one. The
 * reference this app is drawn against ends a button with a corner, and so does
 * everything else here that holds something: cards are 20, sheets are 28. At
 * 999 the button was the one element in the system with no relationship to any
 * other radius in it.
 *
 * Per size rather than fixed, so a 38pt inline action keeps the same optical
 * corner as a 56pt commit instead of reading squarer than it.
 */
const RADII: Record<Size, 'md' | 'sm'> = { lg: 'md', md: 'md', sm: 'sm' };

/**
 * `lg` is the full-width commit at the bottom of a screen, one per screen. `md`
 * is for cards and sheets, `sm` for inline actions.
 *
 * Every button in the app is a pill with an uppercase, tracked label. That used
 * to be an opt-in prop, which meant onboarding shouted and the confirm sheet
 * murmured — the same control reading as two different controls depending on
 * which screen you had reached it from. It is intrinsic now: a button either
 * looks like this or it is not a button. An inline word that should stay
 * sentence-case is a `TextButton`, which is a link and is styled like one.
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
  leading,
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
  /**
   * A mark that is not part of the Icon set, drawn in place of `icon`.
   *
   * Exists for exactly one thing: a third-party brand mark. The Icon set is a
   * single-colour stroke system that recolours to `fg`, and a provider's logo
   * is neither — Google's terms require their G to be drawn in its own four
   * colours, unmodified. Adding it to `IconName` would put a mark we are not
   * allowed to restyle inside the one system whose whole job is restyling.
   *
   * Not a general slot. Anything that CAN be an Icon should be one.
   */
  leading?: React.ReactNode;
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

  /**
   * No button is the accent colour.
   *
   * Ink on canvas is the loudest thing this palette can make, and spending the
   * accent on "the control we would like you to press" is what stops it meaning
   * anything where it is load-bearing — a ring that is filled, a value that was
   * measured, a segment that is selected. A screen where the button and the
   * progress ring are the same blue is a screen where the blue says nothing.
   *
   * Danger keeps its red. That is not decoration, it is the one thing a button
   * can say about itself that the user needs before pressing it.
   */
  const skin: Record<Variant, { bg: string; fg: string; border: string; raise: boolean }> = {
    primary: { bg: c.ink, fg: c.canvas, border: 'transparent', raise: true },
    tonal: { bg: c.surface, fg: c.ink, border: 'transparent', raise: false },
    outline: { bg: 'transparent', fg: c.ink, border: c.borderStrong, raise: false },
    ghost: { bg: 'transparent', fg: c.ink, border: 'transparent', raise: false },
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
          borderRadius: radius[RADII[size]],
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
            {leading}
            {icon && <Icon name={icon} size={iconSize} color={fg} weight={2.1} />}
            <Txt role={size === 'sm' ? 'buttonSm' : 'button'} color={fg} caps numberOfLines={1}>
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

  const bg = variant === 'surface' ? c.surface : variant === 'tonal' ? c.sunken : 'transparent';
  const fg = color ?? c.ink;

  return (
    <Press
      onPress={onPress}
      feedback="scale"
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          width: hit,
          height: hit,
          // The one control that stays a circle: it is a 44pt target around a
          // glyph, not a surface with a label, and a rounded square around an X
          // reads as a button inside a button.
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
