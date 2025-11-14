import { db, buddySystemEvents } from '@teei/shared-schema';
import { sql, and, gte, lte, eq } from 'drizzle-orm';
import { createServiceLogger } from '@teei/shared-utils';
import sdgMappings from '../config/sdg-mappings.json';

const logger = createServiceLogger('buddy-connector:sdg-queries');

export interface SDGDistribution {
  sdg: number;
  name: string;
  description: string;
  event_count: number;
}

export interface SDGCoverageReport {
  period: string;
  program: string;
  total_events: number;
  sdg_coverage: Record<number, SDGDistribution>;
  covered_sdgs: number[];
}

export interface SDGEventFilter {
  sdg?: number;
  startDate?: Date;
  endDate?: Date;
  eventType?: string;
  limit?: number;
  offset?: number;
}

/**
 * Get SDG distribution for a given time period
 * Returns count of events for each SDG goal
 */
export async function getSDGDistribution(
  startDate?: Date,
  endDate?: Date
): Promise<SDGDistribution[]> {
  logger.info({ startDate, endDate }, 'Fetching SDG distribution');

  const conditions = [];
  if (startDate) {
    conditions.push(gte(buddySystemEvents.timestamp, startDate));
  }
  if (endDate) {
    conditions.push(lte(buddySystemEvents.timestamp, endDate));
  }

  // Query all events in the period
  const events = await db
    .select({
      payload: buddySystemEvents.payload,
    })
    .from(buddySystemEvents)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  // Count events by SDG
  const sdgCounts = new Map<number, number>();

  for (const event of events) {
    const sdgs = (event.payload as any).sdgs || [];
    for (const sdg of sdgs) {
      sdgCounts.set(sdg, (sdgCounts.get(sdg) || 0) + 1);
    }
  }

  // Build distribution result
  const distribution: SDGDistribution[] = [];

  for (const [sdg, count] of sdgCounts.entries()) {
    const reference = sdgMappings.sdgReference[sdg.toString() as keyof typeof sdgMappings.sdgReference];
    if (reference) {
      distribution.push({
        sdg,
        name: reference.name,
        description: reference.description,
        event_count: count,
      });
    }
  }

  // Sort by SDG number
  distribution.sort((a, b) => a.sdg - b.sdg);

  logger.info({ sdgCount: distribution.length }, 'SDG distribution calculated');

  return distribution;
}

/**
 * Query events by SDG number
 * Supports pagination and filtering
 */
export async function getEventsBySDG(filter: SDGEventFilter) {
  const { sdg, startDate, endDate, eventType, limit = 100, offset = 0 } = filter;

  logger.info(filter, 'Querying events by SDG');

  if (!sdg) {
    throw new Error('SDG number is required');
  }

  const conditions = [];

  // Filter by SDG using JSON containment operator
  conditions.push(sql`${buddySystemEvents.payload}->>'sdgs' @> ${JSON.stringify([sdg])}`);

  if (startDate) {
    conditions.push(gte(buddySystemEvents.timestamp, startDate));
  }
  if (endDate) {
    conditions.push(lte(buddySystemEvents.timestamp, endDate));
  }
  if (eventType) {
    conditions.push(eq(buddySystemEvents.eventType, eventType));
  }

  const events = await db
    .select()
    .from(buddySystemEvents)
    .where(and(...conditions))
    .limit(limit)
    .offset(offset)
    .orderBy(buddySystemEvents.timestamp);

  logger.info({ sdg, eventCount: events.length }, 'Events retrieved by SDG');

  return events;
}

/**
 * Get SDG coverage report for a time period
 * Shows which SDGs are covered and event counts
 */
export async function getSDGCoverageReport(
  startDate?: Date,
  endDate?: Date
): Promise<SDGCoverageReport> {
  logger.info({ startDate, endDate }, 'Generating SDG coverage report');

  const distribution = await getSDGDistribution(startDate, endDate);

  // Count total events
  const conditions = [];
  if (startDate) {
    conditions.push(gte(buddySystemEvents.timestamp, startDate));
  }
  if (endDate) {
    conditions.push(lte(buddySystemEvents.timestamp, endDate));
  }

  const [totalResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(buddySystemEvents)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const totalEvents = Number(totalResult?.count || 0);

  // Build coverage map
  const sdgCoverage: Record<number, SDGDistribution> = {};
  const coveredSDGs: number[] = [];

  for (const item of distribution) {
    sdgCoverage[item.sdg] = item;
    coveredSDGs.push(item.sdg);
  }

  // Format period string
  let period = 'all-time';
  if (startDate && endDate) {
    period = `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`;
  } else if (startDate) {
    period = `since ${startDate.toISOString().split('T')[0]}`;
  } else if (endDate) {
    period = `until ${endDate.toISOString().split('T')[0]}`;
  }

  const report: SDGCoverageReport = {
    period,
    program: 'buddy',
    total_events: totalEvents,
    sdg_coverage: sdgCoverage,
    covered_sdgs: coveredSDGs.sort((a, b) => a - b),
  };

  logger.info(
    { period, totalEvents, coveredSDGs: coveredSDGs.length },
    'SDG coverage report generated'
  );

  return report;
}

/**
 * Get quarterly SDG report
 * Helper for generating Q1, Q2, Q3, Q4 reports
 */
export async function getQuarterlySDGReport(year: number, quarter: 1 | 2 | 3 | 4) {
  const quarterStarts = {
    1: new Date(year, 0, 1),
    2: new Date(year, 3, 1),
    3: new Date(year, 6, 1),
    4: new Date(year, 9, 1),
  };

  const quarterEnds = {
    1: new Date(year, 2, 31, 23, 59, 59),
    2: new Date(year, 5, 30, 23, 59, 59),
    3: new Date(year, 8, 30, 23, 59, 59),
    4: new Date(year, 11, 31, 23, 59, 59),
  };

  const startDate = quarterStarts[quarter];
  const endDate = quarterEnds[quarter];

  logger.info({ year, quarter }, 'Generating quarterly SDG report');

  const report = await getSDGCoverageReport(startDate, endDate);
  report.period = `${year}-Q${quarter}`;

  return report;
}

/**
 * Get SDG breakdown by event type
 * Shows which event types contribute to each SDG
 */
export async function getSDGBreakdownByEventType(
  sdg: number,
  startDate?: Date,
  endDate?: Date
) {
  logger.info({ sdg, startDate, endDate }, 'Generating SDG breakdown by event type');

  const conditions = [];

  // Filter by SDG
  conditions.push(sql`${buddySystemEvents.payload}->>'sdgs' @> ${JSON.stringify([sdg])}`);

  if (startDate) {
    conditions.push(gte(buddySystemEvents.timestamp, startDate));
  }
  if (endDate) {
    conditions.push(lte(buddySystemEvents.timestamp, endDate));
  }

  const results = await db
    .select({
      eventType: buddySystemEvents.eventType,
      count: sql<number>`count(*)`,
    })
    .from(buddySystemEvents)
    .where(and(...conditions))
    .groupBy(buddySystemEvents.eventType)
    .orderBy(sql`count(*) DESC`);

  logger.info({ sdg, breakdown: results.length }, 'SDG breakdown by event type generated');

  return results.map(r => ({
    event_type: r.eventType,
    count: Number(r.count),
  }));
}
