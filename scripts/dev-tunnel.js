#!/usr/bin/env node
/**
 * Keeps `adb reverse tcp:3000` alive.
 *
 * The app talks to the API over `localhost:3000`, which only reaches the dev
 * machine because of an adb reverse binding. Those bindings live in the adb
 * server and are tied to the device connection, so an unplug, a USB
 * re-enumeration, a device reboot or `adb kill-server` silently wipes them.
 *
 * React Native's CLI re-creates its own 8081/8082 whenever Metro reconnects.
 * Nothing re-creates 3000 — so it disappears, every request fails at the
 * socket, and the sign-in screen reports "No connection" while the backend is
 * perfectly healthy. That misdiagnosis is the expensive part: the symptom
 * points at the server, and the server is fine.
 *
 *   node scripts/dev-tunnel.js --once    bind now, then exit (pre-run hook)
 *   node scripts/dev-tunnel.js           watch, and re-bind on every reconnect
 *
 * Never exits non-zero on a missing device or missing adb: this runs in front
 * of `react-native start`, and failing to find a phone must not stop Metro.
 */

const { execFile } = require('node:child_process');
const { existsSync } = require('node:fs');
const { join } = require('node:path');
const { homedir } = require('node:os');

/** Must match API_BASE_URL in src/config.ts. */
const PORT = 3000;

/** Long enough to be invisible, short enough that a replug reconnects fast. */
const POLL_MS = 3000;

const WATCH = !process.argv.includes('--once');

/**
 * adb is frequently absent from PATH on Windows, where the SDK installs into
 * AppData and nothing adds platform-tools for you. Falling back to the standard
 * install locations is the difference between this working out of the box and
 * being one more thing to configure.
 */
function findAdb() {
  const exe = process.platform === 'win32' ? 'adb.exe' : 'adb';
  const roots = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    join(homedir(), 'AppData', 'Local', 'Android', 'Sdk'),
    join(homedir(), 'Library', 'Android', 'sdk'),
    join(homedir(), 'Android', 'Sdk'),
  ].filter(Boolean);

  for (const root of roots) {
    const candidate = join(root, 'platform-tools', exe);
    if (existsSync(candidate)) return candidate;
  }
  // Last resort: trust PATH. If it is not there either, `run` reports it once.
  return exe;
}

const ADB = findAdb();

function run(args) {
  return new Promise(resolve => {
    execFile(ADB, args, { timeout: 10_000 }, (error, stdout) => {
      resolve({ ok: !error, out: String(stdout || '') });
    });
  });
}

/** A device in state `device` — `unauthorized` and `offline` cannot take a bind. */
async function deviceReady() {
  const { ok, out } = await run(['devices']);
  if (!ok) return false;
  return out
    .split('\n')
    .slice(1)
    .some(line => /\sdevice\s*$/.test(line.trimEnd()));
}

async function isBound() {
  const { ok, out } = await run(['reverse', '--list']);
  return ok && out.includes(`tcp:${PORT}`);
}

/** Reports only on CHANGE, so a watch left running all day stays quiet. */
let lastState = null;
function report(state, message) {
  if (state === lastState) return;
  lastState = state;
  console.log(message);
}

async function tick() {
  if (!(await deviceReady())) {
    report('no-device', `[tunnel] no device — waiting (port ${PORT})`);
    return;
  }

  if (await isBound()) {
    report('bound', `[tunnel] localhost:${PORT} on the device reaches this machine`);
    return;
  }

  const { ok } = await run(['reverse', `tcp:${PORT}`, `tcp:${PORT}`]);
  if (ok) {
    // Forced, because re-binding after a drop is the event worth seeing.
    lastState = null;
    report('bound', `[tunnel] bound tcp:${PORT} -> tcp:${PORT}`);
  } else {
    report('failed', `[tunnel] could not bind tcp:${PORT} (adb: ${ADB})`);
  }
}

async function main() {
  await tick();
  if (!WATCH) return;
  setInterval(() => {
    void tick();
  }, POLL_MS);
}

void main();
