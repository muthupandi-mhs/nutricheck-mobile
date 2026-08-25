import React from 'react';
import { StyleProp, Text as RNText, TextProps, TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

/**
 * Typed text.
 *
 * Screens never reach for `<Text>` or a raw `fontSize` — they pick a role.
 * That keeps the four-role hierarchy of the canvas (display / title / body /
 * mono) intact as the app grows, and it is the reason the numbers all align.
 */

type Tone = 'ink' | 'ink2' | 'ink3' | 'det' | 'est' | 'onHeavy';

type BaseProps = TextProps & {
  children: React.ReactNode;
  tone?: Tone;
  style?: StyleProp<TextStyle>;
  /** Escape hatch for the one-off colour, e.g. text drawn on a filled row. */
  color?: string;
};

function useTone(tone: Tone = 'ink', color?: string) {
  const { c } = useTheme();
  return color ?? c[tone];
}

/** 24–40px screen titles and the ring's centre number. Archivo 800. */
export function Display({
  size = 30,
  weight = '800',
  tone,
  color,
  style,
  children,
  ...rest
}: BaseProps & { size?: number; weight?: TextStyle['fontWeight'] }) {
  const { type } = useTheme();
  return (
    <RNText {...rest} style={[type.display(size, weight), { color: useTone(tone, color) }, style]}>
      {children}
    </RNText>
  );
}

/** Food names, button labels, card headings. Archivo 600–700. */
export function Title({
  size = 15.5,
  weight = '700',
  tone,
  color,
  style,
  children,
  ...rest
}: BaseProps & { size?: number; weight?: TextStyle['fontWeight'] }) {
  const { type } = useTheme();
  return (
    <RNText {...rest} style={[type.title(size, weight), { color: useTone(tone, color) }, style]}>
      {children}
    </RNText>
  );
}

/** Running prose and list rows. Source Serif. */
export function Body({
  size = 15.5,
  weight = '400',
  tone = 'ink',
  color,
  style,
  children,
  ...rest
}: BaseProps & { size?: number; weight?: TextStyle['fontWeight'] }) {
  const { type } = useTheme();
  return (
    <RNText {...rest} style={[type.body(size, weight), { color: useTone(tone, color) }, style]}>
      {children}
    </RNText>
  );
}

/** Units, provenance, secondary metadata. IBM Plex Mono. */
export function Mono({
  size = 11,
  weight = '400',
  tone = 'ink3',
  color,
  style,
  children,
  ...rest
}: BaseProps & { size?: number; weight?: TextStyle['fontWeight'] }) {
  const { type } = useTheme();
  return (
    <RNText {...rest} style={[type.mono(size, weight), { color: useTone(tone, color) }, style]}>
      {children}
    </RNText>
  );
}

/**
 * A number. Same face as Mono but with tabular figures locked on, so a ticking
 * total does not shuffle the layout under the user's thumb.
 */
export function Num({
  size = 13,
  weight = '400',
  tone = 'ink',
  color,
  style,
  children,
  ...rest
}: BaseProps & { size?: number; weight?: TextStyle['fontWeight'] }) {
  const { type, tabular } = useTheme();
  return (
    <RNText {...rest} style={[type.mono(size, weight), tabular, { color: useTone(tone, color) }, style]}>
      {children}
    </RNText>
  );
}

/** The all-caps mono label above every section on the canvas. */
export function Eyebrow({
  size = 10.5,
  tone = 'ink2',
  color,
  style,
  children,
  ...rest
}: BaseProps & { size?: number }) {
  const { type } = useTheme();
  return (
    <RNText {...rest} style={[type.eyebrow(size), { color: useTone(tone, color) }, style]}>
      {children}
    </RNText>
  );
}
