/**
 * Impact Proof Routes
 * Public verification endpoints for notarized reports
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  signReportSections,
  verifyReport,
  getPublicKey,
  ReportSection,
  NotarizationSignature,
  ImpactProof,
  ImpactProofSchema,
} from '../evidence/notarization/index.js';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('impact-proof');

/**
 * Mock database (in production, use actual DB)
 */
const reportsDb = new Map<string, {
  reportId: string;
  companyId: string;
  companyName: string;
  reportTitle: string;
  generatedAt: string;
  sections: ReportSection[];
  signatures: NotarizationSignature[];
}>();

/**
 * Register Impact Proof routes
 */
export function impactProofRoutes(app: FastifyInstance, prefix: string = '/trust/v1') {
  /**
   * POST /trust/v1/impact-proof/sign
   * Sign a report for public verification
   */
  app.post(`${prefix}/impact-proof/sign`, async (req: FastifyRequest, reply: FastifyReply) => {
    const {
      reportId,
      companyId,
      companyName,
      reportTitle,
      sections,
      signedBy,
    } = req.body as {
      reportId: string;
      companyId: string;
      companyName: string;
      reportTitle: string;
      sections: ReportSection[];
      signedBy: string;
    };

    try {
      // Sign all sections
      const signatures = await signReportSections(sections, signedBy, 'default');

      // Store in DB
      reportsDb.set(reportId, {
        reportId,
        companyId,
        companyName,
        reportTitle,
        generatedAt: new Date().toISOString(),
        sections,
        signatures,
      });

      logger.info(`Signed report ${reportId} with ${signatures.length} sections`);

      return reply.code(201).send({
        reportId,
        signaturesCreated: signatures.length,
        signedAt: new Date().toISOString(),
        proofUrl: `${process.env.TRUST_CENTER_URL || 'https://trust.teei.app'}/impact-proof/${reportId}`,
      });
    } catch (error) {
      logger.error('Failed to sign report:', error);
      return reply.code(500).send({
        error: 'SIGNING_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /trust/v1/impact-proof/:reportId
   * Get impact proof for public verification
   */
  app.get(`${prefix}/impact-proof/:reportId`, async (req: FastifyRequest, reply: FastifyReply) => {
    const { reportId } = req.params as { reportId: string };

    const report = reportsDb.get(reportId);

    if (!report) {
      return reply.code(404).send({
        error: 'REPORT_NOT_FOUND',
        message: `Report ${reportId} not found or not notarized`,
      });
    }

    try {
      // Get public key
      const publicKeyId = report.signatures[0]?.publicKeyId || 'default';
      const publicKey = await getPublicKey(publicKeyId);

      if (!publicKey) {
        return reply.code(500).send({
          error: 'PUBLIC_KEY_NOT_FOUND',
          message: 'Public key not available',
        });
      }

      const impactProof: ImpactProof = {
        reportId: report.reportId,
        reportTitle: report.reportTitle,
        companyId: report.companyId,
        companyName: report.companyName,
        generatedAt: report.generatedAt,
        sections: report.sections.map((section, idx) => ({
          sectionId: section.sectionId,
          sectionType: section.sectionType,
          contentHash: report.signatures[idx].contentHash,
          signature: report.signatures[idx].signature,
          signedAt: report.signatures[idx].signedAt,
        })),
        publicKey,
        algorithm: 'ed25519',
        proofUrl: `${process.env.TRUST_CENTER_URL || 'https://trust.teei.app'}/impact-proof/${reportId}`,
      };

      // Validate schema
      ImpactProofSchema.parse(impactProof);

      return reply.code(200).send(impactProof);
    } catch (error) {
      logger.error(`Failed to generate proof for ${reportId}:`, error);
      return reply.code(500).send({
        error: 'PROOF_GENERATION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /trust/v1/impact-proof/:reportId/verify
   * Verify a report's integrity
   */
  app.post(`${prefix}/impact-proof/:reportId/verify`, async (req: FastifyRequest, reply: FastifyReply) => {
    const { reportId } = req.params as { reportId: string };

    const report = reportsDb.get(reportId);

    if (!report) {
      return reply.code(404).send({
        error: 'REPORT_NOT_FOUND',
        message: `Report ${reportId} not found`,
      });
    }

    try {
      const result = await verifyReport(reportId, report.sections, report.signatures);

      logger.info(`Verified report ${reportId}: ${result.valid ? 'VALID' : 'INVALID'}`);

      return reply.code(200).send({
        ...result,
        message: result.valid
          ? 'All sections verified successfully'
          : `${result.summary.invalid} section(s) failed verification`,
      });
    } catch (error) {
      logger.error(`Verification failed for ${reportId}:`, error);
      return reply.code(500).send({
        error: 'VERIFICATION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /trust/v1/impact-proof/health
   * Health check for notarization service
   */
  app.get(`${prefix}/impact-proof/health`, async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.code(200).send({
      service: 'impact-proof',
      status: 'healthy',
      reportsNotarized: reportsDb.size,
      timestamp: new Date().toISOString(),
    });
  });
}
