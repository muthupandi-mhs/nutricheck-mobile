import React, { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardTypeOptions, TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Icon, IconName } from './Icon';
import { Row, Split, Stack } from './Layout';
import { Card, type Fill } from './Card';
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
  /**
   * A hard stop, and the field says so before it is hit: within the last tenth
   * of the allowance the hint is replaced by what is left. A `maxLength` on its
   * own is silent, and a keyboard that stops accepting letters without saying
   * why is indistinguishable from one that has frozen.
   */
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
/**
 * The shortest cap worth counting down from. Above every numeric field in the
 * app and below every prose one, which is the line it is drawn on.
 */
const COUNT_FROM = 24;

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

  /**
   * How much is left, once there is little enough left to be worth saying.
   *
   * A tenth of the allowance, floored at ten characters — proportional alone
   * would start counting an email address down from 25 remaining, and a flat
   * number would never appear on a field capped at 12.
   */
  const left = maxLength == null ? null : maxLength - value.length;
  const counting =
    left !== null &&
    maxLength != null &&
    // Counting is for prose. On a field capped at six because it holds grams,
    // a countdown is noise from the first keystroke — the bound that matters
    // there is the value, and the schema says that one in words.
    maxLength >= COUNT_FROM &&
    left <= Math.max(10, Math.round(maxLength / 10));

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
      ) : counting ? (
        // Ahead of the hint rather than beside it. Running out of room is the
        // more useful of the two things to know at the point it is true, and a
        // second line appearing under a field pushes whatever is below it down
        // mid-keystroke.
        <Txt
          role="caption"
          tone={left === 0 ? 'attention' : 'tertiary'}
          accessibilityLiveRegion="polite">
          {left === 0 ? 'That is as long as this can be.' : `${left} characters left`}
        </Txt>
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
              // Ink, the same fill a button gets. There is no check here and no
              // second cue — the thumb IS the answer to "which one is picked",
              // so it has to be the loudest thing the palette makes rather than
              // a tint a few points off the track it sits in.
              backgroundColor: c.ink,
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
                color={active ? c.canvas : c.inkSecondary}
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

/**
 * One answer to a single-choice question, as its own card.
 *
 * It used to be a row in a shared well, with `first`/`last` rounding the ends
 * of the group. Separate cards say the same thing with less furniture: a run of
 * them reads as a set of things you pick between rather than a list you scroll,
 * and it matches how the step before frames each question.
 *
 * Selected is an ink outline plus a check. The border is 2 in both states and
 * only its colour moves — growing one on selection would shift the row by two
 * points and nudge everything under it.
 */
export function OptionRow({
  title,
  detail,
  leading,
  showDetail,
  selected,
  onPress,
}: {
  title: string;
  /**
   * The sub-line. Optional, and where it is left off it should still be passed
   * — it becomes the accessibility hint, which is the one reader that has room
   * for it whether or not the card shows it.
   */
  detail?: string;
  /** A glyph before the label. Sized by the caller, since only it knows what it means. */
  leading?: React.ReactNode;
  /** Draws `detail` under the title. Off by default; the hint carries it either way. */
  showDetail?: boolean;
  selected?: boolean;
  onPress: () => void;
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
        backgroundColor: c.surface,
        borderRadius: radius.lg,
        borderWidth: 2,
        borderColor: selected ? c.ink : 'transparent',
      }}>
      <Split gap={space.md}>
        <Row gap={space.lg} style={{ flexShrink: 1 }}>
          {leading}
          <Stack gap={3} style={{ flexShrink: 1 }}>
            <Txt role="h3" color={c.ink}>
              {title}
            </Txt>
            {showDetail && detail ? (
              <Txt role="bodySm" tone="secondary">
                {detail}
              </Txt>
            ) : null}
          </Stack>
        </Row>
        {selected ? <Icon name="check" size={20} color={c.ink} weight={2.4} /> : null}
      </Split>
    </Press>
  );
}

