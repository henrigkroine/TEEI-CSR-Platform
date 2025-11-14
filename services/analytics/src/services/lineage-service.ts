import { db } from '@teei/shared-schema/db';
import { metricLineage, buddySystemEvents } from '@teei/shared-schema';
import { eq, inArray, sql } from 'drizzle-orm';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('lineage-service');

/**
 * Parameters for storing metric lineage
 */
export interface StoreLineageParams {
  metricType: 'sroi' | 'vis' | 'sdg_distribution';
  metricId: string;
  sourceEventIds: string[];
  calculationFormula: string;
  calculatedBy?: string;
  metadata?: Record<string, any>;
}

/**
 * Parameters for marking events as processed
 */
export interface MarkEventsProcessedParams {
  eventIds: string[];
  metricType: 'sroi' | 'vis' | 'sdg_distribution';
  metricId: string;
  contribution?: number;
}

/**
 * Result of lineage query
 */
export interface LineageResult {
  id: string;
  metricType: string;
  metricId: string;
  sourceEventIds: string[];
  calculationFormula: string | null;
  calculatedAt: Date;
  calculatedBy: string | null;
  metadata: Record<string, any> | null;
}

/**
 * Event impact result showing which metrics were derived from an event
 */
export interface EventImpactResult {
  eventId: string;
  eventType: string;
  timestamp: Date;
  derivedMetrics: Array<{
    type: string;
    metric_id: string;
    calculation_date: string;
    contribution?: number;
  }>;
}

/**
 * Stores metric lineage information in the database
 * This creates an audit trail showing which events contributed to a calculated metric
 *
 * @param params - Lineage storage parameters
 * @returns The created lineage record ID
 */
export async function storeMetricLineage(params: StoreLineageParams): Promise<string> {
  const { metricType, metricId, sourceEventIds, calculationFormula, calculatedBy, metadata } = params;

  logger.info(
    {
      metricType,
      metricId,
      eventCount: sourceEventIds.length,
    },
    'Storing metric lineage'
  );

  try {
    const [result] = await db
      .insert(metricLineage)
      .values({
        metricType,
        metricId,
        sourceEventIds: sourceEventIds as any,
        calculationFormula,
        calculatedBy: calculatedBy || 'system',
        metadata: metadata || {},
      })
      .returning({ id: metricLineage.id });

    logger.info({ lineageId: result.id, metricType, metricId }, 'Metric lineage stored successfully');

    return result.id;
  } catch (error) {
    logger.error({ error, metricType, metricId }, 'Failed to store metric lineage');
    throw error;
  }
}

/**
 * Updates events to mark them as processed and records which metrics they contributed to
 * This bidirectional linking allows for both forward (event -> metrics) and backward (metric -> events) tracing
 *
 * @param params - Event processing parameters
 */
export async function markEventsAsProcessed(params: MarkEventsProcessedParams): Promise<void> {
  const { eventIds, metricType, metricId, contribution } = params;

  if (eventIds.length === 0) {
    logger.warn({ metricType, metricId }, 'No events to mark as processed');
    return;
  }

  logger.info(
    {
      metricType,
      metricId,
      eventCount: eventIds.length,
    },
    'Marking events as processed'
  );

  try {
    // For each event, append the new derived metric to the derivedMetrics array
    const derivedMetric = {
      type: metricType,
      metric_id: metricId,
      calculation_date: new Date().toISOString(),
      ...(contribution !== undefined && { contribution }),
    };

    // PostgreSQL: Use jsonb_insert to append to array
    // This is more efficient than reading, updating, and writing back
    await db.execute(sql`
      UPDATE buddy_system_events
      SET derived_metrics = COALESCE(derived_metrics, '[]'::jsonb) || ${JSON.stringify(derivedMetric)}::jsonb
      WHERE event_id = ANY(${eventIds}::uuid[])
    `);

    logger.info({ metricType, metricId, eventCount: eventIds.length }, 'Events marked as processed successfully');
  } catch (error) {
    logger.error({ error, metricType, metricId }, 'Failed to mark events as processed');
    throw error;
  }
}

/**
 * Retrieves lineage information for a specific metric
 * This shows which events contributed to the metric calculation
 *
 * @param metricType - Type of metric (sroi, vis, etc.)
 * @param metricId - ID of the metric
 * @returns Lineage information or null if not found
 */
export async function getMetricLineage(metricType: string, metricId: string): Promise<LineageResult | null> {
  logger.info({ metricType, metricId }, 'Retrieving metric lineage');

  try {
    const results = await db
      .select()
      .from(metricLineage)
      .where(sql`${metricLineage.metricType} = ${metricType} AND ${metricLineage.metricId}::text = ${metricId}`)
      .limit(1);

    if (results.length === 0) {
      logger.warn({ metricType, metricId }, 'No lineage found for metric');
      return null;
    }

    const result = results[0];
    return {
      id: result.id,
      metricType: result.metricType,
      metricId: result.metricId,
      sourceEventIds: result.sourceEventIds as string[],
      calculationFormula: result.calculationFormula,
      calculatedAt: result.calculatedAt,
      calculatedBy: result.calculatedBy,
      metadata: result.metadata as Record<string, any>,
    };
  } catch (error) {
    logger.error({ error, metricType, metricId }, 'Failed to retrieve metric lineage');
    throw error;
  }
}

