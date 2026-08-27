import React from 'react';
import { Button } from '../../components/Button';
import { OptionRow } from '../../components/Field';
import { Stack } from '../../components/Layout';
import { ACTIVITY } from '../../lib/nutrition';
import { useTheme } from '../../theme/ThemeProvider';
import { useOnboarding } from '../../state/Onboarding';
import { OnboardStep } from './OnboardStep';
import type { ActivityLevel } from '../../api/types';
import type { ScreenProps } from '../../navigation/types';

/**
 * Activity level in plain language. The five options map onto multipliers from
 * 1.2 to 1.9 and the user never sees one — "desk job, little exercise" is
 * answerable about yourself, "1.2x" is a question about an unseen formula.
 */
export function ActivityScreen({ navigation }: ScreenProps<'OnboardActivity'>) {
  const { space } = useTheme();
  const { draft, patch } = useOnboarding();
  const levels = Object.keys(ACTIVITY) as ActivityLevel[];

  return (
    <OnboardStep
      step={3}
      title="How active are you?"
      subtitle="Across a normal week, not your best one. Pick low if unsure."
      footer={
        <Button label="Continue" loud onPress={() => navigation.navigate('OnboardObjective')} haptic="select" />
      }>
      {/* A card each, spaced, rather than rows in one well — five answers you
          choose between, not a list you read down. */}
      <Stack gap={space.md}>
        {levels.map(level => (
          <OptionRow
            key={level}
            title={ACTIVITY[level].label}
            detail={ACTIVITY[level].detail}
            selected={draft.activityLevel === level}
            onPress={() => patch({ activityLevel: level })}
          />
        ))}
      </Stack>
    </OnboardStep>
  );
}
