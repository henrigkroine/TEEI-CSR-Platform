/**
 * Deck Composer Component
 *
 * Main component for composing boardroom presentation decks.
 * Combines template selection, tile picker, and preview.
 *
 * @module deck/DeckComposer
 */

import { useState, useCallback, useMemo } from 'react';
import { DeckTemplateSelector } from './DeckTemplateSelector';
import { DeckTilePicker } from './DeckTilePicker';
import { DeckPreview } from './DeckPreview';
import type { DeckTemplate, DeckTile, DeckLocale, DeckConfig } from './types';
import { AVAILABLE_TEMPLATES, LOCALE_NAMES, THEME_NAMES } from './constants';

export interface DeckComposerProps {
  /** Company identifier */
  companyId: string;
  /** Period start date */
  periodStart: Date;
  /** Period end date */
  periodEnd: Date;
  /** Company logo URL */
  logoUrl?: string;
  /** Primary brand color */
  primaryColor?: string;
  /** Callback when export is requested */
  onExport: (config: DeckConfig) => Promise<void>;
  /** Callback when composer is closed */
  onClose?: () => void;
}

export function DeckComposer({
  companyId,
  periodStart,
  periodEnd,
  logoUrl,
  primaryColor,
  onExport,
  onClose,
}: DeckComposerProps) {
  // State management
  const [selectedTemplate, setSelectedTemplate] = useState<DeckTemplate>('quarterly');
  const [selectedTiles, setSelectedTiles] = useState<DeckTile[]>([]);
  const [selectedLocale, setSelectedLocale] = useState<DeckLocale>('en');
  const [selectedTheme, setSelectedTheme] = useState<'default' | 'corporate' | 'minimalist'>(
    'default'
  );
  const [includeWatermark, setIncludeWatermark] = useState(false);
  const [watermarkText, setWatermarkText] = useState('DRAFT');
  const [isExporting, setIsExporting] = useState(false);
  const [currentStep, setCurrentStep] = useState<'template' | 'tiles' | 'preview'>('template');

  // Initialize tiles when template changes
  const handleTemplateChange = useCallback(
    (template: DeckTemplate) => {
      setSelectedTemplate(template);
      const templateConfig = AVAILABLE_TEMPLATES.find((t) => t.id === template);
      if (templateConfig) {
        setSelectedTiles(templateConfig.defaultTiles);
      }
    },
    []
  );

  // Handle export
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const config: DeckConfig = {
        template: selectedTemplate,
        tiles: selectedTiles,
        locale: selectedLocale,
        companyId,
        periodStart,
        periodEnd,
        includeWatermark,
        watermarkText: includeWatermark ? watermarkText : undefined,
        theme: selectedTheme,
      };

      await onExport(config);
    } catch (error) {
      console.error('[DeckComposer] Export failed:', error);
      alert('Failed to export deck. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [
    selectedTemplate,
    selectedTiles,
    selectedLocale,
    companyId,
    periodStart,
    periodEnd,
    includeWatermark,
    watermarkText,
    selectedTheme,
    onExport,
  ]);

  // Validation
  const canExport = useMemo(() => {
    return selectedTiles.length > 0 && !isExporting;
  }, [selectedTiles, isExporting]);

  // Step navigation
  const handleNext = useCallback(() => {
    if (currentStep === 'template') {
      setCurrentStep('tiles');
    } else if (currentStep === 'tiles') {
      setCurrentStep('preview');
    }
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep === 'preview') {
      setCurrentStep('tiles');
    } else if (currentStep === 'tiles') {
      setCurrentStep('template');
    }
  }, [currentStep]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Create Boardroom Deck</h2>
          <p className="text-sm text-gray-600 mt-1">
            Period: {periodStart.toLocaleDateString()} - {periodEnd.toLocaleDateString()}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
            aria-label="Close deck composer"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Step indicator */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <nav aria-label="Progress">
          <ol className="flex items-center">
            {(['template', 'tiles', 'preview'] as const).map((step, index) => {
              const isActive = currentStep === step;
              const isCompleted =
                (step === 'template' && currentStep !== 'template') ||
                (step === 'tiles' && currentStep === 'preview');

              return (
                <li key={step} className="relative flex-1">
                  <button
                    onClick={() => setCurrentStep(step)}
                    className={`
                      group flex w-full items-center focus:outline-none focus:ring-2 focus:ring-blue-500 rounded
                      ${index !== 0 ? 'pl-8' : ''}
                    `}
                  >
                    {index !== 0 && (
                      <div
                        className={`absolute left-0 top-4 w-8 h-0.5 ${
                          isCompleted ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className={`
                        relative flex h-8 w-8 items-center justify-center rounded-full
                        ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : isCompleted
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border-2 border-gray-300 text-gray-500'
                        }
                      `}
                    >
                      {isCompleted ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <span className="text-sm font-semibold">{index + 1}</span>
                      )}
                    </span>
                    <span
                      className={`ml-3 text-sm font-medium ${
                        isActive ? 'text-blue-600' : 'text-gray-500'
                      }`}
                    >
                      {step === 'template' && 'Template'}
                      {step === 'tiles' && 'Content'}
                      {step === 'preview' && 'Preview'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-5xl mx-auto">
          {currentStep === 'template' && (
            <DeckTemplateSelector
              selectedTemplate={selectedTemplate}
              onChange={handleTemplateChange}
            />
          )}

          {currentStep === 'tiles' && (
            <div className="space-y-6">
              <DeckTilePicker
                selectedTiles={selectedTiles}
                onChange={setSelectedTiles}
              />

              {/* Additional options */}
              <div className="space-y-4 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Options</h3>

                {/* Locale selector */}
                <div>
                  <label
                    htmlFor="locale-select"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Language
                  </label>
                  <select
                    id="locale-select"
                    value={selectedLocale}
                    onChange={(e) => setSelectedLocale(e.target.value as DeckLocale)}
                    className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {Object.entries(LOCALE_NAMES).map(([code, name]) => (
                      <option key={code} value={code}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Theme selector */}
                <div>
                  <label
                    htmlFor="theme-select"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Theme
                  </label>
                  <select
                    id="theme-select"
                    value={selectedTheme}
                    onChange={(e) =>
                      setSelectedTheme(
                        e.target.value as 'default' | 'corporate' | 'minimalist'
                      )
                    }
                    className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {Object.entries(THEME_NAMES).map(([code, name]) => (
                      <option key={code} value={code}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Watermark option */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="watermark-checkbox"
                    checked={includeWatermark}
                    onChange={(e) => setIncludeWatermark(e.target.checked)}
                    className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="watermark-checkbox"
                      className="text-sm font-medium text-gray-700 cursor-pointer"
                    >
                      Include watermark
                    </label>
                    {includeWatermark && (
                      <input
                        type="text"
                        value={watermarkText}
                        onChange={(e) => setWatermarkText(e.target.value)}
                        placeholder="Watermark text (e.g., DRAFT)"
                        className="mt-2 w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'preview' && (
            <DeckPreview
              template={selectedTemplate}
              tiles={selectedTiles}
              locale={selectedLocale}
              theme={selectedTheme}
              logoUrl={logoUrl}
              primaryColor={primaryColor}
            />
          )}
        </div>
      </div>

      {/* Footer with navigation */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
        <div>
          {currentStep !== 'template' && (
            <button
              onClick={handleBack}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 rounded-lg"
            >
              ← Back
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {currentStep !== 'preview' && (
            <button
              onClick={handleNext}
              disabled={selectedTiles.length === 0 && currentStep === 'tiles'}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Continue →
            </button>
          )}

          {currentStep === 'preview' && (
            <button
              onClick={handleExport}
              disabled={!canExport}
              className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center gap-2"
            >
              {isExporting ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Export Deck
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
