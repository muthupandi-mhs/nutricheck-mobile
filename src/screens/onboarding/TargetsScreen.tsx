import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useApi } from '../../api/client';
import { Button, IconButton, TextButton } from '../../components/Button';
import { Card } from '../../components/Card';
import { Chip } from '../../components/Chip';
import { Disclaimer } from '../../components/Feedback';
import { Stepper } from '../../components/Field';
import { Icon } from '../../components/Icon';
import { Divider, Gap, Row, Split, Stack } from '../../components/Layout';
import { Txt } from '../../components/Text';
import { ACTIVITY, deriveGoal, goalReasoning } from '../../lib/nutrition';
import { useTheme } from '../../theme/ThemeProvider';
import { useAppState } from '../../state/AppState';
import { useOnboarding } from '../../state/Onboarding';
import { OnboardStep, StepGroup } from './OnboardStep';
import type { SuggestedTargets, UserProfile } from '../../api/types';
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
  const suggestion = useSuggestedTargets(profile);
  const [editing, setEditing] = useState<Key | null>(null);
  const [saving, setSaving] = useState(false);

  const rows: Array<{ key: Key; label: string; unit: string; step: number; min: number; max: number; base: number }> = [
    { key: 'kcal', label: 'Calories', unit: 'kcal', step: 10, min: 800, max: 8000, base: derived.kcal },
    { key: 'protein', label: 'Protein', unit: 'g', step: 5, min: 20, max: 500, base: derived.proteinG },
    { key: 'fiber', label: 'Fibre', unit: 'g', step: 1, min: 5, max: 120, base: derived.fiberG },
  ];

  const basis = [
    `${new Date().getFullYear() - draft.birthYear} years`,
    `${draft.heightCm} cm`,
    `${draft.weightKg} kg`,
    ACTIVITY[draft.activityLevel].short,
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

        {suggestion ? (
          <SuggestionCard
            suggestion={suggestion}
            applied={
              values.kcal === suggestion.kcal &&
              values.protein === suggestion.proteinG &&
              values.fiber === suggestion.fiberG
            }
            differs={
              suggestion.kcal !== derived.kcal ||
              suggestion.proteinG !== derived.proteinG ||
              suggestion.fiberG !== derived.fiberG
            }
            onApply={() =>
              setValues({
                kcal: suggestion.kcal,
                protein: suggestion.proteinG,
                fiber: suggestion.fiberG,
              })
            }
          />
        ) : null}

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

/**
 * Asks the model what it would set, once, when the screen opens.
 *
 * Mount-only on purpose. The profile is settled by the time anybody reaches
 * this screen — the four steps behind it are what produced it — and `toProfile`
 * builds a fresh object every render, so a dependency on it would ask again on
 * every keystroke of a target being edited.
 *
 * Any failure is null. No model configured, no network, a refusal, a malformed
 * answer: all of them mean there is no suggestion, and none of them are worth
 * an error on the screen where somebody is about to finish onboarding. The
 * derived targets are already there and are already complete.
 */
function useSuggestedTargets(profile: UserProfile): SuggestedTargets | null {
  const api = useApi();
  const asked = useRef(profile);
  const [suggestion, setSuggestion] = useState<SuggestedTargets | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .suggestTargets(asked.current)
      .then((s: SuggestedTargets) => alive && setSuggestion(s))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [api]);

  return suggestion;
}

/**
 * What the model would set, and why.
 *
 * Three states, and the distinction between the first two is the point:
 *
 * - it agrees with the formula, which the prompt says is the common answer.
 *   Then there is nothing to apply and the card is reassurance, not an offer.
 * - it would change something. Then it shows its figures and a way to take
 *   them, and the derived numbers stay above, unchanged, until you do.
 * - it was corrected on the way out. Then it says so, because a number the
 *   server moved is not the number the model chose.
 */
function SuggestionCard({
  suggestion,
  applied,
  differs,
  onApply,
}: {
  suggestion: SuggestedTargets;
  applied: boolean;
  differs: boolean;
  onApply: () => void;
}) {
  const { c, space } = useTheme();

  return (
    <Card>
      <Row gap={space.sm} align="center">
        <Icon name="sparkle" size={16} color={c.inkSecondary} />
        <Txt role="labelSm" tone="secondary" caps style={{ letterSpacing: 1.1 }}>
          {differs ? 'Suggested for you' : 'Checked for you'}
        </Txt>
      </Row>

      <Gap h={space.md} />
      <Txt role="body">{suggestion.reasoning}</Txt>

      {differs ? (
        <>
          <Gap h={space.lg} />
          <Row gap={space.xl}>
            <Suggested label="Calories" value={suggestion.kcal} unit="kcal" />
            <Suggested label="Protein" value={suggestion.proteinG} unit="g" />
            <Suggested label="Fibre" value={suggestion.fiberG} unit="g" />
          </Row>
          <Gap h={space.lg} />
          <Button
            label={applied ? 'Applied' : 'Use these'}
            variant="tonal"
            size="sm"
            full={false}
            disabled={applied}
            icon={applied ? 'check' : undefined}
            onPress={onApply}
            haptic="select"
          />
        </>
      ) : null}

      {suggestion.corrections.length > 0 ? (
        <>
          <Gap h={space.md} />
          {/* Amber, and doing its usual job: this is the app saying a figure is
              not what it appears to be. The model proposed something outside
              the bounds and the server moved it, and showing the corrected
              number without saying so would credit the model with the server's
              answer. */}
          {suggestion.corrections.map((line: string) => (
            <Txt key={line} role="caption" tone="attention">
              {line}
            </Txt>
          ))}
        </>
      ) : null}
    </Card>
  );
}

/** One suggested figure, next to its siblings. */
function Suggested({ label, value, unit }: { label: string; value: number; unit: string }) {
  const { space } = useTheme();
  return (
    <Stack gap={2} style={{ flexGrow: 1, flexBasis: 0 }}>
      <Txt role="caption" tone="tertiary">
        {label}
      </Txt>
      <Row gap={3} align="baseline">
        <Txt role="h3" numeric>
          {value.toLocaleString('en-US')}
        </Txt>
        <Txt role="caption" tone="secondary">
          {unit}
        </Txt>
      </Row>
      <Gap h={space.xs} />
    </Stack>
  );
}
