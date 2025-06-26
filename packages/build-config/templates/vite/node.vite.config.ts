import { builtinModules } from 'node:module';

import { defineConfig, mergeConfig } from 'vite';

import base from './base.vite.config';

export default mergeConfig(
  base,
  defineConfig({
    build: {
      rollupOptions: {
        external: [...builtinModules, /^node:/],
      },
    },
  }),
);
