/**
 * Answer Card Component
 *
 * Main component for displaying NLQ query results with:
 * - Question display with timestamp
 * - Confidence indicators
 * - Summary text
 * - Data visualization
 * - Lineage information
 * - Feedback and export controls
 *
 * @module nlq/AnswerCard
 */

import { useState } from 'react';
import ConfidenceBadge from './ConfidenceBadge';
import DataVisualization from './DataVisualization';
import LineageView from './LineageView';
import type { AnswerCardProps, FeedbackRating, ExportFormat } from '../../types/nlq';

export default function AnswerCard({
  queryId,
  question,
  answer,
  metadata,
  onFeedback,
  onExport,
  onLineageExpand
}: AnswerCardProps) {
  const [feedback, setFeedback] = useState<FeedbackRating | null>(null);
  const [showFullSummary, setShowFullSummary] = useState(false);

  const handleFeedback = (rating: FeedbackRating) => {
    setFeedback(rating);
    onFeedback?.(rating);
  };

  const handleExport = async (format: ExportFormat) => {
    onExport?.(format);
  };

  const handleCopyToClipboard = () => {
    const text = formatForClipboard();
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
      console.log('Copied to clipboard');
    });
  };

  const formatForClipboard = (): string => {
    let text = `Question: ${question}\n\n`;
    text += `Answer: ${answer.summary}\n\n`;

    if (answer.data.length > 0) {
      text += `Data:\n`;
      text += JSON.stringify(answer.data, null, 2);
    }

    return text;
  };

  // Truncate summary if too long
  const summaryLimit = 200;
  const shouldTruncate = answer.summary.length > summaryLimit;
  const displaySummary = (shouldTruncate && !showFullSummary)
    ? answer.summary.slice(0, summaryLimit) + '...'
    : answer.summary;

  return (
    <article
      className="bg-background border-2 border-border rounded-xl shadow-lg overflow-hidden transition-all hover:shadow-xl"
      aria-labelledby={`question-${queryId}`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 px-6 py-4 border-b border-border">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <h3
              id={`question-${queryId}`}
              className="text-lg font-semibold text-foreground mb-2"
            >
              {question}
            </h3>
            <div className="flex items-center gap-3 flex-wrap text-xs text-foreground/60">
              <div className="flex items-center gap-1">
                <span aria-hidden="true">🕐</span>
                <time dateTime={metadata.timestamp}>
                  {formatTimestamp(metadata.timestamp)}
                </time>
              </div>
              <div className="flex items-center gap-1">
                <span aria-hidden="true">⚡</span>
                <span>{metadata.executionTimeMs}ms</span>
              </div>
              {metadata.cached && (
                <div className="flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">
                  <span aria-hidden="true">💾</span>
                  <span className="font-medium">Cached</span>
                </div>
              )}
            </div>
          </div>

          <ConfidenceBadge score={answer.confidence} showBreakdown={true} />
        </div>
      </div>

      {/* Answer Summary */}
      <div className="px-6 py-5 border-b border-border bg-foreground/5">
        <div className="flex items-start gap-2 mb-2">
          <span className="text-2xl mt-1" aria-hidden="true">💡</span>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide mb-2">
              Answer
            </h4>
            <p className="text-foreground leading-relaxed">
              {displaySummary}
            </p>
            {shouldTruncate && (
              <button
                onClick={() => setShowFullSummary(!showFullSummary)}
                className="mt-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors min-h-[24px]"
              >
                {showFullSummary ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Data Visualization */}
      {answer.data && answer.data.length > 0 && (
        <div className="px-6 py-5 border-b border-border">
          <h4 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide mb-4">
            Data
          </h4>
          <DataVisualization
            data={answer.data}
            config={answer.visualization}
          />
        </div>
      )}

      {/* Lineage */}
      {answer.lineage && (
        <div className="px-6 py-5 border-b border-border">
          <LineageView
            lineage={answer.lineage}
            onEvidenceClick={(evidenceId) => {
              onLineageExpand?.();
              console.log('View evidence:', evidenceId);
            }}
          />
        </div>
      )}

      {/* Footer Actions */}
      <div className="px-6 py-4 bg-foreground/5 flex items-center justify-between gap-4 flex-wrap">
        {/* Feedback */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground/70 font-medium">Was this helpful?</span>
          <div className="flex gap-2" role="group" aria-label="Feedback buttons">
            <button
              onClick={() => handleFeedback('positive')}
              className={`
                px-3 py-2 rounded-lg border-2 transition-all min-h-[44px] min-w-[44px]
                ${feedback === 'positive'
                  ? 'bg-green-100 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-300'
                  : 'border-border hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                }
              `}
              aria-label="Positive feedback"
              aria-pressed={feedback === 'positive'}
            >
              <span className="text-lg">👍</span>
            </button>
            <button
              onClick={() => handleFeedback('negative')}
              className={`
                px-3 py-2 rounded-lg border-2 transition-all min-h-[44px] min-w-[44px]
                ${feedback === 'negative'
                  ? 'bg-red-100 dark:bg-red-900/30 border-red-500 text-red-700 dark:text-red-300'
                  : 'border-border hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                }
              `}
              aria-label="Negative feedback"
              aria-pressed={feedback === 'negative'}
            >
              <span className="text-lg">👎</span>
            </button>
          </div>
        </div>

        {/* Export Options */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyToClipboard}
            className="
              px-4 py-2 text-sm font-medium rounded-lg border-2 border-border
              hover:bg-foreground/5 transition-colors min-h-[44px]
              flex items-center gap-2
            "
            aria-label="Copy to clipboard"
          >
            <span aria-hidden="true">📋</span>
            <span>Copy</span>
          </button>

          {onExport && (
            <>
              <button
                onClick={() => handleExport('csv')}
                className="
                  px-4 py-2 text-sm font-medium rounded-lg border-2 border-border
                  hover:bg-foreground/5 transition-colors min-h-[44px]
                  flex items-center gap-2
                "
                aria-label="Export as CSV"
              >
                <span aria-hidden="true">📊</span>
                <span>CSV</span>
              </button>
              <button
                onClick={() => handleExport('json')}
                className="
                  px-4 py-2 text-sm font-medium rounded-lg border-2 border-border
                  hover:bg-foreground/5 transition-colors min-h-[44px]
                  flex items-center gap-2
                "
                aria-label="Export as JSON"
              >
                <span aria-hidden="true">📄</span>
                <span>JSON</span>
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
