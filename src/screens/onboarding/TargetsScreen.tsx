import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { useApi } from '../../api/client';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Disclaimer } from '../../components/Feedback';
import { Icon } from '../../components/Icon';
import { Gap, Row, Split, Stack } from '../../components/Layout';
import { Press } from '../../components/Press';
import { Txt } from '../../components/Text';
import { requestMic } from '../../lib/speech';
import { deriveGoal, goalReasoning, macrosFor } from '../../lib/nutrition';
import { useTheme } from '../../theme/ThemeProvider';
import { useAppState } from '../../state/AppState';
import { useOnboarding } from '../../state/Onboarding';
import { OnboardStep } from './OnboardStep';
import type { SuggestedTargets, UserProfile } from '../../api/types';
import type { ScreenProps } from '../../navigation/types';

/**
 * The payoff screen: one card holding the whole day, and a button that takes it.
 *
 * It used to be three editable numbers with a suggestion card underneath
 * repeating them, which meant the same three figures appeared twice on one
 * screen and the second copy had its own accept button — so finishing
 * onboarding needed two decisions where there is one: is this right, yes.
 *
 * Nothing is editable here any more. Every target is changeable in settings,
 * on a screen built for it, and asking somebody to fine-tune a number before
 * they have logged a single meal is asking them to have an opinion about a
 * figure they have no experience of yet.
 *
 * All five nutrients, not three. Carbohydrate and fat were already being
 * calculated and already being tracked against for every meal — leaving them
 * off this screen meant the first time anybody saw their fat target was when
 * something was measured against it.
 */
export function TargetsScreen({ navigation, route }: ScreenProps<'OnboardTargets'>) {
  const { c, space } = useTheme();
  const { toProfile } = useOnboarding();
  const { saveProfile, setGoalOverride } = useAppState();

  const profile = toProfile();
  const derived = useMemo(() => deriveGoal(profile), [profile]);
  const reasoning = useMemo(() => goalReasoning(derived, profile), [derived, profile]);
  const asked = useSuggestedTargets(profile, route.params?.suggestion);
  const [saving, setSaving] = useState(false);

  // What the screen is showing, and therefore what the button commits. The
  // suggestion when there is one, the formula when there is not.
  //
  // The macros are derived here from whichever calorie figure won, rather than
  // read off the response. They are a function of it — fat a share, carbs the
  // remainder — so computing them locally means the four numbers always add up
  // to the one above them, and a server that answers with an older shape shows
  // a consistent card instead of crashing on a field that is not there.
  const chosen = asked.state === 'ready' ? asked.suggestion : derived;
  const shown = { ...chosen, ...macrosFor(chosen.kcal, chosen.proteinG) };

  const onContinue = async () => {
    setSaving(true);
    await saveProfile(profile);

    // Only send what differs from the formula. An untouched target stays
    // derived and keeps tracking the profile as the weight changes, which is
    // the reason goals are append-only rather than edited in place.
    const patch: Record<string, number> = {};
    if (shown.kcal !== derived.kcal) patch.kcal = shown.kcal;
    if (shown.proteinG !== derived.proteinG) patch.proteinG = shown.proteinG;
    if (shown.fiberG !== derived.fiberG) patch.fiberG = shown.fiberG;
    if (Object.keys(patch).length) await setGoalOverride(patch);

    // The microphone, asked for on the tap that ends the form.
    //
    // Here rather than on the screen that uses it, because this is the moment
    // somebody has just said yes to something: the targets are accepted, the
    // next screen is the first meal, and the dialog lands between the two
    // rather than on top of a screen still being read. Android spends that
    // dialog at most twice, so it is worth spending on a tap that already
    // means "go on".
    //
    // The answer is not branched on. A refusal is not a reason to skip the
    // screen — it can be granted from there, or the screen can be left — and a
    // grant is still not consent to record. Nothing in this app starts
    // recording because a screen appeared: a turn ends by itself and walks
    // straight to the confirm sheet, so a screen that arrives listening can
    // hear a room and present somebody with a meal they never said, on their
    // first use, having paid for the parse of it.
    await requestMic();

    // Held through the dialog. The tap is still in progress until the next
    // screen is up, and a button that comes back to life underneath a system
    // prompt invites the whole commit to be run twice.
    setSaving(false);

    // Main goes underneath, so speaking (which ends at the confirm sheet) and
    // skipping both land on Home with no onboarding left to swipe back into.
    navigation.reset({
      index: 1,
      routes: [{ name: 'Main' }, { name: 'Listen', params: { first: true } }],
    });
  };

  return (
    <OnboardStep
      title="Your daily targets"
      footer={
        <>
          <Disclaimer text="Estimates for general wellness, not medical advice." />
          <Gap h={space.md} />
          <Button label="Looks right — continue" loading={saving} onPress={onContinue} haptic="commit" />
        </>
      }>
      <Stack gap={space.md}>
        <Card>
          <Row gap={6} align="baseline">
            <Txt role="display" numeric style={{ fontSize: 44, lineHeight: 48 }}>
              {shown.kcal.toLocaleString('en-US')}
            </Txt>
            <Txt role="bodyLg" tone="secondary">
              kcal a day
            </Txt>
          </Row>

          <Gap h={space.lg} />

          {/* The four that make up the day underneath the one that bounds it.
              Same row, same size, because none of them is a footnote to the
              others — they are what the calorie figure is made of. */}
          <Row gap={space.md}>
            <Macro label="Protein" value={shown.proteinG} />
            <Macro label="Carbs" value={shown.carbsG} />
            <Macro label="Fat" value={shown.fatG} />
            <Macro label="Fibre" value={shown.fiberG} />
          </Row>

          {asked.state === 'asking' ? (
            <>
              <Gap h={space.lg} />
              <Row gap={space.sm} align="center">
                <ActivityIndicator size="small" color={c.inkTertiary} />
                <Txt role="labelSm" tone="tertiary" caps style={{ letterSpacing: 1.1 }}>
                  Checking these for you
                </Txt>
              </Row>
            </>
          ) : null}

          {asked.state === 'ready' ? (
            <>
              <Gap h={space.lg} />
              <Reviewed suggestion={asked.suggestion} />
            </>
          ) : null}
        </Card>

        {/* Folded away, not deleted. Showing the arithmetic is what stops a
            target being nudged upward by somebody hoping for a bigger one —
            but three paragraphs of it was most of the words on the screen, and
            the question it answers is one people ask once. */}
        <Disclosure label="Why these numbers?">
          <Stack gap={space.md}>
            {(['kcal', 'protein', 'fiber'] as const).map(key => (
              <Stack key={key} gap={2}>
                <Txt role="labelSm" tone="secondary">
                  {key === 'kcal' ? 'Calories' : key === 'protein' ? 'Protein' : 'Fibre'}
                </Txt>
                <Txt role="bodySm" tone="secondary">
                  {reasoning[key]}
                </Txt>
              </Stack>
            ))}
          </Stack>
        </Disclosure>
      </Stack>
    </OnboardStep>
  );
}

