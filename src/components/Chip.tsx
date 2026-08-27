import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Icon, IconName } from './Icon';
import { Row } from './Layout';
import { Press } from './Press';
import { Txt } from './Text';

export type ChipVariant = 'default' | 'selected' | 'attention' | 'ask' | 'success';

/**
 * A pill. `ask` is the load-bearing variant: a dashed amber outline on an empty
 * portion chip, which has to read as an unanswered question rather than quietly
 * showing "100 g" for a portion nobody stated. The rest is selection state.
 */
export function Chip({
  label,
  variant = 'default',
  icon,
  onPress,
  accessibilityLabel,
  style,
}: {
  label: string;
  variant?: ChipVariant;
  icon?: IconName;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { c, radius, space } = useTheme();

  const skin: Record<ChipVariant, { bg: string; fg: string; border: string; dashed?: boolean; width: number }> = {
    default: { bg: c.surface, fg: c.ink, border: c.borderStrong, width: 1 },
    // Ink, as everywhere else something is chosen — a selected segment, a
    // selected tile. The accent is for what a value MEANS, not for which one
    // the finger last landed on.
    selected: { bg: c.ink, fg: c.canvas, border: 'transparent', width: 0 },
    attention: { bg: c.attentionSoft, fg: c.attentionInk, border: 'transparent', width: 0 },
    ask: { bg: 'transparent', fg: c.attentionInk, border: c.attention, dashed: true, width: 1.5 },
    success: { bg: c.primarySoft, fg: c.primarySoftInk, border: 'transparent', width: 0 },
  };
  const s = skin[variant];

  const body = (
    <Row
      gap={6}
      style={[
        {
          backgroundColor: s.bg,
          borderWidth: s.width,
          borderColor: s.border,
          borderStyle: s.dashed ? 'dashed' : 'solid',
          borderRadius: radius.pill,
          paddingVertical: 9,
          paddingHorizontal: space.lg,
          alignSelf: 'flex-start',
        },
        style,
      ]}>
      {icon && <Icon name={icon} size={14} color={s.fg} weight={2.1} />}
      <Txt role="labelSm" color={s.fg}>
        {label}
      </Txt>
    </Row>
  );

  if (!onPress) return body;

  return (
    <Press
      onPress={onPress}
      haptic="select"
      feedback="scale"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: variant === 'selected' }}
      accessibilityRole="button"
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
      {body}
    </Press>
  );
}

/** A small non-interactive badge — "your usual", "USDA", "3 items". */
export function Badge({
  label,
  tone = 'neutral',
  icon,
}: {
  label: string;
  tone?: 'neutral' | 'success' | 'attention';
  icon?: IconName;
}) {
  const { c, radius } = useTheme();
  const bg = tone === 'success' ? c.primarySoft : tone === 'attention' ? c.attentionSoft : c.sunken;
  const fg =
    tone === 'success' ? c.primarySoftInk : tone === 'attention' ? c.attentionInk : c.inkSecondary;

  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: radius.pill,
        paddingVertical: 4,
        paddingHorizontal: 9,
        alignSelf: 'flex-start',
      }}>
      <Row gap={4}>
        {icon && <Icon name={icon} size={11} color={fg} weight={2.2} />}
        <Txt role="caption" color={fg}>
          {label}
        </Txt>
      </Row>
    </View>
  );
}
