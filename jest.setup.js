/**
 * Test environment shims.
 *
 * Both of these are native modules with no JS fallback; without a mock the
 * renderer throws before any assertion in a component test can run.
 */
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 44, right: 0, bottom: 34, left: 0 };
  const React = require('react');
  return {
    SafeAreaProvider: ({ children }) => React.createElement(React.Fragment, null, children),
    SafeAreaConsumer: ({ children }) => children(inset),
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});

jest.mock('react-native-screens', () => ({
  enableScreens: jest.fn(),
  enableFreeze: jest.fn(),
  screensEnabled: () => false,
}));
