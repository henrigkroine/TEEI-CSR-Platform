/**
 * HIL Adjudication Routes - Human-in-the-Loop review and approval workflow
 *
 * Endpoints:
 * - POST /v1/nlq/adjudicate - Submit adjudication decision for a query
 * - GET /v1/nlq/adjudication-queue - Get pending queries for review
 * - GET /v1/nlq/adjudication/:reviewId - Get review details
 * - POST /v1/nlq/prompt-versions - Register new prompt version
 * - GET /v1/nlq/prompt-versions - List prompt versions
 *
 * Features:
 * - Approve/Revise/Reject workflow
 * - Audit trail to copilot_insights
 * - Prompt version tagging
 * - Fairness-aware routing
 */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { db } from '@teei/shared-schema';
import {
  nlqQueries,
  adjudicationReviews,
  nlqPromptVersions,
  queryPerformanceMetrics,
} from '@teei/shared-schema/schema/nlq';
import { copilotInsights } from '@teei/shared-schema/schema/insights';
import { eq, and, desc, gte, isNull, sql } from 'drizzle-orm';
import { createServiceLogger } from '@teei/shared-utils';
import crypto from 'crypto';

const logger = createServiceLogger('insights-nlq:adjudication');

// ===== ZOD SCHEMAS =====

const AdjudicateRequestSchema = z.object({
  queryId: z.string().uuid(),
  decision: z.enum(['approved', 'revised', 'rejected']),
  reviewedBy: z.string().uuid(),

  // Revision details (required if decision = 'revised')
  revisedAnswer: z.string().optional(),
  revisionReason: z.string().optional(),
  revisionType: z.enum(['factual_error', 'tone', 'clarity', 'completeness', 'safety', 'other']).optional(),

  // Quality ratings (1-5 scale)
  confidenceRating: z.number().min(1).max(5).optional(),
  accuracyRating: z.number().min(1).max(5).optional(),
  clarityRating: z.number().min(1).max(5).optional(),
  feedbackComments: z.string().optional(),

  // Routing options
  routeToInsights: z.boolean().default(true), // Whether to create copilot insight
  insightSeverity: z.enum(['low', 'medium', 'high', 'critical']).optional(),

  // Metadata
  reviewTimeMs: z.number().optional(),
});

const AdjudicationQueueQuerySchema = z.object({
  companyId: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  minConfidence: z.coerce.number().min(0).max(1).optional(),
  maxConfidence: z.coerce.number().min(0).max(1).optional(),
  intentType: z.string().optional(),
  includeReviewed: z.coerce.boolean().default(false),
});

const PromptVersionRequestSchema = z.object({
  versionId: z.string().max(50),
  versionName: z.string().max(100),
  description: z.string(),
  promptType: z.enum(['intent_classification', 'query_generation', 'answer_synthesis']),
  promptTemplate: z.string(),
  modelProvider: z.enum(['anthropic', 'openai', 'gemini']),
  modelName: z.string().max(100),
  temperature: z.number().min(0).max(2).default(0),
  maxTokens: z.number().min(100).max(10000).default(1000),
  rolloutStatus: z.enum(['draft', 'canary', 'active', 'deprecated']).default('draft'),
  canaryPercentage: z.number().min(0).max(100).default(0),
  promotionCriteria: z
    .object({
      minF1: z.number().optional(),
      maxLatency: z.number().optional(),
      minAcceptance: z.number().optional(),
    })
    .optional(),
  rollbackCriteria: z
    .object({
      maxF1Drop: z.number().optional(),
      maxLatencyIncrease: z.number().optional(),
    })
    .optional(),
  createdBy: z.string().uuid(),
  tags: z.array(z.string()).optional(),
  changeLog: z.string().optional(),
});

// ===== ROUTE REGISTRATION =====

