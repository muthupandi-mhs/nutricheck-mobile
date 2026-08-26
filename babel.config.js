module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    /**
     * zod v4 ships `export * as core from '...'` in its ESM entry, and the RN
     * preset does not transform export-namespace syntax. Without this the
     * bundle fails on `zod/v4/classic/external.js` and the app never gets any
     * JS at all — a whole-app failure that reads like Metro being down.
     */
    '@babel/plugin-transform-export-namespace-from',
  ],
};
