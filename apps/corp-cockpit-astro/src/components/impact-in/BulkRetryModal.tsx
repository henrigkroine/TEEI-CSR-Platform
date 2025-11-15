/**
 * BulkRetryModal Component
 *
 * Modal for bulk retry operations:
 * - Retry multiple selected deliveries
 * - Retry all failed deliveries for a company/provider
 * - Shows progress and results
 */

import React, { useState } from 'react';
import type { Delivery, BulkReplayResponse, RetryAllFailedRequest, DeliveryProvider } from './types';

interface BulkRetryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDeliveries?: Delivery[];
  companyId: string;
  provider?: DeliveryProvider;
  onSuccess?: () => void;
  mode: 'selected' | 'all-failed';
}

export default function BulkRetryModal({
  isOpen,
  onClose,
  selectedDeliveries = [],
  companyId,
  provider,
  onSuccess,
  mode,
}: BulkRetryModalProps) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BulkReplayResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleBulkRetry = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      let response: Response;

      if (mode === 'selected') {
        // Retry selected deliveries
        const ids = selectedDeliveries.map(d => d.id);

        if (ids.length === 0) {
          throw new Error('No deliveries selected');
        }

        if (ids.length > 100) {
          throw new Error('Maximum 100 deliveries can be retried at once');
        }

        response = await fetch('/v1/impact-in/deliveries/bulk-replay', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ids }),
        });
      } else {
        // Retry all failed deliveries
        const requestBody: RetryAllFailedRequest = { companyId };
        if (provider) {
          requestBody.provider = provider;
        }

        response = await fetch('/v1/impact-in/deliveries/retry-all-failed', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Bulk retry failed');
      }

      const data: BulkReplayResponse = await response.json();
      setResults(data);

      // Call success callback after a delay to show results
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to perform bulk retry');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setResults(null);
      setError(null);
      onClose();
    }
  };

  const failedCount = selectedDeliveries.filter(d => d.status === 'failed').length;
  const nonFailedCount = selectedDeliveries.length - failedCount;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="bulk-retry-modal"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {mode === 'selected' ? 'Bulk Retry Selected' : 'Retry All Failed Deliveries'}
            </h3>
            <button
              onClick={handleClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 disabled:opacity-50"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            {!results && !error && (
              <>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
                  <div className="flex">
                    <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="text-sm text-yellow-800 dark:text-yellow-200">
                      {mode === 'selected' ? (
                        <>
                          <p className="font-medium mb-1">About to retry {failedCount} failed deliveries</p>
                          {nonFailedCount > 0 && (
                            <p className="text-xs text-yellow-700 dark:text-yellow-300">
                              Note: {nonFailedCount} non-failed deliveries will be skipped
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="font-medium">
                          This will retry all failed deliveries
                          {provider && ` for ${provider}`}. This operation cannot be undone.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {mode === 'selected'
                    ? `You are about to retry ${selectedDeliveries.length} selected deliveries. Failed deliveries will be resent to their respective providers.`
                    : 'All failed deliveries matching your criteria will be retried. This may take a few moments.'}
                </p>
              </>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-red-600 dark:text-red-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              </div>
            )}

            {/* Results */}
            {results && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-md p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {results.summary.total}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Total</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-md p-3 text-center">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {results.summary.successful}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Success</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-md p-3 text-center">
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {results.summary.failed}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Failed</p>
                  </div>
                </div>

                {/* Detailed results (scrollable if many) */}
                {results.results.length > 0 && (
                  <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
                            Delivery ID
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
                            Result
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {results.results.map((result) => (
                          <tr key={result.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                            <td className="px-3 py-2 font-mono text-gray-900 dark:text-gray-100">
                              {result.id.slice(0, 8)}...
                            </td>
                            <td className="px-3 py-2">
                              {result.success ? (
                                <span className="inline-flex items-center text-green-600 dark:text-green-400">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  Success
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-red-600 dark:text-red-400" title={result.error}>
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                  </svg>
                                  Failed
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {results ? 'Close' : 'Cancel'}
            </button>

            {!results && (
              <button
                onClick={handleBulkRetry}
                disabled={loading || (mode === 'selected' && selectedDeliveries.length === 0)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Retrying...
                  </>
                ) : (
                  'Confirm Retry'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
