import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '@teei/shared-schema';
import { scheduledDeliveries } from '@teei/shared-schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { createServiceLogger } from '@teei/shared-utils';
import { calculateNextRun, validateCronExpression, executeScheduledDelivery } from '../scheduler/cron.js';
import { getSchedulePreview } from '../scheduler/preview.js';

const logger = createServiceLogger('impact-in-schedules');

// Validation schemas
const createScheduleSchema = z.object({
  companyId: z.string().uuid(),
  platform: z.enum(['benevity', 'goodera', 'workday']),
  schedule: z.string().min(1).max(50),
});

const updateScheduleSchema = z.object({
  schedule: z.string().min(1).max(50).optional(),
  active: z.boolean().optional(),
});

export const schedulesRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /schedules - Create scheduled delivery
  fastify.post('/schedules', async (request, reply) => {
    try {
      const body = createScheduleSchema.parse(request.body);

      // Validate cron expression
      if (!validateCronExpression(body.schedule)) {
        return reply.status(400).send({
          error: 'Invalid cron expression',
          message: 'Please provide a valid cron expression (e.g., "0 0 1 * *" for monthly)',
        });
      }

      // Calculate next run time
      const nextRun = calculateNextRun(body.schedule);

      // Create schedule
      const [schedule] = await db
        .insert(scheduledDeliveries)
        .values({
          companyId: body.companyId,
          platform: body.platform,
          schedule: body.schedule,
          nextRun,
          active: true,
        })
        .returning();

      logger.info(`Created schedule ${schedule.id} for company ${body.companyId}`);

      return reply.status(201).send({
        success: true,
        schedule,
      });
    } catch (error: any) {
      logger.error('Error creating schedule:', error);
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Validation error',
          details: error.errors,
        });
      }
      return reply.status(500).send({
        error: 'Internal server error',
        message: error.message,
      });
    }
  });

  // GET /schedules - List all schedules
  fastify.get('/schedules', async (request, reply) => {
    try {
      const { companyId } = request.query as { companyId?: string };

      let query = db.select().from(scheduledDeliveries);

      if (companyId) {
        query = query.where(eq(scheduledDeliveries.companyId, companyId)) as any;
      }

      const schedules = await query.orderBy(desc(scheduledDeliveries.createdAt));

      return reply.send({
        success: true,
        schedules,
        count: schedules.length,
      });
    } catch (error: any) {
      logger.error('Error listing schedules:', error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: error.message,
      });
    }
  });

  // GET /schedules/:id - Get specific schedule
  fastify.get('/schedules/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const [schedule] = await db
        .select()
        .from(scheduledDeliveries)
        .where(eq(scheduledDeliveries.id, id));

      if (!schedule) {
        return reply.status(404).send({
          error: 'Schedule not found',
        });
      }

      return reply.send({
        success: true,
        schedule,
      });
    } catch (error: any) {
      logger.error('Error getting schedule:', error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: error.message,
      });
    }
  });

  // PUT /schedules/:id - Update schedule
  fastify.put('/schedules/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = updateScheduleSchema.parse(request.body);

      // Check if schedule exists
      const [existing] = await db
        .select()
        .from(scheduledDeliveries)
        .where(eq(scheduledDeliveries.id, id));

      if (!existing) {
        return reply.status(404).send({
          error: 'Schedule not found',
        });
      }

      const updates: any = {
        updatedAt: new Date(),
      };

      if (body.schedule !== undefined) {
        // Validate cron expression
        if (!validateCronExpression(body.schedule)) {
          return reply.status(400).send({
            error: 'Invalid cron expression',
          });
        }
        updates.schedule = body.schedule;
        updates.nextRun = calculateNextRun(body.schedule);
      }

      if (body.active !== undefined) {
        updates.active = body.active;
      }

      // Update schedule
      const [updated] = await db
        .update(scheduledDeliveries)
        .set(updates)
        .where(eq(scheduledDeliveries.id, id))
        .returning();

      logger.info(`Updated schedule ${id}`);

      return reply.send({
        success: true,
        schedule: updated,
      });
    } catch (error: any) {
      logger.error('Error updating schedule:', error);
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Validation error',
          details: error.errors,
        });
      }
      return reply.status(500).send({
        error: 'Internal server error',
        message: error.message,
      });
    }
  });

  // DELETE /schedules/:id - Delete schedule
  fastify.delete('/schedules/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const deleted = await db
        .delete(scheduledDeliveries)
        .where(eq(scheduledDeliveries.id, id))
        .returning();

      if (deleted.length === 0) {
        return reply.status(404).send({
          error: 'Schedule not found',
        });
      }

      logger.info(`Deleted schedule ${id}`);

      return reply.send({
        success: true,
        message: 'Schedule deleted successfully',
      });
    } catch (error: any) {
      logger.error('Error deleting schedule:', error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: error.message,
      });
    }
  });

  // POST /schedules/:id/run-now - Trigger immediate run
  fastify.post('/schedules/:id/run-now', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      // Check if schedule exists
      const [schedule] = await db
        .select()
        .from(scheduledDeliveries)
        .where(eq(scheduledDeliveries.id, id));

      if (!schedule) {
        return reply.status(404).send({
          error: 'Schedule not found',
        });
      }

      // Execute immediately (don't wait)
      executeScheduledDelivery(id).catch((error) => {
        logger.error(`Error in immediate execution of schedule ${id}:`, error);
      });

      logger.info(`Triggered immediate execution of schedule ${id}`);

      return reply.send({
        success: true,
        message: 'Schedule execution triggered',
        scheduleId: id,
      });
    } catch (error: any) {
      logger.error('Error triggering schedule:', error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: error.message,
      });
    }
  });

  // GET /schedules/:id/preview - Preview next delivery payload
  fastify.get('/schedules/:id/preview', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const result = await getSchedulePreview(id);

      if (!result.success) {
        return reply.status(400).send(result);
      }

      return reply.send(result);
    } catch (error: any) {
      logger.error('Error generating preview:', error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: error.message,
      });
    }
  });

  // GET /schedules/stats - Delivery success rates per platform
  fastify.get('/schedules/stats', async (request, reply) => {
    try {
      const { companyId } = request.query as { companyId?: string };

      // Get statistics
      const statsQuery = db
        .select({
          platform: scheduledDeliveries.platform,
          totalSchedules: sql<number>`count(*)::int`,
          activeSchedules: sql<number>`count(*) filter (where ${scheduledDeliveries.active})::int`,
          successfulRuns: sql<number>`count(*) filter (where ${scheduledDeliveries.lastStatus} = 'success')::int`,
          failedRuns: sql<number>`count(*) filter (where ${scheduledDeliveries.lastStatus} = 'failed')::int`,
        })
        .from(scheduledDeliveries);

      if (companyId) {
        statsQuery.where(eq(scheduledDeliveries.companyId, companyId));
      }

      const stats = await statsQuery.groupBy(scheduledDeliveries.platform);

      return reply.send({
        success: true,
        stats,
      });
    } catch (error: any) {
      logger.error('Error getting stats:', error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: error.message,
      });
    }
  });
};
