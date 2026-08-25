module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    /**
     * Off, deliberately.
     *
     * The rule exists to stop style objects being rebuilt on every render. Every
     * colour in this app comes from `useTheme()` and flips with the system colour
     * scheme, so it cannot live in a module-level `StyleSheet.create` — hoisting
     * would mean either a hardcoded palette or a factory per component, both of
     * which cost more than they save.
     *
     * Static, theme-independent geometry still belongs in a StyleSheet, and the
     * layout primitives in `src/components/Layout.tsx` exist so most screens
     * never write one by hand.
     */
    'react-native/no-inline-styles': 'off',
  },
};
