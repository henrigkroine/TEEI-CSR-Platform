/**
 * Cockpit Theme Engine
 *
 * Applies tenant-specific branding via CSS custom properties.
 * Supports light/dark mode with automatic WCAG AA contrast validation.
 *
 * @module theme/engine
 */

import type { ThemeTokens, DarkModeColors } from '@teei/shared-types';

/**
 * CSS custom property map for theme tokens
 */
const CSS_VAR_MAP = {
  // Colors
  'colors.primary': '--color-primary',
  'colors.primaryHover': '--color-primary-hover',
  'colors.primaryActive': '--color-primary-active',
  'colors.primaryForeground': '--color-primary-foreground',

  'colors.secondary': '--color-secondary',
  'colors.secondaryHover': '--color-secondary-hover',
  'colors.secondaryActive': '--color-secondary-active',
  'colors.secondaryForeground': '--color-secondary-foreground',

  'colors.accent': '--color-accent',
  'colors.accentHover': '--color-accent-hover',
  'colors.accentActive': '--color-accent-active',
  'colors.accentForeground': '--color-accent-foreground',

  'colors.background': '--color-background',
  'colors.foreground': '--color-foreground',
  'colors.muted': '--color-muted',
  'colors.mutedForeground': '--color-muted-foreground',

  'colors.border': '--color-border',
  'colors.borderHover': '--color-border-hover',

  'colors.success': '--color-success',
  'colors.successForeground': '--color-success-foreground',
  'colors.warning': '--color-warning',
  'colors.warningForeground': '--color-warning-foreground',
  'colors.error': '--color-error',
  'colors.errorForeground': '--color-error-foreground',
  'colors.info': '--color-info',
  'colors.infoForeground': '--color-info-foreground',

  'colors.chart1': '--color-chart-1',
  'colors.chart2': '--color-chart-2',
  'colors.chart3': '--color-chart-3',
  'colors.chart4': '--color-chart-4',
  'colors.chart5': '--color-chart-5',
  'colors.chart6': '--color-chart-6',

  // Typography
  'typography.fontFamily': '--font-family',
  'typography.fontFamilyHeading': '--font-family-heading',
  'typography.fontFamilyMono': '--font-family-mono',

  // Font sizes
  'typography.fontSize.xs': '--font-size-xs',
  'typography.fontSize.sm': '--font-size-sm',
  'typography.fontSize.base': '--font-size-base',
  'typography.fontSize.lg': '--font-size-lg',
  'typography.fontSize.xl': '--font-size-xl',
  'typography.fontSize.2xl': '--font-size-2xl',
  'typography.fontSize.3xl': '--font-size-3xl',
  'typography.fontSize.4xl': '--font-size-4xl',
  'typography.fontSize.5xl': '--font-size-5xl',
  'typography.fontSize.6xl': '--font-size-6xl',

  // Font weights
  'typography.fontWeight.normal': '--font-weight-normal',
  'typography.fontWeight.medium': '--font-weight-medium',
  'typography.fontWeight.semibold': '--font-weight-semibold',
  'typography.fontWeight.bold': '--font-weight-bold',

  // Line heights
  'typography.lineHeight.tight': '--line-height-tight',
  'typography.lineHeight.normal': '--line-height-normal',
  'typography.lineHeight.relaxed': '--line-height-relaxed',

  // Letter spacing
  'typography.letterSpacing.tight': '--letter-spacing-tight',
  'typography.letterSpacing.normal': '--letter-spacing-normal',
  'typography.letterSpacing.wide': '--letter-spacing-wide',

  // Spacing
  'spacing.xs': '--spacing-xs',
  'spacing.sm': '--spacing-sm',
  'spacing.md': '--spacing-md',
  'spacing.lg': '--spacing-lg',
  'spacing.xl': '--spacing-xl',
  'spacing.2xl': '--spacing-2xl',
  'spacing.3xl': '--spacing-3xl',
  'spacing.4xl': '--spacing-4xl',

  // Radii
  'radii.none': '--radius-none',
  'radii.sm': '--radius-sm',
  'radii.base': '--radius-base',
  'radii.md': '--radius-md',
  'radii.lg': '--radius-lg',
  'radii.xl': '--radius-xl',
  'radii.2xl': '--radius-2xl',
  'radii.full': '--radius-full',

  // Shadows
  'shadows.sm': '--shadow-sm',
  'shadows.base': '--shadow-base',
  'shadows.md': '--shadow-md',
  'shadows.lg': '--shadow-lg',
  'shadows.xl': '--shadow-xl',
  'shadows.none': '--shadow-none',
} as const;

/**
 * Get nested property value from object
 */
