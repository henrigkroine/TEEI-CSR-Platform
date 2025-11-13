import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { EvidenceLineageSchema, type EvidenceLineage } from '@teei/shared-types';
import { tenantScoped } from '../middleware/tenantScope';
import { requireFeature, FEATURE_FLAGS } from '../utils/featureFlags';

/**
 * Lineage API Routes
 * Provides evidence traceability from metrics → outcome scores → evidence snippets
 */
export async function lineageRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/lineage/:metricId
   * Get evidence lineage for a specific metric
   * Shows the full chain: metric → aggregation → outcome scores → evidence snippets
   *
   * Supported metricIds:
   * - sroi: Social Return on Investment
   * - vis: Value of Integration Score
   * - integration_score: Overall integration score
   * - confidence_score: Aggregated confidence metric
   * - belonging_score: Aggregated belonging metric
   */
  fastify.get<{
    Params: {
      metricId: string;
    };
    Querystring: {
      startDate?: string;
      endDate?: string;
    };
    Reply: EvidenceLineage;
  }>(
    '/api/lineage/:metricId',
    {
      preHandler: [
        tenantScoped.preHandler,
        requireFeature(FEATURE_FLAGS.EVIDENCE_LINEAGE),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = (request as any).tenantId;
        const { metricId } = request.params as any;
        const { startDate, endDate } = request.query as any;

        // Validate metric ID
        const validMetrics = [
          'sroi',
          'vis',
          'integration_score',
          'confidence_score',
          'belonging_score',
        ];

        if (!validMetrics.includes(metricId)) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: `Invalid metric ID. Supported: ${validMetrics.join(', ')}`,
          });
        }

        // TODO: Replace with actual database query that traces lineage
        // const lineage = await buildLineageChain(tenantId, metricId, startDate, endDate);

        // Mock lineage data
        const mockLineage: EvidenceLineage = {
          metricId,
          metricName: metricId === 'sroi' ? 'Social Return on Investment' : 'Integration Score',
          metricValue: metricId === 'sroi' ? 3.2 : 0.78,
          aggregationMethod: 'weighted_average',
          evidenceChain: [
            // Level 3: Top-level metric
            {
              level: 3,
              type: 'metric',
              id: metricId,
              description: `${
                metricId === 'sroi' ? 'SROI ratio 3.2x' : 'Integration score 0.78'
              } calculated from outcome scores`,
              contributionWeight: 1.0,
            },
            // Level 2: Outcome scores
            {
              level: 2,
              type: 'outcome_score',
              id: '770e8400-e29b-41d4-a716-446655440003',
              description: 'Confidence score: 0.85 (confidence: 0.92)',
              contributionWeight: 0.35,
            },
            {
              level: 2,
              type: 'outcome_score',
              id: '880e8400-e29b-41d4-a716-446655440004',
              description: 'Belonging score: 0.78 (confidence: 0.87)',
              contributionWeight: 0.25,
            },
            {
              level: 2,
              type: 'outcome_score',
              id: '990e8400-e29b-41d4-a716-446655440007',
              description: 'Language level proxy: 0.92 (confidence: 0.95)',
              contributionWeight: 0.30,
            },
            {
              level: 2,
              type: 'outcome_score',
              id: 'aa0e8400-e29b-41d4-a716-446655440008',
              description: 'Confidence score: 0.81 (confidence: 0.89)',
              contributionWeight: 0.10,
            },
            // Level 1: Evidence snippets
            {
              level: 1,
              type: 'evidence_snippet',
              id: '550e8400-e29b-41d4-a716-446655440001',
              description:
                'Buddy feedback: "I feel more confident speaking in meetings now. My mentor helped me practice."',
              contributionWeight: 0.45,
            },
            {
              level: 1,
              type: 'evidence_snippet',
              id: '550e8400-e29b-41d4-a716-446655440005',
              description:
                'Language Connect feedback: "The language sessions improved my communication skills significantly."',
              contributionWeight: 0.40,
            },
            {
              level: 1,
              type: 'evidence_snippet',
              id: '550e8400-e29b-41d4-a716-446655440009',
              description:
                'Checkin note: "Feeling more integrated into the team."',
              contributionWeight: 0.15,
            },
          ],
          totalEvidenceCount: 127,
          period: {
            start: startDate || '2024-01-01',
            end: endDate || '2024-03-31',
          },
        };

        // Validate response
        const validatedLineage = EvidenceLineageSchema.parse(mockLineage);

        return reply.send(validatedLineage);
      } catch (error) {
        request.log.error({ error }, 'Failed to fetch lineage');

        if (error instanceof Error && error.name === 'ZodError') {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Invalid lineage data',
            details: error,
          });
        }

        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch lineage',
        });
      }
    }
  );

  /**
   * GET /api/lineage/:metricId/preview
   * Get a preview of evidence snippets for a metric (first 3)
   * Used for "Why this metric?" tooltip/popover
   */
  fastify.get<{
    Params: {
      metricId: string;
    };
    Reply: {
      metricId: string;
      metricName: string;
      previewSnippets: Array<{
        id: string;
        text: string;
        source: string;
      }>;
      totalCount: number;
    };
  }>(
    '/api/lineage/:metricId/preview',
    {
      preHandler: [tenantScoped.preHandler, requireFeature(FEATURE_FLAGS.EVIDENCE_LINEAGE)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { metricId } = request.params as any;

        // TODO: Fetch preview snippets from database

        // Mock preview data
        const preview = {
          metricId,
          metricName: metricId === 'sroi' ? 'SROI' : 'Integration Score',
          previewSnippets: [
            {
              id: '550e8400-e29b-41d4-a716-446655440001',
              text: 'I feel more confident speaking in meetings now...',
              source: 'Buddy feedback',
            },
            {
              id: '550e8400-e29b-41d4-a716-446655440005',
              text: 'The language sessions improved my communication skills...',
              source: 'Language Connect',
            },
            {
              id: '550e8400-e29b-41d4-a716-446655440009',
              text: 'Feeling more integrated into the team.',
              source: 'Checkin',
            },
          ],
          totalCount: 127,
        };

        return reply.send(preview);
      } catch (error) {
        request.log.error({ error }, 'Failed to fetch lineage preview');

        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch lineage preview',
        });
      }
    }
  );
}
