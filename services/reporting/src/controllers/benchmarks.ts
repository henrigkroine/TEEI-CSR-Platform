/**
 * Benchmarks & Cohorts Controller
 *
 * Handles cohort comparison and peer benchmarking
 *
 * @module controllers/benchmarks
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type {
  BenchmarksResponse,
  CohortsListResponse,
  Cohort,
  BenchmarkData,
  CohortCriteria,
  Industry,
  CompanySize,
  Geography,
} from '../types/benchmarks.js';
import { getPercentileTier, getIndustryLabel, getCompanySizeLabel, getGeographyLabel } from '../types/benchmarks.js';

/**
 * Get benchmarks for a company compared to cohort
 *
 * GET /companies/:id/benchmarks
 */
export async function getBenchmarks(
  request: FastifyRequest<{
    Params: { id: string };
    Querystring: {
      industry?: Industry;
      size?: CompanySize;
      geography?: Geography;
      period?: string;
    };
  }>,
  reply: FastifyReply
) {
  const { id: companyId } = request.params;
  const { industry, size, geography, period } = request.query;

  try {
    // Build cohort criteria from query params
    const criteria: CohortCriteria = {
      industry,
      size,
      geography,
    };

    // TODO: Fetch from Worker-2 DW API
    // For now, return mock data
    const benchmarks = getMockBenchmarks(companyId, criteria, period);

    return reply.send(benchmarks);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'BENCHMARKS_FETCH_FAILED',
      message: 'Failed to fetch benchmarks data',
    });
  }
}

/**
 * Get available cohorts for a company
 *
 * GET /companies/:id/cohorts
 */
export async function getCohorts(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply
) {
  const { id: companyId } = request.params;

  try {
    // TODO: Fetch from Worker-2 DW API
    // For now, return mock cohorts
    const cohorts = getMockCohorts(companyId);

    return reply.send(cohorts);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'COHORTS_FETCH_FAILED',
      message: 'Failed to fetch available cohorts',
    });
  }
}

/**
 * Mock data functions (replace with real Worker-2 DW API calls)
 */

function getMockBenchmarks(
  companyId: string,
  criteria: CohortCriteria,
  period?: string
): BenchmarksResponse {
  // Generate cohort based on criteria
  const cohort = generateCohort(criteria);

  // Mock benchmark data
  const benchmarks: BenchmarkData[] = [
    {
      metric: 'sroi',
      metric_label: 'Social Return on Investment',
      company_value: 4.2,
      cohort_average: 3.5,
      cohort_median: 3.2,
      cohort_min: 1.8,
      cohort_max: 6.1,
      percentile: 78,
      unit: 'ratio',
      trend: 'up',
    },
    {
      metric: 'beneficiaries',
      metric_label: 'Total Beneficiaries',
      company_value: 1250,
      cohort_average: 980,
      cohort_median: 850,
      cohort_min: 150,
      cohort_max: 3200,
      percentile: 82,
      unit: 'count',
      trend: 'up',
    },
    {
      metric: 'volunteer_hours',
      metric_label: 'Volunteer Hours',
      company_value: 3200,
      cohort_average: 2800,
      cohort_median: 2500,
      cohort_min: 500,
      cohort_max: 8500,
      percentile: 65,
      unit: 'hours',
      trend: 'stable',
    },
    {
      metric: 'programs',
      metric_label: 'Active Programs',
      company_value: 12,
      cohort_average: 8,
      cohort_median: 7,
      cohort_min: 2,
      cohort_max: 25,
      percentile: 92,
      unit: 'count',
      trend: 'up',
    },
    {
      metric: 'engagement_rate',
      metric_label: 'Employee Engagement Rate',
      company_value: 68,
      cohort_average: 52,
      cohort_median: 48,
      cohort_min: 15,
      cohort_max: 85,
      percentile: 88,
      unit: '%',
      trend: 'up',
    },
    {
      metric: 'impact_score',
      metric_label: 'Overall Impact Score',
      company_value: 87,
      cohort_average: 72,
      cohort_median: 70,
      cohort_min: 35,
      cohort_max: 95,
      percentile: 91,
      unit: 'score',
      trend: 'up',
    },
  ];

  const now = new Date();
  const nextRefresh = new Date(now);
  nextRefresh.setDate(nextRefresh.getDate() + 1);

  return {
    company_id: companyId,
    company_name: 'Acme Corporation',
    cohort,
    period: period || 'Q4 2024',
    benchmarks,
    last_refreshed: now,
    next_refresh: nextRefresh,
  };
}

