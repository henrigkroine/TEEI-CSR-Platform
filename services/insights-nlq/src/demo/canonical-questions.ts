/**
 * Canonical Questions for NLQ Demos
 *
 * This file contains 10 canonical questions with expected results for:
 * - Demo presentations (offline mode support)
 * - Integration testing
 * - UI/UX prototyping
 * - Customer walkthroughs
 *
 * Each question includes:
 * - Natural language input
 * - Expected intent classification
 * - Mock response data
 * - Confidence scores
 * - Lineage visualization config
 * - Chart rendering hints
 */

import type { NLQQueryResult, LineageNode, VisualizationConfig } from '../types/intent.js';

export interface CanonicalQuestion {
  id: string;
  category: 'simple' | 'trend' | 'comparison' | 'complex';
  question: string;
  expectedIntent: string;
  expectedSlots: Record<string, any>;
  mockResponse: NLQQueryResult;
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

/**
 * Canonical Question Catalog
 */
export const CANONICAL_QUESTIONS: CanonicalQuestion[] = [
  // ===== SIMPLE QUERIES =====
  {
    id: 'cq_001',
    category: 'simple',
    question: 'What is our SROI for last quarter?',
    expectedIntent: 'get_metric',
    expectedSlots: {
      metric: 'sroi_ratio',
      timeRange: 'last_quarter',
      groupBy: null,
      filters: {},
    },
    mockResponse: {
      queryId: 'demo_001',
      question: 'What is our SROI for last quarter?',
      intent: 'get_metric',
      confidence: 0.95,
      templateMatched: 'sroi_ratio',
      results: {
        data: [
          {
            period_start: '2025-10-01',
            period_end: '2025-12-31',
            sroi_ratio: 6.23,
            participants_count: 1450,
            volunteers_count: 385,
          },
        ],
        rowCount: 1,
        executionTimeMs: 42,
      },
      summary:
        'Your Social Return on Investment (SROI) for Q4 2025 was 6.23:1, meaning every dollar invested generated $6.23 in social value. This is based on 1,450 participants and 385 volunteers.',
      lineage: [
        {
          nodeId: 'source_1',
          nodeType: 'table',
          label: 'metrics_company_period',
          metadata: {
            recordCount: 1,
            timeRange: '2025-10-01 to 2025-12-31',
          },
        },
        {
          nodeId: 'calc_1',
          nodeType: 'calculation',
          label: 'SROI Aggregation',
          metadata: {
            formula: 'AVG(sroi_ratio)',
          },
          parents: ['source_1'],
        },
        {
          nodeId: 'result_1',
          nodeType: 'result',
          label: 'Final Result',
          metadata: {
            value: 6.23,
            confidence: 'high',
          },
          parents: ['calc_1'],
        },
      ],
      visualization: {
        chartType: 'single_stat',
        config: {
          primaryValue: 6.23,
          label: 'SROI Ratio',
          format: 'ratio',
          trend: { direction: 'up', percentage: 5.2, comparedTo: 'previous_quarter' },
        },
      },
      cached: false,
      confidenceFactors: {
        intentMatch: 0.98,
        slotExtraction: 0.95,
        dataQuality: 0.92,
        overall: 0.95,
      },
    },
    tags: ['sroi', 'quarterly', 'simple'],
    difficulty: 'easy',
  },

  {
    id: 'cq_002',
    category: 'simple',
    question: 'How many volunteers were active last month?',
    expectedIntent: 'get_metric',
    expectedSlots: {
      metric: 'volunteer_activity',
      timeRange: 'last_30d',
      groupBy: null,
      filters: {},
    },
    mockResponse: {
      queryId: 'demo_002',
      question: 'How many volunteers were active last month?',
      intent: 'get_metric',
      confidence: 0.92,
      templateMatched: 'volunteer_activity',
      results: {
        data: [
          {
            period_start: '2025-10-01',
            period_end: '2025-10-31',
            volunteers_count: 412,
          },
        ],
        rowCount: 1,
        executionTimeMs: 38,
      },
      summary: 'Last month (October 2025), 412 volunteers were active in your programs.',
      lineage: [
        {
          nodeId: 'source_1',
          nodeType: 'table',
          label: 'metrics_company_period',
          metadata: {
            recordCount: 1,
            timeRange: '2025-10-01 to 2025-10-31',
          },
        },
        {
          nodeId: 'result_1',
          nodeType: 'result',
          label: 'Volunteer Count',
          metadata: {
            value: 412,
            confidence: 'high',
          },
          parents: ['source_1'],
        },
      ],
      visualization: {
        chartType: 'single_stat',
        config: {
          primaryValue: 412,
          label: 'Active Volunteers',
          format: 'number',
          trend: { direction: 'up', percentage: 3.8, comparedTo: 'previous_month' },
        },
      },
      cached: false,
      confidenceFactors: {
        intentMatch: 0.96,
        slotExtraction: 0.92,
        dataQuality: 0.89,
        overall: 0.92,
      },
    },
    tags: ['volunteers', 'monthly', 'simple'],
    difficulty: 'easy',
  },

  {
    id: 'cq_003',
    category: 'simple',
    question: 'What are our outcome scores by dimension?',
    expectedIntent: 'get_metric',
    expectedSlots: {
      metric: 'outcome_scores_by_dimension',
      timeRange: 'last_30d',
      groupBy: 'outcome_dimension',
      filters: {},
    },
    mockResponse: {
      queryId: 'demo_003',
      question: 'What are our outcome scores by dimension?',
      intent: 'get_metric',
      confidence: 0.89,
      templateMatched: 'outcome_scores_by_dimension',
      results: {
        data: [
          { dimension: 'confidence', avg_score: 0.823, sample_size: 342 },
          { dimension: 'belonging', avg_score: 0.815, sample_size: 338 },
          { dimension: 'well_being', avg_score: 0.791, sample_size: 295 },
          { dimension: 'job_readiness', avg_score: 0.768, sample_size: 312 },
          { dimension: 'lang_level_proxy', avg_score: 0.752, sample_size: 329 },
        ],
        rowCount: 5,
        executionTimeMs: 156,
      },
      summary:
        'Your outcome scores show strong performance across all dimensions. Confidence leads at 0.82, followed by belonging at 0.82. Language proficiency has room for growth at 0.75.',
      lineage: [
        {
          nodeId: 'source_1',
          nodeType: 'table',
          label: 'outcome_scores',
          metadata: {
            recordCount: 1616,
            timeRange: 'last_30d',
          },
        },
        {
          nodeId: 'join_1',
          nodeType: 'join',
          label: 'User Tenant Filter',
          metadata: {
            joinType: 'EXISTS',
            table: 'users',
          },
          parents: ['source_1'],
        },
        {
          nodeId: 'calc_1',
          nodeType: 'calculation',
          label: 'Dimension Aggregation',
          metadata: {
            groupBy: 'dimension',
            aggregations: ['AVG(score)', 'COUNT(*)'],
          },
          parents: ['join_1'],
        },
        {
          nodeId: 'result_1',
          nodeType: 'result',
          label: 'Final Results',
          metadata: {
            dimensionCount: 5,
            confidence: 'high',
          },
          parents: ['calc_1'],
        },
      ],
      visualization: {
        chartType: 'bar_chart',
        config: {
          xAxis: 'dimension',
          yAxis: 'avg_score',
          orientation: 'horizontal',
          colorScheme: 'gradient',
          showLabels: true,
        },
      },
      cached: false,
      confidenceFactors: {
        intentMatch: 0.94,
        slotExtraction: 0.88,
        dataQuality: 0.85,
        overall: 0.89,
      },
    },
    tags: ['outcomes', 'dimensions', 'q2q'],
    difficulty: 'easy',
  },

  // ===== TREND ANALYSIS =====
  {
    id: 'cq_004',
    category: 'trend',
    question: 'Show me SROI trend for the past year',
    expectedIntent: 'trend_analysis',
    expectedSlots: {
      metric: 'sroi_ratio',
      timeRange: 'last_year',
      groupBy: 'month',
      filters: {},
    },
    mockResponse: {
      queryId: 'demo_004',
      question: 'Show me SROI trend for the past year',
      intent: 'trend_analysis',
      confidence: 0.93,
      templateMatched: 'sroi_ratio',
      results: {
        data: [
          { period_start: '2024-11-01', period_end: '2024-11-30', sroi_ratio: 5.82 },
          { period_start: '2024-12-01', period_end: '2024-12-31', sroi_ratio: 5.95 },
          { period_start: '2025-01-01', period_end: '2025-01-31', sroi_ratio: 6.02 },
          { period_start: '2025-02-01', period_end: '2025-02-28', sroi_ratio: 5.88 },
          { period_start: '2025-03-01', period_end: '2025-03-31', sroi_ratio: 6.15 },
          { period_start: '2025-04-01', period_end: '2025-04-30', sroi_ratio: 6.21 },
          { period_start: '2025-05-01', period_end: '2025-05-31', sroi_ratio: 6.18 },
          { period_start: '2025-06-01', period_end: '2025-06-30', sroi_ratio: 6.09 },
          { period_start: '2025-07-01', period_end: '2025-07-31', sroi_ratio: 6.28 },
          { period_start: '2025-08-01', period_end: '2025-08-31', sroi_ratio: 6.35 },
          { period_start: '2025-09-01', period_end: '2025-09-30', sroi_ratio: 6.31 },
          { period_start: '2025-10-01', period_end: '2025-10-31', sroi_ratio: 6.42 },
        ],
        rowCount: 12,
        executionTimeMs: 89,
      },
      summary:
        'Your SROI has shown consistent growth over the past year, improving from 5.82 to 6.42 (10.3% increase). The upward trend indicates strengthening program effectiveness.',
      lineage: [
        {
          nodeId: 'source_1',
          nodeType: 'table',
          label: 'metrics_company_period',
          metadata: {
            recordCount: 12,
            timeRange: '2024-11-01 to 2025-10-31',
          },
        },
        {
          nodeId: 'calc_1',
          nodeType: 'calculation',
          label: 'Monthly Trend',
          metadata: {
            orderBy: 'period_start ASC',
          },
          parents: ['source_1'],
        },
        {
          nodeId: 'result_1',
          nodeType: 'result',
          label: 'Time Series Data',
          metadata: {
            dataPoints: 12,
            trend: 'increasing',
            confidence: 'high',
          },
          parents: ['calc_1'],
        },
      ],
      visualization: {
        chartType: 'line_chart',
        config: {
          xAxis: 'period_start',
          yAxis: 'sroi_ratio',
          showTrendline: true,
          showDataPoints: true,
          areaFill: true,
          yAxisLabel: 'SROI Ratio',
          xAxisLabel: 'Month',
        },
      },
      cached: false,
      confidenceFactors: {
        intentMatch: 0.97,
        slotExtraction: 0.93,
        dataQuality: 0.90,
        overall: 0.93,
      },
    },
    tags: ['sroi', 'trend', 'yearly'],
    difficulty: 'medium',
  },

  {
    id: 'cq_005',
    category: 'trend',
    question: 'How have outcomes changed month-over-month?',
    expectedIntent: 'trend_analysis',
    expectedSlots: {
      metric: 'outcome_trends_monthly',
      timeRange: 'last_90d',
      groupBy: ['month', 'dimension'],
      filters: {},
    },
    mockResponse: {
      queryId: 'demo_005',
      question: 'How have outcomes changed month-over-month?',
      intent: 'trend_analysis',
      confidence: 0.87,
      templateMatched: 'outcome_trends_monthly',
      results: {
        data: [
          { month: '2025-08-01', dimension: 'confidence', avg_score: 0.805, sample_size: 289 },
          { month: '2025-08-01', dimension: 'belonging', avg_score: 0.798, sample_size: 276 },
          { month: '2025-08-01', dimension: 'well_being', avg_score: 0.772, sample_size: 254 },
          { month: '2025-09-01', dimension: 'confidence', avg_score: 0.814, sample_size: 312 },
          { month: '2025-09-01', dimension: 'belonging', avg_score: 0.807, sample_size: 298 },
          { month: '2025-09-01', dimension: 'well_being', avg_score: 0.783, sample_size: 271 },
          { month: '2025-10-01', dimension: 'confidence', avg_score: 0.823, sample_size: 342 },
          { month: '2025-10-01', dimension: 'belonging', avg_score: 0.815, sample_size: 338 },
          { month: '2025-10-01', dimension: 'well_being', avg_score: 0.791, sample_size: 295 },
        ],
        rowCount: 9,
        executionTimeMs: 234,
      },
      summary:
        'Outcome scores show positive month-over-month growth across all dimensions. Confidence improved 2.2% over the last 3 months, while belonging and well-being also show upward trends.',
      lineage: [
        {
          nodeId: 'source_1',
          nodeType: 'table',
          label: 'outcome_scores',
          metadata: {
            recordCount: 2640,
            timeRange: 'last_90d',
          },
        },
        {
          nodeId: 'join_1',
          nodeType: 'join',
          label: 'Tenant Filter',
          metadata: {
            joinType: 'EXISTS',
            table: 'users',
          },
          parents: ['source_1'],
        },
        {
          nodeId: 'calc_1',
          nodeType: 'calculation',
          label: 'Monthly Dimension Aggregation',
          metadata: {
            groupBy: ['DATE_TRUNC(month)', 'dimension'],
            aggregations: ['AVG(score)', 'COUNT(*)'],
          },
          parents: ['join_1'],
        },
        {
          nodeId: 'result_1',
          nodeType: 'result',
          label: 'Time Series by Dimension',
          metadata: {
            months: 3,
            dimensions: 3,
            confidence: 'medium-high',
          },
          parents: ['calc_1'],
        },
      ],
      visualization: {
        chartType: 'multi_line_chart',
        config: {
          xAxis: 'month',
          yAxis: 'avg_score',
          seriesBy: 'dimension',
          showLegend: true,
          showDataPoints: true,
          yAxisLabel: 'Average Score',
          xAxisLabel: 'Month',
        },
      },
      cached: false,
      confidenceFactors: {
        intentMatch: 0.91,
        slotExtraction: 0.86,
        dataQuality: 0.84,
        overall: 0.87,
      },
    },
    tags: ['outcomes', 'trend', 'monthly'],
    difficulty: 'medium',
  },

  // ===== COMPARISON QUERIES =====
  {
    id: 'cq_006',
    category: 'comparison',
    question: 'Compare SROI across quarters',
    expectedIntent: 'compare_periods',
    expectedSlots: {
      metric: 'sroi_quarterly_comparison',
      timeRange: 'last_year',
      groupBy: 'quarter',
      filters: {},
    },
    mockResponse: {
      queryId: 'demo_006',
      question: 'Compare SROI across quarters',
      intent: 'compare_periods',
      confidence: 0.91,
      templateMatched: 'sroi_quarterly_comparison',
      results: {
        data: [
          {
            quarter: '2024-10-01',
            avg_sroi: 5.89,
            total_participants: 4235,
            total_volunteers: 1142,
          },
          {
            quarter: '2025-01-01',
            avg_sroi: 6.05,
            total_participants: 4512,
            total_volunteers: 1205,
          },
          {
            quarter: '2025-04-01',
            avg_sroi: 6.16,
            total_participants: 4687,
            total_volunteers: 1248,
          },
          {
            quarter: '2025-07-01',
            avg_sroi: 6.31,
            total_participants: 4823,
            total_volunteers: 1289,
          },
        ],
        rowCount: 4,
        executionTimeMs: 102,
      },
      summary:
        'SROI has improved steadily quarter-over-quarter, from 5.89 in Q4 2024 to 6.31 in Q3 2025 (7.1% growth). Participant and volunteer counts also show consistent increases.',
      lineage: [
        {
          nodeId: 'source_1',
          nodeType: 'table',
          label: 'metrics_company_period',
          metadata: {
            recordCount: 12,
            timeRange: '2024-10-01 to 2025-09-30',
          },
        },
        {
          nodeId: 'calc_1',
          nodeType: 'calculation',
          label: 'Quarterly Aggregation',
          metadata: {
            groupBy: 'DATE_TRUNC(quarter)',
            aggregations: ['AVG(sroi_ratio)', 'SUM(participants)', 'SUM(volunteers)'],
          },
          parents: ['source_1'],
        },
        {
          nodeId: 'result_1',
          nodeType: 'result',
          label: 'Quarterly Comparison',
          metadata: {
            quarters: 4,
            trend: 'increasing',
            confidence: 'high',
          },
          parents: ['calc_1'],
        },
      ],
      visualization: {
        chartType: 'grouped_bar_chart',
        config: {
          xAxis: 'quarter',
          yAxes: ['avg_sroi', 'total_participants'],
          showSecondaryAxis: true,
          colorScheme: 'contrasting',
          showLabels: true,
        },
      },
      cached: false,
      confidenceFactors: {
        intentMatch: 0.95,
        slotExtraction: 0.90,
        dataQuality: 0.88,
        overall: 0.91,
      },
    },
    tags: ['sroi', 'quarterly', 'comparison'],
    difficulty: 'medium',
  },

  {
    id: 'cq_007',
    category: 'comparison',
    question: 'How does this quarter compare to last quarter?',
    expectedIntent: 'compare_periods',
    expectedSlots: {
      metric: 'sroi_ratio',
      timeRange: 'current_quarter',
      comparisonPeriod: 'previous_quarter',
      filters: {},
    },
    mockResponse: {
      queryId: 'demo_007',
      question: 'How does this quarter compare to last quarter?',
      intent: 'compare_periods',
      confidence: 0.88,
      templateMatched: 'sroi_quarterly_comparison',
      results: {
        data: [
          {
            period: 'Q3 2025',
            avg_sroi: 6.31,
            total_participants: 4823,
            total_volunteers: 1289,
          },
          {
            period: 'Q4 2025 (Partial)',
            avg_sroi: 6.42,
            total_participants: 1612,
            total_volunteers: 431,
          },
        ],
        rowCount: 2,
        executionTimeMs: 67,
      },
      summary:
        'The current quarter (Q4 2025, partial data) shows SROI of 6.42, up 1.7% from Q3 2025 (6.31). Early indicators suggest continued improvement.',
      lineage: [
        {
          nodeId: 'source_1',
          nodeType: 'table',
          label: 'metrics_company_period',
          metadata: {
            recordCount: 4,
            timeRange: 'Q3-Q4 2025',
          },
        },
        {
          nodeId: 'calc_1',
          nodeType: 'calculation',
          label: 'Quarter-over-Quarter Comparison',
          metadata: {
            groupBy: 'quarter',
            aggregations: ['AVG(sroi_ratio)', 'SUM(participants)', 'SUM(volunteers)'],
          },
          parents: ['source_1'],
        },
        {
          nodeId: 'result_1',
          nodeType: 'result',
          label: 'QoQ Comparison',
          metadata: {
            changePercent: 1.7,
            direction: 'positive',
            confidence: 'medium',
          },
          parents: ['calc_1'],
        },
      ],
      visualization: {
        chartType: 'comparison_card',
        config: {
          current: { label: 'Q4 2025', value: 6.42 },
          previous: { label: 'Q3 2025', value: 6.31 },
          changePercent: 1.7,
          changeDirection: 'up',
        },
      },
      cached: false,
      confidenceFactors: {
        intentMatch: 0.92,
        slotExtraction: 0.87,
        dataQuality: 0.85,
        overall: 0.88,
      },
    },
    tags: ['sroi', 'comparison', 'quarterly'],
    difficulty: 'medium',
  },

  // ===== COMPLEX QUERIES =====
  {
    id: 'cq_008',
    category: 'complex',
    question: 'Show participant engagement over time for last 6 months',
    expectedIntent: 'trend_analysis',
    expectedSlots: {
      metric: 'participant_engagement',
      timeRange: 'last_180d',
      groupBy: 'month',
      filters: {},
    },
    mockResponse: {
      queryId: 'demo_008',
      question: 'Show participant engagement over time for last 6 months',
      intent: 'trend_analysis',
      confidence: 0.90,
      templateMatched: 'participant_engagement',
      results: {
        data: [
          {
            period_start: '2025-05-01',
            participants_count: 1523,
            sessions_count: 4102,
            sessions_per_participant: 2.69,
          },
          {
            period_start: '2025-06-01',
            participants_count: 1498,
            sessions_count: 3994,
            sessions_per_participant: 2.67,
          },
          {
            period_start: '2025-07-01',
            participants_count: 1587,
            sessions_count: 4321,
            sessions_per_participant: 2.72,
          },
          {
            period_start: '2025-08-01',
            participants_count: 1612,
            sessions_count: 4458,
            sessions_per_participant: 2.77,
          },
          {
            period_start: '2025-09-01',
            participants_count: 1638,
            sessions_count: 4523,
            sessions_per_participant: 2.76,
          },
          {
            period_start: '2025-10-01',
            participants_count: 1671,
            sessions_count: 4689,
            sessions_per_participant: 2.81,
          },
        ],
        rowCount: 6,
        executionTimeMs: 124,
      },
      summary:
        'Participant engagement has strengthened over the past 6 months. Active participants grew 9.7% (1,523 to 1,671), while sessions per participant improved from 2.69 to 2.81, indicating deeper engagement.',
      lineage: [
        {
          nodeId: 'source_1',
          nodeType: 'table',
          label: 'metrics_company_period',
          metadata: {
            recordCount: 6,
            timeRange: '2025-05-01 to 2025-10-31',
          },
        },
        {
          nodeId: 'calc_1',
          nodeType: 'calculation',
          label: 'Engagement Rate Calculation',
          metadata: {
            formula: 'sessions_count / participants_count',
          },
          parents: ['source_1'],
        },
        {
          nodeId: 'result_1',
          nodeType: 'result',
          label: 'Engagement Trends',
          metadata: {
            months: 6,
            trend: 'improving',
            confidence: 'high',
          },
          parents: ['calc_1'],
        },
      ],
      visualization: {
        chartType: 'combo_chart',
        config: {
          xAxis: 'period_start',
          primaryYAxis: 'participants_count',
          secondaryYAxis: 'sessions_per_participant',
          primaryChartType: 'bar',
          secondaryChartType: 'line',
          showSecondaryAxis: true,
        },
      },
      cached: false,
      confidenceFactors: {
        intentMatch: 0.93,
        slotExtraction: 0.89,
        dataQuality: 0.88,
        overall: 0.90,
      },
    },
    tags: ['engagement', 'participants', 'trend'],
    difficulty: 'hard',
  },

  {
    id: 'cq_009',
    category: 'complex',
    question: 'What is our average VIS score and how has it changed?',
    expectedIntent: 'trend_analysis',
    expectedSlots: {
      metric: 'vis_score',
      timeRange: 'last_90d',
      groupBy: 'month',
      filters: {},
    },
    mockResponse: {
      queryId: 'demo_009',
      question: 'What is our average VIS score and how has it changed?',
      intent: 'trend_analysis',
      confidence: 0.86,
      templateMatched: 'vis_score',
      results: {
        data: [
          { period_start: '2025-08-01', vis_score: 81.2, volunteers_count: 423 },
          { period_start: '2025-09-01', vis_score: 82.5, volunteers_count: 437 },
          { period_start: '2025-10-01', vis_score: 83.8, volunteers_count: 445 },
        ],
        rowCount: 3,
        executionTimeMs: 78,
      },
      summary:
        'Your average Volunteer Impact Score (VIS) over the last 3 months is 82.5, showing consistent improvement from 81.2 to 83.8 (3.2% increase). This reflects growing volunteer effectiveness.',
      lineage: [
        {
          nodeId: 'source_1',
          nodeType: 'table',
          label: 'metrics_company_period',
          metadata: {
            recordCount: 3,
            timeRange: '2025-08-01 to 2025-10-31',
          },
        },
        {
          nodeId: 'calc_1',
          nodeType: 'calculation',
          label: 'VIS Trend Analysis',
          metadata: {
            orderBy: 'period_start ASC',
            avgVIS: 82.5,
          },
          parents: ['source_1'],
        },
        {
          nodeId: 'result_1',
          nodeType: 'result',
          label: 'VIS Trend',
          metadata: {
            months: 3,
            trend: 'increasing',
            changePercent: 3.2,
            confidence: 'medium-high',
          },
          parents: ['calc_1'],
        },
      ],
      visualization: {
        chartType: 'line_chart',
        config: {
          xAxis: 'period_start',
          yAxis: 'vis_score',
          showTrendline: true,
          showDataPoints: true,
          yAxisLabel: 'VIS Score',
          xAxisLabel: 'Month',
        },
      },
      cached: false,
      confidenceFactors: {
        intentMatch: 0.90,
        slotExtraction: 0.85,
        dataQuality: 0.83,
        overall: 0.86,
      },
    },
    tags: ['vis', 'volunteers', 'trend'],
    difficulty: 'hard',
  },

  {
    id: 'cq_010',
    category: 'complex',
    question: 'Show integration score trends for the past year',
    expectedIntent: 'trend_analysis',
    expectedSlots: {
      metric: 'integration_scores',
      timeRange: 'last_year',
      groupBy: 'month',
      filters: {},
    },
    mockResponse: {
      queryId: 'demo_010',
      question: 'Show integration score trends for the past year',
      intent: 'trend_analysis',
      confidence: 0.88,
      templateMatched: 'integration_scores',
      results: {
        data: [
          {
            period_start: '2024-11-01',
            avg_language_level: 0.682,
            avg_integration_score: 0.715,
          },
          {
            period_start: '2024-12-01',
            avg_language_level: 0.691,
            avg_integration_score: 0.723,
          },
          {
            period_start: '2025-01-01',
            avg_language_level: 0.698,
            avg_integration_score: 0.731,
          },
          {
            period_start: '2025-02-01',
            avg_language_level: 0.705,
            avg_integration_score: 0.738,
          },
          {
            period_start: '2025-03-01',
            avg_language_level: 0.714,
            avg_integration_score: 0.746,
          },
          {
            period_start: '2025-04-01',
            avg_language_level: 0.721,
            avg_integration_score: 0.753,
          },
          {
            period_start: '2025-05-01',
            avg_language_level: 0.729,
            avg_integration_score: 0.761,
          },
          {
            period_start: '2025-06-01',
            avg_language_level: 0.735,
            avg_integration_score: 0.768,
          },
          {
            period_start: '2025-07-01',
            avg_language_level: 0.742,
            avg_integration_score: 0.774,
          },
          {
            period_start: '2025-08-01',
            avg_language_level: 0.749,
            avg_integration_score: 0.781,
          },
          {
            period_start: '2025-09-01',
            avg_language_level: 0.755,
            avg_integration_score: 0.787,
          },
          {
            period_start: '2025-10-01',
            avg_language_level: 0.762,
            avg_integration_score: 0.793,
          },
        ],
        rowCount: 12,
        executionTimeMs: 145,
      },
      summary:
        'Integration scores show strong year-over-year growth. Language proficiency improved 11.7% (0.682 to 0.762) and overall integration scores grew 10.9% (0.715 to 0.793), reflecting sustained program effectiveness.',
      lineage: [
        {
          nodeId: 'source_1',
          nodeType: 'table',
          label: 'metrics_company_period',
          metadata: {
            recordCount: 12,
            timeRange: '2024-11-01 to 2025-10-31',
          },
        },
        {
          nodeId: 'calc_1',
          nodeType: 'calculation',
          label: 'Integration Trend Analysis',
          metadata: {
            orderBy: 'period_start ASC',
          },
          parents: ['source_1'],
        },
        {
          nodeId: 'result_1',
          nodeType: 'result',
          label: 'Year-over-Year Integration Trends',
          metadata: {
            months: 12,
            languageGrowth: '11.7%',
            integrationGrowth: '10.9%',
            confidence: 'high',
          },
          parents: ['calc_1'],
        },
      ],
      visualization: {
        chartType: 'multi_line_chart',
        config: {
          xAxis: 'period_start',
          yAxis: ['avg_language_level', 'avg_integration_score'],
          showLegend: true,
          showDataPoints: false,
          showTrendlines: true,
          yAxisLabel: 'Score',
          xAxisLabel: 'Month',
        },
      },
      cached: false,
      confidenceFactors: {
        intentMatch: 0.92,
        slotExtraction: 0.87,
        dataQuality: 0.85,
        overall: 0.88,
      },
    },
    tags: ['integration', 'language', 'trend', 'yearly'],
    difficulty: 'hard',
  },
];

/**
 * Get canonical question by ID
 */
export function getCanonicalQuestion(id: string): CanonicalQuestion | undefined {
  return CANONICAL_QUESTIONS.find((q) => q.id === id);
}

/**
 * Get canonical questions by category
 */
export function getQuestionsByCategory(
  category: CanonicalQuestion['category']
): CanonicalQuestion[] {
  return CANONICAL_QUESTIONS.filter((q) => q.category === category);
}

/**
 * Get canonical questions by difficulty
 */
export function getQuestionsByDifficulty(
  difficulty: CanonicalQuestion['difficulty']
): CanonicalQuestion[] {
  return CANONICAL_QUESTIONS.filter((q) => q.difficulty === difficulty);
}

/**
 * Get canonical questions by tag
 */
export function getQuestionsByTag(tag: string): CanonicalQuestion[] {
  return CANONICAL_QUESTIONS.filter((q) => q.tags.includes(tag));
}

/**
 * Get random canonical question
 */
export function getRandomQuestion(): CanonicalQuestion {
  return CANONICAL_QUESTIONS[Math.floor(Math.random() * CANONICAL_QUESTIONS.length)];
}

/**
 * Get demo question set (3 easy, 2 medium, 1 hard)
 */
export function getDemoQuestionSet(): CanonicalQuestion[] {
  const easy = getQuestionsByDifficulty('easy').slice(0, 3);
  const medium = getQuestionsByDifficulty('medium').slice(0, 2);
  const hard = getQuestionsByDifficulty('hard').slice(0, 1);
  return [...easy, ...medium, ...hard];
}
