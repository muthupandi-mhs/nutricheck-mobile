import React from 'react';
import { Button } from '../../components/Button';
import { OptionRow } from '../../components/Field';
import { Icon, type IconName } from '../../components/Icon';
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
  const { c, space } = useTheme();
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
            // Not drawn, still spoken. The sub-line came off the cards because
            // five of them turned a choice into a page of reading, but it is
            // the clearest thing on the screen for anyone who cannot see the
            // icon, so it stays as the hint.
            detail={ACTIVITY[level].detail}
            leading={
              <Icon
                name={ACTIVITY_ICON[level]}
                size={26}
                color={draft.activityLevel === level ? c.ink : c.inkSecondary}
              />
            }
            selected={draft.activityLevel === level}
            onPress={() => patch({ activityLevel: level })}
          />
        ))}
      </Stack>
    </OnboardStep>
  );
}

/**
 * One subject per level, escalating: sitting, walking, training, running,
 * burning.
 *
 * Deliberately five different things rather than five poses of a person. A jog
 * and a run are the same two sticks at 26pt, and a set that can only be told
 * apart by studying it is a set nobody reads — whereas a desk, a shoe, a
 * dumbbell, a runner and a flame are distinguishable at a glance and still
 * arrive in an order.
 *
 * They name the kind of week, not the exercise. Nobody at 'moderate' has to
 * lift weights, any more than 'very active' means being on fire.
 */
const ACTIVITY_ICON: Record<ActivityLevel, IconName> = {
  sedentary: 'desk',
  light: 'shoe',
  moderate: 'dumbbell',
  active: 'run',
  very_active: 'flame',
};
