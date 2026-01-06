/**
 * NLQ Demo Data Seed Script
 *
 * Creates realistic demo data for showcasing NLQ capabilities:
 * - 20+ companies with varied industries and sizes
 * - 24 months of metric data (monthly granularity)
 * - Q2Q outcome scores with evidence snippets
 * - Varied data quality scenarios (high/medium/low confidence)
 * - Template catalog seeding
 *
 * Usage: pnpm tsx packages/shared-schema/src/seed/nlq-demo-data.ts
 */

import { db, sql } from '../db.js';
import { companies } from '../schema/users.js';
import { metricsCompanyPeriod } from '../schema/metrics.js';
import { outcomeScores, evidenceSnippets } from '../schema/q2q.js';
import { nlqTemplates } from '../schema/nlq.js';
import { METRIC_CATALOG } from '../../services/insights-nlq/src/templates/metric-catalog.js';

// ===== COMPANY DATA =====

interface CompanyProfile {
  name: string;
  industry: string;
  country: string;
  sroiMultiplier: number; // Base SROI multiplier for realistic variation
  visMultiplier: number; // Base VIS multiplier
  participantScale: number; // Scale factor for participant counts
  volunteerScale: number; // Scale factor for volunteer counts
}

const DEMO_COMPANIES: CompanyProfile[] = [
  // High performers
  {
    name: 'TechForGood Inc',
    industry: 'Technology',
    country: 'USA',
    sroiMultiplier: 6.5,
    visMultiplier: 85,
    participantScale: 1200,
    volunteerScale: 350,
  },
  {
    name: 'Global Finance Corp',
    industry: 'Financial Services',
    country: 'UK',
    sroiMultiplier: 5.8,
    visMultiplier: 82,
    participantScale: 2500,
    volunteerScale: 680,
  },
  {
    name: 'Nordic Energy Solutions',
    industry: 'Energy',
    country: 'Norway',
    sroiMultiplier: 7.2,
    visMultiplier: 88,
    participantScale: 800,
    volunteerScale: 220,
  },
  {
    name: 'Healthcare Innovations Ltd',
    industry: 'Healthcare',
    country: 'UK',
    sroiMultiplier: 6.9,
    visMultiplier: 86,
    participantScale: 1500,
    volunteerScale: 420,
  },
  {
    name: 'Sustainable Manufacturing Co',
    industry: 'Manufacturing',
    country: 'Germany',
    sroiMultiplier: 5.5,
    visMultiplier: 79,
    participantScale: 3200,
    volunteerScale: 850,
  },

  // Medium performers
  {
    name: 'Retail Solutions Group',
    industry: 'Retail',
    country: 'USA',
    sroiMultiplier: 4.2,
    visMultiplier: 72,
    participantScale: 1800,
    volunteerScale: 480,
  },
  {
    name: 'Education Partners Network',
    industry: 'Education',
    country: 'UK',
    sroiMultiplier: 4.8,
    visMultiplier: 75,
    participantScale: 950,
    volunteerScale: 280,
  },
  {
    name: 'Construction Builders Inc',
    industry: 'Construction',
    country: 'USA',
    sroiMultiplier: 3.9,
    visMultiplier: 68,
    participantScale: 2100,
    volunteerScale: 520,
  },
  {
    name: 'Media & Entertainment Corp',
    industry: 'Media',
    country: 'UK',
    sroiMultiplier: 4.5,
    visMultiplier: 73,
    participantScale: 1200,
    volunteerScale: 340,
  },
  {
    name: 'Consulting Partners LLC',
    industry: 'Professional Services',
    country: 'USA',
    sroiMultiplier: 5.1,
    visMultiplier: 77,
    participantScale: 1600,
    volunteerScale: 450,
  },

  // Growing programs (showing improvement)
  {
    name: 'StartUp Ventures Group',
    industry: 'Technology',
    country: 'USA',
    sroiMultiplier: 3.5,
    visMultiplier: 65,
    participantScale: 600,
    volunteerScale: 180,
  },
  {
    name: 'Regional Logistics Ltd',
    industry: 'Transportation',
    country: 'UK',
    sroiMultiplier: 3.2,
    visMultiplier: 62,
    participantScale: 1400,
    volunteerScale: 360,
  },
  {
    name: 'Food Services International',
    industry: 'Food & Beverage',
    country: 'Norway',
    sroiMultiplier: 3.8,
    visMultiplier: 67,
    participantScale: 2800,
    volunteerScale: 720,
  },
  {
    name: 'Hospitality Group PLC',
    industry: 'Hospitality',
    country: 'UK',
    sroiMultiplier: 3.6,
    visMultiplier: 64,
    participantScale: 1900,
    volunteerScale: 490,
  },
  {
    name: 'Telecommunications Global',
    industry: 'Telecommunications',
    country: 'Germany',
    sroiMultiplier: 4.3,
    visMultiplier: 71,
    participantScale: 2200,
    volunteerScale: 580,
  },

  // Established programs (stable performance)
  {
    name: 'Pharmaceutical Research Inc',
    industry: 'Pharmaceuticals',
    country: 'USA',
    sroiMultiplier: 5.9,
    visMultiplier: 81,
    participantScale: 1700,
    volunteerScale: 460,
  },
  {
    name: 'Automotive Manufacturing Group',
    industry: 'Automotive',
    country: 'Germany',
    sroiMultiplier: 5.3,
    visMultiplier: 78,
    participantScale: 3500,
    volunteerScale: 920,
  },
  {
    name: 'Insurance Corporation Ltd',
    industry: 'Insurance',
    country: 'UK',
    sroiMultiplier: 4.7,
    visMultiplier: 74,
    participantScale: 2000,
    volunteerScale: 540,
  },
  {
    name: 'Chemical Industries International',
    industry: 'Chemicals',
    country: 'Norway',
    sroiMultiplier: 5.0,
    visMultiplier: 76,
    participantScale: 1300,
    volunteerScale: 350,
  },
  {
    name: 'Aerospace Engineering Corp',
    industry: 'Aerospace',
    country: 'USA',
    sroiMultiplier: 6.1,
    visMultiplier: 83,
    participantScale: 1100,
    volunteerScale: 310,
  },

  // Additional diverse companies
  {
    name: 'Agriculture & Farming Co',
    industry: 'Agriculture',
    country: 'Norway',
    sroiMultiplier: 4.1,
    visMultiplier: 70,
    participantScale: 1500,
    volunteerScale: 390,
  },
  {
    name: 'Real Estate Development Group',
    industry: 'Real Estate',
    country: 'UK',
    sroiMultiplier: 3.7,
    visMultiplier: 66,
    participantScale: 1100,
    volunteerScale: 290,
  },
  {
    name: 'Software Solutions Enterprise',
    industry: 'Technology',
    country: 'Germany',
    sroiMultiplier: 6.3,
    visMultiplier: 84,
    participantScale: 1400,
    volunteerScale: 380,
  },
];

