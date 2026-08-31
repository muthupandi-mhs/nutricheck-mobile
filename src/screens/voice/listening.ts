import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { clamp01 } from '../../lib/format';
import { onAmplitude } from '../../lib/recorder';
import type { SpeechFailure } from '../../lib/speech';

/**
 * The parts of listening that both doors need.
 *
 * There are two: the full screen onboarding ends on, and the panel the mic
 * button raises over Today. They are deliberately different compositions — one
 * is a moment, the other is a thing you pull up mid-task — but the words and
 * the motion have to be the same in both, and a copy of either in the other
 * file is a copy that will drift the first time one is edited.
 */

/**
 * What to say, shown one at a time.
 *
 * Three, in the register the app is actually spoken in — an example in careful
 * English teaches people to speak carefully, which is the one thing this parser
 * does not need them to do.
 */
export const EXAMPLES = [
  'two dosai and sambar',
  'a bowl of curd rice',
  'rendu idli, chutney',
] as const;

/** How long each example holds before the next fades in. */
export const EXAMPLE_MS = 3400;

/**
 * One line per failure, never a panel.
 *
 * Every one of these is recoverable by tapping the microphone again, and a
 * bordered error box would be the loudest thing on either surface — louder
 * than the control that fixes it.
 */
export const TROUBLE: Record<SpeechFailure, string> = {
  permission: 'The microphone is off for NutriCheck.',
  unavailable: 'Dictation is not available in this build.',
  'nothing-heard': 'We did not catch that. Try again, a little closer.',
  offline: 'Dictation needs the network. Try again in a moment.',
  failed: 'That stopped early. Tap and say it again.',
};

/**
 * The floor of the amplitude scale, and how fast the running peak forgets.
 *
 * `getMaxAmplitude()` is a raw 0–32767 and a quiet room still reads a few
 * hundred, so there is no fixed number to draw against: 3,000 is a shout on one
 * phone and a fridge on another. The visual is relative instead — normalised
 * against a peak that decays — which is honest about what it is (motion that
 * follows a voice) rather than pretending to be a meter.
 */
const NOISE_FLOOR = 1200;
const PEAK_DECAY = 0.93;

/**
 * A 0–1 value that follows the voice while the microphone is open, and settles
 * to nothing when it closes.
 *
 * Native-driver safe: callers may only feed it into `opacity` and `transform`,
 * which is all either surface does with it.
 */
export function useLevel(listening: boolean): Animated.Value {
  const level = useRef(new Animated.Value(0)).current;
  const peak = useRef(NOISE_FLOOR);

  useEffect(() => {
    if (!listening) {
      peak.current = NOISE_FLOOR;
      Animated.timing(level, { toValue: 0, duration: 240, useNativeDriver: true }).start();
      return undefined;
    }
    return onAmplitude(raw => {
      peak.current = Math.max(raw, peak.current * PEAK_DECAY, NOISE_FLOOR);
      const half = NOISE_FLOOR / 2;
      Animated.timing(level, {
        toValue: clamp01((raw - half) / (peak.current - half)),
        // The native side samples every 100ms; anything slower lags visibly
        // behind the voice, which reads as the app not keeping up.
        duration: 110,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    });
  }, [level, listening]);

  return level;
}
