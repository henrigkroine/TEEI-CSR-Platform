/**
 * HIL Adjudication - hil-console-ui
 * Approve/deny flows with audit trails for edge cases
 */

import { z } from 'zod';
import { createServiceLogger } from '@teei/shared-utils';
import postgres from 'postgres';

const logger = createServiceLogger('hil-adjudication');

/**
 * Adjudication Decision
 */
export const AdjudicationDecisionSchema = z.object({
  id: z.string(),
  predictionId: z.string(), // ID of Q2Q prediction being adjudicated
  feedbackText: z.string(),
  predictedOutcomes: z.record(z.number()), // Model predictions
  humanOutcomes: z.record(z.number()), // Human corrections
  decision: z.enum(['approve', 'reject', 'modify']),
  adjudicatedBy: z.string(), // User ID
  adjudicatedAt: z.string(), // ISO date
  reason: z.string().optional(), // Why it was rejected/modified
  confidence: z.number(), // Model confidence before adjudication
  tags: z.array(z.string()).optional(), // For categorization
  modelVersion: z.string(),
  writeToRegistry: z.boolean().default(true), // Write back to model registry
});

export type AdjudicationDecision = z.infer<typeof AdjudicationDecisionSchema>;

/**
 * Adjudication Queue Item
 */
export const QueueItemSchema = z.object({
  id: z.string(),
  feedbackText: z.string(),
  predictedOutcomes: z.record(z.number()),
  confidence: z.number(),
  modelVersion: z.string(),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  reason: z.enum(['low_confidence', 'edge_case', 'drift_detected', 'manual_flag']),
  createdAt: z.string(),
  status: z.enum(['pending', 'in_review', 'adjudicated']).default('pending'),
});

export type QueueItem = z.infer<typeof QueueItemSchema>;

export class AdjudicationService {
  private db: postgres.Sql;

  constructor() {
    this.db = postgres(process.env.DATABASE_URL!);
  }

  /**
   * Get adjudication queue
   */
  async getQueue(options: {
    status?: QueueItem['status'];
    priority?: QueueItem['priority'];
    limit?: number;
    offset?: number;
  } = {}): Promise<QueueItem[]> {
    const { status, priority, limit = 50, offset = 0 } = options;

    let query = this.db`
      SELECT * FROM hil_adjudication_queue
      WHERE 1=1
    `;

    if (status) {
      query = this.db`${query} AND status = ${status}`;
    }

    if (priority) {
      query = this.db`${query} AND priority = ${priority}`;
    }

    query = this.db`
      ${query}
      ORDER BY
        CASE priority
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
        END,
        created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const rows = await query;

    return rows.map((row: any) => ({
      id: row.id,
      feedbackText: row.feedback_text,
      predictedOutcomes: row.predicted_outcomes,
      confidence: row.confidence,
      modelVersion: row.model_version,
      priority: row.priority,
      reason: row.reason,
      createdAt: row.created_at,
      status: row.status,
    }));
  }

  /**
   * Add item to adjudication queue
   */
  async addToQueue(item: Omit<QueueItem, 'id' | 'createdAt'>): Promise<QueueItem> {
    const id = `queue_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const createdAt = new Date().toISOString();

    await this.db`
      INSERT INTO hil_adjudication_queue (
        id, feedback_text, predicted_outcomes, confidence, model_version,
        priority, reason, status, created_at
      ) VALUES (
        ${id}, ${item.feedbackText}, ${JSON.stringify(item.predictedOutcomes)},
        ${item.confidence}, ${item.modelVersion}, ${item.priority},
        ${item.reason}, ${item.status || 'pending'}, ${createdAt}
      )
    `;

    logger.info({ id, reason: item.reason, priority: item.priority }, 'Added item to adjudication queue');

    return {
      ...item,
      id,
      createdAt,
      status: item.status || 'pending',
    };
  }

