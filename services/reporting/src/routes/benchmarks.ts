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
