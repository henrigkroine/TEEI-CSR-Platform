import { useState, useEffect, useRef } from 'react';
import type { EvidenceLineage } from '@teei/shared-types';

interface LineageDrawerProps {
  metricId: string;
  metricName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function LineageDrawer({
  metricId,
  metricName,
  isOpen,
  onClose,
}: LineageDrawerProps) {
  const [lineage, setLineage] = useState<EvidenceLineage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchLineage();
      // Focus close button when drawer opens (accessibility)
      setTimeout(() => closeButtonRef.current?.focus(), 100);
    }
  }, [isOpen, metricId]);

  useEffect(() => {
    // Trap focus in drawer when open
    if (!isOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  async function fetchLineage() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/lineage/${metricId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch lineage');
      }

      const data: EvidenceLineage = await response.json();
      setLineage(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  function getLevelIcon(level: number) {
    if (level === 3) return '📊'; // Metric
    if (level === 2) return '🎯'; // Outcome score
    return '💬'; // Evidence snippet
  }

  function getLevelLabel(level: number) {
    if (level === 3) return 'Metric';
    if (level === 2) return 'Outcome Score';
    return 'Evidence';
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl overflow-y-auto bg-background shadow-2xl"
        role="dialog"
        aria-labelledby="lineage-drawer-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-border bg-background px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="lineage-drawer-title" className="text-xl font-bold">
                Evidence Lineage
              </h2>
              <p className="mt-1 text-sm text-foreground/60">{metricName}</p>
            </div>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="btn-secondary"
              aria-label="Close lineage drawer"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="py-12 text-center">
              <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
              <p className="text-foreground/60">Loading lineage...</p>
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <p className="text-red-600">{error}</p>
              <button onClick={fetchLineage} className="btn-secondary mt-4">
                Retry
              </button>
            </div>
          ) : lineage ? (
            <>
              {/* Summary */}
              <div className="card mb-6 bg-primary/5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-foreground/60">
                      Metric Value
                    </div>
                    <div className="text-3xl font-bold">{lineage.metricValue}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground/60">
                      Aggregation Method
                    </div>
                    <div className="text-foreground">{lineage.aggregationMethod}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground/60">
                      Evidence Count
                    </div>
                    <div className="text-2xl font-bold">{lineage.totalEvidenceCount}</div>
                  </div>
                </div>
              </div>

              {/* Lineage Chain */}
              <div className="space-y-4">
                <h3 className="font-semibold">Traceability Chain</h3>

                {/* Group by level */}
                {[3, 2, 1].map((level) => {
                  const items = lineage.evidenceChain.filter((item) => item.level === level);
                  if (items.length === 0) return null;

                  return (
                    <div key={level} className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground/60">
                        <span>{getLevelIcon(level)}</span>
                        <span>{getLevelLabel(level)}</span>
                        <span className="text-xs">({items.length})</span>
                      </div>

                      <div className="space-y-2 pl-6">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-md border border-border bg-background p-4"
                          >
                            <div className="mb-2 flex items-start justify-between">
                              <p className="text-sm text-foreground">{item.description}</p>
                              {item.contributionWeight !== undefined && (
                                <span className="ml-4 shrink-0 rounded-full bg-border px-2 py-0.5 text-xs font-medium">
                                  {(item.contributionWeight * 100).toFixed(0)}%
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-foreground/40">ID: {item.id}</div>
                          </div>
                        ))}
                      </div>

                      {/* Arrow pointing to next level */}
                      {level > 1 && (
                        <div className="flex justify-center py-2">
                          <svg
                            className="h-6 w-6 text-border"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Period */}
              <div className="mt-6 card bg-border/20">
                <div className="text-sm">
                  <span className="font-medium">Analysis Period:</span>{' '}
                  <span className="text-foreground/60">
                    {lineage.period.start} to {lineage.period.end}
                  </span>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
