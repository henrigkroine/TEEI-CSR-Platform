/**
 * NLQ Live Announcer Component
 * Provides accessible status updates for NLQ queries and results
 * WCAG 2.2 AA Compliance - Screen Reader Support
 */

import { useEffect, useState, useRef } from 'react';
import type { ConfidenceScore, QueryMetadata } from '../../../types/nlq';

/**
 * Base Live Announcer for NLQ
 * Announces dynamic content changes to screen readers
 */
interface NLQAnnouncerProps {
  /**
   * Message to announce
   */
  message?: string;

  /**
   * Politeness level
   */
  politeness?: 'polite' | 'assertive';

  /**
   * Auto-clear timeout (0 = never clear)
   */
  clearAfter?: number;

  /**
   * CSS class name
   */
  className?: string;
}

export function NLQAnnouncer({
  message = '',
  politeness = 'polite',
  clearAfter = 5000,
  className = '',
}: NLQAnnouncerProps) {
  const [announcement, setAnnouncement] = useState(message);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (message) {
      // Clear previous timeout
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }

      // Set new announcement
      setAnnouncement(message);

      // Clear announcement after timeout
      if (clearAfter > 0) {
        timeoutRef.current = window.setTimeout(() => {
          setAnnouncement('');
        }, clearAfter);
      }
    }

    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [message, clearAfter]);

  const role = politeness === 'assertive' ? 'alert' : 'status';
  const ariaLive = politeness;

  return (
    <div
      role={role}
      aria-live={ariaLive}
      aria-atomic="true"
      className={`sr-only ${className}`.trim()}
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: '0',
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: '0',
      }}
    >
      {announcement}
    </div>
  );
}

/**
 * Query Execution Status Announcer
 * Announces the current state of query execution
 */
interface QueryStatusAnnouncerProps {
  /**
   * Query execution state
   */
  status: 'idle' | 'executing' | 'success' | 'error';

  /**
   * Query text
   */
  queryText?: string;

  /**
   * Error message (if status is error)
   */
  errorMessage?: string;

  /**
   * Number of results (if status is success)
   */
  resultCount?: number;

  /**
   * Execution time in seconds
   */
  executionTime?: number;
}

export function QueryStatusAnnouncer({
  status,
  queryText,
  errorMessage,
  resultCount,
  executionTime,
}: QueryStatusAnnouncerProps) {
  const getMessage = (): { text: string; politeness: 'polite' | 'assertive' } => {
    switch (status) {
      case 'executing':
        return {
          text: queryText
            ? `Executing query: ${queryText}`
            : 'Executing query...',
          politeness: 'polite',
        };

      case 'success':
        const timeStr = executionTime
          ? ` in ${executionTime.toFixed(1)} seconds`
          : '';
        const countStr =
          resultCount !== undefined
            ? `${resultCount} result${resultCount !== 1 ? 's' : ''} found`
            : 'Query completed';
        return {
          text: `${countStr}${timeStr}`,
          politeness: 'polite',
        };

      case 'error':
        return {
          text: `Query failed: ${errorMessage || 'Unknown error'}`,
          politeness: 'assertive',
        };

      default:
        return { text: '', politeness: 'polite' };
    }
  };

  const { text, politeness } = getMessage();

  return <NLQAnnouncer message={text} politeness={politeness} clearAfter={8000} />;
}

/**
 * Confidence Score Announcer
 * Announces confidence score changes with context
 */
interface ConfidenceAnnouncerProps {
  /**
   * Confidence score
   */
  score: ConfidenceScore;

  /**
   * Whether to announce detailed breakdown
   */
  announceBreakdown?: boolean;
}

