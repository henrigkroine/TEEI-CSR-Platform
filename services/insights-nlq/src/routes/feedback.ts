/**
 * NLQ Feedback API Routes
 *
 * Endpoints:
 * - POST /v1/nlq/feedback - Submit feedback on answer quality
 * - GET /v1/nlq/feedback/:queryId - Get feedback for a specific query
 * - GET /v1/nlq/feedback/stats - Get aggregate feedback statistics
 *
 * Feedback is used to:
 * - Improve intent classification accuracy
 * - Identify problematic queries
 * - Track user satisfaction
 * - Fine-tune LLM prompts
 */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { db } from '@teei/shared-schema';
import { pgTable, uuid, varchar, timestamp, integer, jsonb, text, boolean } from 'drizzle-orm/pg-core';
import { eq, and, desc, gte, sql } from 'drizzle-orm';
import { createServiceLogger } from '@teei/shared-utils';
import { nlqQueries } from '@teei/shared-schema/schema/nlq';

const logger = createServiceLogger('insights-nlq:feedback');

// ===== FEEDBACK TABLE SCHEMA =====

// Note: This table should be added to shared-schema/src/schema/nlq.ts
// For now, defining inline for reference
export const nlqFeedback = pgTable('nlq_feedback', {
  id: uuid('id').defaultRandom().primaryKey(),
  queryId: uuid('query_id').notNull(), // References nlqQueries.id
  companyId: uuid('company_id').notNull(),
  userId: uuid('user_id'),

  // Feedback ratings
  rating: integer('rating').notNull(), // 1-5 stars
  accuracyScore: integer('accuracy_score'), // 1-5: How accurate was the answer?
  relevanceScore: integer('relevance_score'), // 1-5: How relevant was the answer?
  clarityScore: integer('clarity_score'), // 1-5: How clear was the answer?

  // Feedback categories
  feedbackType: varchar('feedback_type', { length: 50 }).notNull(), // positive, negative, neutral
  issueCategory: varchar('issue_category', { length: 100 }), // wrong_data, unclear_answer, missing_data, etc.

  // User comments
  comment: text('comment'),
  suggestions: text('suggestions'),

  // Follow-up actions
  wasHelpful: boolean('was_helpful').default(false),
  userRephrasedQuery: boolean('user_rephrased_query').default(false),
  newQueryId: uuid('new_query_id'), // If user rephrased

  // Metadata
  metadata: jsonb('metadata'), // Additional context

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ===== ZOD SCHEMAS =====

const FeedbackSubmitSchema = z.object({
  queryId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  accuracyScore: z.number().int().min(1).max(5).optional(),
  relevanceScore: z.number().int().min(1).max(5).optional(),
  clarityScore: z.number().int().min(1).max(5).optional(),
  feedbackType: z.enum(['positive', 'negative', 'neutral']),
  issueCategory: z.enum([
    'wrong_data',
    'unclear_answer',
    'missing_data',
    'incorrect_interpretation',
    'slow_response',
    'formatting_issue',
    'other',
  ]).optional(),
  comment: z.string().max(1000).optional(),
  suggestions: z.string().max(1000).optional(),
  wasHelpful: z.boolean().default(false),
  userId: z.string().uuid().optional(),
});

const FeedbackStatsQuerySchema = z.object({
  companyId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  templateId: z.string().uuid().optional(),
});

// ===== ROUTE REGISTRATION =====

export async function feedbackRoutes(app: FastifyInstance) {
  /**
   * POST /v1/nlq/feedback
   * Submit feedback on an NLQ answer
   */
  app.post<{
    Body: z.infer<typeof FeedbackSubmitSchema>;
  }>('/feedback', async (request, reply) => {
    try {
      const feedback = FeedbackSubmitSchema.parse(request.body);

      logger.info('Submitting feedback', {
        queryId: feedback.queryId,
        rating: feedback.rating,
        feedbackType: feedback.feedbackType,
      });

      // Verify query exists
      const query = await db
        .select({
          id: nlqQueries.id,
          companyId: nlqQueries.companyId,
        })
        .from(nlqQueries)
        .where(eq(nlqQueries.id, feedback.queryId))
        .limit(1);

      if (query.length === 0) {
        return reply.status(404).send({
          error: 'Query not found',
          queryId: feedback.queryId,
        });
      }

      const queryData = query[0];

      // Insert feedback
      const feedbackId = crypto.randomUUID();
      await db.insert(nlqFeedback).values({
        id: feedbackId,
        queryId: feedback.queryId,
        companyId: queryData.companyId,
        userId: feedback.userId,
        rating: feedback.rating,
        accuracyScore: feedback.accuracyScore,
        relevanceScore: feedback.relevanceScore,
        clarityScore: feedback.clarityScore,
        feedbackType: feedback.feedbackType,
        issueCategory: feedback.issueCategory,
        comment: feedback.comment,
        suggestions: feedback.suggestions,
        wasHelpful: feedback.wasHelpful,
      });

      logger.info('Feedback submitted successfully', {
        feedbackId,
        queryId: feedback.queryId,
      });

      return reply.status(201).send({
        feedbackId,
        message: 'Feedback submitted successfully',
        queryId: feedback.queryId,
      });

    } catch (error) {
      logger.error('Failed to submit feedback', { error });

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Invalid feedback data',
          details: error.errors,
        });
      }

      return reply.status(500).send({
        error: 'Failed to submit feedback',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /v1/nlq/feedback/:queryId
   * Get all feedback for a specific query
   */
  app.get<{
    Params: { queryId: string };
  }>('/feedback/:queryId', async (request, reply) => {
    try {
      const { queryId } = request.params;

      if (!queryId || !/^[0-9a-f-]{36}$/i.test(queryId)) {
        return reply.status(400).send({
          error: 'Invalid query ID format',
        });
      }

      logger.info('Fetching feedback for query', { queryId });

      const feedbackList = await db
        .select()
        .from(nlqFeedback)
        .where(eq(nlqFeedback.queryId, queryId))
        .orderBy(desc(nlqFeedback.createdAt));

      if (feedbackList.length === 0) {
        return reply.send({
          queryId,
          feedback: [],
          summary: {
            totalFeedback: 0,
            averageRating: null,
          },
        });
      }

      // Calculate summary statistics
      const totalRating = feedbackList.reduce((sum, f) => sum + f.rating, 0);
      const averageRating = totalRating / feedbackList.length;

      const positiveCount = feedbackList.filter(f => f.feedbackType === 'positive').length;
      const negativeCount = feedbackList.filter(f => f.feedbackType === 'negative').length;
      const neutralCount = feedbackList.filter(f => f.feedbackType === 'neutral').length;

      return reply.send({
        queryId,
        feedback: feedbackList.map(f => ({
          id: f.id,
          rating: f.rating,
          accuracyScore: f.accuracyScore,
          relevanceScore: f.relevanceScore,
          clarityScore: f.clarityScore,
          feedbackType: f.feedbackType,
          issueCategory: f.issueCategory,
          comment: f.comment,
          suggestions: f.suggestions,
          wasHelpful: f.wasHelpful,
          createdAt: f.createdAt,
        })),
        summary: {
          totalFeedback: feedbackList.length,
          averageRating: Math.round(averageRating * 100) / 100,
          distribution: {
            positive: positiveCount,
            negative: negativeCount,
            neutral: neutralCount,
          },
        },
      });

    } catch (error) {
      logger.error('Failed to fetch feedback', { error });

      return reply.status(500).send({
        error: 'Failed to fetch feedback',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /v1/nlq/feedback/stats
   * Get aggregate feedback statistics
   */
  app.get<{
    Querystring: z.infer<typeof FeedbackStatsQuerySchema>;
  }>('/feedback/stats', async (request, reply) => {
    try {
      const params = FeedbackStatsQuerySchema.parse(request.query);

      logger.info('Fetching feedback statistics', params);

      // Build query conditions
      const conditions = [];

      if (params.companyId) {
        conditions.push(eq(nlqFeedback.companyId, params.companyId));
      }

      if (params.startDate) {
        conditions.push(gte(nlqFeedback.createdAt, new Date(params.startDate)));
      }

      if (params.endDate) {
        conditions.push(gte(nlqFeedback.createdAt, new Date(params.endDate)));
      }

      // Get overall statistics
      const statsQuery = await db
        .select({
          totalFeedback: sql<number>`count(*)`,
          averageRating: sql<number>`avg(${nlqFeedback.rating})`,
          averageAccuracy: sql<number>`avg(${nlqFeedback.accuracyScore})`,
          averageRelevance: sql<number>`avg(${nlqFeedback.relevanceScore})`,
          averageClarity: sql<number>`avg(${nlqFeedback.clarityScore})`,
          positiveCount: sql<number>`count(*) filter (where ${nlqFeedback.feedbackType} = 'positive')`,
          negativeCount: sql<number>`count(*) filter (where ${nlqFeedback.feedbackType} = 'negative')`,
          neutralCount: sql<number>`count(*) filter (where ${nlqFeedback.feedbackType} = 'neutral')`,
          helpfulCount: sql<number>`count(*) filter (where ${nlqFeedback.wasHelpful} = true)`,
        })
        .from(nlqFeedback)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const stats = statsQuery[0];

      // Get issue category breakdown
      const issueBreakdown = await db
        .select({
          category: nlqFeedback.issueCategory,
          count: sql<number>`count(*)`,
        })
        .from(nlqFeedback)
        .where(
          conditions.length > 0
            ? and(...conditions, sql`${nlqFeedback.issueCategory} IS NOT NULL`)
            : sql`${nlqFeedback.issueCategory} IS NOT NULL`
        )
        .groupBy(nlqFeedback.issueCategory);

      // Get rating distribution
      const ratingDistribution = await db
        .select({
          rating: nlqFeedback.rating,
          count: sql<number>`count(*)`,
        })
        .from(nlqFeedback)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(nlqFeedback.rating)
        .orderBy(nlqFeedback.rating);

      const totalFeedback = Number(stats.totalFeedback || 0);
      const helpfulPercentage = totalFeedback > 0
        ? (Number(stats.helpfulCount) / totalFeedback) * 100
        : 0;

      return reply.send({
        overall: {
          totalFeedback,
          averageRating: stats.averageRating ? Number(stats.averageRating).toFixed(2) : null,
          averageAccuracy: stats.averageAccuracy ? Number(stats.averageAccuracy).toFixed(2) : null,
          averageRelevance: stats.averageRelevance ? Number(stats.averageRelevance).toFixed(2) : null,
          averageClarity: stats.averageClarity ? Number(stats.averageClarity).toFixed(2) : null,
          helpfulPercentage: helpfulPercentage.toFixed(1),
        },
        distribution: {
          byType: {
            positive: Number(stats.positiveCount || 0),
            negative: Number(stats.negativeCount || 0),
            neutral: Number(stats.neutralCount || 0),
          },
          byRating: ratingDistribution.map(r => ({
            rating: r.rating,
            count: Number(r.count),
          })),
        },
        issues: issueBreakdown.map(i => ({
          category: i.category,
          count: Number(i.count),
        })),
      });

    } catch (error) {
      logger.error('Failed to fetch feedback stats', { error });

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Invalid query parameters',
          details: error.errors,
        });
      }

      return reply.status(500).send({
        error: 'Failed to fetch feedback stats',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /v1/nlq/feedback/recent
   * Get recent feedback items (for monitoring/debugging)
   */
  app.get<{
    Querystring: { limit?: string; companyId?: string };
  }>('/feedback/recent', async (request, reply) => {
    try {
      const limit = request.query.limit ? parseInt(request.query.limit) : 20;
      const companyId = request.query.companyId;

      logger.info('Fetching recent feedback', { limit, companyId });

      const conditions = [];
      if (companyId) {
        conditions.push(eq(nlqFeedback.companyId, companyId));
      }

      const recentFeedback = await db
        .select({
          feedback: nlqFeedback,
          query: {
            id: nlqQueries.id,
            question: nlqQueries.rawQuestion,
            intent: nlqQueries.detectedIntent,
            templateName: nlqQueries.templateName,
          },
        })
        .from(nlqFeedback)
        .leftJoin(nlqQueries, eq(nlqFeedback.queryId, nlqQueries.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(nlqFeedback.createdAt))
        .limit(Math.min(limit, 100));

      return reply.send({
        feedback: recentFeedback.map(item => ({
          id: item.feedback.id,
          queryId: item.feedback.queryId,
          query: item.query,
          rating: item.feedback.rating,
          feedbackType: item.feedback.feedbackType,
          issueCategory: item.feedback.issueCategory,
          comment: item.feedback.comment,
          wasHelpful: item.feedback.wasHelpful,
          createdAt: item.feedback.createdAt,
        })),
        total: recentFeedback.length,
      });

    } catch (error) {
      logger.error('Failed to fetch recent feedback', { error });

      return reply.status(500).send({
        error: 'Failed to fetch recent feedback',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}
