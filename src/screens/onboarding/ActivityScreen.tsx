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
 * Activity level in plain language. The four options map onto multipliers from
 * 1.2 to 1.9 and the user never sees one — "desk job, little exercise" is
 * answerable about yourself, "1.2x" is a question about an unseen formula.
 *
 * Two tiles per row, two rows, filling whatever height the heading leaves. A
 * list of full-width rows was something to read top to bottom; a grid that
 * fills the screen is a set to look at, which is the shape this question wants
 * — four versions of one thing, all visible at once with nothing to scroll.
 *
 * The tiles flex rather than holding a square aspect: filling the screen and
 * staying square are the same thing only at one screen height, and of the two
 * it is filling that matters here.
 *
 * `fill` on the step is what makes that real. Left inside the scroll, the
 * grid's `flex: 1` resolves against a content box no taller than its own
 * contents, so it collapses back to icon-plus-label and gives the space back.
 */
export function ActivityScreen({ navigation }: ScreenProps<'OnboardActivity'>) {
  const { space } = useTheme();
  const { draft, patch } = useOnboarding();
  const levels = Object.keys(ACTIVITY) as ActivityLevel[];

  return (
    <OnboardStep
      fill
      step={3}
      title="How active are you?"
      subtitle="Across a normal week, not your best one. Pick low if unsure."
      footer={
        <Button label="Continue" loud onPress={() => navigation.navigate('OnboardObjective')} haptic="select" />
      }>
      <View style={{ flex: 1, gap: space.md }}>
        {[levels.slice(0, 2), levels.slice(2)].map((row, i) => (
          <View key={i} style={{ flex: 1, flexDirection: 'row', gap: space.md }}>
            {row.map(level => (
              <Tile
                key={level}
                level={level}
                selected={draft.activityLevel === level}
                onPress={() => patch({ activityLevel: level })}
              />
            ))}
          </View>
        ))}
      </View>
    </OnboardStep>
  );
}

/** One tile. Splits its row, and its row splits the height. */
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
        flex: 1,
        backgroundColor: c.surface,
        borderRadius: radius.lg,
        borderWidth: 2,
        borderColor: selected ? c.ink : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        gap: space.md,
        padding: space.md,
      }}>
      {/* Sized to the tile it is in. At 34 on a card this tall the glyph read
          as a bullet point beside a label rather than the subject of it. */}
      <Icon name={ACTIVITY_ICON[level]} size={44} color={selected ? c.ink : c.inkSecondary} />
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
 * One subject per level, escalating: sitting, walking, training, burning.
 *
 * Deliberately four different things rather than four poses of a person. Two
 * figures at this size are the same two sticks, and a set that can only be told
 * apart by studying it is a set nobody reads — whereas a desk, a shoe, a
 * dumbbell and a flame are distinguishable at a glance and still arrive in an
 * order.
 *
 * They name the kind of week, not the exercise. Nobody at 'moderate' has to
 * lift weights, any more than 'very active' means being on fire.
 */
const ACTIVITY_ICON: Record<ActivityLevel, IconName> = {
  sedentary: 'desk',
  light: 'shoe',
  moderate: 'dumbbell',
  very_active: 'flame',
};
