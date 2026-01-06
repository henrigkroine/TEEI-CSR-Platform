---
id: 28
key: internationalization
name: Internationalization (i18n)
category: Platform
status: production
lastReviewed: 2025-01-27
---

# Internationalization (i18n)

## 1. Summary

- Multi-language support enabling platform localization for different regions and languages.
- Features language switching, RTL (Right-to-Left) support for Arabic and Hebrew, and locale-specific formatting.
- Supports multiple languages: English (EN), Ukrainian (UK), Norwegian (NO), Arabic (AR), and Hebrew (HE).
- Used by all users for localized platform experience in their preferred language.

## 2. Current Status

- Overall status: `production`

- Fully implemented i18n support in Corporate Cockpit with i18n files (`apps/corp-cockpit-astro/src/i18n/` with `en.json`, `uk.json`, `no.json`, `ar.json`, `he.json`), locale-specific files (`en/`, `uk/`, `no/`), and language switcher component (`apps/corp-cockpit-astro/src/components/LanguageSwitcher.tsx`). Core features include language switching, RTL support for Arabic and Hebrew, locale-specific formatting, and multi-language routing. Documentation includes `docs/i18n/` with comprehensive i18n documentation.

- Multi-language support enables platform localization for global users with proper formatting and RTL support.

## 3. What's Next

- Add more languages (Spanish, French, German).
- Enhance locale-specific formatting (dates, numbers, currency).
- Implement language detection from browser settings.
- Add translation management UI for content updates.

## 4. Code & Files

Backend / services:
- No backend service (frontend-only feature)

Frontend / UI:
- `apps/corp-cockpit-astro/src/i18n/` - i18n files
  - `en.json`, `uk.json`, `no.json`, `ar.json`, `he.json`
  - Locale-specific files (`en/`, `uk/`, `no/`)
- `apps/corp-cockpit-astro/src/components/LanguageSwitcher.tsx` - Language switcher

Shared / schema / docs:
- `docs/i18n/` - i18n documentation

## 5. Dependencies

Consumes:
- i18n libraries for translation management
- Locale data for formatting
- RTL CSS for right-to-left languages

Provides:
- Localized interface for global users
- Multi-language support for international markets
- RTL support for Arabic and Hebrew users

## 6. Notes

- Language switching provides seamless transition between languages.
- RTL support ensures proper layout for Arabic and Hebrew languages.
- Locale-specific formatting ensures dates, numbers, and currency display correctly.
- Multi-language routing enables language-specific URLs.
- Translation files are organized by locale for easy maintenance.



