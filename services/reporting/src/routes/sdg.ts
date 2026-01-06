import type { FastifyInstance } from 'fastify';
import { getSDGDistribution, getSDGCoverageReport, getEventsBySDG, getQuarterlySDGReport, getSDGBreakdownByEventType } from '../../../buddy-connector/src/utils/sdg-queries.js';
import { getAllCoveredSDGs, getSDGReference } from '../../../buddy-connector/src/utils/sdg-tagger.js';

export async function sdgRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/impact/sdgs/distribution
   * Get SDG distribution for a time period
   */
  fastify.get(
    '/api/impact/sdgs/distribution',
    {
      schema: {
        description: 'Get SDG distribution showing event counts per SDG goal',
        tags: ['SDG', 'Impact'],
        querystring: {
          type: 'object',
          properties: {
            start_date: { type: 'string', format: 'date', description: 'Start date (ISO 8601)' },
            end_date: { type: 'string', format: 'date', description: 'End date (ISO 8601)' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              distribution: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    sdg: { type: 'number' },
                    name: { type: 'string' },
                    description: { type: 'string' },
                    event_count: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { start_date, end_date } = request.query as { start_date?: string; end_date?: string };

      const startDate = start_date ? new Date(start_date) : undefined;
      const endDate = end_date ? new Date(end_date) : undefined;

      const distribution = await getSDGDistribution(startDate, endDate);

      return reply.send({ distribution });
    }
  );

  /**
   * GET /api/impact/sdgs/coverage
   * Get comprehensive SDG coverage report
   */
  fastify.get(
    '/api/impact/sdgs/coverage',
    {
      schema: {
        description: 'Get comprehensive SDG coverage report with event counts and covered goals',
        tags: ['SDG', 'Impact'],
        querystring: {
          type: 'object',
          properties: {
            start_date: { type: 'string', format: 'date' },
            end_date: { type: 'string', format: 'date' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              period: { type: 'string' },
              program: { type: 'string' },
              total_events: { type: 'number' },
              sdg_coverage: { type: 'object' },
              covered_sdgs: { type: 'array', items: { type: 'number' } },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { start_date, end_date } = request.query as { start_date?: string; end_date?: string };

      const startDate = start_date ? new Date(start_date) : undefined;
      const endDate = end_date ? new Date(end_date) : undefined;

      const report = await getSDGCoverageReport(startDate, endDate);

      return reply.send(report);
    }
  );

  /**
   * GET /api/impact/sdgs/quarterly/:year/:quarter
   * Get quarterly SDG report (Q1, Q2, Q3, Q4)
   */
  fastify.get<{
    Params: { year: string; quarter: string };
  }>(
    '/api/impact/sdgs/quarterly/:year/:quarter',
    {
      schema: {
        description: 'Get quarterly SDG coverage report (Q1-Q4)',
        tags: ['SDG', 'Impact'],
        params: {
          type: 'object',
          required: ['year', 'quarter'],
          properties: {
            year: { type: 'string', pattern: '^[0-9]{4}$' },
            quarter: { type: 'string', enum: ['1', '2', '3', '4'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              period: { type: 'string' },
              program: { type: 'string' },
              total_events: { type: 'number' },
              sdg_coverage: { type: 'object' },
              covered_sdgs: { type: 'array', items: { type: 'number' } },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { year, quarter } = request.params;

      const yearNum = parseInt(year, 10);
      const quarterNum = parseInt(quarter, 10) as 1 | 2 | 3 | 4;

      const report = await getQuarterlySDGReport(yearNum, quarterNum);

      return reply.send(report);
    }
  );

  /**
   * GET /api/impact/sdgs/:goal_number/events
   * Get events for a specific SDG goal
   */
  fastify.get<{
    Params: { goal_number: string };
    Querystring: {
      start_date?: string;
      end_date?: string;
      event_type?: string;
      limit?: string;
      offset?: string;
    };
  }>(
    '/api/impact/sdgs/:goal_number/events',
    {
      schema: {
        description: 'Get events tagged with a specific SDG goal',
        tags: ['SDG', 'Impact'],
        params: {
          type: 'object',
          required: ['goal_number'],
          properties: {
            goal_number: { type: 'string', pattern: '^[0-9]+$' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            start_date: { type: 'string', format: 'date' },
            end_date: { type: 'string', format: 'date' },
            event_type: { type: 'string' },
            limit: { type: 'string', pattern: '^[0-9]+$' },
            offset: { type: 'string', pattern: '^[0-9]+$' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              sdg: { type: 'number' },
              events: { type: 'array' },
              total_returned: { type: 'number' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { goal_number } = request.params;
      const { start_date, end_date, event_type, limit, offset } = request.query;

      const sdg = parseInt(goal_number, 10);
      const startDate = start_date ? new Date(start_date) : undefined;
      const endDate = end_date ? new Date(end_date) : undefined;
      const limitNum = limit ? parseInt(limit, 10) : 100;
      const offsetNum = offset ? parseInt(offset, 10) : 0;

      const events = await getEventsBySDG({
        sdg,
        startDate,
        endDate,
        eventType: event_type,
        limit: limitNum,
        offset: offsetNum,
      });

      return reply.send({
        sdg,
        events,
        total_returned: events.length,
      });
    }
  );

  /**
   * GET /api/impact/sdgs/:goal_number/breakdown
   * Get breakdown of event types contributing to a specific SDG
   */
  fastify.get<{
    Params: { goal_number: string };
    Querystring: {
      start_date?: string;
      end_date?: string;
    };
  }>(
    '/api/impact/sdgs/:goal_number/breakdown',
    {
      schema: {
        description: 'Get breakdown of event types contributing to a specific SDG goal',
        tags: ['SDG', 'Impact'],
        params: {
          type: 'object',
          required: ['goal_number'],
          properties: {
            goal_number: { type: 'string', pattern: '^[0-9]+$' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            start_date: { type: 'string', format: 'date' },
            end_date: { type: 'string', format: 'date' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              sdg: { type: 'number' },
              breakdown: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    event_type: { type: 'string' },
                    count: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { goal_number } = request.params;
      const { start_date, end_date } = request.query;

      const sdg = parseInt(goal_number, 10);
      const startDate = start_date ? new Date(start_date) : undefined;
      const endDate = end_date ? new Date(end_date) : undefined;

      const breakdown = await getSDGBreakdownByEventType(sdg, startDate, endDate);

      return reply.send({ sdg, breakdown });
    }
  );

  /**
   * GET /api/impact/sdgs/reference
   * Get SDG reference information for all mapped goals
   */
  fastify.get(
    '/api/impact/sdgs/reference',
    {
      schema: {
        description: 'Get reference information for all UN SDGs covered by the buddy program',
        tags: ['SDG', 'Impact'],
        response: {
          200: {
            type: 'object',
            properties: {
              covered_sdgs: { type: 'array', items: { type: 'number' } },
              sdg_details: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    sdg: { type: 'number' },
                    name: { type: 'string' },
                    description: { type: 'string' },
                    icon: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const coveredSDGs = getAllCoveredSDGs();
      const sdgDetails = coveredSDGs.map(sdg => ({
        sdg,
        ...getSDGReference(sdg),
      }));

      return reply.send({
        covered_sdgs: coveredSDGs,
        sdg_details: sdgDetails,
      });
    }
  );
}
