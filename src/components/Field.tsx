import React, { useState } from 'react';
import { KeyboardTypeOptions, TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Icon, IconName } from './Icon';
import { Row, Split, Stack } from './Layout';
import { Press } from './Press';
import { Txt } from './Text';

/**
 * Named rather than inline so the form layer can wrap this component without
 * restating fifteen props. `src/forms/fields.tsx` takes everything here except
 * the four a `Controller` owns: value, change, blur and problem.
 */
export type FieldProps = {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  /** Called when the field loses focus, on top of dropping the focus ring. */
  onBlur?: () => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  suffix?: string;
  icon?: IconName;
  autoFocus?: boolean;
  maxLength?: number;
  secure?: boolean;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  /** The reason this field is blocking, said in words. Turns the ring amber. */
  problem?: string | null;
  /** Neutral guidance shown when there is no problem. */
  hint?: string;
  multiline?: boolean;
  minHeight?: number;
  onSubmitEditing?: () => void;
  returnKeyType?: TextInputProps['returnKeyType'];
  accessibilityHint?: string;
};

/**
 * A text field. Filled rather than outlined, so stacked forms stay quiet. Focus
 * raises it to `surface` and draws a 2pt primary ring.
 */
export function Field({
  label,
  value,
  onChangeText,
  onBlur,
  placeholder,
  keyboardType,
  suffix,
  icon,
  autoFocus,
  maxLength,
  secure,
  autoCapitalize = 'sentences',
  autoComplete,
  textContentType,
  problem,
  hint,
  multiline,
  minHeight,
  onSubmitEditing,
  returnKeyType,
  accessibilityHint,
}: FieldProps) {
  const { c, radius, space, text } = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const ring = problem ? c.attention : focused ? c.primary : 'transparent';

  return (
    <Stack gap={8}>
      {label ? (
        <Txt role="labelSm" tone="secondary">
          {label}
        </Txt>
      ) : null}

      <Row
        gap={space.md}
        align={multiline ? 'flex-start' : 'center'}
        style={{
          backgroundColor: focused || problem ? c.surface : c.sunken,
          borderRadius: radius.md,
          borderWidth: 2,
          borderColor: ring,
          minHeight: minHeight ?? 56,
          paddingHorizontal: space.lg,
          paddingVertical: multiline ? space.lg : 0,
        }}>
        {icon && <Icon name={icon} size={19} color={c.inkTertiary} />}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.inkTertiary}
          keyboardType={keyboardType}
          autoFocus={autoFocus}
          maxLength={maxLength}
          secureTextEntry={secure && !revealed}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          textContentType={textContentType}
          autoCorrect={!secure}
          multiline={multiline}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          selectionColor={c.primary}
          accessibilityLabel={label}
          accessibilityHint={accessibilityHint}
          style={[
            text.bodyLg,
            {
              flexGrow: 1,
              flexShrink: 1,
              color: c.ink,
              padding: 0,
              textAlignVertical: multiline ? 'top' : 'center',
            },
          ]}
        />

        {/* Reveal, not a strength meter. Being able to check what you typed is
            what actually reduces failed sign-ins on a phone keyboard. */}
        {secure ? (
          <Press
            onPress={() => setRevealed(r => !r)}
            feedback="fade"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            hitSlop={{ top: 14, bottom: 14, left: 12, right: 8 }}>
            <Txt role="labelSm" tone="primary">
              {revealed ? 'Hide' : 'Show'}
            </Txt>
          </Press>
        ) : null}

        {suffix ? (
          <Txt role="label" tone="tertiary">
            {suffix}
          </Txt>
        ) : null}
      </Row>

      {problem ? (
        <Row gap={6} align="flex-start" accessibilityLiveRegion="polite">
          <View style={{ paddingTop: 1 }}>
            <Icon name="alert" size={13} color={c.attention} weight={2.1} />
          </View>
          <Txt role="caption" tone="attention" style={{ flexShrink: 1 }}>
            {problem}
          </Txt>
        </Row>
      ) : hint ? (
        <Txt role="caption" tone="tertiary">
          {hint}
        </Txt>
      ) : null}
    </Stack>
  );
}

/** A segmented control. The indicator slides rather than cross-fades, so it shows direction. */
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
  const { c, radius, space, elevation } = useTheme();

  return (
    <Stack gap={8}>
      {label ? (
        <Txt role="labelSm" tone="secondary">
          {label}
        </Txt>
      ) : null}
      <Row
        style={{
          backgroundColor: c.sunken,
          borderRadius: radius.pill,
          padding: 4,
          gap: 4,
        }}>
        {options.map(o => {
          const active = o.value === value;
          return (
            <Press
              key={o.value}
              onPress={() => onChange(o.value)}
              haptic="select"
              feedback="none"
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={o.label}
              style={{
                flexGrow: 1,
                flexBasis: 0,
                height: 42,
                borderRadius: radius.pill,
                backgroundColor: active ? c.surface : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                ...(active ? elevation.e1 : {}),
              }}>
              <Txt role="labelSm" tone={active ? 'ink' : 'secondary'}>
                {o.label}
              </Txt>
            </Press>
          );
        })}
      </Row>
      <View style={{ height: space.xs / 2 }} />
    </Stack>
  );
}

