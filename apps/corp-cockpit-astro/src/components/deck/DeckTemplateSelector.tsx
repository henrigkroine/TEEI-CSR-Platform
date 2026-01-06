/**
 * Deck Template Selector Component
 *
 * Radio group for selecting presentation template.
 * Shows visual preview thumbnails and descriptions.
 *
 * @module deck/DeckTemplateSelector
 */

import { useState } from 'react';
import type { DeckTemplate } from './types';
import { AVAILABLE_TEMPLATES } from './constants';

export interface DeckTemplateSelectorProps {
  /** Currently selected template */
  selectedTemplate: DeckTemplate;
  /** Callback when template changes */
  onChange: (template: DeckTemplate) => void;
  /** Disable all options */
  disabled?: boolean;
}

export function DeckTemplateSelector({
  selectedTemplate,
  onChange,
  disabled = false,
}: DeckTemplateSelectorProps) {
  const [hoveredTemplate, setHoveredTemplate] = useState<DeckTemplate | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Select Template</h3>
        <span className="text-sm text-gray-500">
          {AVAILABLE_TEMPLATES.find((t) => t.id === selectedTemplate)?.name || 'None'}
        </span>
      </div>

      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
        role="radiogroup"
        aria-label="Deck template selection"
      >
        {AVAILABLE_TEMPLATES.map((template) => {
          const isSelected = selectedTemplate === template.id;
          const isHovered = hoveredTemplate === template.id;

          return (
            <button
              key={template.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onChange(template.id)}
              onMouseEnter={() => setHoveredTemplate(template.id)}
              onMouseLeave={() => setHoveredTemplate(null)}
              className={`
                relative p-6 rounded-lg border-2 transition-all text-left
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {/* Selection indicator */}
              <div className="absolute top-4 right-4">
                <div
                  className={`
                    w-6 h-6 rounded-full border-2 flex items-center justify-center
                    transition-colors
                    ${
                      isSelected
                        ? 'border-blue-600 bg-blue-600'
                        : 'border-gray-300 bg-white'
                    }
                  `}
                  aria-hidden="true"
                >
                  {isSelected && (
                    <svg
                      className="w-4 h-4 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              </div>

              {/* Template icon */}
              <div className="text-4xl mb-3" aria-hidden="true">
                {template.icon}
              </div>

              {/* Template name */}
              <h4
                className={`text-xl font-bold mb-2 ${
                  isSelected ? 'text-blue-900' : 'text-gray-900'
                }`}
              >
                {template.name}
              </h4>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-4">{template.description}</p>

              {/* Metadata */}
              <div className="flex flex-wrap gap-2 text-xs">
                <span
                  className={`px-2 py-1 rounded-full ${
                    isSelected
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {template.minSlides}-{template.maxSlides} slides
                </span>
                <span
                  className={`px-2 py-1 rounded-full ${
                    isSelected
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {template.defaultTiles.length} default tiles
                </span>
              </div>

              {/* Audience info (shown on hover or selection) */}
              {(isSelected || isHovered) && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    <span className="font-medium">Audience:</span> {template.audience}
                  </p>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Template details */}
      {selectedTemplate && (
        <div
          className="p-4 bg-blue-50 border border-blue-200 rounded-lg"
          role="status"
          aria-live="polite"
        >
          <p className="text-sm text-blue-900">
            <strong>
              {AVAILABLE_TEMPLATES.find((t) => t.id === selectedTemplate)?.name}
            </strong>{' '}
            template selected with{' '}
            {AVAILABLE_TEMPLATES.find((t) => t.id === selectedTemplate)?.defaultTiles.length}{' '}
            default tiles.
          </p>
        </div>
      )}
    </div>
  );
}
