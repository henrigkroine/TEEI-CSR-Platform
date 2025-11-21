/**
 * @teei/data-masker
 * Deterministic pseudonymization for demo tenants
 *
 * Provides:
 * - Deterministic masking (same input → same output)
 * - Locale-aware fake data generation
 * - Referential consistency across services
 * - PII redaction with configurable entity detection
 *
 * @example
 * ```typescript
 * import { DataMasker } from '@teei/data-masker';
 *
 * const masker = new DataMasker({
 *   tenantId: 'demo-acme-corp',
 *   masterSalt: process.env.MASKER_SALT!,
 *   locale: 'en'
 * });
 *
 * // Deterministic masking - same subjectKey always produces same result
 * const name1 = masker.maskName('John Doe', 'user-123');
 * const name2 = masker.maskName('John Doe', 'user-123');
 * console.log(name1.masked === name2.masked); // true
 *
 * // Referential consistency across PII types
 * const email = masker.maskEmail('john@example.com', 'user-123');
 * const phone = masker.maskPhone('+1-555-1234', 'user-123');
 * // All derived from same hash for user-123
 * ```
 */

export { DataMasker } from './masker';
export {
  deterministicHash,
  hashToSeed,
  hashToUuid,
  createDeterministicMapper,
} from './hash';
export type {
  MaskerConfig,
  MaskResult,
  NameMaskOptions,
  AddressMaskOptions,
  FreeTextMaskOptions,
  MaskingStats,
  SupportedLocale,
} from './types';
