import React, { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardTypeOptions, TextInput, TextInputProps, View } from 'react-native';
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
 * A text field: sunk below the surface it sits on, and outlined at rest.
 *
 * The outline is what tells you where to tap before you have tapped. It used to
 * be transparent until focus, which worked when a field's fill was the lightest
 * thing on a light screen — on this palette a field is DARKER than everything
 * around it, and an unoutlined dark rectangle on a dark page is a hole rather
 * than a control.
 *
 * The width stays 2 in every state and only the colour changes. Growing a
 * border on focus reflows the row by a pixel, which is small enough to look
 * like a rendering fault and large enough to see.
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

  const ring = problem ? c.attention : focused ? c.primary : c.borderStrong;

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

const SEGMENT_PAD = 4;
const SEGMENT_GAP = 4;

/**
 * A segmented control whose indicator actually slides.
 *
 * It claimed to for a long time and did not: the thumb was a background colour
 * on whichever option was selected, so it blinked from one to the other. A
 * slide is worth the measuring pass because it shows DIRECTION — the eye
 * follows the box to where the selection went, rather than being told after
 * the fact that it is somewhere else now.
 *
 * The width has to be measured because the track is fluid; until it is, the
 * thumb is placed without animating, so the first paint does not slide in from
 * the left on a screen the user has only just opened.
 */
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
  const { c, radius, motion, elevation } = useTheme();
  const [width, setWidth] = useState(0);

  const index = Math.max(0, options.findIndex(o => o.value === value));
  const segment =
    width > 0
      ? (width - SEGMENT_PAD * 2 - SEGMENT_GAP * (options.length - 1)) / options.length
      : 0;

  const x = useRef(new Animated.Value(0)).current;
  const placed = useRef(false);

  useEffect(() => {
    if (segment <= 0) return;
    const to = index * (segment + SEGMENT_GAP);

    if (!placed.current) {
      // First measurement. Jump, do not travel.
      placed.current = true;
      x.setValue(to);
      return;
    }
    Animated.spring(x, { toValue: to, ...motion.spring.press, useNativeDriver: true }).start();
  }, [index, segment, x, motion]);

  return (
    <Stack gap={10}>
      {label ? (
        <Txt role="labelSm" tone="secondary" caps style={{ letterSpacing: 1.1 }}>
          {label}
        </Txt>
      ) : null}
      <View
        onLayout={e => setWidth(e.nativeEvent.layout.width)}
        style={{
          flexDirection: 'row',
          backgroundColor: c.sunken,
          borderRadius: radius.pill,
          padding: SEGMENT_PAD,
          gap: SEGMENT_GAP,
        }}>
        {/* One thumb that moves, behind the labels — not a fill on each option.
            Absolute so the row's own layout is untouched by it. */}
        {segment > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: SEGMENT_PAD,
              left: SEGMENT_PAD,
              width: segment,
              height: 48,
              borderRadius: radius.pill,
              // The brand tint, which is what `primarySoft` is for — the token
              // lists selected chips by name. A neutral thumb was a step of
              // eight points off the track it sits in, so the control worked
              // and never looked chosen; this one is unmistakably picked.
              backgroundColor: c.primarySoft,
              transform: [{ translateX: x }],
              ...elevation.e1,
            }}
          />
        ) : null}

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
                height: 48,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              {/* Uppercase and letterspaced, the voice the rest of the flow
                  uses for a label. The colour moves with the thumb rather than
                  after it — both are driven by the same `active`. */}
              <Txt
                role="labelSm"
                caps
                color={active ? c.primarySoftInk : c.inkSecondary}
                style={{ letterSpacing: 1.1 }}>
                {o.label}
              </Txt>
            </Press>
          );
        })}
      </View>
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
  onHold,
  onRelease,
}: {
  dir: -1 | 1;
  label: string;
  disabled: boolean;
  onPress: () => void;
  /** Press-down. Steps once and starts the repeat. */
  onHold: () => void;
  onRelease: () => void;
}) {
  const { c, radius } = useTheme();
  return (
    <Press
      onPress={onPress}
      onPressIn={onHold}
      // Both, and deliberately: a lift cancels the repeat, and a finger that
      // slides off the button lands here too. Missing either leaves a control
      // counting on its own.
      onPressOut={onRelease}
      disabled={disabled}
      haptic="select"
      accessibilityLabel={`${dir > 0 ? 'Increase' : 'Decrease'} ${label}`}
      accessibilityHint="Hold to keep changing it."
      style={{
        width: 48,
        height: 48,
        borderRadius: radius.pill,
        // Sunken, not the accent. These are buttons, and buttons in this app
        // are not the accent colour — see Button. Sunken reads against both
        // surfaces a stepper sits on: a card, and the canvas.
        backgroundColor: c.sunken,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {dir > 0 ? (
        <Icon name="plus" size={20} color={disabled ? c.inkTertiary : c.ink} weight={2.4} />
      ) : (
        // A minus glyph would be the only 1px-tall icon in the set.
        <View
          style={{
            width: 16,
            height: 2.4,
            borderRadius: 2,
            backgroundColor: disabled ? c.inkTertiary : c.ink,
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
  /**
   * Draws its own card and enlarges the value.
   *
   * Off by default because three of the four callers already sit inside a
   * card, and a card in a card is two edges describing one object. On by
   * default it would have quietly nested them.
   */
  framed?: boolean;
};

/**
 * A numeric stepper: the value large enough to be the subject, and ± targets
 * that repeat while held.
 *
 * The repeat is the whole point on a screen of these. Every value here is one
 * somebody arrives knowing — a weight is 78, not "a few more than the default"
 * — so the distance from 70 to 85 is not exploration, it is transcription, and
 * at one tap per kilo it is fifteen taps of it. Held, the same move is a
 * second and a half.
 *
 * It accelerates rather than running flat: slow enough at the start that a
 * deliberate single step is still a single step, then quick enough that a long
 * distance does not become a test of patience.
 */
export function Stepper({ label, value, unit, step = 1, min, max, onChange, hint, framed }: StepperProps) {
  const { c, space, radius, text, tabular } = useTheme();

  // The live value, so a repeat reads its own last result rather than the one
  // captured when the finger went down.
  const latest = useRef(value);
  latest.current = value;

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * What is in the box while it is being typed in, or null when it is not.
   *
   * Typing needs its own state because the field passes through values the
   * parent must not be told about: reaching 85 from empty goes through 8, and
   * 8 is below every minimum on this screen. Committing that would clamp them
   * to 30 mid-word and make the number impossible to type.
   */
  const [typing, setTyping] = useState<string | null>(null);

  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  // Every path out of this component clears the timer. A repeat that outlived
  // its screen would keep calling a setter on an unmounted form.
  useEffect(() => stop, []);

  const clamp = (n: number) => {
    if (min !== undefined && n < min) return min;
    if (max !== undefined && n > max) return max;
    return n;
  };

  const nudge = (dir: -1 | 1) => {
    const next = clamp(latest.current + dir * step);
    if (next === latest.current) return false;
    latest.current = next;
    // A step abandons whatever was half-typed: the buttons move the real
    // value, and leaving stale text over it would show two different numbers.
    setTyping(null);
    onChange(next);
    return true;
  };

  const type = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, '').slice(0, 6);
    setTyping(digits);

    // Committed as soon as it is a number that is allowed to exist, so the
    // value is right even if they never blur — tapping Continue straight from
    // the keyboard is the common way out of this screen.
    const n = Number(digits);
    if (digits === '' || !Number.isFinite(n)) return;
    if (n !== clamp(n)) return;
    latest.current = n;
    onChange(n);
  };

  /** Out of the box: clamp whatever is left, and go back to showing the value. */
  const settle = () => {
    if (typing !== null && typing !== '') {
      const n = clamp(Number(typing));
      if (Number.isFinite(n) && n !== latest.current) {
        latest.current = n;
        onChange(n);
      }
    }
    setTyping(null);
  };

  /**
   * True once a touch has been handled on the way DOWN, so the press that ends
   * it does not count twice.
   *
   * The stepping happens on press-in, which is what makes it feel like a
   * physical button and is the only order-independent place to put it: RN has
   * moved which of `onPress` and `onPressOut` fires first between versions, so
   * anything that subtracts one from the other is a coin toss.
   *
   * `onPress` still steps when this is false, and that is the accessibility
   * path — a screen reader activating the button raises `onPress` alone, with
   * no press-in before it, and would otherwise do nothing at all.
   */
  const handled = useRef(false);

  /** Press-down: one step now, a pause, then an accelerating run flooring at 40ms. */
  const hold = (dir: -1 | 1) => {
    handled.current = true;
    nudge(dir);

    let delay = 380;
    const tick = () => {
      if (!nudge(dir)) return stop();
      delay = Math.max(40, delay * 0.82);
      timer.current = setTimeout(tick, delay);
    };
    timer.current = setTimeout(tick, delay);
  };

  const activate = (dir: -1 | 1) => {
    if (handled.current) {
      handled.current = false;
      return;
    }
    nudge(dir);
  };

  const atMin = min !== undefined && value - step < min;
  const atMax = max !== undefined && value + step > max;

  return (
    <View
      style={
        framed
          ? {
              backgroundColor: c.surface,
              borderRadius: radius.lg,
              // Card's own padding, so a framed stepper and a Card in the same
              // column are the same object at the same inset.
              padding: space.xl,
              gap: 10,
            }
          : { gap: 10 }
      }>
      <Split align="center">
        <Stack gap={3} style={{ flexShrink: 1 }}>
          <Txt role="labelSm" tone="secondary" caps style={{ letterSpacing: 1.1 }}>
            {label}
          </Txt>
          <Row gap={6} align="baseline">
            {/* Typed as well as stepped. A value somebody already knows should
                not have to be walked to — and the ± stay because the other
                half of the time this is a nudge, not a number.

                Tabular, so a digit rolling over under a held button does not
                shift the unit beside it. */}
            <TextInput
              value={typing ?? value.toLocaleString('en-US')}
              onChangeText={type}
              onBlur={settle}
              onSubmitEditing={settle}
              keyboardType="number-pad"
              returnKeyType="done"
              // Tap the number and the whole thing is selected, so replacing it
              // is one keystroke rather than six backspaces.
              selectTextOnFocus
              accessibilityLabel={`${label}, ${value} ${unit}`}
              style={[
                text.h1,
                tabular,
                framed ? { fontSize: 34, lineHeight: 39 } : null,
                {
                  color: c.ink,
                  padding: 0,
                  // Android gives a TextInput its own vertical slack, which
                  // puts the baseline off the unit sitting next to it.
                  margin: 0,
                  minWidth: 40,
                },
              ]}
            />
            <Txt role="body" tone="secondary">
              {unit}
            </Txt>
          </Row>
        </Stack>
        <Row gap={space.md}>
          <Nudge dir={-1} label={label} disabled={atMin} onPress={() => activate(-1)} onHold={() => hold(-1)} onRelease={stop} />
          <Nudge dir={1} label={label} disabled={atMax} onPress={() => activate(1)} onHold={() => hold(1)} onRelease={stop} />
        </Row>
      </Split>
      {hint ? (
        <Txt role="bodySm" tone="secondary">
          {hint}
        </Txt>
      ) : null}
    </View>
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
            // borderStrong, not sunken. Sunken clears the canvas by about five
            // points — enough to read as a well inside a card, nowhere near
            // enough for a 4pt bar drawn on the page itself, which left the
            // steps still to come invisible and the bar looking like a stray
            // accent rule.
            backgroundColor: i < step ? c.primary : c.borderStrong,
          }}
        />
      ))}
    </Row>
  );
}
