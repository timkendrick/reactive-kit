import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, mergeConfig } from 'vite';

import base from '../../packages/build-config/templates/vite/lib.vite.config';

import pkg from './package.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default mergeConfig(
  base,
  defineConfig({
    build: {
      lib: {
        entry: {
          lib: resolve(__dirname, pkg.module),
          effects: resolve(__dirname, './effects.lib.ts'),
          handlers: resolve(__dirname, './handlers.lib.ts'),
          hooks: resolve(__dirname, './hooks.lib.ts'),
          messages: resolve(__dirname, './messages.lib.ts'),
        },
        name: pkg.name,
        formats: ['es', 'cjs'],
        fileName: (format, entry) => `lib/${entry}${format === 'cjs' ? '.cjs' : '.js'}`,
      },
    },
  }),
);
