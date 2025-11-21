import { z } from 'zod';

/**
 * Supported locales for fake data generation
 */
export const LocaleSchema = z.enum(['en', 'es', 'fr', 'uk', 'no']);
export type Locale = z.infer<typeof LocaleSchema>;

/**
 * Masker configuration options
 */
export const MaskerConfigSchema = z.object({
  tenantId: z.string().min(1),
  salt: z.string().min(16).optional(),
  locale: LocaleSchema.default('en'),
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
 * Address masking options
 */
export interface AddressMaskOptions {
  includeCountry?: boolean;
  includePostalCode?: boolean;
}

/**
 * Free text masking options
 */
export interface FreeTextMaskOptions {
  preserveLength?: boolean;
  preserveFormat?: boolean;
  maxLength?: number;
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
