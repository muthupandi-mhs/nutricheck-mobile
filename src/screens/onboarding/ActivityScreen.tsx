import React from 'react';
import { Button } from '../../components/Button';
import { OptionRow } from '../../components/Field';
import { ACTIVITY } from '../../lib/nutrition';
import { useOnboarding } from '../../state/Onboarding';
import { OnboardStep, StepGroup } from './OnboardStep';
import type { ActivityLevel } from '../../api/types';
import type { ScreenProps } from '../../navigation/types';

/**
 * Activity level in plain language. The five options map onto multipliers from
 * 1.2 to 1.9 and the user never sees one — "desk job, little exercise" is
 * answerable about yourself, "1.2x" is a question about an unseen formula.
 */
export function ActivityScreen({ navigation }: ScreenProps<'OnboardActivity'>) {
  const { draft, patch } = useOnboarding();
  const levels = Object.keys(ACTIVITY) as ActivityLevel[];

  return (
    <OnboardStep
      step={3}
      title="How active are you?"
      subtitle="Across a normal week, not your best one. Pick low if you are unsure — it is easier to notice a target that is too small than one that is too large."
      footer={
        <Button label="Continue" onPress={() => navigation.navigate('OnboardObjective')} haptic="select" />
      }>
      <StepGroup divided>
        {levels.map((level, i) => (
          <OptionRow
            key={level}
            title={ACTIVITY[level].label}
            detail={ACTIVITY[level].detail}
            selected={draft.activityLevel === level}
            onPress={() => patch({ activityLevel: level })}
            first={i === 0}
            last={i === levels.length - 1}
          />
        ))}
      </StepGroup>
    </OnboardStep>
  );
}
