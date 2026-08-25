import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Banner, Disclaimer } from '../../components/Banner';
import { IconButton, PrimaryButton, TextAction } from '../../components/Button';
import { Stepper } from '../../components/Field';
import { Divider, Gap, Gutter, HeavyBar, Row, SplitRow } from '../../components/Layout';
import { Dock, Screen } from '../../components/Screen';
import { Body, Display, Eyebrow, Mono } from '../../components/Type';
import { kcal } from '../../lib/format';
import { deriveGoal } from '../../lib/nutrition';
import { useTheme } from '../../theme/ThemeProvider';
import { useAppState } from '../../state/AppState';
import type { ScreenProps } from '../../navigation/types';

/**
 * Editing the targets after onboarding.
 *
 * A goal row is append-only with an `effectiveFrom` date, and this screen only
 * ever writes a new one. That is why last month's "you hit your target" does
 * not retroactively become a miss when someone loses four kilos and their
 * derived calorie target drops.
 *
 * "Back to derived" is a first-class action rather than a reset buried in a
 * menu: a target that tracks the profile is the one that stays correct, and a
 * user who overrode it in a bad week deserves a one-tap way out.
 */
export function GoalEditorScreen({ navigation }: ScreenProps<'GoalEditor'>) {
  const { c, space } = useTheme();
  const { goal, profile, setGoalOverride } = useAppState();

  const derived = profile ? deriveGoal(profile) : null;
  const [values, setValues] = useState({
    kcal: goal?.kcal ?? 2000,
    protein: goal?.proteinG ?? 120,
    fiber: goal?.fiberG ?? 28,
  });
  const [saving, setSaving] = useState(false);

  const overridden =
    derived !== null &&
    (values.kcal !== derived.kcal || values.protein !== derived.proteinG || values.fiber !== derived.fiberG);

  const belowBmr = derived !== null && values.kcal < derived.basis.bmr;

  const onSave = async () => {
    setSaving(true);
    await setGoalOverride({ kcal: values.kcal, proteinG: values.protein, fiberG: values.fiber });
    setSaving(false);
    navigation.goBack();
  };

  const resetToDerived = () => {
    if (!derived) return;
    setValues({ kcal: derived.kcal, protein: derived.proteinG, fiber: derived.fiberG });
  };

  return (
    <Screen edges="top">
      <Gutter style={{ paddingBottom: space.md }}>
        <SplitRow align="flex-start">
          <View style={{ flexShrink: 1, gap: 3 }}>
            <Eyebrow size={10} tone="ink3">
              TARGETS
            </Eyebrow>
            <Display size={28}>Adjust your numbers</Display>
          </View>
          <IconButton name="close" size={20} onPress={() => navigation.goBack()} accessibilityLabel="Close" style={{ marginRight: -10 }} />
        </SplitRow>
      </Gutter>

      <HeavyBar />

      <ScrollView contentContainerStyle={{ paddingBottom: space.xl }}>
        <Gutter style={{ paddingTop: space.lg, gap: space.xxl }}>
          <Stepper
            label="CALORIES"
            value={values.kcal}
            unit="kcal"
            step={10}
            min={800}
            max={8000}
            onChange={v => setValues(s => ({ ...s, kcal: v }))}
            hint={derived ? `Derived from your profile: ${kcal(derived.kcal)} kcal` : undefined}
          />
          <Stepper
            label="PROTEIN"
            value={values.protein}
            unit="g"
            step={5}
            min={20}
            max={500}
            onChange={v => setValues(s => ({ ...s, protein: v }))}
            hint={derived ? `Derived: ${derived.proteinG} g` : undefined}
          />
          <Stepper
            label="FIBER"
            value={values.fiber}
            unit="g"
            step={1}
            min={5}
            max={120}
            onChange={v => setValues(s => ({ ...s, fiber: v }))}
            hint={derived ? `Derived: ${derived.fiberG} g` : undefined}
          />
        </Gutter>

        {belowBmr && (
          <View style={{ paddingTop: space.xl }}>
            <Banner
              icon="alert"
              title="Below your resting burn"
              detail={`Your body spends about ${kcal(derived!.basis.bmr)} kcal a day at rest. We will still save this, but it is not a target we would set for you.`}
            />
          </View>
        )}

        {overridden && (
          <Gutter style={{ paddingTop: space.xl }}>
            <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.rule, padding: space.lg, gap: 8 }}>
              <Eyebrow size={9.5} tone="ink2">
                THESE ARE NOW YOURS, NOT OURS
              </Eyebrow>
              <Body size={13.5} tone="ink2">
                An overridden target stops tracking your profile. If your weight changes, it will not
                move with it until you come back here.
              </Body>
              <Row>
                <TextAction label="Back to derived targets" onPress={resetToDerived} />
              </Row>
            </View>
          </Gutter>
        )}

        <Gap h={space.xl} />
        <Divider />

        <Gutter style={{ paddingTop: space.lg, gap: 6 }}>
          <Eyebrow size={10} tone="ink2">
            HOW THIS IS STORED
          </Eyebrow>
          <Mono size={11} tone="ink3" style={{ lineHeight: 17 }}>
            Saving writes a new goal effective from today. Days before today keep the target that was
            in force when you logged them, so your history does not change under you.
          </Mono>
        </Gutter>
      </ScrollView>

      <Dock>
        <Disclaimer text="Estimates for general wellness, not medical advice." />
        <Gap h={space.sm + 2} />
        <PrimaryButton label="Save targets" loading={saving} onPress={onSave} />
      </Dock>
    </Screen>
  );
}
