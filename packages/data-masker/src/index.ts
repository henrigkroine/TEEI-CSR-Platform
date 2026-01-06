/**
 * @teei/data-masker
 *
 * Deterministic pseudonymization library for demo data generation.
 * Ensures consistent, safe, and realistic fake data across the platform.
 *
 * Key Features:
 * - Deterministic masking: same input → same output
 * - Locale-aware fake data generation
 * - Referential consistency across services
 * - PII detection and validation
 * - Configurable salt per tenant
 *
 * @example
 * ```typescript
 * import { maskName, maskEmail, createMaskingContext } from '@teei/data-masker';
 *
 * const context = createMaskingContext('demo-acme', 'user-123', 'en');
 * const maskedName = maskName('John Doe', context);
 * const maskedEmail = maskEmail('john@example.com', context);
 * ```
 */

// Type exports
export type {
  Locale,
  MaskerConfig,
  MaskingContext,
  AddressMaskOptions,
  FreeTextMaskOptions,
  PIIDetection,
} from './types.js';

// Schema exports
export { LocaleSchema, MaskerConfigSchema } from './types.js';

// Hashing utilities
export {
  generateDeterministicHash,
  hashToSeed,
  hashToUUID,
  generateSalt,
  hashValue,
  DEFAULT_DEMO_SALT,
} from './hasher.js';

// Masking functions
export {
  createMaskingContext,
  maskName,
  maskEmail,
  maskPhone,
  maskAddress,
  maskIBAN,
  maskFreeText,
  maskCompanyName,
  maskJobTitle,
  generateDeterministicUserId,
} from './maskers.js';

// PII detection and validation
export {
  detectPII,
  assertNoPII,
  redactPII,
  isDemoTenantId,
  assertDemoTenant,
} from './detector.js';
