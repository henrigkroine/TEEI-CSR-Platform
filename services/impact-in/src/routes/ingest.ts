/**
 * Ingestion Routes
 * Triggers data sync from all external and internal connectors
 * Supports manual triggers and scheduled jobs
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createServiceLogger } from '@teei/shared-utils';
import { createBenevityInboundClient } from '../connectors/benevity/inbound-client.js';
import { createGooderaInboundClient } from '../connectors/goodera/inbound-client.js';
import { createWorkdaySCIMClient } from '../connectors/workday/scim-client.js';
import { createKintellClient } from '../connectors/kintell-client.js';
import { createUpskillingClient } from '../connectors/upskilling-client.js';
import { createBuddyClient } from '../connectors/buddy-client.js';
import { redactPII } from '../lib/pii-redaction.js';
import { trackIngestionMetrics } from '../lib/metrics.js';

const logger = createServiceLogger('impact-in:ingest');

const IngestRequestSchema = z.object({
  companyId: z.string().uuid(),
  connectors: z
    .array(
      z.enum(['benevity', 'goodera', 'workday', 'kintell', 'upskilling', 'buddy', 'all'])
    )
    .optional()
    .default(['all']),
  since: z.string().datetime().optional(),
  maxRecords: z.number().int().positive().optional().default(500),
});

type IngestRequest = z.infer<typeof IngestRequestSchema>;

/**
 * Register ingestion routes
 */
export async function registerIngestRoutes(fastify: FastifyInstance) {
  /**
   * POST /v1/impact-in/ingest
   * Trigger manual data ingestion from connectors
   */
  fastify.post('/ingest', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = IngestRequestSchema.parse(request.body);

      logger.info('Starting manual ingestion', {
        companyId: params.companyId,
        connectors: params.connectors,
      });

      const results = await ingestData(params);

      logger.info('Ingestion completed', {
        companyId: params.companyId,
        totalRecords: results.totalRecords,
        errors: results.errors.length,
      });

      return reply.code(200).send(results);
    } catch (error: any) {
      logger.error('Ingestion failed', { error: error.message });
      return reply.code(400).send({ error: error.message });
    }
  });

  /**
   * GET /v1/impact-in/ingest/status
   * Get status of all connectors
   */
  fastify.get('/ingest/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const { companyId } = request.query as { companyId: string };

    if (!companyId) {
      return reply.code(400).send({ error: 'companyId is required' });
    }

    logger.info('Fetching connector status', { companyId });

    const status = await getConnectorStatus(companyId);

    return reply.code(200).send(status);
  });

  /**
   * POST /v1/impact-in/ingest/schedule
   * Create or update ingestion schedule
   */
  fastify.post('/ingest/schedule', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId, connectors, interval } = request.body as {
        companyId: string;
        connectors: string[];
        interval: string; // cron expression
      };

      logger.info('Creating ingestion schedule', { companyId, connectors, interval });

      // TODO: Store schedule in database
      // For now, return success

      return reply.code(200).send({
        success: true,
        message: 'Schedule created',
        companyId,
        connectors,
        interval,
      });
    } catch (error: any) {
      logger.error('Failed to create schedule', { error: error.message });
      return reply.code(400).send({ error: error.message });
    }
  });
}

/**
 * Main ingestion logic - called by routes and scheduler
 */
export async function ingestData(params: IngestRequest) {
  const startTime = Date.now();
  const results = {
    companyId: params.companyId,
    connectors: [] as any[],
    totalRecords: 0,
    errors: [] as string[],
    duration: 0,
  };

  const connectorList =
    params.connectors.includes('all')
      ? ['benevity', 'goodera', 'workday', 'kintell', 'upskilling', 'buddy']
      : params.connectors;

  for (const connectorName of connectorList) {
    try {
      const connectorResult = await ingestConnector(
        connectorName as string,
        params.companyId,
        params.since,
        params.maxRecords
      );

      results.connectors.push(connectorResult);
      results.totalRecords += connectorResult.recordCount;

      // Track metrics
      trackIngestionMetrics(connectorName, connectorResult.recordCount, connectorResult.errors.length);
    } catch (error: any) {
      logger.error(`Failed to ingest ${connectorName}`, { error: error.message });
      results.errors.push(`${connectorName}: ${error.message}`);

      results.connectors.push({
        connector: connectorName,
        success: false,
        error: error.message,
        recordCount: 0,
        errors: [error.message],
      });
    }
  }

  results.duration = Date.now() - startTime;

  return results;
}

/**
 * Ingest data from a single connector
 */
