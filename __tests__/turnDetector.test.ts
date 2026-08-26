import { createTurnDetector } from '../src/lib/turnDetector';

/**
 * The detector never reads the clock, so `now` is just a counter here — no fake
 * timers, no AudioContext, and the code under test is exactly the code the
 * recorder drives.
 */
const LOUD = 9000;
const QUIET = 3400;

function build() {
  const ended = jest.fn();
  const started = jest.fn();
  const d = createTurnDetector({
    speechRatio: 1.5,
    minMargin: 900,
    minSpeechMs: 300,
    silenceMs: 1800,
    onSpeechStart: started,
    onTurnEnd: ended,
  });
  // One sample per 100ms, matching the native meter's interval.
  let t = 0;
  const feedRaw = (level: number, ms: number) => {
    for (let i = 0; i < ms / 100; i++) {
      t += 100;
      d.sample(level, t);
    }
  };
  /**
   * Half a second of room tone before anything else.
   *
   * The detector learns the floor from what it hears, and a real recording
   * always opens on ambience — the mic is live before anyone starts talking.
   * Feeding speech as the very first sample would teach it that shouting is
   * this room's baseline, which is a property of the test, not of the device.
   */
  feedRaw(QUIET, 500);

  return { d, ended, started, feed: feedRaw };
}

describe('turn detector', () => {
  it('ends the turn after a real sentence and a long enough pause', () => {
    const { ended, started, feed } = build();
    feed(LOUD, 1000);
    expect(started).toHaveBeenCalledTimes(1);
    expect(ended).not.toHaveBeenCalled();

    feed(QUIET, 1900);
    expect(ended).toHaveBeenCalledTimes(1);
  });

  it('survives the pauses in a spoken list', () => {
    const { ended, feed } = build();
    // "two rotis … dal … and a bowl of curd"
    feed(LOUD, 700);
    feed(QUIET, 900);
    feed(LOUD, 500);
    feed(QUIET, 1000);
    feed(LOUD, 800);

    // Every gap was under the silence window, so the turn is still open. This
    // is the bug that made on-device dictation unusable for listing a meal.
    expect(ended).not.toHaveBeenCalled();
  });

  it('ignores a noise blip: silence after it must not end a turn', () => {
    const { ended, started, feed } = build();
    // One 100ms spike — a door, a tap — then a long quiet room.
    feed(LOUD, 100);
    feed(QUIET, 5000);

    expect(started).not.toHaveBeenCalled();
    expect(ended).not.toHaveBeenCalled();
  });

  it('does not let two separate blips add up to speech', () => {
    const { started, feed } = build();
    feed(LOUD, 200);
    feed(QUIET, 200);
    feed(LOUD, 200);

    // 400ms of loud in total, but never 300ms continuously.
    expect(started).not.toHaveBeenCalled();
  });

  it('never ends a turn twice', () => {
    const { ended, feed } = build();
    feed(LOUD, 1000);
    feed(QUIET, 5000);
    expect(ended).toHaveBeenCalledTimes(1);
  });

  it('stays silent when nobody ever speaks', () => {
    const { ended, started, feed } = build();
    feed(QUIET, 10_000);
    expect(started).not.toHaveBeenCalled();
    expect(ended).not.toHaveBeenCalled();
  });

  it('reset lets the next recording start clean', () => {
    const { d, ended, feed } = build();
    feed(LOUD, 1000);
    feed(QUIET, 1900);
    expect(ended).toHaveBeenCalledTimes(1);

    d.reset();
    // A stale "speech already seen" flag would fire end-of-turn instantly on
    // the next recording's opening silence.
    feed(QUIET, 5000);
    expect(ended).toHaveBeenCalledTimes(1);
  });
});

/**
 * The same detector, replayed over amplitudes captured from a real phone
 * (1475 samples, `MediaRecorder.getMaxAmplitude()` at 100ms).
 *
 * This trace is why the detector is adaptive. Its quiet floor sits near 3400
 * and its peaks reach 9300+, so the original fixed threshold of 1500 classified
 * 100% of it as speech — a turn that starts and can never end, which is exactly
 * what "it keeps listening" looked like on the device.
 */
describe('against a real device trace', () => {
  const trace: number[] = require('./fixtures/amplitudeTrace.json');

  it('separates speech from silence instead of calling everything speech', () => {
    let floor: number | null = null;
    let speech = 0;

    for (const level of trace) {
      if (floor === null) floor = level;
      else if (level < floor) floor = level;
      else floor += (level - floor) * 0.02;
      if (level > Math.max(floor * 1.5, floor + 900)) speech++;
    }

    const ratio = speech / trace.length;
    // A detector that calls everything speech never ends a turn; one that calls
    // nothing speech never starts one. Both were real failures here.
    expect(ratio).toBeGreaterThan(0.05);
    expect(ratio).toBeLessThan(0.6);
  });

  it('ends the turn somewhere in a real recording', () => {
    const ended = jest.fn();
    const d = createTurnDetector({
      speechRatio: 1.5,
      minMargin: 900,
      minSpeechMs: 300,
      silenceMs: 1800,
      onTurnEnd: ended,
    });

    trace.forEach((level, i) => d.sample(level, (i + 1) * 100));
    expect(ended).toHaveBeenCalledTimes(1);
  });
});
