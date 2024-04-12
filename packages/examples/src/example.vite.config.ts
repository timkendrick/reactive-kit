import { babel } from '@rollup/plugin-babel';
import { defineConfig, mergeConfig } from 'vite';

import base from '../../build-config/templates/vite/base.vite.config';

export default mergeConfig(
  base,
  defineConfig({
    esbuild: {
      jsx: 'preserve',
    },
    plugins: [
      babel({
        presets: ['@reactive-kit/babel-preset-reactive'],
        ignore: [/\bnode_modules\b/],
        babelHelpers: 'bundled',
      }),
    ],
  }),
);
