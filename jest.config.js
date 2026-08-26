/**
 * Jest configuration.
 *
 * `transformIgnorePatterns` has to name every dependency that ships untranspiled
 * ESM — Jest does not transform anything under node_modules by default, and each
 * of these publishes `export` syntax that Node cannot parse on its own.
 */
module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // Everything under `__tests__` is a suite by default, which makes the shared
  // API stub in `fixtures/` fail as a test file containing no tests.
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/__tests__/fixtures/'],
  transformIgnorePatterns: [
    'node_modules/(?!(?:@react-native|react-native|@react-navigation|react-native-svg|react-native-screens|react-native-safe-area-context)/)',
  ],
};
