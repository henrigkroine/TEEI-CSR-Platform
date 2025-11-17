/**
 * Impact Notarization Verifier
 * Verifies cryptographic signatures on report sections
 */

import * as ed from '@noble/ed25519';
import {
  ReportSection,
  NotarizationSignature,
  VerificationResult,
  NotarizationError,
  NotarizationErrorCode,
} from './types.js';
import { getPublicKey, computeContentHash } from './signer.js';

/**
 * Create signing payload (must match signer.ts)
 */
function createSigningPayload(section: ReportSection, contentHash: string): string {
  return `${section.sectionId}|${section.reportId}|${contentHash}|${section.timestamp}`;
}

/**
 * Verify a single signature
 */
export async function verifySignature(
  section: ReportSection,
  signature: NotarizationSignature
): Promise<VerificationResult> {
  const verifiedAt = new Date().toISOString();

  const checks = {
    signatureValid: false,
    contentHashMatch: false,
    timestampValid: false,
    publicKeyValid: false,
  };

  try {
    // 1. Verify public key exists
    const publicKeyBase64 = await getPublicKey(signature.publicKeyId);
    if (!publicKeyBase64) {
      return {
        valid: false,
        section,
        signature,
        verifiedAt,
        error: {
          code: NotarizationErrorCode.PUBLIC_KEY_NOT_FOUND,
          message: `Public key not found: ${signature.publicKeyId}`,
        },
        checks,
      };
    }
    checks.publicKeyValid = true;

    // 2. Verify content hash
    const currentHash = computeContentHash(section.content);
    if (currentHash !== signature.contentHash) {
      return {
        valid: false,
        section,
        signature,
        verifiedAt,
        error: {
          code: NotarizationErrorCode.CONTENT_MISMATCH,
          message: 'Content hash does not match signature',
        },
        checks: { ...checks, contentHashMatch: false },
      };
    }
    checks.contentHashMatch = true;

    // 3. Verify timestamp is not too old (e.g., < 2 years)
    const signedAtTime = new Date(signature.signedAt).getTime();
    const now = Date.now();
    const twoYears = 2 * 365 * 24 * 60 * 60 * 1000;

    if (now - signedAtTime > twoYears) {
      return {
        valid: false,
        section,
        signature,
        verifiedAt,
        error: {
          code: NotarizationErrorCode.EXPIRED_SIGNATURE,
          message: 'Signature expired (older than 2 years)',
        },
        checks: { ...checks, timestampValid: false },
      };
    }
    checks.timestampValid = true;

    // 4. Verify cryptographic signature
    const payload = createSigningPayload(section, currentHash);
    const payloadBytes = new TextEncoder().encode(payload);

    const signatureBytes = Buffer.from(signature.signature, 'base64');
    const publicKeyBytes = Buffer.from(publicKeyBase64, 'base64');

    const isValid = await ed.verifyAsync(signatureBytes, payloadBytes, publicKeyBytes);

    if (!isValid) {
      return {
        valid: false,
        section,
        signature,
        verifiedAt,
        error: {
          code: NotarizationErrorCode.INVALID_SIGNATURE,
          message: 'Cryptographic signature verification failed',
        },
        checks: { ...checks, signatureValid: false },
      };
    }
    checks.signatureValid = true;

    // All checks passed
    return {
      valid: true,
      section,
      signature,
      verifiedAt,
      checks,
    };
  } catch (error) {
    return {
      valid: false,
      section,
      signature,
      verifiedAt,
      error: {
        code: NotarizationErrorCode.VERIFICATION_FAILED,
        message: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      checks,
    };
  }
}

/**
 * Verify multiple sections
 */
export async function verifySections(
  sections: ReportSection[],
  signatures: NotarizationSignature[]
): Promise<VerificationResult[]> {
  // Create signature lookup map
  const sigMap = new Map(signatures.map((sig) => [sig.sectionId, sig]));

  // Verify each section
  const results = await Promise.all(
    sections.map(async (section) => {
      const signature = sigMap.get(section.sectionId);
      if (!signature) {
        return {
          valid: false,
          section,
          signature: null,
          verifiedAt: new Date().toISOString(),
          error: {
            code: NotarizationErrorCode.INVALID_SIGNATURE,
            message: `No signature found for section ${section.sectionId}`,
          },
          checks: {
            signatureValid: false,
            contentHashMatch: false,
            timestampValid: false,
            publicKeyValid: false,
          },
        };
      }

      return verifySignature(section, signature);
    })
  );

  return results;
}

/**
 * Verify full report integrity
 */
export async function verifyReport(
  reportId: string,
  sections: ReportSection[],
  signatures: NotarizationSignature[]
): Promise<{
  valid: boolean;
  reportId: string;
  verifiedAt: string;
  results: VerificationResult[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
  };
}> {
  const results = await verifySections(sections, signatures);

  const valid = results.every((r) => r.valid);
  const summary = {
    total: results.length,
    valid: results.filter((r) => r.valid).length,
    invalid: results.filter((r) => !r.valid).length,
  };

  return {
    valid,
    reportId,
    verifiedAt: new Date().toISOString(),
    results,
    summary,
  };
}
