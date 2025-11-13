import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  integrations: [
    react({
      include: ['**/react/*', '**/components/**/*.tsx'],
    }),
  ],
  server: {
    port: 4321,
    host: true,
  },
  vite: {
    ssr: {
      noExternal: ['@astrojs/react'],
    },
  },
});
