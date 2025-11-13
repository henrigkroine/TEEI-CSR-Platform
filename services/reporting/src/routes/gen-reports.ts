import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  GenerateReportRequestSchema,
  GenerateReportResponseSchema,
  type GenerateReportRequest,
  type GenerateReportResponse,
  type ReportSection,
  type Citation,
} from '@teei/shared-types';
import { tenantScoped } from '../middleware/tenantScope';
import { requireFeature, FEATURE_FLAGS } from '../utils/featureFlags';
import { generateQuarterlyReportPrompt, PROMPT_METADATA } from '../prompts/quarterlyReport';
import { redactPII, validateRedaction } from '../utils/redaction';

/**
 * Generative Reports API Routes
 * Server-side AI report generation with mandatory evidence citations
 */
export async function genReportsRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/gen-reports:generate
   * Generate an AI-powered CSR report with evidence citations
   *
   * CRITICAL: All AI calls happen SERVER-SIDE. No API keys exposed to frontend.
   * CRITICAL: All generated content MUST include evidence citations.
   * CRITICAL: PII redaction applied before AND after AI generation.
   */
  fastify.post<{
    Body: GenerateReportRequest;
    Reply: GenerateReportResponse;
  }>(
    '/api/gen-reports:generate',
    {
      preHandler: [
        tenantScoped.preHandler,
        requireFeature(FEATURE_FLAGS.GEN_REPORTS),
        requireFeature(FEATURE_FLAGS.GEN_REPORTS_CITATIONS),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const startTime = Date.now();

      try {
        const tenantId = (request as any).tenantId;

        // Validate request body
        const req = GenerateReportRequestSchema.parse(request.body);

        request.log.info({
          tenantId,
          period: req.period,
          filters: req.filters,
        }, 'Generating AI report');

        // 1. Fetch company data
        // TODO: Replace with actual database query
        const companyName = 'Pilot Corp Inc.';

        // 2. Fetch metrics for the period
        // TODO: Replace with actual database query
        const metrics = {
          sroi: 3.2,
          vis: 85,
          integrationScore: 0.78,
          participantCount: 247,
          completionRate: 0.89,
        };

        // 3. Fetch evidence snippets for the period
        // TODO: Replace with actual database query that fetches Q2Q evidence
        // Apply filters (programs, cohorts, metrics)
        const evidence = [
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            snippetText: 'I feel more confident speaking in meetings now. My mentor helped me practice.',
            source: 'Buddy feedback, Q1 2024',
            confidence: 0.92,
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440005',
            snippetText: 'The language sessions improved my communication skills significantly.',
            source: 'Language Connect feedback, Q1 2024',
            confidence: 0.95,
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440009',
            snippetText: 'Feeling more integrated into the team after the buddy program.',
            source: 'Checkin note, Q1 2024',
            confidence: 0.87,
          },
        ];

        // 4. Apply redaction to evidence (PRE-AI)
        const redactedEvidence = evidence.map((e) => ({
          ...e,
          snippetText: redactPII(e.snippetText).redacted,
        }));

        // 5. Generate prompt
        const prompt = generateQuarterlyReportPrompt({
          companyName,
          period: req.period,
          metrics,
          evidence: redactedEvidence,
        });

        // 6. Call LLM API (OpenAI or Anthropic)
        // TODO: Replace with actual LLM API call
        // const llmResponse = await callLLM(prompt, req.options);

        // Mock LLM response for now
        const llmResponse = {
          sections: [
            {
              title: 'Executive Summary',
              content: `In Q1 2024, ${companyName} achieved exceptional results across all CSR programs, with a Social Return on Investment of 3.2x [citation:550e8400-e29b-41d4-a716-446655440001] and a Value of Integration Score of 85 [citation:550e8400-e29b-41d4-a716-446655440009]. Our programs reached 247 active participants, with an impressive 89% completion rate. Participants reported significant improvements in confidence [citation:550e8400-e29b-41d4-a716-446655440001] and communication skills [citation:550e8400-e29b-41d4-a716-446655440005], demonstrating the tangible impact of our initiatives.`,
              order: 1,
            },
            {
              title: 'Impact Metrics',
              content: `The SROI of 3.2x indicates that for every dollar invested in our CSR programs, $3.20 of social value was generated [citation:550e8400-e29b-41d4-a716-446655440001]. The VIS score of 85 reflects high participant integration [citation:550e8400-e29b-41d4-a716-446655440009], while the overall integration score of 0.78 shows strong progress toward our goal of 0.85. With 247 active participants and an 89% completion rate, our programs demonstrate both reach and effectiveness.`,
              order: 2,
            },
            {
              title: 'Qualitative Insights',
              content: `Participants consistently reported increased confidence in professional settings. One participant noted, "I feel more confident speaking in meetings now" [citation:550e8400-e29b-41d4-a716-446655440001]. Language Connect participants highlighted communication improvements, with one stating, "The language sessions improved my communication skills significantly" [citation:550e8400-e29b-41d4-a716-446655440005]. The buddy program fostered social integration, with participants reporting feeling "more integrated into the team" [citation:550e8400-e29b-41d4-a716-446655440009].`,
              order: 3,
            },
            {
              title: 'Recommendations',
              content: `Based on the strong SROI of 3.2x [citation:550e8400-e29b-41d4-a716-446655440001] and high participant satisfaction [citation:550e8400-e29b-41d4-a716-446655440005], we recommend expanding program capacity by 20% in Q2. Continue prioritizing communication skills development [citation:550e8400-e29b-41d4-a716-446655440005] and mentorship quality [citation:550e8400-e29b-41d4-a716-446655440001]. Explore additional buddy program cohorts to maintain the high integration score [citation:550e8400-e29b-41d4-a716-446655440009].`,
              order: 4,
            },
          ],
          citations: [
            {
              id: 'cite-001',
              evidenceId: '550e8400-e29b-41d4-a716-446655440001',
              snippetText: 'I feel more confident speaking in meetings now. My mentor helped me practice.',
              source: 'Buddy feedback, Q1 2024',
              confidence: 0.92,
            },
            {
              id: 'cite-002',
              evidenceId: '550e8400-e29b-41d4-a716-446655440005',
              snippetText: 'The language sessions improved my communication skills significantly.',
              source: 'Language Connect feedback, Q1 2024',
              confidence: 0.95,
            },
            {
              id: 'cite-003',
              evidenceId: '550e8400-e29b-41d4-a716-446655440009',
              snippetText: 'Feeling more integrated into the team after the buddy program.',
              source: 'Checkin note, Q1 2024',
              confidence: 0.87,
            },
          ],
        };

        // 7. Validate citations
        const citationErrors = validateCitations(llmResponse.sections, llmResponse.citations, evidence);
        if (citationErrors.length > 0) {
          request.log.error({ citationErrors }, 'Citation validation failed');
          return reply.status(500).send({
            error: 'Internal Server Error',
            message: 'Generated report failed citation validation',
            details: citationErrors,
          });
        }

        // 8. Apply redaction to generated narrative (POST-AI)
        const redactedSections = llmResponse.sections.map((section) => ({
          ...section,
          content: redactPII(section.content).redacted,
        }));

        // 9. Validate redaction
        for (const section of redactedSections) {
          const validationErrors = validateRedaction(section.content);
          if (validationErrors.length > 0) {
            request.log.warn({ validationErrors, section: section.title }, 'Redaction validation warnings');
          }
        }

        // 10. Build response
        const reportId = generateReportId(); // Generate UUID
        const response: GenerateReportResponse = {
          reportId,
          generatedAt: new Date().toISOString(),
          narrative: {
            sections: redactedSections,
            citations: llmResponse.citations,
          },
          metadata: {
            model: 'gpt-4-turbo-2024-04-09', // TODO: Use actual model from LLM call
            promptVersion: PROMPT_METADATA.version,
            tokensUsed: 2847, // TODO: Get from LLM response
            seed: req.options?.seed,
            generatedAt: new Date().toISOString(),
          },
        };

        // 11. Validate response schema
        const validatedResponse = GenerateReportResponseSchema.parse(response);

        // 12. Log audit trail
        const duration = Date.now() - startTime;
        request.log.info({
          tenantId,
          reportId,
          tokensUsed: response.metadata.tokensUsed,
          citationCount: response.narrative.citations.length,
          duration,
        }, 'Report generated successfully');

        // TODO: Save report to database for audit log

        return reply.send(validatedResponse);
      } catch (error) {
        request.log.error({ error }, 'Failed to generate report');

        if (error instanceof Error && error.name === 'ZodError') {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Invalid request parameters',
            details: error,
          });
        }

        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to generate report',
        });
      }
    }
  );
}

