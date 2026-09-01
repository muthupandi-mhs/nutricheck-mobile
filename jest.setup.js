/**
 * Test environment shims.
 *
 * Safe-area ships its own mock — using it rather than a hand-rolled one keeps
 * the context objects that @react-navigation/elements reads directly, which a
 * partial mock silently omits and which fail as `undefined` deep inside React.
 */
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

/** A native module with no JS fallback; the renderer throws without it. */
jest.mock('react-native-haptic-feedback', () => ({
  __esModule: true,
  default: { trigger: jest.fn() },
  HapticFeedbackTypes: new Proxy({}, { get: (_, k) => String(k) }),
}));

/**
 * Renders as a plain View so children still mount and can be asserted on.
 * A no-op mock would silently swallow the hero card's whole subtree.
 */
jest.mock('react-native-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, ...props }) => React.createElement(View, props, children),
  };
});

/**
 * AsyncStorage is a native module, and v3 no longer ships a jest mock. An
 * in-memory Map is the whole contract the app uses, and keeping real semantics
 * (a written key reads back) means the session-persistence path is exercised
 * rather than stubbed away.
 */
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(k => Promise.resolve(store.has(k) ? store.get(k) : null)),
      setItem: jest.fn((k, v) => {
        store.set(k, v);
        return Promise.resolve();
      }),
      removeItem: jest.fn(k => {
        store.delete(k);
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        store.clear();
        return Promise.resolve();
      }),
    },
  };
});

/**
 * The recorder is this app's own native module (com.nutricheck.recorder), so
 * it does not exist under Jest. Registered on `NativeModules` rather than
 * mocked by path: `lib/recorder.ts` reads it from there, and that lookup —
 * plain name, no `RCT` prefix — is itself the thing that broke on the module
 * this one replaced. Testing against the real accessor keeps it honest.
 *
 * `stop` returns a clip, so the composer's upload path runs rather than being
 * short-circuited into the empty branch.
 */
const { NativeModules } = require('react-native');

NativeModules.NutriCheckRecorder = {
  start: jest.fn(() => Promise.resolve()),
  stop: jest.fn(() => Promise.resolve({ base64: 'AAAA', durationMs: 1800, bytes: 3 })),
  cancel: jest.fn(() => Promise.resolve()),
};

/**
 * Google Sign-In is a native module, so it does not exist under Jest and the
 * renderer throws on import alone — Welcome imports the hook that imports it.
 *
 * Cancelled by default, which is the outcome that changes nothing: a screen
 * that renders this mock gets a working button that quietly does nothing,
 * rather than one that navigates somewhere mid-assertion. Suites that care
 * override `signIn` for the case they are testing.
 */
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(() => Promise.resolve({ type: 'cancelled' })),
    signOut: jest.fn(() => Promise.resolve(null)),
  },
  isSuccessResponse: res => res?.type === 'success',
  isErrorWithCode: err => typeof err?.code === 'string',
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
    SIGN_IN_REQUIRED: 'SIGN_IN_REQUIRED',
    NULL_PRESENTER: 'NULL_PRESENTER',
  },
}));