/**
 * Retrieves event details for lineage tracing
 * This provides the actual event data that contributed to a metric
 *
 * @param eventIds - Array of event IDs to retrieve
 * @returns Array of events with their details
 */
export async function getSourceEvents(eventIds: string[]): Promise<any[]> {
  if (eventIds.length === 0) {
    return [];
  }

  logger.info({ eventCount: eventIds.length }, 'Retrieving source events');

  try {
    const events = await db
      .select()
      .from(buddySystemEvents)
      .where(sql`${buddySystemEvents.eventId}::text = ANY(${eventIds}::text[])`);

    logger.info({ retrieved: events.length, requested: eventIds.length }, 'Source events retrieved');

    return events;
  } catch (error) {
    logger.error({ error, eventCount: eventIds.length }, 'Failed to retrieve source events');
    throw error;
  }
}

/**
 * Retrieves impact information for a specific event
 * This shows which metrics have been derived from the event
 *
 * @param eventId - ID of the event
 * @returns Event impact information or null if not found
 */
export async function getEventImpact(eventId: string): Promise<EventImpactResult | null> {
  logger.info({ eventId }, 'Retrieving event impact');

  try {
    const results = await db
      .select({
        eventId: buddySystemEvents.eventId,
        eventType: buddySystemEvents.eventType,
        timestamp: buddySystemEvents.timestamp,
        derivedMetrics: buddySystemEvents.derivedMetrics,
      })
      .from(buddySystemEvents)
      .where(eq(buddySystemEvents.eventId, eventId))
      .limit(1);

    if (results.length === 0) {
      logger.warn({ eventId }, 'Event not found');
      return null;
    }

    const result = results[0];
    return {
      eventId: result.eventId,
      eventType: result.eventType,
      timestamp: result.timestamp,
      derivedMetrics: (result.derivedMetrics as any) || [],
    };
  } catch (error) {
    logger.error({ error, eventId }, 'Failed to retrieve event impact');
    throw error;
  }
}

/**
 * Calculates data quality score based on lineage information
 * Higher scores indicate more complete and reliable data
 *
 * @param eventCount - Number of events that contributed to the metric
 * @param eventTypes - Set of unique event types
 * @returns Data quality score between 0 and 1
 */
export function calculateDataQualityScore(eventCount: number, eventTypes: Set<string>): number {
  // Base score from event volume (logarithmic scale)
  // 100 events = 0.5, 1000 events = 0.7
  const volumeScore = Math.min(Math.log10(eventCount + 1) / 3, 0.7);

  // Diversity bonus based on event type variety
  // More diverse event types indicate richer data
  const expectedEventTypes = 6; // buddy_match, event_attended, skill_share, feedback, milestone, checkin
  const diversityScore = Math.min(eventTypes.size / expectedEventTypes, 1.0) * 0.3;

  // Combined score
  const qualityScore = volumeScore + diversityScore;

  // Ensure score is between 0.1 (minimum baseline) and 1.0 (perfect)
  return Math.max(0.1, Math.min(1.0, qualityScore));
}

/**
 * Retrieves all lineage records for a specific metric type within a time range
 * Useful for auditing and compliance reporting
 *
 * @param metricType - Type of metric to query
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @returns Array of lineage records
 */
export async function getLineageByDateRange(
  metricType: string,
  startDate: Date,
  endDate: Date
): Promise<LineageResult[]> {
  logger.info({ metricType, startDate, endDate }, 'Retrieving lineage by date range');

  try {
    const results = await db
      .select()
      .from(metricLineage)
      .where(
        sql`${metricLineage.metricType} = ${metricType}
            AND ${metricLineage.calculatedAt} >= ${startDate}
            AND ${metricLineage.calculatedAt} <= ${endDate}`
      )
      .orderBy(sql`${metricLineage.calculatedAt} DESC`);

    logger.info({ count: results.length }, 'Lineage records retrieved by date range');

    return results.map((result) => ({
      id: result.id,
      metricType: result.metricType,
      metricId: result.metricId,
      sourceEventIds: result.sourceEventIds as string[],
      calculationFormula: result.calculationFormula,
      calculatedAt: result.calculatedAt,
      calculatedBy: result.calculatedBy,
      metadata: result.metadata as Record<string, any>,
    }));
  } catch (error) {
    logger.error({ error, metricType, startDate, endDate }, 'Failed to retrieve lineage by date range');
    throw error;
  }
}