/** A full-width choice row inside a card. Check mark, never a radio circle. */
export function OptionRow({
  title,
  detail,
  selected,
  onPress,
  first,
  last,
}: {
  title: string;
  detail?: string;
  selected?: boolean;
  onPress: () => void;
  first?: boolean;
  last?: boolean;
}) {
  const { c, space, radius } = useTheme();
  return (
    <Press
      onPress={onPress}
      haptic="select"
      feedback="none"
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      accessibilityLabel={title}
      accessibilityHint={detail}
      style={{
        minHeight: 68,
        justifyContent: 'center',
        paddingVertical: space.lg,
        paddingHorizontal: space.xl,
        backgroundColor: selected ? c.primarySoft : 'transparent',
        borderTopLeftRadius: first ? radius.lg : 0,
        borderTopRightRadius: first ? radius.lg : 0,
        borderBottomLeftRadius: last ? radius.lg : 0,
        borderBottomRightRadius: last ? radius.lg : 0,
      }}>
      <Split gap={space.md}>
        <Stack gap={3} style={{ flexShrink: 1 }}>
          <Txt role="h3" color={selected ? c.primarySoftInk : c.ink}>
            {title}
          </Txt>
          {detail ? (
            <Txt role="bodySm" tone="secondary">
              {detail}
            </Txt>
          ) : null}
        </Stack>
        {selected ? <Icon name="check" size={20} color={c.primary} weight={2.4} /> : null}
      </Split>
    </Press>
  );
}

/** The circular +/- beside a stepper. Hoisted so it is not remounted per render. */
function Nudge({
  dir,
  label,
  disabled,
  onPress,
}: {
  dir: -1 | 1;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const { c, radius } = useTheme();
  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      haptic="select"
      accessibilityLabel={`${dir > 0 ? 'Increase' : 'Decrease'} ${label}`}
      style={{
        width: 48,
        height: 48,
        borderRadius: radius.pill,
        backgroundColor: disabled ? c.sunken : c.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {dir > 0 ? (
        <Icon name="plus" size={20} color={disabled ? c.inkTertiary : c.primarySoftInk} weight={2.4} />
      ) : (
        // A minus glyph would be the only 1px-tall icon in the set.
        <View
          style={{
            width: 16,
            height: 2.4,
            borderRadius: 2,
            backgroundColor: disabled ? c.inkTertiary : c.primarySoftInk,
          }}
        />
      )}
    </Press>
  );
}

export type StepperProps = {
  label: string;
  value: number;
  unit: string;
  step?: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  hint?: string;
};

/** A numeric stepper. The ± targets exist because a one-kilo nudge via keyboard is four taps. */
export function Stepper({ label, value, unit, step = 1, min, max, onChange, hint }: StepperProps) {
  const { space } = useTheme();

  const nudge = (dir: -1 | 1) => {
    const next = value + dir * step;
    if (min !== undefined && next < min) return;
    if (max !== undefined && next > max) return;
    onChange(next);
  };

  const atMin = min !== undefined && value - step < min;
  const atMax = max !== undefined && value + step > max;

  return (
    <Stack gap={10}>
      <Split align="center">
        <Stack gap={2} style={{ flexShrink: 1 }}>
          <Txt role="labelSm" tone="secondary">
            {label}
          </Txt>
          <Row gap={6} align="baseline">
            <Txt role="h1" numeric>
              {value.toLocaleString('en-US')}
            </Txt>
            <Txt role="body" tone="secondary">
              {unit}
            </Txt>
          </Row>
        </Stack>
        <Row gap={space.md}>
          <Nudge dir={-1} label={label} disabled={atMin} onPress={() => nudge(-1)} />
          <Nudge dir={1} label={label} disabled={atMax} onPress={() => nudge(1)} />
        </Row>
      </Split>
      {hint ? (
        <Txt role="bodySm" tone="secondary">
          {hint}
        </Txt>
      ) : null}
    </Stack>
  );
}

/** Onboarding progress. A single rounded track with a filled portion. */
export function StepBar({ step, of }: { step: number; of: number }) {
  const { c, radius, space } = useTheme();
  return (
    <Row
      gap={6}
      accessibilityLabel={`Step ${step} of ${of}`}
      style={{ paddingHorizontal: space.gutter, paddingTop: space.sm, paddingBottom: space.xl }}>
      {Array.from({ length: of }, (_, i) => (
        <View
          key={i}
          style={{
            height: 4,
            flexGrow: 1,
            borderRadius: radius.pill,
            backgroundColor: i < step ? c.primary : c.sunken,
          }}
        />
      ))}
    </Row>
  );
}
