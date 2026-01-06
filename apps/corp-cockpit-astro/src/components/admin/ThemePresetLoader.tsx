/**
 * Theme Preset Loader Component
 *
 * Allows company admins to select and apply pre-configured theme presets.
 * Integrates with company settings to persist theme selection.
 */

import React, { useState, useEffect } from 'react';
import {
  THEME_PRESETS,
  type ThemePreset,
  applyThemePreset,
  getThemePreset,
} from '../../lib/themes/presets';

interface ThemePresetLoaderProps {
  companyId: string;
  currentPresetId?: string;
  onPresetChanged?: (presetId: string) => void;
  userRole: string;
}

export const ThemePresetLoader: React.FC<ThemePresetLoaderProps> = ({
  companyId,
  currentPresetId,
  onPresetChanged,
  userRole,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<ThemePreset | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewPreset, setPreviewPreset] = useState<ThemePreset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Check permissions
  const canEditTheme = ['company_admin', 'system_admin'].includes(userRole);

  useEffect(() => {
    if (currentPresetId) {
      const preset = getThemePreset(currentPresetId);
      if (preset) {
        setSelectedPreset(preset);
      }
    }
  }, [currentPresetId]);

  const handlePresetSelect = async (preset: ThemePreset) => {
    if (!canEditTheme) {
      setError('You do not have permission to change the theme');
      return;
    }

    setError(null);
    setSuccess(null);
    setIsApplying(true);

    try {
      // Apply theme locally
      applyThemePreset(preset);

      // Save to backend
      const response = await fetch(`/api/companies/${companyId}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          branding: {
            theme_preset: preset.id,
            primary_color: preset.colors.primary,
            secondary_color: preset.colors.secondary,
            accent_color: preset.colors.accent,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save theme settings');
      }

      setSelectedPreset(preset);
      setSuccess(`Theme "${preset.name}" applied successfully!`);
      onPresetChanged?.(preset.id);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply theme');
    } finally {
      setIsApplying(false);
    }
  };

  const handlePreview = (preset: ThemePreset) => {
    setPreviewPreset(preset);
    setShowPreview(true);

    // Temporarily apply theme for preview
    applyThemePreset(preset);
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
    setPreviewPreset(null);

    // Restore original theme
    if (selectedPreset) {
      applyThemePreset(selectedPreset);
    }
  };

  const handleConfirmPreview = () => {
    if (previewPreset) {
      handlePresetSelect(previewPreset);
      setShowPreview(false);
      setPreviewPreset(null);
    }
  };

  return (
    <div className="theme-preset-loader">
      <div className="preset-header">
        <h2 className="text-2xl font-bold mb-2">Theme Presets</h2>
        <p className="text-gray-600 mb-6">
          Choose a pre-configured theme that matches your brand and industry.
          All presets meet WCAG AA accessibility standards.
        </p>
      </div>

      {error && (
        <div
          className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4"
          role="alert"
        >
          <strong className="font-semibold">Error: </strong>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div
          className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-4"
          role="alert"
        >
          <strong className="font-semibold">Success: </strong>
          <span>{success}</span>
        </div>
      )}

      {!canEditTheme && (
        <div
          className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-4"
          role="alert"
        >
          <strong className="font-semibold">Note: </strong>
          <span>You need admin permissions to change the company theme.</span>
        </div>
      )}

      <div className="preset-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {THEME_PRESETS.map((preset) => {
          const isSelected = selectedPreset?.id === preset.id;
          const isPreviewing = previewPreset?.id === preset.id;

          return (
            <div
              key={preset.id}
              className={`preset-card border rounded-lg p-6 transition-all ${
                isSelected
                  ? 'border-blue-500 shadow-lg ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              } ${!canEditTheme ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="preset-name-container flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">{preset.name}</h3>
                {isSelected && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    Active
                  </span>
                )}
              </div>

              <p className="text-sm text-gray-600 mb-4">{preset.description}</p>

              <div className="preset-colors mb-4">
                <div className="flex gap-2 mb-2">
                  <div
                    className="w-12 h-12 rounded border"
                    style={{ backgroundColor: preset.colors.primary }}
                    title={`Primary: ${preset.colors.primary}`}
                  />
                  <div
                    className="w-12 h-12 rounded border"
                    style={{ backgroundColor: preset.colors.secondary }}
                    title={`Secondary: ${preset.colors.secondary}`}
                  />
                  <div
                    className="w-12 h-12 rounded border"
                    style={{ backgroundColor: preset.colors.accent }}
                    title={`Accent: ${preset.colors.accent}`}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  WCAG {preset.wcagCompliance.level} compliant
                </p>
              </div>

              <div className="preset-actions flex gap-2">
                <button
                  onClick={() => handlePreview(preset)}
                  disabled={!canEditTheme || isApplying}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={`Preview ${preset.name} theme`}
                >
                  Preview
                </button>
                <button
                  onClick={() => handlePresetSelect(preset)}
                  disabled={!canEditTheme || isApplying || isSelected}
                  className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={`Apply ${preset.name} theme`}
                >
                  {isApplying && isPreviewing ? 'Applying...' : 'Apply'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview Modal */}
      {showPreview && previewPreset && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleCancelPreview}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="preview-title"
            aria-modal="true"
          >
            <h3 id="preview-title" className="text-xl font-bold mb-4">
              Preview: {previewPreset.name}
            </h3>
            <p className="text-gray-600 mb-6">
              This is how the "{previewPreset.name}" theme will look across your dashboard.
              Check the navigation, buttons, and overall appearance.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelPreview}
                className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPreview}
                disabled={isApplying}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isApplying ? 'Applying...' : 'Apply Theme'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>
        {`
          .theme-preset-loader {
            max-width: 1200px;
          }

          .preset-card {
            transition: transform 0.2s ease-in-out;
          }

          .preset-card:hover:not([disabled]) {
            transform: translateY(-2px);
          }

          @media (prefers-reduced-motion: reduce) {
            .preset-card {
              transition: none;
            }
          }
        `}
      </style>
    </div>
  );
};

export default ThemePresetLoader;
