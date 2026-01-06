/**
 * Deck Composer Component
 *
 * Unified component for composing boardroom presentation decks.
 * Supports both wizard-based local flow and API-driven server flow.
 *
 * Features:
 * - Template selection (Quarterly, Annual, Investor, Impact, Impact Deep Dive)
 * - Tile picker for slide customization
 * - Extended locale selection (EN/ES/FR/NO/UK/HE/AR with RTL support)
 * - Theme configuration
 * - Live preview
 * - Both client-side wizard and server-side API deck creation
 *
 * @module components/deck/DeckComposer
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { DeckTemplateSelector } from './DeckTemplateSelector';
import { DeckTilePicker } from './DeckTilePicker';
import { DeckPreview } from './DeckPreview';
import type {
  DeckTemplate,
  DeckTemplateMetadata,
  DeckDefinition,
  DeckLocale,
} from '@teei/shared-types';
import type { DeckTile, DeckConfig } from './types';
import { AVAILABLE_TEMPLATES, LOCALE_NAMES, THEME_NAMES } from './constants';

export interface DeckComposerProps {
  /** Company identifier */
  companyId: string;
  /** Period start date (Date object for local flow) */
  periodStart?: Date;
  /** Period end date (Date object for local flow) */
  periodEnd?: Date;
  /** Period object (string dates for API flow) */
  period?: {
    start: string;
    end: string;
  };
  /** Company logo URL */
  logoUrl?: string;
  /** Primary brand color */
  primaryColor?: string;
  /** Callback when export is requested (local flow) */
  onExport?: (config: DeckConfig) => Promise<void>;
  /** Callback when deck is created (API flow) */
  onDeckCreated?: (deck: DeckDefinition) => void;
  /** Callback when composer is closed */
  onClose?: () => void;
  /** Callback when composer is cancelled (API flow) */
  onCancel?: () => void;
  /** Flow mode: 'wizard' (local) or 'api' (server) */
  mode?: 'wizard' | 'api';
}

// Extended locale list with RTL support
const LOCALES = [
  { code: 'en' as const, name: 'English', flag: '🇬🇧', rtl: false },
  { code: 'es' as const, name: 'Español', flag: '🇪🇸', rtl: false },
  { code: 'fr' as const, name: 'Français', flag: '🇫🇷', rtl: false },
  { code: 'no' as const, name: 'Norsk', flag: '🇳🇴', rtl: false },
  { code: 'uk' as const, name: 'Українська', flag: '🇺🇦', rtl: false },
  { code: 'he' as const, name: 'עברית', flag: '🇮🇱', rtl: true },
  { code: 'ar' as const, name: 'العربية', flag: '🇸🇦', rtl: true },
];

