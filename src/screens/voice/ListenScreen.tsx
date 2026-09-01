import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Linking,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useApi } from '../../api/client';
import { IconButton, TextButton } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Gap, Gutter, Row } from '../../components/Layout';
import { Press } from '../../components/Press';
import { Screen } from '../../components/Screen';
import { Txt } from '../../components/Text';
import { hasMic, requestMic, SPEECH_LOCALES, useSpeech } from '../../lib/speech';
import { EXAMPLE_MS, EXAMPLES, TROUBLE, useLevel } from './listening';
import { useTheme } from '../../theme/ThemeProvider';
import type { ScreenProps } from '../../navigation/types';

/**
 * SVG gradient ids resolve by name and two of these can be mounted at once
 * during a transition, so the id is per-instance. Same reason as BrandField,
 * and not `useId`, whose colons are invalid inside `url(#…)`.
 */
let instances = 0;

/**
 * The transcribing sweep: one revolution, and the share of the ring it covers.
 *
 * Deliberately not a percentage of anything. The server answers when it
 * answers; a bar that fills would be inventing progress it cannot see, and this
 * app does not draw numbers it has not measured. A constant sweep says only
 * "still working", which is the entire truth available here.
 */
const SWEEP_MS = 1150;
const SWEEP_ARC = 0.24;

/**
 * The microphone, as a screen.
 *
 * Every meal spoken into this app comes through here — the last step of
 * onboarding and the centre button on Home are the same screen, reached the
 * same way, and that is the point. The first meal is not a tutorial for some
 * other flow people graduate to; it is the flow.
 *
 * One centred object on a wash, with one target on it. Nothing is borrowed
 * from the screens around it: the onboarding steps are left-aligned forms with
 * a pinned commit, and the composer is a text field with a mic beside it. This
 * is a moment, and a moment should not look like the fifth page of a
 * questionnaire or like a page of a notebook.
 *
 * `first` marks the onboarding pass and changes exactly three things — the
 * question at the top, where leaving goes, and whether typing is offered as a
 * way out. On the first meal it is not: a text box there is an offer to avoid
 * the one thing worth learning, and "I'll do this later" is already a door.
 * Afterwards it is, because dictation needs a network and typing does not, and
 * a phone in a lift should still be able to log a meal.
 *
 * It does NOT open listening, from either door. The microphone may already be
 * granted — onboarding asks for it a screen earlier — but permission is not
 * consent to record. The tap on the orb is.
 *
 * And no dictation overlay. The panel every other recording in the app raises
 * is there to cover a screen with other things on it; this one has nothing to
 * cover, and a sheet over the orb would hide the thing following the voice.
 */
