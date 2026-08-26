import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { elevation, HIT, motion, Palette, palettes, radius, space } from './tokens';
import { tabular, text } from './typography';

export type Theme = {
  scheme: 'light' | 'dark';
  c: Palette;
  space: typeof space;
  radius: typeof radius;
  elevation: typeof elevation;
  motion: typeof motion;
  text: typeof text;
  tabular: typeof tabular;
  hit: number;
  /** Stable tint for a food glyph, derived from its id so it never re-rolls. */
  glyphTint: (seed: string) => string;
};

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({
  children,
  force,
}: {
  children: React.ReactNode;
  /** Test and screenshot hook; production follows the system. */
  force?: 'light' | 'dark';
}) {
  const system = useColorScheme();
  const scheme = force ?? (system === 'dark' ? 'dark' : 'light');

  const value = useMemo<Theme>(() => {
    const c = palettes[scheme];
    return {
      scheme,
      c,
      space,
      radius,
      elevation,
      motion,
      text,
      tabular,
      hit: HIT,
      glyphTint: seed => {
        // A cheap stable hash: the same food keeps the same tint across
        // sessions and screens, which is what makes the list feel designed
        // rather than randomly coloured.
        let h = 0;
        /* eslint-disable-next-line no-bitwise -- 32-bit string hash; the arithmetic form overflows */
        for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
        return c.glyph[h % c.glyph.length];
      },
    };
  }, [scheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const t = useContext(ThemeContext);
  if (!t) throw new Error('useTheme must be used inside <ThemeProvider>');
  return t;
}
