import { Platform, TextStyle } from 'react-native';

/**
 * Three typefaces, three jobs — as set on the design canvas:
 *
 *   Archivo         headings, food names, button labels  (display)
 *   IBM Plex Mono   every number, every eyebrow label     (mono)
 *   Source Serif 4  running prose and list body text      (serif)
 *
 * The .ttf files are not committed yet. Until they are, each family falls back
 * to the nearest platform face so the hierarchy still reads correctly. Drop the
 * files into `src/assets/fonts/`, run `npx react-native-asset`, and flip
 * BUNDLED to true — nothing else in the app changes.
 */
const BUNDLED = false;

const family = {
  display: BUNDLED
    ? { 400: 'Archivo-Regular', 500: 'Archivo-Medium', 600: 'Archivo-SemiBold', 700: 'Archivo-Bold', 800: 'Archivo-ExtraBold' }
    : null,
  mono: BUNDLED
    ? { 400: 'IBMPlexMono-Regular', 500: 'IBMPlexMono-Medium', 600: 'IBMPlexMono-SemiBold' }
    : null,
  serif: BUNDLED ? { 400: 'SourceSerif4-Regular', 600: 'SourceSerif4-SemiBold' } : null,
};

type Weight = NonNullable<TextStyle['fontWeight']>;

const fallback = {
  display: Platform.select({ ios: 'System', default: 'sans-serif' }) as string,
  mono: Platform.select({ ios: 'Menlo', default: 'monospace' }) as string,
  serif: Platform.select({ ios: 'Georgia', default: 'serif' }) as string,
};

function face(kind: keyof typeof family, weight: Weight): TextStyle {
  const table = family[kind] as Record<string, string | undefined> | null;
  const name = table?.[String(weight)];
  // A bundled face carries its own weight; passing fontWeight as well makes
  // Android synthesise a second bold on top of it.
  if (name) return { fontFamily: name };
  return { fontFamily: fallback[kind], fontWeight: weight };
}

/**
 * Numerals must not reflow as they tick. Android honours the font-feature
 * setting only on API 26+; iOS honours the RN prop directly.
 */
export const tabular: TextStyle = Platform.select({
  ios: { fontVariant: ['tabular-nums'] },
  default: {},
}) as TextStyle;

export const type = {
  /** 30–40px screen titles and the ring's centre number. */
  display: (size: number, weight: Weight = '800'): TextStyle => ({
    ...face('display', weight),
    fontSize: size,
    letterSpacing: size * -0.03,
    lineHeight: size * 1.05,
  }),
  /** Food names and button labels — Archivo at text sizes. */
  title: (size: number, weight: Weight = '700'): TextStyle => ({
    ...face('display', weight),
    fontSize: size,
    letterSpacing: size * -0.012,
    lineHeight: size * 1.2,
  }),
  /** Running prose. */
  body: (size = 15.5, weight: Weight = '400'): TextStyle => ({
    ...face('serif', weight),
    fontSize: size,
    lineHeight: size * 1.4,
  }),
  /** Numbers, units, provenance. */
  mono: (size = 11, weight: Weight = '400'): TextStyle => ({
    ...face('mono', weight),
    fontSize: size,
    lineHeight: size * 1.35,
  }),
  /** The all-caps eyebrow used above every section on the canvas. */
  eyebrow: (size = 10.5): TextStyle => ({
    ...face('mono', '400'),
    fontSize: size,
    letterSpacing: size * 0.12,
    lineHeight: size * 1.3,
  }),
};
