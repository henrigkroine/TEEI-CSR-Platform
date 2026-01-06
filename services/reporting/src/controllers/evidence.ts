/**
 * Evidence Controller
 *
 * Handles evidence retrieval, filtering, and lineage tracking
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type {
  Evidence,
  EvidenceFilters,
  EvidenceLineage,
  EvidenceStats,
  MetricType,
  EvidenceSource,
} from '../types/evidence.js';

/**
 * Get evidence list with filters
 *
 * GET /companies/:id/evidence
 */
export async function getEvidence(
  request: FastifyRequest<{
    Params: { id: string };
    Querystring: EvidenceFilters & { limit?: number; offset?: number };
  }>,
  reply: FastifyReply
) {
  const { id: companyId } = request.params;
  const {
    metric_type,
    source,
    period,
    verified,
    tags,
    search,
    date_from,
    date_to,
    campaign_id,
    program_instance_id,
    limit = 50,
    offset = 0,
  } = request.query;

  try {
    // TODO: Replace with real database query
    let evidence = generateMockEvidence(companyId);

    // Apply filters
    if (metric_type && metric_type.length > 0) {
      evidence = evidence.filter((e) => metric_type.includes(e.metric_type));
    }

    if (source && source.length > 0) {
      evidence = evidence.filter((e) => source.includes(e.source));
    }

    if (period) {
      evidence = evidence.filter((e) => e.period === period);
    }

    if (verified !== undefined) {
      evidence = evidence.filter((e) => e.verified === verified);
    }

    if (tags && tags.length > 0) {
      evidence = evidence.filter((e) =>
        tags.some((tag) => e.tags.includes(tag))
      );
    }

    if (search) {
      const searchLower = search.toLowerCase();
      evidence = evidence.filter(
        (e) =>
          e.metric_name.toLowerCase().includes(searchLower) ||
          e.source_identifier.toLowerCase().includes(searchLower)
      );
    }

    if (date_from) {
      const fromDate = new Date(date_from);
      evidence = evidence.filter((e) => e.collected_at >= fromDate);
    }

    if (date_to) {
      const toDate = new Date(date_to);
      evidence = evidence.filter((e) => e.collected_at <= toDate);
    }

    // SWARM 6: Agent 4.4 - Campaign filtering
    if (campaign_id) {
      evidence = evidence.filter((e) => (e as any).campaign_id === campaign_id);
    }

    if (program_instance_id) {
      evidence = evidence.filter((e) => (e as any).program_instance_id === program_instance_id);
    }

    // Sort by collected_at DESC
    evidence.sort((a, b) => b.collected_at.getTime() - a.collected_at.getTime());

    // Paginate
    const total = evidence.length;
    const paginated = evidence.slice(offset, offset + limit);

    return reply.send({
      data: paginated,
      pagination: {
        total,
        limit,
        offset,
        has_more: offset + limit < total,
      },
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'EVIDENCE_FETCH_FAILED',
      message: 'Failed to fetch evidence',
    });
  }
}

/**
 * Get evidence lineage
 *
 * GET /companies/:id/evidence/:evidenceId/lineage
 */
export async function getEvidenceLineage(
  request: FastifyRequest<{
    Params: { id: string; evidenceId: string };
  }>,
  reply: FastifyReply
) {
  const { id: companyId, evidenceId } = request.params;

  try {
    // TODO: Replace with real lineage tracking
    const lineage = generateMockLineage(evidenceId, companyId);

    if (!lineage) {
      return reply.status(404).send({
        error: 'EVIDENCE_NOT_FOUND',
        message: 'Evidence not found',
      });
    }

    return reply.send(lineage);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'LINEAGE_FETCH_FAILED',
      message: 'Failed to fetch evidence lineage',
    });
  }
}

/**
 * Get evidence statistics
 *
 * GET /companies/:id/evidence/stats
 */
