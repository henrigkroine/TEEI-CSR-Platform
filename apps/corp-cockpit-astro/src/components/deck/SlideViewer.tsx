/**
 * Slide Viewer Component
 *
 * Displays deck slides with:
 * - Per-paragraph citation counts
 * - "Why this section?" explainer panel
 * - Evidence ID hover tooltips
 * - RTL support for Hebrew/Arabic
 *
 * @module components/deck/SlideViewer
 */

import { useState } from 'react';
import type { SlideDefinition, SlideBlock, CitationInfo } from '@teei/shared-types';

export interface SlideViewerProps {
  slide: SlideDefinition;
  slideNumber: number;
  totalSlides: number;
  locale?: string;
  onNext?: () => void;
  onPrevious?: () => void;
  onClose?: () => void;
}

const RTL_LOCALES = ['he', 'ar'];

export function SlideViewer({
  slide,
  slideNumber,
  totalSlides,
  locale = 'en',
  onNext,
  onPrevious,
  onClose,
}: SlideViewerProps) {
  const [showExplainer, setShowExplainer] = useState<string | null>(null);
  const isRTL = RTL_LOCALES.includes(locale);

  const mainBlock = slide.blocks[0];

  if (!mainBlock) {
    return null;
  }

  return (
    <div
      className="slide-viewer bg-white shadow-lg rounded-lg overflow-hidden"
      dir={isRTL ? 'rtl' : 'ltr'}
      role="article"
      aria-label={`Slide ${slideNumber} of ${totalSlides}`}
    >
      {/* Slide Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">{mainBlock.title}</h2>
            <p className="text-blue-100 text-sm mt-1">
              Slide {slideNumber} of {totalSlides}
            </p>
          </div>

          {/* Explainer Toggle */}
          {mainBlock.explainer && (
            <button
              onClick={() => setShowExplainer(showExplainer === mainBlock.id ? null : mainBlock.id)}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-400 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600"
              aria-label="Toggle explainer panel"
              aria-expanded={showExplainer === mainBlock.id}
            >
              {showExplainer === mainBlock.id ? '✕ Hide' : '❓ Why this section?'}
            </button>
          )}
        </div>
      </header>

      {/* Explainer Panel */}
      {showExplainer === mainBlock.id && mainBlock.explainer && (
        <div
          className="bg-yellow-50 border-l-4 border-yellow-400 p-4"
          role="complementary"
          aria-label="Section explainer"
        >
          <h3 className="text-sm font-semibold text-yellow-900">
            {mainBlock.explainer.title}
          </h3>
          <p className="text-sm text-yellow-800 mt-1">{mainBlock.explainer.content}</p>
        </div>
      )}

      {/* Slide Content */}
      <div className="p-6">
        {/* Render based on block type */}
        {mainBlock.type === 'title' && (
          <TitleBlock block={mainBlock} />
        )}

        {mainBlock.type === 'metrics-grid' && (
          <MetricsGridBlock block={mainBlock} />
        )}

        {mainBlock.type === 'narrative' && (
          <NarrativeBlock block={mainBlock} />
        )}

        {mainBlock.type === 'key-achievements' && (
          <KeyAchievementsBlock block={mainBlock} />
        )}

        {mainBlock.type === 'chart' && (
          <ChartBlock block={mainBlock} />
        )}

        {mainBlock.type === 'table' && (
          <TableBlock block={mainBlock} />
        )}

        {mainBlock.type === 'evidence-summary' && (
          <EvidenceSummaryBlock block={mainBlock} slide={slide} />
        )}

        {/* Default: Content */}
        {!['title', 'metrics-grid', 'narrative', 'key-achievements', 'chart', 'table', 'evidence-summary'].includes(mainBlock.type) && (
          <div className="prose max-w-none">
            {mainBlock.content && <p className="text-gray-700">{mainBlock.content}</p>}
            {mainBlock.bullets && (
              <ul className="list-disc list-inside space-y-2">
                {mainBlock.bullets.map((bullet, index) => (
                  <li key={index} className="text-gray-700">
                    {bullet}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Speaker Notes */}
      {slide.notes && (
        <div className="bg-gray-50 border-t border-gray-200 p-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Speaker Notes</h4>
          <p className="text-sm text-gray-700">{slide.notes}</p>
        </div>
      )}

      {/* Navigation */}
      <footer className="bg-gray-100 border-t border-gray-200 p-4 flex justify-between items-center">
        <button
          onClick={onPrevious}
          disabled={!onPrevious || slideNumber === 1}
          className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          aria-label="Previous slide"
        >
          ← Previous
        </button>

        <div className="flex gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Close
            </button>
          )}
        </div>

        <button
          onClick={onNext}
          disabled={!onNext || slideNumber === totalSlides}
          className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          aria-label="Next slide"
        >
          Next →
        </button>
      </footer>
    </div>
  );
}

/**
 * Title Block
 */
function TitleBlock({ block }: { block: SlideBlock }) {
  return (
    <div className="text-center py-12">
      <h1 className="text-5xl font-bold text-gray-900 mb-4">{block.title}</h1>
      {block.content && <p className="text-xl text-gray-600">{block.content}</p>}
    </div>
  );
}

/**
 * Metrics Grid Block
 */
function MetricsGridBlock({ block }: { block: SlideBlock }) {
  if (!block.metricsConfig) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
      {block.metricsConfig.metrics.map((metric, index) => (
        <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-3xl font-bold text-blue-600">{metric.value}</div>
          <div className="text-sm text-gray-600 mt-2">{metric.label}</div>
          {metric.change !== undefined && (
            <div
              className={`text-xs mt-1 ${
                metric.change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {metric.change >= 0 ? '↑' : '↓'}{' '}
              {metric.changeLabel || `${Math.abs(metric.change)}%`}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Narrative Block with Citations
 */
function NarrativeBlock({ block }: { block: SlideBlock }) {
  const paragraphs = block.content?.split('\n\n') || [];

  return (
    <div className="prose max-w-none">
      {paragraphs.map((para, index) => {
        const citationInfo = block.citations?.find((c) => c.paragraphIndex === index);

        return (
          <div key={index} className="mb-4 relative group">
            <p className="text-gray-700">{para}</p>

            {/* Citation Badge */}
            {citationInfo && citationInfo.citationCount > 0 && (
              <div className="inline-flex items-center gap-2 mt-2">
                <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                  {citationInfo.citationCount} {citationInfo.citationCount === 1 ? 'citation' : 'citations'}
                </span>

                {/* Evidence IDs Tooltip */}
                <div className="relative">
                  <button
                    className="text-xs text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                    aria-label={`Show evidence IDs for paragraph ${index + 1}`}
                  >
                    🔍 Evidence
                  </button>

                  {/* Tooltip on hover */}
                  <div className="hidden group-hover:block absolute bottom-full left-0 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
                    <div className="font-semibold mb-1">Evidence IDs:</div>
                    <div className="space-y-1">
                      {citationInfo.evidenceIds.slice(0, 3).map((evId) => (
                        <div key={evId} className="font-mono">{evId}</div>
                      ))}
                      {citationInfo.evidenceIds.length > 3 && (
                        <div className="text-gray-400">
                          +{citationInfo.evidenceIds.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Key Achievements Block with Citations
 */
function KeyAchievementsBlock({ block }: { block: SlideBlock }) {
  return (
    <ul className="space-y-4">
      {block.bullets?.map((bullet, index) => {
        const citationInfo = block.citations?.find((c) => c.paragraphIndex === index);

        return (
          <li key={index} className="flex items-start gap-3 group">
            <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
              ✓
            </span>
            <div className="flex-1">
              <p className="text-gray-700">{bullet}</p>

              {/* Citation Badge */}
              {citationInfo && citationInfo.citationCount > 0 && (
                <div className="mt-2 inline-flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                    {citationInfo.citationCount} {citationInfo.citationCount === 1 ? 'citation' : 'citations'}
                  </span>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Chart Block (Placeholder)
 */
function ChartBlock({ block }: { block: SlideBlock }) {
  return (
    <div className="bg-gray-50 rounded-lg p-8 border border-gray-200">
      <div className="text-center">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-lg font-semibold text-gray-900">Chart: {block.title}</h3>
        <p className="text-sm text-gray-600 mt-2">
          Chart rendering will appear in exported PPTX
        </p>
        {block.chartConfig && (
          <p className="text-xs text-gray-500 mt-2">
            Type: {block.chartConfig.type} | {block.chartConfig.labels.length} data points
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Table Block
 */
function TableBlock({ block }: { block: SlideBlock }) {
  if (!block.tableConfig) return null;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-300">
        <thead className="bg-gray-50">
          <tr>
            {block.tableConfig.headers.map((header, index) => (
              <th
                key={index}
                className="px-4 py-2 border-b border-gray-300 text-left text-sm font-semibold text-gray-900"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.tableConfig.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="px-4 py-2 border-b border-gray-200 text-sm text-gray-700"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Evidence Summary Block
 */
function EvidenceSummaryBlock({ block, slide }: { block: SlideBlock; slide: SlideDefinition }) {
  const evidenceCount = slide.evidenceIds?.length || 0;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl">
          📋
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-blue-900">{block.title}</h3>
          <p className="text-blue-800 mt-2">{block.content}</p>

          {evidenceCount > 0 && (
            <div className="mt-4 flex items-center gap-2">
              <span className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded-full">
                {evidenceCount} Evidence Snippets
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
