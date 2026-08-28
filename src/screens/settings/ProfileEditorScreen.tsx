import React, { useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import { NAME_MAX, type ActivityLevel, type Goal, type Objective, type UserProfile } from '../../api/types';
import { Button, IconButton } from '../../components/Button';
import { Card } from '../../components/Card';
import { Disclaimer, Notice } from '../../components/Feedback';
import { Field, OptionRow, Segmented, Stepper } from '../../components/Field';
import { Gap, Gutter, Split, Stack } from '../../components/Layout';
import { Dock, Screen } from '../../components/Screen';
import { SectionLabel, Txt } from '../../components/Text';
import { nameStepSchema } from '../../forms/schemas';
import { kcal } from '../../lib/format';
import { ACTIVITY, ageFrom, deriveGoal, OBJECTIVE_LABEL } from '../../lib/nutrition';
import { useAppState } from '../../state/AppState';
import { useTheme } from '../../theme/ThemeProvider';
import type { ScreenProps } from '../../navigation/types';

/** The rates the onboarding step offers. The same four, so the two cannot drift. */
const RATES = [0.25, 0.5, 0.75, 1.0];

/**
 * The profile, after onboarding.
 *
 * Everything the flow asked for, on one scroll, because the reason to open this
 * is almost always one field: a weight that moved, a goal that changed, a name
 * typed in a hurry. Onboarding asks one question per screen — right when the
 * questions are new, wrong when they are five things you already answered and
 * want to see at once.
 *
 * **Saving recalculates the targets.** Every input to the goal formula lives on
 * this screen, so the server derives a new goal and appends it the moment the
 * profile is written. That is the point — a weight change that did not move the
 * calorie target would be a lie — but it also replaces a target that was set by
 * hand, so this says so before the press rather than after it.
 */
export function ProfileEditorScreen({ navigation }: ScreenProps<'ProfileEditor'>) {
  const { space } = useTheme();
  const { profile, goal, saveProfile } = useAppState();

  if (!profile) {
    // Only reachable from a card that renders the profile, so this is the cold
    // start race rather than a state anybody navigates into deliberately.
    return (
      <Screen>
        <Gutter>
          <Gap h={space.xxl} />
          <Notice
            icon="alert"
            title="Profile not loaded yet"
            detail="Close this and open it again in a moment."
          />
          <Gap h={space.lg} />
          <Button label="Close" variant="outline" onPress={() => navigation.goBack()} />
        </Gutter>
      </Screen>
    );
  }

  return (
    <Editor
      profile={profile}
      goal={goal}
      onClose={() => navigation.goBack()}
      onSave={async next => {
        await saveProfile(next);
        navigation.goBack();
      }}
    />
  );
}

/**
 * The form, taking a profile that is known to exist.
 *
 * Split out for that reason rather than for tidiness: `useState(profile)` in the
 * screen above would seed the draft from whatever was there on the first render,
 * which on a cold start is null — and a `useEffect` correcting it afterwards
 * would overwrite whatever had been typed in the meantime.
 */
function Editor({
  profile,
  goal,
  onSave,
  onClose,
}: {
  profile: UserProfile;
  goal: Goal | null;
  onSave: (p: UserProfile) => Promise<void>;
  onClose: () => void;
}) {
  const { space } = useTheme();
  const [draft, setDraft] = useState<UserProfile>(profile);
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);

  const patch = (p: Partial<UserProfile>) => setDraft(d => ({ ...d, ...p }));

  const age = ageFrom(draft.birthDate);
  const derived = useMemo(() => deriveGoal(draft), [draft]);

  // The same rule the rate step applies: a rate whose deficit would take the
  // target under resting burn is shown refused rather than offered and then
  // silently clipped.
  const rateAllowed = (rate: number) =>
    !deriveGoal({ ...draft, rateKgPerWeek: rate }).basis.flooredAtBmr;

  /**
   * The names, judged by the schema the onboarding step uses rather than by a
   * second rule written here — the same trade the portion screen makes for its
   * one field. Said only once they have pressed save, which is how every other
   * form in the app times it.
   */
  const parsed = nameStepSchema.safeParse({
    firstName: draft.firstName ?? '',
    lastName: draft.lastName ?? '',
  });
  const nameProblem = tried && !parsed.success ? parsed.error.issues[0].message : null;

  /**
   * Whether the targets in force were set by hand.
   *
   * Compared against the SAVED profile, not the draft: the question is whether
   * the goal on record still follows from the profile on record. Comparing to
   * the draft would call every unsaved edit an override.
   */
  const onRecord = useMemo(() => deriveGoal(profile), [profile]);
  const overridden =
    goal !== null && (goal.kcal !== onRecord.kcal || goal.proteinG !== onRecord.proteinG);

  const onPressSave = async () => {
    setTried(true);
    if (!parsed.success) return;

    setSaving(true);
    try {
      await onSave({
        ...draft,
        firstName: parsed.data.firstName,
        // Null, not undefined. The save merges over what is stored and an
        // absent key changes nothing, so a surname that was deleted here has
        // to be sent as an explicit "there is none" or it comes straight back
        // on the next load.
        lastName: parsed.data.lastName ?? null,
        // Maintaining has no rate. Sending the one left over from a previous
        // objective would store a number the formula ignores and then show it
        // again the next time this screen opens.
        rateKgPerWeek: draft.objective === 'maintain' ? 0 : draft.rateKgPerWeek,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Gutter>
        <Split align="flex-start" style={{ minHeight: 44 }}>
          <Stack gap={4} style={{ flexShrink: 1 }}>
            <Txt role="caption" tone="tertiary">
              You
            </Txt>
            <Txt role="h1">Your profile</Txt>
          </Stack>
          <IconButton
            name="close"
            onPress={onClose}
            accessibilityLabel="Close"
            style={{ marginRight: -10 }}
          />
        </Split>
      </Gutter>

      <ScrollView
        contentContainerStyle={{
          padding: space.gutter,
          paddingTop: space.xl,
          paddingBottom: space.xl,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Stack gap={space.xxl}>
          {/* name */}
          <Stack gap={space.md}>
            <SectionLabel>Name</SectionLabel>
            <Card>
              <Stack gap={space.md}>
                <Field
                  label="First name"
                  value={draft.firstName ?? ''}
                  onChangeText={firstName => patch({ firstName })}
                  placeholder="Alex"
                  autoCapitalize="words"
                  autoComplete="given-name"
                  textContentType="givenName"
                  maxLength={NAME_MAX}
                  problem={nameProblem}
                />
                <Field
                  label="Last name (optional)"
                  value={draft.lastName ?? ''}
                  onChangeText={lastName => patch({ lastName })}
                  placeholder="Leave blank if you would rather not"
                  autoCapitalize="words"
                  autoComplete="family-name"
                  textContentType="familyName"
                  maxLength={NAME_MAX}
                />
              </Stack>
            </Card>
          </Stack>

          {/* body */}
          <Stack gap={space.md}>
            <SectionLabel>About you</SectionLabel>
            <Card>
              <Segmented
                label="Sex"
                value={draft.sex}
                onChange={sex => patch({ sex })}
                options={[
                  { value: 'female', label: 'Female' },
                  { value: 'male', label: 'Male' },
                ]}
              />
            </Card>

            {/* Age is stored as a birth date and edited in years — the trade the
                onboarding step makes, and the same mid-June stand-in for a day
                that no formula here reads. */}
            <Stepper
              framed
              label="Age"
              value={age}
              unit="years"
              min={13}
              max={100}
              onChange={v => patch({ birthDate: `${new Date().getFullYear() - v}-06-15` })}
            />
            <Stepper
              framed
              label="Height"
              value={draft.heightCm}
              unit="cm"
              min={100}
              max={230}
              onChange={heightCm => patch({ heightCm })}
            />
            <Stepper
              framed
              label="Current weight"
              value={draft.weightKg}
              unit="kg"
              min={30}
              max={300}
              onChange={weightKg => patch({ weightKg })}
              hint="The field worth coming back for. Every figure below moves with it."
            />
          </Stack>

          {/* activity */}
          <Stack gap={space.md}>
            <SectionLabel>How active you are</SectionLabel>
            {(Object.keys(ACTIVITY) as ActivityLevel[]).map(level => (
              <OptionRow
                key={level}
                title={ACTIVITY[level].label}
                detail={ACTIVITY[level].detail}
                showDetail
                selected={draft.activityLevel === level}
                onPress={() => patch({ activityLevel: level })}
              />
            ))}
          </Stack>

          {/* objective */}
          <Stack gap={space.md}>
            <SectionLabel>Where your weight should go</SectionLabel>
            {(Object.keys(OBJECTIVE_LABEL) as Objective[]).map(o => (
              <OptionRow
                key={o}
                title={OBJECTIVE_LABEL[o]}
                selected={draft.objective === o}
                onPress={() =>
                  patch({
                    objective: o,
                    // Coming off maintain needs a rate again, and zero is not
                    // one — zero is the value maintain stores.
                    rateKgPerWeek: o === 'maintain' ? 0 : draft.rateKgPerWeek || 0.5,
                  })
                }
              />
            ))}
          </Stack>

          {/* rate — absent while maintaining, where there is no rate to pick */}
          {draft.objective !== 'maintain' && (
            <Stack gap={space.md}>
              <SectionLabel>How fast</SectionLabel>
              {RATES.map(rate => (
                <OptionRow
                  key={rate}
                  title={`${rate} kg a week`}
                  detail={
                    rateAllowed(rate)
                      ? undefined
                      : 'This would put your target below your resting burn.'
                  }
                  showDetail={!rateAllowed(rate)}
                  selected={draft.rateKgPerWeek === rate}
                  onPress={() => rateAllowed(rate) && patch({ rateKgPerWeek: rate })}
                />
              ))}
            </Stack>
          )}

          {/* what it comes to */}
          <Stack gap={space.md}>
            <SectionLabel>What this comes to</SectionLabel>
            <Card fill="sunken">
              <Stack gap={space.sm}>
                {/* Live, from the same `deriveGoal` the onboarding screens run.
                    Watching the calorie figure move as a stepper moves is the
                    whole argument for letting somebody edit this at all. */}
                <Split>
                  <Txt role="body" tone="secondary">
                    Calories
                  </Txt>
                  <Txt role="h3" numeric>
                    {kcal(derived.kcal)} kcal
                  </Txt>
                </Split>
                <Split>
                  <Txt role="body" tone="secondary">
                    Protein
                  </Txt>
                  <Txt role="h3" numeric>
                    {derived.proteinG} g
                  </Txt>
                </Split>
                <Split>
                  <Txt role="body" tone="secondary">
                    Fibre
                  </Txt>
                  <Txt role="h3" numeric>
                    {derived.fiberG} g
                  </Txt>
                </Split>

                {derived.basis.flooredAtBmr && (
                  <>
                    <Gap h={space.xs} />
                    <Txt role="bodySm" tone="attention">
                      Held at your resting burn — the rate you picked would go under it.
                    </Txt>
                  </>
                )}
              </Stack>
            </Card>

            {overridden && (
              <Card>
                <Stack gap={6}>
                  <Txt role="h3">Your targets are set by hand</Txt>
                  <Txt role="bodySm" tone="secondary">
                    Saving replaces them with the figures above, derived from this profile. Days you have
                    already logged keep the target that was in force when you logged them.
                  </Txt>
                </Stack>
              </Card>
            )}
          </Stack>
        </Stack>
      </ScrollView>

      <Dock>
        <Disclaimer text="Estimates for general wellness, not medical advice." />
        <Gap h={space.md} />
        <Button label="Save profile" loading={saving} onPress={onPressSave} haptic="commit" />
      </Dock>
    </Screen>
  );
}
