import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, mergeConfig } from 'vite';

import base from '../build-config/templates/vite/lib.vite.config';

import pkg from './package.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
        external: ['@reactive-kit/loader', 'ws'],
      },
    },
  }),
);
