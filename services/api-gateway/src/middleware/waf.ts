import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyRateLimit from '@fastify/rate-limit';

/**
 * Web Application Firewall (WAF) Middleware
 *
 * Implements:
 * - Advanced rate limiting (per IP, per user, per endpoint)
 * - Request payload size validation
 * - Suspicious pattern detection
 * - Request header validation
 * - Basic DDoS protection
 *
 * For production, consider using Cloudflare, AWS WAF, or similar
 * This provides application-level protection
 */

export interface WAFConfig {
  enabled: boolean;
  rateLimits: {
    global: {
      max: number;
      timeWindow: string;
    };
    authenticated: {
      max: number;
      timeWindow: string;
    };
    api: {
      max: number;
      timeWindow: string;
    };
    auth: {
      max: number;
      timeWindow: string;
    };
  };
  payloadLimits: {
    json: number;      // Max JSON body size in bytes
    multipart: number; // Max file upload size
    urlencoded: number;
  };
  blocklist: {
    ips: string[];
    userAgents: string[];
  };
  suspiciousPatterns: {
    enabled: boolean;
    blockOnMatch: boolean;
  };
}

/**
 * Default WAF configuration
 */
export const defaultWAFConfig: WAFConfig = {
  enabled: true,
  rateLimits: {
    global: {
      max: 100,           // 100 requests
      timeWindow: '1 minute'
    },
    authenticated: {
      max: 500,           // Higher limit for authenticated users
      timeWindow: '1 minute'
    },
    api: {
      max: 1000,          // High throughput for API endpoints
      timeWindow: '1 minute'
    },
    auth: {
      max: 10,            // Strict limit for auth endpoints (brute force protection)
      timeWindow: '1 minute'
    }
  },
  payloadLimits: {
    json: 1024 * 1024,           // 1 MB
    multipart: 10 * 1024 * 1024, // 10 MB for file uploads
    urlencoded: 100 * 1024       // 100 KB
  },
  blocklist: {
    ips: [],
    userAgents: [
      'sqlmap',
      'nikto',
      'masscan',
      'nmap',
      'scrapy'
    ]
  },
  suspiciousPatterns: {
    enabled: true,
    blockOnMatch: false  // Log only by default
  }
};

/**
 * Load WAF config from environment
 */
export function loadWAFConfig(): WAFConfig {
  const config = { ...defaultWAFConfig };

  // Override from environment
  if (process.env.WAF_ENABLED === 'false') {
    config.enabled = false;
  }

  if (process.env.WAF_RATE_LIMIT_GLOBAL) {
    config.rateLimits.global.max = parseInt(process.env.WAF_RATE_LIMIT_GLOBAL, 10);
  }

  if (process.env.WAF_PAYLOAD_JSON_MAX) {
    config.payloadLimits.json = parseInt(process.env.WAF_PAYLOAD_JSON_MAX, 10);
  }

  if (process.env.WAF_BLOCKLIST_IPS) {
    config.blocklist.ips = process.env.WAF_BLOCKLIST_IPS.split(',').map(ip => ip.trim());
  }

  return config;
}

/**
 * SQL Injection pattern detection
 */
const SQL_INJECTION_PATTERNS = [
  /(\bUNION\b.*\bSELECT\b)/i,
  /(\bOR\b\s+\d+\s*=\s*\d+)/i,
  /(\bAND\b\s+\d+\s*=\s*\d+)/i,
  /(';?\s*DROP\s+TABLE)/i,
  /(';?\s*DELETE\s+FROM)/i,
  /(\bEXEC\b\s*\()/i,
  /(<script[^>]*>.*?<\/script>)/i,
];

/**
 * XSS pattern detection
 */
const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/i,
  /javascript:/i,
  /on\w+\s*=/i,  // Event handlers like onclick=
  /<iframe[^>]*>/i,
  /<object[^>]*>/i,
  /<embed[^>]*>/i,
];

/**
 * Path traversal detection
 */
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//,
  /\.\.\\/,
  /%2e%2e%2f/i,
  /%2e%2e%5c/i,
];

/**
 * Check if request contains suspicious patterns
 */
export function detectSuspiciousPatterns(request: FastifyRequest): {
  detected: boolean;
  patterns: string[];
} {
  const patterns: string[] = [];

  // Check URL
  const url = request.url;
  if (SQL_INJECTION_PATTERNS.some(p => p.test(url))) {
    patterns.push('SQL Injection in URL');
  }
  if (XSS_PATTERNS.some(p => p.test(url))) {
    patterns.push('XSS in URL');
  }
  if (PATH_TRAVERSAL_PATTERNS.some(p => p.test(url))) {
    patterns.push('Path Traversal in URL');
  }

  // Check headers
  const userAgent = request.headers['user-agent'] || '';
  if (XSS_PATTERNS.some(p => p.test(userAgent))) {
    patterns.push('XSS in User-Agent');
  }

  // Check body (if available)
  const body = request.body;
  if (body && typeof body === 'object') {
    const bodyStr = JSON.stringify(body);
    if (SQL_INJECTION_PATTERNS.some(p => p.test(bodyStr))) {
      patterns.push('SQL Injection in Body');
    }
    if (XSS_PATTERNS.some(p => p.test(bodyStr))) {
      patterns.push('XSS in Body');
    }
  }

  return {
    detected: patterns.length > 0,
    patterns
  };
}

/**
 * IP blocklist middleware
 */
export function createBlocklistMiddleware(config: WAFConfig) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const clientIp = request.ip;
    const userAgent = request.headers['user-agent'] || '';

    // Check IP blocklist
    if (config.blocklist.ips.some(ip => clientIp.includes(ip))) {
      request.log.warn({ ip: clientIp }, 'Blocked IP address');
      return reply.status(403).send({
        success: false,
        error: 'Forbidden',
        message: 'Access denied'
      });
    }

    // Check User-Agent blocklist
    if (config.blocklist.userAgents.some(ua => userAgent.toLowerCase().includes(ua.toLowerCase()))) {
      request.log.warn({ userAgent }, 'Blocked User-Agent');
      return reply.status(403).send({
        success: false,
        error: 'Forbidden',
        message: 'Access denied'
      });
    }
  };
}

