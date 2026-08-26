import { useCallback, useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import type { NutriCheckApi } from '../api/client';
import { OfflineError } from '../api/types';
import { repairDictatedNumbers } from './dictation';
import {
  cancelRecording,
  onAmplitude,
  RECORDING_SUPPORTED,
  startRecording,
  stopRecording,
} from './recorder';
import { load, save } from './storage';
import {
  createTurnDetector,
  MIN_MARGIN,
  MIN_SPEECH_MS,
  SILENCE_MS,
  SPEECH_RATIO,
  type TurnDetector,
} from './turnDetector';

/**
 * Dictation, transcribed on the server.
 *
 * There is no on-device recogniser here any more. Android's offline models
 * cannot handle the language this app is actually spoken in: `en-IN` renders
 * Tanglish phonetically at best, `ta-IN` needs a language pack that most phones
 * do not have and that no API can even ask about. Both failed silently, in
 * different ways, on the one input the product depends on.
 *
 * So the phone records and `POST /v1/transcribe` listens. That buys a model
 * that can be TOLD what it is listening to — a meal, in Tamil or Tanglish or
 * both — which is the whole difference between "rendu dosai" surviving and
 * becoming "rendu doses".
 *
 * What it costs, stated plainly because the UI has to be honest about it:
 * dictation now needs a network, takes a few seconds instead of being
 * instant, and sends audio off the device.
 */
export type SpeechLocaleId = 'en-IN' | 'ta-IN';

/**
 * The language the server is told to expect.
 *
 * Two entries, not three — there is no Tanglish option because Tanglish is not
 * a separate language to a model that has been told to expect Tamil words in an
 * English sentence. `en-IN` covers English and Tanglish; `ta-IN` covers Tamil
 * and Tamil-with-English-words. The server maps each to a plain-language
 * instruction rather than a locale code.
 */
export const SPEECH_LOCALES: ReadonlyArray<{
  id: SpeechLocaleId;
  /** In the language itself — a Tamil speaker should not read English to find Tamil. */
  short: string;
  label: string;
}> = [
  { id: 'en-IN', short: 'EN', label: 'English or Tanglish' },
  { id: 'ta-IN', short: 'தமிழ்', label: 'Tamil' },
];

export const DEFAULT_LOCALE: SpeechLocaleId = 'en-IN';

/** Survives restarts: someone who speaks Tamil speaks Tamil next time too. */
const LOCALE_KEY = 'speech.locale';

/** Kept for callers that only want a label. */
export const LOCALE = DEFAULT_LOCALE;

/** Must match RecorderModule.METER_INTERVAL_MS — the detector counts samples as time. */
const AMPLITUDE_INTERVAL_MS = 100;

/** Below this there is no speech in the clip, only a tap. */
const MIN_CLIP_MS = 400;

/**
 * `recording` while the mic is open, `transcribing` while the server has it.
 *
 * These are two genuinely different waits and the overlay has to say which it
 * is in. On-device dictation had one state because the words appeared as they
 * were spoken; here nothing appears until the upload comes back, and a spinner
 * that means "still listening" when it actually means "still thinking" teaches
 * people to talk over it.
 */
export type SpeechState = 'idle' | 'listening' | 'transcribing' | 'error';

/** Every failure the UI has to say something different about. */
export type SpeechFailure =
  | 'permission'
  | 'unavailable'
  | 'nothing-heard'
  | 'offline'
  | 'failed';

/**
 * Do we already hold the microphone? Asks the OS, and never prompts.
 *
 * The centre button opens the composer already recording, which is only honest
 * if we know we have permission. Calling `requestMic` to find out would put the
 * system dialog in front of someone who has merely tapped "log a meal" — the
 * primer exists precisely so that never happens.
 */
export async function hasMic(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  } catch {
    return false;
  }
}

/**
 * Asks for the microphone at the moment of use, never at launch. On Android the
 * OS dialog only ever appears twice, so it is spent on someone who has already
 * agreed in plain language (see MicPrimer).
 */
export async function requestMic(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Use your microphone?',
        message: 'So you can say what you ate instead of typing it.',
        buttonPositive: 'Allow',
        buttonNegative: 'Not now',
      },
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

/**
 * Record, upload, hand back words.
 *
 * `stop()` resolves with the transcript rather than pushing it through state,
 * so the caller never has to guess whether the last result has landed. That
 * shape is unchanged from the on-device version — the composer did not need
 * rewriting when the recogniser moved off the phone, which is the point of it
 * having been a hook rather than a screen.
 */
