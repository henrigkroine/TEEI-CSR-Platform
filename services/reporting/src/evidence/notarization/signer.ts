/**
 * Report Notarization Signer
 *
 * Ed25519 digital signatures for tamper-proof report integrity
 *
 * @module evidence/notarization/signer
 * @author Worker 8 - Team 1 (crypto-signing-engineer)
 */

import { createHash, randomBytes } from 'crypto';
import { sign } from 'crypto';
import { generateKeyPairSync } from 'crypto';
import {
  ReportSection,
  SectionDigest,
  NotarizationSignature,
  SigningOptions,
  SigningError,
} from './types.js';
import { generateDigests, createSigningPayload } from './digest.js';

/**
 * Ed25519 Key Pair
 */
export interface Ed25519KeyPair {
  publicKey: Buffer;
  privateKey: Buffer;
}

/**
 * Generate Ed25519 key pair for signing
 *
 * @returns Key pair (public + private)
 */
export function generateKeyPair(): Ed25519KeyPair {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'der' },
  });

  return {
    publicKey: Buffer.from(publicKey),
    privateKey: Buffer.from(privateKey),
  };
}

/**
 * Sign report sections with Ed25519
 *
 * @param reportId - Report identifier
 * @param companyId - Company identifier
 * @param sections - Report sections to sign
 * @param privateKey - Ed25519 private key (DER format)
 * @param publicKey - Ed25519 public key (DER format)
 * @param options - Signing options
 * @returns Notarization signature
 */
export function signReport(
  reportId: string,
  companyId: string,
  sections: ReportSection[],
  privateKey: Buffer,
  publicKey: Buffer,
  options: SigningOptions = {}
): NotarizationSignature {
  try {
    // Step 1: Generate section digests
    const digests = generateDigests(sections);

    // Step 2: Create canonical payload for signing
    const payload = createSigningPayload(reportId, companyId, digests);

    // Step 3: Sign the payload with Ed25519
    const signature = sign(null, Buffer.from(payload, 'utf8'), {
      key: privateKey,
      format: 'der',
      type: 'pkcs8',
    });

    // Step 4: Return notarization signature
    return {
      reportId,
      companyId,
      sections: digests,
      signature: signature.toString('hex'),
      publicKey: publicKey.toString('hex'),
      algorithm: 'ed25519',
      signedAt: new Date(),
      signerIdentity: options.signerIdentity || 'TEEI-CSR-Platform/v1.0',
    };
  } catch (error) {
    throw new SigningError(
      `Failed to sign report ${reportId}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Sign report with stored key pair from environment
 *
 * @param reportId - Report identifier
 * @param companyId - Company identifier
 * @param sections - Report sections to sign
 * @param options - Signing options
 * @returns Notarization signature
 */
export async function signReportWithStoredKeys(
  reportId: string,
  companyId: string,
  sections: ReportSection[],
  options: SigningOptions = {}
): Promise<NotarizationSignature> {
  // In production: Load keys from Vault/Secrets Manager
  // For now: Generate ephemeral keys (will be replaced with Vault integration)
  const keyPair = generateKeyPair();

  return signReport(
    reportId,
    companyId,
    sections,
    keyPair.privateKey,
    keyPair.publicKey,
    options
  );
}

/**
 * Re-sign report (for updates)
 *
 * @param existingSignature - Previous signature
 * @param updatedSections - Updated report sections
 * @param privateKey - Ed25519 private key
 * @param publicKey - Ed25519 public key
 * @returns New notarization signature
 */
export function reSignReport(
  existingSignature: NotarizationSignature,
  updatedSections: ReportSection[],
  privateKey: Buffer,
  publicKey: Buffer
): NotarizationSignature {
  return signReport(
    existingSignature.reportId,
    existingSignature.companyId,
    updatedSections,
    privateKey,
    publicKey,
    { signerIdentity: existingSignature.signerIdentity }
  );
}

/**
 * Export public key for external verification
 *
 * @param publicKey - Public key buffer
 * @returns Hex-encoded public key
 */
export function exportPublicKey(publicKey: Buffer): string {
  return publicKey.toString('hex');
}

/**
 * Import public key from hex string
 *
 * @param hexKey - Hex-encoded public key
 * @returns Public key buffer
 */
export function importPublicKey(hexKey: string): Buffer {
  return Buffer.from(hexKey, 'hex');
}