function getMockCohorts(companyId: string): CohortsListResponse {
  const now = new Date();

  const cohorts: Cohort[] = [
    {
      id: 'tech-large-na',
      name: 'Large Tech Companies (North America)',
      description: 'Technology companies with 501-5000 employees in North America',
      criteria: {
        industry: 'technology',
        size: 'large',
        geography: 'north_america',
      },
      company_count: 142,
      last_updated: now,
    },
    {
      id: 'tech-large-global',
      name: 'Large Tech Companies (Global)',
      description: 'Technology companies with 501-5000 employees worldwide',
      criteria: {
        industry: 'technology',
        size: 'large',
        geography: 'global',
      },
      company_count: 387,
      last_updated: now,
    },
    {
      id: 'tech-all-na',
      name: 'All Tech Companies (North America)',
      description: 'Technology companies of all sizes in North America',
      criteria: {
        industry: 'technology',
        geography: 'north_america',
      },
      company_count: 521,
      last_updated: now,
    },
    {
      id: 'all-large-na',
      name: 'Large Companies (All Industries, North America)',
      description: 'Companies with 501-5000 employees across all industries in North America',
      criteria: {
        size: 'large',
        geography: 'north_america',
      },
      company_count: 1243,
      last_updated: now,
    },
    {
      id: 'all-all-global',
      name: 'All Companies (Global)',
      description: 'Companies of all sizes and industries worldwide',
      criteria: {
        geography: 'global',
      },
      company_count: 4852,
      last_updated: now,
    },
  ];

  // Suggest the most specific cohort (tech-large-na)
  const suggestedCohort = cohorts[0];

  return {
    available_cohorts: cohorts,
    suggested_cohort: suggestedCohort,
  };
}

/**
 * Helper: Generate cohort from criteria
 */
function generateCohort(criteria: CohortCriteria): Cohort {
  const parts: string[] = [];
  const nameParts: string[] = [];
  const descParts: string[] = [];

  if (criteria.industry) {
    parts.push(criteria.industry);
    nameParts.push(getIndustryLabel(criteria.industry));
    descParts.push(getIndustryLabel(criteria.industry).toLowerCase());
  } else {
    nameParts.push('All Industries');
    descParts.push('all industries');
  }

  if (criteria.size) {
    parts.push(criteria.size);
    nameParts.push(getCompanySizeLabel(criteria.size).split(' ')[0]); // Just "Small", "Medium", etc.
    descParts.push(getCompanySizeLabel(criteria.size).toLowerCase());
  } else {
    nameParts.push('All Sizes');
    descParts.push('all sizes');
  }

  if (criteria.geography) {
    parts.push(criteria.geography);
    nameParts.push(`(${getGeographyLabel(criteria.geography)})`);
    descParts.push(`in ${getGeographyLabel(criteria.geography)}`);
  } else {
    nameParts.push('(Global)');
    descParts.push('worldwide');
  }

  const id = parts.join('-') || 'all-all-global';
  const name = nameParts.join(' ');
  const description = `Companies ${descParts.join(', ')}`;

  // Mock company count (would come from DW)
  const companyCount = Math.floor(Math.random() * 1000) + 50;

  return {
    id,
    name,
    description,
    criteria,
    company_count: companyCount,
    last_updated: new Date(),
  };
}
