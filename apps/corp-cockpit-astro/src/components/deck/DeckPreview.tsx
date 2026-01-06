/**
 * Deck Preview Component
 *
 * Shows slide thumbnails, citation counts, and theme preview.
 * Provides visual confirmation before export.
 *
 * @module deck/DeckPreview
 */

import { useMemo } from 'react';
import type { DeckTile, DeckTemplate, DeckLocale } from './types';
import { AVAILABLE_TILES, AVAILABLE_TEMPLATES } from './constants';

export interface DeckPreviewProps {
  /** Selected template */
  template: DeckTemplate;
  /** Selected tiles in order */
  tiles: DeckTile[];
  /** Selected locale */
  locale: DeckLocale;
  /** Theme name */
  theme?: 'default' | 'corporate' | 'minimalist';
  /** Company logo URL */
  logoUrl?: string;
  /** Primary brand color */
  primaryColor?: string;
}

export function DeckPreview({
  template,
  tiles,
  locale,
  theme = 'default',
  logoUrl,
  primaryColor = '#2563eb',
}: DeckPreviewProps) {
  // Calculate deck statistics
  const deckStats = useMemo(() => {
    const templateConfig = AVAILABLE_TEMPLATES.find((t) => t.id === template);
    if (!templateConfig) {
      return {
        totalSlides: 0,
        citationCount: 0,
        estimatedPageCount: 0,
      };
    }

    // Title slide + 1 slide per tile + closing slide
    const contentSlides = tiles.length;
    const totalSlides = 1 + contentSlides + 1;

    // Estimate citations (2-4 per slide for content slides)
    const citationCount = contentSlides * 3;

    // Estimate page count (typically 1 slide per page)
    const estimatedPageCount = totalSlides;

    return {
      totalSlides,
      citationCount,
      estimatedPageCount,
    };
  }, [template, tiles]);

  // Generate slide previews
  const slidePreviews = useMemo(() => {
    const previews: Array<{ title: string; type: string; number: number }> = [];

    // Title slide
    previews.push({
      number: 1,
      title: `${AVAILABLE_TEMPLATES.find((t) => t.id === template)?.name} - Cover`,
      type: 'title',
    });

    // Content slides (one per tile)
    tiles.forEach((tileId, index) => {
      const tile = AVAILABLE_TILES.find((t) => t.id === tileId);
      if (tile) {
        previews.push({
          number: index + 2,
          title: tile.name,
          type: tile.category === 'charts' ? 'chart' : 'content',
        });
      }
    });

    // Closing slide
    previews.push({
      number: previews.length + 1,
      title: 'Looking Forward',
      type: 'content',
    });

    return previews;
  }, [template, tiles]);

  // Theme preview colors
  const themeColors = useMemo(() => {
    switch (theme) {
      case 'corporate':
        return {
          primary: '#1F4E78',
          secondary: '#2E5C8A',
          accent: '#4E7BA0',
        };
      case 'minimalist':
        return {
          primary: '#000000',
          secondary: '#444444',
          accent: '#888888',
        };
      default:
        return {
          primary: primaryColor,
          secondary: '#70AD47',
          accent: '#FFC000',
        };
    }
  }, [theme, primaryColor]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Deck Preview</h3>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path
                fillRule="evenodd"
                d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                clipRule="evenodd"
              />
            </svg>
            {deckStats.totalSlides} slides
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            ~{deckStats.citationCount} citations
          </span>
        </div>
      </div>

      {/* Deck statistics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-2xl font-bold text-blue-900">
            {deckStats.totalSlides}
          </div>
          <div className="text-sm text-blue-700">Total Slides</div>
        </div>
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-2xl font-bold text-green-900">
            {deckStats.citationCount}
          </div>
          <div className="text-sm text-green-700">Estimated Citations</div>
        </div>
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="text-2xl font-bold text-purple-900">
            {deckStats.estimatedPageCount}
          </div>
          <div className="text-sm text-purple-700">Estimated Pages</div>
        </div>
      </div>

      {/* Theme preview */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Theme Preview</h4>
        <div className="flex items-center gap-4">
          {/* Logo preview */}
          {logoUrl && (
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-white border border-gray-300 rounded flex items-center justify-center overflow-hidden">
                <img
                  src={logoUrl}
                  alt="Company logo"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </div>
          )}

          {/* Color palette */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div
                  className="w-12 h-12 rounded border border-gray-300"
                  style={{ backgroundColor: themeColors.primary }}
                  title="Primary color"
                />
                <div
                  className="w-12 h-12 rounded border border-gray-300"
                  style={{ backgroundColor: themeColors.secondary }}
                  title="Secondary color"
                />
                <div
                  className="w-12 h-12 rounded border border-gray-300"
                  style={{ backgroundColor: themeColors.accent }}
                  title="Accent color"
                />
              </div>
              <div className="text-sm text-gray-600 ml-2">
                <div className="font-medium capitalize">{theme} Theme</div>
                <div className="text-xs">Locale: {locale.toUpperCase()}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Slide thumbnails */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Slide Order</h4>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {slidePreviews.map((slide) => (
            <div
              key={slide.number}
              className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
            >
              {/* Slide number */}
              <div className="flex-shrink-0 w-8 h-8 rounded bg-gray-100 text-gray-700 font-bold text-sm flex items-center justify-center">
                {slide.number}
              </div>

              {/* Slide type icon */}
              <div className="flex-shrink-0 text-gray-500">
                {slide.type === 'title' && (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm6 6H7v2h6v-2z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {slide.type === 'chart' && (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                  </svg>
                )}
                {slide.type === 'content' && (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0h8v12H6V4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>

              {/* Slide title */}
              <div className="flex-1">
                <div className="font-medium text-gray-900">{slide.title}</div>
                <div className="text-xs text-gray-500 capitalize">{slide.type}</div>
              </div>

              {/* Citation indicator (content and chart slides only) */}
              {(slide.type === 'content' || slide.type === 'chart') && (
                <div className="flex-shrink-0 text-xs text-gray-500 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  ~3 citations
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Export info */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div className="flex-1">
            <p className="text-sm text-gray-700">
              This deck will be generated in <strong>{locale.toUpperCase()}</strong> locale
              using the <strong className="capitalize">{theme}</strong> theme. All slides will
              include evidence-based citations and speaker notes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
