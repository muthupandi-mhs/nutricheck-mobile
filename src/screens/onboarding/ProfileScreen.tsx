import React from 'react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Segmented, Stepper } from '../../components/Field';
import { Gap, Stack } from '../../components/Layout';
import { useTheme } from '../../theme/ThemeProvider';
import { useOnboarding } from '../../state/Onboarding';
import { OnboardStep } from './OnboardStep';
import type { ScreenProps } from '../../navigation/types';

/**
 * About you. Every field is an input to Mifflin–St Jeor; anything that does not
 * change a number on the next screen costs completions for nothing.
 *
 * Steppers rather than keyboards — on a field with a known range and a sensible
 * default, a stepper is one tap, and the number can still be typed.
 *
 * Metric only. There was a metric/imperial toggle here and it was the first
 * thing on the screen: a question about the app asked before any question
 * about the person, answered the same way by almost everyone in the market
 * this is built for. The stored value was always metric regardless — the
 * toggle only ever changed what was displayed.
 */
export function ProfileScreen({ navigation }: ScreenProps<'OnboardProfile'>) {
  const { space } = useTheme();
  const { draft, patch } = useOnboarding();

  const age = new Date().getFullYear() - draft.birthYear;

  return (
    <OnboardStep
      title="About you"
      footer={
        <Button label="Continue" loud onPress={() => navigation.navigate('OnboardActivity')} haptic="select" />
      }>
      {/* One card per question. On a screen that is nothing but five inputs,
          the frames are what stop it reading as a wall of controls — each one
          becomes a thing you answer rather than a row in a list. */}
      <Stack gap={space.md}>
        <Card>
          <Segmented
            label="Sex"
            value={draft.sex}
            onChange={sex => patch({ sex })}
            options={[
              { value: 'female', label: 'Female' },
              { value: 'male', label: 'Male' },
            ]}
          />
        </Card>

        <Stepper
          framed
          label="Age"
          value={age}
          unit="years"
          min={13}
          max={100}
          onChange={v => patch({ birthYear: new Date().getFullYear() - v })}
        />

        <Stepper
          framed
          label="Height"
          value={draft.heightCm}
          unit="cm"
          min={100}
          max={230}
          onChange={heightCm => patch({ heightCm })}
        />

        <Stepper
          framed
          label="Current weight"
          value={draft.weightKg}
          unit="kg"
          min={30}
          max={300}
          onChange={weightKg => patch({ weightKg })}
        />
      </Stack>
      <Gap h={space.sm} />
    </OnboardStep>
  );
}
