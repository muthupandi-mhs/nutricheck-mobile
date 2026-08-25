import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Disclaimer } from '../../components/Banner';
import { IconButton, PrimaryButton } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { StepBar, Stepper } from '../../components/Field';
import { Divider, Gap, Gutter, Hairline, HeavyBar, Row, SplitRow } from '../../components/Layout';
import { Dock, Screen } from '../../components/Screen';
import { Body, Display, Eyebrow, Mono } from '../../components/Type';
import { ACTIVITY, deriveGoal, goalReasoning } from '../../lib/nutrition';
import { useTheme } from '../../theme/ThemeProvider';
import { useAppState } from '../../state/AppState';
import { useOnboarding } from '../../state/Onboarding';
import type { ScreenProps } from '../../navigation/types';

type Key = 'kcal' | 'protein' | 'fiber';

/**
 * The payoff screen. Three numbers, the reasoning under each, all editable.
 *
 * Showing the arithmetic is not a transparency gesture — it is the cheapest
 * way to stop people from changing the numbers. A target that arrives with
 * "resting burn 1,632 × 1.55, minus 18%" under it gets accepted; the same
 * target arriving bare gets nudged upward by anyone who was hoping for a
 * bigger one, and the app spends the rest of the relationship measuring
 * against a figure nobody derived.
 */
export function TargetsScreen({ navigation }: ScreenProps<'OnboardTargets'>) {
  const { c, space } = useTheme();
  const { toProfile, draft } = useOnboarding();
  const { saveProfile, setGoalOverride } = useAppState();

  const profile = toProfile();
  const derived = useMemo(() => deriveGoal(profile), [profile]);
  const reasoning = useMemo(() => goalReasoning(derived, profile), [derived, profile]);

  const [values, setValues] = useState({
    kcal: derived.kcal,
    protein: derived.proteinG,
    fiber: derived.fiberG,
  });
  const [editing, setEditing] = useState<Key | null>(null);
  const [saving, setSaving] = useState(false);

  const rows: Array<{ key: Key; label: string; unit: string; step: number; min: number; max: number }> = [
    { key: 'kcal', label: 'CALORIES', unit: 'kcal', step: 10, min: 800, max: 8000 },
    { key: 'protein', label: 'PROTEIN', unit: 'g', step: 5, min: 20, max: 500 },
    { key: 'fiber', label: 'FIBER', unit: 'g', step: 1, min: 5, max: 120 },
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
    // Only send fields the user actually moved — an unchanged target stays
    // derived, so it keeps tracking the profile as their weight changes.
    const patch: Record<string, number> = {};
    if (values.kcal !== derived.kcal) patch.kcal = values.kcal;
    if (values.protein !== derived.proteinG) patch.proteinG = values.protein;
    if (values.fiber !== derived.fiberG) patch.fiberG = values.fiber;
    if (Object.keys(patch).length) await setGoalOverride(patch);
    setSaving(false);
    // Step 6 is a first log, and it goes to search rather than the composer:
    // the first one should succeed with certainty, before we ask anyone to
    // trust a parse. Home sits underneath, so backing out lands somewhere real.
    navigation.reset({
      index: 1,
      routes: [{ name: 'Home' }, { name: 'Search', params: { firstLog: true } }],
    });
  };

  return (
    <Screen edges="top">
      <StepBar step={5} of={6} />

      <Gutter>
        <Eyebrow size={10.5} tone="ink2">
          STEP 5 OF 6
        </Eyebrow>
        <Gap h={space.sm} />
        <Display size={32}>Your daily targets</Display>
        <Gap h={space.sm} />
        <Body size={15.5} tone="ink2">
          Here is where these come from. Change anything that does not look right — you can always
          adjust later.
        </Body>
      </Gutter>

      <Gap h={space.xs} />
      <HeavyBar />

      <ScrollView contentContainerStyle={{ paddingBottom: space.xl }}>
        <Gutter>
          {rows.map((row, i) => {
            const value = values[row.key];
            const isEditing = editing === row.key;
            return (
              <View key={row.key}>
                {isEditing ? (
                  <View style={{ paddingVertical: space.lg, gap: space.md }}>
                    <Stepper
                      label={row.label}
                      value={value}
                      unit={row.unit}
                      step={row.step}
                      min={row.min}
                      max={row.max}
                      onChange={v => setValues(s => ({ ...s, [row.key]: v }))}
                    />
                    <SplitRow>
                      <Chip
                        label={`Reset to ${row.key === 'kcal' ? derived.kcal : row.key === 'protein' ? derived.proteinG : derived.fiberG}`}
                        onPress={() =>
                          setValues(s => ({
                            ...s,
                            [row.key]: row.key === 'kcal' ? derived.kcal : row.key === 'protein' ? derived.proteinG : derived.fiberG,
                          }))
                        }
                      />
                      <Chip label="Done" variant="selected" onPress={() => setEditing(null)} />
                    </SplitRow>
                  </View>
                ) : (
                  <Row align="flex-start" gap={space.lg} style={{ paddingVertical: space.lg }}>
                    <View style={{ flexGrow: 1, flexShrink: 1, gap: 4 }}>
                      <Eyebrow size={10.5} tone="ink2">
                        {row.label}
                      </Eyebrow>
                      <Row gap={6} align="baseline">
                        <Display size={40}>{value.toLocaleString('en-US')}</Display>
                        <Mono size={12} tone="ink2">
                          {row.unit}
                        </Mono>
                      </Row>
                      <Body size={13.5} tone="ink2" style={{ paddingTop: 3 }}>
                        {reasoning[row.key]}
                      </Body>
                    </View>
                    <View
                      style={{
                        borderWidth: 1,
                        borderColor: c.rule,
                        backgroundColor: c.surface,
                        marginTop: space.lg,
                      }}>
                      <IconButton
                        name="pencil"
                        size={17}
                        onPress={() => setEditing(row.key)}
                        accessibilityLabel={`Edit ${row.label.toLowerCase()} target`}
                      />
                    </View>
                  </Row>
                )}
                {i < rows.length - 1 && <Hairline />}
              </View>
            );
          })}
        </Gutter>

        <Divider />

        <Gutter style={{ paddingVertical: space.lg, gap: 8 }}>
          <Eyebrow size={10} tone="ink2">
            BASED ON
          </Eyebrow>
          <Row gap={6} wrap>
            {basis.map(b => (
              <Chip key={b} label={b} size={11} />
            ))}
          </Row>
        </Gutter>
      </ScrollView>

      <Dock>
        <Disclaimer text="Estimates for general wellness, not medical advice." />
        <Gap h={space.sm + 2} />
        <PrimaryButton label="Looks right — continue" loading={saving} onPress={onContinue} />
      </Dock>
    </Screen>
  );
}
