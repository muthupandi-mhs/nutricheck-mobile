import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Button, IconButton, TextButton } from '../../components/Button';
import { Card } from '../../components/Card';
import { Notice } from '../../components/Feedback';
import { Field } from '../../components/Field';
import { FoodGlyph } from '../../components/FoodGlyph';
import { Icon } from '../../components/Icon';
import { Divider, Gap, Gutter, Row, Split, Stack } from '../../components/Layout';
import { Press } from '../../components/Press';
import { Screen } from '../../components/Screen';
import { SectionLabel, Txt } from '../../components/Text';
import { useApi } from '../../api/client';
import { kcal } from '../../lib/format';
import { hasMic, requestMic, SPEECH_LOCALES, useSpeech, type SpeechFailure } from '../../lib/speech';
import { useTheme } from '../../theme/ThemeProvider';
import { useAppState } from '../../state/AppState';
import { MicPrimer, RecordingOverlay } from './DictationOverlay';
import type { ScreenProps } from '../../navigation/types';

/** A rough item count, purely so the box shows it is reading along. Not the parse. */
const countItems = (s: string) =>
  s
    .toLowerCase()
    .split(/,|\band\b|\bwith\b|\bplus\b/g)
    .map(x => x.trim())
    .filter(Boolean).length;

/**
 * One entry per `SpeechFailure`. Keyed by the union rather than `string` so a
 * new failure mode cannot be added without copy — an unlisted key reads as
 * `undefined` here and takes the whole screen down on `.title`.
 */
const MIC_TROUBLE: Record<SpeechFailure, { title: string; detail: string }> = {
  permission: {
    title: 'The microphone is off',
    detail: 'Turn it on for NutriCheck in your phone settings, or type what you ate instead.',
  },
  unavailable: {
    title: 'Dictation is not available in this build',
    detail: 'Typing works exactly the same — we read the sentence either way.',
  },
  'nothing-heard': {
    title: 'We did not catch that',
    detail: 'Try again a little closer to the phone, or type it.',
  },
  // Dictation needs the network now that the words are made on the server.
  // Saying "try again" would be a promise this cannot keep on a plane.
  offline: {
    title: 'No connection',
    detail: 'Dictation needs the network. Typing works offline, and anything you log will send itself later.',
  },
  failed: {
    title: 'Dictation stopped',
    detail: 'Your words so far are in the box. Carry on typing, or try the mic again.',
  },
};

/**
 * The composer — one field, natural phrasing. No per-item rows, no quantity
 * pickers: imposing structure on the sentence gives back the whole advantage.
 *
 * Voice is not a separate flow but dictation into this same field, editable
 * before sending, so a garbled transcript is a typing fix, not a re-record.
 */
