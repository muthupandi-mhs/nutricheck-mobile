import React from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Mono } from './Type';

/**
 * The portion chip and its relatives.
 *
 * Four variants, and which one a chip wears is a statement about where its
 * number came from:
 *
 *   plain     the user stated it, or the food table did — nothing to question
 *   det       teal: confirmed, exact, learned from this user
 *   est       amber: an estimate, or a value the user has not supplied yet
 *   empty     a dashed amber outline: nothing here, and we are asking
 *
 * The dashed variant is the one that matters. "Some nuts" specifies nothing;
 * a chip that looks like an unanswered question costs one tap, and a chip
 * quietly reading "100 g" costs a wrong week.
 */

export type ChipVariant = 'plain' | 'det' | 'est' | 'empty' | 'selected';

type Props = {
  label: string;
  variant?: ChipVariant;
  onPress?: () => void;
  size?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function Chip({ label, variant = 'plain', onPress, size = 12, accessibilityLabel, style }: Props) {
  const { c } = useTheme();

  const skin: Record<ChipVariant, { bg: string; border: string; text: string; dashed?: boolean; width?: number }> = {
    plain: { bg: c.surface, border: c.rule, text: c.ink },
    det: { bg: c.surface, border: c.det, text: c.det },
    est: { bg: c.surface, border: c.est, text: c.est },
    empty: { bg: c.surface, border: c.est, text: c.ink3, dashed: true, width: 2 },
    selected: { bg: c.surface, border: c.ink, text: c.ink, width: 2 },
  };
  const s = skin[variant];

  const body = (
    <View
      style={[
        {
          backgroundColor: s.bg,
          borderWidth: s.width ?? 1,
          borderColor: s.border,
          borderStyle: s.dashed ? 'dashed' : 'solid',
          paddingVertical: 6,
          paddingHorizontal: variant === 'empty' ? 14 : 10,
          alignSelf: 'flex-start',
        },
        style,
      ]}>
      <Mono size={size} color={s.text}>
        {label}
      </Mono>
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}>
      {body}
    </Pressable>
  );
}

/** A tiny inline badge — "your usual", "USDA", "MEAL". Never interactive. */
export function Tag({ label, tone = 'ink3' }: { label: string; tone?: 'ink3' | 'det' | 'est' }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: tone === 'ink3' ? c.rule : c[tone],
        backgroundColor: c.surface,
        paddingVertical: 3,
        paddingHorizontal: 6,
        alignSelf: 'flex-start',
      }}>
      <Mono size={10} tone={tone}>
        {label}
      </Mono>
    </View>
  );
}
