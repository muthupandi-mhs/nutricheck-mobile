import React, { useRef, useState } from 'react';
import { Animated, StyleSheet, TextInput, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, IconButton } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { KeyboardAvoid } from '../../components/KeyboardAvoid';
import { Gap, Gutter, Row } from '../../components/Layout';
import { Press } from '../../components/Press';
import { Screen } from '../../components/Screen';
import { Txt } from '../../components/Text';
import { PHRASE_MAX } from '../../api/types';
import { capPhrase } from '../../lib/format';
import { useAppState } from '../../state/AppState';
import { useTheme } from '../../theme/ThemeProvider';
import type { ScreenProps } from '../../navigation/types';

/** What the box shows when it is empty. The app's own register, not a schema. */
const PLACEHOLDER = 'two rotis, dal and a bowl of curd';

/**
 * How many remembered sentences are offered. Three is what fits above a
 * keyboard on the shortest phone this ships to, and a list you have to scroll
 * is slower than typing the words again.
 */
const SAID_BEFORE = 3;

/**
 * The keyboard half of the same route.
 *
 * The voice screen and this one are one flow with two doors: both ask the same
 * question, both end at the same read-back, and neither of them is the
 * composer. What is different is only what you do next — talk, or type.
 *
 * There is no field here in the sense the rest of the app means it. A sentence
 * typed into a bordered box on a dark card reads as a form entry, and this is
 * not one: it is the same one sentence the microphone would have heard, so it
 * is set at reading size directly on the page with a rule under it. The rule
 * lights when the caret is in it, which is the whole of the "input state" this
 * screen needs — there is one thing to fill in and you are already in it.
 *
 * Nothing about the words is parsed on this side. No item count, no chips
 * split out of the sentence: everything the app knows about a meal it learns
 * from the model, and a number counted off commas here is a guess presented as
 * a reading. That mistake is already documented one screen over; this is the
 * screen that must not repeat it.
 */
