/**
 * NLQ Query Routes
 *
 * Natural language query endpoint with RLS and safety guardrails
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { NLQDriver, NLQRequest } from '../inference/nlq-driver.js';
import { runGuardrails, formatViolations } from '../security/guardrails.js';
import {
  buildRLSContext,
  applyRLSToQuery,
  validateTableAccess,
  extractTables,
  checkRateLimit
} from '../security/rls.js';
import { getTenantContext, TenantRequest } from '../middleware/tenantScope.js';
import { Pool } from 'pg';
import Redis from 'ioredis';

const QueryRequestSchema = z.object({
  query: z.string().min(3).max(2000),
  language: z.enum(['en', 'uk', 'no', 'ar', 'he']).default('en'),
  includeExplanation: z.boolean().default(false),
  maxResults: z.number().min(1).max(1000).default(100)
});

type QueryRequest = z.infer<typeof QueryRequestSchema>;

export function registerQueryRoutes(
  fastify: FastifyInstance,
  nlqDriver: NLQDriver,
  clickhouse: Pool,
  redis: Redis
) {
  /**
   * POST /query - Convert natural language to SQL and execute
   */
  fastify.post<{ Body: QueryRequest }>(
    '/query',
    {
      schema: {
        description: 'Convert natural language query to SQL and execute against ClickHouse',
        tags: ['NLQ'],
        body: {
          type: 'object',
          required: ['query'],
          properties: {
            query: { type: 'string', minLength: 3, maxLength: 2000 },
            language: {
              type: 'string',
              enum: ['en', 'uk', 'no', 'ar', 'he'],
              default: 'en'
            },
            includeExplanation: { type: 'boolean', default: false },
            maxResults: { type: 'number', minimum: 1, maximum: 1000, default: 100 }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
              sql: { type: 'string' },
              meta: { type: 'object' },
              citations: { type: 'array' }
            }
          }
        }
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const startTime = Date.now();

      try {
        // Parse and validate request body
        const body = QueryRequestSchema.parse(request.body);
        const tenant = getTenantContext(request);

        // Build RLS context
        const rlsContext = buildRLSContext(tenant, request);

        // Check rate limits
        const rateLimitResult = await checkRateLimit(rlsContext, redis);
        if (!rateLimitResult.allowed) {
          return reply.status(429).send({
            success: false,
            error: 'Rate Limit Exceeded',
            message: rateLimitResult.reason,
            resetAt: rateLimitResult.resetAt
          });
        }

        // Step 1: Run guardrails on user query
        const guardrailCheck = runGuardrails(body.query);

        if (!guardrailCheck.safe) {
          request.log.warn(
            {
              userId: tenant.userId,
              companyId: tenant.companyId,
              query: body.query,
              violations: guardrailCheck.violations
            },
            'Query blocked by guardrails'
          );

          return reply.status(400).send({
            success: false,
            error: 'Query Blocked',
            message: 'Query contains potentially unsafe patterns',
            violations: guardrailCheck.violations.map(v => ({
              rule: v.rule,
              severity: v.severity,
              message: v.message
            }))
          });
        }

        // Step 2: Generate SQL using NLQ driver
        const nlqRequest: NLQRequest = {
          query: guardrailCheck.sanitized || body.query,
          language: body.language,
          companyId: tenant.companyId,
          userId: tenant.userId
        };

        const nlqResult = await nlqDriver.generate(nlqRequest);

        // Step 3: Run guardrails on generated SQL
        const sqlGuardrailCheck = runGuardrails(body.query, nlqResult.sql);

        if (!sqlGuardrailCheck.safe) {
          request.log.warn(
            {
              userId: tenant.userId,
              companyId: tenant.companyId,
              sql: nlqResult.sql,
              violations: sqlGuardrailCheck.violations
            },
            'Generated SQL blocked by guardrails'
          );

          return reply.status(400).send({
            success: false,
            error: 'Generated SQL Blocked',
            message: 'Generated SQL contains unsafe patterns',
            violations: sqlGuardrailCheck.violations.map(v => ({
              rule: v.rule,
              severity: v.severity,
              message: v.message
            }))
          });
        }

        // Step 4: Validate table access
        const tables = extractTables(nlqResult.sql);
        const tableAccessCheck = validateTableAccess(tables, rlsContext);

        if (!tableAccessCheck.allowed) {
          request.log.warn(
            {
              userId: tenant.userId,
              companyId: tenant.companyId,
              tables,
              deniedTables: tableAccessCheck.deniedTables
            },
            'Table access denied'
          );

          return reply.status(403).send({
            success: false,
            error: 'Access Denied',
            message: tableAccessCheck.reason,
            deniedTables: tableAccessCheck.deniedTables
          });
        }

        // Step 5: Apply RLS to SQL query
        const { sql: securedSQL, params } = applyRLSToQuery(nlqResult.sql, rlsContext);

        // Step 6: Add LIMIT clause if not present
        let finalSQL = securedSQL;
        if (!/LIMIT\s+\d+/i.test(finalSQL)) {
          finalSQL += ` LIMIT ${body.maxResults}`;
        }

        // Step 7: Execute query against ClickHouse
        request.log.info(
          {
            userId: tenant.userId,
            companyId: tenant.companyId,
            sql: finalSQL
          },
          'Executing NLQ query'
        );

        const queryResult = await clickhouse.query(finalSQL, params);
        const rows = queryResult.rows;

        // Step 8: Extract citations
        const citations = nlqDriver.extractCitations(finalSQL);

        // Step 9: Build response
        const totalTime = Date.now() - startTime;

        const response: any = {
          success: true,
          data: {
            rows,
            count: rows.length
          },
          citations,
          meta: {
            totalTimeMs: totalTime,
            inference: {
              provider: nlqResult.provider,
              model: nlqResult.model,
              language: nlqResult.language,
              latencyMs: nlqResult.latencyMs,
              tokensUsed: nlqResult.tokensUsed,
              costUSD: nlqResult.costUSD
            },
            tables,
            rateLimitRemaining: rateLimitResult.remaining
          }
        };

        // Include SQL if explanation requested
        if (body.includeExplanation) {
          response.sql = finalSQL;
          response.originalSQL = nlqResult.sql;
          response.guardrails = {
            violations: sqlGuardrailCheck.violations.filter(v => !v.blocked)
          };
        }

        return reply.send(response);
      } catch (error: any) {
        request.log.error({ error }, 'NLQ query failed');

        return reply.status(500).send({
          success: false,
          error: 'Query Execution Failed',
          message: error.message || 'An unexpected error occurred'
        });
      }
    }
  );

  /**
   * POST /query/explain - Generate SQL without executing
   */
  fastify.post<{ Body: QueryRequest }>(
    '/query/explain',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = QueryRequestSchema.parse(request.body);
        const tenant = getTenantContext(request);

        const rlsContext = buildRLSContext(tenant, request);

        // Run guardrails
        const guardrailCheck = runGuardrails(body.query);
        if (!guardrailCheck.safe) {
          return reply.status(400).send({
            success: false,
            error: 'Query Blocked',
            violations: guardrailCheck.violations
          });
        }

        // Generate SQL
        const nlqRequest: NLQRequest = {
          query: guardrailCheck.sanitized || body.query,
          language: body.language,
          companyId: tenant.companyId,
          userId: tenant.userId
        };

        const nlqResult = await nlqDriver.generate(nlqRequest);

        // Apply RLS
        const { sql: securedSQL } = applyRLSToQuery(nlqResult.sql, rlsContext);

        // Extract tables and citations
        const tables = extractTables(securedSQL);
        const citations = nlqDriver.extractCitations(securedSQL);

        return reply.send({
          success: true,
          sql: securedSQL,
          originalSQL: nlqResult.sql,
          tables,
          citations,
          meta: {
            provider: nlqResult.provider,
            model: nlqResult.model,
            language: nlqResult.language,
            tokensUsed: nlqResult.tokensUsed,
            costUSD: nlqResult.costUSD
          }
        });
      } catch (error: any) {
        request.log.error({ error }, 'Explain failed');

        return reply.status(500).send({
          success: false,
          error: 'Explain Failed',
          message: error.message
        });
      }
    }
  );

  /**
   * GET /health - Health check
   */
  fastify.get('/health', async (request, reply) => {
    return reply.send({
      success: true,
      service: 'insights-nlq',
      version: '2.0.0',
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  });
}
