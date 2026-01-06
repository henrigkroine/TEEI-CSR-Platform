/**
 * Status API Routes
 *
 * Provides public-facing status information including:
 * - Service health aggregation
 * - Performance metrics (p95/p99 latency)
 * - Uptime statistics
 * - Historical data
 *
 * Ref: AGENTS.md § Trust Boardroom Implementation / Status API Engineer
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { HealthStatus } from '@teei/observability';
import { getPrometheusMetrics, getHistoricalMetrics } from '../lib/metrics.js';
import Redis from 'ioredis';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('status-api');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6381';
const CACHE_TTL = 60; // 60 seconds
const CACHE_KEY = 'status:current';
const HISTORY_CACHE_PREFIX = 'status:history';

let redisClient: Redis | null = null;

/**
 * Initialize Redis client for caching
 */
function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(REDIS_URL, {
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      enableOfflineQueue: true,
      lazyConnect: true,
    });

    redisClient.on('error', (err) => {
      logger.error({ error: err }, 'Redis error in status cache');
    });

    // Connect in background
    redisClient.connect().catch((err) => {
      logger.warn({ error: err }, 'Redis connection failed, will retry');
    });
  }

  return redisClient;
}

/**
 * Service health check definitions
 */
const SERVICES = [
  { name: 'API Gateway', url: process.env.API_GATEWAY_URL || 'http://localhost:3017', path: '/health' },
  { name: 'Reporting Service', url: process.env.REPORTING_SERVICE_URL || 'http://localhost:3020', path: '/health' },
  { name: 'Analytics Service', url: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3023', path: '/health' },
  { name: 'Impact-In Service', url: process.env.IMPACT_IN_URL || 'http://localhost:3025', path: '/health' },
  { name: 'Q2Q AI Service', url: process.env.Q2Q_AI_URL || 'http://localhost:3021', path: '/health' },
];

/**
 * Check health of a single service
 */
async function checkServiceHealth(
  name: string,
  url: string,
  path: string
): Promise<{ name: string; status: string; latency?: number }> {
  const startTime = Date.now();
  const healthUrl = `${url}${path}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const latency = Date.now() - startTime;

    if (response.ok) {
      return { name, status: 'operational', latency };
    } else {
      return { name, status: 'degraded', latency };
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    return { name, status: 'outage', latency };
  }
}

/**
 * Calculate uptime percentage from metrics
 */
function calculateUptime(metrics: any): number {
  const totalRequests = metrics.http_requests_total || 1;
  const errorRequests = metrics.http_requests_errors || 0;

  if (totalRequests === 0) return 100;

  return Math.min(100, ((totalRequests - errorRequests) / totalRequests) * 100);
}

/**
 * Get last incident (stub - would query incident table)
 */
async function getLastIncident(): Promise<string | null> {
  // TODO: Query incident tracking system
  // For now, return null (no recent incidents)
  return null;
}

/**
 * Generate status response
 */
async function generateStatus() {
  // Check all services in parallel
  const healthChecks = await Promise.all(
    SERVICES.map((service) => checkServiceHealth(service.name, service.url, service.path))
  );

  // Get Prometheus metrics
  const metrics = await getPrometheusMetrics();

  // Determine overall status
  const hasOutage = healthChecks.some((s) => s.status === 'outage');
  const hasDegraded = healthChecks.some((s) => s.status === 'degraded');

  let overallStatus: 'operational' | 'degraded' | 'outage';
  if (hasOutage) {
    overallStatus = 'outage';
  } else if (hasDegraded) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'operational';
  }

  // Calculate uptime
  const uptime = calculateUptime(metrics);

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    services: healthChecks,
    metrics: {
      p95Latency: Math.round(metrics.http_request_duration_p95 * 100) / 100,
      p99Latency: Math.round(metrics.http_request_duration_p99 * 100) / 100,
      errorRate: Math.round(metrics.error_rate * 100) / 100,
      requestsPerMinute: Math.round(metrics.requests_per_minute),
    },
    performance: {
      lcp: metrics.lcp_p75 ? Math.round(metrics.lcp_p75) : null,
      fid: metrics.fid_p75 ? Math.round(metrics.fid_p75) : null,
      cls: metrics.cls_p75 ? Math.round(metrics.cls_p75 * 1000) / 1000 : null,
    },
    uptime: {
      percentage: Math.round(uptime * 100) / 100,
      lastIncident: await getLastIncident(),
    },
  };
}

/**
 * Get cached status or generate new one
 */
async function getCachedStatus() {
  try {
    const redis = getRedisClient();

    // Try to get from cache
    const cached = await redis.get(CACHE_KEY);
    if (cached) {
      logger.debug('Status served from cache');
      return JSON.parse(cached);
    }
  } catch (error) {
    logger.warn({ error }, 'Cache read failed, generating fresh status');
  }

  // Generate fresh status
  const status = await generateStatus();

  // Cache it (fire and forget)
  try {
    const redis = getRedisClient();
    await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(status));
  } catch (error) {
    logger.warn({ error }, 'Cache write failed');
  }

  return status;
}

/**
 * Background refresh job (runs every 30s)
 */
let refreshInterval: NodeJS.Timeout | null = null;

function startBackgroundRefresh() {
  if (refreshInterval) {
    return; // Already running
  }

  refreshInterval = setInterval(async () => {
    try {
      logger.debug('Background refresh: generating status');
      const status = await generateStatus();
      const redis = getRedisClient();
      await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(status));
      logger.debug('Background refresh: status cached');
    } catch (error) {
      logger.error({ error }, 'Background refresh failed');
    }
  }, 30000); // 30 seconds

  logger.info('Background refresh started (30s interval)');
}

/**
 * Register status routes
 */
export async function registerStatusRoutes(fastify: FastifyInstance): Promise<void> {
  // Start background refresh
  startBackgroundRefresh();

  /**
   * GET /status.json
   * Current status with caching
   */
  fastify.get('/status.json', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const status = await getCachedStatus();

      reply.header('Cache-Control', 'public, max-age=60');
      reply.header('Content-Type', 'application/json');
      reply.send(status);
    } catch (error) {
      logger.error({ error }, 'Error generating status');

      // Serve stale on error if available
      try {
        const redis = getRedisClient();
        const stale = await redis.get(CACHE_KEY);
        if (stale) {
          logger.warn('Serving stale status due to error');
          reply.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
          reply.header('Content-Type', 'application/json');
          reply.send(JSON.parse(stale));
          return;
        }
      } catch (cacheError) {
        // Ignore cache errors
      }

      // Last resort: return minimal status
      reply.code(503).send({
        status: 'outage',
        timestamp: new Date().toISOString(),
        services: [],
        metrics: {
          p95Latency: 0,
          p99Latency: 0,
          errorRate: 0,
          requestsPerMinute: 0,
        },
        performance: {
          lcp: null,
          fid: null,
          cls: null,
        },
        uptime: {
          percentage: 0,
          lastIncident: null,
        },
      });
    }
  });

  /**
   * GET /status/history
   * Historical uptime data
   */
  fastify.get<{
    Querystring: { days?: string };
  }>('/status/history', async (request: FastifyRequest<{ Querystring: { days?: string } }>, reply: FastifyReply) => {
    try {
      const days = parseInt(request.query.days || '7', 10);

      // Validate days
      if (days < 1 || days > 90) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid days parameter (must be 1-90)',
        });
      }

      const cacheKey = `${HISTORY_CACHE_PREFIX}:${days}`;

      // Try cache first
      try {
        const redis = getRedisClient();
        const cached = await redis.get(cacheKey);
        if (cached) {
          logger.debug({ days }, 'Historical data served from cache');
          reply.header('Cache-Control', 'public, max-age=300'); // 5 minutes
          return reply.send(JSON.parse(cached));
        }
      } catch (error) {
        logger.warn({ error }, 'History cache read failed');
      }

      // Generate historical data
      const history = await getHistoricalMetrics(days);

      // Cache it (5 minute TTL)
      try {
        const redis = getRedisClient();
        await redis.setex(cacheKey, 300, JSON.stringify(history));
      } catch (error) {
        logger.warn({ error }, 'History cache write failed');
      }

      reply.header('Cache-Control', 'public, max-age=300');
      reply.send(history);
    } catch (error) {
      logger.error({ error }, 'Error getting historical metrics');
      reply.code(500).send({
        success: false,
        error: 'Failed to retrieve historical data',
      });
    }
  });

  logger.info('Status API routes registered successfully');
}

/**
 * Cleanup on shutdown
 */
export async function shutdownStatusRoutes(): Promise<void> {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
    logger.info('Background refresh stopped');
  }

  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis client disconnected');
  }
}
