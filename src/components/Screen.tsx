import React from 'react';
import { Animated, StatusBar, StyleProp, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { IconButton } from './Button';
import { IconName } from './Icon';
import { Gutter, Row, Split, Stack } from './Layout';
import { Txt } from './Text';

/**
 * The page scaffold. Safe-area insets are resolved here and nowhere else, so no
 * two screens disagree about the bottom one.
 */
export function Screen({
  children,
  style,
  scrollable,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Set when the screen's own content scrolls under a dock or tab bar. */
  scrollable?: boolean;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        { flex: 1, backgroundColor: c.canvas, paddingTop: insets.top + 6 },
        !scrollable && { paddingBottom: Math.max(insets.bottom, 12) },
        style,
      ]}>
      {/* One palette, and it is dark: the bar is always light-on-dark. */}
      <StatusBar barStyle="light-content" />
      {children}
    </View>
  );
}

/**
 * A screen header. `scrollY` collapses the large title into the bar as the page
 * scrolls; without it the screen loses its label the moment you move.
 */
export function Header({
  eyebrow,
  title,
  actions,
  leading,
  scrollY,
  children,
}: {
  eyebrow?: string;
  title: string;
  actions?: Array<{ icon: IconName; onPress: () => void; label: string; variant?: 'plain' | 'surface' }>;
  leading?: { icon: IconName; onPress: () => void; label: string };
  scrollY?: Animated.Value;
  children?: React.ReactNode;
}) {
  const { space } = useTheme();

  const collapse = scrollY
    ? {
        opacity: scrollY.interpolate({ inputRange: [0, 46], outputRange: [1, 0], extrapolate: 'clamp' }),
        transform: [
          {
            translateY: scrollY.interpolate({
              inputRange: [0, 46],
              outputRange: [0, -10],
              extrapolate: 'clamp',
            }),
          },
        ],
      }
    : undefined;

  return (
    <Gutter style={{ paddingBottom: space.lg }}>
      <Split align="center" style={{ minHeight: 44 }}>
        <Row gap={space.sm} style={{ flexShrink: 1 }}>
          {leading && (
            <IconButton
              name={leading.icon}
              onPress={leading.onPress}
              accessibilityLabel={leading.label}
              style={{ marginLeft: -10 }}
            />
          )}
          <Stack gap={1} style={{ flexShrink: 1 }}>
            {eyebrow ? (
              <Txt role="caption" tone="tertiary">
                {eyebrow}
              </Txt>
            ) : null}
          </Stack>
        </Row>

        {actions && actions.length > 0 && (
          <Row gap={space.xs} style={{ marginRight: -8 }}>
            {actions.map(a => (
              <IconButton
                key={a.label}
                name={a.icon}
                onPress={a.onPress}
                accessibilityLabel={a.label}
                variant={a.variant}
              />
            ))}
          </Row>
        )}
      </Split>

      <Animated.View style={[{ marginTop: 2 }, collapse]}>
        <Txt role="h1">{title}</Txt>
      </Animated.View>

      {children}
    </Gutter>
  );
}

/** The bottom action dock. Its canvas fill clips content scrolling underneath. */
export function Dock({
  children,
  bordered = true,
  /** Extra bottom padding when the screen also has a tab bar. */
  aboveTabBar,
  /** Set false over a full-bleed background, where the opaque fill would cut a visible band. */
  fill = true,
}: {
  children: React.ReactNode;
  bordered?: boolean;
  aboveTabBar?: boolean;
  fill?: boolean;
}) {
  const { c, space } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingTop: space.lg,
        paddingHorizontal: space.gutter,
        paddingBottom: (aboveTabBar ? 0 : Math.max(insets.bottom, space.lg)) + space.xs,
        backgroundColor: fill ? c.canvas : 'transparent',
        borderTopWidth: bordered ? 1 : 0,
        borderTopColor: c.border,
      }}>
      {children}
    </View>
  );
}
