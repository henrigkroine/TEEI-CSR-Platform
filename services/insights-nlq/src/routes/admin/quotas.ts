/**
 * Admin Quota Management Endpoints
 *
 * Provides administrative control over NLQ rate limiting:
 * - View quota usage and limits for companies
 * - Update quota limits (permanent or temporary)
 * - Reset quotas manually
 * - View quota statistics and violations
 *
 * Authentication: Requires admin role
 * Rate Limiting: Bypassed for admin endpoints
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getNLQRateLimiter, AdminQuotaUpdate } from '../../lib/rate-limiter.js';
import { validateRequest } from '../../middleware/error-handler.js';

// Simple logger for now
const logger = {
  info: (...args: any[]) => console.log('[INFO]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
};

// ===== REQUEST SCHEMAS =====

const GetQuotaSchema = z.object({
  companyId: z.string().uuid(),
});

const UpdateQuotaLimitsSchema = z.object({
  companyId: z.string().uuid(),
  dailyQueryLimit: z.number().int().positive().optional(),
  hourlyQueryLimit: z.number().int().positive().optional(),
  concurrentQueryLimit: z.number().int().positive().optional(),
  reason: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

const ResetQuotaSchema = z.object({
  companyId: z.string().uuid(),
});

const BulkUpdateSchema = z.object({
  companyIds: z.array(z.string().uuid()),
  dailyQueryLimit: z.number().int().positive().optional(),
  hourlyQueryLimit: z.number().int().positive().optional(),
  concurrentQueryLimit: z.number().int().positive().optional(),
  reason: z.string(),
});

// ===== TYPE DEFINITIONS =====

type GetQuotaParams = z.infer<typeof GetQuotaSchema>;
type UpdateQuotaLimitsBody = z.infer<typeof UpdateQuotaLimitsSchema>;
type ResetQuotaBody = z.infer<typeof ResetQuotaSchema>;
type BulkUpdateBody = z.infer<typeof BulkUpdateSchema>;

// ===== ROUTE HANDLERS =====

/**
 * GET /admin/quotas/:companyId
 * Get quota information for a specific company
 */
async function getQuotaHandler(
  request: FastifyRequest<{ Params: GetQuotaParams }>,
  reply: FastifyReply
) {
  const { companyId } = validateRequest(request.params, GetQuotaSchema);

  try {
    const rateLimiter = getNLQRateLimiter();
    const quotaInfo = await rateLimiter.getRemainingQuota(companyId);

    logger.info('Retrieved quota information', { companyId });

    return {
      success: true,
      data: {
        companyId: quotaInfo.companyId,
        daily: {
          limit: quotaInfo.dailyLimit,
          used: quotaInfo.dailyUsed,
          remaining: quotaInfo.dailyRemaining,
          resetAt: quotaInfo.dailyResetAt,
          utilizationPercent: Math.round((quotaInfo.dailyUsed / quotaInfo.dailyLimit) * 100),
        },
        hourly: {
          limit: quotaInfo.hourlyLimit,
          used: quotaInfo.hourlyUsed,
          remaining: quotaInfo.hourlyRemaining,
          resetAt: quotaInfo.hourlyResetAt,
          utilizationPercent: Math.round((quotaInfo.hourlyUsed / quotaInfo.hourlyLimit) * 100),
        },
        concurrent: {
          limit: quotaInfo.concurrentLimit,
          used: quotaInfo.concurrentUsed,
          remaining: quotaInfo.concurrentRemaining,
          utilizationPercent: Math.round((quotaInfo.concurrentUsed / quotaInfo.concurrentLimit) * 100),
        },
        violations: {
          count: quotaInfo.limitExceededCount,
          lastExceededAt: quotaInfo.lastLimitExceededAt,
        },
      },
    };
  } catch (error) {
    logger.error('Failed to get quota information', { companyId, error });
    throw error;
  }
}

/**
 * PUT /admin/quotas
 * Update quota limits for a company
 */
async function updateQuotaLimitsHandler(
  request: FastifyRequest<{ Body: UpdateQuotaLimitsBody }>,
  reply: FastifyReply
) {
  const updateData = validateRequest(request.body, UpdateQuotaLimitsSchema);

  try {
    const rateLimiter = getNLQRateLimiter();

    // Build admin update object
    const adminUpdate: AdminQuotaUpdate = {
      companyId: updateData.companyId,
      dailyQueryLimit: updateData.dailyQueryLimit,
      hourlyQueryLimit: updateData.hourlyQueryLimit,
      concurrentQueryLimit: updateData.concurrentQueryLimit,
      reason: updateData.reason,
      expiresAt: updateData.expiresAt ? new Date(updateData.expiresAt) : undefined,
    };

    await rateLimiter.updateQuotaLimits(adminUpdate);

    // Get updated quota info
    const quotaInfo = await rateLimiter.getRemainingQuota(updateData.companyId);

    logger.info('Updated quota limits', {
      companyId: updateData.companyId,
      update: adminUpdate,
      adminUser: (request as any).user?.email,
    });

    return {
      success: true,
      message: 'Quota limits updated successfully',
      data: {
        companyId: quotaInfo.companyId,
        limits: {
          daily: quotaInfo.dailyLimit,
          hourly: quotaInfo.hourlyLimit,
          concurrent: quotaInfo.concurrentLimit,
        },
        expiresAt: adminUpdate.expiresAt,
      },
    };
  } catch (error) {
    logger.error('Failed to update quota limits', { update: updateData, error });
    throw error;
  }
}

/**
 * POST /admin/quotas/reset
 * Reset quota usage for a company (admin emergency action)
 */
