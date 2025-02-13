import { resolve } from 'path';
import { defineConfig, mergeConfig } from 'vite';

import base from '../loader/vite.config.ts';

import pkg from '../loader/package.json' assert { type: 'json' };

export default mergeConfig(
  base,
  defineConfig({
    build: {
      outDir: resolve(__dirname, 'dist', 'node_modules', pkg.name),
    },
  }),
);
