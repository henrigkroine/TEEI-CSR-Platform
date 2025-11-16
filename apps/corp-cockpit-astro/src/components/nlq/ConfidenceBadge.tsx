/**
 * Confidence Badge Component
 *
 * Visual indicator for answer confidence with color coding and breakdown tooltips
 * @module nlq/ConfidenceBadge
 */

import { useState, useRef, useEffect } from 'react';
import type { ConfidenceBadgeProps, ConfidenceLevel } from '../../types/nlq';

export default function ConfidenceBadge({
  score,
  showBreakdown = false,
  compact = false
}: ConfidenceBadgeProps) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Determine confidence level and styling
  const level: ConfidenceLevel =
    score.overall >= 0.8 ? 'high' :
    score.overall >= 0.6 ? 'medium' :
    'low';

  const colors = {
    high: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-800 dark:text-green-200',
      border: 'border-green-500',
      dot: 'bg-green-500',
    },
    medium: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-800 dark:text-yellow-200',
      border: 'border-yellow-500',
      dot: 'bg-yellow-500',
    },
    low: {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-800 dark:text-orange-200',
      border: 'border-orange-500',
      dot: 'bg-orange-500',
    },
  };

  const colorScheme = colors[level];
  const percentage = Math.round(score.overall * 100);

  // Close tooltip on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTooltipOpen(false);
      }
    };
    if (tooltipOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [tooltipOpen]);

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${colorScheme.bg} ${colorScheme.text}`}
        aria-label={`Confidence: ${percentage}%`}
      >
        <span className={`w-2 h-2 rounded-full ${colorScheme.dot}`} aria-hidden="true" />
        {percentage}%
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      <div
        ref={triggerRef}
        className={`
          inline-flex items-center gap-2 px-3 py-2 rounded-lg border-2
          ${colorScheme.bg} ${colorScheme.text} ${colorScheme.border}
          cursor-help transition-all hover:shadow-md min-h-[44px]
        `}
        onMouseEnter={() => showBreakdown && setTooltipOpen(true)}
        onMouseLeave={() => setTooltipOpen(false)}
        onClick={() => showBreakdown && setTooltipOpen(!tooltipOpen)}
        onKeyDown={(e) => {
          if (showBreakdown && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setTooltipOpen(!tooltipOpen);
          }
        }}
        tabIndex={showBreakdown ? 0 : -1}
        role={showBreakdown ? 'button' : 'status'}
        aria-label={`Confidence: ${level} (${percentage}%)`}
        aria-expanded={showBreakdown ? tooltipOpen : undefined}
      >
        <span className={`w-3 h-3 rounded-full ${colorScheme.dot} animate-pulse`} aria-hidden="true" />
        <div className="flex flex-col">
          <span className="text-xs font-medium uppercase tracking-wide">Confidence</span>
          <span className="text-lg font-bold">{percentage}%</span>
        </div>
      </div>

      {/* Breakdown Tooltip */}
      {showBreakdown && tooltipOpen && (
        <div
          className="
            absolute z-50 w-80 mt-2 left-0 rounded-lg border-2 border-border
            bg-background shadow-xl p-4 animate-in fade-in slide-in-from-top-2 duration-200
          "
          role="tooltip"
          aria-live="polite"
        >
          {/* Arrow */}
          <div className="absolute w-3 h-3 bg-background border-border border-t-2 border-l-2 rotate-45 -top-[8px] left-6" />

          {/* Content */}
          <div className="relative">
            <h4 className="text-sm font-semibold mb-3 text-foreground">Confidence Breakdown</h4>

            {/* Component scores */}
            <div className="space-y-2 mb-4">
              <ConfidenceBar
                label="Query Understanding"
                score={score.components.queryUnderstanding}
              />
              <ConfidenceBar
                label="Data Relevance"
                score={score.components.dataRelevance}
              />
              <ConfidenceBar
                label="Calculation Accuracy"
                score={score.components.calculationAccuracy}
              />
              <ConfidenceBar
                label="Completeness"
                score={score.components.completeness}
              />
            </div>

            {/* Reasoning */}
            {score.reasoning && (
              <div className="mb-3 p-3 bg-foreground/5 rounded-md">
                <p className="text-xs text-foreground/80">{score.reasoning}</p>
              </div>
            )}

            {/* Recommendations */}
            {score.recommendations && score.recommendations.length > 0 && (
              <div className="pt-3 border-t border-border">
                <p className="text-xs font-semibold mb-2 text-foreground/70">Recommendations:</p>
                <ul className="space-y-1">
                  {score.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-xs text-foreground/70 flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Confidence progress bar
 */
function ConfidenceBar({ label, score }: { label: string; score: number }) {
  const percentage = Math.round(score * 100);
  const color =
    score >= 0.8 ? 'bg-green-500' :
    score >= 0.6 ? 'bg-yellow-500' :
    'bg-orange-500';

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-foreground/70">{label}</span>
        <span className="text-xs font-semibold text-foreground">{percentage}%</span>
      </div>
      <div className="h-2 bg-foreground/10 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-300 rounded-full`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label}: ${percentage}%`}
        />
      </div>
    </div>
  );
}
