import React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoid } from '../../components/KeyboardAvoid';
import { useKeyboardVisible } from '../../lib/keyboard';
import { Gap } from '../../components/Layout';
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
  const keyboard = useKeyboardVisible();

  return (
    <Screen style={{ paddingBottom: 0 }}>
      <KeyboardAvoid>
        <ScrollView
          // Claims the space left over after the footer. Without it the scroll
          // sizes to its own content and runs on underneath the button.
          style={{ flex: 1 }}
          // flexGrow, so a step whose content wants to fill the screen can:
          // a child's `flex: 1` measures against a content box, and without
          // this that box is only ever as tall as what is already in it. Taller
          // content still scrolls — this sets a floor, not a ceiling.
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: space.gutter,
            paddingBottom: space.xl,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* The heading scrolls with the content rather than sitting above it.
              Pinned, it held about a third of the screen while the keypad held
              another half, and what was left to answer the question in was two
              cards. It is read once; the controls are used repeatedly. */}
          <Gap h={space.lg} />
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

          <Gap h={space.xl} />

          {children}
        </ScrollView>

        {/* Stands down while the keypad is up.

            It cannot be reached there anyway — the keyboard is over it — so
            leaving it in the layout only shortens the list being typed into,
            and on the profile step that was the difference between two cards
            visible and four. The number pad's own tick closes the keypad and
            brings it straight back.

            No fill of its own: on the canvas that would be the only thing on
            the screen pretending to be a bar. */}
        {keyboard ? null : (
          <View
            style={{
              paddingHorizontal: space.gutter,
              paddingTop: space.sm,
              paddingBottom: Math.max(insets.bottom, space.lg) + space.xs,
            }}>
            {footer}
          </View>
        )}
      </KeyboardAvoid>
    </Screen>
  );
}

/** A titled group of controls. Just a label and what it labels. */
export function StepGroup({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  const { space } = useTheme();

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
      {children}
    </View>
  );
}
