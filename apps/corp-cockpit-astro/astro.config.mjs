import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import cloudflare from '@astrojs/cloudflare';

// Note: CSP headers are now handled via Cloudflare's _headers file
// See public/_headers for production CSP configuration

// https://astro.build/config
export default defineConfig({
  site: 'https://cockpit.theeducationalequalityinstitute.org',
  output: 'server',
  server: { port: 6410 },
  adapter: cloudflare({
    platformProxy: {
      enabled: true, // Enable local D1/KV/R2 access during development
    },
  }),
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'no', 'uk'],
    routing: {
      prefixDefaultLocale: false, // Disable prefix to prevent /home redirect loop
    },
  },
  vite: {
    resolve: {
      alias: {
        '@': '/src',
        '@components': '/src/components',
        '@layouts': '/src/layouts',
        '@utils': '/src/utils',
        '@lib': '/src/lib',
        '@a11y': '/src/a11y',
        '@telemetry': '/src/telemetry',
      },
      // Prevent duplicate React copies (fixes "Invalid hook call" + dead buttons)
      dedupe: ['react', 'react-dom'],
    },
    build: {
      // Ensure CSP-compatible builds
      cssCodeSplit: true,
      // Route-level code splitting and performance optimizations
      rollupOptions: {},
      // Chunk size warnings
      chunkSizeWarningLimit: 500, // Warn if chunk > 500kb
      // Enable minification
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: process.env.NODE_ENV === 'production',
          drop_debugger: true,
        },
      },
    },
    // Optimize dependencies
    optimizeDeps: {
      include: ['react', 'react-dom', '@tanstack/react-query'],
      exclude: ['chart.js', 'react-chartjs-2'], // Lazy load heavy deps
    },
    // Performance hints
    performance: {
      hints: 'warning',
      maxEntrypointSize: 512000, // 500kb
      maxAssetSize: 256000, // 250kb
    },
  },
});
