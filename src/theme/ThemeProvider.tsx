import React, { createContext, useContext, useMemo } from 'react';
import { elevation, HIT, motion, palette, Palette, radius, space } from './tokens';
import { tabular, text } from './typography';

export type Theme = {
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

/**
 * One theme, so this holds no state and never changes identity.
 *
 * It used to read the system colour scheme and pick between two palettes. The
 * app is dark-only now, so there is nothing to read and nothing to switch —
 * which also means no screen can flicker through a scheme change mid-render,
 * and the `force` prop the tests used to pass has nothing left to force.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<Theme>(
    () => ({
      c: palette,
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
        return palette.glyph[h % palette.glyph.length];
      },
    }),
    [],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const t = useContext(ThemeContext);
  if (!t) throw new Error('useTheme must be used inside <ThemeProvider>');
  return t;
}
