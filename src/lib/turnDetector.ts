/**
 * Decides when somebody has finished speaking.
 *
 * Pure, and it never reads the clock — `now` is a parameter. That is what lets
 * the tests drive it with a plain counter instead of a real microphone and fake
 * timers, and it means the thing under test is the same code the recorder runs,
 * not a re-implementation that can drift.
 *
 * Two DURATIONS, not one amplitude. That distinction is the whole design:
 *
 *  - A single loud sample must not count as speech starting. One door slam,
 *    one keyboard tap, and the next stretch of ordinary silence would read as
 *    "they finished talking" for a sentence nobody said.
 *  - A short gap must not count as speech ending. Listing a meal is full of
 *    pauses — "two rotis… dal… and a bowl of curd" — and this app already had
 *    exactly that bug once, when Android's own recogniser cut people off at the
 *    first believable gap.
 *
 * Raising the threshold instead would trade those for a worse one: a quiet
 * opening word never crossing it at all.
 */
export type TurnDetector = {
  /** Feed one amplitude sample. Calls back at most once per confirmed turn. */
  sample(level: number, now: number): void;
  /** Forget everything — a new recording must not inherit the last one's state. */
  reset(): void;
};

export function createTurnDetector({
  speechRatio,
  minMargin,
  minSpeechMs,
  silenceMs,
  onSpeechStart = () => {},
  onTurnEnd,
}: {
  speechRatio: number;
  minMargin: number;
  minSpeechMs: number;
  silenceMs: number;
  onSpeechStart?: () => void;
  onTurnEnd: () => void;
}): TurnDetector {
  let confirmed = false;
  let loudSince: number | null = null;
  let quietSince: number | null = null;
  let ended = false;

  /**
   * The room's own noise, learned as we go.
   *
   * A fixed threshold was the first attempt and it was simply wrong: measured
   * on a real phone, the quiet floor sat around 3400 and speech peaked near
   * 9300 — so any constant low enough to catch a quiet talker in a quiet room
   * also classified a noisy room's silence as speech, and a turn that never
   * starts quiet can never end.
   *
   * Drops instantly and rises slowly, so a door closing does not permanently
   * raise the bar, while moving somewhere genuinely louder is followed within a
   * few seconds.
   */
  let floor: number | null = null;

  return {
    sample(level, now) {
      if (ended) return;

      if (floor === null) floor = level;
      else if (level < floor) floor = level;
      else floor += (level - floor) * FLOOR_RISE;

      // Relative, with an absolute margin underneath it. The ratio alone would
      // make a near-silent room (floor close to zero) treat any sound at all as
      // speech; the margin alone would fail in a loud one.
      const threshold = Math.max(floor * speechRatio, floor + minMargin);

      if (level > threshold) {
        quietSince = null;
        if (confirmed) return;
        if (loudSince === null) {
          loudSince = now;
        } else if (now - loudSince >= minSpeechMs) {
          confirmed = true;
          onSpeechStart();
        }
        return;
      }

      // Below the threshold. Any dip cancels a run that has not been confirmed
      // yet, so two separate blips can never add up to "speech".
      loudSince = null;

      // Nothing has been said, so there is nothing to end. This is what stops
      // the turn ending during the silence before someone starts talking.
      if (!confirmed) return;

      if (quietSince === null) {
        quietSince = now;
      } else if (now - quietSince >= silenceMs) {
        ended = true;
        onTurnEnd();
      }
    },

    reset() {
      confirmed = false;
      loudSince = null;
      quietSince = null;
      ended = false;
      floor = null;
    },
  };
}

/** How fast the floor follows a room getting louder. ~10 samples/s, so seconds. */
const FLOOR_RISE = 0.02;

/**
 * Tuned for dictating a meal, not for conversation.
 *
 * `SILENCE_MS` is deliberately long. A chat assistant wants to answer the
 * moment you stop, so it uses something near 900 ms; someone reciting what they
 * ate stops for that long in the middle of a sentence. The cost of waiting too
 * long is a second of delay. The cost of cutting in early is half a meal.
 *
 * `SPEECH_RATIO` and `MIN_MARGIN` are calibrated against a real trace from the
 * test device: floor ~3400, quiet stretches to ~4600, speech 5500–9300. A ratio
 * of 1.5 puts the line near 5100, between the two. They are the two dials worth
 * touching if it cuts in early or never stops.
 *
 * These work on `MediaRecorder.getMaxAmplitude()`, which is the PEAK of each
 * window rather than its RMS — peaks are dominated by transients, so speech and
 * silence sit much closer together than they would on an RMS signal. That is
 * why this has to be relative. Moving to `AudioRecord` and computing RMS over
 * the PCM would separate them properly and is the real fix if this stays
 * temperamental.
 */
export const SPEECH_RATIO = 1.5;
export const MIN_MARGIN = 900;
export const MIN_SPEECH_MS = 300;
export const SILENCE_MS = 1800;
