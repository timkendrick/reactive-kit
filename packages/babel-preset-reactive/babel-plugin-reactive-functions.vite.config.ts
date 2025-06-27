import { resolve } from 'path';

import { defineConfig, mergeConfig } from 'vite';

import pkg from '../babel-plugin-reactive-functions/package.json' with { type: 'json' };
import base from '../babel-plugin-reactive-functions/vite.config.ts';

export default mergeConfig(
  base,
  defineConfig({
    build: {
      outDir: resolve(__dirname, 'dist', 'node_modules', pkg.name),
    },
  }),
);
