import enTranslations from '../i18n/en.json';
import ukTranslations from '../i18n/uk.json';
import noTranslations from '../i18n/no.json';

export type Language = 'en' | 'uk' | 'no';

export const languages: Language[] = ['en', 'uk', 'no'];

export const languageNames: Record<Language, string> = {
  en: 'English',
  uk: 'Українська',
  no: 'Norsk',
};

const translations: Record<Language, any> = {
  en: enTranslations,
  uk: ukTranslations,
  no: noTranslations,
};

export function getTranslations(lang: Language = 'en') {
  return translations[lang] || translations.en;
}

export function t(lang: Language, key: string): string {
  const keys = key.split('.');
  let value: any = translations[lang] || translations.en;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Fallback to English if key not found
      value = translations.en;
      for (const fallbackKey of keys) {
        if (value && typeof value === 'object' && fallbackKey in value) {
          value = value[fallbackKey];
        } else {
          return key; // Return key if not found in fallback either
        }
      }
      break;
    }
  }

  return typeof value === 'string' ? value : key;
}

export function detectLanguage(request: Request): Language {
  // Check URL parameter
  const url = new URL(request.url);
  const langParam = url.searchParams.get('lang');
  if (langParam && languages.includes(langParam as Language)) {
    return langParam as Language;
  }

  // Check cookie
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split('; ').map((c) => {
        const [key, ...v] = c.split('=');
        return [key, v.join('=')];
      })
    );
    const langCookie = cookies.lang;
    if (langCookie && languages.includes(langCookie as Language)) {
      return langCookie as Language;
    }
  }

  // Check Accept-Language header
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const preferredLang = acceptLanguage.split(',')[0].split('-')[0].toLowerCase();
    if (languages.includes(preferredLang as Language)) {
      return preferredLang as Language;
    }
  }

  // Default to English
  return 'en';
}
