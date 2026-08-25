import React from 'react';
import { StyleProp, View, ViewProps, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

/**
 * Rules do the work that borders and shadows do elsewhere. Four weights, each
 * with a fixed meaning, so a screen's hierarchy is legible from its markup.
 */

/** The 6px bar under a screen header. The heaviest mark in the app. */
export function HeavyBar({ style }: { style?: StyleProp<ViewStyle> }) {
  const { c, rule } = useTheme();
  return <View style={[{ height: rule.heavy, backgroundColor: c.heavy }, style]} />;
}

/** A 2px divider between major sections. */
export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const { c, rule } = useTheme();
  return <View style={[{ height: rule.section, backgroundColor: c.rule }, style]} />;
}

/** A hairline between list rows. */
export function Hairline({ style }: { style?: StyleProp<ViewStyle> }) {
  const { c, rule } = useTheme();
  return <View style={[{ height: rule.hair, backgroundColor: c.rule }, style]} />;
}

/** Vertical whitespace, named so the intent survives a refactor. */
export const Gap = ({ h }: { h: number }) => <View style={{ height: h }} />;

/** Pushes whatever follows to the bottom of a flex column. */
export const Spacer = () => <View style={{ flexGrow: 1 }} />;

/** The standard 20pt page gutter. */
export function Gutter({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { space } = useTheme();
  return <View style={[{ paddingHorizontal: space.gutter }, style]}>{children}</View>;
}

/** A horizontal row with baseline-ish alignment and a space between the ends. */
export function SplitRow({
  children,
  align = 'center',
  style,
  ...rest
}: ViewProps & {
  children: React.ReactNode;
  align?: ViewStyle['alignItems'];
}) {
  return (
    <View
      {...rest}
      style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: align }, style]}>
      {children}
    </View>
  );
}

/** A horizontal run of items with a consistent gap. */
export function Row({
  children,
  gap = 0,
  align = 'center',
  wrap = false,
  style,
  ...rest
}: ViewProps & {
  children: React.ReactNode;
  gap?: number;
  align?: ViewStyle['alignItems'];
  wrap?: boolean;
}) {
  return (
    <View
      {...rest}
      style={[
        { flexDirection: 'row', alignItems: align, gap, flexWrap: wrap ? 'wrap' : 'nowrap' },
        style,
      ]}>
      {children}
    </View>
  );
}
