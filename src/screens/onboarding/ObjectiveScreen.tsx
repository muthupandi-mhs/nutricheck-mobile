import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Notice } from '../../components/Feedback';
import { OptionRow } from '../../components/Field';
import { Gap, Row, Stack } from '../../components/Layout';
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
 * Objective and rate. Rate chips are floored: a rate whose deficit would take
 * the target below resting burn is disabled and says so, rather than being
 * offered and silently clipped on the next screen.
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
        <Button label="See my targets" onPress={() => navigation.navigate('OnboardTargets')} haptic="select" />
      }>
      <Stack gap={space.xxl}>
        <StepGroup divided>
          {objectives.map((o, i) => (
            <OptionRow
              key={o}
              title={OBJECTIVE_LABEL[o]}
              selected={draft.objective === o}
              onPress={() =>
                patch({ objective: o, rateKgPerWeek: o === 'maintain' ? 0 : draft.rateKgPerWeek || 0.5 })
              }
              first={i === 0}
              last={i === objectives.length - 1}
            />
          ))}
        </StepGroup>

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

        <StepGroup label="That works out to">
          <Stack gap={4}>
            <Row gap={6} align="baseline">
              <Txt role="display" numeric style={{ fontSize: 40, lineHeight: 44 }}>
                {kcal(goal.kcal)}
              </Txt>
              <Txt role="body" tone="secondary">
                kcal a day
              </Txt>
            </Row>
            <Txt role="caption" tone="tertiary" numeric>
              Resting burn {kcal(goal.basis.bmr)} · daily burn {kcal(goal.basis.tdee)}
            </Txt>
          </Stack>
        </StepGroup>

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
