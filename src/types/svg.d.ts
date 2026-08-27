/**
 * `.svg` imports, once Metro is running them through
 * react-native-svg-transformer.
 *
 * Needed separately from the Metro config because the two are told separately:
 * without this TypeScript sees an import of a file it knows nothing about and
 * fails a build the bundler would have handled fine.
 */
declare module '*.svg' {
  import type React from 'react';
  import type { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}
