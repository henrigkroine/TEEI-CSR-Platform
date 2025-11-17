/**
 * Report Notarization Verifier
 *
 * Verifies Ed25519 signatures and detects tampering
 *
 * @module evidence/notarization/verifier
 * @author Worker 8 - Team 1 (crypto-signing-engineer)
 */

import { verify } from 'crypto';
import {
  ReportSection,
  NotarizationSignature,
  VerificationResult,
  VerificationOptions,
  VerificationError,
  TamperDetectedError,
} from './types.js';
import { generateDigest, createSigningPayload, verifyDigest } from './digest.js';
import { importPublicKey } from './signer.js';

/**
 * Verify notarization signature
 *
 * @param signature - Notarization signature to verify
 * @param options - Verification options
 * @returns Verification result
 */
export function verifySignature(
  signature: NotarizationSignature,
  options: VerificationOptions = {}
): VerificationResult {
  try {
    // Step 1: Reconstruct signing payload
    const payload = createSigningPayload(
      signature.reportId,
      signature.companyId,
      signature.sections
    );

    // Step 2: Import public key
    const publicKey = importPublicKey(signature.publicKey);

    // Step 3: Verify Ed25519 signature
    const signatureBuffer = Buffer.from(signature.signature, 'hex');
    const valid = verify(
      null,
      Buffer.from(payload, 'utf8'),
      {
        key: publicKey,
        format: 'der',
        type: 'spki',
      },
      signatureBuffer
    );

    // Step 4: Check for tampering if current sections provided
    const sections = signature.sections.map(section => {
      let tampered = false;
      let currentDigest: string | undefined;

      if (options.currentSections && options.checkTampering) {
        const currentSection = options.currentSections.find(
          s => s.sectionId === section.sectionId
        );

        if (currentSection) {
          const computed = generateDigest(currentSection);
          currentDigest = computed.digest;
          tampered = computed.digest !== section.digest;
        }
      }

      return {
        sectionId: section.sectionId,
        sectionType: section.sectionType,
        verified: valid,
        currentDigest,
        signedDigest: section.digest,
        tampered,
      };
    });

    // Step 5: Fail if any section tampered
    const tamperedSections = sections.filter(s => s.tampered);
    if (tamperedSections.length > 0) {
      throw new TamperDetectedError(
        `Tampering detected in ${tamperedSections.length} section(s)`,
        tamperedSections.map(s => s.sectionId)
      );
    }

    return {
      valid,
      reportId: signature.reportId,
      signedAt: signature.signedAt,
      sections,
      publicKey: signature.publicKey,
      verifiedAt: new Date(),
    };
  } catch (error) {
    if (error instanceof TamperDetectedError) {
      throw error;
    }

    throw new VerificationError(
      `Failed to verify signature for report ${signature.reportId}: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/**
 * Verify signature and throw if invalid
 *
 * @param signature - Notarization signature
 * @param options - Verification options
 * @throws {VerificationError} If signature invalid
 * @throws {TamperDetectedError} If tampering detected
 */
export function verifySignatureStrict(
  signature: NotarizationSignature,
  options: VerificationOptions = {}
): VerificationResult {
  const result = verifySignature(signature, options);

  if (!result.valid) {
    throw new VerificationError(
      `Invalid signature for report ${signature.reportId}: ${result.reason || 'Signature verification failed'}`
    );
  }

  return result;
}

/**
 * Quick verification (signature only, no tamper check)
 *
 * @param signature - Notarization signature
 * @returns True if signature valid
 */
export function quickVerify(signature: NotarizationSignature): boolean {
  try {
    const result = verifySignature(signature);
    return result.valid;
  } catch {
    return false;
  }
}

/**
 * Verify section integrity against signed digest
 *
 * @param section - Current section content
 * @param signedDigest - Original signed digest
 * @returns True if section unchanged
 */
export function verifySectionIntegrity(
  section: ReportSection,
  signedDigest: string
): boolean {
  return verifyDigest(section, signedDigest);
}

/**
 * Batch verify multiple signatures
 *
 * @param signatures - Array of notarization signatures
 * @returns Array of verification results
 */
export function batchVerify(
  signatures: NotarizationSignature[]
): VerificationResult[] {
  return signatures.map(sig => {
    try {
      return verifySignature(sig);
    } catch (error) {
      return {
        valid: false,
        reportId: sig.reportId,
        signedAt: sig.signedAt,
        sections: sig.sections.map(s => ({
          sectionId: s.sectionId,
          sectionType: s.sectionType,
          verified: false,
          signedDigest: s.digest,
          tampered: false,
        })),
        publicKey: sig.publicKey,
        reason:
          error instanceof Error ? error.message : 'Unknown verification error',
        verifiedAt: new Date(),
      };
    }
  });
}
