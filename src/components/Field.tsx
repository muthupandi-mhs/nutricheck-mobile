import React, { useState } from 'react';
import { KeyboardTypeOptions, Pressable, TextInput, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from './Icon';
import { Hairline, Row, SplitRow } from './Layout';
import { Body, Eyebrow, Mono, Num, Title } from './Type';

/**
 * Form controls.
 *
 * The focus ring is a 2pt bottom edge that switches from `heavy` to `est`, not
 * a coloured glow — it is the same device the canvas uses on the search field
 * and the composer, and it survives both colour schemes without a shadow.
 */

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  suffix,
  autoFocus,
  maxLength,
  accessibilityHint,
}: {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  suffix?: string;
  autoFocus?: boolean;
  maxLength?: number;
  accessibilityHint?: string;
}) {
  const { c, space, type } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ gap: 6 }}>
      {label ? <Eyebrow size={10} tone="ink2">{label}</Eyebrow> : null}
      <Row
        gap={space.sm}
        style={{
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: c.rule,
          borderBottomWidth: 2,
          borderBottomColor: focused ? c.est : c.heavy,
          height: 46,
          paddingHorizontal: space.md,
        }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.ink3}
          keyboardType={keyboardType}
          autoFocus={autoFocus}
          maxLength={maxLength}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          selectionColor={c.est}
          accessibilityLabel={label}
          accessibilityHint={accessibilityHint}
          style={[type.body(16), { flexGrow: 1, color: c.ink, padding: 0 }]}
        />
        {suffix ? <Mono size={12} tone="ink3">{suffix}</Mono> : null}
      </Row>
    </View>
  );
}

/** A two-to-five way switch. Wide enough for "Desk job" but happy with "kg". */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  label?: string;
}) {
  const { c, space } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label ? <Eyebrow size={10} tone="ink2">{label}</Eyebrow> : null}
      <Row style={{ borderWidth: 1, borderColor: c.rule, backgroundColor: c.surface }}>
        {options.map((o, i) => {
          const active = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={o.label}
              onPress={() => onChange(o.value)}
              style={{
                flexGrow: 1,
                flexBasis: 0,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: active ? c.heavy : 'transparent',
                borderLeftWidth: i === 0 ? 0 : 1,
                borderLeftColor: c.rule,
              }}>
              <Mono size={12.5} color={active ? c.onHeavy : c.ink2}>
                {o.label}
              </Mono>
            </Pressable>
          );
        })}
      </Row>
      <View style={{ height: space.xs }} />
    </View>
  );
}

/**
 * A full-width choice row — activity levels, objectives, settings.
 * The selection mark is a 3pt left edge plus a check, never a radio circle:
 * circles are the one soft shape in a design built entirely from squares.
 */
export function OptionRow({
  title,
  detail,
  selected,
  onPress,
  trailing,
  last,
}: {
  title: string;
  detail?: string;
  selected?: boolean;
  onPress: () => void;
  trailing?: React.ReactNode;
  last?: boolean;
}) {
  const { c, space, rule } = useTheme();
  return (
    <View>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected: Boolean(selected) }}
        accessibilityLabel={title}
        accessibilityHint={detail}
        onPress={onPress}
        style={{
          minHeight: 62,
          justifyContent: 'center',
          paddingVertical: space.md,
          paddingLeft: selected ? space.md : space.md + rule.edge,
          paddingRight: space.md,
          backgroundColor: selected ? c.detBg : 'transparent',
          borderLeftWidth: selected ? rule.edge : 0,
          borderLeftColor: c.det,
        }}>
        <SplitRow>
          <View style={{ flexShrink: 1, gap: 2 }}>
            <Title size={15.5} weight={selected ? '700' : '600'}>
              {title}
            </Title>
            {detail ? (
              <Mono size={10.5} tone="ink3">
                {detail}
              </Mono>
            ) : null}
          </View>
          {trailing ?? (selected ? <Icon name="check" size={16} color={c.det} weight={2.6} /> : null)}
        </SplitRow>
      </Pressable>
      {!last && <Hairline />}
    </View>
  );
}

/** The ± square beside a stepper. Hoisted so it is not remounted per render. */
function NudgeButton({ dir, label, onPress }: { dir: -1 | 1; label: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${dir > 0 ? 'Increase' : 'Decrease'} ${label}`}
      onPress={onPress}
      style={{
        width: 46,
        height: 46,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: c.rule,
        backgroundColor: c.surface,
      }}>
      {dir > 0 ? (
        <Icon name="plus" size={16} color={c.ink} />
      ) : (
        // A minus glyph would be the only 1px-tall icon in the set; a rule is
        // the same mark, drawn the way the rest of the design draws marks.
        <View style={{ width: 14, height: 2, backgroundColor: c.ink }} />
      )}
    </Pressable>
  );
}

/**
 * A stepper for a whole number with a unit — weight, height, a calorie target.
 * The buttons exist because a nudge of ±1 through a keyboard is four taps and
 * a dismissed keyboard.
 */
export function Stepper({
  label,
  value,
  unit,
  step = 1,
  min,
  max,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  unit: string;
  step?: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  const { space } = useTheme();
  const nudge = (d: number) => {
    const next = value + d * step;
    if (min !== undefined && next < min) return;
    if (max !== undefined && next > max) return;
    onChange(next);
  };

  return (
    <View style={{ gap: 8 }}>
      <SplitRow align="flex-end">
        <View style={{ gap: 3, flexShrink: 1 }}>
          <Eyebrow size={10} tone="ink2">
            {label}
          </Eyebrow>
          <Row gap={6} align="baseline">
            <Num size={30} weight="600" tone="ink">
              {value.toLocaleString('en-US')}
            </Num>
            <Mono size={12} tone="ink2">
              {unit}
            </Mono>
          </Row>
        </View>
        <Row gap={space.sm}>
          <NudgeButton dir={-1} label={label} onPress={() => nudge(-1)} />
          <NudgeButton dir={1} label={label} onPress={() => nudge(1)} />
        </Row>
      </SplitRow>
      {hint ? (
        <Body size={13} tone="ink2">
          {hint}
        </Body>
      ) : null}
    </View>
  );
}

/** Onboarding progress. Six segments, filled left to right. */
export function StepBar({ step, of }: { step: number; of: number }) {
  const { c, space } = useTheme();
  return (
    <Row
      gap={6}
      accessibilityLabel={`Step ${step} of ${of}`}
      style={{ paddingHorizontal: space.gutter, paddingTop: 6, paddingBottom: space.lg }}>
      {Array.from({ length: of }, (_, i) => (
        <View
          key={i}
          style={{ height: 3, flexGrow: 1, backgroundColor: i < step ? c.heavy : c.rule }}
        />
      ))}
    </Row>
  );
}
