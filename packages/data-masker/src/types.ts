/**
 * Data Masker Types
 * Deterministic pseudonymization for demo tenants
 */

/**
 * Supported locales for fake data generation
 */
export type SupportedLocale = 'en' | 'es' | 'fr' | 'uk' | 'no';

/**
 * Masking configuration options
 */
export interface MaskerConfig {
  /**
   * Tenant ID for tenant-specific salting
   */
  tenantId: string;

  /**
   * Master salt for deterministic hashing
   * Should be kept secret and consistent across runs
   */
  masterSalt: string;

  /**
   * Locale for generated fake data
   * @default 'en'
   */
  locale?: SupportedLocale;

  /**
   * Whether to preserve domain in email masking
   * @default false
   */
  preserveEmailDomain?: boolean;
}

/**
 * Result of a masking operation
 */
export interface MaskResult {
  /**
   * The masked/pseudonymized value
   */
  masked: string;

  /**
   * Original value hash (for debugging/verification)
   */
  hash: string;
}

/**
 * Options for name masking
 */
export interface NameMaskOptions {
  /**
   * Gender hint for realistic name generation
   */
  gender?: 'male' | 'female' | 'nonbinary';

  /**
   * Whether to preserve first/last name structure
   * @default true
   */
  preserveStructure?: boolean;
}

/**
 * Options for address masking
 */
export interface AddressMaskOptions {
  /**
   * Country code for locale-appropriate addresses
   */
  country?: string;

  /**
   * Whether to preserve city/region
   * @default false
   */
  preserveCity?: boolean;
}

/**
 * Options for free text masking
 */
export interface FreeTextMaskOptions {
  /**
   * Maximum length of masked text
   */
  maxLength?: number;

  /**
   * Whether to preserve sentence structure
   * @default true
   */
  preserveStructure?: boolean;

  /**
   * PII entity types to redact (name, email, phone, etc.)
   */
  redactEntities?: string[];
}

/**
 * Masking statistics for reporting
 */
export interface MaskingStats {
  /**
   * Total items masked
   */
  totalMasked: number;

  /**
   * Breakdown by type
   */
  byType: {
    name: number;
    email: number;
    phone: number;
    address: number;
    iban: number;
    freeText: number;
  };

  /**
   * Unique subjects (deterministic mappings)
   */
  uniqueSubjects: number;
}
