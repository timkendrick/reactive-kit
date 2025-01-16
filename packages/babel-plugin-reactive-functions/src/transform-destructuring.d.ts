declare module '@babel/plugin-transform-destructuring' {
  import type { BabelPlugin, PluginPass } from '@reactive-kit/babel-types';
  const transform: BabelPlugin<PluginPass, { useBuiltIns: boolean }>;
  export default transform;
}
