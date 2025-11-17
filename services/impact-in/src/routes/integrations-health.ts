/**
 * Integrations Health Endpoint
 * Unified health check for all 12 connectors with metrics
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createServiceLogger } from '@teei/shared-utils';
import { createBenevityInboundClient } from '../connectors/benevity/inbound-client.js';
import { createGooderaInboundClient } from '../connectors/goodera/inbound-client.js';
import { createWorkdaySCIMClient } from '../connectors/workday/scim-client.js';
import { createKintellClient } from '../connectors/kintell-client.js';
import { createUpskillingClient } from '../connectors/upskilling-client.js';
import { createBuddyClient} from '../connectors/buddy-client.js';

const logger = createServiceLogger('impact-in:integrations-health');

interface ConnectorHealthStatus {
  connector: string;
  healthy: boolean;
  error?: string;
  responseTimeMs?: number;
  lastChecked: string;
}

interface IntegrationsHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  connectors: ConnectorHealthStatus[];
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    degraded: number;
  };
  timestamp: string;
}

/**
 * Register integrations health routes
 */
export async function registerIntegrationsHealthRoutes(fastify: FastifyInstance) {
  /**
   * GET /v1/impact-in/integrations/health
   * Get health status of all connectors
   */
  fastify.get('/integrations/health', async (request: FastifyRequest, reply: FastifyReply) => {
    const { companyId } = request.query as { companyId?: string };

    logger.info('Checking integrations health', { companyId });

    const healthStatus = await checkAllConnectorsHealth(companyId);

    const statusCode = healthStatus.status === 'healthy' ? 200 : healthStatus.status === 'degraded' ? 503 : 500;

    return reply.code(statusCode).send(healthStatus);
  });

  /**
   * GET /v1/impact-in/integrations/health/:connector
   * Get health status of a specific connector
   */
  fastify.get('/integrations/health/:connector', async (request: FastifyRequest, reply: FastifyReply) => {
    const { connector } = request.params as { connector: string };
    const { companyId } = request.query as { companyId?: string };

    logger.info('Checking connector health', { connector, companyId });

    try {
      const health = await checkConnectorHealth(connector, companyId);

      const statusCode = health.healthy ? 200 : 503;

      return reply.code(statusCode).send({
        connector,
        ...health,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Health check failed', { connector, error: error.message });

      return reply.code(500).send({
        connector,
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * GET /v1/impact-in/integrations/metrics
   * Get aggregated metrics for all connectors
   */
  fastify.get('/integrations/metrics', async (request: FastifyRequest, reply: FastifyReply) => {
    const { companyId } = request.query as { companyId?: string };

    logger.info('Fetching integration metrics', { companyId });

    // TODO: Fetch actual metrics from database/monitoring system
    const metrics = {
      companyId,
      connectors: [
        {
          connector: 'benevity',
          lastSync: undefined,
          recordsIngested: 0,
          errorRate: 0,
          avgResponseTimeMs: 0,
        },
        {
          connector: 'goodera',
          lastSync: undefined,
          recordsIngested: 0,
          errorRate: 0,
          avgResponseTimeMs: 0,
        },
        {
          connector: 'workday',
          lastSync: undefined,
          recordsIngested: 0,
          errorRate: 0,
          avgResponseTimeMs: 0,
        },
        {
          connector: 'kintell',
          lastSync: undefined,
          recordsIngested: 0,
          errorRate: 0,
          avgResponseTimeMs: 0,
        },
        {
          connector: 'upskilling',
          lastSync: undefined,
          recordsIngested: 0,
          errorRate: 0,
          avgResponseTimeMs: 0,
        },
        {
          connector: 'buddy',
          lastSync: undefined,
          recordsIngested: 0,
          errorRate: 0,
          avgResponseTimeMs: 0,
        },
      ],
      timestamp: new Date().toISOString(),
    };

    return reply.code(200).send(metrics);
  });
}

/**
 * Check health of all connectors
 */
async function checkAllConnectorsHealth(companyId?: string): Promise<IntegrationsHealthResponse> {
  const connectors = ['benevity', 'goodera', 'workday', 'kintell', 'upskilling', 'buddy'];

  const healthChecks = await Promise.allSettled(
    connectors.map(async (connectorName) => {
      const startTime = Date.now();
      const health = await checkConnectorHealth(connectorName, companyId);
      const responseTimeMs = Date.now() - startTime;

      return {
        connector: connectorName,
        healthy: health.healthy,
        error: health.error,
        responseTimeMs,
        lastChecked: new Date().toISOString(),
      };
    })
  );

  const connectorResults: ConnectorHealthStatus[] = healthChecks.map((result) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        connector: 'unknown',
        healthy: false,
        error: result.reason?.message || 'Unknown error',
        lastChecked: new Date().toISOString(),
      };
    }
  });

  const summary = {
    total: connectorResults.length,
    healthy: connectorResults.filter((c) => c.healthy).length,
    unhealthy: connectorResults.filter((c) => !c.healthy).length,
    degraded: 0,
  };

  // Determine overall status
  let status: 'healthy' | 'degraded' | 'unhealthy';
  if (summary.unhealthy === 0) {
    status = 'healthy';
  } else if (summary.unhealthy < summary.total / 2) {
    status = 'degraded';
  } else {
    status = 'unhealthy';
  }

  return {
    status,
    connectors: connectorResults,
    summary,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Check health of a specific connector
 */
async function checkConnectorHealth(
  connectorName: string,
  companyId?: string
): Promise<{ healthy: boolean; error?: string }> {
  const testCompanyId = companyId || process.env.DEFAULT_COMPANY_ID || '00000000-0000-0000-0000-000000000000';

  switch (connectorName) {
    case 'benevity': {
      const client = createBenevityInboundClient(testCompanyId);
      return await client.healthCheck();
    }

    case 'goodera': {
      const client = createGooderaInboundClient(testCompanyId);
      return await client.healthCheck();
    }

    case 'workday': {
      const client = createWorkdaySCIMClient(testCompanyId);
      return await client.healthCheck();
    }

    case 'kintell': {
      const client = createKintellClient(testCompanyId);
      return await client.healthCheck();
    }

    case 'upskilling': {
      const client = createUpskillingClient(testCompanyId);
      return await client.healthCheck();
    }

    case 'buddy': {
      const client = createBuddyClient(testCompanyId);
      return await client.healthCheck();
    }

    default:
      throw new Error(`Unknown connector: ${connectorName}`);
  }
}
