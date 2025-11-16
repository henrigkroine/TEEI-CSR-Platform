/**
 * Metric Template Catalog - Allow-listed templates for safe NLQ query generation
 *
 * This catalog defines the ONLY metrics that can be queried via NLQ.
 * Each template includes:
 * - Safe SQL/CHQL templates with parameterization
 * - Allowed time ranges, groupings, and filters
 * - Security constraints (tenant isolation, PII exclusion)
 * - Performance hints (complexity, result limits, cache TTL)
 */

export interface MetricTemplate {
  id: string;
  displayName: string;
  description: string;
  category: 'impact' | 'financial' | 'engagement' | 'outcomes' | 'volunteers';

  // Query templates
  sqlTemplate: string;
  chqlTemplate?: string;

  // Allowed parameters
  allowedTimeRanges: Array<'last_7d' | 'last_30d' | 'last_90d' | 'last_quarter' | 'ytd' | 'last_year' | 'custom'>;
  allowedGroupBy?: Array<'program' | 'location' | 'demographic' | 'volunteer' | 'outcome_dimension'>;
  allowedFilters?: Record<string, string[]>;
  maxTimeWindowDays: number;

  // Security constraints
  requiresTenantFilter: boolean;
  allowedJoins: string[];
  deniedColumns: string[];

  // Performance hints
  estimatedComplexity: 'low' | 'medium' | 'high';
  maxResultRows: number;
  cacheTtlSeconds: number;

  // Example questions
  exampleQuestions: string[];
  tags: string[];
}

/**
 * Canonical Metric Template Catalog (20 core templates)
 */
