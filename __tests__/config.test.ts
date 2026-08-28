/**
 * Which backend a build talks to.
 *
 * This is tested because of how it fails rather than how complicated it is. A
 * release build pointed at localhost does not throw, log, or show an error —
 * `usesCleartextTraffic` is false in release, so the request is a socket that
 * never connects, and the app reports "No connection" on the sign-in screen.
 * That is indistinguishable from the server being down, which means the bug
 * survives testing and reaches whoever installed the build.
 *
 * The rule used to be a constant somebody flipped by hand before a build and
 * flipped back afterwards. These two tests are what replaced remembering.
 */

/** Re-imports the module with `__DEV__` set, since it is read at module scope. */
function loadConfig(dev: boolean) {
  jest.resetModules();
  (globalThis as { __DEV__?: boolean }).__DEV__ = dev;
  // A require, not an import: the point is a fresh module evaluation under a
  // different global, and an import is hoisted and cached past both.
  return require('../src/config') as typeof import('../src/config');
}

afterEach(() => {
  // The RN jest preset runs everything else as a debug build. Leaving this
  // false would quietly change what every later suite imports.
  (globalThis as { __DEV__?: boolean }).__DEV__ = true;
  jest.resetModules();
});

describe('backend selection', () => {
  it('sends a release build to the deployed box, never to localhost', () => {
    const { API_BASE_URL, NEEDS_ADB_TUNNEL } = loadConfig(false);

    expect(API_BASE_URL).not.toContain('localhost');
    expect(API_BASE_URL).not.toContain('10.0.2.2');
    // HTTPS is not a preference here. Cleartext is disabled in release builds,
    // so a plain-http URL would fail on every installed copy while working on
    // the desk it was built on.
    expect(API_BASE_URL).toMatch(/^https:\/\//);
    // Nothing shipped can depend on a cable.
    expect(NEEDS_ADB_TUNNEL).toBe(false);
  });

  it('sends a debug build to the machine it was built on', () => {
    const { API_BASE_URL } = loadConfig(true);

    expect(API_BASE_URL).toMatch(/localhost|10\.0\.2\.2/);
  });
});
