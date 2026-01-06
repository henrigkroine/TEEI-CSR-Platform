/**
 * Theme Editor Component
 *
 * Admin UI for configuring tenant branding:
 * - Upload logo (PNG/SVG, max 2MB)
 * - Set brand colors with color pickers
 * - Preview theme in light/dark modes
 * - WCAG AA contrast validation with warnings
 */

import React, { useState, useEffect } from 'react';
import { applyTheme, type TenantTheme } from '../../styles/themes';

interface ThemeEditorProps {
  companyId: string;
  onSave?: (theme: TenantTheme) => void;
}

interface ContrastWarning {
  field: string;
  message: string;
}

export function ThemeEditor({ companyId, onSave }: ThemeEditorProps) {
  const [theme, setTheme] = useState<TenantTheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<'light' | 'dark'>('light');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [contrastWarnings, setContrastWarnings] = useState<ContrastWarning[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Editable color state
  const [colors, setColors] = useState({
    primary: '#0066CC',
    secondary: '#1E40AF',
    accent: '#10B981',
    textOnPrimary: '#FFFFFF',
    textOnSecondary: '#FFFFFF',
    textOnAccent: '#FFFFFF',
    primaryDark: '#3B82F6',
    secondaryDark: '#60A5FA',
    accentDark: '#34D399',
  });

  // Load theme on mount
  useEffect(() => {
    fetchTheme();
  }, [companyId]);

  // Update logo preview when file changes
  useEffect(() => {
    if (logoFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(logoFile);
    }
  }, [logoFile]);

  async function fetchTheme() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/companies/${companyId}/theme`);
      if (!response.ok) {
        throw new Error('Failed to fetch theme');
      }
      const data = await response.json();

      setTheme({
        companyId: data.company_id,
        logoUrl: data.logo_url,
        colors: data.colors,
      });

      setColors({
        primary: data.colors.light.primary,
        secondary: data.colors.light.secondary,
        accent: data.colors.light.accent,
        textOnPrimary: data.colors.light.textOnPrimary,
        textOnSecondary: data.colors.light.textOnSecondary,
        textOnAccent: data.colors.light.textOnAccent,
        primaryDark: data.colors.dark?.primary || data.colors.light.primary,
        secondaryDark: data.colors.dark?.secondary || data.colors.light.secondary,
        accentDark: data.colors.dark?.accent || data.colors.light.accent,
      });

      setLogoPreview(data.logo_url);
      setContrastWarnings(data.contrast_validation.warnings.map((w: string) => ({
        field: 'general',
        message: w,
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const body: any = {
        primary_color: colors.primary,
        secondary_color: colors.secondary,
        accent_color: colors.accent,
        text_on_primary: colors.textOnPrimary,
        text_on_secondary: colors.textOnSecondary,
        text_on_accent: colors.textOnAccent,
        primary_color_dark: colors.primaryDark,
        secondary_color_dark: colors.secondaryDark,
        accent_color_dark: colors.accentDark,
      };

      // Add logo if uploaded
      if (logoFile) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(logoFile);
        });

        body.logo = {
          data: base64,
          mimeType: logoFile.type as 'image/png' | 'image/svg+xml',
        };
      }

      const response = await fetch(`/api/companies/${companyId}/theme`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save theme');
      }

      const data = await response.json();

      const updatedTheme: TenantTheme = {
        companyId: data.company_id,
        logoUrl: data.logo_url,
        colors: data.colors,
      };

      setTheme(updatedTheme);
      setContrastWarnings(data.contrast_validation.warnings.map((w: string) => ({
        field: 'general',
        message: w,
      })));

      // Apply theme immediately
      applyTheme(updatedTheme, previewMode);

      onSave?.(updatedTheme);

      alert('Theme saved successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save theme');
    } finally {
      setSaving(false);
    }
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/png', 'image/svg+xml'].includes(file.type)) {
      setError('Logo must be PNG or SVG format');
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo must be less than 2MB');
      return;
    }

    setLogoFile(file);
    setError(null);
  }

  function handleColorChange(field: keyof typeof colors, value: string) {
    setColors((prev) => ({ ...prev, [field]: value }));
  }

  function handlePreviewToggle() {
    const newMode = previewMode === 'light' ? 'dark' : 'light';
    setPreviewMode(newMode);
    if (theme) {
      applyTheme(theme, newMode);
    }
  }

  if (loading) {
    return <div className="p-4">Loading theme...</div>;
  }

  return (
    <div className="theme-editor mx-auto max-w-4xl p-6">
      <h2 className="mb-6 text-2xl font-bold">Brand Theme Editor</h2>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800">
          <strong>Error:</strong> {error}
        </div>
      )}

      {contrastWarnings.length > 0 && (
        <div className="mb-4 rounded-md bg-yellow-50 p-4">
          <strong className="text-yellow-800">WCAG AA Warnings:</strong>
          <ul className="mt-2 list-inside list-disc text-sm text-yellow-700">
            {contrastWarnings.map((warning, idx) => (
              <li key={idx}>{warning.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Logo Upload */}
      <section className="mb-8 rounded-lg border border-border bg-background p-6">
        <h3 className="mb-4 text-lg font-semibold">Logo</h3>
        <div className="flex items-start gap-6">
          <div className="flex-1">
            <label htmlFor="logo-upload" className="btn-secondary cursor-pointer">
              {logoFile ? 'Change Logo' : 'Upload Logo'}
            </label>
            <input
              id="logo-upload"
              type="file"
              accept="image/png,image/svg+xml"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <p className="mt-2 text-sm text-muted-foreground">
              PNG or SVG, max 2MB
            </p>
          </div>
          {logoPreview && (
            <div className="h-24 w-24 rounded border border-border bg-muted p-2">
              <img
                src={logoPreview}
                alt="Logo preview"
                className="h-full w-full object-contain"
              />
            </div>
          )}
        </div>
      </section>

      {/* Color Pickers */}
      <section className="mb-8 rounded-lg border border-border bg-background p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Brand Colors</h3>
          <button
            onClick={handlePreviewToggle}
            className="btn-secondary"
            aria-label={`Switch to ${previewMode === 'light' ? 'dark' : 'light'} mode`}
          >
            {previewMode === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Light Mode Colors */}
          <div>
            <h4 className="mb-3 font-medium">Light Mode</h4>
            <ColorInput
              label="Primary Color"
              value={colors.primary}
              onChange={(v) => handleColorChange('primary', v)}
            />
            <ColorInput
              label="Secondary Color"
              value={colors.secondary}
              onChange={(v) => handleColorChange('secondary', v)}
            />
            <ColorInput
              label="Accent Color"
              value={colors.accent}
              onChange={(v) => handleColorChange('accent', v)}
            />
          </div>

          {/* Dark Mode Colors */}
          <div>
            <h4 className="mb-3 font-medium">Dark Mode (Optional)</h4>
            <ColorInput
              label="Primary Color (Dark)"
              value={colors.primaryDark}
              onChange={(v) => handleColorChange('primaryDark', v)}
            />
            <ColorInput
              label="Secondary Color (Dark)"
              value={colors.secondaryDark}
              onChange={(v) => handleColorChange('secondaryDark', v)}
            />
            <ColorInput
              label="Accent Color (Dark)"
              value={colors.accentDark}
              onChange={(v) => handleColorChange('accentDark', v)}
            />
          </div>
        </div>

        {/* Text Colors */}
        <div className="mt-6 border-t border-border pt-6">
          <h4 className="mb-3 font-medium">Text Colors (for contrast)</h4>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <ColorInput
              label="Text on Primary"
              value={colors.textOnPrimary}
              onChange={(v) => handleColorChange('textOnPrimary', v)}
            />
            <ColorInput
              label="Text on Secondary"
              value={colors.textOnSecondary}
              onChange={(v) => handleColorChange('textOnSecondary', v)}
            />
            <ColorInput
              label="Text on Accent"
              value={colors.textOnAccent}
              onChange={(v) => handleColorChange('textOnAccent', v)}
            />
          </div>
        </div>
      </section>

      {/* Preview */}
      <section className="mb-8 rounded-lg border border-border bg-background p-6">
        <h3 className="mb-4 text-lg font-semibold">Preview</h3>
        <div className="space-y-4">
          <button
            style={{
              backgroundColor: previewMode === 'light' ? colors.primary : colors.primaryDark,
              color: colors.textOnPrimary,
            }}
            className="rounded px-4 py-2"
          >
            Primary Button
          </button>
          <button
            style={{
              backgroundColor: previewMode === 'light' ? colors.secondary : colors.secondaryDark,
              color: colors.textOnSecondary,
            }}
            className="ml-4 rounded px-4 py-2"
          >
            Secondary Button
          </button>
          <button
            style={{
              backgroundColor: previewMode === 'light' ? colors.accent : colors.accentDark,
              color: colors.textOnAccent,
            }}
            className="ml-4 rounded px-4 py-2"
          >
            Accent Button
          </button>
        </div>
      </section>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <button onClick={() => window.location.reload()} className="btn-secondary">
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary"
        >
          {saving ? 'Saving...' : 'Save Theme'}
        </button>
      </div>
    </div>
  );
}

// Color Input Component
function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <label className="flex-1 text-sm font-medium">{label}</label>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-16 cursor-pointer rounded border border-border"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        pattern="^#[0-9A-Fa-f]{6}$"
        className="w-24 rounded border border-border px-2 py-1 text-sm font-mono"
      />
    </div>
  );
}