export async function getEvidenceStats(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply
) {
  const { id: companyId } = request.params;

  try {
    const evidence = generateMockEvidence(companyId);

    const stats: EvidenceStats = {
      total_count: evidence.length,
      verified_count: evidence.filter((e) => e.verified).length,
      unverified_count: evidence.filter((e) => !e.verified).length,
      by_metric_type: {} as Record<MetricType, number>,
      by_source: {} as Record<EvidenceSource, number>,
      by_period: {},
      oldest_evidence: new Date(Math.min(...evidence.map((e) => e.collected_at.getTime()))),
      newest_evidence: new Date(Math.max(...evidence.map((e) => e.collected_at.getTime()))),
    };

    // Count by metric type
    evidence.forEach((e) => {
      stats.by_metric_type[e.metric_type] = (stats.by_metric_type[e.metric_type] || 0) + 1;
      stats.by_source[e.source] = (stats.by_source[e.source] || 0) + 1;
      stats.by_period[e.period] = (stats.by_period[e.period] || 0) + 1;
    });

    return reply.send(stats);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'STATS_FETCH_FAILED',
      message: 'Failed to fetch evidence statistics',
    });
  }
}

/**
 * Generate mock evidence data
 * TODO: Replace with real database queries
 */
function generateMockEvidence(companyId: string): Evidence[] {
  const evidence: Evidence[] = [];
  const now = new Date();

  // Generate sample evidence for Q4 2024
  const samples = [
    {
      metric_type: 'volunteer_hours' as MetricType,
      metric_name: 'Total Volunteer Hours',
      value: 1250,
      source: 'benevity' as EvidenceSource,
      source_identifier: 'benevity-import-2024-12-01',
      period: '2024-Q4',
      verified: true,
      confidence_score: 0.95,
      tags: ['benevity', 'volunteer', 'q4'],
    },
    {
      metric_type: 'integration_score' as MetricType,
      metric_name: 'Cultural Integration Score',
      value: 7.8,
      source: 'manual_entry' as EvidenceSource,
      source_identifier: 'survey-2024-q4',
      period: '2024-Q4',
      verified: true,
      confidence_score: 0.88,
      tags: ['survey', 'integration', 'q4'],
    },
    {
      metric_type: 'language_score' as MetricType,
      metric_name: 'Language Proficiency Score',
      value: 6.5,
      source: 'manual_entry' as EvidenceSource,
      source_identifier: 'assessment-2024-q4',
      period: '2024-Q4',
      verified: true,
      confidence_score: 0.92,
      tags: ['assessment', 'language', 'q4'],
    },
    {
      metric_type: 'job_readiness_score' as MetricType,
      metric_name: 'Job Readiness Score',
      value: 8.2,
      source: 'manual_entry' as EvidenceSource,
      source_identifier: 'training-report-2024-q4',
      period: '2024-Q4',
      verified: false,
      confidence_score: 0.75,
      tags: ['training', 'job_readiness', 'q4'],
    },
    {
      metric_type: 'beneficiaries_reached' as MetricType,
      metric_name: 'Total Beneficiaries',
      value: 450,
      source: 'api_integration' as EvidenceSource,
      source_identifier: 'crm-sync-2024-12-15',
      period: '2024-Q4',
      verified: true,
      confidence_score: 0.98,
      tags: ['crm', 'beneficiaries', 'q4'],
    },
    {
      metric_type: 'investment_amount' as MetricType,
      metric_name: 'Total Program Investment',
      value: 125000,
      source: 'manual_entry' as EvidenceSource,
      source_identifier: 'finance-report-2024-q4',
      period: '2024-Q4',
      verified: true,
      confidence_score: 1.0,
      tags: ['finance', 'investment', 'q4'],
    },
    {
      metric_type: 'volunteer_hours' as MetricType,
      metric_name: 'Skills-Based Volunteering Hours',
      value: 340,
      source: 'goodera' as EvidenceSource,
      source_identifier: 'goodera-import-2024-12-01',
      period: '2024-Q4',
      verified: true,
      confidence_score: 0.93,
      tags: ['goodera', 'volunteer', 'skills', 'q4'],
    },
    {
      metric_type: 'outcome_delta' as MetricType,
      metric_name: 'Employment Outcome Change',
      value: 12,
      source: 'calculated' as EvidenceSource,
      source_identifier: 'calc-employment-delta-2024-q4',
      period: '2024-Q4',
      verified: false,
      confidence_score: 0.82,
      tags: ['calculated', 'employment', 'q4'],
    },
  ];

  samples.forEach((sample, index) => {
    evidence.push({
      id: `evidence-${companyId}-${index}`,
      company_id: companyId,
      ...sample,
      collected_at: new Date(now.getTime() - Math.random() * 90 * 24 * 60 * 60 * 1000), // Last 90 days
      metadata: {
        imported_by: 'system',
        validation_passed: true,
      },
      redacted: false,
      created_at: now,
      updated_at: now,
    });
  });

  return evidence;
}

