import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

import viteConfig from './vite.config';

export default defineConfig({
  integrations: [tailwindcss(), react()],
  vite: {
    ...viteConfig,
    plugins: [tailwindcss()],
  },
});
