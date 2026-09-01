import React from 'react';
import { StatusBar, StyleProp, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { IconButton } from './Button';
import { IconName } from './Icon';
import { Gutter, Row, Split } from './Layout';
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
 * A screen header: the back button, the title and any actions, on ONE line.
 *
 * One title, not two. It used to take an `eyebrow` above the title, and on
 * every screen that passed one the pair read as two stacked headings — "Your
 * weight" over "Weight" — where the upper one was either a restatement of the
 * lower or a piece of live data that had no business being typeset as a
 * heading. The restatements are gone and the data moved into the pages, where
 * it can be a sentence next to the figures it describes.
 *
 * Inline rather than a large title on the row beneath, because removing the
 * eyebrow from the old layout left the back button alone on a line with
 * nothing beside it: a chevron in empty space, with no word to say what it
 * goes back from.
 *
 * `scrollY` went with it. It collapsed the large title into the bar on scroll,
 * which no longer means anything once the title IS the bar — and no screen ever
 * passed one.
 */
export function Header({
  title,
  actions,
  leading,
  children,
}: {
  title: string;
  actions?: Array<{ icon: IconName; onPress: () => void; label: string; variant?: 'plain' | 'surface' }>;
  leading?: { icon: IconName; onPress: () => void; label: string };
  children?: React.ReactNode;
}) {
  const { space } = useTheme();

  return (
    <Gutter style={{ paddingBottom: space.lg }}>
      <Split align="center" style={{ minHeight: 44 }}>
        <Row gap={space.xs} style={{ flexShrink: 1 }}>
          {leading && (
            <IconButton
              name={leading.icon}
              onPress={leading.onPress}
              accessibilityLabel={leading.label}
              style={{ marginLeft: -10 }}
            />
          )}
          {/* One line, truncated rather than wrapped. A title that wraps to two
              lines moves the actions beside it down the screen, and every title
              here is one or two words. */}
          <Txt role="h1" numberOfLines={1} accessibilityRole="header" style={{ flexShrink: 1 }}>
            {title}
          </Txt>
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