async function resetQuotaHandler(
  request: FastifyRequest<{ Body: ResetQuotaBody }>,
  reply: FastifyReply
) {
  const { companyId } = validateRequest(request.body, ResetQuotaSchema);

  try {
    const rateLimiter = getNLQRateLimiter();

    await rateLimiter.resetCompanyQuota(companyId);

    // Get fresh quota info
    const quotaInfo = await rateLimiter.getRemainingQuota(companyId);

    logger.warn('Admin quota reset performed', {
      companyId,
      adminUser: (request as any).user?.email,
      timestamp: new Date(),
    });

    return {
      success: true,
      message: 'Quota reset successfully',
      data: {
        companyId: quotaInfo.companyId,
        daily: {
          used: quotaInfo.dailyUsed,
          remaining: quotaInfo.dailyRemaining,
        },
        hourly: {
          used: quotaInfo.hourlyUsed,
          remaining: quotaInfo.hourlyRemaining,
        },
        concurrent: {
          used: quotaInfo.concurrentUsed,
          remaining: quotaInfo.concurrentRemaining,
        },
      },
    };
  } catch (error) {
    logger.error('Failed to reset quota', { companyId, error });
    throw error;
  }
}

/**
 * POST /admin/quotas/bulk-update
 * Update quota limits for multiple companies at once
 */
async function bulkUpdateQuotasHandler(
  request: FastifyRequest<{ Body: BulkUpdateBody }>,
  reply: FastifyReply
) {
  const bulkUpdate = validateRequest(request.body, BulkUpdateSchema);

  try {
    const rateLimiter = getNLQRateLimiter();
    const results: Array<{ companyId: string; success: boolean; error?: string }> = [];

    // Process each company
    for (const companyId of bulkUpdate.companyIds) {
      try {
        const adminUpdate: AdminQuotaUpdate = {
          companyId,
          dailyQueryLimit: bulkUpdate.dailyQueryLimit,
          hourlyQueryLimit: bulkUpdate.hourlyQueryLimit,
          concurrentQueryLimit: bulkUpdate.concurrentQueryLimit,
          reason: bulkUpdate.reason,
        };

        await rateLimiter.updateQuotaLimits(adminUpdate);

        results.push({ companyId, success: true });
      } catch (error) {
        results.push({
          companyId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    logger.info('Bulk quota update completed', {
      totalCompanies: bulkUpdate.companyIds.length,
      successCount,
      failureCount,
      update: bulkUpdate,
      adminUser: (request as any).user?.email,
    });

    return {
      success: true,
      message: `Bulk update completed: ${successCount} succeeded, ${failureCount} failed`,
      data: {
        totalCompanies: bulkUpdate.companyIds.length,
        successCount,
        failureCount,
        results,
      },
    };
  } catch (error) {
    logger.error('Failed to perform bulk update', { update: bulkUpdate, error });
    throw error;
  }
}

/**
 * GET /admin/quotas/violations
 * Get companies that have exceeded quotas recently
 */
async function getViolationsHandler(
  request: FastifyRequest<{
    Querystring: { limit?: string; minCount?: string };
  }>,
  reply: FastifyReply
) {
  const limit = parseInt((request.query as any).limit || '50', 10);
  const minCount = parseInt((request.query as any).minCount || '1', 10);

  try {
    // This would query the database for companies with violations
    // For now, returning a placeholder
    logger.info('Retrieved quota violations', { limit, minCount });

    return {
      success: true,
      message: 'Quota violations endpoint - implementation pending',
      data: {
        violations: [],
        totalCount: 0,
      },
    };
  } catch (error) {
    logger.error('Failed to get violations', { error });
    throw error;
  }
}

/**
 * GET /admin/quotas/stats
 * Get overall quota usage statistics
 */
async function getStatsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const rateLimiter = getNLQRateLimiter();

    // This would aggregate statistics across all companies
    // For now, returning a placeholder
    logger.info('Retrieved quota statistics');

    return {
      success: true,
      data: {
        totalCompanies: 0,
        averageUtilization: {
          daily: 0,
          hourly: 0,
          concurrent: 0,
        },
        topConsumers: [],
        recentViolations: [],
      },
    };
  } catch (error) {
    logger.error('Failed to get stats', { error });
    throw error;
  }
}

/**
 * POST /admin/quotas/sync
 * Manually trigger Redis to PostgreSQL sync
 */
async function syncHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const rateLimiter = getNLQRateLimiter();
    await rateLimiter.syncToDatabase();

    logger.info('Manual quota sync triggered', {
      adminUser: (request as any).user?.email,
    });

    return {
      success: true,
      message: 'Quota sync completed successfully',
      timestamp: new Date(),
    };
  } catch (error) {
    logger.error('Failed to sync quotas', { error });
    throw error;
  }
}

// ===== ROUTE REGISTRATION =====

/**
 * Register all admin quota routes
 */
export async function registerAdminQuotaRoutes(fastify: FastifyInstance): Promise<void> {
  // Get quota for a specific company
  fastify.get('/admin/quotas/:companyId', getQuotaHandler);

  // Update quota limits
  fastify.put('/admin/quotas', updateQuotaLimitsHandler);

  // Reset quota usage
  fastify.post('/admin/quotas/reset', resetQuotaHandler);

  // Bulk update quotas
  fastify.post('/admin/quotas/bulk-update', bulkUpdateQuotasHandler);

  // Get violations
  fastify.get('/admin/quotas/violations', getViolationsHandler);

  // Get statistics
  fastify.get('/admin/quotas/stats', getStatsHandler);

  // Manual sync trigger
  fastify.post('/admin/quotas/sync', syncHandler);

  logger.info('Admin quota routes registered');
}
