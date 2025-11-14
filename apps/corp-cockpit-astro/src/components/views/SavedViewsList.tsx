/**
 * SavedViewsList Component
 *
 * Displays list of saved views with ability to load, edit, or delete
 * Shows both user's own views and shared team views
 */

import { useState, useEffect } from 'react';
import type { FC } from 'react';

interface SavedView {
  id: string;
  view_name: string;
  description: string | null;
  filter_config: Record<string, any>;
  is_default: boolean;
  is_shared: boolean;
  is_owner: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
}

interface SavedViewsListProps {
  companyId: string;
  onViewLoad: (filterConfig: Record<string, any>) => void;
  currentFilters?: Record<string, any>;
}

export const SavedViewsList: FC<SavedViewsListProps> = ({
  companyId,
  onViewLoad,
  currentFilters,
}) => {
  const [views, setViews] = useState<SavedView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingViewId, setDeletingViewId] = useState<string | null>(null);

  const loadViews = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/companies/${companyId}/views`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load saved views');
      }

      const data = await response.json();
      setViews(data.views);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load views');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadViews();
  }, [companyId]);

  const handleDelete = async (viewId: string) => {
    if (!confirm('Are you sure you want to delete this view?')) {
      return;
    }

    setDeletingViewId(viewId);

    try {
      const response = await fetch(`/api/companies/${companyId}/views/${viewId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete view');
      }

      await loadViews();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete view');
    } finally {
      setDeletingViewId(null);
    }
  };

  const handleSetDefault = async (viewId: string) => {
    try {
      const response = await fetch(`/api/companies/${companyId}/views/${viewId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          is_default: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to set default view');
      }

      await loadViews();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set default view');
    }
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
        <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        <button
          onClick={loadViews}
          className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (views.length === 0) {
    return (
      <div className="text-center py-8">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
          No saved views
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Save your first view to access it quickly later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {views.map((view) => (
        <div
          key={view.id}
          className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg
                   hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {view.view_name}
                </h3>
                {view.is_default && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded">
                    Default
                  </span>
                )}
                {view.is_shared && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded">
                    Team
                  </span>
                )}
                {!view.is_owner && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded">
                    Shared with you
                  </span>
                )}
              </div>

              {view.description && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                  {view.description}
                </p>
              )}

              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span>Used {view.view_count} times</span>
                <span>Updated {formatDate(view.updated_at)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onViewLoad(view.filter_config)}
                className="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400
                         hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Load this view"
              >
                Load
              </button>

              {view.is_owner && (
                <>
                  {!view.is_default && (
                    <button
                      onClick={() => handleSetDefault(view.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                               hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors
                               focus:outline-none focus:ring-2 focus:ring-gray-500"
                      title="Set as default"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                        />
                      </svg>
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(view.id)}
                    disabled={deletingViewId === view.id}
                    className="p-1.5 text-red-400 hover:text-red-600 dark:hover:text-red-300
                             hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors
                             disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                    title="Delete view"
                  >
                    {deletingViewId === view.id ? (
                      <div className="w-4 h-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
