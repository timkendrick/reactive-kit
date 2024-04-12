import { resolve } from 'path';
import { defineConfig, mergeConfig } from 'vite';

import base from '../babel-plugin-reactive-jsx/vite.config.ts';

import pkg from '../babel-plugin-reactive-jsx/package.json' assert { type: 'json' };

export default mergeConfig(
  base,
  defineConfig({
    build: {
      outDir: resolve(__dirname, 'dist', 'node_modules', pkg.name),
    },
  }),
);
