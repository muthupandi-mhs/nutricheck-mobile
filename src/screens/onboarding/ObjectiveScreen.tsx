import React, { useMemo } from 'react';
import { Button } from '../../components/Button';
import { Notice } from '../../components/Feedback';
import { Icon, type IconName } from '../../components/Icon';
import { Gap, Row, Stack } from '../../components/Layout';
import { Press } from '../../components/Press';
import { Txt } from '../../components/Text';
import { deriveGoal, OBJECTIVE_LABEL } from '../../lib/nutrition';
import { useTheme } from '../../theme/ThemeProvider';
import { useOnboarding } from '../../state/Onboarding';
import { OnboardStep, StepGroup } from './OnboardStep';
import type { Objective } from '../../api/types';
import type { ScreenProps } from '../../navigation/types';

const RATES = [0.25, 0.5, 0.75, 1.0];

/**
 * Objective, rate, and the number they add up to.
 *
 * Three tiles across one row rather than three stacked cards: the answers are a
 * direction each, and a direction is a thing to point at rather than a line to
 * read. It also puts the whole question in the height that one of the old rows
 * used, which is what leaves room for the answer underneath.
 *
 * Rate chips are floored: a rate whose deficit would take the target below
 * resting burn is disabled and says so, rather than being offered and silently
 * clipped on the next screen.
 */
export function ObjectiveScreen({ navigation }: ScreenProps<'OnboardObjective'>) {
  const { space } = useTheme();
  const { draft, patch, toProfile } = useOnboarding();

  const profile = toProfile();
  const goal = useMemo(() => deriveGoal(profile), [profile]);
  const rateAllowed = (rate: number) => !deriveGoal({ ...profile, rateKgPerWeek: rate }).basis.flooredAtBmr;

  const objectives = Object.keys(OBJECTIVE_LABEL) as Objective[];
  const verb = draft.objective === 'gain' ? 'gain' : 'lose';

  return (
    <OnboardStep
      step={4}
      title="Where should your weight go?"
      footer={
        <Button label="See my targets" loud onPress={() => navigation.navigate('OnboardTargets')} haptic="select" />
      }>
      <Stack gap={space.xxl}>
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

        {draft.objective !== 'maintain' && (
          <StepGroup label="How fast, in kg a week">
            <Stack gap={space.md}>
              {/* Down, not across. Four across had to share the width three
                  objective tiles were using, so they came out smaller than the
                  row above and ragged against it — and the labels under the
                  numbers were the first thing to get squeezed. Stacked, every
                  rate is the same full-width row, the numbers line up in a
                  column of their own, and a scale still reads top to bottom. */}
              <Stack gap={space.sm}>
                {RATES.map(rate => (
                  <RateRow
                    key={rate}
                    rate={rate}
                    verb={verb}
                    selected={draft.rateKgPerWeek === rate}
                    allowed={rateAllowed(rate)}
                    onPress={() => patch({ rateKgPerWeek: rate })}
                  />
                ))}
              </Stack>
              {/* Only the half that explains something the user can see. The
                  deficit in calories went: it restated the rate they had just
                  picked, in a unit they had not asked about, one screen before
                  the screen that is nothing but calories.

                  This half stays because a dimmed row with no reason beside it
                  is just a control that does not work — and it only appears
                  when there is actually one dimmed. */}
              {RATES.some(r => !rateAllowed(r)) ? (
                <Txt role="bodySm" tone="secondary">
                  Greyed-out rates would put your target below your resting burn.
                </Txt>
              ) : null}
            </Stack>
          </StepGroup>
        )}

        {goal.basis.flooredAtBmr && (
          <Notice
            icon="alert"
            title="Held at your resting burn"
            detail="The rate you picked would set a target below what your body spends at rest. We do not go under it."
          />
        )}
      </Stack>
      <Gap h={space.sm} />
    </OnboardStep>
  );
}

/**
 * One rate, as a full-width row.
 *
 * The number sits in a fixed column so all four line up under each other
 * regardless of how many characters they have — 0.25 and 1 are the same width
 * of space, which is the whole reason a column of numbers reads as a scale
 * rather than as four separate labels.
 *
 * A disallowed rate stays on the list, dimmed, rather than disappearing. Four
 * options that become two as the weight is edited would be a scale that keeps
 * changing shape; and a rate that is missing tells nobody why, where one that
 * is visible and out of reach is explained by the line beneath.
 */
function RateRow({
  rate,
  verb,
  selected,
  allowed,
  onPress,
}: {
  rate: number;
  verb: string;
  selected: boolean;
  allowed: boolean;
  onPress: () => void;
}) {
  const { c, radius, space } = useTheme();

  return (
    <Press
      onPress={allowed ? onPress : undefined}
      disabled={!allowed}
      haptic="select"
      feedback="none"
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !allowed }}
      accessibilityLabel={
        allowed
          ? `${verb} ${rate} kilograms per week, ${RATE_WORD[rate]}`
          : `${rate} kilograms per week is unavailable — it would take your target below your resting burn`
      }
      style={{
        opacity: allowed ? 1 : 0.35,
        backgroundColor: c.surface,
        borderRadius: radius.lg,
        borderWidth: 2,
        borderColor: selected ? c.ink : 'transparent',
        paddingVertical: space.md,
        paddingHorizontal: space.lg,
      }}>
      <Row gap={space.lg}>
        {/* Right-aligned in a fixed column: the decimal points stack, so the
            four numbers read as one scale instead of four labels. */}
        <Txt
          role="h3"
          numeric
          color={selected ? c.ink : c.inkSecondary}
          style={{ width: 44, textAlign: 'right' }}>
          {rate}
        </Txt>
        <Txt role="body" color={selected ? c.ink : c.inkSecondary} style={{ flexGrow: 1 }}>
          {RATE_WORD[rate]}
        </Txt>
        {selected ? <Icon name="check" size={18} color={c.ink} weight={2.4} /> : null}
      </Row>
    </Press>
  );
}

/** What each rate feels like. The number is the amount; this is the meaning. */
const RATE_WORD: Record<number, string> = {
  0.25: 'Gentle',
  0.5: 'Steady',
  0.75: 'Brisk',
  1: 'Fast',
};

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
