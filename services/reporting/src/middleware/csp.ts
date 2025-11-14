import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { randomBytes } from 'crypto';

// Generate a cryptographically secure nonce
export function generateNonce(): string {
  return randomBytes(16).toString('base64');
}

// Build CSP header with nonce-based inline script support
export function buildCSPHeader(nonce: string): string {
  const directives = [
    // Default: only allow same-origin resources
    "default-src 'self'",

    // Scripts: nonce-based + strict-dynamic for modern browsers
    // strict-dynamic allows dynamically loaded scripts from nonce-allowed scripts
    `script-src 'nonce-${nonce}' 'strict-dynamic' https:`,

    // Styles: nonce-based (no unsafe-inline)
    `style-src 'nonce-${nonce}' 'self'`,

    // Images: self + data URIs + blob (for charts/generated images)
    "img-src 'self' data: blob: https:",

    // Fonts: self + data URIs
    "font-src 'self' data:",

    // Connect: self + allow API endpoints
    "connect-src 'self' https://api.teei-platform.com wss://api.teei-platform.com",

    // Frame: disallow all iframes (clickjacking protection)
    "frame-src 'none'",

    // Object: no plugins (Flash, Java, etc.)
    "object-src 'none'",

    // Base: prevent base tag injection
    "base-uri 'self'",

    // Form: only allow form submissions to self
    "form-action 'self'",

    // Frame ancestors: prevent embedding in iframes (additional clickjacking protection)
    "frame-ancestors 'none'",

    // Upgrade insecure requests: force HTTPS
    "upgrade-insecure-requests",

    // Block mixed content
    "block-all-mixed-content",

    // Report violations to our endpoint
    "report-uri /api/csp-report",
    "report-to csp-endpoint",
  ];

  return directives.join('; ');
}

// CSP middleware plugin for Fastify
export const cspMiddleware: FastifyPluginAsync = async (fastify) => {
  // Add nonce to request object
  fastify.decorateRequest('cspNonce', '');

  // Add preHandler hook to generate nonce and set CSP header
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const nonce = generateNonce();

    // Store nonce in request for use in templates
    (request as any).cspNonce = nonce;

    // Set CSP header
    const cspHeader = buildCSPHeader(nonce);
    reply.header('Content-Security-Policy', cspHeader);

    // Set Report-To header for CSP violation reporting
    reply.header('Report-To', JSON.stringify({
      group: 'csp-endpoint',
      max_age: 10886400, // 126 days
      endpoints: [{ url: '/api/csp-report' }],
    }));

    // Additional security headers
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-XSS-Protection', '1; mode=block');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // Trusted Types enforcement (browsers that support it)
    reply.header('Require-Trusted-Types-For', "'script'");
    reply.header('Trusted-Types', 'default dompurify');
  });
};

// Helper to get nonce from request (for use in route handlers)
export function getNonce(request: FastifyRequest): string {
  return (request as any).cspNonce || '';
}
