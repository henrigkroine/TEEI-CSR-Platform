/**
 * Branding & White-Label Types
 *
 * Comprehensive type definitions for per-tenant branding, theme tokens,
 * branded assets, and white-label domain routing.
 *
 * @module @teei/shared-types/branding
 */

/**
 * Color tokens for theme customization
 * All colors must pass WCAG AA contrast requirements
 */
export interface ThemeColorTokens {
  // Brand colors
  primary: string; // Primary brand color (hex/rgb/hsl)
  primaryHover: string; // Hover state for primary
  primaryActive: string; // Active/pressed state for primary
  primaryForeground: string; // Text color on primary background (WCAG AA)

  secondary: string; // Secondary brand color
  secondaryHover: string;
  secondaryActive: string;
  secondaryForeground: string; // Text color on secondary background (WCAG AA)

  accent: string; // Accent color for CTAs
  accentHover: string;
  accentActive: string;
  accentForeground: string; // Text color on accent background (WCAG AA)

  // Neutral colors
  background: string; // Page background
  foreground: string; // Text color (WCAG AA on background)
  muted: string; // Muted background (cards, etc.)
  mutedForeground: string; // Text on muted background (WCAG AA)

  border: string; // Border color
  borderHover: string; // Border hover state

  // Semantic colors (WCAG AA compliant)
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  error: string;
  errorForeground: string;
  info: string;
  infoForeground: string;

  // Chart colors (must be distinguishable for accessibility)
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
  chart6: string;
}

/**
 * Typography tokens for consistent text styling
 */
export interface ThemeTypographyTokens {
  // Font families with fallbacks
  fontFamily: string; // Primary font family
  fontFamilyHeading: string; // Heading font family
  fontFamilyMono: string; // Monospace font family

  // Font sizes (rem units)
  fontSize: {
    xs: string; // 0.75rem
    sm: string; // 0.875rem
    base: string; // 1rem
    lg: string; // 1.125rem
    xl: string; // 1.25rem
    '2xl': string; // 1.5rem
    '3xl': string; // 1.875rem
    '4xl': string; // 2.25rem
    '5xl': string; // 3rem
    '6xl': string; // 3.75rem
  };

  // Font weights
  fontWeight: {
    normal: number; // 400
    medium: number; // 500
    semibold: number; // 600
    bold: number; // 700
  };

  // Line heights
  lineHeight: {
    tight: number; // 1.25
    normal: number; // 1.5
    relaxed: number; // 1.75
  };

  // Letter spacing
  letterSpacing: {
    tight: string; // -0.025em
    normal: string; // 0
    wide: string; // 0.025em
  };
}

/**
 * Spacing tokens for consistent layout
 */
export interface ThemeSpacingTokens {
  xs: string; // 0.25rem (4px)
  sm: string; // 0.5rem (8px)
  md: string; // 1rem (16px)
  lg: string; // 1.5rem (24px)
  xl: string; // 2rem (32px)
  '2xl': string; // 3rem (48px)
  '3xl': string; // 4rem (64px)
  '4xl': string; // 6rem (96px)
}

/**
 * Border radius tokens for consistent rounding
 */
export interface ThemeRadiusTokens {
  none: string; // 0
  sm: string; // 0.125rem (2px)
  base: string; // 0.25rem (4px)
  md: string; // 0.375rem (6px)
  lg: string; // 0.5rem (8px)
  xl: string; // 0.75rem (12px)
  '2xl': string; // 1rem (16px)
  full: string; // 9999px (fully rounded)
}

/**
 * Shadow tokens for elevation
 */
export interface ThemeShadowTokens {
  sm: string; // Small shadow
  base: string; // Default shadow
  md: string; // Medium shadow
  lg: string; // Large shadow
  xl: string; // Extra large shadow
  none: string; // No shadow
}

/**
 * Complete theme token set
 */
export interface ThemeTokens {
  colors: ThemeColorTokens;
  typography: ThemeTypographyTokens;
  spacing: ThemeSpacingTokens;
  radii: ThemeRadiusTokens;
  shadows: ThemeShadowTokens;
}

/**
 * Dark mode theme overrides
 * Only colors need to be overridden for dark mode
 */
