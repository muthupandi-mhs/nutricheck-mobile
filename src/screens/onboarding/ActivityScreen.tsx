import React from 'react';
import { View } from 'react-native';
import { Button } from '../../components/Button';
import { Icon, type IconName } from '../../components/Icon';
import { Press } from '../../components/Press';
import { Txt } from '../../components/Text';
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
 *
 * Two square tiles per row. Five full-width rows were a list to be read top to
 * bottom; a grid is a set to be looked at, which is the right shape for a
 * question whose answers are five versions of one thing.
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
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        {levels.map(level => (
          <Tile
            key={level}
            level={level}
            selected={draft.activityLevel === level}
            onPress={() => patch({ activityLevel: level })}
          />
        ))}
      </View>
    </OnboardStep>
  );
}

/**
 * One tile.
 *
 * `flexBasis` at 48% with no grow, deliberately: two fit a row, and the fifth
 * stays the size of the other four rather than stretching to fill the row it is
 * alone in — which on a square would have made it twice as tall as the rest.
 */
function Tile({
  level,
  selected,
  onPress,
}: {
  level: ActivityLevel;
  selected: boolean;
  onPress: () => void;
}) {
  const { c, radius, space } = useTheme();

  return (
    <Press
      onPress={onPress}
      haptic="select"
      feedback="none"
      accessibilityRole="button"
      accessibilityState={{ selected }}
      // The sentence, not the name on the tile. This is the one place the full
      // wording is still read out, and it is the wording that makes the
      // question answerable about yourself.
      accessibilityLabel={ACTIVITY[level].label}
      accessibilityHint={ACTIVITY[level].detail}
      style={{
        flexBasis: '48%',
        aspectRatio: 1,
        backgroundColor: c.surface,
        borderRadius: radius.lg,
        borderWidth: 2,
        borderColor: selected ? c.ink : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        gap: space.md,
        padding: space.md,
      }}>
      <Icon name={ACTIVITY_ICON[level]} size={34} color={selected ? c.ink : c.inkSecondary} />
      <Txt
        role="labelSm"
        caps
        color={selected ? c.ink : c.inkSecondary}
        style={{ letterSpacing: 1.1, textAlign: 'center' }}>
        {ACTIVITY[level].short}
      </Txt>
    </Press>
  );
}

/**
 * One subject per level, escalating: sitting, walking, training, running,
 * burning.
 *
 * Deliberately five different things rather than five poses of a person. A jog
 * and a run are the same two sticks at this size, and a set that can only be
 * told apart by studying it is a set nobody reads — whereas a desk, a shoe, a
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