export function useSpeech(api: NutriCheckApi, onTranscript?: (text: string) => void) {
  const [state, setState] = useState<SpeechState>('idle');
  const [failure, setFailure] = useState<SpeechFailure | null>(null);
  const [locale, setLocaleState] = useState<SpeechLocaleId>(DEFAULT_LOCALE);

  /**
   * Held in a ref, not a dependency.
   *
   * The turn can end at any moment from a native event, so the callback has to
   * be whatever the latest render supplied — putting it in `useCallback` deps
   * instead would tear down the detector and the amplitude subscription every
   * time the composer re-rendered, which is every keystroke.
   */
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  /**
   * Gates auto-start. The stored choice arrives a tick after mount and the mic
   * button opens already recording — without this a Tamil speaker's first tap
   * of every launch would be sent up labelled as English.
   */
  const [localeReady, setLocaleReady] = useState(false);

  const localeRef = useRef<SpeechLocaleId>(DEFAULT_LOCALE);
  const recording = useRef(false);

  /** The end-of-speech detector, and the native amplitude feed driving it. */
  const detector = useRef<TurnDetector | null>(null);
  const unsubscribe = useRef<(() => void) | null>(null);

  /**
   * `stop` reaches into this rather than being called directly by the detector.
   *
   * The detector fires from a native event, outside React's world, and the
   * `stop` it would otherwise capture is the one from the render that started
   * the recording. Going through a ref means it always runs the current one.
   */
  const stopRef = useRef<() => Promise<string>>(async () => '');

  const teardownMeter = useCallback(() => {
    unsubscribe.current?.();
    unsubscribe.current = null;
    detector.current?.reset();
  }, []);

  useEffect(() => {
    let alive = true;
    void load<SpeechLocaleId>(LOCALE_KEY).then(stored => {
      if (!alive) return;
      if (stored && SPEECH_LOCALES.some(l => l.id === stored)) {
        setLocaleState(stored);
        localeRef.current = stored;
      }
      setLocaleReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  // The mic must not stay open because a screen went away.
  useEffect(
    () => () => {
      if (recording.current) void cancelRecording();
      recording.current = false;
      unsubscribe.current?.();
      unsubscribe.current = null;
    },
    [],
  );

  const setLocale = useCallback((id: SpeechLocaleId) => {
    setLocaleState(id);
    localeRef.current = id;
    void save(LOCALE_KEY, id);
  }, []);

  const start = useCallback(async () => {
    setFailure(null);
    if (!RECORDING_SUPPORTED) {
      setFailure('unavailable');
      setState('error');
      return false;
    }
    if (!(await startRecording())) {
      setFailure('failed');
      setState('error');
      return false;
    }
    recording.current = true;
    setState('listening');

    // Listening for the end of the sentence, so nobody has to press a button to
    // say they have finished talking.
    detector.current = createTurnDetector({
      speechRatio: SPEECH_RATIO,
      minMargin: MIN_MARGIN,
      minSpeechMs: MIN_SPEECH_MS,
      silenceMs: SILENCE_MS,
      onTurnEnd: () => {
        void stopRef.current();
      },
    });

    let elapsed = 0;
    unsubscribe.current = onAmplitude(level => {
      // The detector is given a monotonic clock of its own rather than reading
      // one: samples arrive on a fixed native interval, so counting them IS the
      // time, and it stays identical to what the tests drive it with.
      elapsed += AMPLITUDE_INTERVAL_MS;
      detector.current?.sample(level, elapsed);
    });

    return true;
  }, []);

  /**
   * Stop, upload, resolve with the words.
   *
   * Returns '' for every outcome that is not a transcript — nothing recorded,
   * nothing heard, no network. The caller's response is the same in all of
   * them: leave the box as it is, and let `failure` say why.
   */
  const stop = useCallback(async (): Promise<string> => {
    // Also the guard against the detector and a manual stop racing: whichever
    // gets here first flips this, and the other returns empty.
    if (!recording.current) return '';
    recording.current = false;
    teardownMeter();

    const clip = await stopRecording();
    if (!clip || clip.durationMs < MIN_CLIP_MS) {
      setFailure('nothing-heard');
      setState('idle');
      return '';
    }

    setState('transcribing');
    try {
      const result = await api.transcribe({
        audio: clip.base64,
        mimeType: 'audio/aac',
        locale: localeRef.current,
      });
      setState('idle');

      const text = result.text.trim();
      if (!text) {
        setFailure('nothing-heard');
        return '';
      }
      // "to dosai" is two dosai. The transcriber writes what it hears and a
      // spoken number is where that most often costs the parse an item.
      const words = repairDictatedNumbers(text);
      // The turn usually ends by itself, so the caller is not awaiting this —
      // it has to be told.
      onTranscriptRef.current?.(words);
      return words;
    } catch (error) {
      // Offline is worth its own message: on-device dictation used to work with
      // no network and this does not, so "try again" would be a lie.
      setFailure(error instanceof OfflineError ? 'offline' : 'failed');
      setState('error');
      return '';
    }
  }, [api, teardownMeter]);

  stopRef.current = stop;

  const cancel = useCallback(async () => {
    recording.current = false;
    teardownMeter();
    await cancelRecording();
    setFailure(null);
    setState('idle');
  }, [teardownMeter]);

  return { state, failure, start, stop, cancel, locale, setLocale, localeReady };
}
