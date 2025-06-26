import react from '@vitejs/plugin-react-swc';
import { defineConfig, mergeConfig } from 'vite';

import base from './base.vite.config';

export default mergeConfig(
  base,
  defineConfig({
    plugins: [react()],
  }),
);
