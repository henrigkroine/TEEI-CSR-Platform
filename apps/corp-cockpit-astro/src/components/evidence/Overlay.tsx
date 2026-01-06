/**
 * Evidence Overlay Component for Boardroom Live
 *
 * Displays evidence citations and metadata as an overlay on top of metrics
 * and charts during boardroom presentations. Shows evidence IDs, sources,
 * confidence scores, and lineage on hover.
 *
 * Features:
 * - Toggle on/off evidence indicators
 * - Hover to reveal full evidence details
 * - Evidence ID badges on metrics
 * - Citation count indicators
 * - Confidence score visualization
 * - Keyboard accessible (Tab navigation)
 * - Screen reader friendly (ARIA labels)
 *
 * @module EvidenceOverlay
 */

import { useState, useEffect, useCallback, ReactNode } from 'react';

export interface EvidenceItem {
  /** Unique evidence identifier */
  id: string;
  /** Evidence type (e.g., 'survey', 'document', 'api', 'calculation') */
  type: 'survey' | 'document' | 'api' | 'calculation' | 'manual';
  /** Source of the evidence */
  source: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Timestamp when evidence was collected */
  timestamp: string;
  /** Optional description */
  description?: string;
  /** Lineage chain (upstream evidence IDs) */
  lineage?: string[];
  /** Whether evidence is verified */
  verified?: boolean;
}