// ===== OUTCOME DIMENSIONS =====
const OUTCOME_DIMENSIONS = [
  'confidence',
  'belonging',
  'lang_level_proxy',
  'job_readiness',
  'well_being',
];

// ===== EVIDENCE SNIPPETS =====
const EVIDENCE_TEMPLATES = [
  {
    dimension: 'confidence',
    snippets: [
      'I feel much more confident speaking in meetings now',
      'My self-esteem has really improved through this program',
      'I\'m no longer afraid to ask questions when I don\'t understand',
      'Building my skills has given me a real boost in confidence',
      'I feel empowered to take on new challenges',
    ],
  },
  {
    dimension: 'belonging',
    snippets: [
      'I finally feel like I\'m part of the community',
      'Everyone has been so welcoming and supportive',
      'I don\'t feel like an outsider anymore',
      'The connections I\'ve made here are invaluable',
      'I feel accepted and valued for who I am',
    ],
  },
  {
    dimension: 'lang_level_proxy',
    snippets: [
      'My grammar has improved significantly',
      'I can now have full conversations without translating in my head',
      'Reading professional documents is much easier now',
      'I\'m understanding idioms and cultural references better',
      'My vocabulary has expanded tremendously',
    ],
  },
  {
    dimension: 'job_readiness',
    snippets: [
      'I feel prepared to enter the job market now',
      'The resume workshop was incredibly helpful',
      'I\'ve learned how to network professionally',
      'Interview practice has made me much more comfortable',
      'I understand what employers are looking for',
    ],
  },
  {
    dimension: 'well_being',
    snippets: [
      'I\'m sleeping better and feeling less stressed',
      'My overall mental health has improved',
      'I feel more optimistic about the future',
      'The social connections have really helped my wellbeing',
      'I have a better work-life balance now',
    ],
  },
];

