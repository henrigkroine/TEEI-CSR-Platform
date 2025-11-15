/**
 * Theme Context Provider
 *
 * Manages theme state (light/dark/auto), system preference detection,
 * localStorage persistence per tenant, and CSS custom properties injection.
 */

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { THEME_PRESETS, type ThemePreset, applyThemePreset } from './presets';
import { DARK_THEME_PRESETS, getDarkThemeTokens, type DarkThemeTokens } from './darkTokens';

export type ThemeMode = 'light' | 'dark' | 'auto';

export interface ThemeContextValue {
  // Current theme mode
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;

  // Resolved theme (auto becomes light or dark)
  resolvedTheme: 'light' | 'dark';

  // Current theme preset
  preset: ThemePreset;
  setPreset: (preset: ThemePreset) => void;

  // Dark theme tokens for current preset
  darkTokens: DarkThemeTokens | undefined;

  // System preference
  systemPreference: 'light' | 'dark';

  // Company ID for persistence
  companyId: string | null;
  setCompanyId: (id: string | null) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export interface ThemeProviderProps {
  children: ReactNode;
  defaultPreset?: ThemePreset;
  defaultMode?: ThemeMode;
  companyId?: string | null;
}

export function ThemeProvider({
  children,
  defaultPreset = THEME_PRESETS[0],
  defaultMode = 'auto',
  companyId: initialCompanyId = null,
}: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(defaultMode);
  const [preset, setPresetState] = useState<ThemePreset>(defaultPreset);
  const [companyId, setCompanyId] = useState<string | null>(initialCompanyId);
  const [systemPreference, setSystemPreference] = useState<'light' | 'dark'>('light');

  // Detect system color scheme preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateSystemPreference = (e: MediaQueryList | MediaQueryListEvent) => {
      setSystemPreference(e.matches ? 'dark' : 'light');
    };

    // Set initial value
    updateSystemPreference(mediaQuery);

    // Listen for changes
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updateSystemPreference);
      return () => mediaQuery.removeEventListener('change', updateSystemPreference);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(updateSystemPreference);
      return () => mediaQuery.removeListener(updateSystemPreference);
    }
  }, []);

  // Load saved theme mode and preset from localStorage
  useEffect(() => {
    const storageKey = companyId
      ? `theme-mode-${companyId}`
      : 'theme-mode';
    const presetKey = companyId
      ? `theme-preset-${companyId}`
      : 'theme-preset-id';

    try {
      // Load mode
      const savedMode = localStorage.getItem(storageKey) as ThemeMode | null;
      if (savedMode && ['light', 'dark', 'auto'].includes(savedMode)) {
        setModeState(savedMode);
      }

      // Load preset
      const savedPresetId = localStorage.getItem(presetKey);
      if (savedPresetId) {
        const loadedPreset = THEME_PRESETS.find(p => p.id === savedPresetId);
        if (loadedPreset) {
          setPresetState(loadedPreset);
        }
      }
    } catch (error) {
      console.warn('Failed to load theme from localStorage:', error);
    }
  }, [companyId]);

  // Save theme mode to localStorage when it changes
  useEffect(() => {
    const storageKey = companyId
      ? `theme-mode-${companyId}`
      : 'theme-mode';

    try {
      localStorage.setItem(storageKey, mode);
    } catch (error) {
      console.warn('Failed to save theme mode to localStorage:', error);
    }
  }, [mode, companyId]);

  // Save theme preset to localStorage when it changes
  useEffect(() => {
    const presetKey = companyId
      ? `theme-preset-${companyId}`
      : 'theme-preset-id';

    try {
      localStorage.setItem(presetKey, preset.id);
    } catch (error) {
      console.warn('Failed to save theme preset to localStorage:', error);
    }
  }, [preset, companyId]);

  // Calculate resolved theme
  const resolvedTheme: 'light' | 'dark' =
    mode === 'auto' ? systemPreference : mode;

  // Get dark tokens for current preset
  const darkTokens = getDarkThemeTokens(preset.id);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;

    // Set data-theme attribute
    root.setAttribute('data-theme', resolvedTheme);

    // Also set class for backwards compatibility
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Apply theme preset colors
    const themeColors = resolvedTheme === 'dark' && darkTokens
      ? darkTokens.colors
      : preset.colors;

    Object.entries(themeColors).forEach(([key, value]) => {
      const cssVarName = `--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      root.style.setProperty(cssVarName, value);
    });

    // Apply typography
    root.style.setProperty('--font-family', preset.typography.fontFamily);
    root.style.setProperty('--heading-weight', preset.typography.headingWeight.toString());
    root.style.setProperty('--body-weight', preset.typography.bodyWeight.toString());

    // Apply spacing scale
    root.style.setProperty('--spacing-scale', preset.spacing.scale.toString());

    // Smooth transition
    root.style.setProperty('transition', 'background-color 0.3s ease, color 0.3s ease');
  }, [resolvedTheme, preset, darkTokens]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
  };

  const setPreset = (newPreset: ThemePreset) => {
    setPresetState(newPreset);
  };

  const value: ThemeContextValue = {
    mode,
    setMode,
    resolvedTheme,
    preset,
    setPreset,
    darkTokens,
    systemPreference,
    companyId,
    setCompanyId,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Hook to get current chart color palette based on theme
 */
export function useChartPalette(): string[] {
  const { resolvedTheme } = useTheme();

  if (resolvedTheme === 'dark') {
    return [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
      '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
    ];
  }

  return [
    '#1E40AF', '#047857', '#B45309', '#DC2626', '#7C3AED',
    '#DB2777', '#0D9488', '#EA580C', '#4F46E5', '#65A30D',
  ];
}

/**
 * Hook to apply theme-aware styles to elements
 */
export function useThemedStyles() {
  const { resolvedTheme, preset, darkTokens } = useTheme();

  const getColor = (colorKey: keyof typeof preset.colors): string => {
    if (resolvedTheme === 'dark' && darkTokens) {
      return darkTokens.colors[colorKey];
    }
    return preset.colors[colorKey];
  };

  return {
    resolvedTheme,
    getColor,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
  };
}
