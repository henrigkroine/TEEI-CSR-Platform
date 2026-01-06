/**
 * SlideWithCitations Component
 *
 * Main slide component with citation counts and optional explainer panel.
 * Designed for boardroom deck presentations with evidence tracking.
 *
 * @module deck/slides
 */

import { renderWithCitations } from '../../reports/CitationTooltip';
import type { Citation } from '../../../types/reports';
import { CitationBadge } from './CitationBadge';
import { ExplainerPanel } from './ExplainerPanel';

export interface SlideWithCitationsProps {
  title: string;
  content: string;
  citations: Array<{
    id: string;
    evidenceId: string;
    snippetText: string;
    source: string;
    confidence: number;
  }>;
  showExplainer?: boolean;
  explainerText?: string;
  minCitationsRequired?: number;
  onViewEvidence?: (citation: Citation) => void;
}

export function SlideWithCitations({
  title,
  content,
  citations,
  showExplainer = false,
  explainerText,
  minCitationsRequired = 1,
  onViewEvidence,
}: SlideWithCitationsProps) {
  const evidenceCount = citations.length;

  return (
    <div
      className="slide-container relative bg-white dark:bg-gray-900 p-8 rounded-lg shadow-md min-h-[500px] flex flex-col"
      data-testid="slide-with-citations"
    >
      {/* Header Section */}
      <div className="slide-header mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex-1">
            {title}
          </h2>

          {/* Citation count badge */}
          <CitationBadge
            count={citations.length}
            minRequired={minCitationsRequired}
          />
        </div>
      </div>

      {/* Content Section with inline citation markers */}
      <div
        className="slide-content flex-1 text-gray-800 dark:text-gray-200 text-lg leading-relaxed mb-6 prose prose-lg max-w-none"
        data-testid="slide-content"
      >
        {renderWithCitations(content, citations, onViewEvidence)}
      </div>

      {/* Explainer Panel */}
      {showExplainer && explainerText && (
        <div className="mb-6">
          <ExplainerPanel
            title="Why this section?"
            explanation={explainerText}
            evidenceCount={evidenceCount}
          />
        </div>
      )}

      {/* Citation list footer */}
      <div
        className="citations-footer border-t border-gray-200 dark:border-gray-700 pt-4"
        data-testid="citations-footer"
      >
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wide">
          Evidence Sources ({citations.length})
        </h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {citations.map((citation, index) => (
            <div
              key={citation.id}
              className="citation-item flex items-start gap-3 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              data-testid={`citation-item-${citation.id}`}
            >
              <span className="citation-number flex-shrink-0 text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded min-w-[32px] text-center">
                [{index + 1}]
              </span>
              <div className="flex-1 min-w-0">
                <p className="citation-text text-sm text-gray-700 dark:text-gray-300 truncate">
                  {citation.snippetText.slice(0, 80)}...
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {citation.source}
                </p>
              </div>
              <span
                className={`relevance-score flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${
                  citation.confidence >= 0.8
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : citation.confidence >= 0.6
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                }`}
                data-testid={`citation-confidence-${citation.id}`}
              >
                {(citation.confidence * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
