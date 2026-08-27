import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Press } from './Press';

type Level = 'flat' | 'raised' | 'floating';
type Fill = 'surface' | 'sunken' | 'primarySoft' | 'attentionSoft';

/**
 * Depth is elevation plus a hairline, never elevation alone. On a near-black
 * page a shadow has almost nothing left to darken, so the border does the
 * structural work and the shadow only stops the card looking pasted on. Drop
 * the border and cards dissolve into the page.
 */
export function Card({
  children,
  level = 'flat',
  fill = 'surface',
  padded = true,
  onPress,
  onLongPress,
  accessibilityLabel,
  accessibilityHint,
  haptic = null,
  style,
}: {
  children: React.ReactNode;
  level?: Level;
  fill?: Fill;
  /** Set false when the card holds full-bleed rows that pad themselves. */
  padded?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  haptic?: React.ComponentProps<typeof Press>['haptic'];
  style?: StyleProp<ViewStyle>;
}) {
  const { c, radius, space, elevation } = useTheme();

  const fills: Record<Fill, string> = {
    surface: c.surface,
    sunken: c.sunken,
    primarySoft: c.primarySoft,
    attentionSoft: c.attentionSoft,
  };

  const borders: Record<Fill, string> = {
    surface: c.border,
    sunken: c.border,
    primarySoft: 'transparent',
    attentionSoft: 'transparent',
  };

  const box: ViewStyle = {
    backgroundColor: fills[fill],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: borders[fill],
    padding: padded ? space.xl : 0,
    overflow: 'hidden',
    ...(level === 'raised' ? elevation.e1 : level === 'floating' ? elevation.e2 : {}),
  };

  if (!onPress && !onLongPress) return <View style={[box, style]}>{children}</View>;

  return (
    <Press
      onPress={onPress}
      onLongPress={onLongPress}
      haptic={haptic}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={[box, style]}>
      {children}
    </Press>
  );
}
