/**
 * NLQ Main Page Component
 *
 * Main page composition with search, templates, results, and history
 * Features:
 * - Search bar at top
 * - Template suggestions below
 * - Answer cards in results area
 * - Query history sidebar
 * - Empty state with examples
 * - Error handling with retry
 * - Optimistic updates for better UX
 */

import React, { useState, useEffect, useCallback } from 'react';
import SearchBar from './SearchBar';
import TemplateSuggestions from './TemplateSuggestions';
import QueryHistory from './QueryHistory';
import EmptyState from '../EmptyState';
import LoadingSpinner from '../LoadingSpinner';
import {
  createNLQClient,
  type NLQResponse,
  type QueryHistoryItem,
  formatExecutionTime,
  formatConfidence,
  getConfidenceColor,
  isRateLimitError,
  type RateLimitError,
} from '../../lib/nlq-api';

export interface NLQPageProps {
  companyId: string;
  userId?: string;
  sessionId?: string;
  language?: 'en' | 'uk' | 'no' | 'es' | 'fr';
}

interface AnswerCardData {
  queryId: string;
  question: string;
  answer: NLQResponse['answer'];
  metadata: NLQResponse['metadata'];
  timestamp: Date;
}

export default function NLQPage({
  companyId,
  userId,
  sessionId,
  language = 'en',
}: NLQPageProps) {
  // State
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitError, setRateLimitError] = useState<RateLimitError | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<AnswerCardData | null>(null);
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);

  const PAGE_SIZE = 10;
  const nlqClient = createNLQClient();

  // Load query history on mount
  useEffect(() => {
    loadHistory();
  }, [companyId, historyPage]);

  // Load query history
  const loadHistory = async () => {
    setHistoryLoading(true);
    setHistoryError(null);

    try {
      const response = await nlqClient.getHistory({
        companyId,
        limit: PAGE_SIZE,
        offset: (historyPage - 1) * PAGE_SIZE,
      });

      setQueryHistory(response.queries);
      setHistoryTotal(response.pagination.total);
    } catch (err) {
      console.error('Failed to load query history:', err);
      setHistoryError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Submit question
  const handleSubmit = async (question: string) => {
    setLoading(true);
    setError(null);
    setRateLimitError(null);
    setCurrentQuestion(question);

    try {
      const response = await nlqClient.ask({
        question,
        companyId,
        userId,
        sessionId,
        context: {
          language,
        },
      });

      setCurrentAnswer({
        queryId: response.queryId,
        question,
        answer: response.answer,
        metadata: response.metadata,
        timestamp: new Date(),
      });

      // Refresh history
      loadHistory();
    } catch (err: any) {
      console.error('NLQ query failed:', err);

      // Check if it's a rate limit error
      if (isRateLimitError(err)) {
        setRateLimitError(err);
        setError(
          `${err.message}. Daily limit: ${err.limits.daily}, Hourly limit: ${err.limits.hourly}. Resets at ${new Date(err.resetAt).toLocaleTimeString()}`
        );
      } else {
        setError(err.message || 'Failed to process your question. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Re-run query from history
  const handleRerun = (question: string) => {
    handleSubmit(question);
  };

  // Clear error
  const handleClearError = () => {
    setError(null);
    setRateLimitError(null);
  };

  // Retry current question
  const handleRetry = () => {
    if (currentQuestion) {
      handleSubmit(currentQuestion);
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setHistoryPage(page);
  };

  // Example questions for autocomplete
  const exampleQuestions = [
    'What is our SROI for Q4 2024?',
    'Show me volunteer hours this month',
    'How many beneficiaries did we serve this year?',
    'What is our total social impact this quarter?',
    'Show me outcomes by demographic',
    'Compare SROI across regions',
    'What are our top performing programs?',
    'Show me engagement by department',
  ];

  // Get recent questions from history
  const recentQuestions = queryHistory
    .filter((q) => q.executionStatus === 'success')
    .slice(0, 5)
    .map((q) => q.question);

  return (
    <div className="nlq-page">
      {/* Main content area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Search and Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search bar */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Ask a Question
            </h2>
            <SearchBar
              companyId={companyId}
              onSubmit={handleSubmit}
              loading={loading}
              error={error}
              autocompleteSuggestions={exampleQuestions}
              recentQueries={recentQuestions}
              onClearError={handleClearError}
              placeholder="Ask anything about your CSR data..."
            />
          </div>

          {/* Answer card */}
          {currentAnswer && !loading && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="mb-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Answer
                  </h3>
                  <div className="flex items-center space-x-2">
                    {/* Confidence badge */}
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getConfidenceColor(currentAnswer.answer.confidence.level)}`}
                    >
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <title>Confidence</title>
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {formatConfidence(currentAnswer.answer.confidence.overall)} confidence
                    </span>

                    {/* Cached indicator */}
                    {currentAnswer.metadata.cached && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <title>Cached</title>
                          <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
                          <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
                          <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
                        </svg>
                        Cached
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  <span className="font-medium">Question:</span> {currentAnswer.question}
                </p>
              </div>

              {/* Answer summary */}
              <div className="prose dark:prose-invert max-w-none mb-4">
                <p className="text-gray-900 dark:text-white">{currentAnswer.answer.summary}</p>
              </div>

              {/* Data table (if available) */}
              {currentAnswer.answer.data && currentAnswer.answer.data.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        {Object.keys(currentAnswer.answer.data[0]).map((key) => (
                          <th
                            key={key}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                          >
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {currentAnswer.answer.data.slice(0, 10).map((row, index) => (
                        <tr key={index}>
                          {Object.values(row).map((value, cellIndex) => (
                            <td
                              key={cellIndex}
                              className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap"
                            >
                              {String(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {currentAnswer.answer.data.length > 10 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      Showing 10 of {currentAnswer.answer.data.length} results
                    </p>
                  )}
                </div>
              )}

              {/* Metadata */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap gap-4 text-xs text-gray-600 dark:text-gray-400">
                  <span>
                    <span className="font-medium">Execution time:</span>{' '}
                    {formatExecutionTime(currentAnswer.metadata.executionTimeMs)}
                  </span>
                  <span>
                    <span className="font-medium">Intent:</span> {currentAnswer.metadata.intent}
                  </span>
                  <span>
                    <span className="font-medium">Tokens used:</span>{' '}
                    {currentAnswer.metadata.tokensUsed.toLocaleString()}
                  </span>
                  <span>
                    <span className="font-medium">Cost:</span> $
                    {currentAnswer.metadata.estimatedCostUSD}
                  </span>
                </div>

                {/* Confidence recommendations */}
                {currentAnswer.answer.confidence.recommendations.length > 0 && (
                  <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                    <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                      Recommendations:
                    </p>
                    <ul className="text-xs text-yellow-700 dark:text-yellow-400 list-disc list-inside space-y-1">
                      {currentAnswer.answer.confidence.recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12">
              <LoadingSpinner size="lg" message="Analyzing your question..." />
            </div>
          )}

          {/* Empty state */}
          {!currentAnswer && !loading && !error && (
            <EmptyState
              title="No results yet"
              message="Ask a question above or select a template to get started"
              icon="search"
            />
          )}

          {/* Template suggestions */}
          {!currentAnswer && !loading && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <TemplateSuggestions onSelectTemplate={handleSubmit} />
            </div>
          )}
        </div>

        {/* Right column - History sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 sticky top-6">
            <QueryHistory
              companyId={companyId}
              queries={queryHistory}
              loading={historyLoading}
              error={historyError}
              totalCount={historyTotal}
              currentPage={historyPage}
              pageSize={PAGE_SIZE}
              onRerun={handleRerun}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
