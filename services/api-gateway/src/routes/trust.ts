/**
 * Trust Center API Routes
 *
 * Endpoints:
 * - GET /trust/v1/status - System status and performance metrics
 * - GET /trust/v1/evidence/:reportId - Evidence citations for a report
 * - GET /trust/v1/ledger/:reportId - Evidence ledger entries for a report
 * - GET /trust/v1/policies - Data residency and privacy policies
 *
 * @module routes/trust
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

/**
 * Register Trust Center API routes
 */
export async function trustRoutes(fastify: FastifyInstance) {
  /**
   * GET /trust/v1/status
   * Public endpoint - no authentication required
   * Returns system status and performance metrics for Trust Center
   */
  fastify.get('/trust/v1/status', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // TODO: Replace with actual metrics from Prometheus/Datadog
      const status = {
        status: 'operational',
        uptime: 99.95, // 30-day uptime percentage
        latencyP95: 245, // p95 API latency in milliseconds
        lcp: 1.2, // Largest Contentful Paint in seconds
        errorRate: 0.02, // Error rate as percentage
        errorBudget: 78.5, // Error budget remaining as percentage
        services: [
          { name: 'API Gateway', status: 'operational', uptime: 99.98 },
          { name: 'Reporting Service', status: 'operational', uptime: 99.96 },
          { name: 'Q2Q AI Pipeline', status: 'operational', uptime: 99.93 },
          { name: 'Database (PostgreSQL)', status: 'operational', uptime: 99.99 },
          { name: 'Analytics Service', status: 'operational', uptime: 99.95 },
        ],
        lastUpdated: new Date().toISOString(),
      };

      reply.code(200).header('Cache-Control', 'public, max-age=30').send(status);
    } catch (error: any) {
      fastify.log.error('Failed to fetch status:', error);
      reply.code(500).send({
        error: 'Failed to fetch status',
        message: error.message,
      });
    }
  });

  /**
   * GET /trust/v1/evidence/:reportId
   * Requires authentication
   * Returns evidence citations used in a report
   */
  fastify.get<{
    Params: { reportId: string };
  }>('/trust/v1/evidence/:reportId', async (request: FastifyRequest<{ Params: { reportId: string } }>, reply: FastifyReply) => {
    try {
      const { reportId } = request.params;

      // Validate UUID
      const uuidSchema = z.string().uuid();
      const validatedReportId = uuidSchema.parse(reportId);

      // TODO: Proxy to reporting service
      // For now, return placeholder
      const evidence = {
        reportId: validatedReportId,
        citations: [],
        evidenceCount: 0,
        message: 'Evidence API endpoint - implementation pending',
      };

      reply.code(200).send(evidence);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        reply.code(400).send({
          error: 'Invalid report ID format',
          details: error.errors,
        });
      } else {
        fastify.log.error('Failed to fetch evidence:', error);
        reply.code(500).send({
          error: 'Failed to fetch evidence',
          message: error.message,
        });
      }
    }
  });

  /**
   * GET /trust/v1/ledger/:reportId
   * Requires authentication
   * Returns evidence ledger entries for a report (tamper-proof audit log)
   */
  fastify.get<{
    Params: { reportId: string };
  }>('/trust/v1/ledger/:reportId', async (request: FastifyRequest<{ Params: { reportId: string } }>, reply: FastifyReply) => {
    try {
      const { reportId } = request.params;

      // Validate UUID
      const uuidSchema = z.string().uuid();
      const validatedReportId = uuidSchema.parse(reportId);

      // TODO: Proxy to reporting service evidence ledger
      // For now, return placeholder
      const ledger = {
        reportId: validatedReportId,
        entries: [],
        entryCount: 0,
        chainValid: true,
        message: 'Evidence ledger API endpoint - implementation pending',
      };

      reply.code(200).send(ledger);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        reply.code(400).send({
          error: 'Invalid report ID format',
          details: error.errors,
        });
      } else {
        fastify.log.error('Failed to fetch ledger:', error);
        reply.code(500).send({
          error: 'Failed to fetch ledger',
          message: error.message,
        });
      }
    }
  });

  /**
   * GET /trust/v1/policies
   * Public endpoint - no authentication required
   * Returns data residency and privacy policy summaries
   */
  fastify.get('/trust/v1/policies', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // TODO: Read from data-residency service
      const policies = {
        dataResidency: {
          EU: {
            primary: 'EU-WEST-1 (Ireland)',
            backup: 'EU-CENTRAL-1 (Frankfurt)',
            regulation: 'GDPR',
          },
          US: {
            primary: 'US-EAST-1 (Virginia)',
            backup: 'US-WEST-2 (Oregon)',
            regulation: 'CCPA, SOC 2',
          },
          UK: {
            primary: 'EU-WEST-2 (London)',
            backup: 'EU-WEST-1 (Ireland)',
            regulation: 'UK GDPR',
          },
          APAC: {
            primary: 'AP-SOUTHEAST-1 (Singapore)',
            backup: 'AP-NORTHEAST-1 (Tokyo)',
            regulation: 'PDPA',
          },
        },
        retentionPolicies: {
          userEvents: '7 years',
          evidenceSnippets: '5 years (AI Act compliance)',
          reportLineage: '5 years (AI Act compliance)',
          evidenceLedger: '5 years (AI Act compliance)',
          auditLogs: '7 years (SOC 2 compliance)',
        },
        privacyRights: {
          dsar: 'Processed within 30 days (GDPR Article 15)',
          erasure: 'Right to be forgotten (GDPR Article 17)',
          portability: 'Data portability (GDPR Article 20)',
          objection: 'Right to object (GDPR Article 21)',
        },
        lastUpdated: '2025-11-17',
      };

      reply.code(200).header('Cache-Control', 'public, max-age=3600').send(policies);
    } catch (error: any) {
      fastify.log.error('Failed to fetch policies:', error);
      reply.code(500).send({
        error: 'Failed to fetch policies',
        message: error.message,
      });
    }
  });
}
