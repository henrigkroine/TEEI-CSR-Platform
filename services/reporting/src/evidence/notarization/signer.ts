/**
 * Impact Notarization Signer
 * Signs report sections with Ed25519 for fast, secure verification
 */

import { createHash, randomBytes } from 'crypto';
import * as ed from '@noble/ed25519';
import {
  ReportSection,
  NotarizationSignature,
  NotarizationError,
  NotarizationErrorCode,
  SignatureAlgorithm,
} from './types.js';

/**
 * Key pair for signing (in production, load from secure vault)
 */
interface KeyPair {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  publicKeyId: string;
}

/**
 * In-memory key store (use Vault/KMS in production)
 */
const keyStore = new Map<string, KeyPair>();

/**
 * Generate a new Ed25519 key pair
 */
export async function generateKeyPair(keyId?: string): Promise<KeyPair> {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);

  const publicKeyId = keyId || `notary-${randomBytes(8).toString('hex')}`;

  const keyPair: KeyPair = {
    privateKey,
    publicKey,
    publicKeyId,
  };

  keyStore.set(publicKeyId, keyPair);

  return keyPair;
}

/**
 * Load key pair from environment or vault
 */
export async function loadKeyPair(publicKeyId: string): Promise<KeyPair | null> {
  // Check in-memory store first
  if (keyStore.has(publicKeyId)) {
    return keyStore.get(publicKeyId)!;
  }

  // In production: fetch from Vault/KMS
  // const vaultKey = await vault.get(`notarization/${publicKeyId}`);
  // if (vaultKey) {
  //   const privateKey = Buffer.from(vaultKey.privateKey, 'base64');
  //   const publicKey = await ed.getPublicKeyAsync(privateKey);
  //   return { privateKey, publicKey, publicKeyId };
  // }

  return null;
}

/**
 * Get public key as base64 string for external verification
 */
export async function getPublicKey(publicKeyId: string): Promise<string | null> {
  const keyPair = await loadKeyPair(publicKeyId);
  if (!keyPair) {
    return null;
  }
  return Buffer.from(keyPair.publicKey).toString('base64');
}

/**
 * Compute SHA-256 hash of content
 */
export function computeContentHash(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Create canonical signing payload
 */
function createSigningPayload(section: ReportSection, contentHash: string): string {
  // Canonical format: sectionId|reportId|contentHash|timestamp
  return `${section.sectionId}|${section.reportId}|${contentHash}|${section.timestamp}`;
}

/**
 * Sign a report section
 */
export async function signReportSection(
  section: ReportSection,
  signedBy: string,
  publicKeyId?: string
): Promise<NotarizationSignature> {
  const startTime = performance.now();

  try {
    // Use default key if not specified
    const keyId = publicKeyId || 'default';

    // Load or generate key pair
    let keyPair = await loadKeyPair(keyId);
    if (!keyPair) {
      // Auto-generate if not exists (in production, fail instead)
      keyPair = await generateKeyPair(keyId);
    }

    // Compute content hash
    const contentHash = computeContentHash(section.content);

    // Create signing payload
    const payload = createSigningPayload(section, contentHash);
    const payloadBytes = new TextEncoder().encode(payload);

    // Sign with Ed25519
    const signatureBytes = await ed.signAsync(payloadBytes, keyPair.privateKey);
    const signature = Buffer.from(signatureBytes).toString('base64');

    const signedAt = new Date().toISOString();

    const result: NotarizationSignature = {
      signatureId: `sig-${randomBytes(12).toString('hex')}`,
      sectionId: section.sectionId,
      reportId: section.reportId,
      contentHash,
      signature,
      algorithm: 'ed25519' as SignatureAlgorithm,
      publicKeyId: keyPair.publicKeyId,
      signedAt,
      signedBy,
      metadata: {
        version: '1.0',
        reportVersion: section.metadata.reportVersion as string || '1.0',
        evidenceCount: section.metadata.evidenceCount as number | undefined,
        citationCount: section.metadata.citationCount as number | undefined,
      },
    };

    const duration = performance.now() - startTime;

    // Latency check: should be <20ms p95
    if (duration > 20) {
      console.warn(`Slow notarization: ${duration.toFixed(2)}ms for section ${section.sectionId}`);
    }

    return result;
  } catch (error) {
    throw new NotarizationError(
      NotarizationErrorCode.SIGNING_FAILED,
      `Failed to sign section ${section.sectionId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { sectionId: section.sectionId, error }
    );
  }
}

/**
 * Sign multiple sections in batch
 */
export async function signReportSections(
  sections: ReportSection[],
  signedBy: string,
  publicKeyId?: string
): Promise<NotarizationSignature[]> {
  const startTime = performance.now();

  const signatures = await Promise.all(
    sections.map((section) => signReportSection(section, signedBy, publicKeyId))
  );

  const duration = performance.now() - startTime;
  const avgDuration = duration / sections.length;

  if (avgDuration > 20) {
    console.warn(`Slow batch notarization: avg ${avgDuration.toFixed(2)}ms per section`);
  }

  return signatures;
}
