/**
 * ETag Middleware for Conditional Requests
 *
 * Implements HTTP caching with ETag support:
 * - Generates ETags based on response content hash
 * - Returns 304 Not Modified when content unchanged
 * - Reduces bandwidth and improves performance
 *
 * @module middleware/etag
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { createHash } from 'crypto';

/**
 * Generate ETag from content
 */
export function generateETag(content: string | Buffer): string {
  const hash = createHash('md5').update(content).digest('hex');
  return `"${hash}"`;
}

/**
 * Check if ETag matches
 */
export function isETagMatch(etag: string, ifNoneMatch?: string): boolean {
  if (!ifNoneMatch) {
    return false;
  }

  // Handle multiple ETags in If-None-Match header
  const etags = ifNoneMatch.split(',').map((tag) => tag.trim());
  return etags.includes(etag) || etags.includes('*');
}

/**
 * ETag middleware hook
 *
 * Automatically adds ETag headers and handles 304 responses
 *
 * Usage:
 * fastify.addHook('onSend', etagHook);
 */
export async function etagHook(
  request: FastifyRequest,
  reply: FastifyReply,
  payload: unknown
): Promise<unknown> {
  // Only apply to GET requests
  if (request.method !== 'GET') {
    return payload;
  }

  // Skip if already has ETag header
  if (reply.getHeader('etag')) {
    return payload;
  }

  // Skip for SSE streams
  const contentType = reply.getHeader('content-type');
  if (contentType === 'text/event-stream') {
    return payload;
  }

  // Generate ETag from payload
  const content = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const etag = generateETag(content);

  // Set ETag header
  reply.header('ETag', etag);

  // Check If-None-Match header
  const ifNoneMatch = request.headers['if-none-match'];
  if (isETagMatch(etag, ifNoneMatch)) {
    // Content hasn't changed, return 304
    reply.code(304);
    return ''; // Empty response body for 304
  }

  return payload;
}

/**
 * Manual ETag checking for custom routes
 */
export function checkETag(
  request: FastifyRequest,
  reply: FastifyReply,
  data: unknown
): boolean {
  const content = typeof data === 'string' ? data : JSON.stringify(data);
  const etag = generateETag(content);

  reply.header('ETag', etag);

  const ifNoneMatch = request.headers['if-none-match'];
  if (isETagMatch(etag, ifNoneMatch)) {
    reply.code(304).send();
    return true; // ETag matched, 304 sent
  }

  return false; // ETag didn't match, send full response
}

/**
 * Cache-Control headers for different scenarios
 */
export const CACHE_CONTROL = {
  /** No caching (for sensitive data) */
  NO_CACHE: 'no-store, no-cache, must-revalidate, proxy-revalidate',

  /** Cache with revalidation (for dynamic data) */
  REVALIDATE: 'public, max-age=0, must-revalidate',

  /** Short cache (5 minutes, for frequently updated data) */
  SHORT: 'public, max-age=300, stale-while-revalidate=60',

  /** Medium cache (1 hour, for semi-static data) */
  MEDIUM: 'public, max-age=3600, stale-while-revalidate=600',

  /** Long cache (24 hours, for static data) */
  LONG: 'public, max-age=86400, stale-while-revalidate=3600',

  /** Immutable (for versioned assets) */
  IMMUTABLE: 'public, max-age=31536000, immutable',
} as const;

/**
 * Set cache headers based on data type
 */
export function setCacheHeaders(
  reply: FastifyReply,
  cacheType: keyof typeof CACHE_CONTROL
): void {
  reply.header('Cache-Control', CACHE_CONTROL[cacheType]);
}

/**
 * Plugin to register ETag middleware
 */
export async function etagPlugin(fastify: any) {
  fastify.addHook('onSend', etagHook);
}
