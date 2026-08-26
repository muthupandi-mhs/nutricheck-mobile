import { NativeEventEmitter, NativeModules } from 'react-native';

/**
 * The app's own recorder (android/app/src/main/java/com/nutricheck/recorder).
 *
 * Not `RCTRecorder` or any other prefixed name: the New Architecture stopped
 * stripping `RCT`/`RK` from module names, which is how the voice library ended
 * up as `null` here. A plain name resolves under both architectures.
 */
const Native = NativeModules.NutriCheckRecorder as
  | {
      start(): Promise<void>;
      stop(): Promise<{ base64: string; durationMs: number; bytes: number } | null>;
      cancel(): Promise<void>;
    }
  | undefined;

/** Must match RecorderModule.EVENT_AMPLITUDE. */
const AMPLITUDE_EVENT = 'NutriCheckRecorder:amplitude';

/** A clip too short or too quiet to have written a frame resolves as null. */
export type Clip = { base64: string; durationMs: number; bytes: number };

/**
 * False on a build where the native module did not register — an old APK
 * against new JS, most likely. Checked rather than assumed: a missing module is
 * `undefined`, and calling through it throws a TypeError nobody can act on.
 */
export const RECORDING_SUPPORTED = Boolean(Native);

export async function startRecording(): Promise<boolean> {
  if (!Native) return false;
  try {
    await Native.start();
    return true;
  } catch {
    return false;
  }
}

/**
 * Stop and return the clip, or null when there was nothing in it.
 *
 * Never throws. Every failure here has the same answer for the user — the box
 * is still there, type it — so an exception would only replace a workable
 * situation with an error screen.
 */
export async function stopRecording(): Promise<Clip | null> {
  if (!Native) return null;
  try {
    return (await Native.stop()) ?? null;
  } catch {
    return null;
  }
}

export async function cancelRecording(): Promise<void> {
  if (!Native) return;
  try {
    await Native.cancel();
  } catch {
    // Nothing to clean up on this side, and nothing to tell the user.
  }
}

/**
 * Amplitude samples while recording, ~10/second.
 *
 * Emitted by the native module rather than polled from JS: a bridge round trip
 * every 100ms to ask "how loud is it" would cost more than the answer is worth,
 * and the native side already has the number.
 */
export function onAmplitude(listener: (level: number) => void): () => void {
  if (!Native) return () => {};
  const sub = new NativeEventEmitter(
    NativeModules.NutriCheckRecorder as never,
  ).addListener(AMPLITUDE_EVENT, (level: unknown) => listener(Number(level) || 0));
  return () => sub.remove();
}
