#!/usr/bin/env node
/**
 * i18n Parity Check
 * Ensures all locale files have the same keys as the base (en.json)
 * Includes RTL layout checks for ar.json and he.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const I18N_DIR = path.join(PROJECT_ROOT, 'apps/corp-cockpit-astro/src/i18n');

interface TranslationFile {
  locale: string;
  filePath: string;
  keys: Set<string>;
  data: Record<string, any>;
}

/**
 * Flatten nested object to dot-notation keys
 */
function flattenKeys(obj: Record<string, any>, prefix: string = ''): string[] {
  const keys: string[] = [];

  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...flattenKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }

  return keys;
}

/**
 * Load and parse translation file
 */
function loadTranslationFile(locale: string): TranslationFile | null {
  const filePath = path.join(I18N_DIR, `${locale}.json`);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Translation file not found: ${filePath}`);
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    const keyList = flattenKeys(data);

    return {
      locale,
      filePath,
      keys: new Set(keyList),
      data,
    };
  } catch (error) {
    console.error(`❌ Failed to parse ${locale}.json:`, error);
    return null;
  }
}

/**
 * Check RTL layout requirements
 */
function checkRTLLayout(locale: string, data: Record<string, any>): {
  hasRTLSupport: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check for direction attribute support
  if (!data.accessibility || !data.accessibility.language) {
    issues.push('Missing accessibility.language key for RTL language switcher');
  }

  // Check for navigation keys that might need RTL layout
  if (data.nav) {
    const navKeys = Object.keys(data.nav);
    if (navKeys.length === 0) {
      issues.push('Empty nav section - RTL layout may not be properly supported');
    }
  }

  // Check for common RTL-sensitive UI elements
  const rtlSensitiveKeys = ['common.next', 'common.previous', 'common.back'];
  for (const key of rtlSensitiveKeys) {
    const parts = key.split('.');
    let obj: any = data;
    let found = true;

    for (const part of parts) {
      if (obj && typeof obj === 'object' && part in obj) {
        obj = obj[part];
      } else {
        found = false;
        break;
      }
    }

    if (!found) {
      issues.push(`Missing RTL-sensitive key: ${key}`);
    }
  }

  return {
    hasRTLSupport: issues.length === 0,
    issues,
  };
}

/**
 * Compare keys between base and target locale
 */
function compareKeys(
  baseFile: TranslationFile,
  targetFile: TranslationFile
): {
  missingKeys: string[];
  extraKeys: string[];
} {
  const missingKeys: string[] = [];
  const extraKeys: string[] = [];

  // Find missing keys (in base but not in target)
  for (const key of baseFile.keys) {
    if (!targetFile.keys.has(key)) {
      missingKeys.push(key);
    }
  }

  // Find extra keys (in target but not in base)
  for (const key of targetFile.keys) {
    if (!baseFile.keys.has(key)) {
      extraKeys.push(key);
    }
  }

  return { missingKeys, extraKeys };
}

/**
 * Main parity check
 */
async function checkI18nParity(): Promise<number> {
  console.log('🔍 Checking i18n parity across all locales...\n');

  // Load base locale (English)
  const baseLocale = 'en';
  const baseFile = loadTranslationFile(baseLocale);

  if (!baseFile) {
    console.error(`❌ Failed to load base locale: ${baseLocale}`);
    return 1;
  }

  console.log(`✅ Loaded base locale: ${baseLocale} (${baseFile.keys.size} keys)\n`);

  // Load all other locales
  const locales = ['uk', 'no', 'ar', 'he'];
  const rtlLocales = ['ar', 'he'];

  let hasErrors = false;
  const results: Record<string, any> = {};

  for (const locale of locales) {
    console.log(`Checking ${locale}.json...`);

    const targetFile = loadTranslationFile(locale);

    if (!targetFile) {
      hasErrors = true;
      continue;
    }

    const { missingKeys, extraKeys } = compareKeys(baseFile, targetFile);

    results[locale] = {
      totalKeys: targetFile.keys.size,
      missingKeys: missingKeys.length,
      extraKeys: extraKeys.length,
      parityPercentage: ((targetFile.keys.size - missingKeys.length) / baseFile.keys.size) * 100,
    };

    // Report missing keys
    if (missingKeys.length > 0) {
      console.log(`  ❌ Missing ${missingKeys.length} keys:`);
      missingKeys.slice(0, 10).forEach((key) => console.log(`     - ${key}`));
      if (missingKeys.length > 10) {
        console.log(`     ... and ${missingKeys.length - 10} more`);
      }
      hasErrors = true;
    }

    // Report extra keys (warning, not error)
    if (extraKeys.length > 0) {
      console.log(`  ⚠️  Extra ${extraKeys.length} keys (not in base):`);
      extraKeys.slice(0, 5).forEach((key) => console.log(`     - ${key}`));
      if (extraKeys.length > 5) {
        console.log(`     ... and ${extraKeys.length - 5} more`);
      }
    }

    // RTL-specific checks
    if (rtlLocales.includes(locale)) {
      const rtlCheck = checkRTLLayout(locale, targetFile.data);
      if (!rtlCheck.hasRTLSupport) {
        console.log(`  ⚠️  RTL layout issues:`);
        rtlCheck.issues.forEach((issue) => console.log(`     - ${issue}`));
      } else {
        console.log(`  ✅ RTL layout checks passed`);
      }
    }

    if (missingKeys.length === 0 && extraKeys.length === 0) {
      console.log(`  ✅ Perfect parity (100%)`);
    } else {
      console.log(`  📊 Parity: ${results[locale].parityPercentage.toFixed(2)}%`);
    }

    console.log('');
  }

  // Summary
  console.log('━'.repeat(60));
  console.log('📊 Summary\n');

  console.log(`Base locale (${baseLocale}): ${baseFile.keys.size} keys\n`);

  for (const locale of locales) {
    if (results[locale]) {
      const { totalKeys, missingKeys, extraKeys, parityPercentage } = results[locale];
      const status = missingKeys === 0 ? '✅' : '❌';
      console.log(`${status} ${locale}: ${totalKeys} keys (${parityPercentage.toFixed(2)}% parity)`);
      if (missingKeys > 0) {
        console.log(`   Missing: ${missingKeys} keys`);
      }
      if (extraKeys > 0) {
        console.log(`   Extra: ${extraKeys} keys`);
      }
    }
  }

  console.log('');
  console.log('━'.repeat(60));

  if (hasErrors) {
    console.log('❌ i18n parity check FAILED - fix missing keys before merging\n');
    return 1;
  } else {
    console.log('✅ i18n parity check PASSED - all locales have complete translations\n');
    return 0;
  }
}

// Run the check
checkI18nParity()
  .then((exitCode) => {
    process.exit(exitCode);
  })
  .catch((error) => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
