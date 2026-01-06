/**
 * Cloudflare CDN Configuration
 *
 * Optimizes static asset delivery for TEEI CSR Platform:
 * - Caching strategies for different asset types
 * - Image optimization (WebP, AVIF, resizing)
 * - Minification and compression
 * - Security headers
 * - Performance monitoring
 *
 * Performance targets:
 * - Static asset cache hit rate > 95%
 * - Image load time < 200ms
 * - TTFB < 100ms (cached assets)
 *
 * @see https://developers.cloudflare.com/workers/
 */

/**
 * Cache configuration for different asset types
 */
export const CACHE_CONFIG = {
  // JavaScript bundles (immutable with content hash)
  scripts: {
    browserTTL: 31536000, // 1 year
    edgeTTL: 31536000,    // 1 year
    cacheEverything: true,
    pattern: /\.(js|mjs)$/,
  },

  // CSS stylesheets (immutable with content hash)
  styles: {
    browserTTL: 31536000, // 1 year
    edgeTTL: 31536000,    // 1 year
    cacheEverything: true,
    pattern: /\.css$/,
  },

  // Images (optimized with Cloudflare Images)
  images: {
    browserTTL: 2592000,  // 30 days
    edgeTTL: 2592000,     // 30 days
    polish: 'lossy',      // Image optimization
    mirage: true,         // Lazy loading
    pattern: /\.(jpg|jpeg|png|gif|webp|avif|svg)$/i,
  },

  // Fonts (woff2 for modern browsers)
  fonts: {
    browserTTL: 31536000, // 1 year
    edgeTTL: 31536000,    // 1 year
    cacheEverything: true,
    pattern: /\.(woff|woff2|ttf|eot)$/,
  },

  // HTML pages (short cache with revalidation)
  html: {
    browserTTL: 0,        // No browser cache
    edgeTTL: 300,         // 5 minutes edge cache
    bypassOnCookie: true, // Bypass cache for authenticated users
    pattern: /\.html?$/,
  },

  // API responses (no cache, use Redis instead)
  api: {
    browserTTL: 0,
    edgeTTL: 0,
    cacheLevel: 'bypass',
    pattern: /^\/api\//,
  },

  // Service Worker (must always be fresh)
  serviceWorker: {
    browserTTL: 0,
    edgeTTL: 0,
    cacheLevel: 'bypass',
    pattern: /sw\.js$/,
  },
};

/**
 * Cloudflare Workers script for custom caching and optimization
 */
export const CLOUDFLARE_WORKER = `
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

/**
 * Handle incoming request
 */
async function handleRequest(request) {
  const url = new URL(request.url);

  // Bypass cache for authenticated users
  if (request.headers.get('Cookie')?.includes('auth_token')) {
    return fetch(request, { cf: { cacheTTL: 0 } });
  }

  // Apply caching rules based on asset type
  const cacheConfig = getCacheConfig(url.pathname);
  if (cacheConfig) {
    // Clone request with cache config
    const cachedRequest = new Request(request, {
      cf: {
        cacheTTL: cacheConfig.edgeTTL,
        cacheEverything: cacheConfig.cacheEverything || false,
        polish: cacheConfig.polish || 'off',
        mirage: cacheConfig.mirage || false,
      },
    });

    // Try to get from cache
    const cache = caches.default;
    let response = await cache.match(cachedRequest);

    if (!response) {
      // Cache miss - fetch from origin
      response = await fetch(cachedRequest);

      // Clone response and add cache headers
      response = new Response(response.body, response);
      response.headers.set('Cache-Control', \`public, max-age=\${cacheConfig.browserTTL}\`);
      response.headers.set('X-Cache', 'MISS');
      response.headers.set('X-Cache-TTL', cacheConfig.edgeTTL.toString());

      // Store in cache
      event.waitUntil(cache.put(cachedRequest, response.clone()));
    } else {
      // Cache hit
      response = new Response(response.body, response);
      response.headers.set('X-Cache', 'HIT');
    }

    // Add security headers
    response = addSecurityHeaders(response);

    return response;
  }

  // Default: fetch without caching
  return fetch(request);
}

/**
 * Get cache configuration for pathname
 */
function getCacheConfig(pathname) {
  const configs = ${JSON.stringify(CACHE_CONFIG, null, 2)};

  for (const [name, config] of Object.entries(configs)) {
    if (config.pattern && new RegExp(config.pattern).test(pathname)) {
      return config;
    }
  }

  return null;
}

/**
 * Add security headers to response
 */
function addSecurityHeaders(response) {
  const headers = new Headers(response.headers);

  // Security headers
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'SAMEORIGIN');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Content Security Policy (adjust for your needs)
  headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.teei.io;"
  );

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
`;

