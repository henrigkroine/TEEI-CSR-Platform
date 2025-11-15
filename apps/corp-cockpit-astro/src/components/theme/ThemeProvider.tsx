/**
 * ThemeProvider Component
 *
 * Manages dark mode state with:
 * - System preference detection (prefers-color-scheme)
 * - Manual override via localStorage
 * - Tenant-specific persistence
 * - Cross-tab sync via storage events
 * - SSR support (no hydration mismatch)
 */

import { useEffect, useState, useCallback, createContext, useContext } from 'react';

export type Theme = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
  isLoading: boolean;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined
);

interface ThemeProviderProps {
  children: any;
  companyId?: string;
}

/**
 * Detect the system's preferred color scheme
 */
function getSystemPreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Get the storage key for this tenant
 */
function getStorageKey(companyId?: string): string {
  return `theme:${companyId || 'default'}`;
}

/**
 * Apply theme to the document
 */
function applyThemeToDocument(theme: 'light' | 'dark'): void {
  if (typeof document === 'undefined') return;

  const html = document.documentElement;

  // Remove both classes first
  html.classList.remove('light', 'dark');

  // Add the new theme class
  html.classList.add(theme);

  // Also set data-theme for CSS variable overrides
  html.setAttribute('data-theme', theme);

  // Store resolved theme for CSS access
  html.style.setProperty('--resolved-theme', theme);
}

/**
 * Get the resolved theme (what's actually active)
 */
function getResolvedTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'auto') {
    return getSystemPreference();
  }
  return theme;
}

export function ThemeProvider({ children, companyId }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>('auto');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Load saved theme preference on mount
  useEffect(() => {
    setIsMounted(true);

    const storageKey = getStorageKey(companyId);
    const saved = localStorage.getItem(storageKey) as Theme | null;
    const themeToUse = saved || 'auto';

    setThemeState(themeToUse);
    const resolved = getResolvedTheme(themeToUse);
    setResolvedTheme(resolved);
    applyThemeToDocument(resolved);

    setIsLoading(false);
  }, [companyId]);

  // Listen for system preference changes
  useEffect(() => {
    if (!isMounted) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent | Event) => {
      // Only update if theme is set to 'auto'
      if (theme === 'auto') {
        const newResolved = e instanceof MediaQueryListEvent
          ? (e.matches ? 'dark' : 'light')
          : getSystemPreference();
        setResolvedTheme(newResolved);
        applyThemeToDocument(newResolved);
      }
    };

    // Use addEventListener for better browser support
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, isMounted]);

  // Listen for storage changes from other tabs/windows
  useEffect(() => {
    if (!isMounted) return;

    const handleStorageChange = (e: StorageEvent) => {
      const storageKey = getStorageKey(companyId);

      // Only react to changes to our theme key
      if (e.key === storageKey && e.newValue) {
        try {
          const newTheme = e.newValue as Theme;
          setThemeState(newTheme);
          const newResolved = getResolvedTheme(newTheme);
          setResolvedTheme(newResolved);
          applyThemeToDocument(newResolved);
        } catch (error) {
          console.error('Error updating theme from storage event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [companyId, isMounted]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    const storageKey = getStorageKey(companyId);
    localStorage.setItem(storageKey, newTheme);

    const newResolved = getResolvedTheme(newTheme);
    setResolvedTheme(newResolved);
    applyThemeToDocument(newResolved);

    // Emit custom event for other listeners
    window.dispatchEvent(
      new CustomEvent('theme-changed', {
        detail: { theme: newTheme, resolved: newResolved }
      })
    );
  }, [companyId]);

  // Prevent flash of unstyled content in SSR
  // The inline script in Layout.astro runs before hydration
  // This ensures consistency once React takes over
  if (!isMounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to use theme context
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
