import { resolve } from 'node:path';

import { defineConfig, mergeConfig } from 'vite';

import pkg from '../loader/package.json' with { type: 'json' };
import base from '../loader/vite.config.ts';

export default mergeConfig(
  base,
  defineConfig({
    build: {
      outDir: resolve(__dirname, 'dist', 'node_modules', pkg.name),
    },
  }),
);
