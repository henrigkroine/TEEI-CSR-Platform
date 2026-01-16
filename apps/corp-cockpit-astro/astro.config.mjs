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
      rollupOptions: {
        output: {
          // Add integrity hashes for chunks
          entryFileNames: '[name].[hash].js',
          chunkFileNames: '[name].[hash].js',
          assetFileNames: '[name].[hash][extname]',
          // Manual chunking strategy for better code splitting
          manualChunks: (id) => {
            // Vendor chunks
            if (id.includes('node_modules')) {
              // React and core libraries
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor-react';
              }
              // Chart libraries (heavy, lazy load)
              if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
                return 'vendor-charts';
              }
              // Tanstack Query
              if (id.includes('@tanstack/react-query')) {
                return 'vendor-query';
              }
              // Web Vitals (small, can be separate)
              if (id.includes('web-vitals')) {
                return 'vendor-web-vitals';
              }
              // Everything else
              return 'vendor-shared';
            }

            // Component-based chunks
            if (id.includes('/src/components/')) {
              // Dashboard components
              if (id.includes('/components/dashboard/')) {
                return 'components-dashboard';
              }
              // Reports components
              if (id.includes('/components/reports/')) {
                return 'components-reports';
              }
              // Benchmarks components
              if (id.includes('/components/benchmarks/')) {
                return 'components-benchmarks';
              }
              // Shared components
              return 'components-shared';
            }

            // A11y and telemetry (load on demand)
            if (id.includes('/src/a11y/')) {
              return 'a11y';
            }
            if (id.includes('/src/telemetry/')) {
              return 'telemetry';
            }

            // Utils and lib
            if (id.includes('/src/utils/') || id.includes('/src/lib/')) {
              return 'utils';
            }
          },
        },
      },
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
