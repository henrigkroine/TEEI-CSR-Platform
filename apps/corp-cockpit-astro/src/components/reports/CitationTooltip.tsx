import { useState, useRef, useEffect } from 'react';
import type { Citation } from '../../types/reports';

interface CitationTooltipProps {
  citation: Citation;
  children: React.ReactNode;
  onViewDetails?: (citation: Citation) => void;
}

export default function CitationTooltip({ 
  citation, 
  children,
  onViewDetails 
}: CitationTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom'>('top');
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      
      // Check if tooltip would overflow top
      if (triggerRect.top - tooltipRect.height < 10) {
        setPosition('bottom');
      } else {
        setPosition('top');
      }
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (onViewDetails) {
        onViewDetails(citation);
      }
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const confidenceColor = citation.confidence >= 0.8 
    ? 'text-green-600' 
    : citation.confidence >= 0.6 
    ? 'text-yellow-600' 
    : 'text-orange-600';

  const confidenceLabel = citation.confidence >= 0.8 
    ? 'High' 
    : citation.confidence >= 0.6 
    ? 'Medium' 
    : 'Low';

  return (
    <span className="relative inline-block">
      <span
        ref={triggerRef}
        className="citation-marker cursor-help underline decoration-dotted decoration-primary
                   hover:bg-primary/10 transition-colors rounded px-1.5 py-1 inline-flex items-center min-h-[24px]"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => onViewDetails && onViewDetails(citation)}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`Citation: ${citation.source}`}
        aria-expanded={isOpen}
      >
        {children}
      </span>

      {isOpen && (
        <div
          ref={tooltipRef}
          className={`
            absolute z-50 w-80 rounded-lg border border-border bg-background shadow-xl
            ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}
            left-1/2 -translate-x-1/2
            animate-in fade-in slide-in-from-bottom-2 duration-200
          `}
          role="tooltip"
          aria-live="polite"
        >
          {/* Arrow */}
          <div
            className={`
              absolute w-3 h-3 bg-background border-border rotate-45
              left-1/2 -translate-x-1/2
              ${position === 'top' 
                ? 'bottom-[-6px] border-b border-r' 
                : 'top-[-6px] border-t border-l'
              }
            `}
          />

          {/* Content */}
          <div className="relative p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-foreground/40">
                    {citation.evidenceId.slice(0, 12)}...
                  </span>
                  <span className={`text-xs font-semibold ${confidenceColor}`}>
                    {confidenceLabel}
                  </span>
                </div>
                <p className="text-xs text-foreground/60">{citation.source}</p>
              </div>
              <div className="ml-2">
                <div className={`
                  text-xs font-bold px-2 py-1 rounded-full
                  ${citation.confidence >= 0.8
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : citation.confidence >= 0.6
                    ? 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-200'
                    : 'bg-orange-100 text-orange-900 dark:bg-orange-900 dark:text-orange-200'
                  }
                `}>
                  {(citation.confidence * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            {/* Snippet */}
            <div className="mb-3">
              <p className="text-sm text-foreground/80 line-clamp-4">
                {citation.snippetText}
              </p>
            </div>

            {/* Actions */}
            {onViewDetails && (
              <button
                onClick={() => onViewDetails(citation)}
                className="w-full text-xs text-primary hover:text-primary/80 font-medium
                         border border-primary/20 rounded-md px-3 py-2.5 min-h-[44px] hover:bg-primary/5
                         transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              >
                View Full Evidence
              </button>
            )}
          </div>
        </div>
      )}
    </span>
  );
}

/**
 * Parse content with citation markers and wrap them with CitationTooltip
 */
export function renderWithCitations(
  content: string,
  citations: Citation[],
  onViewDetails?: (citation: Citation) => void
): React.ReactNode {
  const citationRegex = /\[citation:([^\]]+)\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = citationRegex.exec(content)) !== null) {
    // Add text before citation
    if (match.index > lastIndex) {
      parts.push(content.substring(lastIndex, match.index));
    }

    // Find citation
    const citationId = match[1];
    const citation = citations.find(c => 
      c.evidenceId === citationId || c.id === citationId
    );

    if (citation) {
      parts.push(
        <CitationTooltip
          key={`citation-${key++}`}
          citation={citation}
          onViewDetails={onViewDetails}
        >
          [{key}]
        </CitationTooltip>
      );
    } else {
      // Citation not found, show as-is
      parts.push(`[${citationId}]`);
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }

  return parts.length > 0 ? parts : content;
}
