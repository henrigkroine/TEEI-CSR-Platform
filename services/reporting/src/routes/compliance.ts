/**
 * Compliance Alerts API Routes
 *
 * Endpoints for compliance alerts and notifications
 *
 * @module routes/compliance
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface ComplianceAlertsQuery {
  companyId: string;
}

/**
 * Register compliance routes
 */
export async function complianceRoutes(fastify: FastifyInstance) {
  /**
   * GET /compliance/alerts
   * Get compliance alerts for a company
   *
   * Query Parameters:
   * - companyId: Company identifier (required)
   *
   * @example
   * GET /compliance/alerts?companyId=123e4567-e89b-12d3-a456-426614174000
   */
  fastify.get<{ Querystring: ComplianceAlertsQuery }>(
    '/compliance/alerts',
    {
      schema: {
        description: 'Get compliance alerts for a company',
        tags: ['compliance'],
        querystring: {
          type: 'object',
          required: ['companyId'],
          properties: {
            companyId: {
              type: 'string',
              description: 'Company identifier',
            },
          },
        },
        response: {
          200: {
            description: 'Compliance alerts',
            type: 'object',
            properties: {
              alerts: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    summary: { type: 'string' },
                    type: {
                      type: 'string',
                      enum: ['Policy Drift', 'Missing Documents', 'Deadline Risk']
                    },
                    owner: { type: 'string' },
                    due: { type: 'string' },
                    severity: {
                      type: 'string',
                      enum: ['info', 'warning', 'fyi']
                    },
                  },
                },
              },
              filters: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
          400: {
            description: 'Invalid parameters',
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: ComplianceAlertsQuery }>, reply: FastifyReply) => {
      const { companyId } = request.query;

      if (!companyId) {
        return reply.status(400).send({
          error: 'INVALID_COMPANY_ID',
          message: 'Company ID is required',
        });
      }

      // TODO: Query actual compliance alerts from database
      // For now, return mock data that matches the expected format
      const mockAlerts = [
        {
          id: 'alert-1',
          title: 'Policy Review Due',
          summary: 'Quarterly policy review is due in 5 days',
          type: 'Deadline Risk' as const,
          owner: 'Compliance Team',
          due: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          severity: 'warning' as const,
        },
        {
          id: 'alert-2',
          title: 'Missing DSAR Documentation',
          summary: '3 DSAR requests missing required documentation',
          type: 'Missing Documents' as const,
          owner: 'Data Protection Officer',
          due: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          severity: 'warning' as const,
        },
      ];

      return reply.send({
        alerts: mockAlerts,
        filters: ['All', 'Policy Drift', 'Missing Documents', 'Deadline Risk'],
      });
    }
  );
}