/**
 * Image optimization rules
 */
export const IMAGE_OPTIMIZATION = {
  // Automatic format conversion
  autoFormat: true, // Convert to WebP/AVIF when supported

  // Quality settings
  quality: {
    default: 85,
    thumbnail: 75,
    hero: 90,
  },

  // Responsive image breakpoints
  breakpoints: [320, 640, 768, 1024, 1280, 1536],

  // Lazy loading configuration
  lazyLoading: {
    enabled: true,
    rootMargin: '50px',
    threshold: 0.01,
  },

  // Image CDN base URL
  cdnUrl: 'https://cdn.teei.io/images',
};

/**
 * Purge cache rules
 */
export const CACHE_PURGE_RULES = {
  // Purge on deployment
  onDeploy: [
    '*.js',
    '*.css',
    '*.html',
  ],

  // Purge on data update
  onDataUpdate: [
    '/api/*',
    '/en/cockpit/*',
    '/uk/cockpit/*',
    '/no/cockpit/*',
  ],

  // Never purge (until deployment)
  immutable: [
    '/assets/*.js',
    '/assets/*.css',
    '/_astro/*',
  ],
};

/**
 * Performance monitoring via Cloudflare Analytics
 */
export const ANALYTICS_CONFIG = {
  // Web Analytics (privacy-friendly)
  webAnalytics: {
    enabled: true,
    token: process.env.CLOUDFLARE_WEB_ANALYTICS_TOKEN,
  },

  // Performance monitoring
  performanceMonitoring: {
    enabled: true,
    sampleRate: 1.0, // Monitor 100% of requests
  },

  // Custom metrics
  customMetrics: [
    'cache_hit_rate',
    'image_optimization_ratio',
    'ttfb_p95',
    'bandwidth_saved',
  ],
};

/**
 * Rate limiting configuration
 */
export const RATE_LIMITING = {
  // API endpoints
  api: {
    requestsPerMinute: 100,
    burstSize: 20,
  },

  // Authentication endpoints
  auth: {
    requestsPerMinute: 10,
    burstSize: 3,
  },

  // Static assets (no limit)
  static: {
    enabled: false,
  },
};

/**
 * Cloudflare Page Rules
 */
export const PAGE_RULES = [
  {
    url: '*/api/*',
    settings: {
      cache_level: 'bypass',
      disable_performance: false,
      disable_security: false,
    },
  },
  {
    url: '*/sw.js',
    settings: {
      cache_level: 'bypass',
      browser_cache_ttl: 0,
    },
  },
  {
    url: '*/_astro/*',
    settings: {
      cache_level: 'cache_everything',
      edge_cache_ttl: 31536000, // 1 year
      browser_cache_ttl: 31536000,
    },
  },
  {
    url: '*/assets/*',
    settings: {
      cache_level: 'cache_everything',
      edge_cache_ttl: 31536000,
      browser_cache_ttl: 31536000,
    },
  },
];

/**
 * Deployment script for Cloudflare
 */
export const DEPLOYMENT_SCRIPT = \`
#!/bin/bash
# Deploy TEEI CSR Platform to Cloudflare Pages

set -e

echo "🚀 Deploying to Cloudflare Pages..."

# Build production bundle
pnpm run build

# Deploy to Cloudflare Pages
wrangler pages deploy ./apps/corp-cockpit-astro/dist \\
  --project-name=teei-csr-platform \\
  --branch=main \\
  --commit-message="Deploy \$(git rev-parse --short HEAD)"

# Purge cache for updated assets
curl -X POST "https://api.cloudflare.com/client/v4/zones/\${CLOUDFLARE_ZONE_ID}/purge_cache" \\
  -H "Authorization: Bearer \${CLOUDFLARE_API_TOKEN}" \\
  -H "Content-Type: application/json" \\
  --data '{"purge_everything": false, "files": ["*.js", "*.css", "*.html"]}'

echo "✅ Deployment complete!"
\`;

/**
 * DNS configuration
 */
export const DNS_CONFIG = {
  // Main domain
  domain: 'teei.io',

  // CDN subdomain
  cdn: 'cdn.teei.io',

  // API subdomain
  api: 'api.teei.io',

  // Proxied through Cloudflare
  proxied: true,

  // SSL/TLS mode
  ssl: 'full_strict',
};

/**
 * Export configuration for use in Astro
 */
export default {
  cache: CACHE_CONFIG,
  images: IMAGE_OPTIMIZATION,
  purge: CACHE_PURGE_RULES,
  analytics: ANALYTICS_CONFIG,
  rateLimit: RATE_LIMITING,
  pageRules: PAGE_RULES,
  dns: DNS_CONFIG,
};
