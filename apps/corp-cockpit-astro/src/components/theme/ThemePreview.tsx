import { type ThemeColors, type FontConfig } from '@utils/themeValidator';

export interface ThemePreviewProps {
  theme: {
    colors: ThemeColors;
    logo?: {
      url: string;
      alt?: string;
    };
    typography: FontConfig;
  };
  className?: string;
}

export default function ThemePreview({ theme, className = '' }: ThemePreviewProps) {
  const { colors, logo, typography } = theme;

  // Build style object for preview
  const previewStyle = {
    '--preview-primary': colors.primary,
    '--preview-secondary': colors.secondary || colors.primary,
    '--preview-background': colors.background,
    '--preview-foreground': colors.foreground,
    '--preview-font-body': typography.families?.primary || 'system-ui, sans-serif',
    '--preview-font-heading': typography.families?.heading || typography.families?.primary || 'system-ui, sans-serif',
    '--preview-font-size-body': `${typography.sizes?.body || 16}px`,
    '--preview-font-size-heading': `${typography.sizes?.heading || 24}px`,
    '--preview-font-weight-normal': typography.weights?.normal || 400,
    '--preview-font-weight-bold': typography.weights?.bold || 700
  } as React.CSSProperties;

  return (
    <div className={`${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Theme Preview
      </h3>

      {/* Preview Container */}
      <div
        className="rounded-lg border-2 border-gray-300 dark:border-gray-600 overflow-hidden shadow-lg"
        style={previewStyle}
      >
        {/* Header */}
        <div
          className="p-6"
          style={{
            backgroundColor: 'var(--preview-background)',
            color: 'var(--preview-foreground)'
          }}
        >
          <div className="flex items-center gap-4 mb-6">
            {logo?.url && (
              <img
                src={logo.url}
                alt={logo.alt || 'Partner logo'}
                className="h-12 object-contain"
              />
            )}
            <div>
              <h2
                className="text-2xl font-bold"
                style={{
                  fontFamily: 'var(--preview-font-heading)',
                  fontSize: 'var(--preview-font-size-heading)',
                  fontWeight: 'var(--preview-font-weight-bold)',
                  color: 'var(--preview-primary)'
                }}
              >
                CSR Dashboard
              </h2>
              <p
                className="text-sm"
                style={{
                  fontFamily: 'var(--preview-font-body)',
                  fontSize: 'calc(var(--preview-font-size-body) * 0.875)',
                  color: 'var(--preview-foreground)',
                  opacity: 0.7
                }}
              >
                Corporate Social Responsibility Metrics
              </p>
            </div>
          </div>

          {/* Sample Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div
              className="p-4 rounded-lg"
              style={{
                backgroundColor: 'var(--preview-primary)',
                color: colors.background
              }}
            >
              <p
                className="text-xs mb-1 opacity-80"
                style={{
                  fontFamily: 'var(--preview-font-body)',
                  fontWeight: 'var(--preview-font-weight-normal)'
                }}
              >
                SROI
              </p>
              <p
                className="text-2xl font-bold"
                style={{
                  fontFamily: 'var(--preview-font-heading)',
                  fontWeight: 'var(--preview-font-weight-bold)'
                }}
              >
                3.2x
              </p>
            </div>

            <div
              className="p-4 rounded-lg"
              style={{
                backgroundColor: 'var(--preview-secondary)',
                color: colors.background
              }}
            >
              <p
                className="text-xs mb-1 opacity-80"
                style={{
                  fontFamily: 'var(--preview-font-body)',
                  fontWeight: 'var(--preview-font-weight-normal)'
                }}
              >
                VIS Score
              </p>
              <p
                className="text-2xl font-bold"
                style={{
                  fontFamily: 'var(--preview-font-heading)',
                  fontWeight: 'var(--preview-font-weight-bold)'
                }}
              >
                85
              </p>
            </div>

            <div
              className="p-4 rounded-lg border"
              style={{
                borderColor: 'var(--preview-primary)',
                backgroundColor: 'transparent',
                color: 'var(--preview-foreground)'
              }}
            >
              <p
                className="text-xs mb-1 opacity-70"
                style={{
                  fontFamily: 'var(--preview-font-body)',
                  fontWeight: 'var(--preview-font-weight-normal)'
                }}
              >
                Participants
              </p>
              <p
                className="text-2xl font-bold"
                style={{
                  fontFamily: 'var(--preview-font-heading)',
                  fontWeight: 'var(--preview-font-weight-bold)',
                  color: 'var(--preview-primary)'
                }}
              >
                247
              </p>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div
          className="p-6 border-t"
          style={{
            backgroundColor: 'var(--preview-background)',
            borderColor: 'var(--preview-foreground)',
            borderTopWidth: '1px',
            borderTopStyle: 'solid',
            opacity: 0.2
          }}
        >
          <h3
            className="font-semibold mb-3"
            style={{
              fontFamily: 'var(--preview-font-heading)',
              fontSize: 'calc(var(--preview-font-size-heading) * 0.75)',
              fontWeight: 'var(--preview-font-weight-bold)',
              color: 'var(--preview-foreground)'
            }}
          >
            Sample Content
          </h3>
          <p
            style={{
              fontFamily: 'var(--preview-font-body)',
              fontSize: 'var(--preview-font-size-body)',
              fontWeight: 'var(--preview-font-weight-normal)',
              color: 'var(--preview-foreground)',
              opacity: 0.8,
              lineHeight: 1.6
            }}
          >
            This preview demonstrates how your branding will appear in the CSR reports and
            dashboard. The colors, typography, and logo are applied consistently throughout
            the interface.
          </p>

          {/* Sample Button */}
          <button
            className="mt-4 px-4 py-2 rounded-md font-medium transition-opacity hover:opacity-90"
            style={{
              backgroundColor: 'var(--preview-primary)',
              color: colors.background,
              fontFamily: 'var(--preview-font-body)',
              fontSize: 'var(--preview-font-size-body)',
              fontWeight: 'var(--preview-font-weight-bold)'
            }}
          >
            Sample Button
          </button>
        </div>
      </div>

      {/* Color Swatches */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
            Primary Color
          </p>
          <div className="flex items-center gap-2">
            <div
              className="w-12 h-12 rounded border border-gray-300 dark:border-gray-600"
              style={{ backgroundColor: colors.primary }}
              aria-label={`Primary color: ${colors.primary}`}
            />
            <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
              {colors.primary}
            </span>
          </div>
        </div>

        {colors.secondary && (
          <div>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              Secondary Color
            </p>
            <div className="flex items-center gap-2">
              <div
                className="w-12 h-12 rounded border border-gray-300 dark:border-gray-600"
                style={{ backgroundColor: colors.secondary }}
                aria-label={`Secondary color: ${colors.secondary}`}
              />
              <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                {colors.secondary}
              </span>
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
            Background
          </p>
          <div className="flex items-center gap-2">
            <div
              className="w-12 h-12 rounded border border-gray-300 dark:border-gray-600"
              style={{ backgroundColor: colors.background }}
              aria-label={`Background color: ${colors.background}`}
            />
            <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
              {colors.background}
            </span>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
            Foreground
          </p>
          <div className="flex items-center gap-2">
            <div
              className="w-12 h-12 rounded border border-gray-300 dark:border-gray-600"
              style={{ backgroundColor: colors.foreground }}
              aria-label={`Foreground color: ${colors.foreground}`}
            />
            <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
              {colors.foreground}
            </span>
          </div>
        </div>
      </div>

      {/* Typography Info */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Typography
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600 dark:text-gray-400 mb-1">Primary Font:</p>
            <p className="font-mono text-gray-900 dark:text-white">
              {typography.families?.primary || 'system-ui, sans-serif'}
            </p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400 mb-1">Heading Font:</p>
            <p className="font-mono text-gray-900 dark:text-white">
              {typography.families?.heading || typography.families?.primary || 'system-ui, sans-serif'}
            </p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400 mb-1">Body Size:</p>
            <p className="font-mono text-gray-900 dark:text-white">
              {typography.sizes?.body || 16}px
            </p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400 mb-1">Heading Size:</p>
            <p className="font-mono text-gray-900 dark:text-white">
              {typography.sizes?.heading || 24}px
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
