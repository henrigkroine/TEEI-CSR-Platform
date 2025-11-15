/**
 * Metric Dictionary - ontology-architect
 * Defines all allowed metrics with metadata, aggregations, and lineage
 */

import { z } from 'zod';

export const MetricAggregation = z.enum([
  'sum',
  'avg',
  'count',
  'count_distinct',
  'min',
  'max',
  'median',
  'p95',
  'p99',
]);

export const MetricGranularity = z.enum([
  'hour',
  'day',
  'week',
  'month',
  'quarter',
  'year',
  'all_time',
]);

export const MetricDimensionSchema = z.object({
  name: z.string(),
  description: z.string(),
  table: z.string(), // Source table
  column: z.string(), // Column name
  dataType: z.enum(['string', 'number', 'boolean', 'date', 'timestamp']),
  allowedValues: z.array(z.string()).optional(), // For enums
  piiSensitive: z.boolean().default(false),
  redactable: z.boolean().default(false),
});

export const MetricSchema = z.object({
  id: z.string(), // Unique metric ID (e.g., "volunteer_hours")
  name: z.string(), // Display name
  description: z.string(),
  category: z.enum([
    'volunteering',
    'donations',
    'impact',
    'engagement',
    'outcome',
    'financial',
    'social_return',
  ]),
  sourceTable: z.string(), // ClickHouse table
  sourceColumn: z.string(), // Column to aggregate
  defaultAggregation: MetricAggregation,
  allowedAggregations: z.array(MetricAggregation),
  allowedGranularities: z.array(MetricGranularity),
  dimensions: z.array(MetricDimensionSchema), // Groupable dimensions
  requiresTenantFilter: z.boolean().default(true), // Row-level security
  requiresTimeRange: z.boolean().default(true),
  maxTimeRangeDays: z.number().optional(), // Cost control
  costWeight: z.number().default(1), // Query cost multiplier
  evidenceLineage: z.object({
    sourceSystem: z.string(), // e.g., "impact-in", "benevity"
    sourceEntity: z.string(), // e.g., "volunteer_activities"
    traceable: z.boolean(),
  }),
  piiFields: z.array(z.string()).default([]), // Fields requiring redaction
  csrdAligned: z.boolean().default(false), // CSRD compliance flag
});

export type Metric = z.infer<typeof MetricSchema>;
export type MetricDimension = z.infer<typeof MetricDimensionSchema>;

/**
 * Metric Dictionary - All allowed metrics
 */
