import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, mergeConfig } from 'vitest/config';

import base from './vite.config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default mergeConfig(
  base,
  defineConfig({
    test: {
      root: resolve(__dirname, '..', '..'),
      include: [join(__dirname, '**/*.{test,spec}.?(c|m)[jt]s?(x)')],
    },
  }),
);
