/**
 * DataTable Component
 *
 * Enhanced table with sorting, filtering, and virtualization for large datasets.
 * Fallback visualization when charts are not suitable.
 *
 * Features:
 * - Virtualized scrolling for >100 rows
 * - Column sorting (ascending/descending)
 * - Search/filter functionality
 * - Export to CSV
 * - Responsive design
 * - Dark mode support
 */

import React, { useState, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { formatNumber, formatPercentage, formatDate, isDarkMode } from '../../../lib/nlq-chart-utils';

export interface DataTableProps {
  data: any[];
  title?: string;
  height?: number;
  className?: string;
  pageSize?: number;
  virtualize?: boolean;
}

type SortDirection = 'asc' | 'desc' | null;

/**
 * DataTable - Enhanced table with sorting and virtualization
 */
export default function DataTable({
  data,
  title,
  height = 600,
  className = '',
  pageSize = 50,
  virtualize = true,
}: DataTableProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [darkMode, setDarkMode] = React.useState(false);

  // Detect dark mode
  React.useEffect(() => {
    setDarkMode(isDarkMode());

    const observer = new MutationObserver(() => {
      setDarkMode(isDarkMode());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  // Extract columns
  const columns = useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);

  // Filter and sort data
  const processedData = useMemo(() => {
    if (!data) return [];

    let filtered = [...data];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((row) =>
        Object.values(row).some((value) =>
          String(value).toLowerCase().includes(query)
        )
      );
    }

    // Apply sorting
    if (sortColumn && sortDirection) {
      filtered.sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];

        if (aValue == null) return 1;
        if (bValue == null) return -1;

        let comparison = 0;

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue;
        } else {
          comparison = String(aValue).localeCompare(String(bValue));
        }

        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [data, searchQuery, sortColumn, sortDirection]);

  // Handle column sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortColumn(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Format cell value
  const formatCellValue = (value: any, column: string): string => {
    if (value == null) return '-';

    // Try to detect type and format accordingly
    if (typeof value === 'number') {
      // Check if it looks like a percentage (0-1 or 0-100)
      if (value >= 0 && value <= 1 && column.toLowerCase().includes('rate')) {
        return formatPercentage(value);
      }
      if (value >= 0 && value <= 100 && (column.toLowerCase().includes('percent') || column.toLowerCase().includes('%'))) {
        return formatPercentage(value / 100);
      }
      return formatNumber(value, { decimals: 2 });
    }

    // Try to format as date
    if (column.toLowerCase().includes('date') || column.toLowerCase().includes('time')) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return formatDate(date);
        }
      } catch {
        // Not a date
      }
    }

    return String(value);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!processedData || processedData.length === 0) return;

    const headers = columns.join(',');
    const rows = processedData.map((row) =>
      columns.map((col) => {
        const value = row[col];
        // Escape values containing commas or quotes
        if (String(value).includes(',') || String(value).includes('"')) {
          return `"${String(value).replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    );

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = title ? `${title.replace(/\s+/g, '_')}.csv` : 'data.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Row renderer for virtualized list
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const row = processedData[index];

    return (
      <div
        style={style}
        className={`flex border-b border-gray-200 dark:border-gray-700 ${
          index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50'
        }`}
      >
        {columns.map((column, colIndex) => (
          <div
            key={column}
            className="flex-1 px-4 py-2 text-sm text-gray-900 dark:text-white truncate"
            title={formatCellValue(row[column], column)}
            style={{ minWidth: '120px' }}
          >
            {formatCellValue(row[column], column)}
          </div>
        ))}
      </div>
    );
  };

  const shouldVirtualize = virtualize && processedData.length > 100;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {processedData.length} {processedData.length === 1 ? 'row' : 'rows'}
            {searchQuery && ` (filtered from ${data.length})`}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            aria-label="Export as CSV"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search in table..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Search table"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-300 dark:border-gray-600">
          {columns.map((column) => (
            <button
              key={column}
              onClick={() => handleSort(column)}
              className="flex-1 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              style={{ minWidth: '120px' }}
              aria-label={`Sort by ${column}`}
            >
              <div className="flex items-center gap-2">
                <span className="truncate">{column}</span>
                {sortColumn === column && (
                  <span className="text-blue-600 dark:text-blue-400">
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Body */}
        {processedData.length > 0 ? (
          shouldVirtualize ? (
            // Virtualized list for large datasets
            <List
              height={Math.min(height - 200, processedData.length * 40)}
              itemCount={processedData.length}
              itemSize={40}
              width="100%"
            >
              {Row}
            </List>
          ) : (
            // Regular rendering for small datasets
            <div style={{ maxHeight: `${height - 200}px`, overflowY: 'auto' }}>
              {processedData.map((row, index) => (
                <div
                  key={index}
                  className={`flex border-b border-gray-200 dark:border-gray-700 ${
                    index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50'
                  }`}
                >
                  {columns.map((column) => (
                    <div
                      key={column}
                      className="flex-1 px-4 py-2 text-sm text-gray-900 dark:text-white truncate"
                      title={formatCellValue(row[column], column)}
                      style={{ minWidth: '120px' }}
                    >
                      {formatCellValue(row[column], column)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
            {searchQuery ? 'No results found' : 'No data available'}
          </div>
        )}
      </div>

      {/* Footer Info */}
      {shouldVirtualize && (
        <div className="mt-4 text-xs text-gray-600 dark:text-gray-400">
          Using virtualized scrolling for optimal performance with large datasets
        </div>
      )}
    </div>
  );
}
