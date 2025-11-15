#!/usr/bin/env tsx
/**
 * Dark Mode Contrast Validation Script
 *
 * Validates that all dark theme colors meet WCAG AA contrast requirements.
 * Checks text/background pairs and chart colors for accessibility compliance.
 *
 * Exit codes:
 * - 0: All colors pass WCAG AA
 * - 1: Some colors fail WCAG AA
 *
 * Usage:
 *   pnpm tsx scripts/validateDarkModeContrast.ts
 *   npm run validate:dark-mode
 */

import { DARK_THEME_PRESETS } from '../apps/corp-cockpit-astro/src/lib/themes/darkTokens';
import { THEME_PRESETS } from '../apps/corp-cockpit-astro/src/lib/themes/presets';

// WCAG 2.0 contrast ratio thresholds
const WCAG_AA_NORMAL_TEXT = 4.5;
const WCAG_AA_LARGE_TEXT = 3.0;
const WCAG_AAA_NORMAL_TEXT = 7.0;
const WCAG_AAA_LARGE_TEXT = 4.5;
const WCAG_AA_NON_TEXT = 3.0; // WCAG 2.1 SC 1.4.11 (for borders, icons, etc.)

interface ValidationResult {
  pair: string;
  foreground: string;
  background: string;
  contrast: number;
  passed: boolean;
  level: 'AA' | 'AAA' | 'FAIL';
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate relative luminance
 * https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((val) => {
    val /= 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 * https://www.w3.org/TR/WCAG20/#contrast-ratiodef
 */
function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) {
    throw new Error(`Invalid color format: ${color1} or ${color2}`);
  }

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Validate a color pair
 */
function validateColorPair(
  pairName: string,
  foreground: string,
  background: string,
  isLargeText: boolean = false,
  isNonText: boolean = false
): ValidationResult {
  const contrast = getContrastRatio(foreground, background);

  // Use appropriate threshold based on content type
  let threshold: number;
  let aaaThreshold: number;

  if (isNonText) {
    // WCAG 2.1 SC 1.4.11 Non-text Contrast
    threshold = WCAG_AA_NON_TEXT;
    aaaThreshold = WCAG_AA_NON_TEXT; // No AAA level for non-text
  } else if (isLargeText) {
    threshold = WCAG_AA_LARGE_TEXT;
    aaaThreshold = WCAG_AAA_LARGE_TEXT;
  } else {
    threshold = WCAG_AA_NORMAL_TEXT;
    aaaThreshold = WCAG_AAA_NORMAL_TEXT;
  }

  let level: 'AA' | 'AAA' | 'FAIL';
  if (contrast >= aaaThreshold) {
    level = 'AAA';
  } else if (contrast >= threshold) {
    level = 'AA';
  } else {
    level = 'FAIL';
  }

  return {
    pair: pairName,
    foreground,
    background,
    contrast: Math.round(contrast * 100) / 100,
    passed: contrast >= threshold,
    level,
  };
}

/**
 * Validate all dark theme presets
 */
function validateDarkThemes(): {
  results: ValidationResult[];
  passed: boolean;
} {
  const results: ValidationResult[] = [];

  DARK_THEME_PRESETS.forEach((darkPreset) => {
    const lightPreset = THEME_PRESETS.find((p) => p.id === darkPreset.id);
    const presetName = lightPreset?.name || darkPreset.id;

    console.log(`\n🎨 Validating: ${presetName} (Dark Mode)`);
    console.log('━'.repeat(60));

    const { colors } = darkPreset;

    // Validate primary text/background pairs
    const pairs = [
      {
        name: `${presetName} - Primary on Background`,
        fg: colors.primary,
        bg: colors.background,
      },
      {
        name: `${presetName} - Text on Background`,
        fg: colors.text,
        bg: colors.background,
      },
      {
        name: `${presetName} - Text Secondary on Background`,
        fg: colors.textSecondary,
        bg: colors.background,
      },
      {
        name: `${presetName} - Primary Text on Primary`,
        fg: colors.primaryText,
        bg: colors.primary,
      },
      {
        name: `${presetName} - Secondary on Background`,
        fg: colors.secondary,
        bg: colors.background,
      },
      {
        name: `${presetName} - Secondary Text on Secondary`,
        fg: colors.secondaryText,
        bg: colors.secondary,
      },
      {
        name: `${presetName} - Accent on Background`,
        fg: colors.accent,
        bg: colors.background,
      },
      {
        name: `${presetName} - Accent Text on Accent`,
        fg: colors.accentText,
        bg: colors.accent,
      },
      {
        name: `${presetName} - Text on Surface`,
        fg: colors.text,
        bg: colors.surface,
      },
      {
        name: `${presetName} - Success on Background`,
        fg: colors.success,
        bg: colors.background,
      },
      {
        name: `${presetName} - Warning on Background`,
        fg: colors.warning,
        bg: colors.background,
      },
      {
        name: `${presetName} - Error on Background`,
        fg: colors.error,
        bg: colors.background,
      },
      {
        name: `${presetName} - Border on Background`,
        fg: colors.border,
        bg: colors.background,
        isNonText: true, // Borders are non-text elements
      },
    ];

    pairs.forEach((pair) => {
      const result = validateColorPair(
        pair.name,
        pair.fg,
        pair.bg,
        false,
        (pair as any).isNonText || false
      );
      results.push(result);

      const icon = result.passed ? '✓' : '✗';
      const color = result.passed ? '\x1b[32m' : '\x1b[31m';
      const reset = '\x1b[0m';
      const levelBadge = `[${result.level}]`;

      console.log(
        `${color}${icon}${reset} ${pair.name.split(' - ')[1]}: ${result.contrast}:1 ${levelBadge}`
      );
    });
  });

  const passed = results.every((r) => r.passed);
  return { results, passed };
}

/**
 * Validate chart colors
 */
function validateChartColors(): {
  results: ValidationResult[];
  passed: boolean;
} {
  const results: ValidationResult[] = [];

  console.log(`\n📊 Validating: Chart Colors (Dark Mode)`);
  console.log('━'.repeat(60));

  const darkChartColors = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#F97316', // Orange
    '#6366F1', // Indigo
    '#84CC16', // Lime
  ];

  const darkBackground = '#0F172A';

  darkChartColors.forEach((color, index) => {
    const result = validateColorPair(
      `Chart Color ${index + 1}`,
      color,
      darkBackground,
      true // Chart elements are often large
    );
    results.push(result);

    const icon = result.passed ? '✓' : '✗';
    const colorCode = result.passed ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';

    console.log(
      `${colorCode}${icon}${reset} Color ${index + 1} (${color}): ${result.contrast}:1 [${result.level}]`
    );
  });

  const passed = results.every((r) => r.passed);
  return { results, passed };
}

/**
 * Print summary
 */
function printSummary(
  themeResults: ValidationResult[],
  chartResults: ValidationResult[]
): void {
  const allResults = [...themeResults, ...chartResults];
  const totalTests = allResults.length;
  const passedTests = allResults.filter((r) => r.passed).length;
  const failedTests = totalTests - passedTests;
  const aaaTests = allResults.filter((r) => r.level === 'AAA').length;

  console.log('\n' + '═'.repeat(60));
  console.log('📋 VALIDATION SUMMARY');
  console.log('═'.repeat(60));
  console.log(`Total tests: ${totalTests}`);
  console.log(`✓ Passed (AA): ${passedTests} (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log(`✓ Passed (AAA): ${aaaTests} (${Math.round((aaaTests / totalTests) * 100)}%)`);

  if (failedTests > 0) {
    console.log(`\x1b[31m✗ Failed: ${failedTests} (${Math.round((failedTests / totalTests) * 100)}%)\x1b[0m`);
    console.log('\n⚠️  FAILED COLOR PAIRS:');
    console.log('━'.repeat(60));

    allResults
      .filter((r) => !r.passed)
      .forEach((r) => {
        // Determine required threshold based on pair type
        const isBorder = r.pair.includes('Border');
        const requiredContrast = isBorder ? WCAG_AA_NON_TEXT : WCAG_AA_NORMAL_TEXT;

        console.log(`  ${r.pair}`);
        console.log(`    Foreground: ${r.foreground}`);
        console.log(`    Background: ${r.background}`);
        console.log(`    Contrast: ${r.contrast}:1 (Required: ${requiredContrast}:1 ${isBorder ? '[Non-text]' : '[Text]'})`);
      });
  } else {
    console.log('\x1b[32m✓ All tests passed!\x1b[0m');
  }

  console.log('═'.repeat(60));
}

/**
 * Main execution
 */
function main(): void {
  console.log('\n🔍 WCAG AA Contrast Validation for Dark Mode Themes\n');

  const { results: themeResults, passed: themesPassed } = validateDarkThemes();
  const { results: chartResults, passed: chartsPassed } = validateChartColors();

  printSummary(themeResults, chartResults);

  if (!themesPassed || !chartsPassed) {
    console.log('\n\x1b[31m❌ Validation failed! Some colors do not meet WCAG AA standards.\x1b[0m\n');
    process.exit(1);
  } else {
    console.log('\n\x1b[32m✅ All colors meet WCAG AA standards!\x1b[0m\n');
    process.exit(0);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  getContrastRatio,
  validateColorPair,
  validateDarkThemes,
  validateChartColors,
};
