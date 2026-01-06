import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { BenevityIngestClient } from '../connectors/benevity/ingest-client.js';
import { GooderaIngestClient } from '../connectors/goodera/ingest-client.js';
import { WorkdayIngestClient } from '../connectors/workday/ingest-client.js';
import { KintellIngestClient } from '../connectors/internal/kintell-ingest-client.js';
import { UpskillingIngestClient } from '../connectors/internal/upskilling-ingest-client.js';
import { BuddyIngestClient } from '../connectors/internal/buddy-ingest-client.js';
import { MentorshipIngestClient } from '../connectors/internal/mentorship-ingest-client.js';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('impact-in:integrations-health');

interface ConnectorHealth {
  name: string;
  type: 'external' | 'internal';
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  lastCheck: string;
  error?: string;
  metrics?: {
    totalIngests?: number;
    successRate?: number;
    avgLag?: number;
  };
}

/**
 * Register integrations health endpoint
 */
export async function registerIntegrationsHealthRoutes(fastify: FastifyInstance) {
  /**
   * GET /integrations/health
   * Comprehensive health check for all 12 connectors
   */
  fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    logger.info('Running integrations health check');

    const healthChecks = await Promise.allSettled([
      checkConnectorHealth('benevity', 'external', async () => {
        const client = createBenevityIngestClient();
        return await client.healthCheck();
      }),
      checkConnectorHealth('goodera', 'external', async () => {
        const client = createGooderaIngestClient();
        return await client.healthCheck();
      }),
      checkConnectorHealth('workday', 'external', async () => {
        const client = createWorkdayIngestClient();
        return await client.healthCheck();
      }),
      checkConnectorHealth('kintell', 'internal', async () => {
        const client = createKintellIngestClient();
        return await client.healthCheck();
      }),
      checkConnectorHealth('upskilling', 'internal', async () => {
        const client = createUpskillingIngestClient();
        return await client.healthCheck();
      }),
      checkConnectorHealth('buddy', 'internal', async () => {
        const client = createBuddyIngestClient();
        return await client.healthCheck();
      }),
      checkConnectorHealth('mentorship', 'internal', async () => {
        const client = createMentorshipIngestClient();
        return await client.healthCheck();
      }),
    ]);

    const connectors: ConnectorHealth[] = healthChecks.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        const names = ['benevity', 'goodera', 'workday', 'kintell', 'upskilling', 'buddy', 'mentorship'];
        const types: ('external' | 'internal')[] = ['external', 'external', 'external', 'internal', 'internal', 'internal', 'internal'];
        return {
          name: names[index],
          type: types[index],
          status: 'unhealthy' as const,
          lastCheck: new Date().toISOString(),
          error: result.reason?.message || 'Health check failed',
        };
      }
    });

    const summary = {
      totalConnectors: connectors.length,
      healthy: connectors.filter(c => c.status === 'healthy').length,
      degraded: connectors.filter(c => c.status === 'degraded').length,
      unhealthy: connectors.filter(c => c.status === 'unhealthy').length,
      overallStatus: determineOverallStatus(connectors),
    };

    logger.info('Integrations health check completed', { summary });

    return reply.code(summary.overallStatus === 'unhealthy' ? 503 : 200).send({
      status: summary.overallStatus,
      summary,
      connectors,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /integrations/health/:connector
   * Health check for a specific connector
   */
  fastify.get('/health/:connector', async (request: FastifyRequest<{
    Params: { connector: string };
  }>, reply: FastifyReply) => {
    const { connector } = request.params;

    logger.info('Running health check for connector', { connector });

    try {
      let health: ConnectorHealth;

      switch (connector) {
        case 'benevity':
          health = await checkConnectorHealth('benevity', 'external', async () => {
            const client = createBenevityIngestClient();
            return await client.healthCheck();
          });
          break;
        case 'goodera':
          health = await checkConnectorHealth('goodera', 'external', async () => {
            const client = createGooderaIngestClient();
            return await client.healthCheck();
          });
          break;
        case 'workday':
          health = await checkConnectorHealth('workday', 'external', async () => {
            const client = createWorkdayIngestClient();
            return await client.healthCheck();
          });
          break;
        case 'kintell':
          health = await checkConnectorHealth('kintell', 'internal', async () => {
            const client = createKintellIngestClient();
            return await client.healthCheck();
          });
          break;
        case 'upskilling':
          health = await checkConnectorHealth('upskilling', 'internal', async () => {
            const client = createUpskillingIngestClient();
            return await client.healthCheck();
          });
          break;
        case 'buddy':
          health = await checkConnectorHealth('buddy', 'internal', async () => {
            const client = createBuddyIngestClient();
            return await client.healthCheck();
          });
          break;
        case 'mentorship':
          health = await checkConnectorHealth('mentorship', 'internal', async () => {
            const client = createMentorshipIngestClient();
            return await client.healthCheck();
          });
          break;
        default:
          return reply.code(404).send({ error: `Unknown connector: ${connector}` });
      }

      return reply.code(health.status === 'unhealthy' ? 503 : 200).send(health);
    } catch (error: any) {
      logger.error('Connector health check failed', { connector, error: error.message });
      return reply.code(500).send({ error: error.message });
    }
  });
}

/**
 * Check health of a specific connector
 */
async function checkConnectorHealth(
  name: string,
  type: 'external' | 'internal',
  healthCheckFn: () => Promise<boolean>
): Promise<ConnectorHealth> {
  const startTime = Date.now();

  try {
    const isHealthy = await healthCheckFn();
    const responseTime = Date.now() - startTime;

    return {
      name,
      type,
      status: isHealthy ? 'healthy' : 'unhealthy',
      responseTime,
      lastCheck: new Date().toISOString(),
      // TODO: Add real metrics from database/monitoring
      metrics: {
        totalIngests: 0,
        successRate: 0,
        avgLag: 0,
      },
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;

    return {
      name,
      type,
      status: 'unhealthy',
      responseTime,
      lastCheck: new Date().toISOString(),
      error: error.message,
    };
  }
}

/**
 * Determine overall health status
 */
function determineOverallStatus(connectors: ConnectorHealth[]): 'healthy' | 'degraded' | 'unhealthy' {
  const unhealthyCount = connectors.filter(c => c.status === 'unhealthy').length;
  const degradedCount = connectors.filter(c => c.status === 'degraded').length;

  if (unhealthyCount > connectors.length / 2) {
    return 'unhealthy';
  } else if (unhealthyCount > 0 || degradedCount > 0) {
    return 'degraded';
  } else {
    return 'healthy';
  }
}

/**
 * Client factory functions (load config from env vars)
 */
function createBenevityIngestClient(): BenevityIngestClient {
  return new BenevityIngestClient({
    apiUrl: process.env.BENEVITY_API_URL || 'https://api.benevity.com',
    clientId: process.env.BENEVITY_CLIENT_ID || '',
    clientSecret: process.env.BENEVITY_CLIENT_SECRET || '',
    tenantId: process.env.BENEVITY_TENANT_ID || '',
    mockMode: process.env.NODE_ENV === 'development' || !process.env.BENEVITY_CLIENT_ID,
  });
}

function createGooderaIngestClient(): GooderaIngestClient {
  return new GooderaIngestClient({
    apiUrl: process.env.GOODERA_API_URL || 'https://api.goodera.com',
    apiKey: process.env.GOODERA_API_KEY || '',
    projectId: process.env.GOODERA_PROJECT_ID || '',
    mockMode: process.env.NODE_ENV === 'development' || !process.env.GOODERA_API_KEY,
  });
}

function createWorkdayIngestClient(): WorkdayIngestClient {
  return new WorkdayIngestClient({
    apiUrl: process.env.WORKDAY_API_URL || 'https://api.workday.com',
    clientId: process.env.WORKDAY_CLIENT_ID || '',
    clientSecret: process.env.WORKDAY_CLIENT_SECRET || '',
    tenantId: process.env.WORKDAY_TENANT_ID || '',
    mockMode: process.env.NODE_ENV === 'development' || !process.env.WORKDAY_CLIENT_ID,
  });
}

function createKintellIngestClient(): KintellIngestClient {
  return new KintellIngestClient({
    apiUrl: process.env.KINTELL_CONNECTOR_URL || 'http://localhost:3002',
    apiKey: process.env.INTERNAL_API_KEY,
    mockMode: process.env.NODE_ENV === 'development',
  });
}

function createUpskillingIngestClient(): UpskillingIngestClient {
  return new UpskillingIngestClient({
    apiUrl: process.env.UPSKILLING_CONNECTOR_URL || 'http://localhost:3003',
    apiKey: process.env.INTERNAL_API_KEY,
    mockMode: process.env.NODE_ENV === 'development',
  });
}

function createBuddyIngestClient(): BuddyIngestClient {
  return new BuddyIngestClient({
    apiUrl: process.env.BUDDY_CONNECTOR_URL || 'http://localhost:3010',
    apiKey: process.env.INTERNAL_API_KEY,
    mockMode: process.env.NODE_ENV === 'development',
  });
}

function createMentorshipIngestClient(): MentorshipIngestClient {
  return new MentorshipIngestClient({
    apiUrl: process.env.MENTORSHIP_SERVICE_URL || 'http://localhost:3011',
    apiKey: process.env.INTERNAL_API_KEY,
    mockMode: true,
  });
}
