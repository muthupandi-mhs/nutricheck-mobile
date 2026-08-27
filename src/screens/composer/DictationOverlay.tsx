import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, TextButton } from '../../components/Button';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { Gap, Gutter, Row } from '../../components/Layout';
import { Txt } from '../../components/Text';
import { useTheme } from '../../theme/ThemeProvider';

function Panel({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  const { c, radius, elevation } = useTheme();
  const insets = useSafeAreaInsets();
  const rise = useRef(new Animated.Value(60)).current;

  useEffect(() => {
    Animated.spring(rise, { toValue: 0, damping: 26, stiffness: 320, useNativeDriver: true }).start();
  }, [rise]);

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.scrim, justifyContent: 'flex-end' }}>
      <Animated.View
        style={{
          backgroundColor: c.canvas,
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
          paddingTop: 26,
          paddingBottom: Math.max(insets.bottom, 20) + 8,
          borderTopWidth: accent ? 3 : 0,
          borderTopColor: c.attention,
          transform: [{ translateY: rise }],
          ...elevation.e3,
        }}>
        {children}
      </Animated.View>
    </View>
  );
}

/**
 * Microphone priming. The system dialog is only shown to people who already
 * said yes in plain language, because a denial is close to permanent. The
 * decline here is a real, visible button.
 */
export function MicPrimer({ onAllow, onDecline }: { onAllow: () => void; onDecline: () => void }) {
  const { c, radius, space } = useTheme();

  return (
    <Panel>
      <Gutter>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: radius.pill,
            backgroundColor: c.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Icon name="mic" size={26} color={c.primarySoftInk} weight={1.9} />
        </View>
        <Gap h={space.lg} />
        <Txt role="h2">Speak instead of typing?</Txt>
        <Gap h={space.sm} />
        <Txt role="body" tone="secondary">
          Your phone will ask for the microphone next. We listen only while you are talking and stop on our
          own when you finish. Nothing is logged until you have seen what we heard and said yes.
        </Txt>
        <Gap h={space.xl} />
        <Button label="Ask for the microphone" onPress={onAllow} haptic="select" />
        <Gap h={space.md} />
        <View style={{ alignItems: 'center' }}>
          <TextButton label="Not now — I'll type" tone="secondary" onPress={onDecline} />
        </View>
      </Gutter>
    </Panel>
  );
}

/**
 * Two waits, one panel.
 *
 * There is no live transcript any more: the words are made on the server, so
 * nothing exists to show until the upload returns. What replaces it is being
 * honest about which wait the user is in — the mic being open and the server
 * thinking are different things, and a bar that keeps dancing through both
 * teaches people to carry on talking into a mic that has already closed.
 */
export function RecordingOverlay({
  transcribing,
  onDone,
  onCancel,
}: {
  transcribing: boolean;
  /** End the turn now and keep what was heard. */
  onDone: () => void;
  onCancel: () => void;
}) {
  const { c, space } = useTheme();
  const bars = useRef([...Array(13)].map(() => new Animated.Value(0.22))).current;

  useEffect(() => {
    const loops = bars.map((bar, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 48),
          Animated.timing(bar, { toValue: 1, duration: 320 + (i % 4) * 60, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
          Animated.timing(bar, { toValue: 0.22, duration: 320 + (i % 4) * 60, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        ]),
      ),
    );
    // The bars stop the moment the mic does. They are the only thing on screen
    // that says "still listening", so leaving them running through the upload
    // would be the app telling a lie it knows the answer to.
    if (transcribing) {
      bars.forEach(bar => bar.setValue(0.22));
      return undefined;
    }
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [bars, transcribing]);

  return (
    <Panel accent>
      <Gutter>
        <Row gap={space.sm}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.attention }} />
          <Txt role="labelSm" tone="attention">
            {transcribing ? 'Writing it down' : 'Listening'}
          </Txt>
        </Row>

        <Row gap={5} align="center" style={{ height: 56, paddingVertical: space.lg }}>
          {bars.map((bar, i) => (
            <Animated.View
              key={i}
              style={{
                flexGrow: 1,
                borderRadius: 3,
                backgroundColor: c.attention,
                height: bar.interpolate({ inputRange: [0, 1], outputRange: [5, 36] }),
              }}
            />
          ))}
        </Row>

        <Card fill="sunken" style={{ minHeight: 84 }}>
          <Txt role="bodyLg" tone="tertiary">
            {transcribing ? 'a few seconds…' : 'say what you ate, then tap Done'}
          </Txt>
        </Card>

        <Gap h={space.md} />
        {/* This used to promise a look at the transcript first. Dictation now
            goes straight to the confirm sheet, so it promises what actually
            happens: a review of the food, before any of it is logged. */}
        <Txt role="caption" tone="tertiary">
          You will see what we heard, item by item, before anything is logged.
        </Txt>

        <Gap h={space.xl} />
        {/*
          Done exists because the end-of-speech detector is a guess, and it is
          wrong most often on exactly the speech this app is for: a pause
          mid-sentence while somebody reaches for the English word for a dish,
          or a kitchen with a television on. When it guesses wrong the only way
          out was Cancel, which throws away what was already said -- so the
          person who was speaking clearly enough was the one punished.

          It is the primary action rather than a secondary one because it is the
          normal way a turn ends. Cancel stays a text button underneath: it
          means something different, and confusing the two loses a sentence.

          Hidden while transcribing. The microphone is already closed by then
          and there is nothing left to stop.
        */}
        {transcribing ? null : (
          <>
            <Button label="Done" onPress={onDone} accessibilityHint="Stop listening and use what you said" />
            <Gap h={space.sm} />
          </>
        )}
        <View style={{ alignItems: 'center' }}>
          <TextButton label="Cancel" tone="secondary" onPress={onCancel} />
        </View>
      </Gutter>
    </Panel>
  );
}
