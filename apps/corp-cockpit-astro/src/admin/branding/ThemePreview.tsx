/**
 * Theme Preview Component
 * Live preview of theme applied to sample UI elements
 */

import React from 'react';
import type { ThemeTokens, DarkModeColors } from '@teei/shared-types';

interface ThemePreviewProps {
  tokens: ThemeTokens;
  darkMode?: DarkModeColors;
  colorScheme: 'light' | 'dark';
}

export function ThemePreview({ tokens, darkMode, colorScheme }: ThemePreviewProps): JSX.Element {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-background border border-border rounded-lg p-6 shadow-base">
        <h2 className="text-3xl font-bold text-foreground mb-4">Theme Preview</h2>
        <p className="text-foreground mb-6">
          This preview shows how your theme will look in the application.
          All colors, typography, and spacing are applied in real-time.
        </p>

        {/* Buttons */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-foreground">Buttons</h3>
          <div className="flex flex-wrap gap-3">
            <button
              style={{
                backgroundColor: tokens.colors.primary,
                color: tokens.colors.primaryForeground,
              }}
              className="px-4 py-2 rounded-md font-medium transition-colors"
            >
              Primary Button
            </button>
            <button
              style={{
                backgroundColor: tokens.colors.secondary,
                color: tokens.colors.secondaryForeground,
              }}
              className="px-4 py-2 rounded-md font-medium transition-colors"
            >
              Secondary Button
            </button>
            <button
              style={{
                backgroundColor: tokens.colors.accent,
                color: tokens.colors.accentForeground,
              }}
              className="px-4 py-2 rounded-md font-medium transition-colors"
            >
              Accent Button
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="mt-8 space-y-4">
          <h3 className="text-xl font-semibold text-foreground">Cards</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              style={{
                backgroundColor: tokens.colors.muted,
                borderColor: tokens.colors.border,
              }}
              className="border rounded-lg p-4 shadow-sm"
            >
              <h4 className="font-semibold text-foreground mb-2">Card Title</h4>
              <p style={{ color: tokens.colors.mutedForeground }}>
                This is a sample card with muted background and border.
              </p>
            </div>
            <div
              style={{
                backgroundColor: tokens.colors.background,
                borderColor: tokens.colors.border,
              }}
              className="border rounded-lg p-4 shadow-sm"
            >
              <h4 className="font-semibold text-foreground mb-2">Another Card</h4>
              <p style={{ color: tokens.colors.foreground }}>
                This card uses the main background color.
              </p>
            </div>
          </div>
        </div>

        {/* Status Colors */}
        <div className="mt-8 space-y-4">
          <h3 className="text-xl font-semibold text-foreground">Status Colors</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div
              style={{
                backgroundColor: tokens.colors.success,
                color: tokens.colors.successForeground,
              }}
              className="px-4 py-3 rounded-md text-center font-medium"
            >
              Success
            </div>
            <div
              style={{
                backgroundColor: tokens.colors.warning,
                color: tokens.colors.warningForeground,
              }}
              className="px-4 py-3 rounded-md text-center font-medium"
            >
              Warning
            </div>
            <div
              style={{
                backgroundColor: tokens.colors.error,
                color: tokens.colors.errorForeground,
              }}
              className="px-4 py-3 rounded-md text-center font-medium"
            >
              Error
            </div>
            <div
              style={{
                backgroundColor: tokens.colors.info,
                color: tokens.colors.infoForeground,
              }}
              className="px-4 py-3 rounded-md text-center font-medium"
            >
              Info
            </div>
          </div>
        </div>

        {/* Typography */}
        <div className="mt-8 space-y-4">
          <h3 className="text-xl font-semibold text-foreground">Typography</h3>
          <div style={{ fontFamily: tokens.typography.fontFamily }} className="space-y-2">
            <p style={{ fontSize: tokens.typography.fontSize['3xl'] }} className="font-bold text-foreground">
              Large Heading
            </p>
            <p style={{ fontSize: tokens.typography.fontSize.xl }} className="font-semibold text-foreground">
              Medium Heading
            </p>
            <p style={{ fontSize: tokens.typography.fontSize.base }} className="text-foreground">
              Body text with normal weight using the configured font family.
            </p>
            <p style={{ fontSize: tokens.typography.fontSize.sm, color: tokens.colors.mutedForeground }}>
              Small text in muted color for less emphasis.
            </p>
          </div>
        </div>

        {/* Chart Colors */}
        <div className="mt-8 space-y-4">
          <h3 className="text-xl font-semibold text-foreground">Chart Colors</h3>
          <div className="flex gap-2 h-32">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                style={{ backgroundColor: (tokens.colors as any)[`chart${i}`] }}
                className="flex-1 rounded"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
