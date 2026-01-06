import { db, outcomeScores, evidenceSnippets } from '@teei/shared-schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

/**
 * Evidence for a single metric
 */
export interface EvidenceItem {
  id: string;
  snippetText: string;
  sourceRef: string;
  textType: string;
  dimension: string;
  score: string;
  confidence: string;
  method: string;
  createdAt: Date;
}

/**
 * Get evidence for a specific metric
 *
 * @param metricId - UUID of the metric
 * @param limit - Maximum number of evidence items to return (default: 20)
 * @returns Array of evidence items with Q2Q scores and snippets
 */
export async function getEvidenceForMetric(
  metricId: string,
  limit: number = 20
): Promise<EvidenceItem[]> {
  const results = await db
    .select({
      id: evidenceSnippets.id,
      snippetText: evidenceSnippets.snippetText,
      sourceRef: evidenceSnippets.sourceRef,
      textType: outcomeScores.textType,
      dimension: outcomeScores.dimension,
      score: outcomeScores.score,
      confidence: outcomeScores.confidence,
      method: outcomeScores.method,
      createdAt: outcomeScores.createdAt,
    })
    .from(outcomeScores)
    .innerJoin(
      evidenceSnippets,
      eq(evidenceSnippets.outcomeScoreId, outcomeScores.id)
    )
    .where(eq(outcomeScores.textId, metricId))
    .orderBy(desc(outcomeScores.createdAt))
    .limit(limit);

  return results.map((r: any) => ({
    id: r.id,
    snippetText: r.snippetText || '',
    sourceRef: r.sourceRef || '',
    textType: r.textType || 'unknown',
    dimension: r.dimension,
    score: r.score || '0.000',
    confidence: r.confidence || '0.000',
    method: r.method || 'ai_classifier',
    createdAt: r.createdAt,
  }));
}

/**
 * Get all evidence for a company in a specific period
 *
 * @param companyId - UUID of the company
 * @param periodStart - Start date (ISO format)
 * @param periodEnd - End date (ISO format)
 * @param limit - Maximum number of evidence items to return (default: 20)
 * @returns Array of evidence items with Q2Q scores and snippets
 */
export async function getEvidenceForPeriod(
  companyId: string,
  periodStart: string,
  periodEnd: string,
  limit: number = 20
): Promise<EvidenceItem[]> {
  // For period-based queries, we filter by createdAt timestamp
  // In a production system, you'd link this through metrics -> profiles -> evidence
  const results = await db
    .select({
      id: evidenceSnippets.id,
      snippetText: evidenceSnippets.snippetText,
      sourceRef: evidenceSnippets.sourceRef,
      textType: outcomeScores.textType,
      dimension: outcomeScores.dimension,
      score: outcomeScores.score,
      confidence: outcomeScores.confidence,
      method: outcomeScores.method,
      createdAt: outcomeScores.createdAt,
    })
    .from(outcomeScores)
    .innerJoin(
      evidenceSnippets,
      eq(evidenceSnippets.outcomeScoreId, outcomeScores.id)
    )
    .where(
      and(
        gte(outcomeScores.createdAt, new Date(periodStart)),
        lte(outcomeScores.createdAt, new Date(periodEnd))
      )
    )
    .orderBy(desc(outcomeScores.createdAt))
    .limit(limit);

  return results.map((r: any) => ({
    id: r.id,
    snippetText: r.snippetText || '',
    sourceRef: r.sourceRef || '',
    textType: r.textType || 'unknown',
    dimension: r.dimension,
    score: r.score || '0.000',
    confidence: r.confidence || '0.000',
    method: r.method || 'ai_classifier',
    createdAt: r.createdAt,
  }));
}

/**
 * Get evidence grouped by dimension
 *
 * @param metricId - UUID of the metric
 * @returns Evidence items grouped by Q2Q dimension
 */
export async function getEvidenceByDimension(
  metricId: string
): Promise<Record<string, EvidenceItem[]>> {
  const evidence = await getEvidenceForMetric(metricId, 100);

  const grouped: Record<string, EvidenceItem[]> = {};

  for (const item of evidence) {
    if (!grouped[item.dimension]) {
      grouped[item.dimension] = [];
    }
    grouped[item.dimension].push(item);
  }

  return grouped;
}
