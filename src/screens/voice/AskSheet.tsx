import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  Easing,
  Linking,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApi } from '../../api/client';
import { TextButton } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { KeyboardAvoid } from '../../components/KeyboardAvoid';
import { Gap, Gutter, Row } from '../../components/Layout';
import { Press } from '../../components/Press';
import { Txt } from '../../components/Text';
import { kcal } from '../../lib/format';
import { hasMic, requestMic, useSpeech } from '../../lib/speech';
import { useAppState } from '../../state/AppState';
import { useTheme } from '../../theme/ThemeProvider';
import { EXAMPLE_MS, EXAMPLES, TROUBLE, useLevel } from './listening';

/** The bars that follow the voice. Odd, so one of them is the centre. */
const BARS = 9;

/**
 * How many remembered sentences Memory offers.
 *
 * Four is what fits above a keyboard on the shortest phone this ships to, and
 * a list you have to scroll is slower than saying the thing again.
 */
const REMEMBERED = 4;

/**
 * The microphone, as a sheet over the screen you were already on.
 *
 * A component rather than a route, and the difference is what you see: it is
 * mounted BY the tab host, over the live tab, so Today is genuinely still
 * there behind it — the same day, the same scroll position, not a screenshot
 * of it under a transparent modal. Raising a route to ask one question also
 * put an entry in the back stack for something that is not a place.
 *
 * The second door into the same route, and deliberately not the same surface
 * as the first. Onboarding's is a full page with one orb on it, because at
 * that moment speaking to the app IS the task and there is nothing else to
 * look at. This one is pulled up mid-day, so it takes the bottom of the screen
 * and gives it back.
 *
 * One input, two ways to fill it, which is the whole design. The row at the
 * bottom is a field with a microphone at the end of it: tap the mic and talk,
 * or type into the same box and send. Two separate screens for that made
 * people choose their input method before they had decided what to say.
 *
 * It still does not open listening. The sheet appearing is not consent to
 * record; the tap on the microphone is, here as everywhere else.
 */
