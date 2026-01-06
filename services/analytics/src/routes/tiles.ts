import { FastifyPluginAsync } from 'fastify';
import {
  aggregateLanguageTile,
  aggregateMentorshipTile,
  aggregateUpskillingTile,
  aggregateWEEITile,
} from '../tiles/index.js';
import { cacheMiddleware, cacheKeyGenerators, TTL } from '../middleware/cache.js';
import { GetTileRequest, GetTileResponse, GetTilesListResponse } from '@teei/shared-types';

/**
 * Impact Tiles API Routes
 * Pre-wired tiles for TEEI programs: Language, Mentorship, Upskilling, WEEI
 */
export const tilesRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /tiles/:tileType
   * Get a specific impact tile for a company
   *
   * @param tileType - Type of tile (language, mentorship, upskilling, weei)
   * @query companyId - UUID of the company (tenant scope)
   * @query startDate - Optional start date (ISO format YYYY-MM-DD)
   * @query endDate - Optional end date (ISO format YYYY-MM-DD)
   */
  fastify.get<{
    Params: { tileType: string };
    Querystring: { companyId: string; startDate?: string; endDate?: string };
  }>(
    '/:tileType',
    {
      preHandler: cacheMiddleware({
        keyGenerator: (request) => {
          const { tileType } = request.params as any;
          const { companyId, startDate, endDate } = request.query as any;
          return `tiles:${tileType}:${companyId}:${startDate || 'default'}:${endDate || 'default'}`;
        },
        ttl: TTL.ONE_HOUR, // Cache for 1 hour
      }),
    },
    async (request, reply) => {
      const { tileType } = request.params;
      const { companyId, startDate, endDate } = request.query;

      // Validate tile type
      const validTileTypes = ['language', 'mentorship', 'upskilling', 'weei'];
      if (!validTileTypes.includes(tileType)) {
        return reply.code(400).send({
          error: 'Invalid tile type',
          message: `Tile type must be one of: ${validTileTypes.join(', ')}`,
        });
      }

      // Validate companyId
      if (!companyId) {
        return reply.code(400).send({
          error: 'Missing companyId',
          message: 'companyId query parameter is required',
        });
      }

      // Build period
      const period = startDate && endDate ? { start: startDate, end: endDate } : undefined;

      try {
        let tile;

        // Aggregate tile based on type
        switch (tileType) {
          case 'language':
            tile = await aggregateLanguageTile(companyId, period);
            break;
          case 'mentorship':
            tile = await aggregateMentorshipTile(companyId, period);
            break;
          case 'upskilling':
            tile = await aggregateUpskillingTile(companyId, period);
            break;
          case 'weei':
            tile = await aggregateWEEITile(companyId, period);
            break;
          default:
            return reply.code(400).send({
              error: 'Invalid tile type',
            });
        }

        // TODO: Check entitlements based on company tier/plan
        // For now, return default entitlements
        const entitlements = {
          canExport: true,
          canViewDetails: true,
          canViewBenchmarks: false, // Premium feature
        };

        const response: GetTileResponse = {
          tile,
          entitlements,
          cacheTTL: TTL.ONE_HOUR,
        };

        return response;
      } catch (error) {
        fastify.log.error({ error, tileType, companyId }, 'Error aggregating tile');
        return reply.code(500).send({
          error: 'Failed to aggregate tile',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * GET /tiles
   * Get all available tiles for a company
   *
   * @query companyId - UUID of the company (tenant scope)
   * @query startDate - Optional start date (ISO format YYYY-MM-DD)
   * @query endDate - Optional end date (ISO format YYYY-MM-DD)
   * @query types - Optional comma-separated list of tile types to fetch
   */
  fastify.get<{
    Querystring: {
      companyId: string;
      startDate?: string;
      endDate?: string;
      types?: string;
    };
  }>(
    '/',
    {
      preHandler: cacheMiddleware({
        keyGenerator: (request) => {
          const { companyId, startDate, endDate, types } = request.query as any;
          return `tiles:all:${companyId}:${startDate || 'default'}:${endDate || 'default'}:${types || 'all'}`;
        },
        ttl: TTL.ONE_HOUR,
      }),
    },
    async (request, reply) => {
      const { companyId, startDate, endDate, types } = request.query;

      // Validate companyId
      if (!companyId) {
        return reply.code(400).send({
          error: 'Missing companyId',
          message: 'companyId query parameter is required',
        });
      }

      // Build period
      const period = startDate && endDate ? { start: startDate, end: endDate } : undefined;

      // Determine which tiles to fetch
      const requestedTypes = types
        ? types.split(',').map((t) => t.trim())
        : ['language', 'mentorship', 'upskilling', 'weei'];

      const validTileTypes = ['language', 'mentorship', 'upskilling', 'weei'];
      const invalidTypes = requestedTypes.filter((t) => !validTileTypes.includes(t));
      if (invalidTypes.length > 0) {
        return reply.code(400).send({
          error: 'Invalid tile types',
          message: `Invalid tile types: ${invalidTypes.join(', ')}. Must be one of: ${validTileTypes.join(', ')}`,
        });
      }

      try {
        // Fetch all requested tiles in parallel
        const tilePromises = requestedTypes.map(async (tileType) => {
          switch (tileType) {
            case 'language':
              return await aggregateLanguageTile(companyId, period);
            case 'mentorship':
              return await aggregateMentorshipTile(companyId, period);
            case 'upskilling':
              return await aggregateUpskillingTile(companyId, period);
            case 'weei':
              return await aggregateWEEITile(companyId, period);
            default:
              return null;
          }
        });

        const tiles = (await Promise.all(tilePromises)).filter((t) => t !== null);

        // Determine actual period used (from first tile if available)
        const actualPeriod = tiles.length > 0
          ? tiles[0]!.metadata.period
          : period || { start: '', end: '' };

        const response: GetTilesListResponse = {
          companyId,
          tiles,
          availableTileTypes: requestedTypes as any,
          period: actualPeriod,
        };

        return response;
      } catch (error) {
        fastify.log.error({ error, companyId }, 'Error aggregating tiles');
        return reply.code(500).send({
          error: 'Failed to aggregate tiles',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * GET /tiles/health
   * Health check endpoint for tiles service
   */
  fastify.get('/tiles/health', async (request, reply) => {
    return {
      status: 'healthy',
      availableTileTypes: ['language', 'mentorship', 'upskilling', 'weei'],
      timestamp: new Date().toISOString(),
    };
  });
};
