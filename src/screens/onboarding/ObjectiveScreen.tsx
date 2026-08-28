import React from 'react';
import { Button } from '../../components/Button';
import { Icon, type IconName } from '../../components/Icon';
import { Row } from '../../components/Layout';
import { Press } from '../../components/Press';
import { Txt } from '../../components/Text';
import { OBJECTIVE_LABEL } from '../../lib/nutrition';
import { useTheme } from '../../theme/ThemeProvider';
import { useOnboarding } from '../../state/Onboarding';
import { OnboardStep } from './OnboardStep';
import { useTargetsPrefetch } from './useTargetsPrefetch';
import type { Objective } from '../../api/types';
import type { ScreenProps } from '../../navigation/types';

/**
 * Which way the weight should go, and nothing else.
 *
 * The rate used to live here too, under a second heading. A direction is picked
 * in a glance and a rate is a judgement, and putting them on one screen made
 * the smaller question look like a footnote to the larger one. Now each screen
 * asks one thing.
 *
 * Three tiles across one row, because the answers are a direction each — a
 * thing to point at rather than a line to read.
 */
export function ObjectiveScreen({ navigation }: ScreenProps<'OnboardObjective'>) {
  const { space } = useTheme();
  const { draft, patch } = useOnboarding();
  const targets = useTargetsPrefetch(navigation);

  const objectives = Object.keys(OBJECTIVE_LABEL) as Objective[];
  const maintaining = draft.objective === 'maintain';

  return (
    <OnboardStep
      title="Where should your weight go?"
      footer={
        <Button
          // Maintaining skips the rate step, because "how fast would you like
          // to stay the same" is not a question. That makes this the last
          // screen before the targets for those users, so it is also where
          // their suggestion has to be fetched.
          label={maintaining ? 'See my targets' : 'Continue'}
          loud
          loading={targets.asking}
          onPress={() => (maintaining ? targets.go() : navigation.navigate('OnboardRate'))}
          haptic="select"
        />
      }>
      <Row gap={space.md}>
        {objectives.map(o => (
          <ObjectiveTile
            key={o}
            objective={o}
            selected={draft.objective === o}
            onPress={() =>
              patch({ objective: o, rateKgPerWeek: o === 'maintain' ? 0 : draft.rateKgPerWeek || 0.5 })
            }
          />
        ))}
      </Row>
    </OnboardStep>
  );
}

/** One of three, splitting the row. Square-ish by the padding, not by an aspect. */
function ObjectiveTile({
  objective,
  selected,
  onPress,
}: {
  objective: Objective;
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
      accessibilityLabel={OBJECTIVE_LABEL[objective]}
      style={{
        flex: 1,
        backgroundColor: c.surface,
        borderRadius: radius.lg,
        borderWidth: 2,
        borderColor: selected ? c.ink : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        gap: space.sm,
        paddingVertical: space.xl,
        paddingHorizontal: space.sm,
      }}>
      <Icon name={OBJECTIVE_ICON[objective]} size={28} color={selected ? c.ink : c.inkSecondary} />
      <Txt
        role="labelSm"
        caps
        color={selected ? c.ink : c.inkSecondary}
        style={{ letterSpacing: 1.1, textAlign: 'center' }}>
        {OBJECTIVE_SHORT[objective]}
      </Txt>
    </Press>
  );
}

/**
 * One weighing dial, its needle low, level and high.
 *
 * One metaphor in three states rather than three separate signs. An arrow says
 * "down" and leaves the reader to supply what is going down; a dial with the
 * needle swung left says "less weight", which is the question being asked.
 *
 * It also means the three tiles are the same object three times, so the eye
 * compares needle positions instead of decoding three different drawings.
 */
const OBJECTIVE_ICON: Record<Objective, IconName> = {
  lose: 'dialLow',
  maintain: 'dialLevel',
  gain: 'dialHigh',
};

/**
 * A word each, and it is the title that says what they are about — "Where
 * should your weight go?" makes Lose, Stay and Gain unambiguous without three
 * tiles all repeating the word "weight" in a space too narrow to hold it.
 */
const OBJECTIVE_SHORT: Record<Objective, string> = {
  lose: 'Lose',
  maintain: 'Stay',
  gain: 'Gain',
};
