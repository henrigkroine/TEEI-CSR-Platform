import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { ImpactTile, LanguageTile, MentorshipTile } from '@teei/shared-types';
import LanguageTileWidget from '../../widgets/impact-tiles/LanguageTileWidget';
import MentorshipTileWidget from '../../widgets/impact-tiles/MentorshipTileWidget';
import type { ProgrammeFilter } from './ProgrammeSelector';
export type { ProgrammeFilter } from './ProgrammeSelector';
import EmptyState from '../EmptyState';

interface ProgrammeTilesProps {
  companyId: string;
  period?: 'week' | 'month' | 'quarter' | 'year';
  apiBaseUrl?: string;
  programmeFilter?: ProgrammeFilter; // Optional prop to override URL-based filter
  enableAutoRefresh?: boolean; // Auto-refresh every 5 minutes
  autoRefreshInterval?: number; // Custom interval in ms (default: 5 minutes)
  onTileUpdate?: (tileType: 'language' | 'mentorship', tile: ImpactTile) => void; // Callback when tile updates
}

interface TileState {
  data: ImpactTile | null;
  loading: boolean;
  error: string | null;
  retryCount: number;
  lastFetched: number | null;
  lastError: string | null;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // 1 second base delay
const DEFAULT_AUTO_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const CACHE_TTL = 60 * 1000; // 1 minute cache
const REQUEST_TIMEOUT = 30000; // 30 seconds

/**
 * Calculate exponential backoff delay for retries
 */
function getRetryDelay(retryCount: number): number {
  return RETRY_DELAY_BASE * Math.pow(2, retryCount);
}

/**
 * Validate tile data structure
 */
function validateTileData(data: any, tileType: 'language' | 'mentorship'): boolean {
  if (!data || typeof data !== 'object') return false;
  if (!data.metadata || typeof data.metadata !== 'object') return false;
  if (!data.metadata.companyId || !data.metadata.period) return false;
  if (!data.data || typeof data.data !== 'object') return false;
  return true;
}

/**
 * Get user-friendly error message
 */
function getErrorMessage(error: unknown, tileType: 'language' | 'mentorship'): string {
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return 'Request timed out. Please check your connection and try again.';
    }
    if (error.message.includes('404') || error.message.includes('No data')) {
      return `No ${tileType === 'language' ? 'Language Connect' : 'Mentors for Ukraine'} data available for this period. Import CSV data to see metrics.`;
    }
    if (error.message.includes('500') || error.message.includes('503')) {
      return 'Service temporarily unavailable. Please try again in a moment.';
    }
    if (error.message.includes('403') || error.message.includes('401')) {
      return 'You do not have permission to view this data. Please contact your administrator.';
    }
    return error.message;
  }
  return `Failed to load ${tileType === 'language' ? 'Language Connect' : 'Mentors for Ukraine'} data. Please try again.`;
}

/**
 * Programme Tiles Component
 *
 * World-class implementation with:
 * - Retry mechanisms with exponential backoff
 * - Intelligent loading skeletons matching tile structure
 * - Empty states with actionable guidance
 * - Performance optimizations (memoization, request cancellation)
 * - Accessibility (ARIA, keyboard navigation, focus management)
 * - Error handling with user-friendly, actionable messages
 * - Auto-refresh capability
 * - Data validation
 * - Proper TypeScript types
 * - Request timeout handling
 * - Cache management
 */