// ===== HELPER FUNCTIONS =====

/**
 * Generate monthly periods for the last 24 months
 */
function generateMonthlyPeriods(): Array<{ start: Date; end: Date }> {
  const periods: Array<{ start: Date; end: Date }> = [];
  const now = new Date();

  for (let i = 23; i >= 0; i--) {
    const periodStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    periods.push({ start: periodStart, end: periodEnd });
  }

  return periods;
}

/**
 * Generate realistic metric value with trend and seasonality
 */
function generateMetricValue(
  baseValue: number,
  monthIndex: number,
  trend: number = 0.02,
  seasonalityAmplitude: number = 0.1,
  noise: number = 0.05
): number {
  // Linear trend
  const trendComponent = baseValue * (1 + trend * monthIndex);

  // Seasonal component (annual cycle)
  const seasonalComponent =
    baseValue * seasonalityAmplitude * Math.sin((monthIndex * Math.PI) / 6);

  // Random noise
  const noiseComponent = baseValue * noise * (Math.random() - 0.5);

  return Math.max(0, trendComponent + seasonalComponent + noiseComponent);
}

/**
 * Generate outcome score with realistic distribution
 */
function generateOutcomeScore(
  baseMean: number = 0.75,
  stdDev: number = 0.15
): number {
  // Box-Muller transform for normal distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

  const score = baseMean + z0 * stdDev;
  return Math.max(0, Math.min(1, score)); // Clamp to [0, 1]
}

/**
 * Select random evidence snippet for dimension
 */
function getRandomEvidence(dimension: string): string {
  const template = EVIDENCE_TEMPLATES.find((t) => t.dimension === dimension);
  if (!template) return 'No specific feedback provided';

  const snippets = template.snippets;
  return snippets[Math.floor(Math.random() * snippets.length)];
}

// ===== SEED FUNCTION =====

