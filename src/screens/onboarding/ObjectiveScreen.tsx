import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Chip } from '../../components/Chip';
import { Notice } from '../../components/Feedback';
import { Icon, type IconName } from '../../components/Icon';
import { Gap, Row, Stack } from '../../components/Layout';
import { Press } from '../../components/Press';
import { Txt } from '../../components/Text';
import { kcal } from '../../lib/format';
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
      title="What are you after?"
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
          <StepGroup label="How fast">
            <Stack gap={space.md}>
              <Row gap={space.sm} wrap>
                {RATES.map(rate => {
                  const allowed = rateAllowed(rate);
                  return (
                    <View key={rate} style={allowed ? undefined : { opacity: 0.35 }}>
                      <Chip
                        label={`${rate} kg / wk`}
                        variant={draft.rateKgPerWeek === rate ? 'selected' : 'default'}
                        onPress={allowed ? () => patch({ rateKgPerWeek: rate }) : undefined}
                        accessibilityLabel={
                          allowed
                            ? `${verb} ${rate} kilograms per week`
                            : `${rate} kilograms per week is unavailable — it would take your target below your resting burn`
                        }
                      />
                    </View>
                  );
                })}
              </Row>
              <Txt role="bodySm" tone="secondary">
                About {kcal(Math.abs((draft.rateKgPerWeek * 7700) / 7))} kcal a day{' '}
                {verb === 'lose' ? 'under' : 'over'} what you burn. Greyed-out rates would put your
                target below your resting burn.
              </Txt>
            </Stack>
          </StepGroup>
        )}

        {/* The answer, on the card the rest of the screen is asking for. It sat
            in a labelled group like any other section, which is the same weight
            as the controls that produce it — and this is the one thing on the
            screen that is a result rather than a question. */}
        <Card>
          <Txt role="labelSm" tone="secondary" caps style={{ letterSpacing: 1.1 }}>
            That works out to
          </Txt>
          <Gap h={space.md} />
          <Row gap={8} align="baseline">
            <Txt role="display" numeric style={{ fontSize: 48, lineHeight: 52 }}>
              {kcal(goal.kcal)}
            </Txt>
            <Txt role="bodyLg" tone="secondary">
              kcal a day
            </Txt>
          </Row>
          <Gap h={space.sm} />
          <Txt role="caption" tone="tertiary" numeric>
            Resting burn {kcal(goal.basis.bmr)} · daily burn {kcal(goal.basis.tdee)}
          </Txt>
        </Card>

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
 * A direction each, which is the whole of what this question asks. Nothing here
 * is a picture of a person or a scale — the answer is which way the number
 * should go, and an arrow is the shortest way to say that.
 */
const OBJECTIVE_ICON: Record<Objective, IconName> = {
  lose: 'trendDown',
  maintain: 'trendFlat',
  gain: 'trendUp',
};

/** A word each. The full phrase is on the tile's accessibility label. */
const OBJECTIVE_SHORT: Record<Objective, string> = {
  lose: 'Lose',
  maintain: 'Stay',
  gain: 'Gain',
};
