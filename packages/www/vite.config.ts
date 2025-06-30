import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, mergeConfig } from 'vite';

import base from '../build-config/templates/vite/lib.vite.config';

import pkg from './package.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default mergeConfig(
  base,
  defineConfig({
    plugins: [tailwindcss(), react()],
    build: {
      lib: {
        entry: resolve(__dirname, pkg.module),
        name: pkg.name,
        formats: ['es', 'cjs'],
        fileName: 'lib/lib',
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
  }),
);
