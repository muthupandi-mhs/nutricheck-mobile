import React from 'react';
import { Button } from '../../components/Button';
import { Segmented, Stepper } from '../../components/Field';
import { Divider, Gap, Stack } from '../../components/Layout';
import { useTheme } from '../../theme/ThemeProvider';
import { fromImperial, toImperial, useOnboarding } from '../../state/Onboarding';
import { OnboardStep } from './OnboardStep';
import type { ScreenProps } from '../../navigation/types';

/**
 * About you. Every field is an input to Mifflin–St Jeor; anything that does not
 * change a number on the next screen costs completions for nothing.
 *
 * Steppers rather than keyboards — on a field with a known range and a sensible
 * default, a stepper is one tap.
 */
export function ProfileScreen({ navigation }: ScreenProps<'OnboardProfile'>) {
  const { space } = useTheme();
  const { draft, patch } = useOnboarding();

  const imperial = draft.units === 'imperial';
  const age = new Date().getFullYear() - draft.birthYear;
  const height = toImperial.height(draft.heightCm);

  return (
    <OnboardStep
      step={2}
      title="About you"
      subtitle="Four numbers. They set your resting burn, and you can change any of them later."
      footer={
        <Button label="Continue" onPress={() => navigation.navigate('OnboardActivity')} haptic="select" />
      }>
      <Stack gap={space.xl}>
        <Segmented
          label="Units"
          value={draft.units}
          onChange={units => patch({ units })}
          options={[
            { value: 'metric', label: 'Metric' },
            { value: 'imperial', label: 'Imperial' },
          ]}
        />
        <Segmented
          label="Sex"
          value={draft.sex}
          onChange={sex => patch({ sex })}
          options={[
            { value: 'female', label: 'Female' },
            { value: 'male', label: 'Male' },
          ]}
        />

        <Divider />

        <Stepper
          label="Age"
          value={age}
          unit="years"
          min={13}
          max={100}
          onChange={v => patch({ birthYear: new Date().getFullYear() - v })}
        />

        {imperial ? (
          <Stepper
            label="Height"
            value={height.ft * 12 + height.in}
            unit={`in · ${height.ft}′ ${height.in}″`}
            min={40}
            max={90}
            onChange={v => patch({ heightCm: fromImperial.height(Math.floor(v / 12), v % 12) })}
          />
        ) : (
          <Stepper
            label="Height"
            value={draft.heightCm}
            unit="cm"
            min={100}
            max={230}
            onChange={heightCm => patch({ heightCm })}
          />
        )}

        {imperial ? (
          <Stepper
            label="Current weight"
            value={toImperial.weight(draft.weightKg)}
            unit="lb"
            min={70}
            max={600}
            onChange={v => patch({ weightKg: fromImperial.weight(v) })}
          />
        ) : (
          <Stepper
            label="Current weight"
            value={draft.weightKg}
            unit="kg"
            min={30}
            max={300}
            onChange={weightKg => patch({ weightKg })}
          />
        )}
      </Stack>
      <Gap h={space.sm} />
    </OnboardStep>
  );
}
