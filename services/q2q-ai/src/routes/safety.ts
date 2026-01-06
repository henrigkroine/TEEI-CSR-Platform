/**
 * Safety API Routes
 *
 * Endpoints for prompt injection detection, anomaly detection,
 * and safety monitoring.
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  analyzePromptInjection,
  logBlockedRequest,
  getBlockedRequests,
  getBlockedRequestStats,
} from '../safety/prompt_shield.js';
import {
  detectAnomalies,
  getAnomalyStats,
  getHistoricalStats,
  FeedbackSubmission,
} from '../safety/anomaly_signals.js';

// Request validation schemas
const CheckPromptSchema = z.object({
  text: z.string().min(1).max(10000),
  userId: z.string().uuid().optional(),
  contextId: z.string().uuid().optional(),
  blockThreshold: z.number().min(0).max(1).optional(),
});

const CheckAnomalySchema = z.object({
  text: z.string().min(1).max(10000),
  userId: z.string().uuid(),
  timestamp: z.string().datetime().optional(),
  declaredLanguage: z.string().optional(),
  detectedLanguage: z.string().optional(),
  lengthZScoreThreshold: z.number().optional(),
  repetitionThreshold: z.number().optional(),
  reviewThreshold: z.number().optional(),
});

const BlockedRequestsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
});

type CheckPromptRequest = z.infer<typeof CheckPromptSchema>;
type CheckAnomalyRequest = z.infer<typeof CheckAnomalySchema>;
type BlockedRequestsQuery = z.infer<typeof BlockedRequestsQuerySchema>;

export const safetyRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /safety/check-prompt
   *
   * Analyzes text for prompt injection attacks
   */
  app.post<{ Body: CheckPromptRequest }>(
    '/safety/check-prompt',
    async (request, reply) => {
      try {
        const { text, userId, contextId, blockThreshold } = CheckPromptSchema.parse(
          request.body
        );

        // Analyze the prompt
        const result = analyzePromptInjection(text, {
          blockThreshold: blockThreshold ?? 0.8,
          logBlocked: true,
        });

        // Log if blocked
        if (!result.isSafe) {
          logBlockedRequest(text, result, { userId, contextId });
          app.log.warn({
            msg: 'Prompt injection detected',
            riskScore: result.riskScore,
            patterns: result.matchedPatterns,
            userId,
            contextId,
          });
        }

        return {
          success: true,
          result: {
            isSafe: result.isSafe,
            riskScore: result.riskScore,
            matchedPatterns: result.matchedPatterns,
            analysis: result.analysis,
            action: result.isSafe ? 'allow' : 'block',
          },
        };
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: 'Validation error',
            details: error.errors,
          });
        }

        app.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * POST /safety/check-anomaly
   *
   * Detects anomalies in feedback submissions
   */
  app.post<{ Body: CheckAnomalyRequest }>(
    '/safety/check-anomaly',
    async (request, reply) => {
      try {
        const {
          text,
          userId,
          timestamp,
          declaredLanguage,
          detectedLanguage,
          lengthZScoreThreshold,
          repetitionThreshold,
          reviewThreshold,
        } = CheckAnomalySchema.parse(request.body);

        const submission: FeedbackSubmission = {
          text,
          userId,
          timestamp: timestamp ? new Date(timestamp) : new Date(),
          declaredLanguage,
          detectedLanguage,
        };

        // Detect anomalies
        const signal = detectAnomalies(submission, {
          lengthZScoreThreshold,
          repetitionThreshold,
          reviewThreshold,
        });

        // Log if flagged for review
        if (signal.flagForReview) {
          app.log.warn({
            msg: 'Anomaly detected in feedback',
            anomalyScore: signal.anomalyScore,
            anomalies: signal.anomalies,
            userId,
          });
        }

        return {
          success: true,
          result: {
            anomalyScore: signal.anomalyScore,
            flagForReview: signal.flagForReview,
            anomalies: signal.anomalies,
            metrics: signal.metrics,
            action: signal.flagForReview ? 'review' : 'accept',
          },
        };
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: 'Validation error',
            details: error.errors,
          });
        }

        app.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * GET /safety/blocked-requests
   *
   * Lists recent blocked requests (admin only - no auth implemented yet)
   */
  app.get<{ Querystring: BlockedRequestsQuery }>(
    '/safety/blocked-requests',
    async (request, reply) => {
      try {
        const { limit } = BlockedRequestsQuerySchema.parse(request.query);

        const blockedRequests = getBlockedRequests(limit);

        return {
          success: true,
          data: blockedRequests.map(r => ({
            timestamp: r.timestamp,
            text: r.text,
            riskScore: r.riskScore,
            matchedPatterns: r.matchedPatterns,
            userId: r.userId,
            contextId: r.contextId,
          })),
          count: blockedRequests.length,
        };
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: 'Validation error',
            details: error.errors,
          });
        }

        app.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * GET /safety/stats
   *
   * Returns safety metrics dashboard data
   */
  app.get('/safety/stats', async (request, reply) => {
    try {
      const blockedStats = getBlockedRequestStats();
      const anomalyStats = getAnomalyStats();

      return {
        success: true,
        data: {
          promptShield: {
            totalBlocked: blockedStats.total,
            blockedLast24h: blockedStats.last24h,
            topPatterns: blockedStats.topPatterns,
            averageRiskScore: blockedStats.averageRiskScore,
          },
          anomalyDetection: {
            recentSubmissionsTracked: anomalyStats.recentSubmissionsCount,
            uniqueUsers: anomalyStats.uniqueUsers,
            historicalBaseline: {
              meanTextLength: Math.round(anomalyStats.historicalStats.meanLength),
              stdDevTextLength: Math.round(anomalyStats.historicalStats.stdDevLength),
              sampleCount: anomalyStats.historicalStats.sampleCount,
            },
          },
          healthMetrics: {
            systemStatus: 'operational',
            lastUpdated: new Date().toISOString(),
          },
        },
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
};