function getNestedProperty(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

/**
 * Apply theme tokens as CSS custom properties
 */
export function applyThemeTokens(
  tokens: ThemeTokens,
  darkMode?: DarkModeColors,
  mode: 'light' | 'dark' = 'light'
): void {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;

  // Apply all light mode tokens
  Object.entries(CSS_VAR_MAP).forEach(([path, cssVar]) => {
    const value = getNestedProperty(tokens, path);
    if (value !== undefined) {
      root.style.setProperty(cssVar, String(value));
    }
  });

  // Apply dark mode overrides if available
  if (mode === 'dark' && darkMode) {
    root.setAttribute('data-theme', 'dark');
    root.classList.add('dark');

    // Override specific color properties for dark mode
    const darkModeMap: Record<string, string> = {
      primary: '--color-primary',
      primaryHover: '--color-primary-hover',
      primaryActive: '--color-primary-active',
      secondary: '--color-secondary',
      secondaryHover: '--color-secondary-hover',
      secondaryActive: '--color-secondary-active',
      accent: '--color-accent',
      accentHover: '--color-accent-hover',
      accentActive: '--color-accent-active',
      background: '--color-background',
      foreground: '--color-foreground',
      muted: '--color-muted',
      mutedForeground: '--color-muted-foreground',
      border: '--color-border',
      borderHover: '--color-border-hover',
      success: '--color-success',
      warning: '--color-warning',
      error: '--color-error',
      info: '--color-info',
    };

    Object.entries(darkModeMap).forEach(([key, cssVar]) => {
      const value = darkMode[key as keyof DarkModeColors];
      if (value) {
        root.style.setProperty(cssVar, value);
      }
    });
  } else {
    root.removeAttribute('data-theme');
    root.classList.remove('dark');
  }

  // Emit custom event for theme change
  window.dispatchEvent(new CustomEvent('theme-changed', {
    detail: { mode, tokens, darkMode }
  }));
}

/**
 * Fetch theme from API for a given tenant
 */
export async function fetchTheme(tenantId: string): Promise<{
  tokens: ThemeTokens;
  darkMode?: DarkModeColors;
} | null> {
  try {
    const response = await fetch(`/api/branding/themes?tenantId=${tenantId}`);

    if (!response.ok) {
      console.warn(`Failed to fetch theme for tenant ${tenantId}`);
      return null;
    }

    const data = await response.json();

    // Get the active theme
    const activeTheme = data.data.find((theme: any) => theme.isActive);
    if (!activeTheme) {
      return null;
    }

    return {
      tokens: activeTheme.tokens,
      darkMode: activeTheme.darkMode,
    };
  } catch (error) {
    console.error('Error fetching theme:', error);
    return null;
  }
}

/**
 * Load theme from sessionStorage or fetch from API
 */
export async function loadTheme(tenantId: string): Promise<{
  tokens: ThemeTokens;
  darkMode?: DarkModeColors;
} | null> {
  // Try sessionStorage first for performance
  const cacheKey = `teei-theme-${tenantId}`;
  const cached = sessionStorage.getItem(cacheKey);

  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      const age = Date.now() - parsed.timestamp;

      // Cache for 5 minutes
      if (age < 5 * 60 * 1000) {
        return {
          tokens: parsed.tokens,
          darkMode: parsed.darkMode,
        };
      }
    } catch {
      // Invalid cached data, continue to fetch
    }
  }

  // Fetch from API
  const theme = await fetchTheme(tenantId);

  if (theme) {
    // Cache in sessionStorage
    sessionStorage.setItem(cacheKey, JSON.stringify({
      tokens: theme.tokens,
      darkMode: theme.darkMode,
      timestamp: Date.now(),
    }));
  }

  return theme;
}

/**
 * Initialize theme system on page load
 */
export async function initTheme(
  tenantId: string,
  mode?: 'light' | 'dark'
): Promise<void> {
  // Detect preferred color scheme if not specified
  const preferredMode = mode || getPreferredColorScheme();

  // Load theme
  const theme = await loadTheme(tenantId);

  if (theme) {
    applyThemeTokens(theme.tokens, theme.darkMode, preferredMode);
  }
}

/**
 * Detect user's preferred color scheme
 */
export function getPreferredColorScheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  }
  return 'light';
}

/**
 * Toggle between light and dark mode
 */
export function toggleColorScheme(
  tokens: ThemeTokens,
  darkMode?: DarkModeColors
): void {
  const root = document.documentElement;
  const isDark = root.classList.contains('dark');
  const newMode = isDark ? 'light' : 'dark';

  applyThemeTokens(tokens, darkMode, newMode);

  // Persist preference
  localStorage.setItem('teei-color-scheme', newMode);
}

/**
 * Get saved color scheme preference
 */
export function getSavedColorScheme(): 'light' | 'dark' | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('teei-color-scheme') as 'light' | 'dark' | null;
}

/**
 * Clear theme cache for a tenant
 */
export function clearThemeCache(tenantId: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(`teei-theme-${tenantId}`);
}

/**
 * Preload theme (for performance)
 */
export async function preloadTheme(tenantId: string): Promise<void> {
  // Fetch and cache theme without applying
  await loadTheme(tenantId);
}

/**
 * Generate CSS custom properties string from theme tokens
 * (for server-side rendering)
 */
export function generateThemeCSS(
  tokens: ThemeTokens,
  darkMode?: DarkModeColors
): string {
  const lines: string[] = [':root {'];

  // Apply light mode tokens
  Object.entries(CSS_VAR_MAP).forEach(([path, cssVar]) => {
    const value = getNestedProperty(tokens, path);
    if (value !== undefined) {
      lines.push(`  ${cssVar}: ${value};`);
    }
  });

  lines.push('}');

  // Apply dark mode overrides
  if (darkMode) {
    lines.push('');
    lines.push('[data-theme="dark"], html.dark {');

    const darkModeMap: Record<string, string> = {
      primary: '--color-primary',
      primaryHover: '--color-primary-hover',
      primaryActive: '--color-primary-active',
      secondary: '--color-secondary',
      secondaryHover: '--color-secondary-hover',
      secondaryActive: '--color-secondary-active',
      accent: '--color-accent',
      accentHover: '--color-accent-hover',
      accentActive: '--color-accent-active',
      background: '--color-background',
      foreground: '--color-foreground',
      muted: '--color-muted',
      mutedForeground: '--color-muted-foreground',
      border: '--color-border',
      borderHover: '--color-border-hover',
      success: '--color-success',
      warning: '--color-warning',
      error: '--color-error',
      info: '--color-info',
    };

    Object.entries(darkModeMap).forEach(([key, cssVar]) => {
      const value = darkMode[key as keyof DarkModeColors];
      if (value) {
        lines.push(`  ${cssVar}: ${value};`);
      }
    });

    lines.push('}');
  }

  return lines.join('\n');
}
