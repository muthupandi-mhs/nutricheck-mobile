import React, { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { Banner } from '../../components/Banner';
import { PrimaryButton } from '../../components/Button';
import { OptionRow, StepBar } from '../../components/Field';
import { Chip } from '../../components/Chip';
import { Gap, Gutter, HeavyBar, Row } from '../../components/Layout';
import { Dock, Screen } from '../../components/Screen';
import { Body, Display, Eyebrow, Num } from '../../components/Type';
import { kcal } from '../../lib/format';
import { OBJECTIVE_LABEL, deriveGoal } from '../../lib/nutrition';
import { useTheme } from '../../theme/ThemeProvider';
import { useOnboarding } from '../../state/Onboarding';
import type { Objective } from '../../api/types';
import type { ScreenProps } from '../../navigation/types';

const RATES = [0.25, 0.5, 0.75, 1.0];

/**
 * Objective and rate.
 *
 * The rate chips are floored: any rate whose deficit would take the target
 * below resting burn is disabled and says so, rather than being offered and
 * then silently clipped on the next screen. A target the app quietly refuses to
 * honour is worse than one it declines to offer — the user picks 1 kg a week,
 * sees 1,400 kcal, and concludes the arithmetic is broken.
 */
export function ObjectiveScreen({ navigation }: ScreenProps<'OnboardObjective'>) {
  const { c, space } = useTheme();
  const { draft, patch, toProfile } = useOnboarding();

  const profile = toProfile();
  const goal = useMemo(() => deriveGoal(profile), [profile]);

  const rateAllowed = (rate: number) => {
    const test = deriveGoal({ ...profile, rateKgPerWeek: rate });
    return !test.basis.flooredAtBmr;
  };

  const objectives = Object.keys(OBJECTIVE_LABEL) as Objective[];
  const verb = draft.objective === 'gain' ? 'gain' : 'lose';

  return (
    <Screen edges="top">
      <StepBar step={4} of={6} />

      <Gutter>
        <Eyebrow size={10.5} tone="ink2">
          STEP 4 OF 6
        </Eyebrow>
        <Gap h={space.sm} />
        <Display size={32}>What are you after?</Display>
      </Gutter>

      <Gap h={space.lg} />
      <HeavyBar />

      <ScrollView contentContainerStyle={{ paddingBottom: space.xl }}>
        <View style={{ borderBottomWidth: 1, borderBottomColor: c.rule, paddingTop: space.sm }}>
          {objectives.map((o, i) => (
            <OptionRow
              key={o}
              title={OBJECTIVE_LABEL[o]}
              selected={draft.objective === o}
              onPress={() => patch({ objective: o, rateKgPerWeek: o === 'maintain' ? 0 : draft.rateKgPerWeek || 0.5 })}
              last={i === objectives.length - 1}
            />
          ))}
        </View>

        {draft.objective !== 'maintain' && (
          <Gutter style={{ paddingTop: space.xl, gap: space.md }}>
            <Eyebrow size={10} tone="ink2">
              HOW FAST
            </Eyebrow>
            <Row gap={space.sm} wrap>
              {RATES.map(rate => {
                const allowed = rateAllowed(rate);
                return (
                  <Chip
                    key={rate}
                    label={`${rate} kg / wk`}
                    variant={draft.rateKgPerWeek === rate ? 'selected' : allowed ? 'plain' : 'plain'}
                    onPress={allowed ? () => patch({ rateKgPerWeek: rate }) : undefined}
                    accessibilityLabel={
                      allowed
                        ? `${verb} ${rate} kilograms per week`
                        : `${rate} kilograms per week — not available, it would take your target below your resting burn`
                    }
                    style={allowed ? undefined : { opacity: 0.35 }}
                  />
                );
              })}
            </Row>
            <Body size={13.5} tone="ink2">
              About {kcal(Math.abs((draft.rateKgPerWeek * 7700) / 7))} kcal a day, {verb === 'lose' ? 'under' : 'over'} what
              you burn. Rates greyed out would put your target below your resting burn.
            </Body>
          </Gutter>
        )}

        <Gutter style={{ paddingTop: space.xl }}>
          <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.rule, padding: space.lg, gap: 6 }}>
            <Eyebrow size={9.5} tone="ink2">
              THAT WORKS OUT TO
            </Eyebrow>
            <Row gap={6} align="baseline">
              <Display size={34}>{kcal(goal.kcal)}</Display>
              <Num size={12} tone="ink2">
                kcal a day
              </Num>
            </Row>
            <Num size={11} tone="ink3">
              Resting burn {kcal(goal.basis.bmr)} · daily burn {kcal(goal.basis.tdee)}
            </Num>
          </View>
        </Gutter>

        {goal.basis.flooredAtBmr && (
          <View style={{ paddingTop: space.lg }}>
            <Banner
              icon="alert"
              title="Held at your resting burn"
              detail="The rate you picked would set a target below what your body spends at rest. We do not go under it."
            />
          </View>
        )}
      </ScrollView>

      <Dock>
        <PrimaryButton label="See my targets" onPress={() => navigation.navigate('OnboardTargets')} />
      </Dock>
    </Screen>
  );
}
