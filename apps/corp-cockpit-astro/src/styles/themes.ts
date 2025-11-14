/**
 * Frontend Theme System
 *
 * Manages tenant-specific branding via CSS custom properties.
 * Supports light/dark mode with WCAG AA compliant colors.
 */

export interface ThemeColors {
  light: {
    primary: string;
    secondary: string;
    accent: string;
    textOnPrimary: string;
    textOnSecondary: string;
    textOnAccent: string;
  };
  dark?: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export interface TenantTheme {
  companyId: string;
  logoUrl: string | null;
  colors: ThemeColors;
}

/**
 * Default theme (fallback if tenant theme not available)
 */
export const DEFAULT_THEME: TenantTheme = {
  companyId: 'default',
  logoUrl: null,
  colors: {
    light: {
      primary: '#0066CC',
      secondary: '#1E40AF',
      accent: '#10B981',
      textOnPrimary: '#FFFFFF',
      textOnSecondary: '#FFFFFF',
      textOnAccent: '#FFFFFF',
    },
    dark: {
      primary: '#3B82F6',
      secondary: '#60A5FA',
      accent: '#34D399',
    },
  },
};

/**
 * Apply theme to document via CSS custom properties
 */
export function applyTheme(theme: TenantTheme, mode: 'light' | 'dark' = 'light'): void {
  const root = document.documentElement;

  // Apply light mode colors
  root.style.setProperty('--color-primary', theme.colors.light.primary);
  root.style.setProperty('--color-secondary', theme.colors.light.secondary);
  root.style.setProperty('--color-accent', theme.colors.light.accent);
  root.style.setProperty('--color-text-on-primary', theme.colors.light.textOnPrimary);
  root.style.setProperty('--color-text-on-secondary', theme.colors.light.textOnSecondary);
  root.style.setProperty('--color-text-on-accent', theme.colors.light.textOnAccent);

  // Apply dark mode colors if available and mode is dark
  if (mode === 'dark' && theme.colors.dark) {
    root.style.setProperty('--color-primary-dark', theme.colors.dark.primary);
    root.style.setProperty('--color-secondary-dark', theme.colors.dark.secondary);
    root.style.setProperty('--color-accent-dark', theme.colors.dark.accent);
  }

  // Store theme in sessionStorage for persistence
  sessionStorage.setItem('tenant-theme', JSON.stringify(theme));
}

/**
 * Fetch theme from API for a given company
 */
export async function fetchTheme(companyId: string): Promise<TenantTheme | null> {
  try {
    const response = await fetch(`/api/companies/${companyId}/theme`);

    if (!response.ok) {
      console.warn(`Failed to fetch theme for company ${companyId}`);
      return null;
    }

    const data = await response.json();

    return {
      companyId: data.company_id,
      logoUrl: data.logo_url,
      colors: {
        light: {
          primary: data.colors.light.primary,
          secondary: data.colors.light.secondary,
          accent: data.colors.light.accent,
          textOnPrimary: data.colors.light.textOnPrimary,
          textOnSecondary: data.colors.light.textOnSecondary,
          textOnAccent: data.colors.light.textOnAccent,
        },
        dark: data.colors.dark
          ? {
              primary: data.colors.dark.primary,
              secondary: data.colors.dark.secondary,
              accent: data.colors.dark.accent,
            }
          : undefined,
      },
    };
  } catch (error) {
    console.error('Error fetching theme:', error);
    return null;
  }
}

/**
 * Load theme from sessionStorage or fetch from API
 */
export async function loadTheme(companyId: string): Promise<TenantTheme> {
  // Try sessionStorage first
  const cached = sessionStorage.getItem('tenant-theme');
  if (cached) {
    try {
      const theme = JSON.parse(cached) as TenantTheme;
      if (theme.companyId === companyId) {
        return theme;
      }
    } catch {
      // Invalid cached data, continue to fetch
    }
  }

  // Fetch from API
  const theme = await fetchTheme(companyId);
  return theme || DEFAULT_THEME;
}

/**
 * Initialize theme system on page load
 */
export async function initTheme(companyId: string, mode: 'light' | 'dark' = 'light'): Promise<void> {
  const theme = await loadTheme(companyId);
  applyTheme(theme, mode);
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
 * React hook for theme management (optional, for React components)
 */
export function useTheme(companyId: string) {
  if (typeof window === 'undefined') {
    return { theme: DEFAULT_THEME, loading: true };
  }

  const [theme, setTheme] = React.useState<TenantTheme>(DEFAULT_THEME);
  const [loading, setLoading] = React.useState(true);
  const [mode, setMode] = React.useState<'light' | 'dark'>(getPreferredColorScheme());

  React.useEffect(() => {
    loadTheme(companyId).then((loadedTheme) => {
      setTheme(loadedTheme);
      applyTheme(loadedTheme, mode);
      setLoading(false);
    });
  }, [companyId, mode]);

  const toggleMode = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    applyTheme(theme, newMode);
  };

  return { theme, loading, mode, toggleMode };
}

// Add React import for the hook (only if React is available)
declare const React: any;
