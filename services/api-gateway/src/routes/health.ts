import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

/**
 * Service health status
 */
interface ServiceHealth {
  name: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  url: string;
  responseTime?: number;
  error?: string;
}

/**
 * Aggregated health check response
 */
interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: ServiceHealth[];
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    unknown: number;
  };
}

/**
 * Service definitions for health checks
 */
const SERVICES = [
  { name: 'unified-profile', url: process.env.UNIFIED_PROFILE_URL || 'http://localhost:3018' },
  { name: 'kintell-connector', url: process.env.KINTELL_CONNECTOR_URL || 'http://localhost:3027' },
  { name: 'buddy-service', url: process.env.BUDDY_SERVICE_URL || 'http://localhost:3019' },
  { name: 'upskilling-connector', url: process.env.UPSKILLING_CONNECTOR_URL || 'http://localhost:3028' },
  { name: 'q2q-ai', url: process.env.Q2Q_AI_URL || 'http://localhost:3021' },
  { name: 'safety-moderation', url: process.env.SAFETY_MODERATION_URL || 'http://localhost:3022' }
];

/**
 * Check health of a single service
 *
 * @param name - Service name
 * @param url - Service health endpoint URL
 * @returns Service health status
 */
async function checkServiceHealth(name: string, url: string): Promise<ServiceHealth> {
  const startTime = Date.now();
  const healthUrl = `${url}/health`;

  try {
    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        name,
        status: 'healthy',
        url: healthUrl,
        responseTime
      };
    } else {
      return {
        name,
        status: 'unhealthy',
        url: healthUrl,
        responseTime,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      name,
      status: 'unhealthy',
      url: healthUrl,
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Register health check routes
 *
 * @param fastify - Fastify instance
 */
export async function registerHealthRoutes(fastify: FastifyInstance): Promise<void> {
  // Gateway self-health check
  fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      status: 'healthy',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  });

  // Aggregated health check for all services
  fastify.get('/health/all', async (request: FastifyRequest, reply: FastifyReply) => {
    const healthChecks = await Promise.all(
      SERVICES.map(service => checkServiceHealth(service.name, service.url))
    );

    const summary = {
      total: healthChecks.length,
      healthy: healthChecks.filter(s => s.status === 'healthy').length,
      unhealthy: healthChecks.filter(s => s.status === 'unhealthy').length,
      unknown: healthChecks.filter(s => s.status === 'unknown').length
    };

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (summary.unhealthy === 0) {
      overallStatus = 'healthy';
    } else if (summary.healthy > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'unhealthy';
    }

    const response: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: healthChecks,
      summary
    };

    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 207 : 503;

    return reply.code(statusCode).send(response);
  });

  // Individual service health checks
  fastify.get('/health/profile', async (request: FastifyRequest, reply: FastifyReply) => {
    const health = await checkServiceHealth('unified-profile', SERVICES[0].url);
    return reply.code(health.status === 'healthy' ? 200 : 503).send(health);
  });

  fastify.get('/health/kintell', async (request: FastifyRequest, reply: FastifyReply) => {
    const health = await checkServiceHealth('kintell-connector', SERVICES[1].url);
    return reply.code(health.status === 'healthy' ? 200 : 503).send(health);
  });

  fastify.get('/health/buddy', async (request: FastifyRequest, reply: FastifyReply) => {
    const health = await checkServiceHealth('buddy-service', SERVICES[2].url);
    return reply.code(health.status === 'healthy' ? 200 : 503).send(health);
  });

  fastify.get('/health/upskilling', async (request: FastifyRequest, reply: FastifyReply) => {
    const health = await checkServiceHealth('upskilling-connector', SERVICES[3].url);
    return reply.code(health.status === 'healthy' ? 200 : 503).send(health);
  });

  fastify.get('/health/q2q', async (request: FastifyRequest, reply: FastifyReply) => {
    const health = await checkServiceHealth('q2q-ai', SERVICES[4].url);
    return reply.code(health.status === 'healthy' ? 200 : 503).send(health);
  });

  fastify.get('/health/safety', async (request: FastifyRequest, reply: FastifyReply) => {
    const health = await checkServiceHealth('safety-moderation', SERVICES[5].url);
    return reply.code(health.status === 'healthy' ? 200 : 503).send(health);
  });

  fastify.log.info('Health check routes registered successfully');
}
