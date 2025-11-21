import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  integrations: [tailwind()],
  adapter: node({ mode: 'standalone' }),
  site: 'https://trust.teei.io',
  build: {
    format: 'directory',
  },
  server: {
    port: 4322,
    host: true,
  },
  vite: {
    build: {
      sourcemap: true,
    },
  },
  compressHTML: true,
  scopedStyleStrategy: 'class',
});
