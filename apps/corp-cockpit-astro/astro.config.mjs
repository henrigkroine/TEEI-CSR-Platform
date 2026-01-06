import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';

// CSP nonce injection middleware for Astro
function cspIntegration() {
  return {
    name: 'csp-nonce-injection',
    hooks: {
      'astro:server:setup': ({ server }) => {
        server.middlewares.use((req, res, next) => {
          // Skip CSP headers for Vite internal routes (breaks hydration if headers are added)
          if (req.url?.startsWith('/@') || req.url?.startsWith('/node_modules/')) {
            return next();
          }

          // Generate nonce for CSP
          const nonce = Buffer.from(Math.random().toString()).toString('base64').substring(0, 16);

          // Store nonce in response locals for use in templates
          res.locals = res.locals || {};
          res.locals.cspNonce = nonce;

          // Check if we're in development mode
          const isDev = process.env.NODE_ENV !== 'production';

          // In dev mode, use permissive CSP to allow Vite HMR and React hydration
          // In production, use strict CSP with nonces
          if (isDev) {
            res.setHeader('Content-Security-Policy', [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' ws://localhost:* http://localhost:* https://fonts.googleapis.com https://fonts.gstatic.com",
              "frame-src 'none'",
              "object-src 'none'",
            ].join('; '));
            return next();
          }

          // Production: Set CSP header with nonce
          const cspDirectives = [
            "default-src 'self'",
            `script-src 'nonce-${nonce}' 'strict-dynamic' https:`,
            `style-src 'nonce-${nonce}' 'self'`,
            "img-src 'self' data: blob: https:",
            "font-src 'self' data:",
            "connect-src 'self' https://api.teei-platform.com wss://api.teei-platform.com",
            "frame-src 'none'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
            "upgrade-insecure-requests",
            "block-all-mixed-content",
          ];

          res.setHeader('Content-Security-Policy', cspDirectives.join('; '));

          // Additional security headers
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('X-Frame-Options', 'DENY');
          res.setHeader('X-XSS-Protection', '1; mode=block');
          res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
          res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

          // Trusted Types enforcement (production only - breaks React hydration in dev)
          if (!isDev) {
            res.setHeader('Require-Trusted-Types-For', "'script'");
            res.setHeader('Trusted-Types', 'default dompurify');
          }

          next();
        });
      },
    },
  };
}

// https://astro.build/config
export default defineConfig({
  site: undefined, // Don't set site URL to prevent automatic redirects
  output: 'server',
  server: { port: 4327 },
  adapter: node({
    mode: 'standalone',
  }),
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
    cspIntegration(),
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
