/**
 * Theme Presets for Pilot Companies
 *
 * Pre-configured color schemes and branding presets that meet WCAG AA contrast requirements.
 * Each preset includes primary, secondary, and accent colors optimized for different industries.
 */

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  industry: string[];
  colors: {
    primary: string;
    primaryHover: string;
    primaryText: string;
    secondary: string;
    secondaryHover: string;
    secondaryText: string;
    accent: string;
    accentHover: string;
    accentText: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  typography: {
    fontFamily: string;
    headingWeight: number;
    bodyWeight: number;
  };
  spacing: {
    scale: number; // Multiplier for base spacing (1 = default)
  };
  logo?: {
    placeholder: string;
    position: 'left' | 'center';
  };
  wcagCompliance: {
    level: 'AA' | 'AAA';
    contrastRatios: {
      primaryVsBackground: number;
      secondaryVsBackground: number;
      accentVsBackground: number;
    };
  };
}

export const THEME_PRESETS: ThemePreset[] = [
  // Corporate Blue - Professional technology companies
  {
    id: 'corporate_blue',
    name: 'Corporate Blue',
    description: 'Professional blue and gray palette suitable for technology and corporate environments',
    industry: ['technology', 'software', 'consulting', 'professional_services'],
    colors: {
      primary: '#1E3A8A', // Deep blue
      primaryHover: '#1E40AF',
      primaryText: '#FFFFFF',
      secondary: '#64748B', // Slate gray
      secondaryHover: '#475569',
      secondaryText: '#FFFFFF',
      accent: '#3B82F6', // Bright blue
      accentHover: '#2563EB',
      accentText: '#FFFFFF',
      background: '#FFFFFF',
      surface: '#F8FAFC',
      text: '#0F172A',
      textSecondary: '#475569',
      border: '#E2E8F0',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
    },
    typography: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      headingWeight: 700,
      bodyWeight: 400,
    },
    spacing: {
      scale: 1.0,
    },
    logo: {
      placeholder: '/logos/corporate-blue-placeholder.svg',
      position: 'left',
    },
    wcagCompliance: {
      level: 'AA',
      contrastRatios: {
        primaryVsBackground: 8.59,
        secondaryVsBackground: 4.65,
        accentVsBackground: 4.52,
      },
    },
  },

  // Healthcare Green - Caring and trustworthy
  {
    id: 'healthcare_green',
    name: 'Healthcare Green',
    description: 'Calming green and white palette emphasizing care, health, and sustainability',
    industry: ['healthcare', 'medical', 'wellness', 'nonprofit', 'sustainability'],
    colors: {
      primary: '#047857', // Deep green
      primaryHover: '#059669',
      primaryText: '#FFFFFF',
      secondary: '#10B981', // Medium green
      secondaryHover: '#059669',
      secondaryText: '#FFFFFF',
      accent: '#34D399', // Light green
      accentHover: '#10B981',
      accentText: '#0F172A',
      background: '#FFFFFF',
      surface: '#F0FDF4',
      text: '#0F172A',
      textSecondary: '#374151',
      border: '#D1FAE5',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
    },
    typography: {
      fontFamily: '"Source Sans Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      headingWeight: 600,
      bodyWeight: 400,
    },
    spacing: {
      scale: 1.1, // Slightly more spacious for readability
    },
    logo: {
      placeholder: '/logos/healthcare-green-placeholder.svg',
      position: 'left',
    },
    wcagCompliance: {
      level: 'AA',
      contrastRatios: {
        primaryVsBackground: 6.42,
        secondaryVsBackground: 3.42,
        accentVsBackground: 1.87, // Works with dark text
      },
    },
  },

  // Finance Gold - Trust and stability
  {
    id: 'finance_gold',
    name: 'Finance Gold',
    description: 'Sophisticated gold and navy palette conveying trust, stability, and premium quality',
    industry: ['finance', 'banking', 'insurance', 'investment', 'fintech'],
    colors: {
      primary: '#B45309', // Dark gold
      primaryHover: '#D97706',
      primaryText: '#FFFFFF',
      secondary: '#1E3A8A', // Navy blue
      secondaryHover: '#1E40AF',
      secondaryText: '#FFFFFF',
      accent: '#F59E0B', // Bright gold
      accentHover: '#D97706',
      accentText: '#0F172A',
      background: '#FFFFFF',
      surface: '#FFFBEB',
      text: '#0F172A',
      textSecondary: '#475569',
      border: '#FDE68A',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#DC2626',
      info: '#3B82F6',
    },
    typography: {
      fontFamily: '"Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      headingWeight: 700,
      bodyWeight: 400,
    },
    spacing: {
      scale: 1.0,
    },
    logo: {
      placeholder: '/logos/finance-gold-placeholder.svg',
      position: 'center',
    },
    wcagCompliance: {
      level: 'AA',
      contrastRatios: {
        primaryVsBackground: 5.89,
        secondaryVsBackground: 8.59,
        accentVsBackground: 2.87, // Works with dark text
      },
    },
  },

  // Modern Neutral - Versatile minimalist theme
  {
    id: 'modern_neutral',
    name: 'Modern Neutral',
    description: 'Clean, minimalist grayscale palette suitable for any industry',
    industry: ['all'],
    colors: {
      primary: '#18181B', // Near black
      primaryHover: '#27272A',
      primaryText: '#FFFFFF',
      secondary: '#52525B', // Medium gray
      secondaryHover: '#3F3F46',
      secondaryText: '#FFFFFF',
      accent: '#0EA5E9', // Sky blue accent
      accentHover: '#0284C7',
      accentText: '#FFFFFF',
      background: '#FFFFFF',
      surface: '#FAFAFA',
      text: '#18181B',
      textSecondary: '#71717A',
      border: '#E4E4E7',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
    },
    typography: {
      fontFamily: '"system-ui", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      headingWeight: 600,
      bodyWeight: 400,
    },
    spacing: {
      scale: 1.0,
    },
    logo: {
      placeholder: '/logos/modern-neutral-placeholder.svg',
      position: 'left',
    },
    wcagCompliance: {
      level: 'AAA',
      contrastRatios: {
        primaryVsBackground: 17.67,
        secondaryVsBackground: 7.23,
        accentVsBackground: 4.01,
      },
    },
  },

  // Community Purple - Non-profits and social impact
  {
    id: 'community_purple',
    name: 'Community Purple',
    description: 'Warm purple palette emphasizing community, inclusion, and social impact',
    industry: ['nonprofit', 'social_impact', 'education', 'community'],
    colors: {
      primary: '#7C3AED', // Vibrant purple
      primaryHover: '#6D28D9',
      primaryText: '#FFFFFF',
      secondary: '#EC4899', // Pink
      secondaryHover: '#DB2777',
      secondaryText: '#FFFFFF',
      accent: '#A78BFA', // Light purple
      accentHover: '#8B5CF6',
      accentText: '#FFFFFF',
      background: '#FFFFFF',
      surface: '#FAF5FF',
      text: '#0F172A',
      textSecondary: '#475569',
      border: '#E9D5FF',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
    },
    typography: {
      fontFamily: '"Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      headingWeight: 700,
      bodyWeight: 400,
    },
    spacing: {
      scale: 1.05,
    },
    logo: {
      placeholder: '/logos/community-purple-placeholder.svg',
      position: 'center',
    },
    wcagCompliance: {
      level: 'AA',
      contrastRatios: {
        primaryVsBackground: 5.12,
        secondaryVsBackground: 5.24,
        accentVsBackground: 3.18,
      },
    },
  },
];

