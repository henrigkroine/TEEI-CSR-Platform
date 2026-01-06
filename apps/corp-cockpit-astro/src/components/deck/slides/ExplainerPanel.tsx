/**
 * ExplainerPanel Component
 *
 * Contextual explanation panel for slide sections.
 * Provides "why this matters" insights with evidence count.
 *
 * @module deck/slides
 */

export interface ExplainerPanelProps {
  title: string;
  explanation: string;
  evidenceCount: number;
  variant?: 'default' | 'compact';
}

export function ExplainerPanel({
  title,
  explanation,
  evidenceCount,
  variant = 'default',
}: ExplainerPanelProps) {
  const isCompact = variant === 'compact';

  return (
    <div
      className={`explainer-panel border-l-4 border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950/30 rounded-r-lg ${
        isCompact ? 'p-3' : 'p-4'
      }`}
      data-testid="explainer-panel"
      role="complementary"
      aria-label="Section explanation"
    >
      {/* Header with icon */}
      <div className="flex items-start gap-2 mb-2">
        <div className="flex-shrink-0 mt-1">
          <svg
            className={`${
              isCompact ? 'w-5 h-5' : 'w-6 h-6'
            } text-blue-600 dark:text-blue-400`}
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
          </svg>
        </div>
        <h3
          className={`${
            isCompact ? 'text-base' : 'text-lg'
          } font-semibold text-blue-900 dark:text-blue-100 flex-1`}
          data-testid="explainer-title"
        >
          {title}
        </h3>
      </div>

      {/* Explanation text */}
      <p
        className={`${
          isCompact ? 'text-sm' : 'text-base'
        } text-blue-800 dark:text-blue-200 mb-3 leading-relaxed pl-8`}
        data-testid="explainer-text"
      >
        {explanation}
      </p>

      {/* Evidence count footer */}
      <div className="flex items-center gap-2 pl-8">
        <svg
          className="w-4 h-4 text-blue-600 dark:text-blue-400"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
            clipRule="evenodd"
          />
        </svg>
        <p
          className="text-xs text-blue-700 dark:text-blue-300 font-medium"
          data-testid="evidence-count"
        >
          Based on{' '}
          <span className="font-bold">{evidenceCount}</span>{' '}
          {evidenceCount === 1 ? 'piece' : 'pieces'} of evidence
        </p>
      </div>
    </div>
  );
}
