import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Press } from './Press';

type Fill = 'surface' | 'sunken' | 'primarySoft' | 'attentionSoft';

/**
 * A card is a filled rectangle and nothing else: no hairline, no shadow.
 *
 * Its edge is the step in lightness between its fill and whatever it sits on,
 * which on a dark page is the only depth cue that carries anyway — a shadow has
 * almost nothing left to darken against near-black, and a hairline on top of a
 * fill that already reads draws the eye to the boundary instead of the content.
 *
 * This is what makes the step sizes in the palette load-bearing rather than
 * decorative: `sunken` under `surface` under `navBar`, each a visible move.
 * Flatten two of them together and the cards between them disappear.
 *
 * There is no elevation prop. Nothing in the app is a card that floats: the
 * tab bar carries its own tokens, and the sheet chrome this used to point at
 * went with the last screen that pinned a panel over the page.
 */
export function Card({
  children,
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
  const { c, radius, space } = useTheme();

  const fills: Record<Fill, string> = {
    surface: c.surface,
    sunken: c.sunken,
    primarySoft: c.primarySoft,
    attentionSoft: c.attentionSoft,
  };

  const box: ViewStyle = {
    backgroundColor: fills[fill],
    borderRadius: radius.lg,
    padding: padded ? space.xl : 0,
    overflow: 'hidden',
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
