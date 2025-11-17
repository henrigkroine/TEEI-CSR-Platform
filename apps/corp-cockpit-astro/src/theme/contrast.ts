/**
 * WCAG Contrast Validation Utility
 *
 * Implements WCAG 2.1 contrast ratio calculation and validation.
 * https://www.w3.org/TR/WCAG21/#contrast-minimum
 *
 * @module theme/contrast
 */

export interface ContrastResult {
  ratio: number;
  level: 'AAA' | 'AA' | 'AA_LARGE' | 'FAIL';
  passes: {
    normalTextAA: boolean; // 4.5:1
    normalTextAAA: boolean; // 7:1
    largeTextAA: boolean; // 3:1
    largeTextAAA: boolean; // 4.5:1
  };
  foreground: string;
  background: string;
}

/**
 * Parse color string to RGB values
 * Supports hex, rgb(), rgba(), hsl(), hsla()
 */
function parseColor(color: string): { r: number; g: number; b: number } | null {
  // Hex format
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    let r: number, g: number, b: number;

    if (hex.length === 3) {
      // Short hex (#RGB)
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
      // Full hex (#RRGGBB)
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    } else {
      return null;
    }

    return { r, g, b };
  }

  // RGB/RGBA format
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3]),
    };
  }

  // HSL/HSLA format (convert to RGB)
  const hslMatch = color.match(/hsla?\((\d+),\s*(\d+)%,\s*(\d+)%/);
  if (hslMatch) {
    const h = parseInt(hslMatch[1]) / 360;
    const s = parseInt(hslMatch[2]) / 100;
    const l = parseInt(hslMatch[3]) / 100;

    const rgb = hslToRgb(h, s, l);
    return rgb;
  }

  // Named colors (limited set)
  const namedColors: Record<string, { r: number; g: number; b: number }> = {
    white: { r: 255, g: 255, b: 255 },
    black: { r: 0, g: 0, b: 0 },
    red: { r: 255, g: 0, b: 0 },
    green: { r: 0, g: 128, b: 0 },
    blue: { r: 0, g: 0, b: 255 },
    yellow: { r: 255, g: 255, b: 0 },
    cyan: { r: 0, g: 255, b: 255 },
    magenta: { r: 255, g: 0, b: 255 },
    gray: { r: 128, g: 128, b: 128 },
    grey: { r: 128, g: 128, b: 128 },
  };

  return namedColors[color.toLowerCase()] || null;
}

/**
 * Convert HSL to RGB
 */
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l; // Achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

