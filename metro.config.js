const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * Adds `react-native-svg-transformer`, so an `.svg` file can be imported as a
 * component rather than pasted into the codebase as JSX.
 *
 * The two lists have to move together and in opposite directions: Metro treats
 * a file as an ASSET (copied, referenced by uri) or as SOURCE (transformed,
 * imported). An svg has to stop being the first to become the second, so it is
 * removed from `assetExts` and added to `sourceExts`. Leave it in both and
 * whichever resolver runs first wins, which is how this ends up working on one
 * machine and not the next.
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const defaults = getDefaultConfig(__dirname);

const config = {
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
  resolver: {
    assetExts: defaults.resolver.assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...defaults.resolver.sourceExts, 'svg'],
  },
};

module.exports = mergeConfig(defaults, config);
