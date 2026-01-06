/**
 * WCAG 2.2 AA Contrast Validation Utility
 *
 * Implements the WCAG 2.2 contrast ratio formula to ensure accessibility compliance.
 * Minimum ratio for AA compliance: 4.5:1 for normal text, 3:1 for large text.
 *
 * @see https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
 */

export interface ContrastValidationResult {
  ratio: number;
  isCompliant: boolean;
  isLargeTextCompliant: boolean;
  warning?: string;
}

/**
 * Convert hex color to RGB values
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
 * Calculate relative luminance of a color
 * Formula from WCAG 2.2: https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
function getRelativeLuminance(r: number, g: number, b: number): number {
  const rsRgb = r / 255;
  const gsRgb = g / 255;
  const bsRgb = b / 255;

  const rLinear = rsRgb <= 0.03928 ? rsRgb / 12.92 : Math.pow((rsRgb + 0.055) / 1.055, 2.4);
  const gLinear = gsRgb <= 0.03928 ? gsRgb / 12.92 : Math.pow((gsRgb + 0.055) / 1.055, 2.4);
  const bLinear = bsRgb <= 0.03928 ? bsRgb / 12.92 : Math.pow((bsRgb + 0.055) / 1.055, 2.4);

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculate contrast ratio between two colors
 * Formula: (L1 + 0.05) / (L2 + 0.05) where L1 is the lighter color
 */
export function calculateContrastRatio(color1Hex: string, color2Hex: string): number {
  const rgb1 = hexToRgb(color1Hex);
  const rgb2 = hexToRgb(color2Hex);

  if (!rgb1 || !rgb2) {
    throw new Error(`Invalid hex color: ${color1Hex} or ${color2Hex}`);
  }

  const l1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Validate contrast ratio against WCAG AA standards
 * - Normal text: 4.5:1
 * - Large text (18pt+ or 14pt+ bold): 3:1
 */
export function validateContrast(
  backgroundColor: string,
  textColor: string
): ContrastValidationResult {
  const ratio = calculateContrastRatio(backgroundColor, textColor);

  const isCompliant = ratio >= 4.5;
  const isLargeTextCompliant = ratio >= 3.0;

  let warning: string | undefined;
  if (!isCompliant) {
    if (isLargeTextCompliant) {
      warning = `Contrast ratio ${ratio.toFixed(2)}:1 only meets AA for large text (18pt+ or 14pt+ bold)`;
    } else {
      warning = `Contrast ratio ${ratio.toFixed(2)}:1 fails WCAG AA. Minimum required: 4.5:1`;
    }
  }

  return {
    ratio: parseFloat(ratio.toFixed(2)),
    isCompliant,
    isLargeTextCompliant,
    warning,
  };
}

/**
 * Validate all color combinations in a theme
 */
export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  textOnPrimary: string;
  textOnSecondary: string;
  textOnAccent: string;
}

export interface ThemeContrastValidation {
  isFullyCompliant: boolean;
  validations: {
    primaryText: ContrastValidationResult;
    secondaryText: ContrastValidationResult;
    accentText: ContrastValidationResult;
  };
  warnings: string[];
}

export function validateThemeContrast(colors: ThemeColors): ThemeContrastValidation {
  const primaryText = validateContrast(colors.primary, colors.textOnPrimary);
  const secondaryText = validateContrast(colors.secondary, colors.textOnSecondary);
  const accentText = validateContrast(colors.accent, colors.textOnAccent);

  const warnings: string[] = [];
  if (primaryText.warning) warnings.push(`Primary: ${primaryText.warning}`);
  if (secondaryText.warning) warnings.push(`Secondary: ${secondaryText.warning}`);
  if (accentText.warning) warnings.push(`Accent: ${accentText.warning}`);

  return {
    isFullyCompliant:
      primaryText.isCompliant && secondaryText.isCompliant && accentText.isCompliant,
    validations: {
      primaryText,
      secondaryText,
      accentText,
    },
    warnings,
  };
}

/**
 * Suggest accessible text color (black or white) for a given background
 */
export function suggestTextColor(backgroundColor: string): '#000000' | '#FFFFFF' {
  const whiteRatio = calculateContrastRatio(backgroundColor, '#FFFFFF');
  const blackRatio = calculateContrastRatio(backgroundColor, '#000000');

  return whiteRatio > blackRatio ? '#FFFFFF' : '#000000';
}

/**
 * Validate hex color format
 */
export function isValidHexColor(hex: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(hex);
}
