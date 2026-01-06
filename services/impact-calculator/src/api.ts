/**
 * VIS (Volunteer Impact Score) API Endpoints
 *
 * REST API for retrieving and recalculating VIS scores
 *
 * @module api
 */

import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Pool } from 'pg';
import { VISCalculator, VISConfig, DEFAULT_VIS_CONFIG } from './vis-calculator.js';

/**
 * API configuration
 */
interface APIConfig {
  port: number;
  host: string;
  databaseUrl: string;
  visConfig?: VISConfig;
}

/**
 * Query parameters for leaderboard endpoint
 */
interface LeaderboardQuery {
  limit?: number;
}

/**
 * Query parameters for percentile endpoint
 */
interface PercentileQuery {
  percentile: number;
}

/**
 * Request body for recalculate endpoint
 */
interface RecalculateBody {
  user_id?: string;
}

/**
 * API response wrapper
 */
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    count?: number;
    duration?: number;
  };
}

/**
 * Create and configure Fastify server for VIS API
 */
export async function createVISAPI(config: APIConfig): Promise<FastifyInstance> {
  const server = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  // Database connection pool
  const pool = new Pool({
    connectionString: config.databaseUrl,
  });

  // VIS Calculator instance
  const visConfig = config.visConfig || DEFAULT_VIS_CONFIG;
  const calculator = new VISCalculator(pool, visConfig);

  // Health check endpoint
  server.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Test database connection
      await pool.query('SELECT 1');

      return reply.send({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'vis-api',
        version: '1.0.0',
      });
    } catch (error) {
      return reply.status(503).send({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get VIS for a specific user
  // GET /api/impact/vis/:user_id
  server.get<{
    Params: { user_id: string };
  }>('/api/impact/vis/:user_id', async (request, reply) => {
    try {
      const { user_id } = request.params;

      const vis = await calculator.getVIS(user_id);

      if (!vis) {
        return reply.status(404).send({
          success: false,
          error: `VIS not found for user: ${user_id}`,
        } as APIResponse<null>);
      }

      return reply.send({
        success: true,
        data: vis,
      } as APIResponse<typeof vis>);
    } catch (error) {
      request.log.error(error, 'Error fetching VIS for user');
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      } as APIResponse<null>);
    }
  });

  // Get leaderboard (top N users)
  // GET /api/impact/vis/leaderboard?limit=100
  server.get<{
    Querystring: LeaderboardQuery;
  }>('/api/impact/vis/leaderboard', async (request, reply) => {
    try {
      const limit = request.query.limit || 100;

      if (limit < 1 || limit > 1000) {
        return reply.status(400).send({
          success: false,
          error: 'Limit must be between 1 and 1000',
        } as APIResponse<null>);
      }

      const leaderboard = await calculator.getLeaderboard(limit);

      return reply.send({
        success: true,
        data: leaderboard,
        meta: {
          count: leaderboard.length,
        },
      } as APIResponse<typeof leaderboard>);
    } catch (error) {
      request.log.error(error, 'Error fetching leaderboard');
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      } as APIResponse<null>);
    }
  });

  // Get users above a specific percentile
  // GET /api/impact/vis/percentile/:percentile
  server.get<{
    Params: { percentile: string };
  }>('/api/impact/vis/percentile/:percentile', async (request, reply) => {
    try {
      const percentile = parseFloat(request.params.percentile);

      if (isNaN(percentile) || percentile < 0 || percentile > 100) {
        return reply.status(400).send({
          success: false,
          error: 'Percentile must be between 0 and 100',
        } as APIResponse<null>);
      }

      const users = await calculator.getUsersAbovePercentile(percentile);

      return reply.send({
        success: true,
        data: users,
        meta: {
          count: users.length,
        },
      } as APIResponse<typeof users>);
    } catch (error) {
      request.log.error(error, 'Error fetching users by percentile');
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      } as APIResponse<null>);
    }
  });

  // Recalculate VIS (batch or single user)
  // POST /api/impact/vis/recalculate
  // Body: { user_id?: string } (optional, if omitted = batch recalculation)
  server.post<{
    Body: RecalculateBody;
  }>('/api/impact/vis/recalculate', async (request, reply) => {
    try {
      const { user_id } = request.body || {};

      if (user_id) {
        // Single user recalculation
        const vis = await calculator.calculateVISForUser(user_id);
        await calculator.saveVIS(vis);

        return reply.send({
          success: true,
          data: vis,
          meta: {
            count: 1,
          },
        } as APIResponse<typeof vis>);
      } else {
        // Batch recalculation for all users
        const result = await calculator.recalculateAll();

        return reply.send({
          success: true,
          data: {
            message: 'VIS recalculated for all users',
            processed: result.processed,
          },
          meta: {
            count: result.processed,
            duration: result.duration,
          },
        } as APIResponse<{ message: string; processed: number }>);
      }
    } catch (error) {
      request.log.error(error, 'Error recalculating VIS');
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      } as APIResponse<null>);
    }
  });

  // Stats endpoint for monitoring
  // GET /api/impact/vis/stats
  server.get('/api/impact/vis/stats', async (request, reply) => {
    try {
      const result = await pool.query(`
        SELECT
          COUNT(*) as total_users,
          AVG(current_vis) as average_vis,
          MAX(current_vis) as max_vis,
          MIN(current_vis) as min_vis,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY current_vis) as median_vis,
          MAX(calculated_at) as last_calculation,
          COUNT(*) FILTER (WHERE last_activity_date > NOW() - INTERVAL '7 days') as active_last_7_days,
          COUNT(*) FILTER (WHERE last_activity_date > NOW() - INTERVAL '30 days') as active_last_30_days
        FROM vis_scores
      `);

      const stats = result.rows[0];

      return reply.send({
        success: true,
        data: {
          total_users: parseInt(stats.total_users),
          average_vis: parseFloat(stats.average_vis || 0),
          max_vis: parseFloat(stats.max_vis || 0),
          min_vis: parseFloat(stats.min_vis || 0),
          median_vis: parseFloat(stats.median_vis || 0),
          last_calculation: stats.last_calculation,
          active_last_7_days: parseInt(stats.active_last_7_days),
          active_last_30_days: parseInt(stats.active_last_30_days),
        },
      } as APIResponse<any>);
    } catch (error) {
      request.log.error(error, 'Error fetching VIS stats');
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      } as APIResponse<null>);
    }
  });

  // Graceful shutdown
  const closeGracefully = async (signal: string) => {
    server.log.info(`Received signal ${signal}, closing gracefully`);
    await pool.end();
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', () => closeGracefully('SIGINT'));
  process.on('SIGTERM', () => closeGracefully('SIGTERM'));

  return server;
}

/**
 * Start the VIS API server
 */
export async function startVISAPI(config: APIConfig): Promise<void> {
  const server = await createVISAPI(config);

  try {
    await server.listen({ port: config.port, host: config.host });
    server.log.info(`VIS API listening on ${config.host}:${config.port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Main entry point (if run directly)
if (import.meta.url === `file://${process.argv[1]}`) {
  const config: APIConfig = {
    port: parseInt(process.env.PORT || '3012'),
    host: process.env.HOST || '0.0.0.0',
    databaseUrl: process.env.DATABASE_URL || '',
    visConfig: {
      lambda: parseFloat(process.env.VIS_LAMBDA || '0.01'),
      enableDecay: process.env.VIS_ENABLE_DECAY !== 'false',
    },
  };

  startVISAPI(config).catch(console.error);
}
