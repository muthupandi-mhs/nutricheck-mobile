import React from 'react';
import { ScrollView, View } from 'react-native';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button, IconButton, TextButton } from '../../components/Button';
import { Card } from '../../components/Card';
import { Disclaimer, Notice } from '../../components/Feedback';
import { Gap, Gutter, Split, Stack } from '../../components/Layout';
import { Dock, Screen } from '../../components/Screen';
import { SectionLabel, Txt } from '../../components/Text';
import { FormStepper, REVEAL_ON_SUBMIT } from '../../forms/fields';
import { GOAL_BOUNDS, goalTargetsSchema, type GoalTargetsValues } from '../../forms/schemas';
import { kcal } from '../../lib/format';
import { deriveGoal } from '../../lib/nutrition';
import { useTheme } from '../../theme/ThemeProvider';
import { useAppState } from '../../state/AppState';
import type { ScreenProps } from '../../navigation/types';

/**
 * Editing the targets after onboarding. Goal rows are append-only with an
 * `effectiveFrom` date and this screen only ever writes a new one, so last
 * month's "you hit your target" cannot retroactively become a miss.
 *
 * "Back to derived" is first-class rather than buried: a target that tracks the
 * profile is the one that stays correct.
 */
export function GoalEditorScreen({ navigation }: ScreenProps<'GoalEditor'>) {
  const { space } = useTheme();
  const { goal, profile, setGoalOverride } = useAppState();

  const derived = profile ? deriveGoal(profile) : null;

  // The steppers cannot leave the bounds `goalTargetsSchema` enforces, so this
  // form has no reachable error state. The resolver is here anyway: it is what
  // makes those bounds one number rather than two, and the day the targets
  // become typeable it is already the thing deciding.
  const { control, handleSubmit, formState, watch, reset } = useForm<GoalTargetsValues>({
    ...REVEAL_ON_SUBMIT,
    resolver: zodResolver(goalTargetsSchema),
    defaultValues: {
      kcal: goal?.kcal ?? 2000,
      proteinG: goal?.proteinG ?? 120,
      carbsG: goal?.carbsG ?? 230,
      fatG: goal?.fatG ?? 60,
      fiberG: goal?.fiberG ?? 28,
    },
  });

  const values = watch();

  const overridden =
    derived !== null &&
    (values.kcal !== derived.kcal ||
      values.proteinG !== derived.proteinG ||
      values.carbsG !== derived.carbsG ||
      values.fatG !== derived.fatG ||
      values.fiberG !== derived.fiberG);
  const belowBmr = derived !== null && values.kcal < derived.basis.bmr;

  const onSave = handleSubmit(async targets => {
    await setGoalOverride(targets);
    navigation.goBack();
  });

  return (
    <Screen scrollable>
      <Gutter>
        <Split align="flex-start" style={{ minHeight: 44 }}>
          <Stack gap={4} style={{ flexShrink: 1 }}>
            <Txt role="caption" tone="tertiary">
              Targets
            </Txt>
            <Txt role="h1">Adjust your numbers</Txt>
          </Stack>
          <IconButton
            name="close"
            onPress={() => navigation.goBack()}
            accessibilityLabel="Close"
            style={{ marginRight: -10 }}
          />
        </Split>
      </Gutter>

      <ScrollView contentContainerStyle={{ padding: space.gutter, paddingTop: space.xl, paddingBottom: space.xl }}>
        <Stack gap={space.lg}>
          <Card>
            <FormStepper
              control={control}
              name="kcal"
              label="Calories"
              unit="kcal"
              {...GOAL_BOUNDS.kcal}
              hint={derived ? `Derived from your profile: ${kcal(derived.kcal)} kcal` : undefined}
            />
          </Card>

          <Card>
            <FormStepper
              control={control}
              name="proteinG"
              label="Protein"
              unit="g"
              {...GOAL_BOUNDS.proteinG}
              hint={derived ? `Derived: ${derived.proteinG} g` : undefined}
            />
          </Card>

          {/* Carbs and fat sit between protein and fibre, the order a label
              prints them. The four are not independent — they are constrained
              by the calorie target — but an override is taken literally rather
              than silently rebalanced: a target the user set and the app then
              changed is worse than one that does not quite add up. */}
          <Card>
            <FormStepper
              control={control}
              name="carbsG"
              label="Carbs"
              unit="g"
              {...GOAL_BOUNDS.carbsG}
              hint={derived ? `Derived: ${derived.carbsG} g` : undefined}
            />
          </Card>

          <Card>
            <FormStepper
              control={control}
              name="fatG"
              label="Fat"
              unit="g"
              {...GOAL_BOUNDS.fatG}
              hint={derived ? `Derived: ${derived.fatG} g` : undefined}
            />
          </Card>

          <Card>
            <FormStepper
              control={control}
              name="fiberG"
              label="Fibre"
              unit="g"
              {...GOAL_BOUNDS.fiberG}
              hint={derived ? `Derived: ${derived.fiberG} g` : undefined}
            />
          </Card>

          {belowBmr && (
            <View style={{ marginHorizontal: -space.gutter }}>
              <Notice
                icon="alert"
                title="Below your resting burn"
                detail={`Your body spends about ${kcal(derived!.basis.bmr)} kcal a day at rest. We will save this, but it is not a target we would set for you.`}
              />
            </View>
          )}

          {overridden && (
            <Card fill="attentionSoft">
              <Stack gap={space.sm}>
                <SectionLabel tone="attention">These are now yours, not ours</SectionLabel>
                <Txt role="bodySm" tone="secondary">
                  An overridden target stops tracking your profile. If your weight changes it will not move with
                  it until you come back here.
                </Txt>
                <View style={{ alignSelf: 'flex-start', paddingTop: 2 }}>
                  <TextButton
                    label="Back to derived targets"
                    role="labelSm"
                    onPress={() =>
                      derived &&
                      reset({
                        kcal: derived.kcal,
                        proteinG: derived.proteinG,
                        fiberG: derived.fiberG,
                      })
                    }
                  />
                </View>
              </Stack>
            </Card>
          )}

          <Card fill="sunken">
            <Stack gap={6}>
              <SectionLabel>How this is stored</SectionLabel>
              <Txt role="bodySm" tone="secondary">
                Saving writes a new goal effective from today. Days before today keep the target that was in
                force when you logged them, so your history does not change under you.
              </Txt>
            </Stack>
          </Card>
        </Stack>
      </ScrollView>

      <Dock>
        <Disclaimer text="Estimates for general wellness, not medical advice." />
        <Gap h={space.md} />
        <Button
          label="Save targets"
          loading={formState.isSubmitting || formState.isSubmitSuccessful}
          onPress={onSave}
          haptic="commit"
        />
      </Dock>
    </Screen>
  );
}
