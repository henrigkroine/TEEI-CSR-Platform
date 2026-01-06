/**
 * Data Residency Middleware for API Gateway
 *
 * Integrates with the data-residency service to enforce GDPR and regional data compliance.
 *
 * Features:
 * - Validates company data residency before routing requests
 * - Caches region mapping in Redis (TTL 5 minutes)
 * - Rejects requests if company's data region != current region (for strict GDPR)
 * - Adds X-Data-Region header to all responses
 *
 * Usage:
 * ```typescript
 * import { createResidencyMiddleware } from './middleware/residency.js';
 *
 * const residencyMiddleware = createResidencyMiddleware({
 *   residencyServiceUrl: 'http://teei-data-residency/api/residency',
 *   currentRegion: 'eu-central-1',
 *   cacheEnabled: true,
 *   cacheTTL: 300,
 * });
 *
 * app.addHook('onRequest', residencyMiddleware);
 * ```
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { createClient } from 'redis';
import type { RedisClientType } from 'redis';

export interface ResidencyMiddlewareConfig {
  residencyServiceUrl: string;
  currentRegion: string;
  cacheEnabled?: boolean;
  cacheTTL?: number; // in seconds
  redisUrl?: string;
  enforcement?: 'strict' | 'permissive';
}

export interface ResidencyValidationResponse {
  allowed: boolean;
  companyRegion: string;
  requestedRegion: string;
  residencyType: 'strict' | 'flexible';
  reason?: string;
}

export class ResidencyClient {
  private config: ResidencyMiddlewareConfig;
  private cache: RedisClientType | null = null;
  private cacheReady = false;

  constructor(config: ResidencyMiddlewareConfig) {
    this.config = {
      cacheEnabled: true,
      cacheTTL: 300,
      enforcement: 'strict',
      ...config,
    };

    if (this.config.cacheEnabled && this.config.redisUrl) {
      this.initCache();
    }
  }

  private async initCache() {
    try {
      this.cache = createClient({ url: this.config.redisUrl });
      this.cache.on('error', (err) => console.error('Residency Cache Error:', err));
      await this.cache.connect();
      this.cacheReady = true;
    } catch (error) {
      console.error('Failed to initialize residency cache:', error);
      this.cacheReady = false;
    }
  }

  /**
   * Get company region from cache
   */
  private async getCached(companyId: string): Promise<ResidencyValidationResponse | null> {
    if (!this.cacheReady || !this.cache) {
      return null;
    }

    try {
      const key = `api-gateway:residency:${companyId}`;
      const cached = await this.cache.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Cache get error:', error);
    }

    return null;
  }

  /**
   * Set company region in cache
   */
  private async setCached(companyId: string, data: ResidencyValidationResponse): Promise<void> {
    if (!this.cacheReady || !this.cache) {
      return;
    }

    try {
      const key = `api-gateway:residency:${companyId}`;
      const ttl = this.config.cacheTTL || 300;
      await this.cache.setEx(key, ttl, JSON.stringify(data));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Validate company residency
   */
  async validate(companyId: string, requestedRegion?: string): Promise<ResidencyValidationResponse> {
    const region = requestedRegion || this.config.currentRegion;

    // Check cache first
    const cached = await this.getCached(companyId);
    if (cached && cached.requestedRegion === region) {
      return cached;
    }

    // Call residency service
    try {
      const response = await fetch(`${this.config.residencyServiceUrl}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId,
          requestedRegion: region,
          operation: 'api-gateway-routing',
        }),
      });

      if (!response.ok) {
        // If service returns 403, it means residency violation
        if (response.status === 403) {
          const data = await response.json();
          await this.setCached(companyId, data);
          return data;
        }

        throw new Error(`Residency service error: ${response.status}`);
      }

      const data: ResidencyValidationResponse = await response.json();

      // Cache the result
      await this.setCached(companyId, data);

      return data;
    } catch (error) {
      console.error('Residency validation error:', error);

      // In case of error, allow the request if enforcement is permissive
      if (this.config.enforcement === 'permissive') {
        return {
          allowed: true,
          companyRegion: region,
          requestedRegion: region,
          residencyType: 'flexible',
          reason: 'Residency service unavailable - permissive mode',
        };
      }

      // In strict mode, fail closed
      throw new Error('Residency validation failed - service unavailable');
    }
  }

  /**
   * Disconnect cache
   */
  async disconnect() {
    if (this.cache && this.cacheReady) {
      await this.cache.disconnect();
    }
  }
}

/**
 * Create residency middleware for Fastify
 */
export function createResidencyMiddleware(config: ResidencyMiddlewareConfig) {
  const client = new ResidencyClient(config);

  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip health checks and public endpoints
    if (
      request.url.startsWith('/health') ||
      request.url.startsWith('/metrics') ||
      request.url.startsWith('/public')
    ) {
      return;
    }

    // Extract company ID from request
    // This could come from:
    // 1. JWT token (preferred)
    // 2. Header (x-company-id)
    // 3. Query parameter (for testing)
    const companyId =
      (request.headers['x-company-id'] as string) ||
      // Add JWT extraction logic here if using auth tokens
      undefined;

    // If no company ID, this might be a public endpoint
    if (!companyId) {
      // Log warning for non-public endpoints without company ID
      if (!request.url.startsWith('/public')) {
        request.log.warn({ url: request.url }, 'No company ID found in request');
      }
      return;
    }

    // Validate residency
    try {
      const validation = await client.validate(companyId);

      // Add residency headers to response
      reply.header('X-Data-Region', validation.companyRegion);
      reply.header('X-Residency-Type', validation.residencyType);

      // Reject request if not allowed
      if (!validation.allowed) {
        request.log.error(
          {
            companyId,
            companyRegion: validation.companyRegion,
            requestedRegion: validation.requestedRegion,
            residencyType: validation.residencyType,
          },
          'Data residency violation'
        );

        return reply.code(403).send({
          error: 'Data Residency Violation',
          message: validation.reason || 'Request violates company data residency policy',
          companyRegion: validation.companyRegion,
          requestedRegion: validation.requestedRegion,
        });
      }

      // Add residency info to request for downstream services
      request.headers['x-data-region'] = validation.companyRegion;
      request.headers['x-residency-type'] = validation.residencyType;
    } catch (error) {
      request.log.error({ error, companyId }, 'Residency validation failed');

      // In strict mode, reject the request
      if (config.enforcement === 'strict') {
        return reply.code(503).send({
          error: 'Service Unavailable',
          message: 'Data residency validation service is unavailable',
        });
      }

      // In permissive mode, allow the request but log the error
      request.log.warn({ companyId }, 'Proceeding without residency validation (permissive mode)');
    }
  };
}

/**
 * Helper: Invalidate company residency cache
 * Use this when a company's region is updated
 */
export async function invalidateResidencyCache(
  redisUrl: string,
  companyId: string
): Promise<void> {
  try {
    const client = createClient({ url: redisUrl });
    await client.connect();
    const key = `api-gateway:residency:${companyId}`;
    await client.del(key);
    await client.disconnect();
  } catch (error) {
    console.error('Failed to invalidate residency cache:', error);
  }
}