export interface OverlayProps {
  /** Whether overlay is enabled */
  enabled: boolean;
  /** Evidence items to display */
  evidence: EvidenceItem[];
  /** Callback when overlay is toggled */
  onToggle?: (enabled: boolean) => void;
  /** Children to wrap with evidence overlay */
  children: ReactNode;
  /** Custom class name */
  className?: string;
  /** Position of the overlay toggle button */
  togglePosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function EvidenceOverlay({
  enabled,
  evidence,
  onToggle,
  children,
  className = '',
  togglePosition = 'top-right',
}: OverlayProps) {
  const [isVisible, setIsVisible] = useState(enabled);
  const [hoveredEvidence, setHoveredEvidence] = useState<string | null>(null);
  const [hoveredPosition, setHoveredPosition] = useState<{ x: number; y: number } | null>(null);

  // Sync enabled prop with internal state
  useEffect(() => {
    setIsVisible(enabled);
  }, [enabled]);

  // Handle toggle
  const handleToggle = useCallback(() => {
    const newState = !isVisible;
    setIsVisible(newState);
    if (onToggle) {
      onToggle(newState);
    }
  }, [isVisible, onToggle]);

  // Handle keyboard shortcuts (Alt+E to toggle evidence)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.key === 'e') {
        event.preventDefault();
        handleToggle();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleToggle]);

  // Get evidence by ID
  const getEvidence = (id: string): EvidenceItem | undefined => {
    return evidence.find((e) => e.id === id);
  };

  // Handle hover over evidence badge
  const handleEvidenceHover = useCallback(
    (evidenceId: string, event: React.MouseEvent<HTMLElement>) => {
      setHoveredEvidence(evidenceId);
      setHoveredPosition({ x: event.clientX, y: event.clientY });
    },
    []
  );

  // Handle mouse leave
  const handleEvidenceLeave = useCallback(() => {
    setHoveredEvidence(null);
    setHoveredPosition(null);
  }, []);

  // Get position classes for toggle button
  const getTogglePositionClasses = () => {
    const positions = {
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4',
      'bottom-right': 'bottom-4 right-4',
      'bottom-left': 'bottom-4 left-4',
    };
    return positions[togglePosition];
  };

  // Get confidence color
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.9) return 'text-green-500';
    if (confidence >= 0.7) return 'text-yellow-500';
    if (confidence >= 0.5) return 'text-orange-500';
    return 'text-red-500';
  };

  // Get type icon
  const getTypeIcon = (type: EvidenceItem['type']): string => {
    const icons = {
      survey: '📊',
      document: '📄',
      api: '🔌',
      calculation: '🧮',
      manual: '✍️',
    };
    return icons[type] || '📎';
  };

  return (
    <div className={`evidence-overlay-container relative ${className}`}>
      {/* Toggle Button */}
      <button
        onClick={handleToggle}
        className={`
          fixed ${getTogglePositionClasses()} z-50
          px-4 py-2 rounded-lg shadow-lg
          ${isVisible ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700'}
          text-white font-medium text-sm
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        `}
        aria-label={isVisible ? 'Hide Evidence Overlay' : 'Show Evidence Overlay'}
        aria-pressed={isVisible}
      >
        <span className="flex items-center gap-2">
          <span className="text-lg" aria-hidden="true">
            {isVisible ? '👁️' : '👁️‍🗨️'}
          </span>
          <span>{isVisible ? 'Hide' : 'Show'} Evidence</span>
          <kbd className="text-xs opacity-75 ml-1">(Alt+E)</kbd>
        </span>
      </button>

      {/* Main Content with Evidence Badges */}
      <div className="evidence-content">
        {children}
      </div>

      {/* Evidence Detail Popup (shown on hover) */}
      {isVisible && hoveredEvidence && hoveredPosition && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: hoveredPosition.x + 10,
            top: hoveredPosition.y + 10,
            maxWidth: '400px',
          }}
          role="tooltip"
          aria-live="polite"
        >
          {(() => {
            const evidenceItem = getEvidence(hoveredEvidence);
            if (!evidenceItem) return null;

            return (
              <div className="bg-gray-900 text-white rounded-lg shadow-2xl p-4 border border-gray-700">
                {/* Header */}
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getTypeIcon(evidenceItem.type)}</span>
                    <div>
                      <div className="font-bold text-sm">Evidence ID</div>
                      <div className="font-mono text-xs text-blue-400">{evidenceItem.id}</div>
                    </div>
                  </div>
                  {evidenceItem.verified && (
                    <span
                      className="text-green-400 text-sm"
                      title="Verified"
                      aria-label="Verified evidence"
                    >
                      ✓
                    </span>
                  )}
                </div>

                {/* Type and Source */}
                <div className="mb-3">
                  <div className="text-xs text-gray-400 uppercase mb-1">Source</div>
                  <div className="text-sm">{evidenceItem.source}</div>
                </div>

                {/* Description */}
                {evidenceItem.description && (
                  <div className="mb-3">
                    <div className="text-xs text-gray-400 uppercase mb-1">Description</div>
                    <div className="text-sm">{evidenceItem.description}</div>
                  </div>
                )}

                {/* Confidence */}
                <div className="mb-3">
                  <div className="text-xs text-gray-400 uppercase mb-1">Confidence</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full ${getConfidenceColor(evidenceItem.confidence).replace('text-', 'bg-')}`}
                        style={{ width: `${evidenceItem.confidence * 100}%` }}
                        role="progressbar"
                        aria-valuenow={evidenceItem.confidence * 100}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      />
                    </div>
                    <span className={`text-sm font-bold ${getConfidenceColor(evidenceItem.confidence)}`}>
                      {(evidenceItem.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Timestamp */}
                <div className="mb-3">
                  <div className="text-xs text-gray-400 uppercase mb-1">Collected</div>
                  <div className="text-sm">
                    {new Date(evidenceItem.timestamp).toLocaleString()}
                  </div>
                </div>

                {/* Lineage */}
                {evidenceItem.lineage && evidenceItem.lineage.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-400 uppercase mb-1">Lineage</div>
                    <div className="flex flex-wrap gap-1">
                      {evidenceItem.lineage.map((lineageId) => (
                        <span
                          key={lineageId}
                          className="inline-block px-2 py-1 bg-gray-800 rounded text-xs font-mono"
                        >
                          {lineageId}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

/**
 * Evidence Badge Component
 *
 * Small badge that can be attached to metrics/charts to indicate evidence
 */
export interface EvidenceBadgeProps {
  /** Evidence ID to display */
  evidenceId: string;
  /** Evidence item (for tooltip) */
  evidence?: EvidenceItem;
  /** Callback when badge is hovered */
  onHover?: (evidenceId: string, event: React.MouseEvent<HTMLElement>) => void;
  /** Callback when mouse leaves */
  onLeave?: () => void;
  /** Badge size */
  size?: 'sm' | 'md' | 'lg';
  /** Whether overlay is enabled */
  overlayEnabled?: boolean;
}

export function EvidenceBadge({
  evidenceId,
  evidence,
  onHover,
  onLeave,
  size = 'sm',
  overlayEnabled = true,
}: EvidenceBadgeProps) {
  if (!overlayEnabled) return null;

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const getConfidenceColor = (confidence?: number): string => {
    if (!confidence) return 'bg-gray-500';
    if (confidence >= 0.9) return 'bg-green-500';
    if (confidence >= 0.7) return 'bg-yellow-500';
    if (confidence >= 0.5) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full
        ${getConfidenceColor(evidence?.confidence)}
        text-white font-mono font-bold
        ${sizeClasses[size]}
        cursor-help
        transition-transform duration-200 hover:scale-110
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
      `}
      onMouseEnter={(e) => onHover?.(evidenceId, e)}
      onMouseLeave={onLeave}
      role="button"
      tabIndex={0}
      aria-label={`Evidence ${evidenceId}, confidence ${evidence?.confidence ? (evidence.confidence * 100).toFixed(0) : 'unknown'}%`}
    >
      <span className="text-xs" aria-hidden="true">
        🔍
      </span>
      <span>{evidenceId.slice(0, 6)}</span>
    </span>
  );
}

/**
 * Hook for managing evidence overlay state
 */
export function useEvidenceOverlay(initialEnabled = false) {
  const [enabled, setEnabled] = useState(initialEnabled);

  const toggle = useCallback(() => {
    setEnabled((prev) => !prev);
  }, []);

  const enable = useCallback(() => {
    setEnabled(true);
  }, []);

  const disable = useCallback(() => {
    setEnabled(false);
  }, []);

  return {
    enabled,
    toggle,
    enable,
    disable,
  };
}
