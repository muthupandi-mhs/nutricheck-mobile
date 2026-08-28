import React from 'react';
import { StyleProp, Text as RNText, TextProps, TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import type { TextRole } from '../theme/typography';

type Tone = 'ink' | 'secondary' | 'tertiary' | 'primary' | 'attention' | 'danger' | 'onPrimary';

/**
 * RN's own `role` prop is the ARIA role. It is omitted so the name can mean
 * "role in the type scale"; assistive semantics go through `accessibilityRole`.
 */
export type TxtProps = Omit<TextProps, 'role'> & {
  children: React.ReactNode;
  /** A role from the type scale. Never a raw fontSize. */
  role?: TextRole;
  tone?: Tone;
  /** Locks tabular figures on. Anything that can change while visible needs it. */
  numeric?: boolean;
  /** Uppercases. Only the `overline` and `button` roles are tracked for caps. */
  caps?: boolean;
  color?: string;
  style?: StyleProp<TextStyle>;
};

/** All text goes through here. Screens pick a role and a tone, never a size, weight or hex. */
export function Txt({
  children,
  role = 'body',
  tone = 'ink',
  numeric,
  caps,
  color,
  style,
  ...rest
}: TxtProps) {
  const { c, text, tabular } = useTheme();

  const toneColor: Record<Tone, string> = {
    ink: c.ink,
    secondary: c.inkSecondary,
    tertiary: c.inkTertiary,
    primary: c.primary,
    attention: c.attention,
    danger: c.danger,
    onPrimary: c.onPrimary,
  };

  return (
    <RNText
      {...rest}
      style={[
        text[role],
        { color: color ?? toneColor[tone] },
        numeric && tabular,
        caps && { textTransform: 'uppercase' },
        style,
      ]}>
      {children}
    </RNText>
  );
}

/** A section header. Always uppercase, always the same colour, never nested. */
export function SectionLabel({
  children,
  tone = 'tertiary',
  style,
}: {
  children: React.ReactNode;
  tone?: Tone;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Txt role="overline" tone={tone} caps style={style}>
      {children}
    </Txt>
  );
}
