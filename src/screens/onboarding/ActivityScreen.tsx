import React from 'react';
import { Button } from '../../components/Button';
import { OptionRow } from '../../components/Field';
import { Stack } from '../../components/Layout';
import { ACTIVITY } from '../../lib/nutrition';
import { useTheme } from '../../theme/ThemeProvider';
import { useOnboarding } from '../../state/Onboarding';
import { OnboardStep } from './OnboardStep';
import Activity1 from '../../assets/icons/activity-1.svg';
import Activity2 from '../../assets/icons/activity-2.svg';
import Activity3 from '../../assets/icons/activity-3.svg';
import Activity4 from '../../assets/icons/activity-4.svg';
import Activity5 from '../../assets/icons/activity-5.svg';
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
        {levels.map((level, i) => (
          <OptionRow
            key={level}
            title={ACTIVITY[level].label}
            // Not drawn, still spoken. The sub-line came off the cards because
            // five of them turned a choice into a page of reading, but it is
            // the clearest thing on the screen for anyone who cannot see the
            // meter, so it stays as the hint.
            detail={ACTIVITY[level].detail}
            leading={<LevelMeter level={i + 1} selected={draft.activityLevel === level} />}
            selected={draft.activityLevel === level}
            onPress={() => patch({ activityLevel: level })}
          />
        ))}
      </Stack>
    </OnboardStep>
  );
}

/**
 * One file per level, in order, so the index of an option picks its glyph.
 *
 * Listed rather than built from a template string: Metro resolves an import at
 * build time, not a path at run time, so `activity-${n}.svg` would resolve to
 * nothing. Five names is also the only form in which a missing file is a
 * compile error rather than a blank space on a card.
 */
const METERS = [Activity1, Activity2, Activity3, Activity4, Activity5];

/**
 * How much of the scale this option is, as a rising meter.
 *
 * Five figures — a desk, a walk, a jog, a run — is the obvious choice and the
 * wrong one: at this size a jog and a run are the same two sticks, and the set
 * becomes five drawings the eye reads one at a time. These options are not five
 * different things, they are one thing in five amounts, and a meter says that
 * at a glance and in the right order.
 *
 * Which also does the job the sub-line used to: the label says "3–4 a week"
 * and the meter says where that sits between the two ends.
 */
function LevelMeter({ level, selected }: { level: number; selected: boolean }) {
  const { c } = useTheme();
  const Meter = METERS[level - 1]!;

  // Every bar in the file is currentColor — solid for the ones this level has
  // reached, faded for the rest — so one prop colours the whole glyph.
  return <Meter width={26} height={26} color={selected ? c.ink : c.inkSecondary} />;
}
