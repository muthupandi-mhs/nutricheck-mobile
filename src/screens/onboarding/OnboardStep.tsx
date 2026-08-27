import React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StepBar } from '../../components/Field';
import { KeyboardAvoid } from '../../components/KeyboardAvoid';
import { Gap, Gutter } from '../../components/Layout';
import { Screen } from '../../components/Screen';
import { Txt } from '../../components/Text';
import { useTheme } from '../../theme/ThemeProvider';

export const STEPS = 6;

/**
 * The scaffold every onboarding step is built on.
 *
 * One surface, not two. It used to put the controls on a `surface` sheet with
 * rounded top corners over the canvas, which is how the app drew a "the part
 * you act on" boundary before cards were flattened — and it now reads as the
 * one place left where a panel is pinned over the page for decoration.
 *
 * So the header, the controls and the button all sit on the canvas, and the
 * only things that lift off it are the cards that hold grouped options. The
 * boundary that used to be a sheet edge is the scroll itself.
 *
 * The brand field is deliberately absent — a mark above a form is decoration
 * where the header has a job to do, and these screens are already asking for
 * the user's height.
 */
export function OnboardStep({
  step,
  title,
  subtitle,
  children,
  footer,
}: {
  step: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Pinned to the bottom of the sheet, on its own fill. */
  footer: React.ReactNode;
}) {
  const { space } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Screen style={{ paddingBottom: 0 }}>
      <StepBar step={step} of={STEPS} />

      <Gutter>
        {/* Uppercase and letterspaced, matching the field labels in the auth
            flow — the same voice for the same kind of small structural note. */}
        <Txt role="caption" tone="tertiary" caps style={{ letterSpacing: 1.1 }}>
          Step {step} of {STEPS}
        </Txt>
        <Gap h={space.sm} />
        <Txt role="h1">{title}</Txt>
        {subtitle ? (
          <>
            <Gap h={space.sm} />
            <Txt role="bodyLg" tone="secondary">
              {subtitle}
            </Txt>
          </>
        ) : null}
      </Gutter>

      <Gap h={space.xl} />

      {/* These steps had no text input until the steppers became typeable, so
          they had no reason to avoid a keyboard. They do now: the footer is
          pinned outside the scroll, and on Android the window no longer
          resizes under it — see KeyboardAvoid for why. Without this the
          Continue button sits behind the keypad the moment a value is tapped. */}
      <KeyboardAvoid>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: space.xl }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>

        {/* No fill of its own. On a sheet it needed one to read as the sheet's
            bottom edge; on the canvas that fill would be the only thing on the
            screen pretending to be a bar. */}
        <View
          style={{
            paddingHorizontal: space.gutter,
            paddingTop: space.sm,
            paddingBottom: Math.max(insets.bottom, space.lg) + space.xs,
          }}>
          {footer}
        </View>
      </KeyboardAvoid>
    </Screen>
  );
}

/** A titled group of controls on the sheet. Replaces the cards these screens used. */
export function StepGroup({
  label,
  children,
  divided,
}: {
  label?: string;
  children: React.ReactNode;
  /** Wraps the run in a card — for option lists, which need an edge. */
  divided?: boolean;
}) {
  const { c, space, radius } = useTheme();

  return (
    <View>
      {label ? (
        <>
          <Txt role="labelSm" tone="secondary" caps style={{ letterSpacing: 1.1 }}>
            {label}
          </Txt>
          <Gap h={space.md} />
        </>
      ) : null}
      {divided ? (
        /* `surface` and no border, like every other card. It used to be a
           sunken well with a hairline, and sunken clears this canvas by about
           five points — so the fill did nothing and the hairline was the whole
           edge, which is the arrangement cards were just taken off. */
        <View
          style={{
            backgroundColor: c.surface,
            borderRadius: radius.lg,
            overflow: 'hidden',
          }}>
          {children}
        </View>
      ) : (
        children
      )}
    </View>
  );
}