export function ComposerScreen({ navigation, route }: ScreenProps<'Composer'>) {
  const { c, space } = useTheme();
  const { phrases } = useAppState();
  // Dictation is a server call now, so the hook needs the same seam every other
  // screen talks through rather than reaching for a transport of its own.
  const api = useApi();

  const [phrase, setPhrase] = useState(route.params?.prefill ?? '');
  const [micState, setMicState] = useState<'idle' | 'priming' | 'recording'>('idle');
  const [micGranted, setMicGranted] = useState(false);
  const [spoke, setSpoke] = useState(false);
  /**
   * Read inside the transcript callback, which fires from a native event and
   * would otherwise close over whatever `phrase` was when recording began.
   */
  const phraseRef = useRef(phrase);
  phraseRef.current = phrase;

  /**
   * The turn ends by itself, so the words arrive here rather than being awaited.
   * Nothing in the UI asks the user to announce that they have stopped talking.
   *
   * Dictating goes straight on to the confirm sheet. Speaking a meal is one
   * gesture and it should cost one screen — stopping in the composer to admire
   * a transcript nobody asked to see made it two.
   *
   * This does NOT auto-commit anything (invariant #3). The confirm sheet is
   * still the review, still shows each item against the words it came from, and
   * still needs a deliberate tap to become a log. What it gives up is editing
   * the sentence as text before the parse — coming back from Confirm lands here
   * with the words intact, which is where that repair now happens.
   */
  const speech = useSpeech(api, heard => {
    setMicState('idle');
    if (!heard) return;
    const next = phraseRef.current ? `${phraseRef.current}, ${heard}` : heard;
    setSpoke(true);
    setPhrase(next);
    navigation.navigate('Confirm', { phrase: next, source: 'voice' });
  });

  // No auto-close effect any more, and no `began` guard to go with it.
  //
  // Both existed because the on-device recogniser ended the turn by itself at
  // the first pause it believed, and the overlay had to follow it down. The
  // recorder has no opinion about pauses: it runs until Done. The whole race
  // that made the mic open and shut in one frame is gone with the recogniser
  // that caused it.

  const startRecording = async () => {
    setMicState('recording');
    if (!(await speech.start())) setMicState('idle');
  };

  // Opened from the centre mic button: start listening without a second tap.
  //
  // Runs once, and only ever with permission already in hand — otherwise it
  // shows the primer, so the OS dialog still follows an explanation rather than
  // ambushing someone who tapped "log a meal". A `prefill` wins over this: words
  // arrived from somewhere else and talking over them would lose them.
  const autoStarted = useRef(false);

  useEffect(() => {
    // Wait for the stored language, or the first tap of every launch opens the
    // English model regardless of what the user chose last time.
    if (!route.params?.autoStart || !speech.localeReady || autoStarted.current) return;
    autoStarted.current = true;
    if (route.params?.prefill) return;

    let alive = true;
    void (async () => {
      const granted = await hasMic();
      if (!alive) return;
      setMicGranted(granted);
      if (granted) void startRecording();
      else setMicState('priming');
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount, by design
  }, [route.params?.autoStart, route.params?.prefill, speech.localeReady]);

  const cancelRecording = () => {
    setMicState('idle');
    speech.cancel();
  };

  const send = () => {
    const text = phrase.trim();
    if (!text) return;
    // `source` records how the words arrived, which the resolver logs and the
    // eval set slices on. It has to survive the user editing the transcript.
    navigation.navigate('Confirm', { phrase: text, source: spoke ? 'voice' : 'text' });
  };

  const ready = phrase.trim().length > 0;

  return (
    <Screen scrollable>
      <Gutter>
        <Split style={{ minHeight: 44 }}>
          <Txt role="h1">What did you eat?</Txt>
          <IconButton
            name="close"
            onPress={() => navigation.goBack()}
            accessibilityLabel="Close"
            style={{ marginRight: -10 }}
          />
        </Split>
      </Gutter>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8}>
        <Gutter style={{ paddingTop: space.lg }}>
          <Field
            value={phrase}
            onChangeText={setPhrase}
            placeholder="two rotis, dal and a bowl of curd"
            multiline
            minHeight={132}
            // Arriving by mic, the keyboard would race the recording overlay up
            // the screen and win. The field takes focus when dictation ends.
            autoFocus={!route.params?.autoStart}
            accessibilityHint="Write the whole meal in one sentence"
          />

          {/* Voice failing must never block the sentence — the box keeps
              whatever was heard and typing carries on from there. */}
          {speech.failure && (
            <>
              <Gap h={space.md} />
              <Notice
                icon="alert"
                title={MIC_TROUBLE[speech.failure].title}
                detail={MIC_TROUBLE[speech.failure].detail}
              />
            </>
          )}

          <Gap h={space.sm} />
          <Split>
            <Txt role="caption" tone="tertiary">
              {/* No item count. It was a comma-and-'and' heuristic, which cannot read
                  Tamil at all -- "Rendu dosai chutney appuram sambar oothi sapten.
                  So, how much..." counted 2, from the comma in "So,". Worse, the
                  count is now unknowable here: nothing splits the sentence until
                  the model answers, so any number shown is a guess presented as
                  a reading. */}
              One sentence, however you would say it
            </Txt>
            {/* The language the mic listens in. A control, not a label — it was
                a dead "EN" caption, which told a Tamil speaker the answer was
                no. Tapping cycles; the choice persists. */}
            <Press
              onPress={() => {
                const i = SPEECH_LOCALES.findIndex(l => l.id === speech.locale);
                speech.setLocale(SPEECH_LOCALES[(i + 1) % SPEECH_LOCALES.length]!.id);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Speech language: ${
                SPEECH_LOCALES.find(l => l.id === speech.locale)?.label ?? 'English'
              }`}
              accessibilityHint="Changes the language the microphone listens for"
              style={{ paddingHorizontal: space.sm, paddingVertical: 2, marginRight: -space.sm }}>
              <Row gap={4} align="center">
                <Icon name="mic" size={12} color={c.inkTertiary} weight={1.8} />
                <Txt role="caption" tone="tertiary" caps={false}>
                  {SPEECH_LOCALES.find(l => l.id === speech.locale)?.short ?? 'EN'}
                </Txt>
              </Row>
            </Press>
          </Split>

          <Gap h={space.lg} />

          <Row gap={space.md} align="stretch">
            <Press
              onPress={() => (micGranted ? startRecording() : setMicState('priming'))}
              accessibilityLabel="Dictate"
              accessibilityHint="Speaks into the same box. You can edit before sending."
              style={{
                width: 56,
                height: 56,
                borderRadius: 999,
                backgroundColor: c.sunken,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Icon name="mic" size={22} color={c.ink} weight={1.9} />
            </Press>

            <View style={{ flexGrow: 1 }}>
              <Button
                label="Log it"
                iconRight="arrowRight"
                onPress={send}
                disabled={!ready}
                haptic="select"
                style={{ height: 56 }}
              />
            </View>
          </Row>
        </Gutter>

        <Gap h={space.xxl} />
        <Divider />

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: space.xxxl }}>
          <Gutter style={{ paddingTop: space.xl }}>
            <SectionLabel>Say it again</SectionLabel>
          </Gutter>
          <Gap h={space.md} />

          <Gutter>
            {phrases.length > 0 ? (
              <Card level="raised" padded={false}>
                {phrases.map((p, i) => (
                  <View key={p.id}>
                    {i > 0 && <Divider inset={space.xl + 40 + space.md} />}
                    <Press
                      onPress={() => setPhrase(p.phrase)}
                      feedback="none"
                      accessibilityLabel={`Reuse: ${p.phrase}`}
                      style={{ paddingHorizontal: space.xl, paddingVertical: space.md }}>
                      <Row gap={space.md}>
                        <FoodGlyph
                          name={p.phrase}
                          seed={p.id}
                          size={40}
                          icon={p.savedAs ? 'bookmark' : 'clock'}
                        />
                        <Stack gap={2} style={{ flexGrow: 1, flexShrink: 1 }}>
                          <Txt role="h3" numberOfLines={1}>
                            {p.savedAs ?? p.phrase}
                          </Txt>
                          {p.savedAs ? (
                            <Txt role="caption" tone="tertiary" numberOfLines={1}>
                              “{p.phrase}”
                            </Txt>
                          ) : null}
                        </Stack>
                        <Txt role="label" tone="secondary" numeric>
                          {kcal(p.kcal)}
                        </Txt>
                      </Row>
                    </Press>
                  </View>
                ))}
              </Card>
            ) : (
              <Txt role="body" tone="secondary">
                Sentences you have used before collect here. A phrase that works twice gets offered as a
                saved meal — one tap from then on.
              </Txt>
            )}
          </Gutter>

          <Gutter style={{ paddingTop: space.xl, alignItems: 'center' }}>
            <TextButton
              label="Search for a single food instead"
              tone="secondary"
              onPress={() => navigation.replace('Search')}
            />
          </Gutter>
        </ScrollView>
      </KeyboardAvoidingView>

      {micState === 'priming' && (
        <MicPrimer
          onAllow={async () => {
            const granted = await requestMic();
            setMicGranted(granted);
            if (granted) startRecording();
            else setMicState('idle');
          }}
          onDecline={() => setMicState('idle')}
        />
      )}
      {micState === 'recording' && (
        <RecordingOverlay
          transcribing={speech.state === 'transcribing'}
          onCancel={cancelRecording}
        />
      )}
    </Screen>
  );
}