/** One of the four the day is made of. */
function Macro({ label, value }: { label: string; value: number }) {
  return (
    <Stack gap={2} style={{ flexGrow: 1, flexBasis: 0 }}>
      <Txt role="caption" tone="tertiary">
        {label}
      </Txt>
      <Row gap={2} align="baseline">
        <Txt role="h3" numeric>
          {value.toLocaleString('en-US')}
        </Txt>
        <Txt role="caption" tone="secondary">
          g
        </Txt>
      </Row>
    </Stack>
  );
}

/**
 * What the model made of these figures.
 *
 * No button. The numbers above already ARE the suggestion — it is what the
 * screen is showing and what continuing commits — so an accept button would be
 * asking somebody to agree to something that has already happened. This says
 * where they came from and what was thought about them, which is the part that
 * was ever worth reading.
 */
function Reviewed({ suggestion }: { suggestion: SuggestedTargets }) {
  const { c, space } = useTheme();

  return (
    <Stack gap={space.sm}>
      <Row gap={space.sm} align="center">
        <Icon name="sparkle" size={14} color={c.inkTertiary} />
        <Txt role="labelSm" tone="tertiary" caps style={{ letterSpacing: 1.1 }}>
          Checked for you
        </Txt>
      </Row>
      <Txt role="bodySm" tone="secondary">
        {suggestion.reasoning}
      </Txt>
      {/* Amber, doing its usual job: the app saying a figure is not quite what
          it appears to be. The model proposed something outside the bounds and
          the server moved it, and showing the corrected number without saying
          so would credit the model with the server's answer. */}
      {suggestion.corrections.map(line => (
        <Txt key={line} role="caption" tone="attention">
          {line}
        </Txt>
      ))}
    </Stack>
  );
}

type Asked =
  | { state: 'asking' }
  | { state: 'none' }
  | { state: 'ready'; suggestion: SuggestedTargets };

/**
 * Asks the model what it would set, once, when the screen opens.
 *
 * Usually there is nothing to ask: the step before fetches it while its button
 * spins, and hands it over as a route param. This is the fallback for when that
 * timed out or failed, and for a screen reached any other way.
 *
 * Three states, not two, and that distinction is the whole reason this is a
 * type rather than a nullable value. "Asking" and "there is none" both used to
 * be null, and the screen drew its loading line for both — so a missing
 * endpoint, an unconfigured model or a refusal all showed "checking these for
 * you" forever, on the last screen of onboarding.
 *
 * Every failure is `none`. No model configured, no network, a refusal, a
 * malformed answer: none of them are worth an error on the screen where
 * somebody is about to finish, because the derived targets are already there
 * and are already complete. But none of them are loading either.
 *
 * Mount-only on purpose. `toProfile` builds a fresh object every render, so a
 * dependency on it would ask again — and bill again — on every re-render.
 */
function useSuggestedTargets(profile: UserProfile, prefetched?: SuggestedTargets): Asked {
  const api = useApi();
  const asked = useRef(profile);
  const [result, setResult] = useState<Asked>(
    prefetched ? { state: 'ready', suggestion: prefetched } : { state: 'asking' },
  );

  useEffect(() => {
    // Already answered on the step before, while its button was spinning.
    if (prefetched) return;

    let alive = true;
    api
      .suggestTargets(asked.current)
      .then((s: SuggestedTargets) => alive && setResult({ state: 'ready', suggestion: s }))
      .catch(() => alive && setResult({ state: 'none' }));
    return () => {
      alive = false;
    };
  }, [api, prefetched]);

  return result;
}

/** A heading that opens. Closed by default, because the answer is read once. */
function Disclosure({ label, children }: { label: string; children: React.ReactNode }) {
  const { c, space } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <Press
        onPress={() => setOpen(o => !o)}
        feedback="none"
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={label}>
        <Split align="center">
          <Txt role="labelSm" tone="secondary" caps style={{ letterSpacing: 1.1 }}>
            {label}
          </Txt>
          <Icon
            name={open ? 'chevronDown' : 'chevronRight'}
            size={16}
            color={c.inkTertiary}
            weight={2.2}
          />
        </Split>
      </Press>
      {open ? (
        <>
          <Gap h={space.lg} />
          {children}
        </>
      ) : null}
    </Card>
  );
}
