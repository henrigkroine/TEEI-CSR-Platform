/**
 * Benchmarks & Cohorts Routes
 *
 * Endpoints:
 * - GET /companies/:id/benchmarks - Get benchmark comparison data
 * - GET /companies/:id/cohorts - List available cohorts
 *
 * @module routes/benchmarks
 */

import type { FastifyInstance } from 'fastify';
import { getBenchmarks, getCohorts } from '../controllers/benchmarks.js';

export async function benchmarkRoutes(fastify: FastifyInstance) {
  /**
   * Get percentile time-series data
   */
  fastify.get('/benchmarks/percentiles', {
    schema: {
      description: 'Get percentile time-series data for a metric',
      tags: ['Benchmarks'],
      querystring: {
        type: 'object',
        required: ['companyId', 'metric'],
        properties: {
          companyId: { type: 'string', description: 'Company ID' },
          metric: { type: 'string', description: 'Metric to analyze' },
          cohortId: { type: 'string', description: 'Cohort ID (optional)' },
        },
      },
      response: {
        200: {
          description: 'Percentile time-series data',
          type: 'object',
          properties: {
            metric: { type: 'string' },
            metric_label: { type: 'string' },
            unit: { type: 'string' },
            data_points: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  period: { type: 'string' },
                  company_value: { type: 'number' },
                  p25: { type: 'number' },
                  p50: { type: 'number' },
                  p75: { type: 'number' },
                  p90: { type: 'number' },
                  cohort_average: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const { companyId, metric, cohortId } = request.query as any;
      // Mock time-series data
      const mockData = {
        metric,
        metric_label: getMetricLabel(metric),
        unit: getMetricUnit(metric),
        data_points: [
          { period: '2024-Q1', company_value: 3.8, p25: 1.5, p50: 3.0, p75: 4.2, p90: 5.5, cohort_average: 3.3 },
          { period: '2024-Q2', company_value: 4.0, p25: 1.6, p50: 3.1, p75: 4.3, p90: 5.6, cohort_average: 3.4 },
          { period: '2024-Q3', company_value: 4.1, p25: 1.7, p50: 3.2, p75: 4.4, p90: 5.8, cohort_average: 3.5 },
          { period: '2024-Q4', company_value: 4.2, p25: 1.8, p50: 3.2, p75: 4.5, p90: 6.0, cohort_average: 3.5 },
        ],
      };
      return reply.send(mockData);
    },
  });

  /**
   * Export benchmarks data
   */
  fastify.get('/companies/:id/benchmarks/export', {
    schema: {
      description: 'Export benchmark data in CSV or PDF format',
      tags: ['Benchmarks'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Company ID' },
        },
      },
      querystring: {
        type: 'object',
        required: ['format'],
        properties: {
          format: { type: 'string', enum: ['csv', 'pdf'], description: 'Export format' },
          industry: { type: 'string' },
          size: { type: 'string' },
          geography: { type: 'string' },
          period: { type: 'string' },
          lang: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const { id: companyId } = request.params as any;
      const { format, industry, size, geography, period } = request.query as any;

      if (format === 'csv') {
        const csv = generateCSVExport(companyId, { industry, size, geography, period });
        reply
          .header('Content-Type', 'text/csv')
          .header('Content-Disposition', `attachment; filename="benchmarks-${companyId}-${new Date().toISOString().split('T')[0]}.csv"`)
          .send(csv);
      } else {
        // PDF export placeholder
        reply
          .header('Content-Type', 'application/pdf')
          .header('Content-Disposition', `attachment; filename="benchmarks-${companyId}-${new Date().toISOString().split('T')[0]}.pdf"`)
          .send('PDF export not yet implemented');
      }
    },
  });

  /**
   * Get benchmarks for company
   */
  fastify.get('/companies/:id/benchmarks', {
    schema: {
      description: 'Get company benchmarks compared to cohort',
      tags: ['Benchmarks'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Company ID' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          industry: {
            type: 'string',
            enum: [
              'technology',
              'finance',
              'healthcare',
              'manufacturing',
              'retail',
              'energy',
              'education',
              'nonprofit',
              'consulting',
              'other',
            ],
            description: 'Industry filter for cohort',
          },
          size: {
            type: 'string',
            enum: ['small', 'medium', 'large', 'enterprise'],
            description: 'Company size filter',
          },
          geography: {
            type: 'string',
            enum: [
              'north_america',
              'south_america',
              'europe',
              'asia_pacific',
              'middle_east',
              'africa',
              'global',
            ],
            description: 'Geographic region filter',
          },
          period: {
            type: 'string',
            description: 'Reporting period (e.g., "Q4 2024")',
          },
        },
      },
      response: {
        200: {
          description: 'Benchmarks data',
          type: 'object',
          properties: {
            company_id: { type: 'string' },
            company_name: { type: 'string' },
            cohort: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                criteria: {
                  type: 'object',
                  properties: {
                    industry: { type: 'string' },
                    size: { type: 'string' },
                    geography: { type: 'string' },
                  },
                },
                company_count: { type: 'number' },
                last_updated: { type: 'string', format: 'date-time' },
              },
            },
            period: { type: 'string' },
            benchmarks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  metric: { type: 'string' },
                  metric_label: { type: 'string' },
                  company_value: { type: 'number' },
                  cohort_average: { type: 'number' },
                  cohort_median: { type: 'number' },
                  cohort_min: { type: 'number' },
                  cohort_max: { type: 'number' },
                  percentile: { type: 'number' },
                  unit: { type: 'string' },
                  trend: { type: 'string', enum: ['up', 'down', 'stable'] },
                },
              },
            },
            last_refreshed: { type: 'string', format: 'date-time' },
            next_refresh: { type: 'string', format: 'date-time' },
          },
        },
        500: {
          description: 'Server error',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: getBenchmarks,
  });

  /**
   * Get available cohorts
   */
  fastify.get('/companies/:id/cohorts', {
    schema: {
      description: 'Get available cohorts for company',
      tags: ['Benchmarks'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Company ID' },
        },
      },
      response: {
        200: {
          description: 'Available cohorts',
          type: 'object',
          properties: {
            available_cohorts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  criteria: {
                    type: 'object',
                    properties: {
                      industry: { type: 'string' },
                      size: { type: 'string' },
                      geography: { type: 'string' },
                    },
                  },
                  company_count: { type: 'number' },
                  last_updated: { type: 'string', format: 'date-time' },
                },
              },
            },
            suggested_cohort: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                criteria: { type: 'object' },
                company_count: { type: 'number' },
                last_updated: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
        500: {
          description: 'Server error',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: getCohorts,
  });
}

/**
 * Helper functions
 */

function getMetricLabel(metric: string): string {
  const labels: Record<string, string> = {
    sroi: 'Social Return on Investment',
    vis: 'Volunteer Impact Score',
    participation_rate: 'Employee Participation Rate',
    retention: 'Program Retention Rate',
    beneficiaries: 'Total Beneficiaries',
    volunteer_hours: 'Volunteer Hours',
    impact_score: 'Overall Impact Score',
    engagement_rate: 'Employee Engagement Rate',
    programs: 'Active Programs',
  };
  return labels[metric] || metric;
}

function getMetricUnit(metric: string): string {
  const units: Record<string, string> = {
    sroi: 'ratio',
    vis: 'score',
    participation_rate: '%',
    retention: '%',
    beneficiaries: 'count',
    volunteer_hours: 'hours',
    impact_score: 'score',
    engagement_rate: '%',
    programs: 'count',
  };
  return units[metric] || 'count';
}

function generateCSVExport(companyId: string, filters: any): string {
  // Mock CSV generation
  const headers = [
    'Metric',
    'Your Value',
    'Cohort Avg',
    '25th Percentile',
    '50th Percentile',
    '75th Percentile',
    'Your Percentile',
    'Cohort Min',
    'Cohort Max',
  ];

  const rows = [
    ['SROI', '4.2:1', '3.5:1', '1.8:1', '3.2:1', '4.5:1', '78', '1.8:1', '6.1:1'],
    ['Total Beneficiaries', '1,250', '980', '850', '850', '1,200', '82', '150', '3,200'],
    ['Volunteer Hours', '3,200 hrs', '2,800 hrs', '2,500 hrs', '2,500 hrs', '3,000 hrs', '65', '500 hrs', '8,500 hrs'],
    ['Active Programs', '12', '8', '7', '7', '10', '92', '2', '25'],
    ['Engagement Rate', '68%', '52%', '48%', '48%', '60%', '88', '15%', '85%'],
    ['Impact Score', '87', '72', '70', '70', '80', '91', '35', '95'],
  ];

  const csvLines = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ];

  return csvLines.join('\n');
}
