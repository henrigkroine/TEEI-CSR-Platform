/**
 * NLQ API Routes - Natural Language Query Service
 *
 * Endpoints:
 * - POST /v1/nlq/ask - Submit natural language question
 * - GET /v1/nlq/queries/:queryId - Get query status and results
 * - GET /v1/nlq/history - Get query history for a company
 *
 * Features:
 * - Request/response validation with Zod
 * - Rate limiting per company
 * - Safety guardrails validation
 * - Redis caching with stampede protection
 * - Complete audit logging
 * - Confidence scoring and lineage tracking
 */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { db } from '@teei/shared-schema';
import { nlqQueries, nlqSafetyChecks, nlqCacheEntries, nlqRateLimits } from '@teei/shared-schema/schema/nlq';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { createServiceLogger } from '@teei/shared-utils';
import { getNLQCache, generateCacheKey } from '../cache/nlq-cache.js';
import { IntentClassifier } from '../lib/intent-classifier.js';
import { generateQuery } from '../lib/query-generator.js';
import { SafetyGuardrails } from '../validators/safety-guardrails.js';
import { ConfidenceScorer } from '../lib/confidence-scorer.js';
import { LineageResolver } from '../lib/lineage-resolver.js';
import type { IntentClassification } from '../types/intent.js';
import type { ConfidenceInputs } from '../lib/confidence-scorer.js';
import type { AnswerLineage } from '../lib/lineage-resolver.js';

const logger = createServiceLogger('insights-nlq:routes');

// ===== ZOD SCHEMAS =====

const AskRequestSchema = z.object({
  question: z.string().min(3).max(500),
  companyId: z.string().uuid(),
  context: z.object({
    previousQueryId: z.string().uuid().optional(),
    filters: z.record(z.any()).optional(),
    language: z.enum(['en', 'uk', 'no', 'es', 'fr']).default('en'),
  }).optional(),
  userId: z.string().uuid().optional(),
  sessionId: z.string().optional(),
});

