/**
 * CitationBadge Component
 *
 * Displays citation count with visual validation indicator.
 * Shows green when meeting minimum requirements, red otherwise.
 *
 * @module deck/slides
 */

export interface CitationBadgeProps {
  count: number;
  minRequired?: number;
}

export function CitationBadge({ count, minRequired = 1 }: CitationBadgeProps) {
  const isValid = count >= minRequired;

  return (
    <div
      className={`citation-badge inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-colors ${
        isValid
          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border border-green-200 dark:border-green-700'
          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border border-red-200 dark:border-red-700'
      }`}
      data-testid="citation-badge"
      role="status"
      aria-label={`${count} ${count === 1 ? 'citation' : 'citations'}${
        !isValid ? `, minimum ${minRequired} required` : ''
      }`}
    >
      {/* Citation icon */}
      <svg
        className="w-4 h-4"
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>

      {/* Count */}
      <span className="font-bold" data-testid="citation-count">
        {count}
      </span>

      {/* Label */}
      <span className="text-sm">{count === 1 ? 'citation' : 'citations'}</span>

      {/* Validation warning */}
      {!isValid && (
        <span
          className="text-xs font-normal opacity-90 ml-1 border-l border-red-300 dark:border-red-600 pl-2"
          data-testid="citation-warning"
        >
          (min: {minRequired})
        </span>
      )}

      {/* Success checkmark */}
      {isValid && minRequired > 0 && (
        <svg
          className="w-4 h-4 ml-1"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
          data-testid="citation-success-icon"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </div>
  );
}
