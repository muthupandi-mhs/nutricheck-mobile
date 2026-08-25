import React from 'react';
import { ScrollView, View } from 'react-native';
import { PrimaryButton } from '../../components/Button';
import { Segmented, StepBar, Stepper } from '../../components/Field';
import { Gap, Gutter, HeavyBar } from '../../components/Layout';
import { Dock, Screen } from '../../components/Screen';
import { Body, Display, Eyebrow } from '../../components/Type';
import { useTheme } from '../../theme/ThemeProvider';
import { fromImperial, toImperial, useOnboarding } from '../../state/Onboarding';
import type { ScreenProps } from '../../navigation/types';

/**
 * About you — four facts, and nothing that is not load-bearing.
 *
 * Every field here is an input to Mifflin–St Jeor. Nothing else is asked,
 * because a field that does not change a number on the next screen is a field
 * that costs a percentage of completions for nothing.
 *
 * Steppers rather than text inputs: on a numeric field with a known range and a
 * sensible default, a stepper is a tap where a keyboard is a keyboard.
 */
export function ProfileScreen({ navigation }: ScreenProps<'OnboardProfile'>) {
  const { space } = useTheme();
  const { draft, patch } = useOnboarding();
  const imperial = draft.units === 'imperial';
  const age = new Date().getFullYear() - draft.birthYear;

  const height = toImperial.height(draft.heightCm);

  return (
    <Screen edges="top">
      <StepBar step={2} of={6} />

      <Gutter>
        <Eyebrow size={10.5} tone="ink2">
          STEP 2 OF 6
        </Eyebrow>
        <Gap h={space.sm} />
        <Display size={32}>About you</Display>
        <Gap h={space.sm} />
        <Body size={15.5} tone="ink2">
          Four numbers. They set your resting burn, and you can change any of them later.
        </Body>
      </Gutter>

      <Gap h={space.lg} />
      <HeavyBar />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space.gutter, paddingTop: space.xl, paddingBottom: space.xl, gap: space.xl }}
        keyboardShouldPersistTaps="handled">
        <Segmented
          label="UNITS"
          value={draft.units}
          onChange={units => patch({ units })}
          options={[
            { value: 'metric', label: 'Metric' },
            { value: 'imperial', label: 'Imperial' },
          ]}
        />

        <Segmented
          label="SEX"
          value={draft.sex}
          onChange={sex => patch({ sex })}
          options={[
            { value: 'female', label: 'Female' },
            { value: 'male', label: 'Male' },
          ]}
        />

        <Stepper
          label="AGE"
          value={age}
          unit="years"
          min={13}
          max={100}
          onChange={v => patch({ birthYear: new Date().getFullYear() - v })}
        />

        <View style={{ height: 1 }} />

        {imperial ? (
          <Stepper
            label="HEIGHT"
            value={height.ft * 12 + height.in}
            unit={`in  ·  ${height.ft}′ ${height.in}″`}
            min={40}
            max={90}
            onChange={v => patch({ heightCm: fromImperial.height(Math.floor(v / 12), v % 12) })}
          />
        ) : (
          <Stepper
            label="HEIGHT"
            value={draft.heightCm}
            unit="cm"
            min={100}
            max={230}
            onChange={heightCm => patch({ heightCm })}
          />
        )}

        {imperial ? (
          <Stepper
            label="CURRENT WEIGHT"
            value={toImperial.weight(draft.weightKg)}
            unit="lb"
            min={70}
            max={600}
            onChange={v => patch({ weightKg: fromImperial.weight(v) })}
          />
        ) : (
          <Stepper
            label="CURRENT WEIGHT"
            value={draft.weightKg}
            unit="kg"
            min={30}
            max={300}
            onChange={weightKg => patch({ weightKg })}
          />
        )}
      </ScrollView>

      <Dock>
        <PrimaryButton label="Continue" onPress={() => navigation.navigate('OnboardActivity')} />
      </Dock>
    </Screen>
  );
}
