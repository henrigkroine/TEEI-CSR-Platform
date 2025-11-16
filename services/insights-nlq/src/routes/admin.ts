/**
 * Admin Routes for Insights NLQ Service
 *
 * Provides administrative endpoints for service management.
 * All routes require admin role.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAdmin } from '../middleware/auth.js';
import { clearCache, getCacheStats } from '../cache/redis.js';
import { getPostgres } from '../lib/postgres.js';

/**
 * Register admin routes
 */
export async function adminRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /admin/stats
   * Get service statistics
   */
  app.get(
    '/admin/stats',
    {
      onRequest: [requireAdmin],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const sql = getPostgres();

      // Get query statistics from database
      const [queryStats] = await sql`
        SELECT
          COUNT(*) as total_queries,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT company_id) as unique_companies,
          AVG(execution_time_ms) as avg_execution_time,
          MAX(execution_time_ms) as max_execution_time,
          SUM(CASE WHEN cached THEN 1 ELSE 0 END) as cached_queries,
          SUM(CASE WHEN error IS NOT NULL THEN 1 ELSE 0 END) as failed_queries
        FROM nlq_query_history
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `;

      // Get cache stats
      const cacheStats = await getCacheStats();

      return {
        success: true,
        stats: {
          queries: queryStats,
          cache: cacheStats,
          timestamp: new Date().toISOString(),
        },
      };
    }
  );

  /**
   * GET /admin/queries
   * Get recent queries (for debugging/monitoring)
   */
  app.get(
    '/admin/queries',
    {
      onRequest: [requireAdmin],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { limit = 50, offset = 0 } = request.query as {
        limit?: number;
        offset?: number;
      };

      const sql = getPostgres();

      const queries = await sql`
        SELECT
          id,
          user_id,
          company_id,
          question,
          execution_time_ms,
          cached,
          error,
          created_at
        FROM nlq_query_history
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      const [{ total }] = await sql`
        SELECT COUNT(*) as total
        FROM nlq_query_history
      `;

      return {
        success: true,
        queries,
        pagination: {
          limit,
          offset,
          total: Number(total),
        },
      };
    }
  );

  /**
   * POST /admin/cache/clear
   * Clear all cache entries
   */
  app.post(
    '/admin/cache/clear',
    {
      onRequest: [requireAdmin],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const deletedKeys = await clearCache();

      request.log.info({ deletedKeys }, 'Cache cleared by admin');

      return {
        success: true,
        message: `Cleared ${deletedKeys} cache entries`,
        deletedKeys,
        timestamp: new Date().toISOString(),
      };
    }
  );
}