  /**
   * Submit adjudication decision
   */
  async submitDecision(decision: Omit<AdjudicationDecision, 'id' | 'adjudicatedAt'>): Promise<AdjudicationDecision> {
    const id = `adj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const adjudicatedAt = new Date().toISOString();

    const fullDecision: AdjudicationDecision = {
      ...decision,
      id,
      adjudicatedAt,
    };

    // Store decision
    await this.db`
      INSERT INTO hil_adjudication_decisions (
        id, prediction_id, feedback_text, predicted_outcomes, human_outcomes,
        decision, adjudicated_by, adjudicated_at, reason, confidence,
        tags, model_version, write_to_registry
      ) VALUES (
        ${id}, ${decision.predictionId}, ${decision.feedbackText},
        ${JSON.stringify(decision.predictedOutcomes)}, ${JSON.stringify(decision.humanOutcomes)},
        ${decision.decision}, ${decision.adjudicatedBy}, ${adjudicatedAt},
        ${decision.reason || null}, ${decision.confidence}, ${JSON.stringify(decision.tags || [])},
        ${decision.modelVersion}, ${decision.writeToRegistry}
      )
    `;

    // Update queue item status
    await this.db`
      UPDATE hil_adjudication_queue
      SET status = 'adjudicated'
      WHERE id = ${decision.predictionId}
    `;

    // Write back to model registry if requested
    if (decision.writeToRegistry) {
      await this.writeToModelRegistry(fullDecision);
    }

    logger.info({ id, decision: decision.decision, predictionId: decision.predictionId }, 'Adjudication decision submitted');

    return fullDecision;
  }

  /**
   * Write adjudication to model registry for retraining
   */
  private async writeToModelRegistry(decision: AdjudicationDecision): Promise<void> {
    try {
      await this.db`
        INSERT INTO model_training_data (
          id, feedback_text, outcomes, source, confidence, model_version,
          created_at, metadata
        ) VALUES (
          ${`training_${Date.now()}`},
          ${decision.feedbackText},
          ${JSON.stringify(decision.humanOutcomes)},
          'hil_adjudication',
          1.0,
          ${decision.modelVersion},
          ${new Date().toISOString()},
          ${JSON.stringify({ adjudicationId: decision.id, adjudicatedBy: decision.adjudicatedBy })}
        )
      `;

      logger.info({ adjudicationId: decision.id }, 'Wrote adjudication to model registry');
    } catch (error) {
      logger.error({ error, adjudicationId: decision.id }, 'Failed to write to model registry');
    }
  }

  /**
   * Get adjudication statistics
   */
  async getStats(options: {
    modelVersion?: string;
    adjudicatedBy?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<{
    total: number;
    approved: number;
    rejected: number;
    modified: number;
    avgConfidence: number;
    topReasons: { reason: string; count: number }[];
  }> {
    const { modelVersion, adjudicatedBy, startDate, endDate } = options;

    let whereClause = '1=1';
    const params: any[] = [];

    if (modelVersion) {
      whereClause += ` AND model_version = $${params.length + 1}`;
      params.push(modelVersion);
    }

    if (adjudicatedBy) {
      whereClause += ` AND adjudicated_by = $${params.length + 1}`;
      params.push(adjudicatedBy);
    }

    if (startDate) {
      whereClause += ` AND adjudicated_at >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ` AND adjudicated_at <= $${params.length + 1}`;
      params.push(endDate);
    }

    const stats = await this.db`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE decision = 'approve') as approved,
        COUNT(*) FILTER (WHERE decision = 'reject') as rejected,
        COUNT(*) FILTER (WHERE decision = 'modify') as modified,
        AVG(confidence) as avg_confidence
      FROM hil_adjudication_decisions
      WHERE ${this.db(whereClause)}
    `;

    const topReasons = await this.db`
      SELECT reason, COUNT(*) as count
      FROM hil_adjudication_decisions
      WHERE ${this.db(whereClause)} AND reason IS NOT NULL
      GROUP BY reason
      ORDER BY count DESC
      LIMIT 10
    `;

    return {
      total: parseInt(stats[0].total),
      approved: parseInt(stats[0].approved),
      rejected: parseInt(stats[0].rejected),
      modified: parseInt(stats[0].modified),
      avgConfidence: parseFloat(stats[0].avg_confidence || 0),
      topReasons: topReasons.map((r: any) => ({
        reason: r.reason,
        count: parseInt(r.count),
      })),
    };
  }
}
