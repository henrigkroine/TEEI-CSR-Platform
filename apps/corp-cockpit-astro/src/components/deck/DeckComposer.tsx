/**
 * Deck Composer Component
 *
 * UI for creating and configuring executive presentation decks.
 * Features:
 * - Template selection (Quarterly, Annual, Investor, Impact)
 * - Tile picker for slide customization
 * - Locale selection (EN/ES/FR/NO/UK/HE/AR)
 * - Theme configuration
 * - Live preview
 *
 * @module components/deck/DeckComposer
 */

import { useState, useEffect } from 'react';
import type { DeckTemplate, DeckTemplateMetadata, DeckDefinition } from '@teei/shared-types';

export interface DeckComposerProps {
  companyId: string;
  period: {
    start: string;
    end: string;
  };
  onDeckCreated?: (deck: DeckDefinition) => void;
  onCancel?: () => void;
}

const LOCALES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'no', name: 'Norsk', flag: '🇳🇴' },
  { code: 'uk', name: 'Українська', flag: '🇺🇦' },
  { code: 'he', name: 'עברית', flag: '🇮🇱', rtl: true },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', rtl: true },
];

export function DeckComposer({
  companyId,
  period,
  onDeckCreated,
  onCancel,
}: DeckComposerProps) {
  const [step, setStep] = useState<'template' | 'customize' | 'review'>('template');
  const [templates, setTemplates] = useState<DeckTemplateMetadata[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<DeckTemplate | null>(null);
  const [selectedLocale, setSelectedLocale] = useState<string>('en');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available templates
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/v2/deck/templates', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }

      const data = await response.json();
      setTemplates(data.templates);
    } catch (err) {
      console.error('[DeckComposer] Error fetching templates:', err);
      setError('Failed to load templates. Please try again.');
    }
  };

  const handleTemplateSelect = (template: DeckTemplate) => {
    setSelectedTemplate(template);
    setStep('customize');
  };

  const handleCreateDeck = async () => {
    if (!selectedTemplate) return;

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/v2/deck/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          companyId,
          template: selectedTemplate,
          period,
          locale: selectedLocale,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create deck');
      }

      const deck: DeckDefinition = await response.json();

      console.log('[DeckComposer] Created deck:', deck.id);

      if (onDeckCreated) {
        onDeckCreated(deck);
      }
    } catch (err) {
      console.error('[DeckComposer] Error creating deck:', err);
      setError('Failed to create deck. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const selectedTemplateMetadata = templates.find((t) => t.id === selectedTemplate);
  const selectedLocaleInfo = LOCALES.find((l) => l.code === selectedLocale);

  return (
    <div
      className="deck-composer"
      dir={selectedLocaleInfo?.rtl ? 'rtl' : 'ltr'}
      role="dialog"
      aria-labelledby="deck-composer-title"
    >
      <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        {/* Header */}
        <header className="mb-6">
          <h1 id="deck-composer-title" className="text-3xl font-bold text-gray-900">
            Create Executive Deck
          </h1>
          <p className="text-gray-600 mt-2">
            Period: {period.start} to {period.end}
          </p>

          {/* Progress Steps */}
          <div className="flex items-center gap-4 mt-4" role="progressbar" aria-valuenow={step === 'template' ? 1 : step === 'customize' ? 2 : 3} aria-valuemin={1} aria-valuemax={3}>
            <StepIndicator
              number={1}
              label="Select Template"
              active={step === 'template'}
              completed={step !== 'template'}
            />
            <div className="flex-1 h-0.5 bg-gray-300" />
            <StepIndicator
              number={2}
              label="Customize"
              active={step === 'customize'}
              completed={step === 'review'}
            />
            <div className="flex-1 h-0.5 bg-gray-300" />
            <StepIndicator
              number={3}
              label="Review"
              active={step === 'review'}
              completed={false}
            />
          </div>
        </header>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg" role="alert">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Step 1: Template Selection */}
        {step === 'template' && (
          <section aria-label="Template selection">
            <h2 className="text-xl font-semibold mb-4">Choose a Template</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template.id)}
                  className="p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:shadow-md transition-all text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label={`Select ${template.name} template`}
                >
                  <h3 className="text-lg font-bold text-gray-900">{template.name}</h3>
                  <p className="text-gray-600 mt-2">{template.description}</p>
                  <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                    <span>{template.estimatedSlides} slides</span>
                    <span>•</span>
                    <span>{template.supportedLocales.length} languages</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Cancel
              </button>
            </div>
          </section>
        )}

        {/* Step 2: Customize */}
        {step === 'customize' && selectedTemplateMetadata && (
          <section aria-label="Deck customization">
            <h2 className="text-xl font-semibold mb-4">
              Customize: {selectedTemplateMetadata.name}
            </h2>

            {/* Locale Selection */}
            <div className="mb-6">
              <label htmlFor="locale-select" className="block text-sm font-medium text-gray-700 mb-2">
                Language
              </label>
              <select
                id="locale-select"
                value={selectedLocale}
                onChange={(e) => setSelectedLocale(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Select presentation language"
              >
                {LOCALES.map((locale) => (
                  <option key={locale.code} value={locale.code}>
                    {locale.flag} {locale.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-sm text-gray-500">
                {selectedLocaleInfo?.rtl
                  ? 'RTL layout will be applied for right-to-left languages.'
                  : 'Left-to-right layout will be used.'}
              </p>
            </div>

            {/* Slide Preview */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Included Slides</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {selectedTemplateMetadata.defaultSlides.map((slideType, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    <div className="text-xs text-gray-500">Slide {index + 1}</div>
                    <div className="text-sm font-medium text-gray-900 capitalize">
                      {slideType.replace('-', ' ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Citation Info */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
              <h3 className="text-sm font-semibold text-blue-900">
                Per-paragraph Citation Counts
              </h3>
              <p className="text-sm text-blue-800 mt-1">
                Each narrative paragraph will display citation counts and evidence IDs. Use the
                "Why this section?" explainer panel to understand the purpose of each slide.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center">
              <button
                onClick={() => setStep('template')}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep('review')}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Review →
              </button>
            </div>
          </section>
        )}

        {/* Step 3: Review & Create */}
        {step === 'review' && selectedTemplateMetadata && (
          <section aria-label="Review deck configuration">
            <h2 className="text-xl font-semibold mb-4">Review & Create</h2>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="font-medium text-gray-700">Template:</span>
                <span className="text-gray-900">{selectedTemplateMetadata.name}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="font-medium text-gray-700">Language:</span>
                <span className="text-gray-900">
                  {selectedLocaleInfo?.flag} {selectedLocaleInfo?.name}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="font-medium text-gray-700">Period:</span>
                <span className="text-gray-900">
                  {period.start} to {period.end}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="font-medium text-gray-700">Estimated Slides:</span>
                <span className="text-gray-900">{selectedTemplateMetadata.estimatedSlides}</span>
              </div>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
              <h3 className="text-sm font-semibold text-green-900">Ready to Create</h3>
              <p className="text-sm text-green-800 mt-1">
                Your deck will be generated with live data from the selected period. You can edit
                slides and export to PPTX after creation.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center">
              <button
                onClick={() => setStep('customize')}
                disabled={isCreating}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                ← Back
              </button>
              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  disabled={isCreating}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateDeck}
                  disabled={isCreating}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  aria-busy={isCreating}
                >
                  {isCreating ? (
                    <>
                      <span className="inline-block animate-spin mr-2">⏳</span>
                      Creating...
                    </>
                  ) : (
                    'Create Deck'
                  )}
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

/**
 * Step Indicator Component
 */
function StepIndicator({
  number,
  label,
  active,
  completed,
}: {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`
          w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm
          transition-colors
          ${
            active
              ? 'bg-blue-600 text-white'
              : completed
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-600'
          }
        `}
        aria-current={active ? 'step' : undefined}
      >
        {completed ? '✓' : number}
      </div>
      <div
        className={`
          text-xs font-medium
          ${active ? 'text-blue-600' : completed ? 'text-green-600' : 'text-gray-500'}
        `}
      >
        {label}
      </div>
    </div>
  );
}
