import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { PrimaryButton, SecondaryButton, TextAction } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Gap, Gutter, Row } from '../../components/Layout';
import { Body, Display, Eyebrow, Mono } from '../../components/Type';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * Microphone priming, and the recording state.
 *
 * The system dialog is asked only of people who already said yes to the plain
 * language version, because a denial is close to permanent and the OS will not
 * ask twice. The decline here is a real, visible button — a priming screen
 * whose only exit is "Allow" trains people to distrust the next one.
 */
export function MicPrimer({ onAllow, onDecline }: { onAllow: () => void; onDecline: () => void }) {
  const { c, space } = useTheme();
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.scrim, justifyContent: 'flex-end' }}>
      <View style={{ backgroundColor: c.ground, borderTopWidth: 6, borderTopColor: c.heavy, paddingTop: space.xl }}>
        <Gutter>
          <Icon name="mic" size={26} color={c.ink} />
          <Gap h={space.md} />
          <Display size={26}>Speak instead of typing?</Display>
          <Gap h={space.sm} />
          <Body size={15} tone="ink2">
            Your phone will ask for the microphone next. We use it only while you hold the button,
            and the words go into the same box you can edit before sending.
          </Body>
          <Gap h={space.lg} />
          <PrimaryButton label="Ask for the microphone" onPress={onAllow} />
          <Gap h={space.md} />
          <View style={{ alignItems: 'center' }}>
            <TextAction label="Not now — I'll type" onPress={onDecline} tone="ink2" size={12.5} />
          </View>
          <Gap h={space.xl} />
        </Gutter>
      </View>
    </View>
  );
}

/**
 * The recording state.
 *
 * The transcript is always shown before sending and is always editable. A bad
 * transcript is fixed by typing, never by asking someone to say it again —
 * repeating yourself to a machine that misheard is the most frustrating
 * interaction in voice, and the fix costs one text field.
 */
export function RecordingOverlay({
  transcript,
  onStop,
  onCancel,
}: {
  transcript: string;
  onStop: () => void;
  onCancel: () => void;
}) {
  const { c, space } = useTheme();
  const bars = useRef([...Array(9)].map(() => new Animated.Value(0.25))).current;

  useEffect(() => {
    const loops = bars.map((bar, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 55),
          Animated.timing(bar, { toValue: 1, duration: 320 + i * 24, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
          Animated.timing(bar, { toValue: 0.25, duration: 320 + i * 24, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        ]),
      ),
    );
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [bars]);

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.scrim, justifyContent: 'flex-end' }}>
      <View style={{ backgroundColor: c.ground, borderTopWidth: 6, borderTopColor: c.est, paddingTop: space.lg }}>
        <Gutter>
          <Row gap={9}>
            <View style={{ width: 8, height: 8, backgroundColor: c.est }} />
            <Eyebrow size={10.5} tone="est">
              LISTENING — RELEASE TO STOP
            </Eyebrow>
          </Row>

          <Row gap={4} align="flex-end" style={{ height: 54, paddingVertical: space.lg }}>
            {bars.map((bar, i) => (
              <Animated.View
                key={i}
                style={{
                  width: 5,
                  backgroundColor: c.est,
                  height: bar.interpolate({ inputRange: [0, 1], outputRange: [5, 34] }),
                }}
              />
            ))}
          </Row>

          <View style={{ minHeight: 74, backgroundColor: c.surface, borderWidth: 1, borderColor: c.rule, padding: space.md }}>
            {transcript ? (
              <Body size={17} style={{ lineHeight: 25 }}>
                {transcript}
              </Body>
            ) : (
              <Mono size={12} tone="ink3">
                say what you ate…
              </Mono>
            )}
          </View>

          <Gap h={space.md} />
          <Mono size={10.5} tone="ink3">
            You will see the transcript before anything is sent, and you can edit it.
          </Mono>
          <Gap h={space.lg} />
          <Row gap={space.md}>
            <View style={{ flexGrow: 1 }}>
              <SecondaryButton label="Cancel" onPress={onCancel} />
            </View>
            <View style={{ flexGrow: 1 }}>
              <PrimaryButton label="Done" onPress={onStop} />
            </View>
          </Row>
          <Gap h={space.xl} />
        </Gutter>
      </View>
    </View>
  );
}
