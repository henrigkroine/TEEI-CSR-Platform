/**
 * Data Masker - Deterministic pseudonymization
 * Generates realistic fake data while maintaining referential consistency
 */

import { faker } from '@faker-js/faker';
import {
  type MaskerConfig,
  type MaskResult,
  type NameMaskOptions,
  type AddressMaskOptions,
  type FreeTextMaskOptions,
  type MaskingStats,
  type SupportedLocale,
} from './types';
import {
  deterministicHash,
  hashToSeed,
  hashToUuid,
  createDeterministicMapper,
} from './hash';

/**
 * Data Masker class
 * Provides deterministic pseudonymization with locale-aware fake data
 */
export class DataMasker {
  private config: Required<MaskerConfig>;
  private mapper: ReturnType<typeof createDeterministicMapper>;
  private stats: MaskingStats;

  constructor(config: MaskerConfig) {
    this.config = {
      locale: 'en',
      preserveEmailDomain: false,
      ...config,
    };

    // Set faker locale
    this.setFakerLocale(this.config.locale);

    // Create deterministic mapper
    this.mapper = createDeterministicMapper(
      this.config.tenantId,
      this.config.masterSalt
    );

    // Initialize stats
    this.stats = {
      totalMasked: 0,
      byType: {
        name: 0,
        email: 0,
        phone: 0,
        address: 0,
        iban: 0,
        freeText: 0,
      },
      uniqueSubjects: 0,
    };
  }

  /**
   * Set faker locale based on config
   */
  private setFakerLocale(locale: SupportedLocale): void {
    switch (locale) {
      case 'en':
        faker.locale = 'en';
        break;
      case 'es':
        faker.locale = 'es';
        break;
      case 'fr':
        faker.locale = 'fr';
        break;
      case 'uk':
        faker.locale = 'en_GB';
        break;
      case 'no':
        faker.locale = 'nb_NO';
        break;
    }
  }

  /**
   * Mask a person's name deterministically
   *
   * @param originalName - Original name
   * @param subjectKey - Unique identifier for this person
   * @param options - Masking options
   * @returns Masked result
   */
  maskName(
    originalName: string,
    subjectKey: string,
    options: NameMaskOptions = {}
  ): MaskResult {
    const { hash, seed } = this.mapper(subjectKey);

    // Seed faker for deterministic generation
    faker.seed(seed);

    let masked: string;

    if (options.preserveStructure !== false) {
      // Preserve first/last name structure
      const parts = originalName.trim().split(/\s+/);
      if (parts.length === 1) {
        masked = faker.person.firstName(options.gender);
      } else if (parts.length === 2) {
        masked = faker.person.fullName({ sex: options.gender });
      } else {
        // Multiple parts - preserve count
        const firstName = faker.person.firstName(options.gender);
        const middleNames = Array.from({ length: parts.length - 2 }, () =>
          faker.person.firstName()
        );
        const lastName = faker.person.lastName();
        masked = [firstName, ...middleNames, lastName].join(' ');
      }
    } else {
      masked = faker.person.fullName({ sex: options.gender });
    }

    this.stats.totalMasked++;
    this.stats.byType.name++;

    return { masked, hash };
  }

  /**
   * Mask an email address deterministically
   *
   * @param originalEmail - Original email
   * @param subjectKey - Unique identifier
   * @returns Masked result
   */
  maskEmail(originalEmail: string, subjectKey: string): MaskResult {
    const { hash, seed } = this.mapper(subjectKey);

    faker.seed(seed);

    let masked: string;

    if (this.config.preserveEmailDomain) {
      const [, domain] = originalEmail.split('@');
      const localPart = faker.internet.userName().toLowerCase();
      masked = `${localPart}@${domain}`;
    } else {
      masked = faker.internet.email().toLowerCase();
    }

    this.stats.totalMasked++;
    this.stats.byType.email++;

    return { masked, hash };
  }

