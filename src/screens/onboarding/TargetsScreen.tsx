import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Button, IconButton, TextButton } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Disclaimer } from '../../components/Feedback';
import { Stepper } from '../../components/Field';
import { Divider, Gap, Row, Split, Stack } from '../../components/Layout';
import { Txt } from '../../components/Text';
import { ACTIVITY, deriveGoal, goalReasoning } from '../../lib/nutrition';
import { useTheme } from '../../theme/ThemeProvider';
import { useAppState } from '../../state/AppState';
import { useOnboarding } from '../../state/Onboarding';
import { OnboardStep, StepGroup } from './OnboardStep';
import type { ScreenProps } from '../../navigation/types';

type Key = 'kcal' | 'protein' | 'fiber';

/**
 * The payoff screen. Three numbers, the reasoning under each, all editable.
 * Showing the arithmetic is the cheapest way to stop people nudging the
 * numbers — a bare target gets adjusted upward by anyone hoping for a bigger one.
 */
export function TargetsScreen({ navigation }: ScreenProps<'OnboardTargets'>) {
  const { c, space, radius } = useTheme();
  const { toProfile, draft } = useOnboarding();
  const { saveProfile, setGoalOverride } = useAppState();

  const profile = toProfile();
  const derived = useMemo(() => deriveGoal(profile), [profile]);
  const reasoning = useMemo(() => goalReasoning(derived, profile), [derived, profile]);

  const [values, setValues] = useState({ kcal: derived.kcal, protein: derived.proteinG, fiber: derived.fiberG });
  const [editing, setEditing] = useState<Key | null>(null);
  const [saving, setSaving] = useState(false);

  const rows: Array<{ key: Key; label: string; unit: string; step: number; min: number; max: number; base: number }> = [
    { key: 'kcal', label: 'Calories', unit: 'kcal', step: 10, min: 800, max: 8000, base: derived.kcal },
    { key: 'protein', label: 'Protein', unit: 'g', step: 5, min: 20, max: 500, base: derived.proteinG },
    { key: 'fiber', label: 'Fibre', unit: 'g', step: 1, min: 5, max: 120, base: derived.fiberG },
  ];

  const basis = [
    `${new Date().getFullYear() - draft.birthYear} years`,
    draft.units === 'metric' ? `${draft.heightCm} cm` : `${Math.round(draft.heightCm / 2.54)} in`,
    draft.units === 'metric' ? `${draft.weightKg} kg` : `${Math.round(draft.weightKg * 2.20462)} lb`,
    ACTIVITY[draft.activityLevel].label.split('—')[0].trim(),
    draft.objective === 'maintain' ? 'Maintain' : `${draft.objective === 'lose' ? 'Lose' : 'Gain'} ${draft.rateKgPerWeek} kg/wk`,
  ];

  const onContinue = async () => {
    setSaving(true);
    await saveProfile(profile);
    // Only send what the user moved — an untouched target stays derived and
    // keeps tracking the profile as their weight changes.
    const patch: Record<string, number> = {};
    if (values.kcal !== derived.kcal) patch.kcal = values.kcal;
    if (values.protein !== derived.proteinG) patch.proteinG = values.protein;
    if (values.fiber !== derived.fiberG) patch.fiberG = values.fiber;
    if (Object.keys(patch).length) await setGoalOverride(patch);
    setSaving(false);

    // The first log goes to search, not the composer — it should succeed with
    // certainty before anyone is asked to trust a parse.
    navigation.reset({
      index: 1,
      routes: [{ name: 'Main' }, { name: 'Search', params: { firstLog: true } }],
    });
  };

  return (
    <OnboardStep
      step={5}
      title="Your daily targets"
      subtitle="Where these come from. Change anything that looks wrong."
      footer={
        <>
          <Disclaimer text="Estimates for general wellness, not medical advice." />
          <Gap h={space.md} />
          <Button label="Looks right — continue" loud loading={saving} onPress={onContinue} haptic="commit" />
        </>
      }>
      <Stack gap={space.xl}>
        {rows.map((row, i) => {
          const value = values[row.key];
          const isEditing = editing === row.key;
          const overridden = value !== row.base;

          return (
            <View key={row.key}>
              {i > 0 && (
                <>
                  <Divider />
                  <Gap h={space.xl} />
                </>
              )}

              {isEditing ? (
                <Stack gap={space.lg}>
                  <Stepper
                    label={row.label}
                    value={value}
                    unit={row.unit}
                    step={row.step}
                    min={row.min}
                    max={row.max}
                    onChange={v => setValues(s => ({ ...s, [row.key]: v }))}
                  />
                  <Split>
                    <TextButton
                      label={`Reset to ${row.base.toLocaleString('en-US')}`}
                      tone="secondary"
                      role="labelSm"
                      onPress={() => setValues(s => ({ ...s, [row.key]: row.base }))}
                    />
                    <Button label="Done" size="sm" full={false} variant="tonal" onPress={() => setEditing(null)} />
                  </Split>
                </Stack>
              ) : (
                <Row gap={space.lg} align="flex-start">
                  <Stack gap={5} style={{ flexGrow: 1, flexShrink: 1 }}>
                    <Row gap={space.sm}>
                      <Txt role="labelSm" tone="secondary">
                        {row.label}
                      </Txt>
                      {overridden && <Chip label="Yours" variant="success" />}
                    </Row>
                    <Row gap={6} align="baseline">
                      <Txt role="display" numeric style={{ fontSize: 40, lineHeight: 44 }}>
                        {value.toLocaleString('en-US')}
                      </Txt>
                      <Txt role="body" tone="secondary">
                        {row.unit}
                      </Txt>
                    </Row>
                    <Txt role="bodySm" tone="secondary">
                      {reasoning[row.key]}
                    </Txt>
                  </Stack>
                  <IconButton
                    name="edit"
                    size={18}
                    variant="tonal"
                    onPress={() => setEditing(row.key)}
                    accessibilityLabel={`Edit ${row.label.toLowerCase()} target`}
                  />
                </Row>
              )}
            </View>
          );
        })}

        <StepGroup label="Based on">
          <Row gap={space.sm} wrap>
            {basis.map(b => (
              <View
                key={b}
                style={{
                  backgroundColor: c.surface,
                  borderRadius: radius.pill,
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                }}>
                <Txt role="caption" tone="secondary">
                  {b}
                </Txt>
              </View>
            ))}
          </Row>
        </StepGroup>
      </Stack>
    </OnboardStep>
  );
}
