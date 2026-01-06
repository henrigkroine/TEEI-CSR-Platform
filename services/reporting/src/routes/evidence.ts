/**
 * Evidence Routes
 *
 * Endpoints:
 * - GET /companies/:id/evidence - List evidence with filters
 * - GET /companies/:id/evidence/stats - Evidence statistics
 * - GET /companies/:id/evidence/:evidenceId - Get single evidence
 * - GET /companies/:id/evidence/:evidenceId/lineage - Get evidence lineage
 *
 * @module routes/evidence
 */

import type { FastifyInstance } from 'fastify';
import {
  getEvidence,
  getEvidenceLineage,
  getEvidenceStats,
} from '../controllers/evidence.js';
import { createCacheMiddleware } from '../middleware/cache.js';

export async function evidenceRoutes(fastify: FastifyInstance) {
  /**
   * List evidence with filters
   */
  fastify.get('/companies/:id/evidence', {
    preHandler: createCacheMiddleware({
      namespace: 'evidence',
      ttl: 30000, // 30 seconds
    }),
    schema: {
      description: 'Get evidence list with filters',
      tags: ['Evidence'],
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
          metric_type: {
            type: 'array',
            items: {
              type: 'string',
              enum: [
                'volunteer_hours',
                'integration_score',
                'language_score',
                'job_readiness_score',
                'beneficiaries_reached',
                'investment_amount',
                'outcome_delta',
              ],
            },
            description: 'Filter by metric types',
          },
          source: {
            type: 'array',
            items: {
              type: 'string',
              enum: [
                'manual_entry',
                'csv_import',
                'api_integration',
                'benevity',
                'goodera',
                'workday',
                'calculated',
              ],
            },
            description: 'Filter by evidence sources',
          },
          period: {
            type: 'string',
            pattern: '^\\d{4}-Q[1-4]$',
            description: 'Filter by period (e.g., 2024-Q4)',
          },
          verified: {
            type: 'boolean',
            description: 'Filter by verification status',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Filter by tags',
          },
          search: {
            type: 'string',
            description: 'Search in metric name and source identifier',
          },
          date_from: {
            type: 'string',
            format: 'date',
            description: 'Filter from date (ISO 8601)',
          },
          date_to: {
            type: 'string',
            format: 'date',
            description: 'Filter to date (ISO 8601)',
          },
          campaign_id: {
            type: 'string',
            format: 'uuid',
            description: 'Filter by campaign ID (SWARM 6)',
          },
          program_instance_id: {
            type: 'string',
            format: 'uuid',
            description: 'Filter by program instance ID (SWARM 6)',
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 50,
            description: 'Number of results per page',
          },
          offset: {
            type: 'integer',
            minimum: 0,
            default: 0,
            description: 'Pagination offset',
          },
        },
      },
      response: {
        200: {
          description: 'Evidence list',
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  company_id: { type: 'string' },
                  metric_type: { type: 'string' },
                  metric_name: { type: 'string' },
                  value: { type: ['number', 'string'] },
                  source: { type: 'string' },
                  source_identifier: { type: 'string' },
                  collected_at: { type: 'string', format: 'date-time' },
                  period: { type: 'string' },
                  verified: { type: 'boolean' },
                  confidence_score: { type: 'number' },
                  tags: { type: 'array', items: { type: 'string' } },
                },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                limit: { type: 'number' },
                offset: { type: 'number' },
                has_more: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
    handler: getEvidence,
  });

  /**
   * Get evidence statistics
   */
  fastify.get('/companies/:id/evidence/stats', {
    preHandler: createCacheMiddleware({
      namespace: 'evidence-stats',
      ttl: 60000, // 1 minute
    }),
    schema: {
      description: 'Get evidence statistics',
      tags: ['Evidence'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Company ID' },
        },
      },
      response: {
        200: {
          description: 'Evidence statistics',
          type: 'object',
          properties: {
            total_count: { type: 'number' },
            verified_count: { type: 'number' },
            unverified_count: { type: 'number' },
            by_metric_type: { type: 'object' },
            by_source: { type: 'object' },
            by_period: { type: 'object' },
            oldest_evidence: { type: 'string', format: 'date-time' },
            newest_evidence: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    handler: getEvidenceStats,
  });

  /**
   * Get evidence lineage
   */
  fastify.get('/companies/:id/evidence/:evidenceId/lineage', {
    preHandler: createCacheMiddleware({
      namespace: 'evidence-lineage',
      ttl: 120000, // 2 minutes
    }),
    schema: {
      description: 'Get evidence lineage (dependencies and calculations)',
      tags: ['Evidence'],
      params: {
        type: 'object',
        required: ['id', 'evidenceId'],
        properties: {
          id: { type: 'string', description: 'Company ID' },
          evidenceId: { type: 'string', description: 'Evidence ID' },
        },
      },
      response: {
        200: {
          description: 'Evidence lineage',
          type: 'object',
          properties: {
            evidence_id: { type: 'string' },
            metric_name: { type: 'string' },
            value: { type: ['number', 'string'] },
            source: { type: 'string' },
            collected_at: { type: 'string', format: 'date-time' },
            dependencies: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  evidence_id: { type: 'string' },
                  metric_name: { type: 'string' },
                  value: { type: ['number', 'string'] },
                  relationship: { type: 'string', enum: ['input', 'reference', 'derived_from'] },
                },
              },
            },
            calculations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  step: { type: 'number' },
                  operation: { type: 'string' },
                  formula: { type: 'string' },
                  inputs: { type: 'object' },
                  output: { type: 'number' },
                },
              },
            },
            transformations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  step: { type: 'number' },
                  type: { type: 'string' },
                  description: { type: 'string' },
                },
              },
            },
          },
        },
        404: {
          description: 'Evidence not found',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: getEvidenceLineage,
  });
}
