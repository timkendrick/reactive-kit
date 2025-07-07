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
          effects: resolve(__dirname, './effects.ts'),
          handlers: resolve(__dirname, './handlers.ts'),
          hooks: resolve(__dirname, './hooks.ts'),
          messages: resolve(__dirname, './messages.ts'),
          middleware: resolve(__dirname, './middleware.ts'),
          mocks: resolve(__dirname, './mocks.ts'),
          tasks: resolve(__dirname, './tasks.ts'),
          types: resolve(__dirname, './types.ts'),
        },
        name: pkg.name,
        formats: ['es', 'cjs'],
        fileName: (format, entry) => `lib/${entry}${format === 'cjs' ? '.cjs' : '.js'}`,
      },
    },
  }),
);
