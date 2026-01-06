/**
 * Impact Notarization Types
 * Cryptographic signing and verification for report integrity
 */

import { z } from 'zod';

/**
 * Algorithm used for signing (Ed25519 for fast verification)
 */
export type SignatureAlgorithm = 'ed25519';

/**
 * Report section that can be notarized
 */
export interface ReportSection {
  sectionId: string;
  reportId: string;
  sectionType: 'summary' | 'metrics' | 'outcomes' | 'recommendations' | 'evidence';
  content: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

/**
 * Cryptographic signature for a report section
 */
export interface NotarizationSignature {
  /** Unique signature ID */
  signatureId: string;
  /** Report section identifier */
  sectionId: string;
  /** Full report identifier */
  reportId: string;
  /** SHA-256 hash of the content */
  contentHash: string;
  /** Ed25519 signature (base64) */
  signature: string;
  /** Algorithm used */
  algorithm: SignatureAlgorithm;
  /** Public key ID (for key rotation) */
  publicKeyId: string;
  /** Timestamp of signing */
  signedAt: string;
  /** Signer identity (service account or user) */
  signedBy: string;
  /** Chain of custody metadata */
  metadata: {
    version: string;
    reportVersion: string;
    evidenceCount?: number;
    citationCount?: number;
  };
}

/**
 * Verification result
 */
export interface VerificationResult {
  /** Whether signature is valid */
  valid: boolean;
  /** Report section data */
  section: ReportSection | null;
  /** Signature data */
  signature: NotarizationSignature | null;
  /** Verification timestamp */
  verifiedAt: string;
  /** Error details if invalid */
  error?: {
    code: string;
    message: string;
  };
  /** Integrity checks */
  checks: {
    signatureValid: boolean;
    contentHashMatch: boolean;
    timestampValid: boolean;
    publicKeyValid: boolean;
  };
}

/**
 * Public proof data (for external verification)
 */
export interface ImpactProof {
  reportId: string;
  reportTitle: string;
  companyId: string;
  companyName: string;
  generatedAt: string;
  sections: Array<{
    sectionId: string;
    sectionType: string;
    contentHash: string;
    signature: string;
    signedAt: string;
  }>;
  publicKey: string;
  algorithm: SignatureAlgorithm;
  proofUrl: string;
}

/**
 * Zod schemas for validation
 */
export const ReportSectionSchema = z.object({
  sectionId: z.string(),
  reportId: z.string(),
  sectionType: z.enum(['summary', 'metrics', 'outcomes', 'recommendations', 'evidence']),
  content: z.string(),
  metadata: z.record(z.unknown()),
  timestamp: z.string().datetime(),
});

export const NotarizationSignatureSchema = z.object({
  signatureId: z.string(),
  sectionId: z.string(),
  reportId: z.string(),
  contentHash: z.string().length(64), // SHA-256 hex
  signature: z.string(), // base64
  algorithm: z.literal('ed25519'),
  publicKeyId: z.string(),
  signedAt: z.string().datetime(),
  signedBy: z.string(),
  metadata: z.object({
    version: z.string(),
    reportVersion: z.string(),
    evidenceCount: z.number().optional(),
    citationCount: z.number().optional(),
  }),
});

export const VerificationResultSchema = z.object({
  valid: z.boolean(),
  section: ReportSectionSchema.nullable(),
  signature: NotarizationSignatureSchema.nullable(),
  verifiedAt: z.string().datetime(),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }).optional(),
  checks: z.object({
    signatureValid: z.boolean(),
    contentHashMatch: z.boolean(),
    timestampValid: z.boolean(),
    publicKeyValid: z.boolean(),
  }),
});

export const ImpactProofSchema = z.object({
  reportId: z.string(),
  reportTitle: z.string(),
  companyId: z.string(),
  companyName: z.string(),
  generatedAt: z.string().datetime(),
  sections: z.array(z.object({
    sectionId: z.string(),
    sectionType: z.string(),
    contentHash: z.string(),
    signature: z.string(),
    signedAt: z.string(),
  })),
  publicKey: z.string(),
  algorithm: z.literal('ed25519'),
  proofUrl: z.string().url(),
});

/**
 * Error codes for notarization failures
 */
export enum NotarizationErrorCode {
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  CONTENT_MISMATCH = 'CONTENT_MISMATCH',
  PUBLIC_KEY_NOT_FOUND = 'PUBLIC_KEY_NOT_FOUND',
  EXPIRED_SIGNATURE = 'EXPIRED_SIGNATURE',
  INVALID_ALGORITHM = 'INVALID_ALGORITHM',
  SIGNING_FAILED = 'SIGNING_FAILED',
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
}

export class NotarizationError extends Error {
  constructor(
    public readonly code: NotarizationErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'NotarizationError';
  }
}
