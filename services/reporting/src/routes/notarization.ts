/**
 * Report Notarization API Routes
 *
 * REST endpoints for signing reports and verifying Impact Proofs
 *
 * @module routes/notarization
 * @author Worker 8 - Team 1 (verification-api-engineer)
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { pool } from '../db/connection.js';
import {
  signReportWithStoredKeys,
  verifySignature,
  type ReportSection,
  type NotarizationSignature,
  type ImpactProof,
} from '../evidence/notarization/index.js';

/**
 * Request schemas
 */
const NotarizeReportSchema = z.object({
  reportId: z.string().uuid(),
  companyId: z.string().uuid(),
  sections: z.array(
    z.object({
      sectionId: z.string(),
      sectionType: z.enum([
        'summary',
        'metrics',
        'outcomes',
        'recommendations',
        'evidence',
        'full',
      ]),
      content: z.string(),
      metadata: z.record(z.any()).optional(),
    })
  ),
});

const VerifyProofParamsSchema = z.object({
  reportId: z.string().uuid(),
});

/**
 * Register notarization routes
 */
export async function notarizationRoutes(
  fastify: FastifyInstance
): Promise<void> {
  /**
   * POST /api/v1/reports/:reportId/notarize
   * Sign a report and generate Impact Proof
   */
  fastify.post<{
    Body: z.infer<typeof NotarizeReportSchema>;
  }>('/api/v1/reports/:reportId/notarize', async (request, reply) => {
    const startTime = performance.now();

    try {
      const { reportId, companyId, sections } = NotarizeReportSchema.parse({
        reportId: request.params.reportId,
        ...request.body,
      });

      // Authorization: Ensure user has access to this report
      // (Implement authorization middleware in production)

      // Step 1: Sign the report
      const signature = await signReportWithStoredKeys(
        reportId,
        companyId,
        sections as ReportSection[]
      );

      // Step 2: Store signature in database
      await pool.query(
        `
        INSERT INTO report_notarization (
          report_id, company_id, sections, signature, public_key, algorithm, signer_identity, signed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (report_id) DO UPDATE SET
          sections = EXCLUDED.sections,
          signature = EXCLUDED.signature,
          public_key = EXCLUDED.public_key,
          signed_at = EXCLUDED.signed_at,
          updated_at = NOW()
        `,
        [
          reportId,
          companyId,
          JSON.stringify(signature.sections),
          signature.signature,
          signature.publicKey,
          signature.algorithm,
          signature.signerIdentity,
          signature.signedAt,
        ]
      );

      const latency = performance.now() - startTime;

      return reply.code(201).send({
        success: true,
        reportId,
        signature: {
          signature: signature.signature,
          publicKey: signature.publicKey,
          signedAt: signature.signedAt,
          sections: signature.sections.length,
        },
        verifyUrl: `${process.env.TRUST_CENTER_URL || 'https://trust.teei.io'}/impact-proof/verify/${reportId}`,
        latency: `${latency.toFixed(2)}ms`,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to notarize report');
      return reply.code(500).send({
        success: false,
        error: 'Failed to sign report',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /trust/v1/impact-proof/:reportId
   * Get public Impact Proof for verification (no auth required)
   */
  fastify.get<{
    Params: { reportId: string };
  }>('/trust/v1/impact-proof/:reportId', async (request, reply) => {
    try {
      const { reportId } = VerifyProofParamsSchema.parse(request.params);

      // Fetch notarization from database
      const result = await pool.query(
        `
        SELECT
          rn.report_id,
          rn.company_id,
          rn.sections,
          rn.signature,
          rn.public_key,
          rn.algorithm,
          rn.signer_identity,
          rn.signed_at,
          r.title AS report_title,
          r.period_start,
          r.period_end,
          c.name AS company_name
        FROM report_notarization rn
        JOIN reports r ON rn.report_id = r.id
        JOIN companies c ON rn.company_id = c.id
        WHERE rn.report_id = $1
        `,
        [reportId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          error: 'Impact proof not found',
          message: `No notarization found for report ${reportId}`,
        });
      }

      const row = result.rows[0];

      // Build Impact Proof
      const proof: ImpactProof = {
        reportId: row.report_id,
        companyId: row.company_id,
        companyName: row.company_name,
        reportTitle: row.report_title,
        reportPeriod: `${row.period_start} to ${row.period_end}`,
        sections: JSON.parse(row.sections).map((s: any) => ({
          sectionId: s.sectionId,
          sectionType: s.sectionType,
          digest: s.digest,
        })),
        signature: row.signature,
        publicKey: row.public_key,
        signedAt: row.signed_at.toISOString(),
        verifyUrl: `${process.env.TRUST_CENTER_URL || 'https://trust.teei.io'}/impact-proof/verify/${reportId}`,
      };

      return reply.code(200).send({
        success: true,
        proof,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to fetch impact proof');
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch impact proof',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /trust/v1/impact-proof/:reportId/verify
   * Verify Impact Proof integrity (public endpoint)
   */
  fastify.post<{
    Params: { reportId: string };
    Body: {
      currentSections?: Array<{
        sectionId: string;
        sectionType: string;
        content: string;
      }>;
    };
  }>('/trust/v1/impact-proof/:reportId/verify', async (request, reply) => {
    try {
      const { reportId } = VerifyProofParamsSchema.parse(request.params);
      const { currentSections } = request.body || {};

      // Fetch stored signature
      const result = await pool.query(
        `
        SELECT report_id, company_id, sections, signature, public_key, algorithm, signer_identity, signed_at
        FROM report_notarization
        WHERE report_id = $1
        `,
        [reportId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          error: 'Notarization not found',
        });
      }

      const row = result.rows[0];

      // Reconstruct NotarizationSignature
      const signature: NotarizationSignature = {
        reportId: row.report_id,
        companyId: row.company_id,
        sections: JSON.parse(row.sections),
        signature: row.signature,
        publicKey: row.public_key,
        algorithm: row.algorithm,
        signedAt: new Date(row.signed_at),
        signerIdentity: row.signer_identity,
      };

      // Verify signature
      const verification = verifySignature(signature, {
        currentSections: currentSections as ReportSection[] | undefined,
        checkTampering: !!currentSections,
      });

      return reply.code(200).send({
        success: true,
        verification: {
          valid: verification.valid,
          reportId: verification.reportId,
          signedAt: verification.signedAt,
          verifiedAt: verification.verifiedAt,
          sections: verification.sections,
          publicKey: verification.publicKey,
          reason: verification.reason,
        },
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to verify impact proof');

      // Handle tampering errors specially
      if (error instanceof Error && error.name === 'TamperDetectedError') {
        return reply.code(400).send({
          success: false,
          verification: {
            valid: false,
            tampered: true,
            reason: error.message,
          },
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Verification failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}
