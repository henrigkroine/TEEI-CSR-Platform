import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  EvidenceFiltersSchema,
  EvidenceResponseSchema,
  CSRDExportSchema,
  type EvidenceFilters,
  type EvidenceResponse,
  type CSRDExport,
  type EvidenceSnippet,
  type OutcomeScore,
} from '@teei/shared-types';
import { tenantScoped } from '../middleware/tenantScope';
import { requireFeature, FEATURE_FLAGS } from '../utils/featureFlags';

/**
 * Evidence API Routes
 * Provides access to Q2Q evidence snippets with anonymization and filtering
 */
export async function evidenceRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/evidence
   * Browse Q2Q evidence with filters
   * Returns anonymized snippets with outcome scores
   */
  fastify.get<{
    Querystring: EvidenceFilters;
    Reply: EvidenceResponse;
  }>(
    '/api/evidence',
    {
      preHandler: [
        tenantScoped.preHandler,
        requireFeature(FEATURE_FLAGS.EVIDENCE_EXPLORER),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = (request as any).tenantId;

        // Validate query params
        const filters = EvidenceFiltersSchema.parse(request.query);

        // TODO: Replace with actual database query
        // const evidence = await db.query.evidenceSnippets.findMany({
        //   where: and(
        //     eq(evidenceSnippets.companyId, tenantId),
        //     filters.startDate ? gte(evidenceSnippets.submittedAt, filters.startDate) : undefined,
        //     filters.endDate ? lte(evidenceSnippets.submittedAt, filters.endDate) : undefined,
        //     filters.programType ? eq(evidenceSnippets.programType, filters.programType) : undefined,
        //     filters.cohort ? eq(evidenceSnippets.cohort, filters.cohort) : undefined,
        //   ),
        //   limit: filters.limit,
        //   offset: filters.offset,
        //   with: {
        //     outcomeScores: true,
        //   },
        // });

        // Mock data for now
        const mockEvidence: EvidenceResponse = {
          evidence: [
            {
              snippet: {
                id: '550e8400-e29b-41d4-a716-446655440001',
                snippetText:
                  'I feel more confident speaking in meetings now. My mentor helped me practice.',
                snippetHash: 'abc123hash',
                source: 'Buddy feedback, Q1 2024',
                sourceType: 'buddy_feedback',
                programType: 'buddy',
                cohort: '2024-Q1',
                submittedAt: '2024-01-15T10:30:00Z',
                participantId: '660e8400-e29b-41d4-a716-446655440002',
              },
              outcomeScores: [
                {
                  id: '770e8400-e29b-41d4-a716-446655440003',
                  evidenceSnippetId: '550e8400-e29b-41d4-a716-446655440001',
                  dimension: 'confidence',
                  score: 0.85,
                  confidence: 0.92,
                  modelVersion: 'q2q-v2.1',
                  createdAt: '2024-01-15T11:00:00Z',
                },
                {
                  id: '880e8400-e29b-41d4-a716-446655440004',
                  evidenceSnippetId: '550e8400-e29b-41d4-a716-446655440001',
                  dimension: 'belonging',
                  score: 0.78,
                  confidence: 0.87,
                  modelVersion: 'q2q-v2.1',
                  createdAt: '2024-01-15T11:00:00Z',
                },
              ],
            },
            {
              snippet: {
                id: '550e8400-e29b-41d4-a716-446655440005',
                snippetText:
                  'The language sessions improved my communication skills significantly.',
                snippetHash: 'def456hash',
                source: 'Language Connect feedback, Q1 2024',
                sourceType: 'kintell_feedback',
                programType: 'language',
                cohort: '2024-Q1',
                submittedAt: '2024-02-10T14:20:00Z',
                participantId: '660e8400-e29b-41d4-a716-446655440006',
              },
              outcomeScores: [
                {
                  id: '990e8400-e29b-41d4-a716-446655440007',
                  evidenceSnippetId: '550e8400-e29b-41d4-a716-446655440005',
                  dimension: 'lang_level_proxy',
                  score: 0.92,
                  confidence: 0.95,
                  modelVersion: 'q2q-v2.1',
                  createdAt: '2024-02-10T15:00:00Z',
                },
                {
                  id: 'aa0e8400-e29b-41d4-a716-446655440008',
                  evidenceSnippetId: '550e8400-e29b-41d4-a716-446655440005',
                  dimension: 'confidence',
                  score: 0.81,
                  confidence: 0.89,
                  modelVersion: 'q2q-v2.1',
                  createdAt: '2024-02-10T15:00:00Z',
                },
              ],
            },
          ],
          pagination: {
            total: 127, // Total evidence count for this tenant
            limit: filters.limit,
            offset: filters.offset,
            hasMore: filters.offset + filters.limit < 127,
          },
          filters,
        };

        // Validate response
        const validatedResponse = EvidenceResponseSchema.parse(mockEvidence);

        return reply.send(validatedResponse);
      } catch (error) {
        request.log.error({ error }, 'Failed to fetch evidence');

        if (error instanceof Error && error.name === 'ZodError') {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Invalid query parameters',
            details: error,
          });
        }

        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch evidence',
        });
      }
    }
  );

  /**
   * GET /api/evidence/export/csrd
   * Export evidence for CSRD regulatory reporting
   * Returns redacted text suitable for compliance
   */
  fastify.get<{
    Querystring: {
      startDate: string;
      endDate: string;
    };
    Reply: CSRDExport;
  }>(
    '/api/evidence/export/csrd',
    {
      preHandler: [tenantScoped.preHandler, requireFeature(FEATURE_FLAGS.EVIDENCE_EXPLORER)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = (request as any).tenantId;
        const { startDate, endDate } = request.query as any;

        // TODO: Fetch company details
        // const company = await db.query.companies.findFirst({
        //   where: eq(companies.id, tenantId),
        // });

        // TODO: Fetch evidence with extra redaction for CSRD
        // const evidence = await fetchEvidenceForCSRD(tenantId, startDate, endDate);

        // Mock CSRD export
        const csrdExport: CSRDExport = {
          companyId: tenantId,
          companyName: 'Pilot Corp Inc.',
          period: {
            start: startDate,
            end: endDate,
          },
          evidenceCount: 127,
          snippets: [
            {
              id: '550e8400-e29b-41d4-a716-446655440001',
              text: 'Participant reported increased confidence in workplace communication.',
              source: 'Buddy Program, Q1 2024',
              date: '2024-01-15',
              program: 'Buddy Mentorship',
            },
            {
              id: '550e8400-e29b-41d4-a716-446655440005',
              text: 'Language training led to significant improvement in communication skills.',
              source: 'Language Connect, Q1 2024',
              date: '2024-02-10',
              program: 'Language Learning',
            },
          ],
          generatedAt: new Date().toISOString(),
          disclaimer:
            'This export contains anonymized evidence for regulatory reporting. All personally identifiable information has been redacted. This data is intended for CSRD compliance purposes only.',
        };

        const validatedExport = CSRDExportSchema.parse(csrdExport);

        // Set download headers
        reply.header(
          'Content-Disposition',
          `attachment; filename="csrd-export-${startDate}-to-${endDate}.json"`
        );
        reply.header('Content-Type', 'application/json');

        return reply.send(validatedExport);
      } catch (error) {
        request.log.error({ error }, 'Failed to generate CSRD export');

        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to generate CSRD export',
        });
      }
    }
  );
}
