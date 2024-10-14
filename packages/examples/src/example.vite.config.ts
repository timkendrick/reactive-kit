import { babel } from '@rollup/plugin-babel';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig, Plugin, PluginOption } from 'vite';

import base from '../../build-config/templates/vite/base.vite.config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const INDEX_HTML_TEMPLATE = resolve(__dirname, './example.index.html');

const template = readFileSync(INDEX_HTML_TEMPLATE, 'utf-8');

export default mergeConfig(
  base,
  defineConfig({
    esbuild: {
      jsx: 'preserve',
    },
    build: {
      rollupOptions: {
        input: resolve(__dirname, './example.index.html'),
      },
    },
    plugins: [
      {
        name: 'index-html-template',
        apply: 'serve',
        configureServer(server): void {
          server.middlewares.use((req, res, next) => {
            if (req.url === '/') {
              res.setHeader('Content-Type', 'text/html');
              res.write(template, () => {
                res.end();
              });
            } else {
              next();
            }
          });
        },
      },
      babel({
        presets: ['@reactive-kit/babel-preset-reactive'],
        ignore: [/\bnode_modules\b/],
        babelHelpers: 'bundled',
      }),
    ],
  }),
);