export interface DarkModeColors {
  primary: string;
  primaryHover: string;
  primaryActive: string;
  secondary: string;
  secondaryHover: string;
  secondaryActive: string;
  accent: string;
  accentHover: string;
  accentActive: string;
  background: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  borderHover: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

/**
 * Branding theme with light/dark mode support
 */
export interface BrandingTheme {
  id: string;
  tenantId: string;
  name: string;
  isActive: boolean;
  tokens: ThemeTokens;
  darkMode?: DarkModeColors; // Optional dark mode overrides
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Asset kinds for branding
 */
export enum AssetKind {
  Logo = 'logo',
  Favicon = 'favicon',
  Watermark = 'watermark',
  HeroImage = 'hero_image',
}

/**
 * Branding asset (logo, favicon, watermark, etc.)
 */
export interface BrandingAsset {
  id: string;
  themeId: string;
  kind: AssetKind;
  url: string;
  hash: string; // SHA-256 hash for integrity verification
  mimeType: string;
  size?: string; // Human-readable size, e.g., "150KB"
  width?: string; // Image width in px
  height?: string; // Image height in px
  metadata?: Record<string, any>;
  uploadedBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Custom domain for white-label routing
 */
export interface BrandingDomain {
  id: string;
  tenantId: string;
  domain: string;
  isVerified: boolean;
  verificationToken?: string;
  verifiedAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Branding audit log entry
 */
export interface BrandingAuditLogEntry {
  id: string;
  tenantId: string;
  resourceType: 'theme' | 'asset' | 'domain';
  resourceId: string;
  action: 'created' | 'updated' | 'deleted' | 'activated' | 'deactivated' | 'verified' | 'uploaded';
  changes?: Record<string, any>;
  performedBy?: string;
  ipAddress?: string;
  userAgent?: string;
  performedAt: string;
}

/**
 * Theme creation request
 */
export interface CreateThemeRequest {
  tenantId: string;
  name: string;
  tokens: ThemeTokens;
  darkMode?: DarkModeColors;
  isActive?: boolean;
}

/**
 * Theme update request
 */
export interface UpdateThemeRequest {
  name?: string;
  tokens?: Partial<ThemeTokens>;
  darkMode?: Partial<DarkModeColors>;
  isActive?: boolean;
}

/**
 * Asset upload request metadata
 */
export interface UploadAssetRequest {
  themeId: string;
  kind: AssetKind;
  file: File | Buffer;
  mimeType: string;
}

/**
 * Domain verification request
 */
export interface AddDomainRequest {
  tenantId: string;
  domain: string;
}

/**
 * WCAG contrast validation result
 */
export interface ContrastValidationResult {
  isValid: boolean;
  ratio: number;
  level: 'AA' | 'AAA' | 'FAIL';
  foreground: string;
  background: string;
}

/**
 * Theme validation result
 */
export interface ThemeValidationResult {
  isValid: boolean;
  errors: ThemeValidationError[];
  warnings: ThemeValidationWarning[];
  contrastChecks: ContrastValidationResult[];
}

/**
 * Theme validation error
 */
export interface ThemeValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * Theme validation warning
 */
export interface ThemeValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

/**
 * Default theme tokens (TEEI Platform defaults)
 */
export const DEFAULT_THEME_TOKENS: ThemeTokens = {
  colors: {
    // Brand colors
    primary: '#2563eb', // Blue-600
    primaryHover: '#1d4ed8', // Blue-700
    primaryActive: '#1e40af', // Blue-800
    primaryForeground: '#ffffff',

    secondary: '#1e40af', // Blue-800
    secondaryHover: '#1e3a8a', // Blue-900
    secondaryActive: '#1e3a8a',
    secondaryForeground: '#ffffff',

    accent: '#047857', // Green-700
    accentHover: '#065f46', // Green-800
    accentActive: '#064e3b', // Green-900
    accentForeground: '#ffffff',

    // Neutral colors
    background: '#ffffff',
    foreground: '#111827', // Gray-900
    muted: '#f5f5f5', // Gray-100
    mutedForeground: '#6b7280', // Gray-500

    border: '#d1d5db', // Gray-300
    borderHover: '#9ca3af', // Gray-400

    // Semantic colors
    success: '#047857', // Green-700
    successForeground: '#ffffff',
    warning: '#b45309', // Orange-700
    warningForeground: '#ffffff',
    error: '#dc2626', // Red-600
    errorForeground: '#ffffff',
    info: '#2563eb', // Blue-600
    infoForeground: '#ffffff',

    // Chart colors (colorblind-safe palette)
    chart1: '#2563eb', // Blue
    chart2: '#047857', // Green
    chart3: '#b45309', // Orange
    chart4: '#7c3aed', // Purple
    chart5: '#dc2626', // Red
    chart6: '#0891b2', // Cyan
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontFamilyHeading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontFamilyMono: 'Menlo, Monaco, "Courier New", monospace',
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
      '6xl': '3.75rem',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
    letterSpacing: {
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
    '4xl': '6rem',
  },
  radii: {
    none: '0',
    sm: '0.125rem',
    base: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    none: 'none',
  },
};

/**
 * Default dark mode color overrides
 */
export const DEFAULT_DARK_MODE_COLORS: DarkModeColors = {
  primary: '#60a5fa', // Blue-400
  primaryHover: '#3b82f6', // Blue-500
  primaryActive: '#2563eb', // Blue-600
  secondary: '#3b82f6', // Blue-500
  secondaryHover: '#2563eb', // Blue-600
  secondaryActive: '#1d4ed8', // Blue-700
  accent: '#34d399', // Green-400
  accentHover: '#10b981', // Green-500
  accentActive: '#059669', // Green-600
  background: '#111827', // Gray-900
  foreground: '#f9fafb', // Gray-50
  muted: '#1f2937', // Gray-800
  mutedForeground: '#d1d5db', // Gray-300
  border: '#374151', // Gray-700
  borderHover: '#4b5563', // Gray-600
  success: '#34d399', // Green-400
  warning: '#fbbf24', // Yellow-400
  error: '#f87171', // Red-400
  info: '#60a5fa', // Blue-400
};
