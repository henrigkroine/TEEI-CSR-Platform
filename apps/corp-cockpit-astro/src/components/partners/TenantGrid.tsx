import { useState, useMemo } from 'react';
import TenantSnapshot, { type TenantSnapshotProps } from './TenantSnapshot';

export interface TenantGridProps {
  tenants: Array<{
    tenant: TenantSnapshotProps['tenant'];
    metrics: TenantSnapshotProps['metrics'];
    programMix: TenantSnapshotProps['programMix'];
  }>;
  lang: string;
  partnerId: string;
  onAddTenant?: () => void;
  canAddTenant?: boolean;
}

type FilterStatus = 'all' | 'active' | 'trial' | 'churned';
type SortBy = 'name' | 'sroi' | 'vis' | 'participation';

export default function TenantGrid({
  tenants,
  lang,
  partnerId,
  onAddTenant,
  canAddTenant = false
}: TenantGridProps) {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter and sort tenants
  const filteredAndSortedTenants = useMemo(() => {
    let result = [...tenants];

    // Apply status filter
    if (filterStatus !== 'all') {
      result = result.filter(t => t.tenant.status === filterStatus);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        t =>
          t.tenant.name.toLowerCase().includes(query) ||
          t.tenant.industry?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.tenant.name.localeCompare(b.tenant.name);
        case 'sroi':
          return b.metrics.sroi - a.metrics.sroi;
        case 'vis':
          return b.metrics.vis - a.metrics.vis;
        case 'participation':
          return b.metrics.participationRate - a.metrics.participationRate;
        default:
          return 0;
      }
    });

    return result;
  }, [tenants, filterStatus, sortBy, searchQuery]);

  return (
    <div>
      {/* Controls */}
      <div className="mb-6 space-y-4">
        {/* Search and Add Button */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search tenants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              aria-label="Search tenants"
            />
          </div>

          {canAddTenant && onAddTenant && (
            <button
              onClick={onAddTenant}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add New Tenant
            </button>
          )}
        </div>

        {/* Filters and Sort */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="status-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Status:
            </label>
            <select
              id="status-filter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="block pl-3 pr-10 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="churned">Churned</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <label htmlFor="sort-by" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Sort by:
            </label>
            <select
              id="sort-by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="block pl-3 pr-10 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="name">Name</option>
              <option value="sroi">SROI (High to Low)</option>
              <option value="vis">VIS (High to Low)</option>
              <option value="participation">Participation (High to Low)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Showing {filteredAndSortedTenants.length} of {tenants.length} tenants
      </div>

      {/* Tenant Grid */}
      {filteredAndSortedTenants.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedTenants.map((tenant) => (
            <TenantSnapshot
              key={tenant.tenant.id}
              tenant={tenant.tenant}
              metrics={tenant.metrics}
              programMix={tenant.programMix}
              lang={lang}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            No tenants found
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchQuery
              ? 'Try adjusting your search or filters'
              : 'Get started by adding a new tenant'}
          </p>
          {canAddTenant && onAddTenant && !searchQuery && (
            <div className="mt-6">
              <button
                onClick={onAddTenant}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add New Tenant
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
