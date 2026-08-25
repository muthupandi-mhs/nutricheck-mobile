import React from 'react';
import { StatusBar, StyleProp, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { IconButton } from './Button';
import { IconName } from './Icon';
import { Gutter, HeavyBar, SplitRow } from './Layout';
import { Display, Eyebrow } from './Type';

/**
 * The page scaffold.
 *
 * Safe-area insets are applied here and nowhere else, so no screen has to
 * remember them and none of them disagree about the bottom inset — which is
 * the usual way a primary button ends up 8pt under a home indicator on exactly
 * one device.
 */
export function Screen({
  children,
  style,
  edges = 'both',
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** 'top' for screens whose own content scrolls under the bottom bar. */
  edges?: 'both' | 'top';
}) {
  const { c, scheme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: c.ground,
          paddingTop: insets.top + 10,
          paddingBottom: edges === 'both' ? Math.max(insets.bottom, 12) : 0,
        },
        style,
      ]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      {children}
    </View>
  );
}

/**
 * The masthead: an eyebrow, a heavy title, up to two actions, and the 6pt bar
 * that separates it from everything below. Every top-level screen wears one.
 */
export function Masthead({
  eyebrow,
  title,
  titleSize = 30,
  actions,
  children,
}: {
  eyebrow?: string;
  title: string;
  titleSize?: number;
  actions?: Array<{ icon: IconName; onPress: () => void; label: string }>;
  children?: React.ReactNode;
}) {
  const { space } = useTheme();
  return (
    <>
      <Gutter style={{ paddingBottom: space.md }}>
        <SplitRow align="flex-end">
          <View style={{ gap: 2, flexShrink: 1 }}>
            {eyebrow ? <Eyebrow size={10.5} tone="ink3">{eyebrow}</Eyebrow> : null}
            <Display size={titleSize}>{title}</Display>
          </View>
          {actions && actions.length > 0 && (
            <View style={{ flexDirection: 'row', marginRight: -10 }}>
              {actions.map(a => (
                <IconButton key={a.label} name={a.icon} size={22} onPress={a.onPress} accessibilityLabel={a.label} />
              ))}
            </View>
          )}
        </SplitRow>
        {children}
      </Gutter>
      <HeavyBar />
    </>
  );
}

/** The bottom action dock — a primary button pinned above the home indicator. */
export function Dock({ children, divided = true }: { children: React.ReactNode; divided?: boolean }) {
  const { c, space } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: space.md,
        paddingHorizontal: space.gutter,
        paddingBottom: Math.max(insets.bottom, space.lg),
        backgroundColor: c.ground,
        borderTopWidth: divided ? 1 : 0,
        borderTopColor: c.rule,
      }}>
      {children}
    </View>
  );
}
