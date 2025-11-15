#!/usr/bin/env node

/**
 * Contrast Ratio Validator
 *
 * Validates that all theme color combinations meet WCAG AA standards:
 * - Normal text: 4.5:1
 * - Large text (18pt+ or 14pt+ bold): 3:1
 * - UI components/borders: 3:1
 *
 * Usage:
 *   node scripts/check-contrast.js
 */

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex) {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Handle shorthand hex (e.g., #FFF)
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }

  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return null;
  }

  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  };
}

/**
 * Calculate relative luminance according to WCAG 2.2
 */
function getRelativeLuminance(rgb) {
  if (!rgb) return null;

  const rsRGB = rgb.r / 255;
  const gsRGB = rgb.g / 255;
  const bsRGB = rgb.b / 255;

  const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors
 */
function calculateContrastRatio(color1, color2) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) {
    return null;
  }

  const lum1 = getRelativeLuminance(rgb1);
  const lum2 = getRelativeLuminance(rgb2);

  if (lum1 === null || lum2 === null) {
    return null;
  }

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Color palette for light mode
 * WCAG AA compliant (4.5:1 for text, 3:1 for UI components)
 */
const LIGHT_COLORS = {
  // Backgrounds
  'bg-primary': '#ffffff',
  'bg-secondary': '#f9fafb',
  'bg-tertiary': '#f3f4f6',

  // Text
  'text-primary': '#111827',
  'text-secondary': '#6b7280',
  'text-tertiary': '#6b7280',  // Updated for better contrast

  // Borders
  'border': '#6b7280',  // Even darker for better contrast (3:1)
  'border-hover': '#4b5563',  // Very dark on hover

  // Interactive
  'primary': '#2563eb',  // Darker blue for better contrast
  'primary-hover': '#1d4ed8',  // Even darker on hover
  'accent': '#047857',  // Much darker green for better contrast (4.5:1)
  'accent-hover': '#065f46',  // Even darker on hover
  'warning': '#b45309',  // Much darker amber for better contrast (4.5:1)
  'error': '#dc2626',  // Dark red for better contrast
};

/**
 * Color palette for dark mode
 * WCAG AA compliant (4.5:1 for text, 3:1 for UI components)
 */
const DARK_COLORS = {
  // Backgrounds
  'bg-primary': '#111827',
  'bg-secondary': '#1f2937',
  'bg-tertiary': '#374151',

  // Text
  'text-primary': '#f9fafb',
  'text-secondary': '#d1d5db',
  'text-tertiary': '#d1d5db',  // Better contrast for tertiary text

  // Borders
  'border': '#6b7280',  // Lighter but visible borders in dark mode (3:1)
  'border-hover': '#9ca3af',  // Even lighter on hover

  // Interactive
  'primary': '#60a5fa',  // Light blue for dark backgrounds
  'primary-hover': '#3b82f6',  // Darker blue on hover
  'accent': '#34d399',  // Light green for dark backgrounds
  'accent-hover': '#10b981',  // Darker green on hover
  'warning': '#fbbf24',  // Light amber for dark backgrounds
  'error': '#f87171',  // Light red for dark backgrounds
};

/**
 * Test cases: [foreground, background, minRatio, description]
 */
function generateTestCases(colors) {
  return [
    [colors['text-primary'], colors['bg-primary'], 4.5, 'Text primary on bg primary'],
    [colors['text-primary'], colors['bg-secondary'], 4.5, 'Text primary on bg secondary'],
    [colors['text-secondary'], colors['bg-primary'], 4.5, 'Text secondary on bg primary'],
    [colors['text-secondary'], colors['bg-secondary'], 4.5, 'Text secondary on bg secondary'],
    [colors['text-tertiary'], colors['bg-primary'], 3.0, 'Text tertiary on bg primary (large text)'],
    [colors['primary'], colors['bg-primary'], 4.5, 'Primary color on bg primary'],
    [colors['primary-hover'], colors['bg-primary'], 4.5, 'Primary hover on bg primary'],
    [colors['accent'], colors['bg-primary'], 4.5, 'Accent on bg primary'],
    [colors['accent-hover'], colors['bg-primary'], 4.5, 'Accent hover on bg primary'],
    [colors['warning'], colors['bg-primary'], 4.5, 'Warning on bg primary'],
    [colors['error'], colors['bg-primary'], 4.5, 'Error on bg primary'],
    [colors['border'], colors['bg-primary'], 3.0, 'Border on bg primary (UI component)'],
    [colors['border-hover'], colors['bg-primary'], 3.0, 'Border hover on bg primary (UI component)'],
  ];
}

/**
 * Run contrast validation
 */
function validateContrast() {
  console.log('\n📊 Dark Mode Contrast Validation Report\n');
  console.log('='.repeat(70));

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  const failures = [];

  // Test light mode
  console.log('\n☀️  LIGHT MODE\n');
  const lightTests = generateTestCases(LIGHT_COLORS);

  lightTests.forEach(([foreground, background, minRatio, description]) => {
    totalTests++;
    const ratio = calculateContrastRatio(foreground, background);

    if (ratio === null) {
      console.log(`❌ ${description}`);
      console.log(`   Invalid color format\n`);
      failedTests++;
      failures.push({ mode: 'light', test: description, reason: 'Invalid colors' });
      return;
    }

    const passes = ratio >= minRatio;
    const icon = passes ? '✅' : '❌';
    const status = passes ? 'PASS' : 'FAIL';
    const level = minRatio >= 4.5 ? 'AA' : 'UI';

    console.log(`${icon} ${description}: ${ratio.toFixed(2)}:1 (min: ${minRatio}:1 ${level})`);

    if (passes) {
      passedTests++;
    } else {
      failedTests++;
      failures.push({
        mode: 'light',
        test: description,
        actual: ratio.toFixed(2),
        required: minRatio.toFixed(1)
      });
    }
  });

  // Test dark mode
  console.log('\n🌙 DARK MODE\n');
  const darkTests = generateTestCases(DARK_COLORS);

  darkTests.forEach(([foreground, background, minRatio, description]) => {
    totalTests++;
    const ratio = calculateContrastRatio(foreground, background);

    if (ratio === null) {
      console.log(`❌ ${description}`);
      console.log(`   Invalid color format\n`);
      failedTests++;
      failures.push({ mode: 'dark', test: description, reason: 'Invalid colors' });
      return;
    }

    const passes = ratio >= minRatio;
    const icon = passes ? '✅' : '❌';
    const level = minRatio >= 4.5 ? 'AA' : 'UI';

    console.log(`${icon} ${description}: ${ratio.toFixed(2)}:1 (min: ${minRatio}:1 ${level})`);

    if (passes) {
      passedTests++;
    } else {
      failedTests++;
      failures.push({
        mode: 'dark',
        test: description,
        actual: ratio.toFixed(2),
        required: minRatio.toFixed(1)
      });
    }
  });

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('\n📈 Summary\n');
  console.log(`Total tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (failedTests > 0) {
    console.log('\n⚠️  Failed Tests:\n');
    failures.forEach(failure => {
      if (failure.reason) {
        console.log(`[${failure.mode}] ${failure.test}`);
        console.log(`  Reason: ${failure.reason}\n`);
      } else {
        console.log(`[${failure.mode}] ${failure.test}`);
        console.log(`  Got: ${failure.actual}:1, Required: ${failure.required}:1\n`);
      }
    });
  }

  console.log('='.repeat(70) + '\n');

  // Exit with appropriate code
  process.exit(failedTests > 0 ? 1 : 0);
}

// Run validation
validateContrast();