export function TypeScreen({ navigation, route }: ScreenProps<'Type'>) {
  const { c, space, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const { phrases } = useAppState();

  // A prefill arrives in code, so the field's own `maxLength` never sees it.
  // Every one of them is a phrase that was already inside the cap once, so this
  // cuts nothing in practice — it is here so the field cannot be seeded past a
  // limit it then enforces.
  const [text, setText] = useState(capPhrase(route.params?.prefill ?? '', PHRASE_MAX));
  const focus = useRef(new Animated.Value(0)).current;

  const ready = text.trim().length > 0;

  // The same rule `Field` applies to every framed input, restated because this
  // one is not framed: a tenth of the allowance, floored at ten characters.
  const left = PHRASE_MAX - text.length;
  const counting = left <= Math.max(10, Math.round(PHRASE_MAX / 10));

  const send = () => {
    const phrase = text.trim();
    if (!phrase) return;
    // Pushed, not replaced. The read-back's own "change the words" comes back
    // here, and coming back to an empty box would be the app losing a sentence
    // somebody has already typed once.
    navigation.navigate('MealDetails', { phrase, source: 'text' });
  };

  const glow = (to: number) =>
    Animated.timing(focus, {
      toValue: to,
      duration: 220,
      useNativeDriver: true,
    }).start();

  return (
    <Screen style={{ paddingTop: 0, paddingBottom: 0 }}>
      {/* The same wash as the microphone and the read-back. Three screens, one
          surface: the flow should not appear to change materials halfway. */}
      <LinearGradient
        colors={[c.wash[1], c.canvas, c.canvas]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />

      <View style={{ flex: 1, paddingTop: insets.top + space.xs }}>
        <Gutter>
          <Row justify="space-between">
            <IconButton
              name="close"
              onPress={() => navigation.goBack()}
              accessibilityLabel="Close"
              style={{ marginLeft: -10 }}
            />
            {/* The other door, always in the same place on both screens. */}
            <Press
              onPress={() => navigation.replace('Listen')}
              feedback="fade"
              haptic="select"
              accessibilityLabel="Say it instead"
              accessibilityHint="Switches to the microphone"
              style={{ paddingHorizontal: space.md, paddingVertical: 6, marginRight: -space.sm }}>
              <Row gap={7}>
                <Icon name="mic" size={15} color={c.inkTertiary} weight={2} />
                <Txt role="labelSm" tone="tertiary">
                  Say it
                </Txt>
              </Row>
            </Press>
          </Row>
        </Gutter>

        <KeyboardAvoid offset={8}>
          <View style={{ flex: 1 }}>
            <Gutter style={{ flex: 1 }}>
              <Gap h={space.xl} />

              <Txt role="h1" accessibilityRole="header">
                What did you eat?
              </Txt>

              <Gap h={space.xxl} />

              {/* Reading size, not form size. The sentence is the whole of the
                  screen's content, so it is set like content. */}
              <TextInput
                value={text}
                onChangeText={setText}
                onFocus={() => glow(1)}
                onBlur={() => glow(0)}
                placeholder={PLACEHOLDER}
                placeholderTextColor={c.inkTertiary}
                multiline
                autoFocus
                // The same cap the resolver applies. This is the one field
                // in the app with no frame around it, so the count below the
                // button is the only thing that can say the stop is coming.
                maxLength={PHRASE_MAX}
                selectionColor={c.primary}
                keyboardAppearance="dark"
                returnKeyType="default"
                accessibilityLabel="What you ate"
                accessibilityHint="Write the whole meal in one sentence"
                style={{
                  color: c.ink,
                  fontSize: 24,
                  lineHeight: 33,
                  letterSpacing: -0.4,
                  paddingHorizontal: 0,
                  paddingTop: 0,
                  paddingBottom: space.md,
                  // Room for three lines before it grows, so an ordinary meal
                  // never makes the page move while it is being written.
                  minHeight: 108,
                  textAlignVertical: 'top',
                }}
              />

              {/* The rule, and the only state this screen reports. It grows
                  from the middle rather than fading in, because a line that
                  arrives from both ends reads as the page responding to the
                  caret rather than as a border appearing. */}
              <View style={{ height: 1, backgroundColor: c.border }}>
                <Animated.View
                  style={{
                    height: 1,
                    backgroundColor: c.ink,
                    opacity: focus,
                    transform: [
                      { scaleX: focus.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }) },
                    ],
                  }}
                />
              </View>

              {phrases.length > 0 ? (
                <>
                  <Gap h={space.xl} />
                  <Txt role="caption" tone="tertiary">
                    Said before
                  </Txt>
                  <Gap h={space.md} />
                  {/* Whole sentences, one tap each. Not a list of foods: the
                      thing worth remembering is the phrasing that worked, and
                      breaking it into rows of ingredients would hand back a
                      shopping list to somebody who wants their usual dinner. */}
                  <Row gap={space.sm} wrap>
                    {phrases.slice(0, SAID_BEFORE).map(p => (
                      <Press
                        key={p.id}
                        onPress={() => setText(capPhrase(p.phrase, PHRASE_MAX))}
                        feedback="fade"
                        haptic="select"
                        accessibilityLabel={`Use: ${p.savedAs ?? p.phrase}`}
                        style={{ maxWidth: '100%' }}>
                        <View
                          style={{
                            paddingHorizontal: space.md,
                            paddingVertical: space.sm,
                            borderRadius: radius.pill,
                            borderWidth: 1,
                            borderColor: c.border,
                          }}>
                          <Txt role="labelSm" tone="secondary" numberOfLines={1}>
                            {p.savedAs ?? p.phrase}
                          </Txt>
                        </View>
                      </Press>
                    ))}
                  </Row>
                </>
              ) : null}
            </Gutter>
          </View>

          <View>
            <LinearGradient
              colors={[`${c.canvas}00`, c.canvas]}
              pointerEvents="none"
              style={{ position: 'absolute', left: 0, right: 0, top: -40, height: 40 }}
            />
            <Gutter
              style={{
                backgroundColor: c.canvas,
                paddingTop: space.sm,
                paddingBottom: Math.max(insets.bottom, space.lg) + space.xs,
              }}>
              <Button
                label="Read my meal"
                disabled={!ready}
                onPress={send}
                haptic="select"
              />
              <Gap h={space.md} />
              <View style={{ alignItems: 'center' }}>
                {/* The standing line, until there is something more useful to
                    say in its place. A silent stop mid-sentence on the app's
                    longest input reads as a keyboard that has died. */}
                <Txt role="caption" tone={left === 0 ? 'attention' : 'tertiary'}>
                  {left === 0
                    ? 'That is as long as one sentence can be.'
                    : counting
                      ? `${left} characters left`
                      : 'One sentence, however you would say it'}
                </Txt>
              </View>
            </Gutter>
          </View>
        </KeyboardAvoid>
      </View>
    </Screen>
  );
}