async function seedNLQDemoData() {
  console.log('🌱 Seeding NLQ demo data...');

  try {
    // ===== 1. SEED COMPANIES =====
    console.log('\n📊 Creating demo companies...');
    const createdCompanies = await db
      .insert(companies)
      .values(
        DEMO_COMPANIES.map((profile) => ({
          name: profile.name,
          industry: profile.industry,
          country: profile.country,
        }))
      )
      .returning();

    console.log(`✅ Created ${createdCompanies.length} companies`);

    // ===== 2. SEED METRIC TEMPLATES =====
    console.log('\n📋 Seeding NLQ metric templates...');

    // Note: Since we can't directly import from insights-nlq in the seed script,
    // we'll manually define the templates here matching the catalog
    const templateValues = [
      {
        templateName: 'sroi_ratio',
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
        active: true,
        version: 1,
      },
      {
        templateName: 'vis_score',
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
        active: true,
        version: 1,
      },
      {
        templateName: 'outcome_scores_by_dimension',
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
        maxResultRows: 10,
        cacheTtlSeconds: 1800,
        exampleQuestions: [
          'What are our outcome scores by dimension?',
          'Show me confidence and belonging scores for last month',
          'How do our outcome dimensions compare?',
        ],
        tags: ['outcomes', 'q2q', 'dimensions'],
        active: true,
        version: 1,
      },
      {
        templateName: 'participant_engagement',
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
        active: true,
        version: 1,
      },
      {
        templateName: 'volunteer_activity',
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
        active: true,
        version: 1,
      },
      {
        templateName: 'integration_scores',
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
        active: true,
        version: 1,
      },
      {
        templateName: 'job_readiness_scores',
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
        active: true,
        version: 1,
      },
      {
        templateName: 'outcome_trends_monthly',
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
        maxResultRows: 60,
        cacheTtlSeconds: 7200,
        exampleQuestions: [
          'Show monthly outcome trends for last year',
          'How have outcomes changed month-over-month?',
          'What are the trends in confidence scores?',
        ],
        tags: ['trends', 'outcomes', 'monthly'],
        active: true,
        version: 1,
      },
      {
        templateName: 'sroi_quarterly_comparison',
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
        maxTimeWindowDays: 730,
        requiresTenantFilter: true,
        allowedJoins: [],
        deniedColumns: [],
        estimatedComplexity: 'low',
        maxResultRows: 8,
        cacheTtlSeconds: 7200,
        exampleQuestions: [
          'Compare SROI across quarters',
          'Show quarterly SROI trends',
          'How does this quarter compare to last quarter?',
        ],
        tags: ['sroi', 'quarterly', 'trends'],
        active: true,
        version: 1,
      },
      {
        templateName: 'cohort_sroi_benchmark',
        displayName: 'SROI Cohort Benchmark',
        description: 'Compare SROI against industry/region/size cohorts (k≥7 anonymity)',
        category: 'impact',
        sqlTemplate: `
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
            AND sample_size >= 7
          LIMIT {{limit}}
        `,
        allowedTimeRanges: ['last_quarter', 'ytd', 'last_year'],
        allowedFilters: { cohortType: ['industry', 'region', 'company_size'] },
        maxTimeWindowDays: 365,
        requiresTenantFilter: false,
        allowedJoins: [],
        deniedColumns: ['company_id', 'company_name'],
        estimatedComplexity: 'medium',
        maxResultRows: 20,
        cacheTtlSeconds: 14400,
        exampleQuestions: [
          'How does our SROI compare to industry peers?',
          'Show benchmark data for similar companies',
          'What is the median SROI for our region?',
        ],
        tags: ['benchmark', 'sroi', 'cohort', 'k-anonymity'],
        active: true,
        version: 1,
      },
    ];

    const createdTemplates = await db
      .insert(nlqTemplates)
      .values(templateValues)
      .returning();

    console.log(`✅ Created ${createdTemplates.length} metric templates`);

    // ===== 3. SEED METRICS DATA =====
    console.log('\n📈 Generating 24 months of metrics data...');

    const periods = generateMonthlyPeriods();
    const metricsData = [];

    for (const company of createdCompanies) {
      const profile = DEMO_COMPANIES.find((p) => p.name === company.name)!;

      periods.forEach((period, monthIndex) => {
        // Generate metrics with realistic trends and seasonality
        const participants = Math.round(
          generateMetricValue(
            profile.participantScale,
            monthIndex,
            0.015, // 1.5% monthly growth
            0.08, // 8% seasonal variation
            0.06 // 6% noise
          )
        );

        const volunteers = Math.round(
          generateMetricValue(
            profile.volunteerScale,
            monthIndex,
            0.012, // 1.2% monthly growth
            0.10, // 10% seasonal variation
            0.07 // 7% noise
          )
        );

        const sessions = Math.round(
          participants * (2.5 + Math.random() * 0.5) // 2.5-3 sessions per participant
        );

        const sroiRatio = generateMetricValue(
          profile.sroiMultiplier,
          monthIndex,
          0.008, // Gradual improvement
          0.05,
          0.04
        ).toFixed(2);

        const visScore = generateMetricValue(
          profile.visMultiplier,
          monthIndex,
          0.006,
          0.04,
          0.03
        ).toFixed(2);

        metricsData.push({
          companyId: company.id,
          periodStart: period.start.toISOString().split('T')[0],
          periodEnd: period.end.toISOString().split('T')[0],
          participantsCount: participants,
          volunteersCount: volunteers,
          sessionsCount: sessions,
          avgIntegrationScore: (0.65 + Math.random() * 0.25).toFixed(3),
          avgLanguageLevel: (0.60 + Math.random() * 0.30).toFixed(3),
          avgJobReadiness: (0.55 + Math.random() * 0.35).toFixed(3),
          sroiRatio,
          visScore,
        });
      });
    }

    // Insert in batches of 500 to avoid query size limits
    const batchSize = 500;
    for (let i = 0; i < metricsData.length; i += batchSize) {
      const batch = metricsData.slice(i, i + batchSize);
      await db.insert(metricsCompanyPeriod).values(batch);
      console.log(
        `  ✓ Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(metricsData.length / batchSize)}`
      );
    }

    console.log(`✅ Created ${metricsData.length} metric records`);

    // ===== 4. SEED OUTCOME SCORES & EVIDENCE =====
    console.log('\n🎯 Generating outcome scores with evidence...');

    const outcomeData = [];
    const evidenceData = [];
    const now = new Date();

    // Generate varied outcome data across the last 6 months
    for (const company of createdCompanies) {
      const profile = DEMO_COMPANIES.find((p) => p.name === company.name)!;

      // Number of outcome records varies by company size
      const outcomeCount = Math.floor(profile.participantScale * 0.3); // 30% of participants give feedback

      for (let i = 0; i < outcomeCount; i++) {
        // Random date in the last 6 months
        const daysAgo = Math.floor(Math.random() * 180);
        const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

        // Randomly select dimension
        const dimension = OUTCOME_DIMENSIONS[Math.floor(Math.random() * OUTCOME_DIMENSIONS.length)];

        // Generate score with company-specific quality
        let baseMean = 0.70;
        let confidence = 0.75;

        // High performers have better outcomes and confidence
        if (profile.sroiMultiplier > 6.0) {
          baseMean = 0.82;
          confidence = 0.88;
        } else if (profile.sroiMultiplier > 5.0) {
          baseMean = 0.75;
          confidence = 0.82;
        } else if (profile.sroiMultiplier > 4.0) {
          baseMean = 0.68;
          confidence = 0.75;
        } else {
          baseMean = 0.62;
          confidence = 0.68;
        }

        const score = generateOutcomeScore(baseMean, 0.12);

        const outcomeId = crypto.randomUUID();
        outcomeData.push({
          id: outcomeId,
          textId: crypto.randomUUID(),
          textType: 'feedback',
          dimension,
          score: score.toFixed(3),
          confidence: confidence.toFixed(3),
          modelVersion: 'q2q-claude-v1',
          method: 'ai_classifier' as const,
          providerUsed: 'anthropic',
          language: 'en' as const,
          topics: ['mentorship', 'development'],
          createdAt,
        });

        // Add evidence snippet (60% of outcomes have evidence)
        if (Math.random() > 0.4) {
          evidenceData.push({
            outcomeScoreId: outcomeId,
            snippetText: getRandomEvidence(dimension),
            snippetHash: crypto.randomUUID().replace(/-/g, ''),
            embeddingRef: `vector_${outcomeId}`,
            sourceRef: `feedback_${i}_${company.id}`,
            createdAt,
          });
        }
      }
    }

    // Insert outcome scores in batches
    for (let i = 0; i < outcomeData.length; i += batchSize) {
      const batch = outcomeData.slice(i, i + batchSize);
      await db.insert(outcomeScores).values(batch);
      console.log(
        `  ✓ Inserted outcome batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(outcomeData.length / batchSize)}`
      );
    }

    console.log(`✅ Created ${outcomeData.length} outcome scores`);

    // Insert evidence snippets in batches
    for (let i = 0; i < evidenceData.length; i += batchSize) {
      const batch = evidenceData.slice(i, i + batchSize);
      await db.insert(evidenceSnippets).values(batch);
      console.log(
        `  ✓ Inserted evidence batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(evidenceData.length / batchSize)}`
      );
    }

    console.log(`✅ Created ${evidenceData.length} evidence snippets`);

    // ===== SUMMARY =====
    console.log('\n🎉 NLQ demo data seeding completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   Companies: ${createdCompanies.length}`);
    console.log(`   Metric templates: ${createdTemplates.length}`);
    console.log(`   Metric records: ${metricsData.length}`);
    console.log(`   Outcome scores: ${outcomeData.length}`);
    console.log(`   Evidence snippets: ${evidenceData.length}`);
    console.log(`\n💡 Demo characteristics:`);
    console.log(`   Time range: 24 months (monthly granularity)`);
    console.log(`   Industries: ${new Set(DEMO_COMPANIES.map((c) => c.industry)).size} unique`);
    console.log(`   Countries: ${new Set(DEMO_COMPANIES.map((c) => c.country)).size} unique`);
    console.log(`   SROI range: 3.2 - 7.2`);
    console.log(`   VIS range: 62 - 88`);
    console.log(`   Data quality: Varied (high/medium/low confidence scenarios)`);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Run the seed function
seedNLQDemoData();
