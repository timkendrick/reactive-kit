import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vite';

import base from '../../packages/build-config/templates/vite/lib.vite.config';

import pkg from './package.json' assert { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default mergeConfig(
  base,
  defineConfig({
    build: {
      lib: {
        entry: resolve(__dirname, pkg.module),
        name: pkg.name,
        formats: ['es', 'cjs'],
        fileName: 'lib/lib',
      },
    },
  }),
);
