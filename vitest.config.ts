import { defineConfig, mergeConfig } from 'vitest/config';

import base from './packages/build-config/templates/vite/base.vite.config';

export default mergeConfig(
  base,
  defineConfig({
    test: {
      projects: ['packages/*/vitest.config.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['lcovonly', 'text'],
        exclude: ['**__fixtures__/**'],
      },
    },
  }),
);
