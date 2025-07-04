import { resolve } from 'node:path';

import { defineConfig, mergeConfig } from 'vite';

import base from '../build-config/templates/vite/cli.vite.config';

import pkg from './package.json' with { type: 'json' };

export default mergeConfig(
  base,
  defineConfig({
    build: {
      lib: {
        entry: resolve(__dirname, pkg.main),
        name: pkg.name,
        formats: ['cjs'],
        fileName: 'index',
      },
      rollupOptions: {
        external: ['@reactive-kit/loader'],
      },
    },
  }),
);
