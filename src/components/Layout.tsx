import React from 'react';
import { StyleProp, View, ViewProps, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

/** A horizontal run with a consistent gap. */
export function Row({
  children,
  gap = 0,
  align = 'center',
  justify,
  wrap,
  style,
  ...rest
}: ViewProps & {
  children: React.ReactNode;
  gap?: number;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  wrap?: boolean;
}) {
  return (
    <View
      {...rest}
      style={[
        {
          flexDirection: 'row',
          alignItems: align,
          justifyContent: justify,
          gap,
          flexWrap: wrap ? 'wrap' : 'nowrap',
        },
        style,
      ]}>
      {children}
    </View>
  );
}

/** A vertical stack with a consistent gap. */
export function Stack({
  children,
  gap = 0,
  align,
  style,
  ...rest
}: ViewProps & { children: React.ReactNode; gap?: number; align?: ViewStyle['alignItems'] }) {
  return (
    <View {...rest} style={[{ gap, alignItems: align }, style]}>
      {children}
    </View>
  );
}

/** Ends pushed apart. The most common row in the app. */
export function Split({
  children,
  align = 'center',
  gap,
  style,
  ...rest
}: ViewProps & { children: React.ReactNode; align?: ViewStyle['alignItems']; gap?: number }) {
  return (
    <View
      {...rest}
      style={[
        { flexDirection: 'row', alignItems: align, justifyContent: 'space-between', gap },
        style,
      ]}>
      {children}
    </View>
  );
}

/** The page margin. Applied by screens, never by cards. */
export function Gutter({ children, style, ...rest }: ViewProps & { children: React.ReactNode }) {
  const { space } = useTheme();
  return (
    <View {...rest} style={[{ paddingHorizontal: space.gutter }, style]}>
      {children}
    </View>
  );
}

export const Gap = ({ h = 0, w = 0 }: { h?: number; w?: number }) => (
  <View style={{ height: h, width: w }} />
);

export const Spacer = () => <View style={{ flexGrow: 1 }} />;

/** A hairline. Separates rows inside a card; never used to build layout. */
export function Divider({ inset = 0, style }: { inset?: number; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return <View style={[{ height: 1, backgroundColor: c.border, marginLeft: inset }, style]} />;
}