/**
 * Calculate relative luminance of a color
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function getRelativeLuminance(rgb: { r: number; g: number; b: number }): number {
  // Convert to 0-1 range
  const [r, g, b] = [rgb.r / 255, rgb.g / 255, rgb.b / 255];

  // Apply gamma correction
  const [rs, gs, bs] = [r, g, b].map((c) => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  // Calculate luminance
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 * https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */
export function calculateContrastRatio(foreground: string, background: string): number {
  const fgRGB = parseColor(foreground);
  const bgRGB = parseColor(background);

  if (!fgRGB || !bgRGB) {
    throw new Error('Invalid color format');
  }

  const fgLuminance = getRelativeLuminance(fgRGB);
  const bgLuminance = getRelativeLuminance(bgRGB);

  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Validate contrast ratio and return detailed results
 */
export function validateContrast(
  foreground: string,
  background: string
): ContrastResult {
  const ratio = calculateContrastRatio(foreground, background);

  // WCAG 2.1 Level AA and AAA requirements
  const passes = {
    normalTextAA: ratio >= 4.5, // Level AA for normal text (14pt/18.66px)
    normalTextAAA: ratio >= 7.0, // Level AAA for normal text
    largeTextAA: ratio >= 3.0, // Level AA for large text (18pt/24px or 14pt/18.66px bold)
    largeTextAAA: ratio >= 4.5, // Level AAA for large text
  };

  // Determine overall level
  let level: ContrastResult['level'];
  if (passes.normalTextAAA) {
    level = 'AAA';
  } else if (passes.normalTextAA) {
    level = 'AA';
  } else if (passes.largeTextAA) {
    level = 'AA_LARGE';
  } else {
    level = 'FAIL';
  }

  return {
    ratio: Math.round(ratio * 100) / 100,
    level,
    passes,
    foreground,
    background,
  };
}

/**
 * Suggest accessible foreground color for a given background
 * Returns either white or black, whichever has better contrast
 */
export function suggestForegroundColor(background: string): string {
  const whiteContrast = calculateContrastRatio('#ffffff', background);
  const blackContrast = calculateContrastRatio('#000000', background);

  return whiteContrast > blackContrast ? '#ffffff' : '#000000';
}

/**
 * Auto-adjust color to meet minimum contrast ratio
 */
export function adjustColorForContrast(
  foreground: string,
  background: string,
  targetRatio: number = 4.5
): string {
  const currentRatio = calculateContrastRatio(foreground, background);

  if (currentRatio >= targetRatio) {
    return foreground; // Already passes
  }

  const fgRGB = parseColor(foreground);
  const bgRGB = parseColor(background);

  if (!fgRGB || !bgRGB) {
    return foreground; // Cannot adjust invalid colors
  }

  // Determine if we need to darken or lighten
  const bgLuminance = getRelativeLuminance(bgRGB);
  const shouldDarken = bgLuminance > 0.5;

  // Binary search for the right luminance
  let low = 0;
  let high = 255;
  let bestColor = foreground;
  let bestRatio = currentRatio;

  for (let i = 0; i < 20; i++) {
    const mid = Math.floor((low + high) / 2);
    const adjustedRGB = {
      r: shouldDarken ? Math.max(0, fgRGB.r - mid) : Math.min(255, fgRGB.r + mid),
      g: shouldDarken ? Math.max(0, fgRGB.g - mid) : Math.min(255, fgRGB.g + mid),
      b: shouldDarken ? Math.max(0, fgRGB.b - mid) : Math.min(255, fgRGB.b + mid),
    };

    const adjustedHex = rgbToHex(adjustedRGB);
    const ratio = calculateContrastRatio(adjustedHex, background);

    if (ratio >= targetRatio) {
      bestColor = adjustedHex;
      bestRatio = ratio;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  return bestColor;
}

/**
 * Convert RGB to hex color
 */
function rgbToHex(rgb: { r: number; g: number; b: number }): string {
  const toHex = (n: number): string => {
    const hex = Math.round(n).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * Batch validate multiple color pairs
 */
export function validateColorPairs(
  pairs: Array<{ foreground: string; background: string; name?: string }>
): Array<ContrastResult & { name?: string }> {
  return pairs.map((pair) => ({
    ...validateContrast(pair.foreground, pair.background),
    name: pair.name,
  }));
}

/**
 * Check if a color is light or dark
 */
export function isLightColor(color: string): boolean {
  const rgb = parseColor(color);
  if (!rgb) return false;

  const luminance = getRelativeLuminance(rgb);
  return luminance > 0.5;
}

/**
 * Generate accessible color palette from a base color
 */
export function generateAccessiblePalette(baseColor: string): {
  primary: string;
  primaryForeground: string;
  hover: string;
  active: string;
} {
  const primary = baseColor;
  const primaryForeground = suggestForegroundColor(baseColor);

  const baseRGB = parseColor(baseColor);
  if (!baseRGB) {
    return {
      primary: baseColor,
      primaryForeground: '#ffffff',
      hover: baseColor,
      active: baseColor,
    };
  }

  // Hover state: slightly darker/lighter
  const hoverRGB = {
    r: Math.max(0, Math.min(255, baseRGB.r + (isLightColor(baseColor) ? -20 : 20))),
    g: Math.max(0, Math.min(255, baseRGB.g + (isLightColor(baseColor) ? -20 : 20))),
    b: Math.max(0, Math.min(255, baseRGB.b + (isLightColor(baseColor) ? -20 : 20))),
  };

  // Active state: even more pronounced
  const activeRGB = {
    r: Math.max(0, Math.min(255, baseRGB.r + (isLightColor(baseColor) ? -40 : 40))),
    g: Math.max(0, Math.min(255, baseRGB.g + (isLightColor(baseColor) ? -40 : 40))),
    b: Math.max(0, Math.min(255, baseRGB.b + (isLightColor(baseColor) ? -40 : 40))),
  };

  return {
    primary,
    primaryForeground,
    hover: rgbToHex(hoverRGB),
    active: rgbToHex(activeRGB),
  };
}
