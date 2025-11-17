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
          // Generate nonce for CSP
          const nonce = Buffer.from(Math.random().toString()).toString('base64').substring(0, 16);

          // Store nonce in response locals for use in templates
          res.locals = res.locals || {};
          res.locals.cspNonce = nonce;

          // Set CSP header with nonce
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

          // Trusted Types enforcement
          res.setHeader('Require-Trusted-Types-For', "'script'");
          res.setHeader('Trusted-Types', 'default dompurify');

          next();
        });
      },
    },
  };
}

// https://astro.build/config
export default defineConfig({
  output: 'server',
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
    locales: ['en', 'es', 'fr', 'uk', 'no'],
    routing: {
      prefixDefaultLocale: false,
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
      },
    },
  },
});
