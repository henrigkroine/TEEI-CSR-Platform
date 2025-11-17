/**
 * Impact Tiles API Routes
 * GET /tiles/:tileType - Get specific tile data
 * GET /tiles/company/:companyId - Get all tiles for a company
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  aggregateLanguageTile,
  aggregateMentorshipTile,
  aggregateUpskillingTile,
  aggregateWEEITile,
} from '../tiles/index.js';
import type { ImpactTile, TileResponse, TileListResponse } from '@teei/shared-types';
import { cacheMiddleware, cacheKeyGenerators, TTL } from '../middleware/cache.js';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('tiles-routes');

/**
 * Query schema for tile requests
 */
const TileQuerySchema = z.object({
  companyId: z.string().uuid(),
  period: z.enum(['week', 'month', 'quarter', 'year']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * Calculate period dates
 */
function calculatePeriodDates(
  period?: string,
  startDate?: string,
  endDate?: string
): { periodStart: string; periodEnd: string } {
  const now = new Date();

  // If custom dates provided, use them
  if (startDate && endDate) {
    return { periodStart: startDate, periodEnd: endDate };
  }

  // Default to month if no period specified
  const selectedPeriod = period || 'month';

  let periodStart: Date;
  const periodEnd = now;

  switch (selectedPeriod) {
    case 'week':
      periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter':
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      periodStart = new Date(now.getFullYear(), quarterStartMonth, 1);
      break;
    case 'year':
      periodStart = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
  };
}

/**
 * Check tile entitlement (feature flag)
 * TODO: Implement actual feature flag checking from database
 */
async function checkTileEntitlement(
  companyId: string,
  tileType: string
): Promise<{ enabled: boolean; tier: string }> {
  // For now, enable all tiles for all companies
  // In production, this would check the entitlements table
  return {
    enabled: true,
    tier: 'enterprise', // 'basic' | 'premium' | 'enterprise'
  };
}

/**
 * Tile Routes
 */
export const tilesRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /tiles/:tileType
   * Get a specific tile by type
   */
  fastify.get<{
    Params: { tileType: string };
    Querystring: { companyId: string; period?: string; startDate?: string; endDate?: string };
  }>(
    '/:tileType',
    {
      preHandler: cacheMiddleware({
        keyGenerator: (req) =>
          `tile:${req.params.tileType}:${req.query.companyId}:${req.query.period || 'month'}`,
        ttl: TTL.TEN_MINUTES, // Tiles cached for 10 minutes
      }),
    },
    async (request, reply) => {
      const { tileType } = request.params;
      const startTime = Date.now();

      try {
        // Validate query params
        const query = TileQuerySchema.parse(request.query);
        const { companyId, period, startDate, endDate } = query;

        // Validate tile type
        const validTileTypes = ['language', 'mentorship', 'upskilling', 'weei'];
        if (!validTileTypes.includes(tileType)) {
          return reply.code(400).send({
            error: 'Invalid tile type',
            message: `Tile type must be one of: ${validTileTypes.join(', ')}`,
          });
        }

        // Check entitlement
        const entitlement = await checkTileEntitlement(companyId, tileType);
        if (!entitlement.enabled) {
          return reply.code(403).send({
            error: 'Tile not available',
            message: `The ${tileType} tile is not available for your subscription tier`,
          });
        }

        // Calculate period
        const { periodStart, periodEnd } = calculatePeriodDates(period, startDate, endDate);

        logger.info({ companyId, tileType, periodStart, periodEnd }, 'Fetching tile data');

        // Aggregate tile data
        let tile: ImpactTile;
        switch (tileType) {
          case 'language':
            tile = await aggregateLanguageTile({ companyId, periodStart, periodEnd });
            break;
          case 'mentorship':
            tile = await aggregateMentorshipTile({ companyId, periodStart, periodEnd });
            break;
          case 'upskilling':
            tile = await aggregateUpskillingTile({ companyId, periodStart, periodEnd });
            break;
          case 'weei':
            tile = await aggregateWEEITile({ companyId, periodStart, periodEnd });
            break;
          default:
            throw new Error(`Unsupported tile type: ${tileType}`);
        }

        const duration = Date.now() - startTime;
        const cacheHit = reply.getHeader('X-Cache-Status') === 'HIT';

        const response: TileResponse = {
          tile,
          metadata: {
            companyId,
            generatedAt: new Date().toISOString(),
            cacheHit,
            queryDurationMs: duration,
          },
        };

        // Log performance
        if (duration > 150) {
          logger.warn(
            { companyId, tileType, duration },
            'Tile query exceeded p95 target (150ms)'
          );
        }

        return response;
      } catch (error) {
        logger.error({ error, tileType }, 'Failed to fetch tile data');
        return reply.code(500).send({
          error: 'Failed to fetch tile',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * GET /tiles/company/:companyId
   * Get all available tiles for a company
   */
  fastify.get<{
    Params: { companyId: string };
    Querystring: { period?: string; startDate?: string; endDate?: string };
  }>('/company/:companyId', async (request, reply) => {
    const { companyId } = request.params;
    const { period, startDate, endDate } = request.query;

    try {
      // Calculate period
      const { periodStart, periodEnd } = calculatePeriodDates(period, startDate, endDate);

      logger.info({ companyId, periodStart, periodEnd }, 'Fetching all tiles');

      // Aggregate all tile types in parallel
      const [languageTile, mentorshipTile, upskillingTile, weeiTile] = await Promise.all([
        aggregateLanguageTile({ companyId, periodStart, periodEnd }).catch((err) => {
          logger.warn({ error: err, companyId }, 'Failed to aggregate language tile');
          return null;
        }),
        aggregateMentorshipTile({ companyId, periodStart, periodEnd }).catch((err) => {
          logger.warn({ error: err, companyId }, 'Failed to aggregate mentorship tile');
          return null;
        }),
        aggregateUpskillingTile({ companyId, periodStart, periodEnd }).catch((err) => {
          logger.warn({ error: err, companyId }, 'Failed to aggregate upskilling tile');
          return null;
        }),
        aggregateWEEITile({ companyId, periodStart, periodEnd }).catch((err) => {
          logger.warn({ error: err, companyId }, 'Failed to aggregate WEEI tile');
          return null;
        }),
      ]);

      // Filter out null tiles (failed aggregations)
      const tiles: ImpactTile[] = [
        languageTile,
        mentorshipTile,
        upskillingTile,
        weeiTile,
      ].filter((t): t is ImpactTile => t !== null);

      const response: TileListResponse = {
        tiles,
        metadata: {
          companyId,
          count: tiles.length,
          generatedAt: new Date().toISOString(),
        },
      };

      return response;
    } catch (error) {
      logger.error({ error, companyId }, 'Failed to fetch all tiles');
      return reply.code(500).send({
        error: 'Failed to fetch tiles',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /tiles/entitlements/:companyId
   * Get tile entitlements for a company
   */
  fastify.get<{
    Params: { companyId: string };
  }>('/entitlements/:companyId', async (request, reply) => {
    const { companyId } = request.params;

    try {
      const tileTypes = ['language', 'mentorship', 'upskilling', 'weei'];
      const entitlements = await Promise.all(
        tileTypes.map(async (tileType) => {
          const entitlement = await checkTileEntitlement(companyId, tileType);
          return {
            companyId,
            tileType,
            ...entitlement,
          };
        })
      );

      return {
        companyId,
        entitlements,
      };
    } catch (error) {
      logger.error({ error, companyId }, 'Failed to fetch entitlements');
      return reply.code(500).send({
        error: 'Failed to fetch entitlements',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
};
