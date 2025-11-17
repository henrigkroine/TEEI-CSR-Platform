import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'server',
  server: {
    port: 4322,
    host: true
  },
  vite: {
    ssr: {
      noExternal: ['@teei/shared-types']
    }
  }
});
