/**
 * Impact Notarization Types
 *
 * Cryptographic proof of report integrity for public trust verification
 *
 * @module evidence/notarization/types
 * @author Worker 8 - Team 1 (Impact Notarization)
 */

/**
 * Report section that can be notarized independently
 */
export interface ReportSection {
  sectionId: string;
  sectionType: 'summary' | 'metrics' | 'outcomes' | 'recommendations' | 'evidence' | 'full';
  content: string;
  metadata?: Record<string, any>;
}

/**
 * Digest of a report section (SHA-256 hash)
 */
export interface SectionDigest {
  sectionId: string;
  sectionType: string;
  digest: string; // hex-encoded SHA-256
  algorithm: 'sha256';
  timestamp: Date;
}

/**
 * Cryptographic signature of a report
 */
export interface NotarizationSignature {
  reportId: string;
  companyId: string;
  sections: SectionDigest[];
  signature: string; // hex-encoded Ed25519 signature
  publicKey: string; // hex-encoded Ed25519 public key
  algorithm: 'ed25519';
  signedAt: Date;
  signerIdentity: string; // e.g., "TEEI-CSR-Platform/v1.0"
}

/**
 * Verification result
 */
export interface VerificationResult {
  valid: boolean;
  reportId: string;
  signedAt: Date;
  sections: {
    sectionId: string;
    sectionType: string;
    verified: boolean;
    currentDigest?: string;
    signedDigest: string;
    tampered: boolean;
  }[];
  publicKey: string;
  reason?: string;
  verifiedAt: Date;
}

/**
 * Notarization record stored in PostgreSQL
 */
export interface NotarizationRecord {
  id: string;
  reportId: string;
  companyId: string;
  sections: SectionDigest[];
  signature: string;
  publicKey: string;
  algorithm: 'ed25519';
  signedAt: Date;
  signerIdentity: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Public proof for external verification
 */
export interface ImpactProof {
  reportId: string;
  companyId: string;
  companyName?: string;
  reportTitle?: string;
  reportPeriod?: string;
  sections: Array<{
    sectionId: string;
    sectionType: string;
    digest: string;
  }>;
  signature: string;
  publicKey: string;
  signedAt: string; // ISO 8601
  verifyUrl: string; // e.g., "https://trust.teei.io/impact-proof/verify/abc123"
}

/**
 * Signing options
 */
export interface SigningOptions {
  signerIdentity?: string;
  includeMetadata?: boolean;
}

/**
 * Verification options
 */
export interface VerificationOptions {
  currentSections?: ReportSection[];
  checkTampering?: boolean;
}

/**
 * Error types
 */
export class NotarizationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'NotarizationError';
  }
}

export class SigningError extends NotarizationError {
  constructor(message: string) {
    super(message, 'SIGNING_ERROR');
  }
}

export class VerificationError extends NotarizationError {
  constructor(message: string) {
    super(message, 'VERIFICATION_ERROR');
  }
}

export class TamperDetectedError extends NotarizationError {
  constructor(message: string, public tamperedSections: string[]) {
    super(message, 'TAMPER_DETECTED');
  }
}
