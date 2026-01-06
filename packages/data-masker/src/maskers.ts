import { faker } from '@faker-js/faker';
import {
  generateDeterministicHash,
  hashToSeed,
  DEFAULT_DEMO_SALT,
} from './hasher.js';
import type {
  MaskingContext,
  Locale,
  AddressMaskOptions,
  FreeTextMaskOptions,
} from './types.js';

/**
 * Get faker instance for a specific locale
 * Note: Using default faker instance for now
 */
function getFakerForLocale(_locale: Locale): typeof faker {
  // Use the default faker instance
  // Locale-specific generation can be enhanced in the future
  return faker;
}

/**
 * Create a masking context from tenant and subject identifiers
 */
export function createMaskingContext(
  tenantId: string,
  subjectKey: string,
  locale: Locale = 'en',
  salt: string = DEFAULT_DEMO_SALT
): MaskingContext {
  return {
    tenantId,
    subjectKey,
    salt,
    locale,
  };
}

/**
 * Mask a person's name deterministically
 * Same input always produces same output
 */
export function maskName(
  _originalName: string,
  context: MaskingContext,
  options: { gender?: 'male' | 'female' } = {}
): string {
  const hash = generateDeterministicHash(
    context.tenantId,
    `${context.subjectKey}:name`,
    context.salt
  );
  const seed = hashToSeed(hash);

  const fakerInstance = getFakerForLocale(context.locale);
  fakerInstance.seed(seed);

  if (options.gender === 'male') {
    return `${fakerInstance.person.firstName('male')} ${fakerInstance.person.lastName()}`;
  } else if (options.gender === 'female') {
    return `${fakerInstance.person.firstName('female')} ${fakerInstance.person.lastName()}`;
  }

  return fakerInstance.person.fullName();
}

/**
 * Mask an email address deterministically
 * Preserves domain structure for corporate emails
 */
export function maskEmail(
  originalEmail: string,
  context: MaskingContext,
  options: { preserveDomain?: boolean } = {}
): string {
  const hash = generateDeterministicHash(
    context.tenantId,
    `${context.subjectKey}:email`,
    context.salt
  );
  const seed = hashToSeed(hash);

  const fakerInstance = getFakerForLocale(context.locale);
  fakerInstance.seed(seed);

  if (options.preserveDomain && originalEmail.includes('@')) {
    const [, domain] = originalEmail.split('@');
    const username = fakerInstance.internet.userName().toLowerCase();
    return `${username}@${domain}`;
  }

  return fakerInstance.internet.email().toLowerCase();
}

/**
 * Mask a phone number deterministically
 * Preserves country code format
 */
export function maskPhone(
  originalPhone: string,
  context: MaskingContext,
  options: { preserveCountryCode?: boolean } = {}
): string {
  const hash = generateDeterministicHash(
    context.tenantId,
    `${context.subjectKey}:phone`,
    context.salt
  );
  const seed = hashToSeed(hash);

  const fakerInstance = getFakerForLocale(context.locale);
  fakerInstance.seed(seed);

  // Generate phone number based on locale
  const phoneNumber = fakerInstance.phone.number();

  if (options.preserveCountryCode && originalPhone) {
    // Extract country code (simple heuristic)
    const countryCodeMatch = originalPhone.match(/^\+\d{1,3}/);
    if (countryCodeMatch) {
      const localPart = phoneNumber.replace(/^\+\d{1,3}/, '');
      return `${countryCodeMatch[0]}${localPart}`;
    }
  }

  return phoneNumber;
}

/**
 * Mask a physical address deterministically
 */
export function maskAddress(
  _originalAddress: string,
  context: MaskingContext,
  options: AddressMaskOptions = {}
): string {
  const hash = generateDeterministicHash(
    context.tenantId,
    `${context.subjectKey}:address`,
    context.salt
  );
  const seed = hashToSeed(hash);

  const fakerInstance = getFakerForLocale(context.locale);
  fakerInstance.seed(seed);

  const parts: string[] = [];
  parts.push(fakerInstance.location.streetAddress());
  parts.push(fakerInstance.location.city());

  if (options.includePostalCode) {
    parts.push(fakerInstance.location.zipCode());
  }

  if (options.includeCountry) {
    parts.push(fakerInstance.location.country());
  }

  return parts.join(', ');
}

/**
 * Mask an IBAN deterministically
 * Preserves country code
 */
export function maskIBAN(
  originalIBAN: string,
  context: MaskingContext,
  options: { preserveCountryCode?: boolean } = {}
): string {
  const hash = generateDeterministicHash(
    context.tenantId,
    `${context.subjectKey}:iban`,
    context.salt
  );
  const seed = hashToSeed(hash);

  const fakerInstance = getFakerForLocale(context.locale);
  fakerInstance.seed(seed);

  const iban = fakerInstance.finance.iban();

  if (options.preserveCountryCode && originalIBAN.length >= 2) {
    const countryCode = originalIBAN.substring(0, 2).toUpperCase();
    return countryCode + iban.substring(2);
  }

  return iban;
}

/**
 * Mask free-form text while preserving structure
 * Uses word replacement to maintain readability
 */
export function maskFreeText(
  originalText: string,
  context: MaskingContext,
  options: FreeTextMaskOptions = {}
): string {
  const hash = generateDeterministicHash(
    context.tenantId,
    `${context.subjectKey}:text`,
    context.salt
  );
  const seed = hashToSeed(hash);

  const fakerInstance = getFakerForLocale(context.locale);
  fakerInstance.seed(seed);

  if (options.preserveLength || options.preserveFormat) {
    // Replace words with similar-length words
    const words = originalText.split(/\s+/);
    const maskedWords = words.map((word, idx) => {
      // Re-seed for each word to get deterministic results
      fakerInstance.seed(seed + idx);
      const lorem = fakerInstance.lorem.word(word.length);

      // Preserve capitalization
      const firstChar = word.charAt(0);
      if (firstChar && firstChar === firstChar.toUpperCase()) {
        return lorem.charAt(0).toUpperCase() + lorem.slice(1);
      }
      return lorem;
    });

    const joined = maskedWords.join(' ');
    return options.maxLength ? joined.substring(0, options.maxLength) : joined;
  }

  // Generate completely new text
  const sentences = Math.ceil(originalText.length / 100);
  const generated = fakerInstance.lorem.sentences(sentences);
  return options.maxLength ? generated.substring(0, options.maxLength) : generated;
}

/**
 * Mask a company name deterministically
 */
export function maskCompanyName(
  _originalCompany: string,
  context: MaskingContext
): string {
  const hash = generateDeterministicHash(
    context.tenantId,
    `${context.subjectKey}:company`,
    context.salt
  );
  const seed = hashToSeed(hash);

  const fakerInstance = getFakerForLocale(context.locale);
  fakerInstance.seed(seed);

  return fakerInstance.company.name();
}

/**
 * Mask a job title deterministically
 */
export function maskJobTitle(
  _originalTitle: string,
  context: MaskingContext
): string {
  const hash = generateDeterministicHash(
    context.tenantId,
    `${context.subjectKey}:jobtitle`,
    context.salt
  );
  const seed = hashToSeed(hash);

  const fakerInstance = getFakerForLocale(context.locale);
  fakerInstance.seed(seed);

  return fakerInstance.person.jobTitle();
}

/**
 * Generate a deterministic user ID
 */
export function generateDeterministicUserId(
  context: MaskingContext
): string {
  const hash = generateDeterministicHash(
    context.tenantId,
    `${context.subjectKey}:userid`,
    context.salt
  );
  return `demo-user-${hash.substring(0, 12)}`;
}