async function ingestConnector(
  connectorName: string,
  companyId: string,
  since?: string,
  maxRecords: number = 500
) {
  logger.info(`Ingesting ${connectorName}`, { companyId, since, maxRecords });

  const startTime = Date.now();
  let recordCount = 0;
  let errors: string[] = [];

  try {
    switch (connectorName) {
      case 'benevity': {
        const client = createBenevityInboundClient(companyId);
        const result = await client.sync(since, Math.floor(maxRecords / 100)); // maxPages
        recordCount = result.volunteers.length + result.donations.length;
        errors = result.errors;

        // Redact PII and persist events
        await processEvents([...result.volunteers, ...result.donations], companyId);
        break;
      }

      case 'goodera': {
        const client = createGooderaInboundClient(companyId);
        const result = await client.sync(since, Math.floor(maxRecords / 100)); // maxPages
        recordCount = result.volunteers.length + result.donations.length;
        errors = result.errors;

        await processEvents([...result.volunteers, ...result.donations], companyId);
        break;
      }

      case 'workday': {
        const client = createWorkdaySCIMClient(companyId);
        const result = await client.syncUsers(undefined, maxRecords);
        recordCount = result.users.length;
        errors = result.errors;

        await processEvents(result.users, companyId);
        break;
      }

      case 'kintell': {
        const client = createKintellClient(companyId);
        const result = await client.sync(since, maxRecords);
        recordCount = result.sessions.length + result.ratings.length;
        errors = result.errors;

        await processEvents([...result.sessions, ...result.ratings], companyId);
        break;
      }

      case 'upskilling': {
        const client = createUpskillingClient(companyId);
        const result = await client.sync(since, maxRecords);
        recordCount = result.courses.length + result.credentials.length;
        errors = result.errors;

        await processEvents([...result.courses, ...result.credentials], companyId);
        break;
      }

      case 'buddy': {
        const client = createBuddyClient(companyId);
        const result = await client.sync(since, maxRecords);
        recordCount =
          result.matches.length +
          result.events.length +
          result.checkins.length +
          result.feedback.length;
        errors = result.errors;

        await processEvents(
          [...result.matches, ...result.events, ...result.checkins, ...result.feedback],
          companyId
        );
        break;
      }

      default:
        throw new Error(`Unknown connector: ${connectorName}`);
    }

    logger.info(`Completed ${connectorName} ingestion`, {
      recordCount,
      errors: errors.length,
      duration: Date.now() - startTime,
    });

    return {
      connector: connectorName,
      success: true,
      recordCount,
      errors,
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    logger.error(`Failed to ingest ${connectorName}`, { error: error.message });

    return {
      connector: connectorName,
      success: false,
      recordCount,
      errors: [error.message, ...errors],
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Process events - redact PII, validate, and persist
 */
async function processEvents(events: any[], companyId: string) {
  for (const event of events) {
    try {
      // Redact PII
      const redactedEvent = redactPII(event);

      // TODO: Persist to database/event bus
      logger.debug('Event processed', {
        eventType: redactedEvent.type,
        eventId: redactedEvent.id,
        companyId,
      });

      // TODO: Publish to event bus for downstream processing
    } catch (error: any) {
      logger.error('Failed to process event', { error: error.message, eventId: event.id });
    }
  }

  logger.info('Processed events', { count: events.length, companyId });
}

/**
 * Get status of all connectors for a company
 */
async function getConnectorStatus(companyId: string) {
  const connectors = ['benevity', 'goodera', 'workday', 'kintell', 'upskilling', 'buddy'];

  const status = await Promise.all(
    connectors.map(async (connectorName) => {
      try {
        const health = await getConnectorHealth(connectorName, companyId);

        return {
          connector: connectorName,
          healthy: health.success,
          error: health.error,
          lastSync: undefined, // TODO: Get from database
        };
      } catch (error: any) {
        return {
          connector: connectorName,
          healthy: false,
          error: error.message,
          lastSync: undefined,
        };
      }
    })
  );

  return {
    companyId,
    connectors: status,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get health status of a connector
 */
async function getConnectorHealth(connectorName: string, companyId: string) {
  switch (connectorName) {
    case 'benevity': {
      const client = createBenevityInboundClient(companyId);
      return await client.healthCheck();
    }

    case 'goodera': {
      const client = createGooderaInboundClient(companyId);
      return await client.healthCheck();
    }

    case 'workday': {
      const client = createWorkdaySCIMClient(companyId);
      return await client.healthCheck();
    }

    case 'kintell': {
      const client = createKintellClient(companyId);
      return await client.healthCheck();
    }

    case 'upskilling': {
      const client = createUpskillingClient(companyId);
      return await client.healthCheck();
    }

    case 'buddy': {
      const client = createBuddyClient(companyId);
      return await client.healthCheck();
    }

    default:
      throw new Error(`Unknown connector: ${connectorName}`);
  }
}