/** The circular +/- beside a stepper. Hoisted so it is not remounted per render. */
/**
 * What a half-typed decimal is allowed to look like.
 *
 * Out of the component because it is a pure string rule with four cases worth
 * naming, and burying them in an onChangeText handler is where "78,4" quietly
 * stops working:
 *
 *   • **A comma is a decimal point.** Half the world's keypads print one where
 *     the other half prints the other. Dropping the key somebody's phone gave
 *     them makes a field they cannot type their weight into, for a reason they
 *     cannot see.
 *   • **Only the first separator survives.** "78.4.2" is 78.4, not NaN.
 *   • **The fraction is truncated, never rounded.** Rounding mid-keystroke
 *     moves digits the user has not finished typing.
 *   • **A trailing point is kept.** "78." is a number on its way to being one,
 *     and deleting the point they just pressed makes the key look broken.
 */
function decimalDigits(raw: string, decimals: number): string {
  const cleaned = raw.replace(/,/g, '.').replace(/[^0-9.]/g, '');
  const [whole = '', ...fraction] = cleaned.split('.');
  // Four, where the value is bounded at three: this stops a paste rendering a
  // paragraph across the card, and `settle` is what enforces min and max.
  const head = whole.slice(0, 4);
  return fraction.length === 0 ? head : `${head}.${fraction.join('').slice(0, decimals)}`;
}

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
  /**
   * Decimal places the value carries. Zero — a whole number — everywhere but a
   * body weight.
   *
   * A property of the stepper rather than of the caller's formatting, because
   * three things have to agree about it: what the keypad offers, what the typed
   * text is allowed to contain, and what a `step` of 0.1 rounds to. Left to the
   * caller, a typed "78.4" is stripped to 784 and refused, and eight taps of +
   * produce 78.30000000000001.
   */
  decimals?: number;
  hint?: string;
  /**
   * Draws its own card and enlarges the value.
   *
   * Off by default because three of the four callers already sit inside a
   * card, and a card in a card is two edges describing one object. On by
   * default it would have quietly nested them.
   */
  framed?: boolean;
  /**
   * What the frame is filled with. `framed` only.
   *
   * Passed through rather than fixed at `surface`, because a card's edge in
   * this app is the STEP between its fill and whatever it sits on — so the
   * right fill depends on the surface underneath. On the page that is
   * `surface` over canvas; inside a sheet, which is already `surface`, the
   * same choice would draw a card that cannot be seen, and `sunken` is the
   * step that reads there.
   */
  fill?: Fill;
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
export function Stepper({
  label,
  value,
  unit,
  step = 1,
  min,
  max,
  onChange,
  decimals = 0,
  hint,
  framed,
  fill = 'surface',
}: StepperProps) {
  const { c, space, text, tabular } = useTheme();

  // The live value, so a repeat reads its own last result rather than the one
  // captured when the finger went down.
  const latest = useRef(value);
  latest.current = value;

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Whether a finger is currently down on one of the ± buttons.
   *
   * The repeat checks this before every step rather than trusting that it will
   * be told to stop. `onPressOut` is the normal way a run ends and it is NOT
   * guaranteed to arrive: React Native does not deliver it when a Pressable is
   * disabled mid-press, which is exactly what happens when a held button walks
   * the value into `min` or `max`.
   */
  const holding = useRef(false);

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
    holding.current = false;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  // Every path out of this component clears the timer. A repeat that outlived
  // its screen would keep calling a setter on an unmounted form.
  useEffect(() => stop, []);

  /**
   * Rounded to the declared precision on every path that produces a number.
   *
   * Binary floating point is the reason: 78.4 - 0.1 is 78.30000000000001, and
   * a run of held taps otherwise renders a value nobody typed and no scale
   * ever reported.
   */
  const round = (n: number) => (decimals > 0 ? Number(n.toFixed(decimals)) : n);

  const clamp = (n: number) => {
    if (min !== undefined && n < min) return round(min);
    if (max !== undefined && n > max) return round(max);
    return round(n);
  };

  /** What the box shows when it is not being typed in. */
  const format = (n: number) =>
    n.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  const nudge = (dir: -1 | 1) => {
    const next = clamp(round(latest.current + dir * step));
    if (next === latest.current) return false;
    latest.current = next;
    // A step abandons whatever was half-typed: the buttons move the real
    // value, and leaving stale text over it would show two different numbers.
    setTyping(null);
    onChange(next);
    return true;
  };

  const type = (raw: string) => {
    const digits = decimals > 0 ? decimalDigits(raw, decimals) : raw.replace(/[^0-9]/g, '').slice(0, 6);
    setTyping(digits);

    // Committed as soon as it is a number that is allowed to exist, so the
    // value is right even if they never blur — tapping Continue straight from
    // the keyboard is the common way out of this screen.
    // "78." is a number on its way to being one. Number() reads it as 78, and
    // committing that fights the next keystroke.
    if (digits === '' || digits.endsWith('.')) return;
    const n = Number(digits);
    if (!Number.isFinite(n)) return;
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
    /**
     * Kill any run still going before starting another, and this line is the
     * whole of a bug that made the stepper count on its own forever.
     *
     * `timer.current` holds ONE handle. A second press-in that arrives without
     * its press-out — a finger that slid off and back on, a re-render between
     * the two halves of a press — used to overwrite it, and the chain it
     * replaced went on ticking with nothing left to cancel it by. `stop()`
     * could then only ever reach the newest run, so the orphan incremented
     * until the value hit its bound, or forever where there was no bound.
     */
    stop();

    handled.current = true;
    holding.current = true;
    nudge(dir);

    let delay = 380;
    const tick = () => {
      // Two ways to end: the finger came up, or the value stopped moving
      // because it reached `min` or `max`. Checking the finger FIRST is what
      // makes a missed `onPressOut` cost one extra step instead of a runaway.
      if (!holding.current || !nudge(dir)) return stop();
      delay = Math.max(40, delay * 0.82);
      timer.current = setTimeout(tick, delay);
    };
    timer.current = setTimeout(tick, delay);
  };

  const activate = (dir: -1 | 1) => {
    if (handled.current) {
      handled.current = false;
      // A completed press ends the run. `onPress` fires after `onPressOut` on
      // release, so this is normally redundant — and it is the second chance
      // that matters, because the two do not always both arrive.
      stop();
      return;
    }
    nudge(dir);
  };

  const atMin = min !== undefined && value - step < min;
  const atMax = max !== undefined && value + step > max;

  const body = (
    <View style={{ gap: 10 }}>
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
              value={typing ?? format(value)}
              onChangeText={type}
              onBlur={settle}
              onSubmitEditing={settle}
              // 'decimal-pad' only where there is a decimal to type: the plain
              // number pad has no separator key at all, so a weight typed on
              // one could never be anything but whole.
              keyboardType={decimals > 0 ? 'decimal-pad' : 'number-pad'}
              returnKeyType="done"
              // Wider than any value this takes — heights, weights and
              // calories all fit in four digits. It is here to stop a paste
              // rendering a paragraph at 34px across the card, not to bound
              // the number: `settle` clamps that to min and max.
              maxLength={7}
              // A caret where the finger landed, not the whole value selected.
              // Selecting all made replacing a number one keystroke, at the
              // price of showing a filled block over it every time it was
              // touched — and most touches here are a correction to one digit,
              // not a new number, so the block was in the way of the common
              // case to speed up the rarer one.
              cursorColor={c.ink}
              // Only reached by deliberately long-pressing to select now.
              // Android picks its own otherwise, which is a teal this app uses
              // nowhere.
              selectionColor={c.primary}
              accessibilityLabel={`${label}, ${format(value)} ${unit}`}
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

  /**
   * The frame is a Card, not a rectangle drawn here.
   *
   * It was the latter, and it was a copy: the same radius, the same `space.xl`
   * inset and the same surface, maintained separately from the component whose
   * whole job is that shape. Going through Card is also what gets `tint` for
   * nothing — one gradient, defined once, rather than a second one here that
   * has to be kept in step with it.
   */
  return framed ? <Card fill={fill}>{body}</Card> : body;
}

