import { useState, useEffect } from 'react';

/**
 * Evidence item interface
 */
interface EvidenceItem {
  id: string;
  snippetText: string;
  provenance: {
    sourceType: string;
    date: string;
    classificationMethod: string;
    sourceRef?: string;
  };
  q2qScores: {
    dimension: string;
    score: number;
    confidence: number;
  };
}

/**
 * Evidence Drawer Props
 */
interface EvidenceDrawerProps {
  metricId?: string;
  companyId?: string;
  period?: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Format relative time (e.g., "2 days ago")
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 0) {
    return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  } else if (diffHour > 0) {
    return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  } else if (diffMin > 0) {
    return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
}

/**
 * Get badge color for classification method
 */
function getMethodBadgeColor(method: string): string {
  switch (method) {
    case 'ai_classifier':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'rule_based':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'manual':
      return 'bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
}

/**
 * Get badge color for source type
 */
function getSourceBadgeColor(sourceType: string): string {
  switch (sourceType) {
    case 'buddy_feedback':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
    case 'kintell_feedback':
      return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200';
    case 'checkin_note':
      return 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
}

/**
 * Format source type for display
 */
function formatSourceType(sourceType: string): string {
  return sourceType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Evidence Drawer Component
 *
 * Displays evidence lineage for metrics with redacted snippets,
 * Q2Q scores, and provenance information.
 */
export default function EvidenceDrawer({
  metricId,
  companyId,
  period,
  isOpen,
  onClose,
}: EvidenceDrawerProps) {
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (isOpen && (metricId || (companyId && period))) {
      fetchEvidence();
    }
  }, [isOpen, metricId, companyId, period]);

  const fetchEvidence = async () => {
    setLoading(true);
    setError(null);

    try {
      const analyticsUrl = import.meta.env.PUBLIC_ANALYTICS_API_URL || 'http://localhost:3007';
      let url: string;

      if (metricId) {
        url = `${analyticsUrl}/metrics/${metricId}/evidence?limit=100`;
      } else if (companyId && period) {
        url = `${analyticsUrl}/metrics/company/${companyId}/period/${period}/evidence?limit=100`;
      } else {
        throw new Error('Either metricId or (companyId and period) must be provided');
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch evidence: ${response.statusText}`);
      }

      const data = await response.json();
      setEvidence(data.evidence || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch evidence');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const totalPages = Math.ceil(evidence.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEvidence = evidence.slice(startIndex, endIndex);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute inset-y-0 right-0 max-w-2xl w-full bg-white dark:bg-gray-800 shadow-xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Evidence Lineage
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {evidence.length} evidence snippet{evidence.length !== 1 ? 's' : ''} found
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close evidence drawer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex">
                <svg
                  className="h-5 w-5 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                    Error loading evidence
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && evidence.length === 0 && (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                No evidence available for this metric
              </p>
            </div>
          )}

          {!loading && !error && currentEvidence.length > 0 && (
            <div className="space-y-4">
              {currentEvidence.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                >
                  {/* Snippet Text */}
                  <div className="mb-3">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {item.snippetText || 'No text available'}
                    </p>
                  </div>

                  {/* Metadata */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {/* Source Type */}
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSourceBadgeColor(
                        item.provenance.sourceType
                      )}`}
                    >
                      {formatSourceType(item.provenance.sourceType)}
                    </span>

                    {/* Classification Method */}
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMethodBadgeColor(
                        item.provenance.classificationMethod
                      )}`}
                    >
                      {item.provenance.classificationMethod.replace(/_/g, ' ')}
                    </span>

                    {/* Timestamp */}
                    <span className="inline-flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {formatRelativeTime(item.provenance.date)}
                    </span>
                  </div>

                  {/* Q2Q Scores */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {item.q2qScores.dimension}
                        </span>
                      </span>
                      <div className="flex items-center space-x-4">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Score: </span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {item.q2qScores.score.toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Confidence: </span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {item.q2qScores.confidence.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && evidence.length > itemsPerPage && (
            <div className="mt-6 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Showing {startIndex + 1} to {Math.min(endIndex, evidence.length)} of{' '}
                {evidence.length} results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 min-h-[44px] text-sm border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 min-h-[44px] text-sm border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
