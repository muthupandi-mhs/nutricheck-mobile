import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { PressableRow, IconButton } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Divider, Gap, Gutter, Hairline, HeavyBar, Row, SplitRow } from '../../components/Layout';
import { Screen } from '../../components/Screen';
import { Body, Display, Eyebrow, Mono, Num, Title } from '../../components/Type';
import { kcal } from '../../lib/format';
import { useTheme } from '../../theme/ThemeProvider';
import { useAppState } from '../../state/AppState';
import { MicPrimer, RecordingOverlay } from './DictationOverlay';
import type { ScreenProps } from '../../navigation/types';

/** A rough item count, purely to show the box is reading along. Not the parse. */
const countItems = (s: string) =>
  s
    .toLowerCase()
    .split(/,|\band\b|\bwith\b|\bplus\b/g)
    .map(x => x.trim())
    .filter(Boolean).length;

const DEMO_TRANSCRIPT = 'two rotis, dal and a bowl of curd';

/**
 * The composer — one field, natural phrasing.
 *
 * No per-item rows, no quantity pickers, no structure. The entire argument for
 * this route is that a plate with four things on it costs a sentence here and a
 * minute of tapping in search; imposing structure on the sentence gives that
 * back.
 *
 * Voice is not a separate flow. It is dictation into this same field, editable
 * before sending — which is why a garbled transcript is a typing fix rather
 * than a re-record.
 */