export const METRIC_DICTIONARY: Record<string, Metric> = {
  volunteer_hours: {
    id: 'volunteer_hours',
    name: 'Volunteer Hours',
    description: 'Total hours volunteered by employees',
    category: 'volunteering',
    sourceTable: 'volunteer_activities',
    sourceColumn: 'hours',
    defaultAggregation: 'sum',
    allowedAggregations: ['sum', 'avg', 'count', 'median'],
    allowedGranularities: ['day', 'week', 'month', 'quarter', 'year'],
    dimensions: [
      {
        name: 'program_id',
        description: 'Volunteer program',
        table: 'volunteer_activities',
        column: 'program_id',
        dataType: 'string',
        piiSensitive: false,
        redactable: false,
      },
      {
        name: 'region',
        description: 'Geographic region',
        table: 'volunteer_activities',
        column: 'region',
        dataType: 'string',
        piiSensitive: false,
        redactable: false,
      },
      {
        name: 'department',
        description: 'Employee department',
        table: 'volunteer_activities',
        column: 'department',
        dataType: 'string',
        piiSensitive: false,
        redactable: false,
      },
    ],
    requiresTenantFilter: true,
    requiresTimeRange: true,
    maxTimeRangeDays: 730, // 2 years max
    costWeight: 1.0,
    evidenceLineage: {
      sourceSystem: 'impact-in',
      sourceEntity: 'volunteer_activities',
      traceable: true,
    },
    piiFields: ['employee_id', 'employee_name', 'employee_email'],
    csrdAligned: true,
  },

  donation_amount: {
    id: 'donation_amount',
    name: 'Donation Amount',
    description: 'Total monetary donations',
    category: 'donations',
    sourceTable: 'donations',
    sourceColumn: 'amount',
    defaultAggregation: 'sum',
    allowedAggregations: ['sum', 'avg', 'count', 'min', 'max'],
    allowedGranularities: ['day', 'week', 'month', 'quarter', 'year'],
    dimensions: [
      {
        name: 'campaign_id',
        description: 'Donation campaign',
        table: 'donations',
        column: 'campaign_id',
        dataType: 'string',
        piiSensitive: false,
        redactable: false,
      },
      {
        name: 'cause',
        description: 'Cause category',
        table: 'donations',
        column: 'cause',
        dataType: 'string',
        piiSensitive: false,
        redactable: false,
      },
      {
        name: 'currency',
        description: 'Donation currency',
        table: 'donations',
        column: 'currency',
        dataType: 'string',
        piiSensitive: false,
        redactable: false,
      },
    ],
    requiresTenantFilter: true,
    requiresTimeRange: true,
    maxTimeRangeDays: 1095, // 3 years max
    costWeight: 1.2,
    evidenceLineage: {
      sourceSystem: 'benevity',
      sourceEntity: 'donations',
      traceable: true,
    },
    piiFields: ['donor_id', 'donor_name', 'donor_email'],
    csrdAligned: true,
  },

  participant_count: {
    id: 'participant_count',
    name: 'Participant Count',
    description: 'Unique participants in CSR activities',
    category: 'engagement',
    sourceTable: 'activities',
    sourceColumn: 'participant_id',
    defaultAggregation: 'count_distinct',
    allowedAggregations: ['count_distinct', 'count'],
    allowedGranularities: ['day', 'week', 'month', 'quarter', 'year'],
    dimensions: [
      {
        name: 'activity_type',
        description: 'Type of activity',
        table: 'activities',
        column: 'activity_type',
        dataType: 'string',
        allowedValues: ['volunteering', 'donation', 'skills_based', 'mentoring'],
        piiSensitive: false,
        redactable: false,
      },
      {
        name: 'region',
        description: 'Geographic region',
        table: 'activities',
        column: 'region',
        dataType: 'string',
        piiSensitive: false,
        redactable: false,
      },
    ],
    requiresTenantFilter: true,
    requiresTimeRange: true,
    maxTimeRangeDays: 365,
    costWeight: 1.5, // Higher cost for distinct counts
    evidenceLineage: {
      sourceSystem: 'impact-in',
      sourceEntity: 'activities',
      traceable: true,
    },
    piiFields: ['participant_id'],
    csrdAligned: false,
  },

  sroi_ratio: {
    id: 'sroi_ratio',
    name: 'SROI Ratio',
    description: 'Social Return on Investment ratio',
    category: 'social_return',
    sourceTable: 'sroi_calculations',
    sourceColumn: 'sroi_value',
    defaultAggregation: 'avg',
    allowedAggregations: ['avg', 'min', 'max', 'median'],
    allowedGranularities: ['month', 'quarter', 'year'],
    dimensions: [
      {
        name: 'program_type',
        description: 'CSR program type',
        table: 'sroi_calculations',
        column: 'program_type',
        dataType: 'string',
        piiSensitive: false,
        redactable: false,
      },
    ],
    requiresTenantFilter: true,
    requiresTimeRange: true,
    maxTimeRangeDays: 1095,
    costWeight: 2.0, // Expensive calculation
    evidenceLineage: {
      sourceSystem: 'impact-calculator',
      sourceEntity: 'sroi_calculations',
      traceable: true,
    },
    piiFields: [],
    csrdAligned: true,
  },

  carbon_offset: {
    id: 'carbon_offset',
    name: 'Carbon Offset (tCO2e)',
    description: 'Carbon dioxide equivalent offset through CSR activities',
    category: 'impact',
    sourceTable: 'environmental_impact',
    sourceColumn: 'co2e_tonnes',
    defaultAggregation: 'sum',
    allowedAggregations: ['sum', 'avg'],
    allowedGranularities: ['month', 'quarter', 'year'],
    dimensions: [
      {
        name: 'activity_category',
        description: 'Environmental activity type',
        table: 'environmental_impact',
        column: 'activity_category',
        dataType: 'string',
        piiSensitive: false,
        redactable: false,
      },
      {
        name: 'region',
        description: 'Geographic region',
        table: 'environmental_impact',
        column: 'region',
        dataType: 'string',
        piiSensitive: false,
        redactable: false,
      },
    ],
    requiresTenantFilter: true,
    requiresTimeRange: true,
    maxTimeRangeDays: 1825, // 5 years for sustainability reporting
    costWeight: 1.3,
    evidenceLineage: {
      sourceSystem: 'impact-calculator',
      sourceEntity: 'environmental_impact',
      traceable: true,
    },
    piiFields: [],
    csrdAligned: true,
  },
};

/**
 * Get metric by ID with validation
 */
export function getMetric(metricId: string): Metric | null {
  return METRIC_DICTIONARY[metricId] || null;
}

/**
 * Get all metrics for a category
 */
export function getMetricsByCategory(category: Metric['category']): Metric[] {
  return Object.values(METRIC_DICTIONARY).filter((m) => m.category === category);
}

/**
 * Validate metric ID is allowed
 */
export function isMetricAllowed(metricId: string): boolean {
  return metricId in METRIC_DICTIONARY;
}

/**
 * Get all CSRD-aligned metrics
 */
export function getCsrdMetrics(): Metric[] {
  return Object.values(METRIC_DICTIONARY).filter((m) => m.csrdAligned);
}
