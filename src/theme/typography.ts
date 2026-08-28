import { Platform, TextStyle } from 'react-native';

/**
 * One typeface, nine roles. The face is the platform UI font — SF Pro on iOS,
 * Roboto on Android. To swap in a brand face (Inter is the closest match), drop
 * the files in `src/assets/fonts/`, run `npx react-native-asset`, and fill in
 * `BRAND` below. Nothing else changes.
 */
const BRAND: Partial<Record<Weight, string>> | null = null;

type Weight = '400' | '500' | '600' | '700' | '800';

const system = Platform.select({ ios: undefined, default: 'sans-serif' });

function face(weight: Weight): TextStyle {
  const name = BRAND?.[weight];
  // A bundled face carries its own weight; sending fontWeight too makes
  // Android synthesise a second, smeared bold on top of it.
  if (name) return { fontFamily: name };
  return { fontFamily: system, fontWeight: weight };
}

/** Optical tracking: -0.03em at 40px easing to +0.01em at 11px. */
const track = (size: number) => {
  if (size >= 34) return size * -0.03;
  if (size >= 24) return size * -0.022;
  if (size >= 17) return size * -0.014;
  if (size >= 14) return size * -0.006;
  return size * 0.005;
};

const style = (size: number, lineHeight: number, weight: Weight, letterSpacing?: number): TextStyle => ({
  ...face(weight),
  fontSize: size,
  lineHeight,
  letterSpacing: letterSpacing ?? track(size),
});

/** Stops a counting-down calorie ring from jittering. Android honours this from API 26. */
export const tabular: TextStyle = Platform.select({
  ios: { fontVariant: ['tabular-nums'] },
  default: { fontVariant: ['tabular-nums'] },
}) as TextStyle;

export const text = {
  /** The one enormous number on a screen. Ring centre, targets reveal. */
  display: style(44, 46, '700'),
  /** Screen titles. */
  h1: style(30, 36, '700'),
  /** Card titles, sheet titles. */
  h2: style(22, 28, '700'),
  /** Row titles, food names. */
  h3: style(17, 23, '600'),
  /** Lead paragraph under a title. */
  bodyLg: style(16, 24, '400'),
  /** Default running text. */
  body: style(15, 22, '400'),
  /** Secondary supporting text. */
  bodySm: style(13, 19, '400'),
  /** Chips, tabs, segments — anything that is a target, not prose. */
  label: style(15, 20, '600'),
  labelSm: style(13, 17, '600'),
  /**
   * Button labels, and only buttons.
   *
   * Uppercase, heavy, and widely tracked — which is why the tracking is stated
   * here rather than left to `track()`. That curve is fitted to mixed-case
   * reading, and caps at this weight close up without help. A button label is
   * not read, it is recognised, so it is the one place in the app allowed to
   * shout.
   */
  button: style(15, 20, '700', 1.5),
  buttonSm: style(13, 17, '700', 1.2),
  /** Metadata, units, provenance. */
  caption: style(12, 16, '500'),
  /** Section headers. Uppercase, wide, never longer than three words. */
  overline: style(11, 14, '700', 0.9),
} as const;

export type TextRole = keyof typeof text;
