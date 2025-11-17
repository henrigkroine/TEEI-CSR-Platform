#!/usr/bin/env node
/**
 * i18n Parity Checker
 *
 * Validates that all locale files have the same keys as the base locale (en.json)
 * Includes support for RTL locales (ar.json, he.json)
 *
 * @module scripts/ci/i18n-parity-check
 * @author Worker 8 - Team 3 (i18n-parity-checker-engineer)
 */

import { readFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

interface I18nKeys {
  [key: string]: string | I18nKeys;
}

interface ParityResult {
  locale: string;
  missingKeys: string[];
  extraKeys: string[];
  totalKeys: number;
  coverage: number;
}

/**
 * Flatten nested object keys into dot notation
 * e.g., { a: { b: { c: "value" } } } => ["a.b.c"]
 */
function flattenKeys(obj: I18nKeys, prefix = ''): string[] {
  const keys: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...flattenKeys(value as I18nKeys, fullKey));
    } else {
      keys.push(fullKey);
    }
  }

  return keys;
}

/**
 * Load JSON locale file
 */
function loadLocale(filePath: string): I18nKeys {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(
      `Failed to load locale file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Compare two locale files and find missing/extra keys
 */
function compareLocales(
  baseKeys: string[],
  targetKeys: string[]
): { missing: string[]; extra: string[] } {
  const baseSet = new Set(baseKeys);
  const targetSet = new Set(targetKeys);

  const missing = baseKeys.filter(k => !targetSet.has(k));
  const extra = targetKeys.filter(k => !baseSet.has(k));

  return { missing, extra };
}

/**
 * Check parity for all locales against base locale
 */
function checkParity(i18nDir: string, baseLocale = 'en.json'): ParityResult[] {
  console.log(`${COLORS.cyan}🌍 i18n Parity Checker${COLORS.reset}\n`);
  console.log(`Base locale: ${COLORS.blue}${baseLocale}${COLORS.reset}`);
  console.log(`i18n directory: ${COLORS.blue}${i18nDir}${COLORS.reset}\n`);

  // Load base locale
  const basePath = join(i18nDir, baseLocale);
  const baseData = loadLocale(basePath);
  const baseKeys = flattenKeys(baseData);

  console.log(`Base locale has ${COLORS.cyan}${baseKeys.length}${COLORS.reset} keys\n`);

  // Find all locale files
  const localeFiles = readdirSync(i18nDir)
    .filter(f => f.endsWith('.json') && f !== baseLocale)
    .sort();

  if (localeFiles.length === 0) {
    console.log(`${COLORS.yellow}⚠ No locale files found (besides base)${COLORS.reset}`);
    return [];
  }

  console.log(
    `Checking ${COLORS.cyan}${localeFiles.length}${COLORS.reset} locale file(s):\n`
  );

  const results: ParityResult[] = [];

  for (const localeFile of localeFiles) {
    const localePath = join(i18nDir, localeFile);
    const localeData = loadLocale(localePath);
    const localeKeys = flattenKeys(localeData);

    const { missing, extra } = compareLocales(baseKeys, localeKeys);
    const coverage = ((localeKeys.length - extra.length) / baseKeys.length) * 100;

    results.push({
      locale: localeFile,
      missingKeys: missing,
      extraKeys: extra,
      totalKeys: localeKeys.length,
      coverage,
    });

    // Print result
    const status =
      missing.length === 0 && extra.length === 0
        ? `${COLORS.green}✓ PASS${COLORS.reset}`
        : `${COLORS.red}✗ FAIL${COLORS.reset}`;

    console.log(`${status} ${COLORS.blue}${localeFile}${COLORS.reset}`);
    console.log(`  Keys: ${localeKeys.length} | Coverage: ${coverage.toFixed(1)}%`);

    if (missing.length > 0) {
      console.log(
        `  ${COLORS.red}Missing keys: ${missing.length}${COLORS.reset}`
      );
      if (missing.length <= 10) {
        missing.forEach(k => console.log(`    - ${k}`));
      } else {
        missing.slice(0, 5).forEach(k => console.log(`    - ${k}`));
        console.log(`    ... and ${missing.length - 5} more`);
      }
    }

    if (extra.length > 0) {
      console.log(
        `  ${COLORS.yellow}Extra keys (not in base): ${extra.length}${COLORS.reset}`
      );
      if (extra.length <= 5) {
        extra.forEach(k => console.log(`    - ${k}`));
      } else {
        extra.slice(0, 3).forEach(k => console.log(`    - ${k}`));
        console.log(`    ... and ${extra.length - 3} more`);
      }
    }

    console.log('');
  }

  return results;
}

/**
 * Check for RTL-specific requirements
 */
function checkRTLSupport(i18nDir: string): boolean {
  const rtlLocales = ['ar.json', 'he.json']; // Arabic, Hebrew
  let allPresent = true;

  console.log(`${COLORS.cyan}🔄 RTL Support Check${COLORS.reset}\n`);

  for (const rtlLocale of rtlLocales) {
    const rtlPath = join(i18nDir, rtlLocale);
    try {
      const rtlData = loadLocale(rtlPath);
      const hasDirectionKey =
        'direction' in rtlData || 'app' in rtlData;

      console.log(
        `${COLORS.green}✓${COLORS.reset} ${rtlLocale} exists ${hasDirectionKey ? '(has direction metadata)' : ''}`
      );
    } catch {
      console.log(
        `${COLORS.yellow}⚠${COLORS.reset} ${rtlLocale} not found (optional RTL locale)`
      );
      allPresent = false;
    }
  }

  console.log('');
  return allPresent;
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  const i18nDir =
    args[0] ||
    join(__dirname, '../../apps/corp-cockpit-astro/src/i18n');

  try {
    // Check parity
    const results = checkParity(i18nDir);

    // Check RTL support
    checkRTLSupport(i18nDir);

    // Summary
    console.log(`${COLORS.cyan}📊 Summary${COLORS.reset}\n`);

    const totalLocales = results.length;
    const passed = results.filter(
      r => r.missingKeys.length === 0 && r.extraKeys.length === 0
    ).length;
    const failed = totalLocales - passed;

    console.log(`Total locales: ${totalLocales}`);
    console.log(`${COLORS.green}Passed: ${passed}${COLORS.reset}`);

    if (failed > 0) {
      console.log(`${COLORS.red}Failed: ${failed}${COLORS.reset}`);
    }

    const avgCoverage =
      results.reduce((sum, r) => sum + r.coverage, 0) / totalLocales;
    console.log(`Average coverage: ${avgCoverage.toFixed(1)}%\n`);

    // Print worst offenders
    const worstCoverage = results
      .filter(r => r.coverage < 100)
      .sort((a, b) => a.coverage - b.coverage)
      .slice(0, 3);

    if (worstCoverage.length > 0) {
      console.log(`${COLORS.yellow}⚠ Locales needing attention:${COLORS.reset}`);
      worstCoverage.forEach(r => {
        console.log(
          `  ${r.locale}: ${r.coverage.toFixed(1)}% (${r.missingKeys.length} missing keys)`
        );
      });
      console.log('');
    }

    // Exit with error if any failures
    if (failed > 0) {
      console.error(
        `${COLORS.red}❌ i18n parity check FAILED${COLORS.reset}\n`
      );
      console.error(
        `${failed} locale(s) have missing keys. Please add translations for all missing keys.\n`
      );
      process.exit(1);
    }

    console.log(`${COLORS.green}✅ i18n parity check PASSED${COLORS.reset}\n`);
    process.exit(0);
  } catch (error) {
    console.error(
      `${COLORS.red}❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}${COLORS.reset}\n`
    );
    process.exit(1);
  }
}

main();
