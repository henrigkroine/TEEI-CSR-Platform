/**
 * RTL (Right-to-Left) Layout Utilities
 * Support for Arabic and Hebrew locales
 */

export type RTLLocale = 'ar' | 'he';
export type Direction = 'ltr' | 'rtl';

/**
 * Check if locale is RTL
 */
export function isRTL(locale: string): boolean {
  return locale === 'ar' || locale === 'he';
}

/**
 * Get text direction for locale
 */
export function getDirection(locale: string): Direction {
  return isRTL(locale) ? 'rtl' : 'ltr';
}

/**
 * Get HTML attributes for RTL support
 */
export function getRTLAttributes(locale: string): {
  dir: Direction;
  lang: string;
} {
  return {
    dir: getDirection(locale),
    lang: locale,
  };
}

/**
 * RTL-aware CSS class names
 */
export function rtlClass(baseClass: string, locale: string): string {
  return isRTL(locale) ? `${baseClass} ${baseClass}--rtl` : baseClass;
}

/**
 * Mirror horizontal values for RTL
 * e.g., marginLeft -> marginRight in RTL contexts
 */
export function mirrorValue(value: number, locale: string): number {
  return isRTL(locale) ? -value : value;
}

/**
 * Get flex direction for RTL
 */
export function getFlexDirection(locale: string, baseDirection: 'row' | 'column' = 'row'): string {
  if (baseDirection === 'column') {
    return 'column';
  }
  return isRTL(locale) ? 'row-reverse' : 'row';
}

/**
 * RTL-aware text alignment
 */
export function getTextAlign(locale: string, align: 'left' | 'right' | 'center' = 'left'): string {
  if (align === 'center') {
    return 'center';
  }

  if (isRTL(locale)) {
    return align === 'left' ? 'right' : 'left';
  }

  return align;
}

/**
 * Generate RTL-aware CSS custom properties
 */
export function getRTLCSSProps(locale: string): Record<string, string> {
  const dir = getDirection(locale);

  return {
    '--text-direction': dir,
    '--start': dir === 'rtl' ? 'right' : 'left',
    '--end': dir === 'rtl' ? 'left' : 'right',
  };
}

/**
 * Visual smoke test for RTL layout
 * Checks that basic RTL requirements are met
 */
export function rtlLayoutCheck(locale: string): {
  passed: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (!isRTL(locale)) {
    return { passed: true, issues: [] };
  }

  // Check document direction
  if (typeof document !== 'undefined') {
    const htmlDir = document.documentElement.getAttribute('dir');
    const htmlLang = document.documentElement.getAttribute('lang');

    if (htmlDir !== 'rtl') {
      issues.push(`HTML dir attribute should be 'rtl', got '${htmlDir}'`);
    }

    if (htmlLang !== locale) {
      issues.push(`HTML lang attribute should be '${locale}', got '${htmlLang}'`);
    }

    // Check for CSS logical properties support
    const testDiv = document.createElement('div');
    testDiv.style.marginInlineStart = '10px';

    if (!testDiv.style.marginInlineStart) {
      issues.push('Browser does not support CSS logical properties (margin-inline-start)');
    }
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}

/**
 * Convert physical CSS properties to logical ones for RTL support
 */
export function toLogicalProperties(styles: Record<string, string>): Record<string, string> {
  const logical: Record<string, string> = { ...styles };

  // Map physical to logical properties
  const mappings: Record<string, string> = {
    'margin-left': 'margin-inline-start',
    'margin-right': 'margin-inline-end',
    'padding-left': 'padding-inline-start',
    'padding-right': 'padding-inline-end',
    'border-left': 'border-inline-start',
    'border-right': 'border-inline-end',
    'left': 'inset-inline-start',
    'right': 'inset-inline-end',
  };

  for (const [physical, logical] of Object.entries(mappings)) {
    if (physical in styles) {
      delete logical[physical];
      logical[logical] = styles[physical];
    }
  }

  return logical;
}