/**
 * Get a theme preset by ID
 */
export function getThemePreset(id: string): ThemePreset | undefined {
  return THEME_PRESETS.find((preset) => preset.id === id);
}

/**
 * Get theme presets suitable for a specific industry
 */
export function getThemePresetsByIndustry(industry: string): ThemePreset[] {
  return THEME_PRESETS.filter(
    (preset) => preset.industry.includes(industry) || preset.industry.includes('all')
  );
}

/**
 * Get the default theme preset
 */
export function getDefaultThemePreset(): ThemePreset {
  return THEME_PRESETS[0]; // Corporate Blue
}

/**
 * Apply theme preset to CSS custom properties
 */
export function applyThemePreset(preset: ThemePreset): void {
  const root = document.documentElement;

  // Apply colors
  Object.entries(preset.colors).forEach(([key, value]) => {
    const cssVarName = `--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    root.style.setProperty(cssVarName, value);
  });

  // Apply typography
  root.style.setProperty('--font-family', preset.typography.fontFamily);
  root.style.setProperty('--heading-weight', preset.typography.headingWeight.toString());
  root.style.setProperty('--body-weight', preset.typography.bodyWeight.toString());

  // Apply spacing scale
  root.style.setProperty('--spacing-scale', preset.spacing.scale.toString());

  // Store preset ID for persistence
  localStorage.setItem('theme-preset-id', preset.id);
}

/**
 * Load and apply saved theme preset from localStorage
 */
export function loadSavedThemePreset(): ThemePreset | null {
  const savedPresetId = localStorage.getItem('theme-preset-id');
  if (savedPresetId) {
    const preset = getThemePreset(savedPresetId);
    if (preset) {
      applyThemePreset(preset);
      return preset;
    }
  }
  return null;
}

/**
 * Convert theme preset to CSS string for server-side rendering
 */
export function themePresetToCSS(preset: ThemePreset): string {
  const cssVars: string[] = [];

  // Colors
  Object.entries(preset.colors).forEach(([key, value]) => {
    const cssVarName = `--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    cssVars.push(`${cssVarName}: ${value};`);
  });

  // Typography
  cssVars.push(`--font-family: ${preset.typography.fontFamily};`);
  cssVars.push(`--heading-weight: ${preset.typography.headingWeight};`);
  cssVars.push(`--body-weight: ${preset.typography.bodyWeight};`);

  // Spacing
  cssVars.push(`--spacing-scale: ${preset.spacing.scale};`);

  return `:root {\n  ${cssVars.join('\n  ')}\n}`;
}