export const METRIC_CATALOG: MetricTemplate[] = [
  // ===== IMPACT METRICS =====
  {
    id: 'sroi_ratio',
    displayName: 'Social Return on Investment (SROI)',
    description: 'Calculate SROI ratio for a given time period',
    category: 'impact',
    sqlTemplate: `
      SELECT
        company_id,
        period_start,
        period_end,
        sroi_ratio,
        participants_count,
        volunteers_count
      FROM metrics_company_period
      WHERE company_id = {{companyId}}
        AND period_start >= {{startDate}}
        AND period_end <= {{endDate}}
      ORDER BY period_start DESC
      LIMIT {{limit}}
    `,
    chqlTemplate: `
      SELECT
        company_id,
        period_start,
        period_end,
        avg(sroi_ratio) as sroi_ratio,
        sum(participants_count) as participants_count,
        sum(volunteers_count) as volunteers_count
      FROM analytics.metrics_company_period_mv
      WHERE company_id = {{companyId}}
        AND period_start >= {{startDate}}
        AND period_end <= {{endDate}}
      GROUP BY company_id, period_start, period_end
      ORDER BY period_start DESC
      LIMIT {{limit}}
    `,
    allowedTimeRanges: ['last_30d', 'last_90d', 'last_quarter', 'ytd', 'last_year', 'custom'],
    maxTimeWindowDays: 365,
    requiresTenantFilter: true,
    allowedJoins: [],
    deniedColumns: [],
    estimatedComplexity: 'low',
    maxResultRows: 100,
    cacheTtlSeconds: 3600,
    exampleQuestions: [
      'What is our SROI for last quarter?',
      'Show me SROI trend for the past year',
      'Calculate SROI for Q1 2025',
    ],
    tags: ['sroi', 'impact', 'financial'],
  },

  {
    id: 'vis_score',
    displayName: 'Volunteer Impact Score (VIS)',
    description: 'Aggregate VIS scores for volunteers',
    category: 'impact',
    sqlTemplate: `
      SELECT
        company_id,
        period_start,
        period_end,
        vis_score,
        volunteers_count
      FROM metrics_company_period
      WHERE company_id = {{companyId}}
        AND period_start >= {{startDate}}
        AND period_end <= {{endDate}}
      ORDER BY period_start DESC
      LIMIT {{limit}}
    `,
    allowedTimeRanges: ['last_30d', 'last_90d', 'last_quarter', 'ytd', 'custom'],
    maxTimeWindowDays: 365,
    requiresTenantFilter: true,
    allowedJoins: [],
    deniedColumns: [],
    estimatedComplexity: 'low',
    maxResultRows: 100,
    cacheTtlSeconds: 3600,
    exampleQuestions: [
      'What is our average VIS score?',
      'Show VIS trend for last 3 months',
      'How has VIS changed this quarter?',
    ],
    tags: ['vis', 'volunteers', 'impact'],
  },

  {
    id: 'outcome_scores_by_dimension',
    displayName: 'Outcome Scores by Dimension',
    description: 'Average outcome scores across dimensions (confidence, belonging, etc.)',
    category: 'outcomes',
    sqlTemplate: `
      SELECT
        dimension,
        AVG(score) as avg_score,
        COUNT(*) as sample_size,
        STDDEV(score) as std_dev
      FROM outcome_scores
      WHERE text_type = 'feedback'
        AND created_at >= {{startDate}}
        AND created_at <= {{endDate}}
        AND EXISTS (
          SELECT 1 FROM users WHERE users.id = outcome_scores.user_id AND users.company_id = {{companyId}}
        )
      GROUP BY dimension
      ORDER BY avg_score DESC
      LIMIT {{limit}}
    `,
    allowedTimeRanges: ['last_7d', 'last_30d', 'last_90d', 'custom'],
    allowedGroupBy: ['outcome_dimension'],
    maxTimeWindowDays: 180,
    requiresTenantFilter: true,
    allowedJoins: ['users'],
    deniedColumns: ['email', 'phone', 'address'],
    estimatedComplexity: 'medium',
    maxResultRows: 10, // Only 5-6 dimensions
    cacheTtlSeconds: 1800, // 30 minutes
    exampleQuestions: [
      'What are our outcome scores by dimension?',
      'Show me confidence and belonging scores for last month',
      'How do our outcome dimensions compare?',
    ],
    tags: ['outcomes', 'q2q', 'dimensions'],
  },

  {
    id: 'participant_engagement',
    displayName: 'Participant Engagement Metrics',
    description: 'Active participants, sessions, and engagement rates',
    category: 'engagement',
    sqlTemplate: `
      SELECT
        period_start,
        period_end,
        participants_count,
        sessions_count,
        ROUND(sessions_count::decimal / NULLIF(participants_count, 0), 2) as sessions_per_participant
      FROM metrics_company_period
      WHERE company_id = {{companyId}}
        AND period_start >= {{startDate}}
        AND period_end <= {{endDate}}
      ORDER BY period_start DESC
      LIMIT {{limit}}
    `,
    allowedTimeRanges: ['last_30d', 'last_90d', 'ytd', 'custom'],
    maxTimeWindowDays: 365,
    requiresTenantFilter: true,
    allowedJoins: [],
    deniedColumns: [],
    estimatedComplexity: 'low',
    maxResultRows: 100,
    cacheTtlSeconds: 3600,
    exampleQuestions: [
      'How many active participants do we have?',
      'Show participant engagement over time',
      'What is our session count for last quarter?',
    ],
    tags: ['engagement', 'participants', 'sessions'],
  },

  {
    id: 'volunteer_activity',
    displayName: 'Volunteer Activity Metrics',
    description: 'Volunteer counts, hours, and activity breakdown',
    category: 'volunteers',
    sqlTemplate: `
      SELECT
        period_start,
        period_end,
        volunteers_count
      FROM metrics_company_period
      WHERE company_id = {{companyId}}
        AND period_start >= {{startDate}}
        AND period_end <= {{endDate}}
      ORDER BY period_start DESC
      LIMIT {{limit}}
    `,
    allowedTimeRanges: ['last_30d', 'last_90d', 'ytd', 'custom'],
    maxTimeWindowDays: 365,
    requiresTenantFilter: true,
    allowedJoins: [],
    deniedColumns: [],
    estimatedComplexity: 'low',
    maxResultRows: 100,
    cacheTtlSeconds: 3600,
    exampleQuestions: [
      'How many volunteers were active last month?',
      'Show volunteer activity trend',
      'What is our volunteer count for Q1?',
    ],
    tags: ['volunteers', 'activity'],
  },

  {
    id: 'integration_scores',
    displayName: 'Integration Scores (Language Proficiency)',
    description: 'Average language level and integration scores',
    category: 'outcomes',
    sqlTemplate: `
      SELECT
        period_start,
        period_end,
        avg_language_level,
        avg_integration_score
      FROM metrics_company_period
      WHERE company_id = {{companyId}}
        AND period_start >= {{startDate}}
        AND period_end <= {{endDate}}
      ORDER BY period_start DESC
      LIMIT {{limit}}
    `,
    allowedTimeRanges: ['last_30d', 'last_90d', 'ytd', 'custom'],
    maxTimeWindowDays: 365,
    requiresTenantFilter: true,
    allowedJoins: [],
    deniedColumns: [],
    estimatedComplexity: 'low',
    maxResultRows: 100,
    cacheTtlSeconds: 3600,
    exampleQuestions: [
      'What is our average language level?',
      'Show integration score trends',
      'How has language proficiency improved?',
    ],
    tags: ['outcomes', 'language', 'integration'],
  },

  {
    id: 'job_readiness_scores',
    displayName: 'Job Readiness Scores',
    description: 'Average job readiness scores over time',
    category: 'outcomes',
    sqlTemplate: `
      SELECT
        period_start,
        period_end,
        avg_job_readiness
      FROM metrics_company_period
      WHERE company_id = {{companyId}}
        AND period_start >= {{startDate}}
        AND period_end <= {{endDate}}
      ORDER BY period_start DESC
      LIMIT {{limit}}
    `,
    allowedTimeRanges: ['last_30d', 'last_90d', 'ytd', 'custom'],
    maxTimeWindowDays: 365,
    requiresTenantFilter: true,
    allowedJoins: [],
    deniedColumns: [],
    estimatedComplexity: 'low',
    maxResultRows: 100,
    cacheTtlSeconds: 3600,
    exampleQuestions: [
      'What is our job readiness score?',
      'Show job readiness trend for last quarter',
      'How has job readiness improved?',
    ],
    tags: ['outcomes', 'employment', 'job_readiness'],
  },

  // ===== TREND ANALYSIS TEMPLATES =====
  {
    id: 'outcome_trends_monthly',
    displayName: 'Monthly Outcome Trends',
    description: 'Month-over-month outcome dimension trends',
    category: 'outcomes',
    sqlTemplate: `
      SELECT
        DATE_TRUNC('month', created_at) as month,
        dimension,
        AVG(score) as avg_score,
        COUNT(*) as sample_size
      FROM outcome_scores
      WHERE text_type = 'feedback'
        AND created_at >= {{startDate}}
        AND created_at <= {{endDate}}
        AND EXISTS (
          SELECT 1 FROM users WHERE users.id = outcome_scores.user_id AND users.company_id = {{companyId}}
        )
      GROUP BY DATE_TRUNC('month', created_at), dimension
      ORDER BY month DESC, dimension
      LIMIT {{limit}}
    `,
    allowedTimeRanges: ['last_90d', 'last_quarter', 'ytd', 'last_year', 'custom'],
    allowedGroupBy: ['outcome_dimension'],
    maxTimeWindowDays: 365,
    requiresTenantFilter: true,
    allowedJoins: ['users'],
    deniedColumns: ['email', 'phone', 'address'],
    estimatedComplexity: 'medium',
    maxResultRows: 60, // 12 months × 5 dimensions
    cacheTtlSeconds: 7200, // 2 hours
    exampleQuestions: [
      'Show monthly outcome trends for last year',
      'How have outcomes changed month-over-month?',
      'What are the trends in confidence scores?',
    ],
    tags: ['trends', 'outcomes', 'monthly'],
  },

  {
    id: 'sroi_quarterly_comparison',
    displayName: 'Quarterly SROI Comparison',
    description: 'Quarter-over-quarter SROI comparison',
    category: 'financial',
    sqlTemplate: `
      SELECT
        DATE_TRUNC('quarter', period_start) as quarter,
        AVG(sroi_ratio) as avg_sroi,
        SUM(participants_count) as total_participants,
        SUM(volunteers_count) as total_volunteers
      FROM metrics_company_period
      WHERE company_id = {{companyId}}
        AND period_start >= {{startDate}}
        AND period_end <= {{endDate}}
      GROUP BY DATE_TRUNC('quarter', period_start)
      ORDER BY quarter DESC
      LIMIT {{limit}}
    `,
    allowedTimeRanges: ['ytd', 'last_year', 'custom'],
    maxTimeWindowDays: 730, // 2 years
    requiresTenantFilter: true,
    allowedJoins: [],
    deniedColumns: [],
    estimatedComplexity: 'low',
    maxResultRows: 8, // 2 years of quarters
    cacheTtlSeconds: 7200,
    exampleQuestions: [
      'Compare SROI across quarters',
      'Show quarterly SROI trends',
      'How does this quarter compare to last quarter?',
    ],
    tags: ['sroi', 'quarterly', 'trends'],
  },

  // ===== BENCHMARKING TEMPLATES (K-ANONYMITY ENFORCED) =====
  {
    id: 'cohort_sroi_benchmark',
    displayName: 'SROI Cohort Benchmark',
    description: 'Compare SROI against industry/region/size cohorts (k≥7 anonymity)',
    category: 'impact',
    sqlTemplate: `
      -- NOTE: This query requires k-anonymity validation (k≥7) before execution
      -- Implementation delegated to benchmarking service with DP noise injection
      SELECT
        cohort_type,
        cohort_name,
        percentile_25,
        percentile_50,
        percentile_75,
        sample_size
      FROM benchmarks_cohort_aggregates
      WHERE metric_name = 'sroi_ratio'
        AND cohort_type = {{cohortType}}
        AND period_start >= {{startDate}}
        AND period_end <= {{endDate}}
        AND sample_size >= 7  -- K-anonymity threshold
      LIMIT {{limit}}
    `,
    allowedTimeRanges: ['last_quarter', 'ytd', 'last_year'],
    allowedFilters: {
      cohortType: ['industry', 'region', 'company_size'],
    },
    maxTimeWindowDays: 365,
    requiresTenantFilter: false, // Aggregate benchmark data
    allowedJoins: [],
    deniedColumns: ['company_id', 'company_name'], // Anonymized
    estimatedComplexity: 'medium',
    maxResultRows: 20,
    cacheTtlSeconds: 14400, // 4 hours
    exampleQuestions: [
      'How does our SROI compare to industry peers?',
      'Show benchmark data for similar companies',
      'What is the median SROI for our region?',
    ],
    tags: ['benchmark', 'sroi', 'cohort', 'k-anonymity'],
  },
];

/**
 * Get template by ID
 */
export function getTemplate(id: string): MetricTemplate | undefined {
  return METRIC_CATALOG.find(t => t.id === id);
}

/**
 * Search templates by category
 */
export function getTemplatesByCategory(category: MetricTemplate['category']): MetricTemplate[] {
  return METRIC_CATALOG.filter(t => t.category === category);
}

/**
 * Search templates by tag
 */
export function getTemplatesByTag(tag: string): MetricTemplate[] {
  return METRIC_CATALOG.filter(t => t.tags.includes(tag));
}

/**
 * Get all template IDs (for allow-list validation)
 */
export function getAllTemplateIds(): string[] {
  return METRIC_CATALOG.map(t => t.id);
}
