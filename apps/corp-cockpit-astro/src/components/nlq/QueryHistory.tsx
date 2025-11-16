/**
 * NLQ Query History Component
 *
 * List of recent queries with ability to re-run and delete
 * Features:
 * - List of recent queries
 * - Timestamp and execution time
 * - Confidence indicator
 * - Click to re-run query
 * - Delete from history
 * - Pagination (10 per page)
 */

import React, { useState, useEffect } from 'react';
import {
  type QueryHistoryItem,
  formatExecutionTime,
  formatConfidence,
  getConfidenceColor,
} from '../../lib/nlq-api';
import LoadingSpinner from '../LoadingSpinner';
import ErrorMessage from '../ErrorMessage';

export interface QueryHistoryProps {
  companyId: string;
  queries: QueryHistoryItem[];
  loading?: boolean;
  error?: string | null;
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
  onRerun: (question: string) => void;
  onDelete?: (queryId: string) => void;
  onPageChange?: (page: number) => void;
  className?: string;
}

const STATUS_BADGES = {
  success: {
    label: 'Success',
    color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <title>Success</title>
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  failed: {
    label: 'Failed',
    color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <title>Failed</title>
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  pending: {
    label: 'Pending',
    color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <title>Pending</title>
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <title>Rejected</title>
        <path
          fillRule="evenodd"
          d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
};

export default function QueryHistory({
  companyId,
  queries,
  loading = false,
  error = null,
  totalCount = 0,
  currentPage = 1,
  pageSize = 10,
  onRerun,
  onDelete,
  onPageChange,
  className = '',
}: QueryHistoryProps) {
  const totalPages = Math.ceil(totalCount / pageSize);

  // Format relative time
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // Get confidence level from score
  const getConfidenceLevel = (score: number | null): 'high' | 'medium' | 'low' => {
    if (score === null) return 'low';
    if (score >= 0.8) return 'high';
    if (score >= 0.5) return 'medium';
    return 'low';
  };

  if (loading && queries.length === 0) {
    return <LoadingSpinner message="Loading query history..." />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (queries.length === 0) {
    return (
      <div className={`query-history-empty ${className}`}>
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <svg
            className="mx-auto w-16 h-16 text-gray-400 dark:text-gray-600 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <title>No history icon</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No query history
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your recent queries will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`query-history ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Recent Queries
        </h3>
        {totalCount > 0 && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {totalCount} total
          </span>
        )}
      </div>

      {/* Query list */}
      <div className="space-y-3">
        {queries.map((query) => {
          const statusBadge = STATUS_BADGES[query.executionStatus] || STATUS_BADGES.pending;
          const confidenceLevel = getConfidenceLevel(query.answerConfidence);
          const confidenceColor = getConfidenceColor(confidenceLevel);

          return (
            <div
              key={query.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => onRerun(query.question)}
                    className="text-left w-full group"
                    aria-label={`Re-run query: ${query.question}`}
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-2">
                      {query.question}
                    </p>
                  </button>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatRelativeTime(query.createdAt)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center ml-4 space-x-2">
                  <button
                    type="button"
                    onClick={() => onRerun(query.question)}
                    className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    aria-label="Re-run query"
                    title="Re-run query"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <title>Re-run</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </button>
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(query.id)}
                      className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                      aria-label="Delete query"
                      title="Delete query"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <title>Delete</title>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Status badge */}
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full ${statusBadge.color}`}
                >
                  {statusBadge.icon}
                  <span className="ml-1">{statusBadge.label}</span>
                </span>

                {/* Confidence */}
                {query.answerConfidence !== null && (
                  <span className={`inline-flex items-center px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 ${confidenceColor}`}>
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <title>Confidence</title>
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {formatConfidence(query.answerConfidence)}
                  </span>
                )}

                {/* Execution time */}
                {query.executionTimeMs !== null && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <title>Time</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {formatExecutionTime(query.executionTimeMs)}
                  </span>
                )}

                {/* Cached indicator */}
                {query.cached && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <title>Cached</title>
                      <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
                      <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
                      <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
                    </svg>
                    Cached
                  </span>
                )}

                {/* Safety warning */}
                {!query.safetyPassed && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <title>Safety warning</title>
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Safety Check
                  </span>
                )}
              </div>

              {/* Answer summary (if available) */}
              {query.answerSummary && (
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                  {query.answerSummary}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && onPageChange && (
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <title>Previous</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Previous
          </button>

          <span className="text-sm text-gray-700 dark:text-gray-300">
            Page {currentPage} of {totalPages}
          </span>

          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            Next
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <title>Next</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Loading overlay for pagination */}
      {loading && queries.length > 0 && (
        <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 flex items-center justify-center rounded-lg">
          <LoadingSpinner size="md" />
        </div>
      )}
    </div>
  );
}