/**
 * Validate that all citations in the narrative exist and are correct
 */
function validateCitations(
  sections: ReportSection[],
  citations: Citation[],
  evidence: Array<{ id: string }>
): string[] {
  const errors: string[] = [];

  // Extract all citation IDs from sections
  const referencedIds = new Set<string>();
  for (const section of sections) {
    const matches = section.content.matchAll(/\[citation:([^\]]+)\]/g);
    for (const match of matches) {
      referencedIds.add(match[1]);
    }
  }

  // Check that all referenced IDs exist in citations
  const citationMap = new Map(citations.map((c) => [c.evidenceId, c]));
  for (const refId of referencedIds) {
    if (!citationMap.has(refId)) {
      errors.push(`Referenced evidence ID ${refId} not found in citations`);
    }
  }

  // Check that all citation evidence IDs exist in original evidence
  const evidenceIds = new Set(evidence.map((e) => e.id));
  for (const citation of citations) {
    if (!evidenceIds.has(citation.evidenceId)) {
      errors.push(`Citation evidence ID ${citation.evidenceId} not found in original evidence`);
    }
  }

  // Check that at least some citations were used
  if (referencedIds.size === 0) {
    errors.push('No citations found in generated narrative');
  }

  return errors;
}

/**
 * Generate a unique report ID
 */
function generateReportId(): string {
  // Simple UUID v4 generation (in production, use a proper UUID library)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