export function ListenScreen({ navigation, route }: ScreenProps<'Listen'>) {
  const first = route.params?.first ?? false;
  const { c, space, radius, elevation } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const api = useApi();

  const glow = useRef<string | null>(null);
  if (glow.current === null) glow.current = `listenGlow${(instances += 1)}`;
  const glowId = glow.current;

  /**
   * The ring extent, not the disc. Proportional to the window so the object
   * still reads as the centre of the screen on a small phone, capped so it does
   * not become furniture on a tablet.
   */
  const orb = Math.min(268, width * 0.68);
  const disc = Math.round(orb * 0.5);

  /** The sweep orbits just outside the disc, inside the inner halo ring. */
  const sweepBox = disc + 22;
  const sweepR = (sweepBox - 3) / 2;
  const sweepC = 2 * Math.PI * sweepR;

  const [reduced, setReduced] = useState(false);
  /** `unknown` until the OS has answered — the copy must not accuse before it has. */
  const [mic, setMic] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [example, setExample] = useState(0);

  /**
   * Straight to the meal, read back. Not the confirm sheet: that screen is a
   * working surface built to be corrected, and what belongs at the end of
   * speaking is the sentence understood.
   *
   * Nothing is logged by getting there. It is still a review and it still needs
   * a deliberate tap — and `first` travels with it, because where that tap
   * leads differs at the end of onboarding and in the middle of a Tuesday.
   */
  const speech = useSpeech(api, heard => {
    if (!heard) return;
    navigation.navigate('MealDetails', { phrase: heard, source: 'voice', first });
  });

  const listening = speech.state === 'listening';
  const transcribing = speech.state === 'transcribing';

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(v => alive && setReduced(v));
    return () => {
      alive = false;
    };
  }, []);

  /**
   * Re-asked on every focus rather than read once.
   *
   * Somebody who declined can leave for the system settings and come back, and
   * the screen they come back to has to be the one that works — a state read at
   * mount would still be telling them the microphone is off.
   */
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void hasMic().then(granted => alive && setMic(granted ? 'granted' : 'denied'));
      return () => {
        alive = false;
      };
    }, []),
  );

  /** The idle breath, and the voice. Two sources, one halo. */
  const pulse = useRef(new Animated.Value(0)).current;
  const level = useLevel(listening);

  useEffect(() => {
    if (reduced || listening || transcribing) {
      pulse.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [listening, pulse, reduced, transcribing]);

  /**
   * The third source of motion, and the only one that is not the user: the
   * wait while the server writes the words down.
   *
   * It needs its own, because the other two both stop dead at the end of the
   * turn — the halo follows the voice and the breath belongs to idle — and
   * what was left was a completely still screen at the one moment the app is
   * actually doing something. Still reads as crashed.
   */
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!transcribing || reduced) {
      sweep.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: SWEEP_MS,
        // Linear, so the arc does not appear to hesitate once a revolution.
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, sweep, transcribing]);

  /** The examples rotate only while there is nothing else to say. */
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduced || listening || transcribing || speech.failure) return undefined;
    const id = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 260, useNativeDriver: true }).start(() => {
        setExample(i => (i + 1) % EXAMPLES.length);
        Animated.timing(fade, { toValue: 1, duration: 320, useNativeDriver: true }).start();
      });
    }, EXAMPLE_MS);
    return () => clearInterval(id);
  }, [fade, listening, reduced, speech.failure, transcribing]);

  /**
   * One target, three jobs — speak, stop, retry — because there is one object
   * on the screen and it is the one you are looking at in all three states.
   *
   * Permission is asked here too, not only on the step before. The OS answers
   * the second request instantly when it has already been refused, so this
   * costs nothing when it is hopeless and saves the flow when the first dialog
   * was dismissed by a thumb rather than a decision.
   */
  const onOrb = async () => {
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

  /**
   * Two exits, because there are two things behind this screen.
   *
   * Ending onboarding there is a finished flow underneath, so it is reset away
   * — a navigate would push a SECOND Home over it from React Navigation 7 on,
   * and the back button would walk into a form somebody has already filled in.
   * Opened from the mic button it was pushed over Home, so leaving is simply
   * going back, and the tab you were on is still the tab you were on.
   */
  const leave = () => {
    void speech.cancel();
    if (first) navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    else navigation.goBack();
  };

  /**
   * The way out for a phone with no network.
   *
   * Dictation is a server call — it always was, on purpose, because no offline
   * recogniser handles the language this app is spoken in — and typing is not.
   * Offering it only after the first meal keeps that screen about one thing
   * while making sure nobody is ever stuck on a mic that cannot reach anything.
   */
  const type = () => {
    void speech.cancel();
    navigation.replace('Type');
  };

  const status = transcribing ? 'Writing it down' : listening ? 'Listening' : 'Tap to speak';

  /**
   * One line under the heading, and only one. A failure outranks the
   * microphone being off, which outranks saying how to stop, which outranks
   * the teaching.
   *
   * `quoted` is what separates an example from an instruction: the examples
   * are in quotation marks because they are words to be said out loud, and
   * putting the same marks around "tap the circle" would be telling somebody
   * to say it.
   */
  const hint: { text: string; quoted?: boolean } | null = speech.failure
    ? { text: TROUBLE[speech.failure] }
    : mic === 'denied'
      ? { text: 'The microphone is off for NutriCheck.' }
      : listening
        ? // The turn ends on its own at a long enough pause, but that is a
          // guess and it is wrong on exactly the speech this app is for — a
          // pause while somebody reaches for the English word for a dish.
          // Without this line the only labelled way out while the mic is open
          // is Cancel, which throws the sentence away: the person speaking
          // clearly enough to be paused would be the one punished for it.
          { text: 'Tap the circle again when you have finished.' }
        : transcribing
          ? null
          : { text: EXAMPLES[example]!, quoted: true };

  const halo = (delay: number, from: number, to: number, opacity: number) =>
    listening
      ? {
          opacity,
          transform: [
            { scale: level.interpolate({ inputRange: [0, 1], outputRange: [from, to] }) },
          ],
        }
      : reduced || transcribing
        ? // Held, not hidden. The sweep carries the motion while the server has
          // the clip; rings fading to nothing would take the object apart at
          // the moment it is meant to look busy.
          { opacity: opacity * 0.7, transform: [{ scale: (from + to) / 2 }] }
        : {
            opacity: pulse.interpolate({
              inputRange: [0, delay, delay + 0.35, 1],
              outputRange: [0, opacity, opacity * 0.8, 0],
              extrapolate: 'clamp',
            }),
            transform: [
              {
                scale: pulse.interpolate({
                  inputRange: [0, delay, 1],
                  outputRange: [from, from, to],
                  extrapolate: 'clamp',
                }),
              },
            ],
          };

  return (
    <Screen style={{ paddingTop: 0, paddingBottom: 0 }}>
      {/* The backdrop: a diagonal wash and nothing else. No edge is drawn
          anywhere on this screen, because every edge would be a box the
          composition does not have. */}
      <LinearGradient
        colors={[c.wash[1], c.canvas, c.canvas]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />

      <View style={{ flex: 1, paddingTop: insets.top + space.sm }}>
        <Gutter>
          <Row justify="space-between">
            {/* Leaving, where leaving lives on every other task in this flow —
                top left, as an X. It was a text button at the foot of the
                screen, which put "Close" directly under "Type it instead" and
                made the quiet corner of the page the busiest thing on it.

                Onboarding has no X. There the way on IS the way out, and it
                says so in words at the bottom; an X in the corner of the last
                step of a signup reads as a way to undo the signup. */}
            {first ? (
              <View style={{ width: 44 }} />
            ) : (
              <IconButton
                name="close"
                onPress={leave}
                accessibilityLabel="Close"
                style={{ marginLeft: -10 }}
              />
            )}

            {/* The language the mic listens in, and the only other control on
                the screen. It is here rather than in settings because the first
                sentence is the one most likely to be Tamil and the least likely
                to be retried — a first meal heard as English is a first
                impression. */}
            <View
              style={{
                flexDirection: 'row',
                padding: 3,
                borderRadius: radius.pill,
                backgroundColor: c.sunken,
              }}>
              {SPEECH_LOCALES.map(l => {
                const on = l.id === speech.locale;
                return (
                  <Press
                    key={l.id}
                    onPress={() => speech.setLocale(l.id)}
                    feedback="fade"
                    haptic="select"
                    accessibilityLabel={l.label}
                    accessibilityState={{ selected: on }}
                    accessibilityHint="Sets the language the microphone listens for">
                    <View
                      style={{
                        paddingHorizontal: space.md,
                        paddingVertical: 6,
                        borderRadius: radius.pill,
                        backgroundColor: on ? c.surface : 'transparent',
                      }}>
                      <Txt role="labelSm" tone={on ? 'ink' : 'tertiary'}>
                        {l.short}
                      </Txt>
                    </View>
                  </Press>
                );
              })}
            </View>
          </Row>
        </Gutter>

        <View style={{ flexGrow: 1 }} />

        <Gutter style={{ alignItems: 'center' }}>
          <Txt role="h1" style={{ textAlign: 'center' }} accessibilityRole="header">
            {first ? 'Say your first meal' : 'What did you eat?'}
          </Txt>

          <Gap h={space.md} />

          {/* Fixed height, so a failure replacing an example does not move the
              orb under the thumb that is about to press it. */}
          <View style={{ height: 24, justifyContent: 'center' }}>
            {hint ? (
              <Animated.View style={{ opacity: hint.quoted ? fade : 1 }}>
                <Txt
                  role="bodyLg"
                  tone={hint.quoted ? 'tertiary' : 'secondary'}
                  style={{ textAlign: 'center' }}>
                  {hint.quoted ? `“${hint.text}”` : hint.text}
                </Txt>
              </Animated.View>
            ) : null}
          </View>
        </Gutter>

        <Gap h={space.huge} />

        <View style={{ alignItems: 'center' }}>
          {/* The light the orb sits in. Anchored to the orb rather than painted
              across the page, so it stays behind it whatever the spacers above
              and below resolve to on a given phone — a glow that drifts off the
              object it belongs to reads as a smudge on the screen. */}
          <View
            pointerEvents="none"
            style={{ position: 'absolute', top: -orb * 0.6, width: orb * 2.2, height: orb * 2.2 }}>
            <Svg style={StyleSheet.absoluteFill}>
              <Defs>
                <RadialGradient id={glowId} cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={c.primary} stopOpacity={0.2} />
                  <Stop offset="0.5" stopColor={c.primary} stopOpacity={0.06} />
                  <Stop offset="1" stopColor={c.primary} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${glowId})`} />
            </Svg>
          </View>

          <Press
            onPress={onOrb}
            disabled={transcribing}
            feedback="none"
            haptic={listening ? 'undo' : 'select'}
            accessibilityLabel={listening ? 'Stop listening' : 'Speak your meal'}
            accessibilityHint={
              listening
                ? 'Ends the recording and reads back what you said'
                : 'Records what you say. You will see it before anything is logged.'
            }
            style={{
              width: orb,
              height: orb,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            {/* Two rings, offset in time. One reads as a beacon; two read as
                something breathing, and while the mic is open they are the
                voice itself — they follow the amplitude and stop dead when the
                recorder does, so the screen never says "still listening" after
                it has stopped. */}
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  width: orb,
                  height: orb,
                  borderRadius: orb / 2,
                  borderWidth: 1,
                  borderColor: c.ink,
                },
                halo(0.12, 0.62, 1, 0.16),
              ]}
            />
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  width: orb * 0.78,
                  height: orb * 0.78,
                  borderRadius: orb / 2,
                  borderWidth: 1,
                  borderColor: c.ink,
                },
                halo(0, 0.66, 1.04, 0.26),
              ]}
            />

            {/* The wait, drawn. A faint full track with one arc running round
                it — the shape of a thing in progress, without the claim to
                know how far along it is. */}
            {transcribing ? (
              <View
                pointerEvents="none"
                style={{ position: 'absolute', width: sweepBox, height: sweepBox }}>
                <Svg width={sweepBox} height={sweepBox}>
                  <Circle
                    cx={sweepBox / 2}
                    cy={sweepBox / 2}
                    r={sweepR}
                    stroke={c.ink}
                    strokeOpacity={0.12}
                    strokeWidth={3}
                    fill="none"
                  />
                </Svg>
                <Animated.View
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      transform: [
                        {
                          rotate: sweep.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '360deg'],
                          }),
                        },
                      ],
                    },
                  ]}>
                  <Svg width={sweepBox} height={sweepBox}>
                    <Circle
                      cx={sweepBox / 2}
                      cy={sweepBox / 2}
                      r={sweepR}
                      stroke={c.ink}
                      strokeWidth={3}
                      strokeLinecap="round"
                      fill="none"
                      strokeDasharray={`${sweepC * SWEEP_ARC} ${sweepC}`}
                    />
                  </Svg>
                </Animated.View>
              </View>
            ) : null}

            {/* Ink, not the accent. The accent means a measured value in this
                app and the loudest control it has is the inverse of the page —
                which is also what makes a white disc on a near-black wash read
                as the only thing worth touching. */}
            <Animated.View
              style={[
                {
                  width: disc,
                  height: disc,
                  borderRadius: disc / 2,
                  backgroundColor: transcribing ? c.surface : c.ink,
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                elevation.e3,
                {
                  transform: [
                    {
                      scale: listening
                        ? level.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] })
                        : 1,
                    },
                  ],
                },
              ]}>
              {/* The glyph is the control's label. A microphone means "this
                  records"; leaving it there while it IS recording leaves the
                  screen with no sign that the same circle is also the way to
                  stop — so it becomes the one shape that has meant stop on
                  every device anyone has ever owned. Not an entry in the icon
                  set: it is a square, and the set is stroked outlines. */}
              {listening ? (
                <View
                  style={{
                    width: Math.round(disc * 0.26),
                    height: Math.round(disc * 0.26),
                    borderRadius: 5,
                    backgroundColor: c.canvas,
                  }}
                />
              ) : transcribing ? (
                // Breathing on the same loop as the sweep, so the two read as
                // one thing thinking rather than two animations sharing a
                // screen.
                <Animated.View
                  style={{
                    opacity: reduced
                      ? 1
                      : sweep.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.4, 1] }),
                  }}>
                  <Icon
                    name="sparkle"
                    size={Math.round(disc * 0.3)}
                    color={c.inkSecondary}
                    weight={1.9}
                  />
                </Animated.View>
              ) : (
                <Icon name="mic" size={Math.round(disc * 0.3)} color={c.canvas} weight={1.9} />
              )}
            </Animated.View>
          </Press>

          <Gap h={space.xl} />

          <Txt
            role="labelSm"
            tone={listening || transcribing ? 'secondary' : 'tertiary'}
            caps
            style={{ letterSpacing: 1.6 }}
            accessibilityLiveRegion="polite">
            {status}
          </Txt>
        </View>

        <View style={{ flexGrow: 1.2 }} />

        {/* The way out, and the way back in from a refusal. Both are text
            buttons: this screen has exactly one thing on it that looks like a
            button, and it is the one that listens. */}
        <Gutter
          style={{
            alignItems: 'center',
            paddingBottom: Math.max(insets.bottom, space.lg) + space.lg,
          }}>
          {mic === 'denied' && !listening ? (
            <>
              <TextButton label="Open phone settings" onPress={() => void Linking.openSettings()} />
              <Gap h={space.lg} />
            </>
          ) : null}
          {/* Cancel is not Close. It ends a recording and keeps you here;
              closing the screen is the X above. Conflating them is how a
              sentence gets thrown away by somebody who meant to leave. */}
          {listening ? (
            <TextButton label="Cancel" tone="secondary" onPress={() => void speech.cancel()} />
          ) : first ? (
            <TextButton label="I'll do this later" tone="secondary" onPress={leave} />
          ) : transcribing ? null : (
            <TextButton label="Type it instead" tone="secondary" onPress={type} />
          )}
        </Gutter>
      </View>

    </Screen>
  );
}