  /**
   * Mask a phone number deterministically
   *
   * @param originalPhone - Original phone number
   * @param subjectKey - Unique identifier
   * @returns Masked result
   */
  maskPhone(originalPhone: string, subjectKey: string): MaskResult {
    const { hash, seed } = this.mapper(subjectKey);

    faker.seed(seed);

    // Preserve format if international (+) or length
    let masked: string;
    if (originalPhone.startsWith('+')) {
      masked = faker.phone.number('+## ### ### ####');
    } else if (originalPhone.length > 10) {
      masked = faker.phone.number('### ### ####');
    } else {
      masked = faker.phone.number();
    }

    this.stats.totalMasked++;
    this.stats.byType.phone++;

    return { masked, hash };
  }

  /**
   * Mask a physical address deterministically
   *
   * @param originalAddress - Original address
   * @param subjectKey - Unique identifier
   * @param options - Masking options
   * @returns Masked result
   */
  maskAddress(
    originalAddress: string,
    subjectKey: string,
    options: AddressMaskOptions = {}
  ): MaskResult {
    const { hash, seed } = this.mapper(subjectKey);

    faker.seed(seed);

    let masked: string;

    if (options.preserveCity && originalAddress.includes(',')) {
      // Try to preserve city/country
      const parts = originalAddress.split(',').map((p) => p.trim());
      const city = parts[parts.length - 2] || faker.location.city();
      const country = parts[parts.length - 1] || faker.location.country();

      masked = `${faker.location.streetAddress()}, ${city}, ${country}`;
    } else {
      masked = faker.location.streetAddress({ useFullAddress: true });
    }

    this.stats.totalMasked++;
    this.stats.byType.address++;

    return { masked, hash };
  }

  /**
   * Mask an IBAN deterministically
   *
   * @param originalIban - Original IBAN
   * @param subjectKey - Unique identifier
   * @returns Masked result
   */
  maskIBAN(originalIban: string, subjectKey: string): MaskResult {
    const { hash, seed } = this.mapper(subjectKey);

    faker.seed(seed);

    const masked = faker.finance.iban();

    this.stats.totalMasked++;
    this.stats.byType.iban++;

    return { masked, hash };
  }

  /**
   * Mask free-form text with PII redaction
   *
   * @param originalText - Original text
   * @param subjectKey - Unique identifier
   * @param options - Masking options
   * @returns Masked result
   */
  maskFreeText(
    originalText: string,
    subjectKey: string,
    options: FreeTextMaskOptions = {}
  ): MaskResult {
    const { hash, seed } = this.mapper(subjectKey);

    faker.seed(seed);

    let masked: string;

    if (options.preserveStructure !== false) {
      // Preserve sentence/paragraph structure
      const sentences = originalText.match(/[^.!?]+[.!?]+/g) || [originalText];
      masked = sentences
        .map(() => faker.lorem.sentence())
        .join(' ')
        .slice(0, options.maxLength);
    } else {
      masked = faker.lorem.paragraph().slice(0, options.maxLength);
    }

    // Redact common PII patterns
    if (options.redactEntities && options.redactEntities.length > 0) {
      // Email pattern
      if (options.redactEntities.includes('email')) {
        masked = masked.replace(/\S+@\S+\.\S+/g, '[REDACTED_EMAIL]');
      }

      // Phone pattern
      if (options.redactEntities.includes('phone')) {
        masked = masked.replace(
          /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
          '[REDACTED_PHONE]'
        );
      }

      // Name pattern (basic - just common titles)
      if (options.redactEntities.includes('name')) {
        masked = masked.replace(
          /\b(Mr|Mrs|Ms|Dr|Prof)\.?\s+[A-Z][a-z]+\s+[A-Z][a-z]+\b/g,
          '[REDACTED_NAME]'
        );
      }
    }

    this.stats.totalMasked++;
    this.stats.byType.freeText++;

    return { masked, hash };
  }

  /**
   * Generate a deterministic UUID for a subject
   *
   * @param subjectKey - Unique identifier
   * @returns UUID string
   */
  generateUuid(subjectKey: string): string {
    const { uuid } = this.mapper(subjectKey);
    return uuid;
  }

  /**
   * Get masking statistics
   */
  getStats(): MaskingStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalMasked: 0,
      byType: {
        name: 0,
        email: 0,
        phone: 0,
        address: 0,
        iban: 0,
        freeText: 0,
      },
      uniqueSubjects: 0,
    };
  }
}