export function ConfidenceAnnouncer({
  score,
  announceBreakdown = false,
}: ConfidenceAnnouncerProps) {
  const getMessage = (): string => {
    const percentage = Math.round(score.overall * 100);
    const level =
      score.overall >= 0.8 ? 'high' : score.overall >= 0.5 ? 'medium' : 'low';

    let message = `Confidence: ${percentage}%, ${level} confidence`;

    if (announceBreakdown) {
      const breakdown = [
        `Query understanding: ${Math.round(score.components.queryUnderstanding * 100)}%`,
        `Data relevance: ${Math.round(score.components.dataRelevance * 100)}%`,
        `Calculation accuracy: ${Math.round(score.components.calculationAccuracy * 100)}%`,
        `Completeness: ${Math.round(score.components.completeness * 100)}%`,
      ].join(', ');

      message += `. Breakdown: ${breakdown}`;
    }

    if (score.reasoning) {
      message += `. ${score.reasoning}`;
    }

    if (score.recommendations && score.recommendations.length > 0) {
      message += `. Recommendations: ${score.recommendations.join('. ')}`;
    }

    return message;
  };

  return <NLQAnnouncer message={getMessage()} politeness="polite" clearAfter={10000} />;
}

/**
 * Result Loading Announcer
 * Announces loading states for paginated or streaming results
 */
interface ResultLoadingAnnouncerProps {
  /**
   * Loading state
   */
  isLoading: boolean;

  /**
   * Loading type
   */
  type?: 'initial' | 'more' | 'refresh';

  /**
   * Number of new items loaded
   */
  itemsLoaded?: number;

  /**
   * Total items available
   */
  totalItems?: number;
}

export function ResultLoadingAnnouncer({
  isLoading,
  type = 'initial',
  itemsLoaded,
  totalItems,
}: ResultLoadingAnnouncerProps) {
  const getMessage = (): string => {
    if (isLoading) {
      if (type === 'more') {
        return 'Loading more results...';
      } else if (type === 'refresh') {
        return 'Refreshing results...';
      }
      return 'Loading results...';
    }

    if (itemsLoaded !== undefined) {
      const itemsStr = `${itemsLoaded} result${itemsLoaded !== 1 ? 's' : ''}`;
      const totalStr =
        totalItems !== undefined ? ` of ${totalItems} total` : '';
      return `Loaded ${itemsStr}${totalStr}`;
    }

    return 'Results loaded';
  };

  return (
    <NLQAnnouncer
      message={getMessage()}
      politeness="polite"
      clearAfter={isLoading ? 0 : 3000}
    />
  );
}

/**
 * Suggestion Selection Announcer
 * Announces when navigating through autocomplete suggestions
 */
interface SuggestionAnnouncerProps {
  /**
   * Current suggestion text
   */
  currentSuggestion?: string;

  /**
   * Current index (1-based for screen readers)
   */
  currentIndex?: number;

  /**
   * Total number of suggestions
   */
  totalSuggestions?: number;

  /**
   * Suggestion category/type
   */
  category?: string;
}

export function SuggestionAnnouncer({
  currentSuggestion,
  currentIndex,
  totalSuggestions,
  category,
}: SuggestionAnnouncerProps) {
  const getMessage = (): string => {
    if (!currentSuggestion) return '';

    let message = currentSuggestion;

    if (currentIndex !== undefined && totalSuggestions !== undefined) {
      message += `, ${currentIndex} of ${totalSuggestions}`;
    }

    if (category) {
      message += `, ${category}`;
    }

    return message;
  };

  return (
    <NLQAnnouncer
      message={getMessage()}
      politeness="polite"
      clearAfter={2000}
    />
  );
}

/**
 * Filter Applied Announcer
 * Announces when filters are applied to results
 */
interface FilterAnnouncerProps {
  /**
   * Filter name
   */
  filterName: string;

  /**
   * Filter value
   */
  filterValue?: string;

  /**
   * Number of results after filter
   */
  resultCount?: number;

  /**
   * Whether filter was cleared
   */
  cleared?: boolean;
}