export function DeckComposer({
  companyId,
  periodStart,
  periodEnd,
  period,
  logoUrl,
  primaryColor,
  onExport,
  onDeckCreated,
  onClose,
  onCancel,
  mode = 'wizard',
}: DeckComposerProps) {
  // Determine flow mode based on props
  const isApiMode = mode === 'api' || (period !== undefined && onDeckCreated !== undefined);

  // Wizard mode state
  const [currentStep, setCurrentStep] = useState<'template' | 'tiles' | 'preview'>('template');
  const [selectedTiles, setSelectedTiles] = useState<DeckTile[]>([]);

  // API mode state
  const [step, setStep] = useState<'template' | 'customize' | 'review'>('template');
  const [templates, setTemplates] = useState<DeckTemplateMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedDeck, setGeneratedDeck] = useState<DeckDefinition | null>(null);

  // Shared state
  const [selectedTemplate, setSelectedTemplate] = useState<DeckTemplate>('quarterly');
  const [selectedLocale, setSelectedLocale] = useState<DeckLocale>('en');
  const [selectedTheme, setSelectedTheme] = useState<'default' | 'corporate' | 'minimalist'>('default');

  // API mode: Fetch available templates
  useEffect(() => {
    if (isApiMode) {
      fetchTemplates();
    }
  }, [isApiMode]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v2/deck/templates');
      if (!response.ok) throw new Error('Failed to fetch templates');
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  // API mode: Generate deck
  const handleGenerateDeck = async () => {
    if (!period) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/v2/deck/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          template: selectedTemplate,
          period,
          locale: selectedLocale,
          theme: {
            name: selectedTheme,
            colors: {
              primary: primaryColor || '#00393f',
              secondary: '#ffffff',
              accent: '#e6f4f5',
              textOnPrimary: '#ffffff',
              textOnSecondary: '#00393f',
              textOnAccent: '#00393f',
            },
            logo: logoUrl ? {
              url: logoUrl,
              position: 'top-right' as const,
              width: 120,
              height: 40,
            } : undefined,
          },
          options: {
            includeCharts: true,
            includeEvidence: true,
            includeSpeakerNotes: false,
            maxSlides: 20,
            tone: 'formal' as const,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate deck');
      }

      const data = await response.json();
      setGeneratedDeck(data.deck);
      setStep('review');

      if (onDeckCreated) {
        onDeckCreated(data.deck);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate deck');
    } finally {
      setLoading(false);
    }
  };

  // Wizard mode: Generate deck config
  const deckConfig = useMemo<DeckConfig | undefined>(() => {
    if (isApiMode || !periodStart || !periodEnd) return undefined;

    return {
      template: selectedTemplate,
      tiles: selectedTiles,
      locale: selectedLocale,
      theme: selectedTheme,
      period: {
        start: periodStart,
        end: periodEnd,
      },
      branding: {
        logoUrl,
        primaryColor,
      },
    };
  }, [
    isApiMode,
    selectedTemplate,
    selectedTiles,
    selectedLocale,
    selectedTheme,
    periodStart,
    periodEnd,
    logoUrl,
    primaryColor,
  ]);

  // Wizard mode: Handle export
  const handleExport = useCallback(async () => {
    if (!deckConfig || !onExport) return;

    try {
      await onExport(deckConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  }, [deckConfig, onExport]);

  // Navigation handlers
  const handleNextStep = () => {
    if (isApiMode) {
      if (step === 'template') setStep('customize');
      else if (step === 'customize') handleGenerateDeck();
    } else {
      if (currentStep === 'template') setCurrentStep('tiles');
      else if (currentStep === 'tiles') setCurrentStep('preview');
    }
  };

  const handlePreviousStep = () => {
    if (isApiMode) {
      if (step === 'customize') setStep('template');
      else if (step === 'review') setStep('customize');
    } else {
      if (currentStep === 'tiles') setCurrentStep('template');
      else if (currentStep === 'preview') setCurrentStep('tiles');
    }
  };

  const activeStep = isApiMode ? step : currentStep;
  const canGoNext = isApiMode
    ? (step === 'template' && selectedTemplate) || (step === 'customize')
    : (currentStep === 'template' && selectedTemplate) ||
      (currentStep === 'tiles' && selectedTiles.length > 0);

  // RTL support
  const selectedLocaleData = LOCALES.find((l) => l.code === selectedLocale);
  const isRtl = selectedLocaleData?.rtl || false;

  return (
    <div className="deck-composer" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="deck-composer__header">
        <h2 className="deck-composer__title">
          {isApiMode ? 'Create Presentation Deck' : 'Deck Composer'}
        </h2>
        <button
          type="button"
          className="deck-composer__close"
          onClick={onClose || onCancel}
          aria-label="Close"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {error && (
        <div className="deck-composer__error" role="alert">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm1 15H9v-2h2v2zm0-4H9V5h2v6z" />
          </svg>
          {error}
        </div>
      )}

      <div className="deck-composer__body">
        {/* Step 1: Template Selection */}
        {activeStep === 'template' && (
          <div className="deck-composer__step">
            <h3 className="deck-composer__step-title">Select Template</h3>
            <DeckTemplateSelector
              templates={isApiMode ? templates : AVAILABLE_TEMPLATES}
              selected={selectedTemplate}
              onSelect={setSelectedTemplate}
            />
          </div>
        )}

        {/* Step 2: Tiles/Customization */}
        {(activeStep === 'tiles' || activeStep === 'customize') && (
          <div className="deck-composer__step">
            <h3 className="deck-composer__step-title">
              {isApiMode ? 'Customize Deck' : 'Select Tiles'}
            </h3>

            {/* Locale Selection */}
            <div className="deck-composer__section">
              <label className="deck-composer__label">Language</label>
              <div className="deck-composer__locale-grid">
                {LOCALES.map((locale) => (
                  <button
                    key={locale.code}
                    type="button"
                    className={`deck-composer__locale-option ${
                      selectedLocale === locale.code ? 'active' : ''
                    }`}
                    onClick={() => setSelectedLocale(locale.code)}
                  >
                    <span className="locale-flag">{locale.flag}</span>
                    <span className="locale-name">{locale.name}</span>
                    {locale.rtl && <span className="locale-rtl-badge">RTL</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme Selection */}
            <div className="deck-composer__section">
              <label className="deck-composer__label">Theme</label>
              <div className="deck-composer__theme-grid">
                {(['default', 'corporate', 'minimalist'] as const).map((theme) => (
                  <button
                    key={theme}
                    type="button"
                    className={`deck-composer__theme-option ${
                      selectedTheme === theme ? 'active' : ''
                    }`}
                    onClick={() => setSelectedTheme(theme)}
                  >
                    {THEME_NAMES[theme]}
                  </button>
                ))}
              </div>
            </div>

            {/* Tile Picker (Wizard mode only) */}
            {!isApiMode && (
              <DeckTilePicker
                template={selectedTemplate}
                selectedTiles={selectedTiles}
                onTilesChange={setSelectedTiles}
              />
            )}
          </div>
        )}

        {/* Step 3: Preview/Review */}
        {(activeStep === 'preview' || activeStep === 'review') && (
          <div className="deck-composer__step">
            <h3 className="deck-composer__step-title">
              {isApiMode ? 'Review Deck' : 'Preview'}
            </h3>
            <DeckPreview
              config={isApiMode ? undefined : deckConfig}
              deck={isApiMode ? generatedDeck : undefined}
            />
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="deck-composer__footer">
        {activeStep !== 'template' && activeStep !== 'review' && (
          <button
            type="button"
            className="deck-composer__button deck-composer__button--secondary"
            onClick={handlePreviousStep}
            disabled={loading}
          >
            Back
          </button>
        )}

        <div className="deck-composer__footer-actions">
          {(activeStep === 'template' || activeStep === 'customize' || activeStep === 'tiles') && (
            <button
              type="button"
              className="deck-composer__button deck-composer__button--primary"
              onClick={handleNextStep}
              disabled={!canGoNext || loading}
            >
              {loading ? (
                <>
                  <svg
                    className="deck-composer__spinner"
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                  >
                    <circle
                      cx="10"
                      cy="10"
                      r="8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray="50"
                      strokeDashoffset="25"
                    />
                  </svg>
                  Generating...
                </>
              ) : isApiMode && activeStep === 'customize' ? (
                'Generate Deck'
              ) : (
                'Next'
              )}
            </button>
          )}

          {(activeStep === 'preview' || activeStep === 'review') && !isApiMode && onExport && (
            <button
              type="button"
              className="deck-composer__button deck-composer__button--primary"
              onClick={handleExport}
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg
                    className="deck-composer__spinner"
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                  >
                    <circle
                      cx="10"
                      cy="10"
                      r="8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray="50"
                      strokeDashoffset="25"
                    />
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13 8V2H7v6H2l8 8 8-8h-5zM0 18h20v2H0v-2z" />
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
