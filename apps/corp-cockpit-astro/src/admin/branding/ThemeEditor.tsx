/**
 * Theme Editor Component
 *
 * Admin UI for editing tenant branding themes.
 * Includes color pickers, typography controls, asset upload, and live preview.
 *
 * @module admin/branding/ThemeEditor
 */

import React, { useState, useEffect } from 'react';
import type { ThemeTokens, DarkModeColors, BrandingAsset } from '@teei/shared-types';
import { validateContrast, suggestForegroundColor } from '../../theme/contrast.js';
import { applyThemeTokens, generateThemeCSS } from '../../theme/engine.js';
import { ColorPicker } from './ColorPicker.js';
import { AssetUploader } from './AssetUploader.js';
import { ThemePreview } from './ThemePreview.js';

interface ThemeEditorProps {
  tenantId: string;
  themeId?: string; // If editing existing theme
  onSave?: (theme: any) => void;
  onCancel?: () => void;
}

export function ThemeEditor({
  tenantId,
  themeId,
  onSave,
  onCancel,
}: ThemeEditorProps): JSX.Element {
  const [themeName, setThemeName] = useState('New Theme');
  const [tokens, setTokens] = useState<ThemeTokens | null>(null);
  const [darkMode, setDarkMode] = useState<DarkModeColors | null>(null);
  const [assets, setAssets] = useState<BrandingAsset[]>([]);
  const [activeTab, setActiveTab] = useState<'colors' | 'typography' | 'spacing' | 'assets' | 'preview'>('colors');
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('light');
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Load existing theme if themeId provided
  useEffect(() => {
    if (themeId) {
      loadTheme();
    } else {
      // Initialize with default tokens
      initializeDefaultTheme();
    }
  }, [themeId]);

  async function loadTheme() {
    try {
      const response = await fetch(`/api/branding/themes/${themeId}`);
      if (response.ok) {
        const data = await response.json();
        setThemeName(data.data.name);
        setTokens(data.data.tokens);
        setDarkMode(data.data.darkMode || null);
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
    }
  }

  function initializeDefaultTheme() {
    // Use DEFAULT_THEME_TOKENS from shared-types
    const defaultTokens: ThemeTokens = {
      colors: {
        primary: '#2563eb',
        primaryHover: '#1d4ed8',
        primaryActive: '#1e40af',
        primaryForeground: '#ffffff',
        secondary: '#1e40af',
        secondaryHover: '#1e3a8a',
        secondaryActive: '#1e3a8a',
        secondaryForeground: '#ffffff',
        accent: '#047857',
        accentHover: '#065f46',
        accentActive: '#064e3b',
        accentForeground: '#ffffff',
        background: '#ffffff',
        foreground: '#111827',
        muted: '#f5f5f5',
        mutedForeground: '#6b7280',
        border: '#d1d5db',
        borderHover: '#9ca3af',
        success: '#047857',
        successForeground: '#ffffff',
        warning: '#b45309',
        warningForeground: '#ffffff',
        error: '#dc2626',
        errorForeground: '#ffffff',
        info: '#2563eb',
        infoForeground: '#ffffff',
        chart1: '#2563eb',
        chart2: '#047857',
        chart3: '#b45309',
        chart4: '#7c3aed',
        chart5: '#dc2626',
        chart6: '#0891b2',
      },
      typography: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontFamilyHeading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
        base: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        none: 'none',
      },
    };

    setTokens(defaultTokens);
  }

  // Update color token
  function updateColorToken(path: string, value: string) {
    if (!tokens) return;

    const pathParts = path.split('.');
    const newTokens = { ...tokens };
    let current: any = newTokens;

    for (let i = 0; i < pathParts.length - 1; i++) {
      current[pathParts[i]] = { ...current[pathParts[i]] };
      current = current[pathParts[i]];
    }

    current[pathParts[pathParts.length - 1]] = value;
    setTokens(newTokens);

    // Apply theme in real-time for preview
    applyThemeTokens(newTokens, darkMode || undefined, colorScheme);

    // Validate contrast
    validateTheme(newTokens);
  }

  // Validate theme for WCAG compliance
  function validateTheme(themeTokens: ThemeTokens) {
    const errors: string[] = [];

    // Validate critical color pairs
    const pairs = [
      { fg: themeTokens.colors.primaryForeground, bg: themeTokens.colors.primary, name: 'Primary' },
      { fg: themeTokens.colors.secondaryForeground, bg: themeTokens.colors.secondary, name: 'Secondary' },
      { fg: themeTokens.colors.accentForeground, bg: themeTokens.colors.accent, name: 'Accent' },
      { fg: themeTokens.colors.foreground, bg: themeTokens.colors.background, name: 'Body' },
    ];

    for (const pair of pairs) {
      const result = validateContrast(pair.fg, pair.bg);
      if (!result.passes.normalTextAA) {
        errors.push(`${pair.name}: Contrast ratio ${result.ratio}:1 fails WCAG AA (minimum 4.5:1)`);
      }
    }

    setValidationErrors(errors);
  }

  // Auto-fix contrast issues
  function autoFixContrast() {
    if (!tokens) return;

    const newTokens = { ...tokens };
    const colors = newTokens.colors;

    // Auto-suggest foreground colors
    colors.primaryForeground = suggestForegroundColor(colors.primary);
    colors.secondaryForeground = suggestForegroundColor(colors.secondary);
    colors.accentForeground = suggestForegroundColor(colors.accent);

    setTokens(newTokens);
    applyThemeTokens(newTokens, darkMode || undefined, colorScheme);
    validateTheme(newTokens);
  }

  // Save theme
  async function handleSave() {
    if (!tokens) return;

    setIsSaving(true);

    try {
      const payload = {
        tenantId,
        name: themeName,
        tokens,
        darkMode,
        isActive: false,
      };

      const url = themeId ? `/api/branding/themes/${themeId}` : '/api/branding/themes';
      const method = themeId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        if (onSave) {
          onSave(data.data);
        }
      } else {
        const error = await response.json();
        console.error('Failed to save theme:', error);
        alert(`Failed to save theme: ${error.message}`);
      }
    } catch (error) {
      console.error('Error saving theme:', error);
      alert('An error occurred while saving the theme');
    } finally {
      setIsSaving(false);
    }
  }

  if (!tokens) {
    return <div className="p-4">Loading theme editor...</div>;
  }

  return (
    <div className="theme-editor h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-foreground">Theme Editor</h1>
            <input
              type="text"
              value={themeName}
              onChange={(e) => setThemeName(e.target.value)}
              className="px-3 py-1 border border-border rounded-md bg-background text-foreground"
              placeholder="Theme name"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setColorScheme(colorScheme === 'light' ? 'dark' : 'light')}
              className="px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
            >
              {colorScheme === 'light' ? '🌙 Dark' : '☀️ Light'}
            </button>
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving || validationErrors.length > 0}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save Theme'}
            </button>
          </div>
        </div>
      </header>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-error/10 border-l-4 border-error px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-error">Contrast Issues Detected</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {validationErrors.map((error, i) => (
                  <li key={i} className="text-foreground">{error}</li>
                ))}
              </ul>
            </div>
            <button
              onClick={autoFixContrast}
              className="px-3 py-1 bg-error text-white rounded-md hover:opacity-90 transition-opacity text-sm"
            >
              Auto-fix
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Controls */}
        <div className="w-96 border-r border-border overflow-y-auto">
          {/* Tabs */}
          <div className="flex border-b border-border">
            {(['colors', 'typography', 'spacing', 'assets'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-3 text-sm font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'bg-primary text-white border-b-2 border-primary'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-6 space-y-6">
            {/* Colors Tab */}
            {activeTab === 'colors' && (
              <>
                <ColorSection
                  title="Primary Color"
                  colors={{
                    primary: tokens.colors.primary,
                    hover: tokens.colors.primaryHover,
                    active: tokens.colors.primaryActive,
                    foreground: tokens.colors.primaryForeground,
                  }}
                  onChange={(key, value) => updateColorToken(`colors.${key}`, value)}
                />
                <ColorSection
                  title="Secondary Color"
                  colors={{
                    secondary: tokens.colors.secondary,
                    secondaryHover: tokens.colors.secondaryHover,
                    secondaryActive: tokens.colors.secondaryActive,
                    secondaryForeground: tokens.colors.secondaryForeground,
                  }}
                  onChange={(key, value) => updateColorToken(`colors.${key}`, value)}
                />
                <ColorSection
                  title="Accent Color"
                  colors={{
                    accent: tokens.colors.accent,
                    accentHover: tokens.colors.accentHover,
                    accentActive: tokens.colors.accentActive,
                    accentForeground: tokens.colors.accentForeground,
                  }}
                  onChange={(key, value) => updateColorToken(`colors.${key}`, value)}
                />
              </>
            )}

            {/* Typography Tab */}
            {activeTab === 'typography' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Font Family</label>
                  <input
                    type="text"
                    value={tokens.typography.fontFamily}
                    onChange={(e) => {
                      const newTokens = { ...tokens };
                      newTokens.typography.fontFamily = e.target.value;
                      setTokens(newTokens);
                      applyThemeTokens(newTokens, darkMode || undefined, colorScheme);
                    }}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                    placeholder="Font family"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Typography settings for font families, sizes, weights, and line heights.
                </p>
              </div>
            )}

            {/* Spacing Tab */}
            {activeTab === 'spacing' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Spacing scale for consistent layout and padding.
                </p>
                {Object.entries(tokens.spacing).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium mb-2 capitalize">{key}</label>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => {
                        const newTokens = { ...tokens };
                        (newTokens.spacing as any)[key] = e.target.value;
                        setTokens(newTokens);
                        applyThemeTokens(newTokens, darkMode || undefined, colorScheme);
                      }}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Assets Tab */}
            {activeTab === 'assets' && themeId && (
              <AssetUploader themeId={themeId} assets={assets} onUpload={() => {}} />
            )}
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="flex-1 overflow-y-auto bg-muted p-8">
          <ThemePreview tokens={tokens} darkMode={darkMode || undefined} colorScheme={colorScheme} />
        </div>
      </div>
    </div>
  );
}

interface ColorSectionProps {
  title: string;
  colors: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

function ColorSection({ title, colors, onChange }: ColorSectionProps) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-foreground">{title}</h3>
      {Object.entries(colors).map(([key, value]) => (
        <ColorPicker key={key} label={key} value={value} onChange={(v) => onChange(key, v)} />
      ))}
    </div>
  );
}
