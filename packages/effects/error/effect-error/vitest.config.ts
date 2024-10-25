import { join, resolve } from 'node:path';
import { defineConfig, mergeConfig } from 'vitest/config';

import base from './vite.config';

export default mergeConfig(
  base,
  defineConfig({
    test: {
      root: resolve(__dirname, '..', '..'),
      include: [join(__dirname, '**/*.{test,spec}.?(c|m)[jt]s?(x)')],
    },
  }),
);
