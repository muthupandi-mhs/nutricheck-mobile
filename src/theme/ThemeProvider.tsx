import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { HIT, Palette, palettes, radius, rule, space } from './tokens';
import { tabular, type } from './typography';

export type Theme = {
  scheme: 'light' | 'dark';
  c: Palette;
  space: typeof space;
  rule: typeof rule;
  radius: typeof radius;
  type: typeof type;
  tabular: typeof tabular;
  hit: number;
};

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({
  children,
  force,
}: {
  children: React.ReactNode;
  /** Test and screenshot hook; production reads the system scheme. */
  force?: 'light' | 'dark';
}) {
  const system = useColorScheme();
  const scheme = force ?? (system === 'dark' ? 'dark' : 'light');

  const value = useMemo<Theme>(
    () => ({
      scheme,
      c: palettes[scheme],
      space,
      rule,
      radius,
      type,
      tabular,
      hit: HIT,
    }),
    [scheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const t = useContext(ThemeContext);
  if (!t) throw new Error('useTheme must be used inside <ThemeProvider>');
  return t;
}
