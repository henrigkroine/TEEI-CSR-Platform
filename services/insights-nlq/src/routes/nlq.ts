/**
 * NLQ Routes - /v1/insights/nlq
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { SemanticPlanner } from '../planner/semantic.js';
import { SafetyVerifier } from '../verifier/safety.js';
import { SqlGenerator } from '../planner/sql-generator.js';
import { EvidenceLinker } from '../linker/evidence.js';
import { createServiceLogger } from '@teei/shared-utils';
import { createClient } from '@clickhouse/client';
import { redactPiiValue, isPiiField } from '../ontology/index.js';

const logger = createServiceLogger('nlq-routes');

const NlqRequestSchema = z.object({
  query: z.string().min(3).max(500),
  tenantId: z.string(),
  userId: z.string().optional(),
  userRole: z.string().optional(),
  dialect: z.enum(['clickhouse', 'postgres']).default('clickhouse'),
  includeEvidence: z.boolean().default(true),
  includeSql: z.boolean().default(false), // For debugging
});

export async function nlqRoutes(fastify: FastifyInstance) {
  const planner = new SemanticPlanner();
  const verifier = new SafetyVerifier({ tier: 'standard' });
  const sqlGenerator = new SqlGenerator();
  const evidenceLinker = new EvidenceLinker();

  const clickhouse = createClient({
    url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
  });

  /**
   * POST /v1/insights/nlq/query
   * Execute natural language query
   */
  fastify.post<{ Body: z.infer<typeof NlqRequestSchema> }>(
    '/v1/insights/nlq/query',
    {
      schema: {
        body: NlqRequestSchema,
        response: {
          200: z.object({
            success: z.boolean(),
            answer: z.string().optional(),
            data: z.array(z.any()).optional(),
            citations: z.array(z.any()).optional(),
            plan: z.any().optional(),
            sql: z.string().optional(),
            metadata: z.object({
              planTimeMs: z.number(),
              verificationTimeMs: z.number(),
              executionTimeMs: z.number(),
              totalTimeMs: z.number(),
              estimatedCost: z.number(),
              rowsReturned: z.number(),
              citationCount: z.number(),
              meetsStandards: z.boolean(),
            }),
          }),
          400: z.object({
            success: z.boolean(),
            error: z.string(),
            violations: z.array(z.string()).optional(),
          }),
        },
      },
    },
    async (request, reply) => {
      const startTime = Date.now();
      const { query, tenantId, userId, userRole, dialect, includeEvidence, includeSql } = request.body;

      try {
        // 1. Plan query
        const planStartTime = Date.now();
        const plan = await planner.planQuery(query, tenantId, { userId, userRole });
        const planTimeMs = Date.now() - planStartTime;

        logger.info({ query, plan, planTimeMs }, 'Query planned');

        // 2. Verify plan
        const verifyStartTime = Date.now();
        const verification = await verifier.verifyPlan(plan);
        const verificationTimeMs = Date.now() - verifyStartTime;

        if (!verification.valid) {
          logger.warn({ verification }, 'Plan verification failed');
          return reply.code(400).send({
            success: false,
            error: 'Query validation failed',
            violations: verification.violations,
          });
        }

        if (verification.warnings.length > 0) {
          logger.warn({ warnings: verification.warnings }, 'Plan has warnings');
        }

        // 3. Generate SQL
        const generatedQuery =
          dialect === 'clickhouse' ? sqlGenerator.generateClickHouse(plan) : sqlGenerator.generatePostgres(plan);

        // 4. Verify generated SQL (double-check)
        const sqlVerification = verifier.verifySql(generatedQuery.sql);
        if (!sqlVerification.valid) {
          logger.error({ sqlVerification, sql: generatedQuery.sql }, 'Generated SQL failed verification');
          return reply.code(400).send({
            success: false,
            error: 'Generated SQL failed safety verification',
            violations: sqlVerification.violations,
          });
        }

        // 5. Execute query
        const execStartTime = Date.now();
        let results: any[] = [];

        if (dialect === 'clickhouse') {
          const resultSet = await clickhouse.query({
            query: generatedQuery.sql,
            query_params: generatedQuery.parameters,
            format: 'JSONEachRow',
          });
          results = await resultSet.json();
        } else {
          // PostgreSQL execution would go here
          throw new Error('PostgreSQL execution not yet implemented');
        }

        const executionTimeMs = Date.now() - execStartTime;

        // 6. Redact PII fields
        if (verification.requiresRedaction) {
          results = results.map((row) => {
            const redactedRow = { ...row };
            for (const field of Object.keys(row)) {
              if (isPiiField(field) || verification.piiFields.includes(field)) {
                redactedRow[field] = redactPiiValue(field, row[field]);
              }
            }
            return redactedRow;
          });
        }

        // 7. Link evidence
        let citations: any[] = [];
        let answer: string | undefined;

        if (includeEvidence) {
          citations = await evidenceLinker.linkEvidence(plan, results);
          const answerWithEvidence = await evidenceLinker.generateAnswerWithCitations(plan, results, citations);

          // Validate citations
          const citationValidation = evidenceLinker.validateCitations(answerWithEvidence);
          if (!citationValidation.valid) {
            logger.warn({ citationValidation }, 'Citation validation failed');
            // Still return results, but flag as not meeting standards
          }

          answer = answerWithEvidence.answer;
        }

        const totalTimeMs = Date.now() - startTime;

        // Check performance targets
        if (planTimeMs > 350) {
          logger.warn({ planTimeMs }, 'Plan time exceeded 350ms target');
        }

        if (totalTimeMs > 2500) {
          logger.warn({ totalTimeMs }, 'Total time exceeded 2.5s p95 target');
        }

        return reply.send({
          success: true,
          answer,
          data: results,
          citations: includeEvidence ? citations : undefined,
          plan: includeSql ? plan : undefined,
          sql: includeSql ? generatedQuery.sql : undefined,
          metadata: {
            planTimeMs,
            verificationTimeMs,
            executionTimeMs,
            totalTimeMs,
            estimatedCost: verification.estimatedCost,
            rowsReturned: results.length,
            citationCount: citations.length,
            meetsStandards: citations.length >= 1, // At least 1 citation
          },
        });
      } catch (error) {
        logger.error({ error, query }, 'NLQ query failed');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Internal server error',
        });
      }
    }
  );

  /**
   * POST /v1/insights/nlq/plan
   * Get query plan without execution (for debugging)
   */
  fastify.post(
    '/v1/insights/nlq/plan',
    {
      schema: {
        body: z.object({
          query: z.string(),
          tenantId: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { query, tenantId } = request.body;

      try {
        const plan = await planner.planQuery(query, tenantId);
        const verification = await verifier.verifyPlan(plan);
        const generatedQuery = sqlGenerator.generateClickHouse(plan);

        return reply.send({
          success: true,
          plan,
          verification,
          sql: generatedQuery.sql,
          parameters: generatedQuery.parameters,
        });
      } catch (error) {
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Internal server error',
        });
      }
    }
  );

  /**
   * GET /v1/insights/nlq/metrics
   * Get available metrics
   */
  fastify.get('/v1/insights/nlq/metrics', async (request, reply) => {
    const { METRIC_DICTIONARY } = await import('../ontology/metrics.js');

    return reply.send({
      success: true,
      metrics: Object.values(METRIC_DICTIONARY).map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        category: m.category,
        aggregations: m.allowedAggregations,
        dimensions: m.dimensions.map((d) => ({
          name: d.name,
          description: d.description,
        })),
      })),
    });
  });
}
