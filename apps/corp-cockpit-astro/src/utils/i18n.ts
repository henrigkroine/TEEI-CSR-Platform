import enTranslations from '../i18n/en.json';
import ukTranslations from '../i18n/uk.json';
import noTranslations from '../i18n/no.json';

export const SUPPORTED_LOCALES = ['en', 'uk', 'no'] as const;
export type Locale = typeof SUPPORTED_LOCALES[number];

export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  uk: 'Українська',
  no: 'Norsk',
};

const translations: Record<Locale, typeof enTranslations> = {
  en: enTranslations,
  uk: ukTranslations,
  no: noTranslations,
};

export function isValidLocale(locale: string): locale is Locale {
  return SUPPORTED_LOCALES.includes(locale as Locale);
}

export function getLocaleFromUrl(url: URL): Locale {
  const segments = url.pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];

  if (firstSegment && isValidLocale(firstSegment)) {
    return firstSegment;
  }

  return DEFAULT_LOCALE;
}

export function t(locale: Locale, key: string, params?: Record<string, string>): string {
  const keys = key.split('.');
  let value: any = translations[locale];

  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k];
    } else {
      return key; // Return key if translation not found
    }
  }

  if (typeof value === 'string') {
    // Replace placeholders like {name}
    if (params) {
      return value.replace(/\{(\w+)\}/g, (_, paramKey) => params[paramKey] || '');
    }
    return value;
  }

  return key;
}

export function getTranslations(locale: Locale): typeof enTranslations {
  return translations[locale];
}
