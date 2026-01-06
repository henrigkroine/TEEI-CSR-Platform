/**
 * Theme Validator Utility
 * Validates whitelabel theme configurations for WCAG 2.2 AA compliance
 *
 * WCAG 2.2 AA Requirements:
 * - Normal text (< 18pt): minimum contrast ratio 4.5:1
 * - Large text (>= 18pt or >= 14pt bold): minimum contrast ratio 3:1
 * - Graphical objects and UI components: minimum contrast ratio 3:1
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface LogoDimensions {
  width: number;
  height: number;
}

export interface FontConfig {
  sizes: {
    body?: number;
    heading?: number;
    small?: number;
  };
  weights: {
    normal?: number;
    bold?: number;
  };
  families: {
    primary?: string;
    heading?: string;
  };
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  foreground: string;
  [key: string]: string;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Handle shorthand hex (e.g., #FFF)
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }

  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Calculate relative luminance according to WCAG 2.2 guidelines
 * https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
function getRelativeLuminance(rgb: { r: number; g: number; b: number }): number {
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
 * According to WCAG 2.2: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
 */
export function calculateContrastRatio(color1: string, color2: string): number | null {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) {
    return null;
  }

  const lum1 = getRelativeLuminance(rgb1);
  const lum2 = getRelativeLuminance(rgb2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Validate logo contrast against background
 * WCAG AA minimum: 4.5:1 for normal text, 3:1 for large text and UI components
 */
export function validateLogoContrast(
  logoPrimaryColor: string,
  backgroundColor: string,
  options: { isLargeGraphic?: boolean } = {}
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const ratio = calculateContrastRatio(logoPrimaryColor, backgroundColor);

  if (ratio === null) {
    errors.push('Invalid color format. Please use hex colors (e.g., #FFFFFF)');
    return { valid: false, errors, warnings };
  }

  const minRatio = options.isLargeGraphic ? 3.0 : 4.5;
  const level = options.isLargeGraphic ? 'UI component' : 'graphical object';

  if (ratio < minRatio) {
    errors.push(
      `Logo contrast ratio ${ratio.toFixed(2)}:1 is below WCAG AA minimum of ${minRatio}:1 for ${level}`
    );
  } else if (ratio < minRatio + 0.5) {
    warnings.push(
      `Logo contrast ratio ${ratio.toFixed(2)}:1 is close to minimum threshold. Consider increasing contrast for better accessibility.`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate logo size constraints
 * Minimum: 200x200px for proper rendering
 * Maximum: 2000x2000px to prevent performance issues
 */
export function validateLogoSize(dimensions: LogoDimensions): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const MIN_SIZE = 200;
  const MAX_SIZE = 2000;
  const RECOMMENDED_MIN = 400;

  if (dimensions.width < MIN_SIZE || dimensions.height < MIN_SIZE) {
    errors.push(
      `Logo dimensions ${dimensions.width}x${dimensions.height}px are below minimum ${MIN_SIZE}x${MIN_SIZE}px`
    );
  } else if (dimensions.width < RECOMMENDED_MIN || dimensions.height < RECOMMENDED_MIN) {
    warnings.push(
      `Logo dimensions ${dimensions.width}x${dimensions.height}px are below recommended ${RECOMMENDED_MIN}x${RECOMMENDED_MIN}px for optimal quality`
    );
  }

  if (dimensions.width > MAX_SIZE || dimensions.height > MAX_SIZE) {
    errors.push(
      `Logo dimensions ${dimensions.width}x${dimensions.height}px exceed maximum ${MAX_SIZE}x${MAX_SIZE}px`
    );
  }

  // Check aspect ratio - warn if extremely non-square
  const aspectRatio = dimensions.width / dimensions.height;
  if (aspectRatio > 3 || aspectRatio < 0.33) {
    warnings.push(
      `Logo aspect ratio ${aspectRatio.toFixed(2)}:1 is very elongated. Consider a more balanced ratio for better adaptability.`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate color contrast for text on backgrounds
 * WCAG AA: 4.5:1 for normal text, 3:1 for large text (18pt+ or 14pt+ bold)
 */
export function validateColorContrast(
  foreground: string,
  background: string,
  options: { isLargeText?: boolean; fontSize?: number; isBold?: boolean } = {}
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const ratio = calculateContrastRatio(foreground, background);

  if (ratio === null) {
    errors.push('Invalid color format. Please use hex colors (e.g., #FFFFFF)');
    return { valid: false, errors, warnings };
  }

  // Determine if text is considered "large" by WCAG standards
  const isLarge = options.isLargeText ||
    (options.fontSize && options.fontSize >= 18) ||
    (options.fontSize && options.fontSize >= 14 && options.isBold);

  const minRatioAA = isLarge ? 3.0 : 4.5;
  const minRatioAAA = isLarge ? 4.5 : 7.0;

  if (ratio < minRatioAA) {
    errors.push(
      `Contrast ratio ${ratio.toFixed(2)}:1 is below WCAG AA minimum of ${minRatioAA}:1 for ${isLarge ? 'large' : 'normal'} text`
    );
  } else if (ratio < minRatioAAA) {
    warnings.push(
      `Contrast ratio ${ratio.toFixed(2)}:1 meets WCAG AA but not AAA (${minRatioAAA}:1). Consider increasing contrast for enhanced accessibility.`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate typography configuration for readability
 */
export function validateTypography(fontConfig: FontConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate font sizes
  if (fontConfig.sizes) {
    const { body, heading, small } = fontConfig.sizes;

    if (body && body < 14) {
      errors.push(`Body font size ${body}px is below minimum 14px for readability`);
    } else if (body && body < 16) {
      warnings.push(`Body font size ${body}px is below recommended 16px for optimal readability`);
    }

    if (small && small < 12) {
      warnings.push(`Small font size ${small}px is below 12px and may be difficult to read`);
    }

    if (heading && body && heading < body) {
      warnings.push(`Heading font size ${heading}px should be larger than body font size ${body}px`);
    }
  }

  // Validate font weights
  if (fontConfig.weights) {
    const { normal, bold } = fontConfig.weights;

    if (normal && normal < 300) {
      warnings.push(`Normal font weight ${normal} is very light and may be difficult to read`);
    }

    if (normal && bold && bold <= normal) {
      warnings.push(`Bold font weight ${bold} should be heavier than normal weight ${normal}`);
    }
  }

  // Validate font families
  if (fontConfig.families) {
    const { primary, heading } = fontConfig.families;

    if (primary && !primary.includes('sans-serif') && !primary.includes('serif')) {
      warnings.push(`Primary font family "${primary}" should include a fallback (sans-serif or serif)`);
    }

    if (heading && !heading.includes('sans-serif') && !heading.includes('serif')) {
      warnings.push(`Heading font family "${heading}" should include a fallback (sans-serif or serif)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate complete theme configuration
 */
export function validateTheme(theme: {
  colors: ThemeColors;
  logo: { dimensions: LogoDimensions; primaryColor: string };
  typography: FontConfig;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate logo
  const logoSizeResult = validateLogoSize(theme.logo.dimensions);
  errors.push(...logoSizeResult.errors);
  warnings.push(...logoSizeResult.warnings);

  const logoContrastResult = validateLogoContrast(
    theme.logo.primaryColor,
    theme.colors.background,
    { isLargeGraphic: true }
  );
  errors.push(...logoContrastResult.errors);
  warnings.push(...logoContrastResult.warnings);

  // Validate primary color contrasts
  const primaryOnBgResult = validateColorContrast(
    theme.colors.primary,
    theme.colors.background
  );
  errors.push(...primaryOnBgResult.errors);
  warnings.push(...primaryOnBgResult.warnings);

  const fgOnBgResult = validateColorContrast(
    theme.colors.foreground,
    theme.colors.background
  );
  errors.push(...fgOnBgResult.errors);
  warnings.push(...fgOnBgResult.warnings);

  // Validate typography
  const typographyResult = validateTypography(theme.typography);
  errors.push(...typographyResult.errors);
  warnings.push(...typographyResult.warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Generate theme validation report
 */
export function generateValidationReport(result: ValidationResult): string {
  const lines: string[] = [];

  lines.push('=== Theme Validation Report ===\n');

  if (result.valid) {
    lines.push('✅ PASSED: Theme meets WCAG 2.2 AA requirements\n');
  } else {
    lines.push('❌ FAILED: Theme does not meet WCAG 2.2 AA requirements\n');
  }

  if (result.errors.length > 0) {
    lines.push('\nErrors (Must Fix):');
    result.errors.forEach((error, i) => {
      lines.push(`  ${i + 1}. ${error}`);
    });
  }

  if (result.warnings.length > 0) {
    lines.push('\nWarnings (Recommended):');
    result.warnings.forEach((warning, i) => {
      lines.push(`  ${i + 1}. ${warning}`);
    });
  }

  return lines.join('\n');
}