export async function adjudicationRoutes(app: FastifyInstance) {
  /**
   * POST /v1/nlq/adjudicate
   * Submit an adjudication decision for a query
   */
  app.post<{
    Body: z.infer<typeof AdjudicateRequestSchema>;
  }>('/adjudicate', async (request, reply) => {
    const startTime = Date.now();

    try {
      const validated = AdjudicateRequestSchema.parse(request.body);
      const {
        queryId,
        decision,
        reviewedBy,
        revisedAnswer,
        revisionReason,
        revisionType,
        confidenceRating,
        accuracyRating,
        clarityRating,
        feedbackComments,
        routeToInsights,
        insightSeverity,
        reviewTimeMs,
      } = validated;

      logger.info('Adjudication request', { queryId, decision, reviewedBy });

      // Validation: revise requires revisedAnswer
      if (decision === 'revised' && !revisedAnswer) {
        return reply.status(400).send({
          error: 'Revised answer is required when decision is "revised"',
        });
      }

      // Step 1: Fetch the original query
      const queries = await db.select().from(nlqQueries).where(eq(nlqQueries.id, queryId)).limit(1);

      if (queries.length === 0) {
        return reply.status(404).send({
          error: 'Query not found',
          queryId,
        });
      }

      const originalQuery = queries[0];

      // Step 2: Check if already adjudicated
      const existingReviews = await db
        .select()
        .from(adjudicationReviews)
        .where(eq(adjudicationReviews.queryId, queryId))
        .limit(1);

      if (existingReviews.length > 0) {
        logger.warn('Query already adjudicated', { queryId, existingReviewId: existingReviews[0].id });
        return reply.status(409).send({
          error: 'Query already adjudicated',
          existingReview: existingReviews[0],
        });
      }

      // Step 3: Determine prompt version (current active version)
      const activePromptVersions = await db
        .select()
        .from(nlqPromptVersions)
        .where(
          and(
            eq(nlqPromptVersions.promptType, 'answer_synthesis'),
            eq(nlqPromptVersions.rolloutStatus, 'active')
          )
        )
        .orderBy(desc(nlqPromptVersions.createdAt))
        .limit(1);

      const currentPromptVersion = activePromptVersions[0]?.versionId || 'unknown';

      // Step 4: Create adjudication review record
      let insightId: string | null = null;

      if (routeToInsights && (decision === 'approved' || decision === 'revised')) {
        // Create copilot insight
        const insightType = decision === 'revised' ? 'trend' : 'anomaly'; // Could be more sophisticated
        const severity = insightSeverity || (decision === 'revised' ? 'medium' : 'low');

        const [insight] = await db
          .insert(copilotInsights)
          .values({
            companyId: originalQuery.companyId,
            metric: originalQuery.detectedIntent,
            insightType,
            severity,
            narrative: decision === 'revised' ? revisedAnswer : originalQuery.answerSummary,
            citations: originalQuery.lineagePointers as any,
            tokensUsed: originalQuery.tokensUsed,
            costUSD: parseFloat(originalQuery.estimatedCostUsd || '0'),
            dismissed: false,
          })
          .returning({ id: copilotInsights.id });

        insightId = insight.id;
        logger.info('Created copilot insight', { insightId, queryId });
      }

      const [review] = await db
        .insert(adjudicationReviews)
        .values({
          queryId,
          companyId: originalQuery.companyId,
          decision,
          reviewedBy,
          originalAnswer: originalQuery.answerSummary,
          revisedAnswer: decision === 'revised' ? revisedAnswer : null,
          revisionReason,
          revisionType,
          confidenceRating,
          accuracyRating,
          clarityRating,
          feedbackComments,
          routedToInsights: !!insightId,
          insightId,
          promptVersionBefore: currentPromptVersion,
          promptVersionAfter: decision === 'revised' ? currentPromptVersion : null, // Could be different version
          reviewTimeMs: reviewTimeMs || Date.now() - startTime,
        })
        .returning();

      logger.info('Adjudication review created', {
        reviewId: review.id,
        queryId,
        decision,
        insightId,
      });

      // Step 5: Update performance metrics (async, non-blocking)
      updatePerformanceMetrics({
        queryId,
        templateId: originalQuery.templateId,
        intentType: originalQuery.detectedIntent,
        decision,
        confidenceRating,
        accuracyRating,
        latencyMs: originalQuery.executionTimeMs || 0,
        costUsd: parseFloat(originalQuery.estimatedCostUsd || '0'),
      }).catch((err) => {
        logger.error('Failed to update performance metrics', { error: err, queryId });
      });

      // Step 6: If decision = 'rejected' and confidence was high, trigger alert
      if (decision === 'rejected' && parseFloat(originalQuery.answerConfidence || '0') > 0.8) {
        logger.warn('High-confidence query rejected - potential model issue', {
          queryId,
          confidence: originalQuery.answerConfidence,
          intent: originalQuery.detectedIntent,
        });

        // Could trigger alert to model team here
      }

      return reply.send({
        success: true,
        reviewId: review.id,
        insightId,
        message: `Query ${decision} successfully`,
      });
    } catch (error) {
      logger.error('Adjudication failed', { error });

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Invalid request',
          details: error.errors,
        });
      }

      return reply.status(500).send({
        error: 'Adjudication failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /v1/nlq/adjudication-queue
   * Get queries pending human review
   */
  app.get<{
    Querystring: z.infer<typeof AdjudicationQueueQuerySchema>;
  }>('/adjudication-queue', async (request, reply) => {
    try {
      const params = AdjudicationQueueQuerySchema.parse(request.query);

      logger.info('Fetching adjudication queue', params);

      // Build query conditions
      const conditions: any[] = [eq(nlqQueries.executionStatus, 'success')];

      if (params.companyId) {
        conditions.push(eq(nlqQueries.companyId, params.companyId));
      }

      if (params.minConfidence !== undefined) {
        conditions.push(gte(nlqQueries.answerConfidence, params.minConfidence.toString()));
      }

      if (params.maxConfidence !== undefined) {
        conditions.push(sql`${nlqQueries.answerConfidence}::decimal <= ${params.maxConfidence}`);
      }

      if (params.intentType) {
        conditions.push(eq(nlqQueries.detectedIntent, params.intentType));
      }

      // Fetch queries
      const queriesData = await db
        .select({
          id: nlqQueries.id,
          companyId: nlqQueries.companyId,
          rawQuestion: nlqQueries.rawQuestion,
          normalizedQuestion: nlqQueries.normalizedQuestion,
          detectedIntent: nlqQueries.detectedIntent,
          intentConfidence: nlqQueries.intentConfidence,
          templateName: nlqQueries.templateName,
          answerSummary: nlqQueries.answerSummary,
          answerConfidence: nlqQueries.answerConfidence,
          resultRowCount: nlqQueries.resultRowCount,
          executionTimeMs: nlqQueries.executionTimeMs,
          createdAt: nlqQueries.createdAt,
          // Join with adjudication_reviews to filter out reviewed
          reviewId: adjudicationReviews.id,
          reviewDecision: adjudicationReviews.decision,
          reviewedAt: adjudicationReviews.reviewedAt,
        })
        .from(nlqQueries)
        .leftJoin(adjudicationReviews, eq(nlqQueries.id, adjudicationReviews.queryId))
        .where(and(...conditions))
        .orderBy(desc(nlqQueries.createdAt))
        .limit(params.limit)
        .offset(params.offset);

      // Filter out reviewed queries unless includeReviewed is true
      const filteredQueries = params.includeReviewed
        ? queriesData
        : queriesData.filter((q) => q.reviewId === null);

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(nlqQueries)
        .leftJoin(adjudicationReviews, eq(nlqQueries.id, adjudicationReviews.queryId))
        .where(
          and(
            ...conditions,
            params.includeReviewed ? sql`true` : isNull(adjudicationReviews.id)
          )
        );

      const total = Number(countResult[0]?.count || 0);

      return reply.send({
        queries: filteredQueries.map((q) => ({
          id: q.id,
          companyId: q.companyId,
          question: q.rawQuestion,
          normalizedQuestion: q.normalizedQuestion,
          intent: q.detectedIntent,
          intentConfidence: q.intentConfidence ? parseFloat(q.intentConfidence) : null,
          template: q.templateName,
          answer: q.answerSummary,
          answerConfidence: q.answerConfidence ? parseFloat(q.answerConfidence) : null,
          resultRowCount: q.resultRowCount,
          executionTimeMs: q.executionTimeMs,
          createdAt: q.createdAt,
          reviewed: !!q.reviewId,
          reviewDecision: q.reviewDecision,
          reviewedAt: q.reviewedAt,
        })),
        pagination: {
          total,
          limit: params.limit,
          offset: params.offset,
          hasMore: params.offset + params.limit < total,
        },
      });
    } catch (error) {
      logger.error('Failed to fetch adjudication queue', { error });

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Invalid query parameters',
          details: error.errors,
        });
      }

      return reply.status(500).send({
        error: 'Failed to fetch adjudication queue',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /v1/nlq/adjudication/:reviewId
   * Get adjudication review details
   */
  app.get<{
    Params: { reviewId: string };
  }>('/adjudication/:reviewId', async (request, reply) => {
    try {
      const { reviewId } = request.params;

      if (!reviewId || !/^[0-9a-f-]{36}$/i.test(reviewId)) {
        return reply.status(400).send({
          error: 'Invalid review ID format',
        });
      }

      const reviews = await db.select().from(adjudicationReviews).where(eq(adjudicationReviews.id, reviewId)).limit(1);

      if (reviews.length === 0) {
        return reply.status(404).send({
          error: 'Review not found',
          reviewId,
        });
      }

      const review = reviews[0];

      // Fetch the original query
      const queries = await db.select().from(nlqQueries).where(eq(nlqQueries.id, review.queryId)).limit(1);

      return reply.send({
        review: {
          id: review.id,
          queryId: review.queryId,
          decision: review.decision,
          reviewedBy: review.reviewedBy,
          reviewedAt: review.reviewedAt,
          originalAnswer: review.originalAnswer,
          revisedAnswer: review.revisedAnswer,
          revisionReason: review.revisionReason,
          revisionType: review.revisionType,
          confidenceRating: review.confidenceRating,
          accuracyRating: review.accuracyRating,
          clarityRating: review.clarityRating,
          feedbackComments: review.feedbackComments,
          routedToInsights: review.routedToInsights,
          insightId: review.insightId,
          promptVersionBefore: review.promptVersionBefore,
          promptVersionAfter: review.promptVersionAfter,
          reviewTimeMs: review.reviewTimeMs,
        },
        query: queries[0] || null,
      });
    } catch (error) {
      logger.error('Failed to fetch review', { error });

      return reply.status(500).send({
        error: 'Failed to fetch review',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /v1/nlq/prompt-versions
   * Register a new prompt version for canary rollout
   */
  app.post<{
    Body: z.infer<typeof PromptVersionRequestSchema>;
  }>('/prompt-versions', async (request, reply) => {
    try {
      const validated = PromptVersionRequestSchema.parse(request.body);

      // Generate prompt hash
      const promptHash = crypto.createHash('sha256').update(validated.promptTemplate).digest('hex');

      // Check if version already exists
      const existing = await db
        .select()
        .from(nlqPromptVersions)
        .where(eq(nlqPromptVersions.versionId, validated.versionId))
        .limit(1);

      if (existing.length > 0) {
        return reply.status(409).send({
          error: 'Prompt version already exists',
          versionId: validated.versionId,
        });
      }

      // Create new prompt version
      const [version] = await db
        .insert(nlqPromptVersions)
        .values({
          versionId: validated.versionId,
          versionName: validated.versionName,
          description: validated.description,
          promptType: validated.promptType,
          promptTemplate: validated.promptTemplate,
          promptHash,
          modelProvider: validated.modelProvider,
          modelName: validated.modelName,
          temperature: validated.temperature.toString(),
          maxTokens: validated.maxTokens,
          rolloutStatus: validated.rolloutStatus,
          canaryPercentage: validated.canaryPercentage,
          promotionCriteria: validated.promotionCriteria as any,
          rollbackCriteria: validated.rollbackCriteria as any,
          createdBy: validated.createdBy,
          tags: validated.tags as any,
          changeLog: validated.changeLog,
          activatedAt: validated.rolloutStatus === 'active' ? new Date() : null,
        })
        .returning();

      logger.info('Prompt version created', {
        versionId: version.versionId,
        promptType: version.promptType,
        rolloutStatus: version.rolloutStatus,
      });

      return reply.send({
        success: true,
        version: {
          id: version.id,
          versionId: version.versionId,
          versionName: version.versionName,
          promptType: version.promptType,
          rolloutStatus: version.rolloutStatus,
          canaryPercentage: version.canaryPercentage,
          createdAt: version.createdAt,
        },
      });
    } catch (error) {
      logger.error('Failed to create prompt version', { error });

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Invalid request',
          details: error.errors,
        });
      }

      return reply.status(500).send({
        error: 'Failed to create prompt version',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /v1/nlq/prompt-versions
   * List all prompt versions
   */
  app.get('/prompt-versions', async (request, reply) => {
    try {
      const versions = await db
        .select()
        .from(nlqPromptVersions)
        .orderBy(desc(nlqPromptVersions.createdAt))
        .limit(100);

      return reply.send({
        versions: versions.map((v) => ({
          id: v.id,
          versionId: v.versionId,
          versionName: v.versionName,
          description: v.description,
          promptType: v.promptType,
          modelProvider: v.modelProvider,
          modelName: v.modelName,
          rolloutStatus: v.rolloutStatus,
          canaryPercentage: v.canaryPercentage,
          avgF1Score: v.avgF1Score ? parseFloat(v.avgF1Score) : null,
          avgLatencyMs: v.avgLatencyMs,
          acceptanceRate: v.acceptanceRate ? parseFloat(v.acceptanceRate) : null,
          activatedAt: v.activatedAt,
          deprecatedAt: v.deprecatedAt,
          createdAt: v.createdAt,
        })),
      });
    } catch (error) {
      logger.error('Failed to fetch prompt versions', { error });

      return reply.status(500).send({
        error: 'Failed to fetch prompt versions',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}

// ===== HELPER FUNCTIONS =====

/**
 * Update performance metrics for a query
 */
async function updatePerformanceMetrics(params: {
  queryId: string;
  templateId: string | null;
  intentType: string;
  decision: string;
  confidenceRating?: number;
  accuracyRating?: number;
  latencyMs: number;
  costUsd: number;
}): Promise<void> {
  // Generate query signature (normalized pattern)
  const querySignature = crypto
    .createHash('sha256')
    .update(`${params.intentType}-${params.templateId || 'unknown'}`)
    .digest('hex')
    .substring(0, 64);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if metric exists for today
  const existing = await db
    .select()
    .from(queryPerformanceMetrics)
    .where(
      and(
        eq(queryPerformanceMetrics.querySignature, querySignature),
        eq(queryPerformanceMetrics.metricDate, today),
        eq(queryPerformanceMetrics.windowType, 'daily')
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Update existing metric
    await db
      .update(queryPerformanceMetrics)
      .set({
        queryCount: sql`${queryPerformanceMetrics.queryCount} + 1`,
        totalCostUsd: sql`${queryPerformanceMetrics.totalCostUsd} + ${params.costUsd}`,
        successCount: params.decision === 'approved' || params.decision === 'revised'
          ? sql`${queryPerformanceMetrics.successCount} + 1`
          : queryPerformanceMetrics.successCount,
      })
      .where(eq(queryPerformanceMetrics.id, existing[0].id));
  } else {
    // Create new metric
    await db.insert(queryPerformanceMetrics).values({
      querySignature,
      templateId: params.templateId,
      intentType: params.intentType,
      metricDate: today,
      windowType: 'daily',
      queryCount: 1,
      uniqueCompanies: 1,
      uniqueUsers: 1,
      latencyAvg: params.latencyMs,
      totalCostUsd: params.costUsd.toString(),
      successCount: params.decision === 'approved' || params.decision === 'revised' ? 1 : 0,
    });
  }

  logger.debug('Performance metrics updated', {
    querySignature,
    intentType: params.intentType,
    decision: params.decision,
  });
}