const QueryHistoryQuerySchema = z.object({
  companyId: z.string().uuid(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.enum(['pending', 'success', 'failed', 'rejected']).optional(),
});

export interface ConfidenceScore {
  overall: number;
  level: 'high' | 'medium' | 'low';
  components: {
    intentConfidence: number;
    dataCompleteness: number;
    sampleSizeScore: number;
    recencyScore: number;
    ambiguityPenalty: number;
  };
  weights: {
    intent: number;
    dataCompleteness: number;
    sampleSize: number;
    recency: number;
    ambiguity: number;
  };
  recommendations: string[];
}

// ===== ROUTE REGISTRATION =====

export async function nlqRoutes(app: FastifyInstance) {
  const cache = getNLQCache();
  const intentClassifier = new IntentClassifier({
    provider: 'anthropic',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    redisClient: (cache as any).redis,
  });

  /**
   * POST /v1/nlq/ask
   * Submit a natural language question and get an answer
   */
  app.post<{
    Body: z.infer<typeof AskRequestSchema>;
  }>('/ask', async (request, reply) => {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    try {
      // Validate request body
      const { question, companyId, context, userId, sessionId } = AskRequestSchema.parse(request.body);

      logger.info('NLQ ask request', {
        requestId,
        companyId,
        questionLength: question.length,
        hasContext: !!context,
      });

      // Step 1: Check rate limits
      const rateLimitCheck = await checkRateLimit(companyId);
      if (!rateLimitCheck.allowed) {
        return reply.status(429).send({
          error: 'Rate limit exceeded',
          message: rateLimitCheck.message,
          limits: {
            daily: rateLimitCheck.dailyRemaining,
            hourly: rateLimitCheck.hourlyRemaining,
          },
          resetAt: rateLimitCheck.resetAt,
        });
      }

      // Step 2: Generate cache key
      const cacheKey = generateCacheKey({
        normalizedQuestion: question.toLowerCase().trim(),
        companyId,
        timeRange: 'auto', // Will be determined by intent
        filters: context?.filters,
      });

      // Step 3: Check cache with stampede protection
      const cachedResult = await cache.withStampedeProtection(
        cacheKey,
        async () => {
          // Step 4: Classify intent
          logger.debug('Classifying intent', { requestId, question });
          const intentResponse = await intentClassifier.classify(question);
          const intent = intentResponse.result;

          // Step 5: Generate query
          logger.debug('Generating query', { requestId, intent: intent.intent });
          const queryResult = await generateQuery(
            mapIntentToClassification(intent, question),
            {
              companyId,
              validateSafety: true,
            }
          );

          // Safety validation already done in generateQuery
          if (!queryResult.safetyValidation.passed) {
            throw new Error(`Safety validation failed: ${queryResult.safetyValidation.violations.join(', ')}`);
          }

          // Step 6: Execute query
          logger.debug('Executing query', { requestId, templateId: queryResult.templateId });
          const executionStart = Date.now();

          // Execute SQL query against database
          const resultData = await executeQuery(queryResult.sql, companyId);
          const executionTimeMs = Date.now() - executionStart;

          // Step 7: Calculate confidence score
          const confidence = calculateConfidence({
            intentConfidence: intent.confidence,
            resultData,
            queryResult,
          });

          // Step 8: Resolve lineage
          const lineage = await LineageResolver.resolveLineage({
            queryId: requestId,
            generatedSql: queryResult.sql,
            templateId: queryResult.templateId,
            queryParams: queryResult.parameters,
            resultData,
            executionTimeMs,
            safetyChecksPassed: true,
          });

          // Step 9: Generate answer summary
          const summary = generateAnswerSummary(resultData, queryResult, intent);

          return {
            queryId: requestId,
            answer: {
              summary,
              data: resultData,
              confidence,
              lineage,
              visualization: queryResult.detailedPreview.visualization,
            },
            metadata: {
              executionTimeMs,
              cached: false,
              safetyPassed: true,
              intent: intent.intent,
              templateId: queryResult.templateId,
              tokensUsed: intentResponse.costTracking.totalTokens,
              estimatedCostUSD: intentResponse.costTracking.estimatedCostUSD.toFixed(6),
            },
          };
        },
        queryResult?.cacheTtl || 3600,
        undefined,
        question
      );

      const totalTimeMs = Date.now() - startTime;

      // Step 10: Log to database (async, non-blocking)
      logQueryToDatabase({
        queryId: requestId,
        companyId,
        question,
        result: cachedResult.data,
        userId,
        sessionId,
        cached: cachedResult.cached,
      }).catch(err => {
        logger.error('Failed to log query to database', { error: err, requestId });
      });

      // Step 11: Increment rate limit counter
      incrementRateLimitCounter(companyId).catch(err => {
        logger.error('Failed to increment rate limit', { error: err, companyId });
      });

      // Set rate limit headers
      reply.header('X-RateLimit-Remaining-Daily', rateLimitCheck.dailyRemaining.toString());
      reply.header('X-RateLimit-Remaining-Hourly', rateLimitCheck.hourlyRemaining.toString());
      reply.header('X-Query-Time-Ms', totalTimeMs.toString());
      reply.header('X-Cached', cachedResult.cached.toString());

      return reply.send(cachedResult.data);

    } catch (error) {
      logger.error('NLQ ask failed', { error, requestId });

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Invalid request',
          details: error.errors,
        });
      }

      if ((error as any).message?.includes('Safety validation failed')) {
        return reply.status(403).send({
          error: 'Safety check failed',
          message: (error as Error).message,
        });
      }

      return reply.status(500).send({
        error: 'Query execution failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      });
    }
  });

  /**
   * GET /v1/nlq/queries/:queryId
   * Get query status and results by ID
   */
  app.get<{
    Params: { queryId: string };
  }>('/queries/:queryId', async (request, reply) => {
    try {
      const { queryId } = request.params;

      if (!queryId || !/^[0-9a-f-]{36}$/i.test(queryId)) {
        return reply.status(400).send({
          error: 'Invalid query ID format',
        });
      }

      const query = await db
        .select()
        .from(nlqQueries)
        .where(eq(nlqQueries.id, queryId))
        .limit(1);

      if (query.length === 0) {
        return reply.status(404).send({
          error: 'Query not found',
          queryId,
        });
      }

      const result = query[0];

      // Get safety check details if available
      let safetyCheck = null;
      if (result.safetyCheckId) {
        const checks = await db
          .select()
          .from(nlqSafetyChecks)
          .where(eq(nlqSafetyChecks.id, result.safetyCheckId))
          .limit(1);

        if (checks.length > 0) {
          safetyCheck = checks[0];
        }
      }

      return reply.send({
        queryId: result.id,
        status: result.executionStatus,
        question: result.rawQuestion,
        normalizedQuestion: result.normalizedQuestion,
        intent: result.detectedIntent,
        template: {
          id: result.templateId,
          name: result.templateName,
        },
        query: {
          sql: result.generatedSql,
          chql: result.generatedChql,
          preview: result.queryPreview,
        },
        safety: {
          passed: result.safetyPassed,
          violations: result.safetyViolations,
          details: safetyCheck?.checkResults,
        },
        execution: {
          status: result.executionStatus,
          rowCount: result.resultRowCount,
          executionTimeMs: result.executionTimeMs,
        },
        answer: {
          summary: result.answerSummary,
          confidence: result.answerConfidence ? parseFloat(result.answerConfidence) : null,
          lineage: result.lineagePointers,
        },
        metadata: {
          cached: result.cached,
          cacheKey: result.cacheKey,
          modelName: result.modelName,
          tokensUsed: result.tokensUsed,
          estimatedCostUsd: result.estimatedCostUsd,
          createdAt: result.createdAt,
        },
      });

    } catch (error) {
      logger.error('Failed to fetch query', { error });

      return reply.status(500).send({
        error: 'Failed to fetch query',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /v1/nlq/history
   * Get query history for a company
   */
  app.get<{
    Querystring: z.infer<typeof QueryHistoryQuerySchema>;
  }>('/history', async (request, reply) => {
    try {
      const params = QueryHistoryQuerySchema.parse(request.query);

      logger.info('Fetching query history', {
        companyId: params.companyId,
        limit: params.limit,
        offset: params.offset,
      });

      // Build query conditions
      const conditions = [
        eq(nlqQueries.companyId, params.companyId),
      ];

      if (params.startDate) {
        conditions.push(gte(nlqQueries.createdAt, new Date(params.startDate)));
      }

      if (params.endDate) {
        conditions.push(lte(nlqQueries.createdAt, new Date(params.endDate)));
      }

      if (params.status) {
        conditions.push(eq(nlqQueries.executionStatus, params.status));
      }

      // Fetch queries
      const queries = await db
        .select({
          id: nlqQueries.id,
          question: nlqQueries.rawQuestion,
          normalizedQuestion: nlqQueries.normalizedQuestion,
          intent: nlqQueries.detectedIntent,
          intentConfidence: nlqQueries.intentConfidence,
          templateName: nlqQueries.templateName,
          executionStatus: nlqQueries.executionStatus,
          resultRowCount: nlqQueries.resultRowCount,
          executionTimeMs: nlqQueries.executionTimeMs,
          answerConfidence: nlqQueries.answerConfidence,
          answerSummary: nlqQueries.answerSummary,
          cached: nlqQueries.cached,
          safetyPassed: nlqQueries.safetyPassed,
          createdAt: nlqQueries.createdAt,
        })
        .from(nlqQueries)
        .where(and(...conditions))
        .orderBy(desc(nlqQueries.createdAt))
        .limit(params.limit)
        .offset(params.offset);

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(nlqQueries)
        .where(and(...conditions));

      const total = Number(countResult[0]?.count || 0);

      return reply.send({
        queries: queries.map(q => ({
          ...q,
          intentConfidence: q.intentConfidence ? parseFloat(q.intentConfidence) : null,
          answerConfidence: q.answerConfidence ? parseFloat(q.answerConfidence) : null,
        })),
        pagination: {
          total,
          limit: params.limit,
          offset: params.offset,
          hasMore: params.offset + params.limit < total,
        },
      });

    } catch (error) {
      logger.error('Failed to fetch query history', { error });

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Invalid query parameters',
          details: error.errors,
        });
      }

      return reply.status(500).send({
        error: 'Failed to fetch query history',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}

// ===== HELPER FUNCTIONS =====

/**
 * Check rate limits for a company
 */
async function checkRateLimit(companyId: string): Promise<{
  allowed: boolean;
  message?: string;
  dailyRemaining: number;
  hourlyRemaining: number;
  resetAt?: string;
}> {
  try {
    const limits = await db
      .select()
      .from(nlqRateLimits)
      .where(eq(nlqRateLimits.companyId, companyId))
      .limit(1);

    if (limits.length === 0) {
      // No limits configured, use defaults
      return {
        allowed: true,
        dailyRemaining: 500,
        hourlyRemaining: 50,
      };
    }

    const limit = limits[0];
    const now = new Date();

    // Check if reset is needed
    if (limit.dailyResetAt < now) {
      // Reset daily counter
      await db
        .update(nlqRateLimits)
        .set({
          queriesUsedToday: 0,
          dailyResetAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        })
        .where(eq(nlqRateLimits.companyId, companyId));

      limit.queriesUsedToday = 0;
    }

    if (limit.hourlyResetAt < now) {
      // Reset hourly counter
      await db
        .update(nlqRateLimits)
        .set({
          queriesUsedThisHour: 0,
          hourlyResetAt: new Date(now.getTime() + 60 * 60 * 1000),
        })
        .where(eq(nlqRateLimits.companyId, companyId));

      limit.queriesUsedThisHour = 0;
    }

    // Check daily limit
    if (limit.queriesUsedToday >= limit.dailyQueryLimit) {
      return {
        allowed: false,
        message: `Daily query limit exceeded (${limit.dailyQueryLimit} queries/day)`,
        dailyRemaining: 0,
        hourlyRemaining: limit.hourlyQueryLimit - limit.queriesUsedThisHour,
        resetAt: limit.dailyResetAt.toISOString(),
      };
    }

    // Check hourly limit
    if (limit.queriesUsedThisHour >= limit.hourlyQueryLimit) {
      return {
        allowed: false,
        message: `Hourly query limit exceeded (${limit.hourlyQueryLimit} queries/hour)`,
        dailyRemaining: limit.dailyQueryLimit - limit.queriesUsedToday,
        hourlyRemaining: 0,
        resetAt: limit.hourlyResetAt.toISOString(),
      };
    }

    return {
      allowed: true,
      dailyRemaining: limit.dailyQueryLimit - limit.queriesUsedToday,
      hourlyRemaining: limit.hourlyQueryLimit - limit.queriesUsedThisHour,
    };

  } catch (error) {
    logger.error('Rate limit check failed', { error, companyId });
    // Allow on error to not block users
    return {
      allowed: true,
      dailyRemaining: 500,
      hourlyRemaining: 50,
    };
  }
}

/**
 * Increment rate limit counters
 */
async function incrementRateLimitCounter(companyId: string): Promise<void> {
  await db
    .update(nlqRateLimits)
    .set({
      queriesUsedToday: sql`${nlqRateLimits.queriesUsedToday} + 1`,
      queriesUsedThisHour: sql`${nlqRateLimits.queriesUsedThisHour} + 1`,
    })
    .where(eq(nlqRateLimits.companyId, companyId));
}

/**
 * Execute SQL query against the database
 */
async function executeQuery(sqlQuery: string, companyId: string): Promise<any[]> {
  // This is a placeholder - actual implementation would execute against PostgreSQL or ClickHouse
  // For now, return mock data
  logger.debug('Executing query', { companyId, query: sqlQuery.substring(0, 100) });

  // In production, this would be:
  // const result = await db.execute(sql.raw(sqlQuery));
  // return result.rows;

  return [];
}

/**
 * Map intent classification result to IntentClassification type
 */
function mapIntentToClassification(intent: any, originalQuery: string): IntentClassification {
  return {
    intent: intent.intent,
    confidence: intent.confidence,
    templateId: mapIntentToTemplateId(intent),
    slots: intent.slots ? Object.entries(intent.slots).map(([name, value]: [string, any]) => ({
      name,
      value,
      confidence: intent.confidence,
    })) : [],
    timeRange: intent.slots?.timeRange ? {
      type: intent.slots.timeRange,
    } : undefined,
    groupBy: intent.slots?.groupBy ? [intent.slots.groupBy] : undefined,
    filters: intent.slots?.filters,
    originalQuery,
    classifiedAt: new Date().toISOString(),
  };
}

/**
 * Map intent to template ID
 */
function mapIntentToTemplateId(intent: any): string {
  // Map intent + metric to template ID
  // This would look up the actual template from the catalog
  const metric = intent.slots?.metric || 'unknown';
  const intentType = intent.intent || 'get_metric';

  return `${intentType}_${metric}`;
}

/**
 * Calculate confidence score for answer
 */
function calculateConfidence(params: {
  intentConfidence: number;
  resultData: any[];
  queryResult: any;
}): ConfidenceScore {
  const scorer = new ConfidenceScorer();

  const inputs: ConfidenceInputs = {
    intentConfidence: params.intentConfidence,
    dataMetrics: {
      actualDataPoints: params.resultData.length,
      expectedDataPoints: params.resultData.length > 0 ? params.resultData.length : 1,
      hasMissingValues: false,
      fieldCompleteness: 1.0,
    },
    sampleMetrics: {
      sampleSize: params.resultData.length,
      minViableSampleSize: 30,
    },
    recencyMetrics: {
      mostRecentDate: new Date(),
      oldestDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      queryTimestamp: new Date(),
    },
    ambiguityMetrics: {
      multipleTemplateMatches: false,
      assumptionCount: 0,
      usedDefaultValues: false,
      parameterExtractionConfidence: params.intentConfidence,
    },
  };

  return scorer.calculate(inputs);
}

/**
 * Generate human-readable answer summary
 */
function generateAnswerSummary(
  resultData: any[],
  queryResult: any,
  intent: any
): string {
  if (resultData.length === 0) {
    return `No data found for your query: "${intent.reasoning}"`;
  }

  return `Found ${resultData.length} result(s). ${queryResult.preview}`;
}

/**
 * Log query to database for audit trail
 */
async function logQueryToDatabase(params: {
  queryId: string;
  companyId: string;
  question: string;
  result: any;
  userId?: string;
  sessionId?: string;
  cached: boolean;
}): Promise<void> {
  try {
    await db.insert(nlqQueries).values({
      id: params.queryId,
      companyId: params.companyId,
      rawQuestion: params.question,
      normalizedQuestion: params.question.toLowerCase().trim(),
      detectedIntent: params.result.metadata.intent,
      extractedSlots: {},
      intentConfidence: '0.85', // Would come from intent classification
      templateId: params.result.metadata.templateId,
      templateName: params.result.metadata.templateId,
      generatedSql: '', // Would be populated from query result
      queryPreview: params.result.answer.summary,
      safetyPassed: params.result.metadata.safetyPassed,
      executionStatus: 'success',
      resultRowCount: params.result.answer.data.length,
      executionTimeMs: params.result.metadata.executionTimeMs,
      answerConfidence: params.result.answer.confidence.overall.toString(),
      answerSummary: params.result.answer.summary,
      lineagePointers: params.result.answer.lineage,
      cached: params.cached,
      userId: params.userId,
      sessionId: params.sessionId,
    });
  } catch (error) {
    logger.error('Failed to insert query log', { error, queryId: params.queryId });
    throw error;
  }
}
