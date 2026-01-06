/**
 * Theme Provider Component
 *
 * React component that loads and applies tenant theme.
 * Provides theme context to child components.
 *
 * @module theme/provider
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ThemeTokens, DarkModeColors } from '@teei/shared-types';
import {
  applyThemeTokens,
  loadTheme,
  getPreferredColorScheme,
  getSavedColorScheme,
  toggleColorScheme as toggleColorSchemeUtil,
  clearThemeCache,
} from './engine.js';

interface ThemeContextValue {
  tokens: ThemeTokens | null;
  darkMode: DarkModeColors | null;
  colorScheme: 'light' | 'dark';
  isLoading: boolean;
  error: Error | null;
  toggleColorScheme: () => void;
  refreshTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  tenantId: string;
  children: React.ReactNode;
  fallbackTokens?: ThemeTokens;
}

/**
 * Theme Provider Component
 * Loads and manages tenant-specific theme
 */
export function ThemeProvider({
  tenantId,
  children,
  fallbackTokens,
}: ThemeProviderProps): JSX.Element {
  const [tokens, setTokens] = useState<ThemeTokens | null>(fallbackTokens || null);
  const [darkMode, setDarkMode] = useState<DarkModeColors | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Determine initial color scheme
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>(() => {
    return getSavedColorScheme() || getPreferredColorScheme();
  });

  // Load theme on mount or when tenantId changes
  const loadAndApplyTheme = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const theme = await loadTheme(tenantId);

      if (theme) {
        setTokens(theme.tokens);
        setDarkMode(theme.darkMode || null);
        applyThemeTokens(theme.tokens, theme.darkMode, colorScheme);
      } else if (fallbackTokens) {
        setTokens(fallbackTokens);
        applyThemeTokens(fallbackTokens, undefined, colorScheme);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load theme');
      setError(error);
      console.error('Theme loading error:', error);

      // Apply fallback if available
      if (fallbackTokens) {
        setTokens(fallbackTokens);
        applyThemeTokens(fallbackTokens, undefined, colorScheme);
      }
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, colorScheme, fallbackTokens]);

  useEffect(() => {
    loadAndApplyTheme();
  }, [loadAndApplyTheme]);

  // Toggle color scheme
  const toggleColorSchemeCallback = useCallback(() => {
    if (!tokens) return;

    const newScheme = colorScheme === 'light' ? 'dark' : 'light';
    setColorScheme(newScheme);
    toggleColorSchemeUtil(tokens, darkMode || undefined);
  }, [tokens, darkMode, colorScheme]);

  // Refresh theme (bypass cache)
  const refreshTheme = useCallback(async () => {
    clearThemeCache(tenantId);
    await loadAndApplyTheme();
  }, [tenantId, loadAndApplyTheme]);

  // Listen for system color scheme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't set a preference
      if (!getSavedColorScheme()) {
        const newScheme = e.matches ? 'dark' : 'light';
        setColorScheme(newScheme);

        if (tokens) {
          applyThemeTokens(tokens, darkMode || undefined, newScheme);
        }
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [tokens, darkMode]);

  const value: ThemeContextValue = {
    tokens,
    darkMode,
    colorScheme,
    isLoading,
    error,
    toggleColorScheme: toggleColorSchemeCallback,
    refreshTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to access theme context
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}

/**
 * Hook to get current color scheme
 */
export function useColorScheme(): {
  colorScheme: 'light' | 'dark';
  toggle: () => void;
} {
  const { colorScheme, toggleColorScheme } = useTheme();

  return {
    colorScheme,
    toggle: toggleColorScheme,
  };
}

/**
 * Hook to get theme tokens
 */
export function useThemeTokens(): ThemeTokens | null {
  const { tokens } = useTheme();
  return tokens;
}
