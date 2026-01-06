import { z } from 'zod';

/**
 * Supported locales for fake data generation
 */
export const LocaleSchema = z.enum(['en', 'es', 'fr', 'uk', 'no']);
export type Locale = z.infer<typeof LocaleSchema>;
export type SupportedLocale = Locale;

/**
 * Masker configuration options
 */
export const MaskerConfigSchema = z.object({
  tenantId: z.string().min(1),
  salt: z.string().min(16).optional(),
  locale: LocaleSchema.default('en'),
  masterSalt: z.string().optional(),
  preserveEmailDomain: z.boolean().default(false),
});
export type MaskerConfig = z.infer<typeof MaskerConfigSchema>;

/**
 * Masking context for deterministic generation
 */
export interface MaskingContext {
  tenantId: string;
  subjectKey: string;
  salt: string;
  locale: Locale;
}

/**
 * Name masking options
 */
export interface NameMaskOptions {
  preserveGender?: boolean;
  preserveInitials?: boolean;
  preserveStructure?: boolean;
  gender?: 'male' | 'female';
}

/**
 * Address masking options
 */
export interface AddressMaskOptions {
  includeCountry?: boolean;
  includePostalCode?: boolean;
  preserveCity?: boolean;
}

/**
 * Free text masking options
 */
export interface FreeTextMaskOptions {
  preserveLength?: boolean;
  preserveFormat?: boolean;
  maxLength?: number;
  preserveStructure?: boolean;
  redactEntities?: ('email' | 'phone' | 'ssn' | 'iban' | 'creditCard' | 'name')[];
}

/**
 * Mask result with masked value and hash for tracking
 */
export interface MaskResult {
  masked: string;
  hash: string;
}

/**
 * Masking statistics
 */
export interface MaskingStats {
  totalMasked: number;
  byType: {
    name: number;
    email: number;
    phone: number;
    address: number;
    iban: number;
    freeText: number;
  };
  uniqueSubjects: number;
}

/**
 * PII type detection result
 */
export interface PIIDetection {
  hasPII: boolean;
  detected: Array<{
    type: 'email' | 'phone' | 'ssn' | 'iban' | 'creditCard';
    position: number;
    value: string;
  }>;
}