export function FilterAnnouncer({
  filterName,
  filterValue,
  resultCount,
  cleared = false,
}: FilterAnnouncerProps) {
  const getMessage = (): string => {
    if (cleared) {
      return `${filterName} filter cleared`;
    }

    let message = `${filterName} filter applied`;

    if (filterValue) {
      message += `: ${filterValue}`;
    }

    if (resultCount !== undefined) {
      message += `. ${resultCount} result${resultCount !== 1 ? 's' : ''} found`;
    }

    return message;
  };

  return <NLQAnnouncer message={getMessage()} politeness="polite" clearAfter={5000} />;
}

/**
 * Export Status Announcer
 * Announces export operation status
 */
interface ExportAnnouncerProps {
  /**
   * Export status
   */
  status: 'preparing' | 'downloading' | 'complete' | 'error';

  /**
   * Export format
   */
  format?: 'csv' | 'json';

  /**
   * Error message
   */
  errorMessage?: string;
}

export function ExportAnnouncer({
  status,
  format,
  errorMessage,
}: ExportAnnouncerProps) {
  const getMessage = (): { text: string; politeness: 'polite' | 'assertive' } => {
    const formatStr = format ? ` as ${format.toUpperCase()}` : '';

    switch (status) {
      case 'preparing':
        return {
          text: `Preparing export${formatStr}...`,
          politeness: 'polite',
        };

      case 'downloading':
        return {
          text: `Downloading export${formatStr}...`,
          politeness: 'polite',
        };

      case 'complete':
        return {
          text: `Export${formatStr} complete`,
          politeness: 'polite',
        };

      case 'error':
        return {
          text: `Export failed: ${errorMessage || 'Unknown error'}`,
          politeness: 'assertive',
        };
    }
  };

  const { text, politeness } = getMessage();

  return <NLQAnnouncer message={text} politeness={politeness} clearAfter={6000} />;
}

/**
 * Lineage Navigation Announcer
 * Announces when navigating through data lineage
 */
interface LineageAnnouncerProps {
  /**
   * Current lineage step
   */
  stepDescription?: string;

  /**
   * Step number
   */
  stepNumber?: number;

  /**
   * Total steps
   */
  totalSteps?: number;

  /**
   * Data source info
   */
  dataSource?: string;
}

export function LineageAnnouncer({
  stepDescription,
  stepNumber,
  totalSteps,
  dataSource,
}: LineageAnnouncerProps) {
  const getMessage = (): string => {
    let message = '';

    if (stepDescription) {
      message = stepDescription;

      if (stepNumber !== undefined && totalSteps !== undefined) {
        message += `, step ${stepNumber} of ${totalSteps}`;
      }

      if (dataSource) {
        message += `, from ${dataSource}`;
      }
    }

    return message;
  };

  return (
    <NLQAnnouncer
      message={getMessage()}
      politeness="polite"
      clearAfter={5000}
    />
  );
}

/**
 * Feedback Submission Announcer
 * Announces when feedback is submitted
 */
interface FeedbackAnnouncerProps {
  /**
   * Feedback type
   */
  type: 'positive' | 'negative';

  /**
   * Whether submission was successful
   */
  success: boolean;

  /**
   * Error message if failed
   */
  errorMessage?: string;
}

export function FeedbackAnnouncer({
  type,
  success,
  errorMessage,
}: FeedbackAnnouncerProps) {
  const getMessage = (): { text: string; politeness: 'polite' | 'assertive' } => {
    if (success) {
      return {
        text: `${type === 'positive' ? 'Positive' : 'Negative'} feedback submitted`,
        politeness: 'polite',
      };
    }

    return {
      text: `Feedback submission failed: ${errorMessage || 'Unknown error'}`,
      politeness: 'assertive',
    };
  };

  const { text, politeness } = getMessage();

  return <NLQAnnouncer message={text} politeness={politeness} clearAfter={4000} />;
}

export default NLQAnnouncer;
