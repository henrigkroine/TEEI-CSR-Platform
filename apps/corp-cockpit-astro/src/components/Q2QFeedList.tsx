import { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import EmptyState from './EmptyState';

export interface Q2QFeedItem {
  id: string;
  timestamp: string;
  participantId: string;
  snippet: string;
  confidence?: number;
  belonging?: number;
  languageComfort?: string;
  sentiment?: string;
  classificationMethod?: string;
  dimensions?: Record<string, number>;
}

export interface Q2QFeedListProps {
  companyId: string;
  token?: string;
  lang?: string;
}

export default function Q2QFeedList({ companyId, token, lang: _lang = 'en' }: Q2QFeedListProps) {
  const [feedItems, setFeedItems] = useState<Q2QFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [filters, setFilters] = useState({
    dimension: '',
    sentiment: '',
    startDate: '',
    endDate: '',
  });

  const itemsPerPage = 20;

  const fetchFeed = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('limit', String(itemsPerPage));
      params.append('offset', String((page - 1) * itemsPerPage));

      if (filters.dimension) params.append('dimension', filters.dimension);
      if (filters.sentiment) params.append('sentiment', filters.sentiment);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const baseUrl = import.meta.env.PUBLIC_ANALYTICS_SERVICE_URL || 'http://localhost:3007';
      const url = `${baseUrl}/metrics/company/${companyId}/q2q-feed?${params.toString()}`;

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`Failed to fetch Q2Q feed: ${response.statusText}`);
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        setFeedItems(data);
        setTotalItems(data.length);
      } else if (data.items && Array.isArray(data.items)) {
        setFeedItems(data.items);
        setTotalItems(data.total || data.items.length);
      } else {
        setFeedItems([]);
        setTotalItems(0);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load Q2Q feed');
      console.error('Q2Q Feed error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, [page, filters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filters change
  };

  const handleClearFilters = () => {
    setFilters({
      dimension: '',
      sentiment: '',
      startDate: '',
      endDate: '',
    });
    setPage(1);
  };

  const getRelativeTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays} days ago`;

    return date.toLocaleDateString();
  };

  const getSentimentBadge = (dimension: string, value: number) => {
    if (value > 0.6) {
      return {
        label: `${dimension}↑`,
        color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      };
    }
    if (value < 0.4) {
      return {
        label: `${dimension}↓`,
        color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      };
    }
    return {
      label: dimension,
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    };
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (loading) {
    return <LoadingSpinner message="Loading Q2Q feed..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchFeed} />;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Dimension
            </label>
            <select
              value={filters.dimension}
              onChange={(e) => handleFilterChange('dimension', e.target.value)}
              className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
            >
              <option value="">All Dimensions</option>
              <option value="confidence">Confidence</option>
              <option value="belonging">Belonging</option>
              <option value="language">Language Comfort</option>
              <option value="jobReadiness">Job Readiness</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sentiment
            </label>
            <select
              value={filters.sentiment}
              onChange={(e) => handleFilterChange('sentiment', e.target.value)}
              className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
            >
              <option value="">All Sentiments</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <button
            onClick={handleClearFilters}
            className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
          >
            Clear Filters
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {totalItems} {totalItems === 1 ? 'item' : 'items'} found
          </span>
        </div>
      </div>

      {/* Feed Items */}
      {feedItems.length > 0 ? (
        <div className="space-y-4">
          {feedItems.map((item) => {
            const badges = [];

            if (item.confidence !== undefined) {
              badges.push(getSentimentBadge('confidence', item.confidence));
            }
            if (item.belonging !== undefined) {
              badges.push(getSentimentBadge('belonging', item.belonging));
            }
            if (item.languageComfort) {
              badges.push({
                label: `lang: ${item.languageComfort}`,
                color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
              });
            }

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Participant #{item.participantId}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {getRelativeTime(item.timestamp)}
                    </span>
                  </div>
                  {item.sentiment && (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.sentiment === 'positive'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : item.sentiment === 'neutral'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}
                    >
                      {item.sentiment}
                    </span>
                  )}
                </div>

                <p className="text-gray-700 dark:text-gray-300 mb-3">
                  {item.snippet && item.snippet.length > 200
                    ? `${item.snippet.substring(0, 200)}...`
                    : item.snippet}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    {badges.map((badge, index) => (
                      <span
                        key={index}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}
                      >
                        {badge.label}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {item.classificationMethod || 'manual'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No Q2Q data available"
          message="There are no Q2Q classifications matching your filters. Try adjusting the filters or check back later."
          icon="search"
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <span className="text-sm text-gray-700 dark:text-gray-300">
            Page {page} of {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