export function AskSheet({
  onClose,
  onPhrase,
  onSearch,
}: {
  /** Called once the sheet has finished animating away. The caller unmounts it. */
  onClose: () => void;
  /** A sentence, however it arrived. The caller decides where it goes. */
  onPhrase: (phrase: string, source: 'voice' | 'text') => void;
  /** The other way to add something: a food looked up by name. */
  onSearch: () => void;
}) {
  const { c, radius, space, elevation } = useTheme();
  const insets = useSafeAreaInsets();
  const api = useApi();
  const { profile, day, goal, phrases } = useAppState();

  const [text, setText] = useState('');
  const [memory, setMemory] = useState(false);
  const [mic, setMic] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [example, setExample] = useState(0);
  const [reduced, setReduced] = useState(false);

  const speech = useSpeech(api, heard => {
    if (!heard) return;
    close(() => onPhrase(heard, 'voice'));
  });

  const listening = speech.state === 'listening';
  const transcribing = speech.state === 'transcribing';
  const level = useLevel(listening);

  const ready = text.trim().length > 0;

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(v => alive && setReduced(v));
    return () => {
      alive = false;
    };
  }, []);

  /** Re-asked on focus, so a trip to the system settings and back works. */
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void hasMic().then(granted => alive && setMic(granted ? 'granted' : 'denied'));
      return () => {
        alive = false;
      };
    }, []),
  );

  /** The panel arrives from the bottom edge, over a scrim that fades up with it. */
  const rise = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(rise, {
      toValue: 1,
      damping: 30,
      stiffness: 260,
      mass: 0.9,
      useNativeDriver: true,
    }).start();
  }, [rise]);

  /**
   * The system back gesture closes the sheet.
   *
   * A route got this for nothing; a component has to ask for it, and without
   * it back leaves the tab — or the app — with the microphone possibly still
   * open behind it. Registered last, so it wins over the tab navigator.
   */
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- close is stable enough: it only reads refs and props that do not change identity per keystroke
  }, []);

  /** Examples rotate only while there is nothing else for that line to say. */
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduced || listening || transcribing || speech.failure || ready) return undefined;
    const id = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 260, useNativeDriver: true }).start(() => {
        setExample(i => (i + 1) % EXAMPLES.length);
        Animated.timing(fade, { toValue: 1, duration: 320, useNativeDriver: true }).start();
      });
    }, EXAMPLE_MS);
    return () => clearInterval(id);
  }, [fade, listening, ready, reduced, speech.failure, transcribing]);

  /**
   * Down, then gone — and whatever was meant to happen next happens after.
   *
   * Sequencing rather than firing both at once: pushing the read-back while
   * this is still on screen puts a sheet sliding down underneath a screen
   * sliding in, which reads as two things fighting for the same corner.
   */
  const close = (then?: () => void) => {
    void speech.cancel();
    Animated.timing(rise, {
      toValue: 0,
      duration: 190,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      onClose();
      then?.();
    });
  };

  /**
   * The microphone, and the stop. One control, because it is one thing: the
   * recording it started is the recording it ends.
   */
  const onMic = async () => {
    if (transcribing) return;
    if (listening) {
      void speech.stop();
      return;
    }
    if (mic !== 'granted') {
      const granted = await requestMic();
      setMic(granted ? 'granted' : 'denied');
      if (!granted) return;
    }
    void speech.start();
  };

  const send = () => {
    const phrase = text.trim();
    if (!phrase) return;
    close(() => onPhrase(phrase, 'text'));
  };

  const greeting = askGreeting({
    // Trimmed and checked rather than interpolated straight in: the field is
    // optional on both sides of the wire, and an account made before the name
    // step exists — "Hey ," is a worse greeting than no greeting.
    name: profile?.firstName?.trim() || null,
    eaten: day?.totals.kcal ?? 0,
    target: day?.goal?.kcal ?? goal?.kcal ?? 0,
    logged: day?.entries.length ?? 0,
  });

  /** One line, and only one: failure, then the microphone, then the teaching. */
  const hint = speech.failure
    ? TROUBLE[speech.failure]
    : mic === 'denied'
      ? 'The microphone is off for NutriCheck.'
      : null;

  return (
    // Absolute, never flexed. The host mounts this as a SIBLING of the tab
    // navigator, so a flexed root does not overlay it — it takes half the
    // window off it, which put the tab bar in the middle of the screen and cut
    // the ring in half. A sheet has to be out of the layout it covers.
    <View style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]}>
      {/* The scrim is the dismiss. Tapping away from a panel is how every
          sheet on this platform closes, and a panel that can only be closed by
          a button is one people back out of with the system gesture instead —
          which cancels a recording without saying so. */}
      <Press
        onPress={() => close()}
        feedback="none"
        accessibilityRole="button"
        accessibilityLabel="Close"
        style={StyleSheet.absoluteFill}>
        {/* Graded rather than flat: light at the top where the day is still
            worth seeing, heavy behind the sheet where it would otherwise
            compete with it. A single opacity over the whole screen either
            hides Today or fails to separate from it; this does the job a blur
            does, which is to push the page back without taking it away. */}
        <Animated.View style={{ flex: 1, opacity: rise }}>
          <LinearGradient
            colors={['rgba(6,8,11,0.35)', 'rgba(6,8,11,0.62)', 'rgba(6,8,11,0.86)']}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </Press>

      {/* `flex: 1` on the avoider means it fills the window whatever the panel
          measures, so without these two the sheet is pinned to the TOP of the
          screen and the scrim behind it cannot be tapped. */}
      <KeyboardAvoid style={{ justifyContent: 'flex-end' }} pointerEvents="box-none">
        <Animated.View
          style={{
            transform: [
              { translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [420, 0] }) },
            ],
          }}>
          <View
            style={{
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              overflow: 'hidden',
              ...elevation.e3,
            }}>
            {/* The one tinted surface in an ash app.

                Everything else — Today, the dials, the read-back — is grey, so
                a panel that is faintly blue is immediately a different KIND of
                thing: the place you talk to it, rather than another page of
                numbers to read. The tint is an edge and a wash only. Nothing
                here is coloured to mean something, which is what keeps amber
                the only signal in the app that is. */}
            <LinearGradient
              colors={[c.askWash, c.surface, c.surface]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            {/* Taller than it strictly needs to be. A sheet sized exactly to
                its contents reads as a popup; the space above the question is
                what makes it a place you have arrived at. */}
            <View style={{ paddingTop: space.md, paddingBottom: Math.max(insets.bottom, space.lg) + space.md }}>
              {/* The grab handle. It does not drag — the scrim and the system
                  gesture both close this — but it is the shape that says
                  "panel", and its absence is what makes a sheet look stuck. */}
              <View style={{ alignItems: 'center' }}>
                <View
                  style={{
                    width: 38,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: c.borderStrong,
                  }}
                />
              </View>

              <Gap h={space.xl} />

              <Gutter>
                <Row justify="space-between" align="center">
                  <Row gap={space.sm} align="center">
                    <View
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: radius.pill,
                        backgroundColor: c.primarySoft,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <Icon name="leaf" size={14} color={c.primarySoftInk} weight={2} />
                    </View>
                    <Txt role="labelSm" tone="secondary" caps style={{ letterSpacing: 1.4 }}>
                      {transcribing ? 'Writing it down' : listening ? 'Listening' : 'Log a meal'}
                    </Txt>
                  </Row>

                  {/* Memory: the sentences this app has already heard from you.
                      It is not a label borrowed from the reference — the phrases
                      are real, they are what the "say it again" route runs on,
                      and until now they were only reachable from a separate
                      typing screen. Here they are one tap from the field, which
                      is where somebody is when they realise they are about to
                      say the same thing as yesterday. */}
                  <Press
                    onPress={() => setMemory(m => !m)}
                    feedback="fade"
                    haptic="select"
                    accessibilityRole="button"
                    accessibilityLabel="Memory"
                    accessibilityState={{ expanded: memory }}
                    accessibilityHint="Shows sentences you have used before"
                    style={{ paddingVertical: 4, paddingLeft: space.md }}>
                    <Row gap={7} align="center">
                      <Txt role="labelSm" tone={memory ? 'ink' : 'secondary'}>
                        Memory
                      </Txt>
                      <Icon
                        name="sparkle"
                        size={15}
                        color={memory ? c.primary : c.inkSecondary}
                        weight={2}
                      />
                    </Row>
                  </Press>
                </Row>

                <Gap h={space.xxl} />

                {/* Addressed to somebody, with the state of their day in hand,
                    then the question. Set the way the reference sets its
                    message: large, and with leading well past the usual ratio.
                    A panel that opens with a line of text is reading matter,
                    not a label, and tight leading on 21pt reads as a heading
                    nobody is being asked to answer.

                    One paragraph rather than three stacked lines. "Hi X",
                    "2,047 left", "What did you eat?" as separate blocks is a
                    form with a greeting glued on top; run together they are
                    somebody talking. */}
                <Txt
                  role="h2"
                  accessibilityRole="header"
                  style={{ fontSize: 21, lineHeight: 31, letterSpacing: -0.2 }}>
                  {greeting}
                </Txt>

                <Gap h={space.md} />

                {/* One line under it, and a fixed height so a failure replacing
                    an example does not move the field under the thumb. */}
                <View style={{ height: 22, justifyContent: 'center' }}>
                  {listening || transcribing ? (
                    <Txt role="body" tone="tertiary">
                      {listening ? 'Say the whole meal, then tap the square.' : 'A few seconds…'}
                    </Txt>
                  ) : hint ? (
                    <Txt role="body" tone="secondary">
                      {hint}
                    </Txt>
                  ) : ready ? null : (
                    <Animated.View style={{ opacity: fade }}>
                      <Txt role="body" tone="tertiary">
                        “{EXAMPLES[example]}”
                      </Txt>
                    </Animated.View>
                  )}
                </View>

                {mic === 'denied' && !listening ? (
                  <>
                    <Gap h={space.sm} />
                    <TextButton
                      label="Open phone settings"
                      role="labelSm"
                      onPress={() => void Linking.openSettings()}
                    />
                  </>
                ) : null}

                {/* What it remembers, when asked. Whole sentences rather than a
                    list of foods: the thing worth keeping is the phrasing that
                    worked, and breaking it into ingredients hands a shopping
                    list to somebody who wants their usual dinner.

                    Tapping one fills the field rather than logging it. A
                    remembered sentence is still a claim about today, and it
                    goes through the same read-back as one said out loud. */}
                {memory && !listening && !transcribing ? (
                  <>
                    <Gap h={space.lg} />
                    {phrases.length > 0 ? (
                      <Row gap={space.sm} wrap>
                        {phrases.slice(0, REMEMBERED).map(p => (
                          <Press
                            key={p.id}
                            onPress={() => {
                              setText(p.phrase);
                              setMemory(false);
                            }}
                            feedback="scale"
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
                    ) : (
                      <Txt role="body" tone="tertiary">
                        Nothing yet. Sentences you use collect here, and a phrase
                        that works twice is one tap from then on.
                      </Txt>
                    )}
                  </>
                ) : null}

                <Gap h={space.xl} />

                {/* The voice, drawn while it is being heard. It replaces the
                    field rather than sitting beside it: a text box nobody can
                    reach while the mic is open is furniture, and the bars are
                    the only thing on the panel that proves it is listening. */}
                {listening || transcribing ? (
                  <Row gap={space.md} align="center" style={{ height: 56 }}>
                    <Row gap={5} align="center" style={{ flexGrow: 1, height: 40 }}>
                      {Array.from({ length: BARS }, (_, i) => (
                        <Animated.View
                          key={i}
                          style={{
                            flexGrow: 1,
                            borderRadius: 3,
                            backgroundColor: c.ink,
                            opacity: transcribing ? 0.25 : 0.9,
                            height: 6,
                            transform: [
                              {
                                scaleY: transcribing
                                  ? 1
                                  : level.interpolate({
                                      inputRange: [0, 1],
                                      // The middle bars swing hardest, which is
                                      // what makes a row of rectangles read as
                                      // one voice rather than nine meters.
                                      outputRange: [1, 1 + 4.5 * Math.cos(((i - (BARS - 1) / 2) / BARS) * Math.PI)],
                                    }),
                              },
                            ],
                          }}
                        />
                      ))}
                    </Row>

                    <Stop onPress={onMic} disabled={transcribing} />
                  </Row>
                ) : (
                  <Row gap={space.sm} align="center">
                    {/* The other way to add something, kept to one glyph. It is
                        here because a name you already know is faster looked up
                        than described, not because typing is a fallback. */}
                    <Press
                      onPress={() => close(onSearch)}
                      feedback="scale"
                      haptic="select"
                      accessibilityLabel="Find a food by name"
                      accessibilityHint="Adds a single food by searching for its name"
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: radius.md,
                        backgroundColor: c.sunken,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <Icon name="plus" size={22} color={c.inkSecondary} weight={2} />
                    </Press>

                    {/* One field, both ways in, inside a hairline that is lit
                        rather than drawn. The reference gives its input a
                        gradient edge and it is the one thing on the panel that
                        says "this is where you speak to it" — a plain grey
                        border reads as a form on a settings page.

                        A gradient cannot be a border colour, so it is a
                        gradient with the field laid on top of it, inset by one
                        point. That is also why the radius differs by one: an
                        inner corner has to be tighter than the one it sits in
                        or the edge thickens as it turns. */}
                    <LinearGradient
                      colors={[c.askFrom, c.askTo]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ flexGrow: 1, flexShrink: 1, borderRadius: radius.pill, padding: 1 }}>
                    <Row
                      gap={space.sm}
                      style={{
                        flexGrow: 1,
                        flexShrink: 1,
                        minHeight: 50,
                        paddingLeft: space.lg,
                        paddingRight: 5,
                        borderRadius: radius.pill - 1,
                        backgroundColor: c.sunken,
                      }}>
                      <TextInput
                        value={text}
                        onChangeText={setText}
                        placeholder="Say it or type it"
                        placeholderTextColor={c.inkTertiary}
                        multiline
                        selectionColor={c.primary}
                        keyboardAppearance="dark"
                        onSubmitEditing={send}
                        accessibilityLabel="What you ate"
                        accessibilityHint="Write the whole meal in one sentence"
                        style={{
                          flexGrow: 1,
                          flexShrink: 1,
                          color: c.ink,
                          fontSize: 15,
                          lineHeight: 20,
                          paddingVertical: 14,
                          maxHeight: 96,
                        }}
                      />

                      <View style={{ justifyContent: 'flex-end', paddingBottom: 5 }}>
                        {ready ? (
                          // Filled, because there is now something to send and
                          // exactly one thing to do with it.
                          <Press
                            onPress={send}
                            feedback="scale"
                            haptic="select"
                            accessibilityLabel="Read my meal"
                            style={{
                              width: 42,
                              height: 42,
                              borderRadius: radius.pill,
                              backgroundColor: c.ink,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                            <Icon name="arrowRight" size={20} color={c.canvas} weight={2.2} />
                          </Press>
                        ) : (
                          // A glyph inside the field, not a button beside it —
                          // as in the reference. Talking and typing are the
                          // same action here, so the microphone belongs in the
                          // box rather than competing with it.
                          <Press
                            onPress={onMic}
                            feedback="fade"
                            haptic="select"
                            accessibilityLabel="Speak your meal"
                            accessibilityHint="Records what you say. You will see it before anything is logged."
                            style={{
                              width: 42,
                              height: 42,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                            <Icon name="mic" size={21} color={c.ink} weight={2.1} />
                          </Press>
                        )}
                      </View>
                    </Row>
                    </LinearGradient>
                  </Row>
                )}
              </Gutter>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoid>
    </View>
  );
}

/**
 * What the sheet opens by saying.
 *
 * Exported and pure so the copy can be tested, because copy that reads the
 * day's numbers is code: "you're 1,404 in" is a claim, and the way it goes
 * wrong is silently, in the one state nobody thought to open the sheet in.
 *
 * The shape is the reference's — name, then something true about their day,
 * then the question — and every clause of it earns its place from data the app
 * already holds. Nothing here is encouragement: "you're doing great" is the
 * app having an opinion about somebody's eating, which this product does not
 * do, and it would be the same sentence whatever the numbers said.
 *
 * Four states, and the order matters. No target at all comes first because it
 * is the state a brand-new account is in and every other line below would be
 * dividing by a goal that does not exist yet.
 */
export function askGreeting({
  name,
  eaten,
  target,
  logged,
}: {
  name: string | null;
  eaten: number;
  target: number;
  /** How many entries the day already has. Zero reads very differently. */
  logged: number;
}): string {
  const hey = name ? `Hey ${name}, ` : '';
  const cap = (s: string) => (name ? s : s.charAt(0).toUpperCase() + s.slice(1));

  // No goal yet, or a day that has not loaded. Ask the question and nothing
  // else rather than reaching for a number that is not there.
  if (target <= 0) return `${hey}${cap('what did you eat?')}`;

  if (logged === 0) {
    return `${hey}${cap(`nothing logged yet — the whole ${kcal(target)} kcal is still yours. What did you eat?`)}`;
  }

  const left = Math.round(target - eaten);

  if (left < 0) {
    return `${hey}${cap(
      `you're ${kcal(Math.abs(left))} kcal past today's target. What else did you eat?`,
    )}`;
  }

  return `${hey}${cap(
    `you're ${kcal(eaten)} in with ${kcal(left)} kcal left today. What did you eat?`,
  )}`;
}

/**
 * The stop, as the square it has meant on every device anyone has owned.
 *
 * Its own control rather than the microphone with a different glyph, because
 * while the mic is open there is no "start" to offer and a button that changes
 * meaning under the thumb is how a sentence gets thrown away.
 */
function Stop({ onPress, disabled }: { onPress: () => void; disabled: boolean }) {
  const { c, radius } = useTheme();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (disabled) {
      pulse.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [disabled, pulse]);

  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      feedback="scale"
      haptic="undo"
      accessibilityLabel="Stop listening"
      accessibilityHint="Ends the recording and reads back what you said"
      style={{
        width: 52,
        height: 52,
        borderRadius: radius.pill,
        backgroundColor: c.ink,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : 1,
      }}>
      <Animated.View
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          backgroundColor: c.canvas,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] }),
        }}
      />
    </Press>
  );
}
