/**
 * Delivery Log API Routes
 * Provides APIs for Worker-3 UI to view delivery history, filter, and get statistics
 * Ref: MULTI_AGENT_PLAN.md § Worker 2/Integrations Lead/Delivery Logger
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { db } from '@teei/shared-schema';
import { impactDeliveries } from '@teei/shared-schema';
import { eq, and, desc, sql, gte, lte, inArray } from 'drizzle-orm';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('impact-in:deliveries');

// Validation schemas
const listDeliveriesQuerySchema = z.object({
  companyId: z.string().uuid().optional(),
  provider: z.enum(['benevity', 'goodera', 'workday']).optional(),
  status: z.enum(['pending', 'success', 'failed', 'retrying']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const deliveryIdSchema = z.object({
  id: z.string().uuid(),
});

/**
 * Register delivery log routes
 */
export async function deliveryRoutes(app: FastifyInstance) {
  /**
   * GET /v1/impact-in/deliveries
   * List deliveries with filtering and pagination
   */
  app.get('/deliveries', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = listDeliveriesQuerySchema.parse(request.query);
      const { companyId, provider, status, startDate, endDate, page, limit } = query;

      logger.info('Fetching deliveries', { query });

      // Build WHERE conditions
      const conditions = [];
      if (companyId) {
        conditions.push(eq(impactDeliveries.companyId, companyId));
      }
      if (provider) {
        conditions.push(eq(impactDeliveries.provider, provider));
      }
      if (status) {
        conditions.push(eq(impactDeliveries.status, status));
      }
      if (startDate) {
        conditions.push(gte(impactDeliveries.createdAt, new Date(startDate)));
      }
      if (endDate) {
        conditions.push(lte(impactDeliveries.createdAt, new Date(endDate)));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(impactDeliveries)
        .where(whereClause);

      const total = Number(countResult[0]?.count || 0);

      // Get paginated results
      const offset = (page - 1) * limit;
      const deliveries = await db
        .select()
        .from(impactDeliveries)
        .where(whereClause)
        .orderBy(desc(impactDeliveries.createdAt))
        .limit(limit)
        .offset(offset);

      const totalPages = Math.ceil(total / limit);

      return reply.status(200).send({
        data: deliveries,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      });
    } catch (error: any) {
      logger.error('Failed to fetch deliveries', { error: error.message });

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Validation error',
          details: error.errors,
        });
      }

      return reply.status(500).send({
        error: 'Failed to fetch deliveries',
        message: error.message,
      });
    }
  });

  /**
   * GET /v1/impact-in/deliveries/:id
   * Get single delivery by ID
   */
  app.get('/deliveries/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = deliveryIdSchema.parse(request.params);
      const { id } = params;

      logger.info('Fetching delivery', { id });

      const delivery = await db
        .select()
        .from(impactDeliveries)
        .where(eq(impactDeliveries.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!delivery) {
        return reply.status(404).send({
          error: 'Delivery not found',
          id,
        });
      }

      return reply.status(200).send({
        data: delivery,
      });
    } catch (error: any) {
      logger.error('Failed to fetch delivery', { error: error.message });

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Validation error',
          details: error.errors,
        });
      }

      return reply.status(500).send({
        error: 'Failed to fetch delivery',
        message: error.message,
      });
    }
  });

  /**
   * GET /v1/impact-in/stats
   * Get delivery statistics by provider and status
   */
  app.get('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = z
        .object({
          companyId: z.string().uuid().optional(),
          startDate: z.string().datetime().optional(),
          endDate: z.string().datetime().optional(),
        })
        .parse(request.query);

      const { companyId, startDate, endDate } = query;

      logger.info('Fetching delivery stats', { query });

      // Build WHERE conditions
      const conditions = [];
      if (companyId) {
        conditions.push(eq(impactDeliveries.companyId, companyId));
      }
      if (startDate) {
        conditions.push(gte(impactDeliveries.createdAt, new Date(startDate)));
      }
      if (endDate) {
        conditions.push(lte(impactDeliveries.createdAt, new Date(endDate)));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get stats by provider and status
      const statsByProvider = await db
        .select({
          provider: impactDeliveries.provider,
          status: impactDeliveries.status,
          count: sql<number>`count(*)`,
          avgAttempts: sql<number>`avg(${impactDeliveries.attemptCount})`,
        })
        .from(impactDeliveries)
        .where(whereClause)
        .groupBy(impactDeliveries.provider, impactDeliveries.status);

      // Get overall stats
      const overallStats = await db
        .select({
          total: sql<number>`count(*)`,
          successful: sql<number>`count(*) filter (where status = 'success')`,
          failed: sql<number>`count(*) filter (where status = 'failed')`,
          pending: sql<number>`count(*) filter (where status = 'pending')`,
          retrying: sql<number>`count(*) filter (where status = 'retrying')`,
        })
        .from(impactDeliveries)
        .where(whereClause);

      return reply.status(200).send({
        data: {
          overall: overallStats[0] || {},
          byProvider: statsByProvider.map((stat) => ({
            provider: stat.provider,
            status: stat.status,
            count: Number(stat.count),
            avgAttempts: Number(stat.avgAttempts || 0),
          })),
        },
      });
    } catch (error: any) {
      logger.error('Failed to fetch stats', { error: error.message });

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Validation error',
          details: error.errors,
        });
      }

      return reply.status(500).send({
        error: 'Failed to fetch stats',
        message: error.message,
      });
    }
  });
}