/**
 * Suspicious pattern detection middleware
 */
export function createPatternDetectionMiddleware(config: WAFConfig) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!config.suspiciousPatterns.enabled) {
      return;
    }

    const result = detectSuspiciousPatterns(request);

    if (result.detected) {
      request.log.warn({
        ip: request.ip,
        url: request.url,
        patterns: result.patterns
      }, 'Suspicious patterns detected');

      if (config.suspiciousPatterns.blockOnMatch) {
        return reply.status(400).send({
          success: false,
          error: 'Bad Request',
          message: 'Suspicious request pattern detected'
        });
      }
    }
  };
}

/**
 * Payload size validation middleware
 */
export function createPayloadSizeMiddleware(config: WAFConfig) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const contentType = request.headers['content-type'] || '';
    const contentLength = parseInt(request.headers['content-length'] || '0', 10);

    if (contentLength === 0) {
      return; // No body
    }

    // Check JSON payload size
    if (contentType.includes('application/json')) {
      if (contentLength > config.payloadLimits.json) {
        return reply.status(413).send({
          success: false,
          error: 'Payload Too Large',
          message: `JSON payload exceeds limit of ${config.payloadLimits.json} bytes`
        });
      }
    }

    // Check multipart payload size
    if (contentType.includes('multipart/form-data')) {
      if (contentLength > config.payloadLimits.multipart) {
        return reply.status(413).send({
          success: false,
          error: 'Payload Too Large',
          message: `File upload exceeds limit of ${config.payloadLimits.multipart} bytes`
        });
      }
    }

    // Check URL encoded payload size
    if (contentType.includes('application/x-www-form-urlencoded')) {
      if (contentLength > config.payloadLimits.urlencoded) {
        return reply.status(413).send({
          success: false,
          error: 'Payload Too Large',
          message: `Form data exceeds limit of ${config.payloadLimits.urlencoded} bytes`
        });
      }
    }
  };
}

/**
 * Rate limit key generator
 * Uses user ID for authenticated requests, IP for anonymous
 */
function rateLimitKeyGenerator(request: FastifyRequest): string {
  const user = (request as any).user;
  if (user && user.userId) {
    return `user:${user.userId}`;
  }
  return `ip:${request.ip}`;
}

/**
 * Register WAF middleware on Fastify instance
 */
export async function registerWAF(app: FastifyInstance): Promise<void> {
  const config = loadWAFConfig();

  if (!config.enabled) {
    console.log('⚠️  WAF disabled');
    return;
  }

  // 1. Register global rate limiting
  await app.register(fastifyRateLimit, {
    max: config.rateLimits.global.max,
    timeWindow: config.rateLimits.global.timeWindow,
    cache: 10000,
    allowList: ['127.0.0.1'],
    redis: process.env.REDIS_URL ? { url: process.env.REDIS_URL } : undefined,
    skipOnError: true,
    keyGenerator: rateLimitKeyGenerator,
    errorResponseBuilder: (request, context) => {
      return {
        success: false,
        error: 'Rate Limit Exceeded',
        message: `Too many requests. Please try again in ${Math.ceil(context.after / 1000)} seconds.`,
        retryAfter: context.after
      };
    }
  });

  // 2. Register blocklist middleware
  app.addHook('onRequest', createBlocklistMiddleware(config));

  // 3. Register payload size validation
  app.addHook('onRequest', createPayloadSizeMiddleware(config));

  // 4. Register pattern detection (after body parsing)
  app.addHook('preHandler', createPatternDetectionMiddleware(config));

  // 5. Security headers
  app.addHook('onRequest', async (request, reply) => {
    // Prevent clickjacking
    reply.header('X-Frame-Options', 'DENY');

    // Prevent MIME sniffing
    reply.header('X-Content-Type-Options', 'nosniff');

    // XSS Protection (legacy but still useful)
    reply.header('X-XSS-Protection', '1; mode=block');

    // Referrer policy
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Content Security Policy (strict)
    reply.header(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';"
    );

    // Permissions policy
    reply.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  });

  console.log('✅ WAF middleware enabled:');
  console.log(`   - Rate limit: ${config.rateLimits.global.max} req/${config.rateLimits.global.timeWindow}`);
  console.log(`   - JSON payload limit: ${config.payloadLimits.json} bytes`);
  console.log(`   - Multipart limit: ${config.payloadLimits.multipart} bytes`);
  console.log(`   - Blocklist: ${config.blocklist.ips.length} IPs, ${config.blocklist.userAgents.length} User-Agents`);
  console.log(`   - Pattern detection: ${config.suspiciousPatterns.enabled ? 'enabled' : 'disabled'}`);
  console.log('   - Security headers: enabled');
}

/**
 * Create route-specific rate limiter
 * Usage: app.register(createRouteRateLimit(10, '1 minute'))
 */
export function createRouteRateLimit(max: number, timeWindow: string) {
  return async (app: FastifyInstance) => {
    await app.register(fastifyRateLimit, {
      max,
      timeWindow,
      keyGenerator: rateLimitKeyGenerator,
      errorResponseBuilder: (request, context) => {
        return {
          success: false,
          error: 'Rate Limit Exceeded',
          message: `Too many requests to this endpoint. Try again in ${Math.ceil(context.after / 1000)}s.`,
          retryAfter: context.after
        };
      }
    });
  };
}
