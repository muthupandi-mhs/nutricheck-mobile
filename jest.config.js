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
  transformIgnorePatterns: [
    'node_modules/(?!(?:@react-native|react-native|@react-navigation|react-native-svg|react-native-screens|react-native-safe-area-context)/)',
  ],
};
