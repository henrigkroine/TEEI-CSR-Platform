/**
 * Impact Notarization Module
 *
 * Cryptographic proof of report integrity for public trust verification
 *
 * @module evidence/notarization
 * @author Worker 8 - Team 1 (Impact Notarization)
 */

// Types
export * from './types.js';

// Digest generation
export {
  generateDigest,
  generateDigests,
  verifyDigest,
  createSigningPayload,
  computeAggregateDigest,
} from './digest.js';

// Signing
export {
  generateKeyPair,
  signReport,
  signReportWithStoredKeys,
  reSignReport,
  exportPublicKey,
  importPublicKey,
  type Ed25519KeyPair,
} from './signer.js';

// Verification
export {
  verifySignature,
  verifySignatureStrict,
  quickVerify,
  verifySectionIntegrity,
  batchVerify,
} from './verifier.js';