export default function ProgrammeTiles({
  companyId,
  period = 'month',
  apiBaseUrl = '/v1/analytics',
  programmeFilter: forcedFilter,
  enableAutoRefresh = false,
  autoRefreshInterval = DEFAULT_AUTO_REFRESH_INTERVAL,
  onTileUpdate,
}: ProgrammeTilesProps) {
  const [programmeFilter, setProgrammeFilter] = useState<ProgrammeFilter>(
    forcedFilter || 'all'
  );

  const [languageState, setLanguageState] = useState<TileState>({
    data: null,
    loading: false,
    error: null,
    retryCount: 0,
    lastFetched: null,
    lastError: null,
  });

  const [mentorshipState, setMentorshipState] = useState<TileState>({
    data: null,
    loading: false,
    error: null,
    retryCount: 0,
    lastFetched: null,
    lastError: null,
  });

  const abortControllersRef = useRef<{
    language: AbortController | null;
    mentorship: AbortController | null;
  }>({ language: null, mentorship: null });
  const autoRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cacheRef = useRef<{
    language: { data: ImpactTile | null; timestamp: number } | null;
    mentorship: { data: ImpactTile | null; timestamp: number } | null;
  }>({ language: null, mentorship: null });

  // Read filter from URL on mount and when URL changes (only if not forced)
  useEffect(() => {
    if (forcedFilter) {
      setProgrammeFilter(forcedFilter);
      return;
    }

    const updateFilter = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const programmeParam = urlParams.get('programme');
      if (programmeParam === 'language_connect' || programmeParam === 'mentors_ukraine') {
        setProgrammeFilter(programmeParam as ProgrammeFilter);
      } else {
        setProgrammeFilter('all');
      }
    };

    updateFilter();

    window.addEventListener('popstate', updateFilter);
    const handleProgrammeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ programme: ProgrammeFilter; companyId: string }>;
      if (customEvent.detail?.programme) {
        setProgrammeFilter(customEvent.detail.programme);
      } else {
        updateFilter();
      }
    };
    window.addEventListener('programme-filter-changed', handleProgrammeChange);

    return () => {
      window.removeEventListener('popstate', updateFilter);
      window.removeEventListener('programme-filter-changed', handleProgrammeChange);
    };
  }, [forcedFilter]);

  /**
   * Fetch a single tile with retry logic, timeout, and validation
   */
  const fetchTile = useCallback(
    async (
      tileType: 'language' | 'mentorship',
      retryAttempt = 0,
      skipCache = false
    ): Promise<ImpactTile | null> => {
      const stateKey = tileType;

      // Cancel previous request if still pending
      const prevController = abortControllersRef.current[stateKey];
      if (prevController) {
        prevController.abort();
      }

      const abortController = new AbortController();
      abortControllersRef.current[stateKey] = abortController;

      const setState = tileType === 'language' ? setLanguageState : setMentorshipState;

      // Check cache if not skipping
      if (!skipCache) {
        const cached = cacheRef.current[stateKey];
        if (cached && cached.data) {
          const cacheAge = Date.now() - cached.timestamp;
          if (cacheAge < CACHE_TTL) {
            return cached.data; // Return cached data immediately
          }
        }
      }

      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
      }));

      try {
        // Use analytics service URL if available, otherwise relative path
        const analyticsUrl = import.meta.env.PUBLIC_ANALYTICS_URL || '';
        const baseUrl = analyticsUrl || apiBaseUrl;
        const url = `${baseUrl}/tiles/${tileType}?companyId=${companyId}&period=${period}`;

        // Create timeout
        const timeoutId = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT);

        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          signal: abortController.signal,
          cache: skipCache ? 'no-cache' : 'default',
        });

        clearTimeout(timeoutId);

        if (abortController.signal.aborted) {
          return null; // Request was cancelled
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.message || errorData.error || response.statusText;

          // Retry on 5xx errors or network errors
          if ((response.status >= 500 || response.status === 0) && retryAttempt < MAX_RETRIES) {
            const delay = getRetryDelay(retryAttempt);
            setTimeout(() => {
              fetchTile(tileType, retryAttempt + 1, true);
            }, delay);
            return null;
          }

          throw new Error(`${response.status}: ${errorMessage}`);
        }

        const data = await response.json();

        // Validate response structure
        if (!validateTileData(data.tile, tileType)) {
          throw new Error(`Invalid response format from ${tileType} tile API`);
        }

        // Ensure companyId matches
        if (data.tile.metadata.companyId !== companyId) {
          console.warn(
            `[ProgrammeTiles] Tile companyId mismatch: expected ${companyId}, got ${data.tile.metadata.companyId}`
          );
        }

        const now = Date.now();
        setState({
          data: data.tile,
          loading: false,
          error: null,
          retryCount: 0,
          lastFetched: now,
          lastError: null,
        });

        // Update cache
        cacheRef.current[stateKey] = {
          data: data.tile,
          timestamp: now,
        };

        // Call update callback if provided
        if (onTileUpdate) {
          onTileUpdate(tileType, data.tile);
        }

        return data.tile;
      } catch (err) {
        if (abortController.signal.aborted) {
          return null; // Request was cancelled, don't update state
        }

        const errorMessage = getErrorMessage(err, tileType);

        // Retry on network errors
        const isNetworkError =
          err instanceof TypeError ||
          (err instanceof Error && err.name === 'AbortError') ||
          (err instanceof Error && err.message.includes('Failed to fetch'));

        if (isNetworkError && retryAttempt < MAX_RETRIES) {
          const delay = getRetryDelay(retryAttempt);
          setTimeout(() => {
            fetchTile(tileType, retryAttempt + 1, true);
          }, delay);
          return null;
        }

        setState((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
          retryCount: retryAttempt + 1,
          lastError: errorMessage,
        }));

        return null;
      }
    },
    [companyId, period, apiBaseUrl, onTileUpdate]
  );

  /**
   * Fetch all required tiles
   */
  const fetchAllTiles = useCallback(
    async (skipCache = false) => {
      const promises: Promise<ImpactTile | null>[] = [];

      if (programmeFilter === 'all' || programmeFilter === 'language_connect') {
        promises.push(fetchTile('language', 0, skipCache));
      } else {
        setLanguageState((prev) => ({ ...prev, data: null }));
        cacheRef.current.language = null;
      }

      if (programmeFilter === 'all' || programmeFilter === 'mentors_ukraine') {
        promises.push(fetchTile('mentorship', 0, skipCache));
      } else {
        setMentorshipState((prev) => ({ ...prev, data: null }));
        cacheRef.current.mentorship = null;
      }

      await Promise.allSettled(promises);
    },
    [programmeFilter, fetchTile]
  );

  // Initial fetch and refetch on dependency changes
  useEffect(() => {
    fetchAllTiles();

    return () => {
      // Cleanup: abort any pending requests
      Object.values(abortControllersRef.current).forEach((controller) => {
        if (controller) {
          controller.abort();
        }
      });
    };
  }, [companyId, period, apiBaseUrl, programmeFilter]); // fetchAllTiles is stable due to useCallback

  // Auto-refresh setup
  useEffect(() => {
    if (!enableAutoRefresh) {
      return;
    }

    autoRefreshTimerRef.current = setInterval(() => {
      fetchAllTiles(true); // Skip cache for auto-refresh
    }, autoRefreshInterval);

    return () => {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
      }
    };
  }, [enableAutoRefresh, autoRefreshInterval, fetchAllTiles]);

  // Listen for manual refresh events
  useEffect(() => {
    const handleRefresh = () => {
      fetchAllTiles(true);
    };

    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => {
      window.removeEventListener('dashboard-refresh', handleRefresh);
    };
  }, [fetchAllTiles]);

  /**
   * Manual retry handler
   */
  const handleRetry = useCallback(
    (tileType: 'language' | 'mentorship') => {
      fetchTile(tileType, 0, true);
    },
    [fetchTile]
  );

  const showLanguage = programmeFilter === 'all' || programmeFilter === 'language_connect';
  const showMentorship = programmeFilter === 'all' || programmeFilter === 'mentors_ukraine';

  // Memoized loading skeleton that matches tile structure
  const LoadingSkeleton = useMemo(
    () => () => (
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 animate-pulse"
        role="status"
        aria-live="polite"
        aria-label="Loading programme metrics"
      >
        <div className="flex items-center space-x-3 mb-4">
          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="flex-1">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
          </div>
        </div>
        <span className="sr-only">Loading programme metrics...</span>
      </div>
    ),
    []
  );

  // Memoized empty state
  const EmptyStateComponent = useMemo(
    () =>
      ({
        tileType,
        onRetry,
      }: {
        tileType: 'language' | 'mentorship';
        onRetry: () => void;
      }) => (
        <EmptyState
          title={`No ${tileType === 'language' ? 'Language Connect' : 'Mentors for Ukraine'} Data`}
          message={
            tileType === 'language'
              ? 'Language programme data will appear here once sessions are imported via CSV. Contact your administrator to import data.'
              : 'Mentorship programme data will appear here once sessions are imported via CSV. Contact your administrator to import data.'
          }
          icon="data"
          action={{
            label: 'Refresh',
            onClick: onRetry,
          }}
        />
      ),
    []
  );

  // Memoized error state with retry
  const ErrorStateComponent = useMemo(
    () =>
      ({
        error,
        tileType,
        onRetry,
        retryCount,
      }: {
        error: string;
        tileType: 'language' | 'mentorship';
        onRetry: () => void;
        retryCount: number;
      }) => (
        <div
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-start">
            <svg
              className="h-5 w-5 text-red-400 dark:text-red-500 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Failed to load {tileType === 'language' ? 'Language Connect' : 'Mentors for Ukraine'} data
              </h3>
              <p className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</p>
              {retryCount < MAX_RETRIES && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  Retrying automatically... ({retryCount}/{MAX_RETRIES})
                </p>
              )}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 dark:text-red-200 bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                  aria-label={`Retry loading ${tileType} tile`}
                >
                  <svg
                    className="-ml-1 mr-2 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      ),
    []
  );

  // Memoized computed values
  const hasAnyLoading = useMemo(
    () => (showLanguage && languageState.loading) || (showMentorship && mentorshipState.loading),
    [showLanguage, showMentorship, languageState.loading, mentorshipState.loading]
  );

  const hasAnyErrors = useMemo(
    () => (showLanguage && languageState.error) || (showMentorship && mentorshipState.error),
    [showLanguage, showMentorship, languageState.error, mentorshipState.error]
  );

  const hasAnyTiles = useMemo(
    () => (showLanguage && languageState.data) || (showMentorship && mentorshipState.data),
    [showLanguage, showMentorship, languageState.data, mentorshipState.data]
  );

  if (!showLanguage && !showMentorship) {
    return null;
  }

  // Show loading skeleton if initial load
  if (hasAnyLoading && !hasAnyTiles && !hasAnyErrors) {
    return (
      <div
        className="programme-tiles grid grid-cols-1 md:grid-cols-2 gap-6"
        role="status"
        aria-label="Loading programme tiles"
      >
        {showLanguage && <LoadingSkeleton />}
        {showMentorship && <LoadingSkeleton />}
      </div>
    );
  }

  return (
    <div
      className="programme-tiles grid grid-cols-1 md:grid-cols-2 gap-6"
      role="region"
      aria-label="Programme impact metrics"
    >
      {/* Language Connect Tile */}
      {showLanguage && (
        <div
          className="tile-container"
          role="article"
          aria-labelledby="language-tile-title"
          style={{
            opacity: languageState.loading && languageState.data ? 0.6 : 1,
            transition: 'opacity 0.2s ease-in-out',
          }}
        >
          {languageState.loading && !languageState.data ? (
            <LoadingSkeleton />
          ) : languageState.error && !languageState.data ? (
            <ErrorStateComponent
              error={languageState.error}
              tileType="language"
              onRetry={() => handleRetry('language')}
              retryCount={languageState.retryCount}
            />
          ) : languageState.data ? (
            <LanguageTileWidget
              tile={languageState.data as LanguageTile}
              loading={languageState.loading}
              error={languageState.error}
              onExport={() => {
                if (!languageState.data) return;
                const dataStr = JSON.stringify(languageState.data, null, 2);
                const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
                const linkElement = document.createElement('a');
                linkElement.setAttribute('href', dataUri);
                linkElement.setAttribute(
                  'download',
                  `language-tile-${languageState.data.metadata.period.start}-${languageState.data.metadata.period.end}.json`
                );
                linkElement.click();
              }}
            />
          ) : (
            <EmptyStateComponent
              tileType="language"
              onRetry={() => handleRetry('language')}
            />
          )}
        </div>
      )}

      {/* Mentors for Ukraine Tile */}
      {showMentorship && (
        <div
          className="tile-container"
          role="article"
          aria-labelledby="mentorship-tile-title"
          style={{
            opacity: mentorshipState.loading && mentorshipState.data ? 0.6 : 1,
            transition: 'opacity 0.2s ease-in-out',
          }}
        >
          {mentorshipState.loading && !mentorshipState.data ? (
            <LoadingSkeleton />
          ) : mentorshipState.error && !mentorshipState.data ? (
            <ErrorStateComponent
              error={mentorshipState.error}
              tileType="mentorship"
              onRetry={() => handleRetry('mentorship')}
              retryCount={mentorshipState.retryCount}
            />
          ) : mentorshipState.data ? (
            <MentorshipTileWidget
              tile={mentorshipState.data as MentorshipTile}
              loading={mentorshipState.loading}
              error={mentorshipState.error}
              onExport={() => {
                if (!mentorshipState.data) return;
                const dataStr = JSON.stringify(mentorshipState.data, null, 2);
                const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
                const linkElement = document.createElement('a');
                linkElement.setAttribute('href', dataUri);
                linkElement.setAttribute(
                  'download',
                  `mentorship-tile-${mentorshipState.data.metadata.period.start}-${mentorshipState.data.metadata.period.end}.json`
                );
                linkElement.click();
              }}
            />
          ) : (
            <EmptyStateComponent
              tileType="mentorship"
              onRetry={() => handleRetry('mentorship')}
            />
          )}
        </div>
      )}
    </div>
  );
}
