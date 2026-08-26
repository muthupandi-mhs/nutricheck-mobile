import React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StepBar } from '../../components/Field';
import { Gap, Gutter } from '../../components/Layout';
import { Screen } from '../../components/Screen';
import { Txt } from '../../components/Text';
import { useTheme } from '../../theme/ThemeProvider';
import { useSheetStyle } from './BrandField';

export const STEPS = 6;

/**
 * The scaffold every onboarding step is built on.
 *
 * It borrows the shape the auth screens set: a canvas header on top, and a
 * surface sheet with rounded top corners holding everything the user acts on.
 * The brand field is deliberately absent — a mark above a form is decoration
 * where the header has a job to do, and these screens are already asking for
 * the user's height.
 *
 * Controls sit directly on the sheet rather than in cards. A raised card is a
 * `surface` fill, and the sheet is already `surface`, so nesting them makes two
 * layers that read as one badly drawn one.
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
  const { c, space } = useTheme();
  const insets = useSafeAreaInsets();
  const sheet = useSheetStyle();

  return (
    <Screen style={{ paddingBottom: 0 }}>
      <StepBar step={step} of={STEPS} />

      <Gutter>
        <Txt role="caption" tone="tertiary">
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

      <View style={[sheet, { flex: 1 }]}>
        <ScrollView
          contentContainerStyle={{ padding: space.gutter, paddingTop: space.xxl, paddingBottom: space.xl }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>

        <View
          style={{
            backgroundColor: c.surface,
            paddingHorizontal: space.gutter,
            paddingTop: space.sm,
            paddingBottom: Math.max(insets.bottom, space.lg) + space.xs,
          }}>
          {footer}
        </View>
      </View>
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
  /** Wraps the run in a sunken well — for option lists, which need an edge. */
  divided?: boolean;
}) {
  const { c, space, radius } = useTheme();

  return (
    <View>
      {label ? (
        <>
          <Txt role="labelSm" tone="secondary">
            {label}
          </Txt>
          <Gap h={space.md} />
        </>
      ) : null}
      {divided ? (
        <View
          style={{
            backgroundColor: c.sunken,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: c.border,
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