/**
 * Generate mock lineage data
 * TODO: Replace with real lineage tracking
 */
function generateMockLineage(evidenceId: string, companyId: string): EvidenceLineage | null {
  // Mock lineage for SROI calculation
  return {
    evidence_id: evidenceId,
    metric_name: 'SROI Ratio',
    value: 2.45,
    source: 'calculated' as EvidenceSource,
    collected_at: new Date(),
    dependencies: [
      {
        evidence_id: 'evidence-vh-001',
        metric_name: 'Total Volunteer Hours',
        value: 1250,
        relationship: 'input',
      },
      {
        evidence_id: 'evidence-inv-001',
        metric_name: 'Total Investment',
        value: 125000,
        relationship: 'input',
      },
      {
        evidence_id: 'evidence-int-001',
        metric_name: 'Integration Score',
        value: 7.8,
        relationship: 'input',
      },
      {
        evidence_id: 'evidence-lang-001',
        metric_name: 'Language Score',
        value: 6.5,
        relationship: 'input',
      },
      {
        evidence_id: 'evidence-job-001',
        metric_name: 'Job Readiness Score',
        value: 8.2,
        relationship: 'input',
      },
    ],
    calculations: [
      {
        step: 1,
        operation: 'multiply',
        formula: 'volunteer_hours * volunteer_hour_value',
        inputs: {
          volunteer_hours: 1250,
          volunteer_hour_value: 29.95,
        },
        output: 37437.5,
        timestamp: new Date(),
      },
      {
        step: 2,
        operation: 'multiply',
        formula: 'integration_score * weight * beneficiaries',
        inputs: {
          integration_score: 7.8,
          weight: 1.0,
          beneficiaries: 450,
        },
        output: 3510,
        timestamp: new Date(),
      },
      {
        step: 3,
        operation: 'sum',
        formula: 'volunteer_value + integration_value + language_value + job_value',
        inputs: {
          volunteer_value: 37437.5,
          integration_value: 3510,
          language_value: 2925,
          job_value: 3690,
        },
        output: 47562.5,
        timestamp: new Date(),
      },
      {
        step: 4,
        operation: 'divide',
        formula: 'total_social_value / total_investment',
        inputs: {
          total_social_value: 306562.5,
          total_investment: 125000,
        },
        output: 2.45,
        timestamp: new Date(),
      },
    ],
    transformations: [
      {
        step: 1,
        type: 'normalization',
        description: 'Normalized scores to 0-10 scale',
        input_value: { integration: 78, language: 65, job_readiness: 82 },
        output_value: { integration: 7.8, language: 6.5, job_readiness: 8.2 },
        timestamp: new Date(),
      },
      {
        step: 2,
        type: 'aggregation',
        description: 'Aggregated volunteer hours from multiple sources',
        input_value: [
          { source: 'benevity', hours: 910 },
          { source: 'goodera', hours: 340 },
        ],
        output_value: 1250,
        timestamp: new Date(),
      },
    ],
  };
}