export function ComposerScreen({ navigation, route }: ScreenProps<'Composer'>) {
  const { c, space, type } = useTheme();
  const { phrases } = useAppState();

  const [text, setText] = useState(route.params?.prefill ?? '');
  const [focused, setFocused] = useState(false);
  const [micState, setMicState] = useState<'idle' | 'priming' | 'recording'>('idle');
  const [micGranted, setMicGranted] = useState(false);
  const [transcript, setTranscript] = useState('');
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  const dictationTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (dictationTimer.current) clearInterval(dictationTimer.current);
  }, []);

  const startRecording = () => {
    setMicState('recording');
    setTranscript('');
    // Stands in for on-device speech: words arrive incrementally, as they do
    // from a real recogniser, so the UI is built against a streaming source.
    let i = 0;
    const words = DEMO_TRANSCRIPT.split(' ');
    dictationTimer.current = setInterval(() => {
      i += 1;
      setTranscript(words.slice(0, i).join(' '));
      if (i >= words.length && dictationTimer.current) clearInterval(dictationTimer.current);
    }, 300);
  };

  const stopRecording = () => {
    if (dictationTimer.current) clearInterval(dictationTimer.current);
    setMicState('idle');
    if (transcript) setText(t => (t ? `${t}, ${transcript}` : transcript));
    setTranscript('');
  };

  const cancelRecording = () => {
    if (dictationTimer.current) clearInterval(dictationTimer.current);
    setMicState('idle');
    setTranscript('');
  };

  const onMicPress = () => {
    // Asked at the moment of use, never in a pre-flight block during onboarding.
    if (!micGranted) setMicState('priming');
    else startRecording();
  };

  const send = () => {
    const phrase = text.trim();
    if (!phrase) return;
    navigation.navigate('Confirm', { phrase, source: micGranted && transcript ? 'voice' : 'text' });
  };

  const items = countItems(text);

  return (
    <Screen edges="top">
      <Gutter style={{ paddingBottom: space.md }}>
        <SplitRow>
          <Display size={24}>What did you eat?</Display>
          <IconButton name="close" size={20} onPress={() => navigation.goBack()} accessibilityLabel="Close" style={{ marginRight: -10 }} />
        </SplitRow>
      </Gutter>

      <HeavyBar />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}>
        <Gutter style={{ paddingTop: 18 }}>
          <Pressable onPress={() => input.current?.focus()}>
            <View
              style={{
                backgroundColor: c.surface,
                borderWidth: 1,
                borderColor: c.rule,
                borderTopWidth: 3,
                borderTopColor: focused ? c.est : c.rule,
                paddingHorizontal: space.lg,
                paddingTop: space.lg,
                paddingBottom: 14,
                minHeight: 132,
                justifyContent: 'space-between',
              }}>
              <TextInput
                ref={input}
                value={text}
                onChangeText={setText}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                multiline
                autoFocus
                placeholder="two rotis, dal and a bowl of curd"
                placeholderTextColor={c.ink3}
                selectionColor={c.est}
                accessibilityLabel="What did you eat"
                accessibilityHint="Write the whole meal in one sentence"
                style={[type.body(19), { color: c.ink, padding: 0, minHeight: 70, textAlignVertical: 'top' }]}
              />
              <SplitRow style={{ paddingTop: space.md }}>
                <Mono size={10.5} tone="ink3">
                  {items === 0 ? 'one sentence, however you would say it' : `${items} item${items === 1 ? '' : 's'} detected`}
                </Mono>
                <Mono size={10.5} tone="ink3">
                  EN
                </Mono>
              </SplitRow>
            </View>
          </Pressable>
        </Gutter>

        <Gutter style={{ paddingTop: 14 }}>
          <Row gap={10} align="stretch">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Hold to dictate"
              accessibilityHint="Speaks into the same box. You can edit before sending."
              onPress={onMicPress}
              style={{
                width: 60,
                height: 60,
                borderWidth: 1,
                borderColor: c.rule,
                backgroundColor: c.surface,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
              }}>
              <Icon name="mic" size={20} color={c.ink} weight={1.7} />
              <Mono size={7.5} tone="ink3" style={{ letterSpacing: 0.5 }}>
                HOLD
              </Mono>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Log it"
              accessibilityState={{ disabled: text.trim().length === 0 }}
              onPress={send}
              style={{
                flexGrow: 1,
                height: 60,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 9,
                backgroundColor: text.trim() ? c.heavy : c.surface,
                borderWidth: text.trim() ? 0 : 1,
                borderColor: c.rule,
              }}>
              <Title size={16} weight="700" color={text.trim() ? c.onHeavy : c.ink3}>
                Log it
              </Title>
              <Icon name="arrowRight" size={17} color={text.trim() ? c.onHeavy : c.ink3} weight={2.3} />
            </Pressable>
          </Row>
        </Gutter>

        <Gap h={22} />
        <Divider />

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: space.xl }}>
          <Gutter style={{ paddingTop: 14 }}>
            <Eyebrow size={10.5} tone="ink2">
              SAY IT AGAIN
            </Eyebrow>
          </Gutter>

          <Gutter style={{ paddingTop: 10 }}>
            {phrases.map(p => (
              <View key={p.id}>
                <Hairline />
                <PressableRow
                  onPress={() => setText(p.phrase)}
                  accessibilityLabel={`Reuse: ${p.phrase}`}
                  style={{ paddingVertical: 11 }}>
                  <SplitRow>
                    <Row gap={10} style={{ flexShrink: 1, paddingRight: space.md }}>
                      <Icon
                        name={p.savedAs ? 'layers' : 'clock'}
                        size={14}
                        color={p.savedAs ? c.det : c.ink3}
                        weight={2}
                      />
                      <Body size={15} numberOfLines={1} style={{ flexShrink: 1 }}>
                        {p.savedAs ?? p.phrase}
                      </Body>
                    </Row>
                    <Num size={12} tone="ink3">
                      {kcal(p.kcal)}
                    </Num>
                  </SplitRow>
                </PressableRow>
              </View>
            ))}
            {phrases.length === 0 && (
              <Body size={14} tone="ink3">
                Sentences you have used before will collect here. A phrase that worked twice gets
                offered as a saved meal — one tap from then on.
              </Body>
            )}
          </Gutter>
        </ScrollView>
      </KeyboardAvoidingView>

      {micState === 'priming' && (
        <MicPrimer
          onAllow={() => {
            // Where the real permission request goes. Granting is assumed here so
            // the recording state stays reachable in development.
            setMicGranted(true);
            startRecording();
          }}
          onDecline={() => {
            setMicState('idle');
            input.current?.focus();
          }}
        />
      )}
      {micState === 'recording' && (
        <RecordingOverlay transcript={transcript} onStop={stopRecording} onCancel={cancelRecording} />
      )}
    </Screen>
  );
}
