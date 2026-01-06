/**
 * Table — Premium data table component
 * 
 * Sortable, responsive tables with sticky headers and row actions.
 */

import React, { useState, useMemo } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export interface TableColumn<T> {
  key: string;
  header: string;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (value: any, row: T, index: number) => React.ReactNode;
}

export interface TableProps<T extends Record<string, any>> {
  data: T[];
  columns: TableColumn<T>[];
  keyField?: string;
  sortable?: boolean;
  defaultSortKey?: string;
  defaultSortDirection?: 'asc' | 'desc';
  onRowClick?: (row: T) => void;
  selectedRows?: Set<string | number>;
  onSelectionChange?: (selectedRows: Set<string | number>) => void;
  loading?: boolean;
  emptyMessage?: string;
  stickyHeader?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
  className?: string;
}

// =============================================================================
// SORT ICON
// =============================================================================

function SortIcon({ 
  direction 
}: { 
  direction: 'asc' | 'desc' | null;
}) {
  return (
    <svg 
      width="12" 
      height="12" 
      viewBox="0 0 12 12" 
      fill="none"
      className="sort-icon"
    >
      <path 
        d="M6 2L9 5H3L6 2Z" 
        fill="currentColor"
        opacity={direction === 'asc' ? 1 : 0.3}
      />
      <path 
        d="M6 10L3 7H9L6 10Z" 
        fill="currentColor"
        opacity={direction === 'desc' ? 1 : 0.3}
      />
    </svg>
  );
}

// =============================================================================
// TABLE COMPONENT
// =============================================================================

export default function Table<T extends Record<string, any>>({
  data,
  columns,
  keyField = 'id',
  sortable = true,
  defaultSortKey,
  defaultSortDirection = 'asc',
  onRowClick,
  selectedRows,
  onSelectionChange,
  loading = false,
  emptyMessage = 'No data available',
  stickyHeader = true,
  striped = true,
  hoverable = true,
  compact = false,
  className = '',
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey || null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(defaultSortDirection);

  // Handle sort
  const handleSort = (key: string) => {
    if (!sortable) return;
    
    const column = columns.find(c => c.key === key);
    if (column?.sortable === false) return;

    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortKey) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      if (aValue === bValue) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      const comparison = aValue < bValue ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortKey, sortDirection]);

  // Handle row selection
  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    
    if (selectedRows?.size === data.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(data.map(row => row[keyField])));
    }
  };

  const handleSelectRow = (rowKey: string | number) => {
    if (!onSelectionChange || !selectedRows) return;
    
    const newSelection = new Set(selectedRows);
    if (newSelection.has(rowKey)) {
      newSelection.delete(rowKey);
    } else {
      newSelection.add(rowKey);
    }
    onSelectionChange(newSelection);
  };

  const showCheckboxes = !!onSelectionChange;
  const allSelected = selectedRows?.size === data.length && data.length > 0;
  const someSelected = selectedRows && selectedRows.size > 0 && selectedRows.size < data.length;

  return (
    <div className={`table-container ${className}`}>
      <div className="table-scroll">
        <table className={`
          premium-table
          ${compact ? 'table-compact' : ''}
          ${striped ? 'table-striped' : ''}
          ${hoverable ? 'table-hoverable' : ''}
          ${stickyHeader ? 'table-sticky-header' : ''}
        `}>
          <thead>
            <tr>
              {showCheckboxes && (
                <th className="table-checkbox-cell">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = !!someSelected;
                    }}
                    onChange={handleSelectAll}
                    className="table-checkbox"
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={{ 
                    width: column.width,
                    textAlign: column.align || 'left',
                  }}
                  className={`
                    ${sortable && column.sortable !== false ? 'sortable' : ''}
                    ${sortKey === column.key ? 'sorted' : ''}
                  `}
                  onClick={() => handleSort(column.key)}
                >
                  <span className="th-content">
                    {column.header}
                    {sortable && column.sortable !== false && (
                      <SortIcon 
                        direction={sortKey === column.key ? sortDirection : null} 
                      />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody>
            {loading ? (
              // Loading skeleton rows
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="skeleton-row">
                  {showCheckboxes && <td><div className="skeleton skeleton-checkbox" /></td>}
                  {columns.map((column) => (
                    <td key={column.key}>
                      <div className="skeleton skeleton-cell" />
                    </td>
                  ))}
                </tr>
              ))
            ) : sortedData.length === 0 ? (
              // Empty state
              <tr>
                <td 
                  colSpan={columns.length + (showCheckboxes ? 1 : 0)}
                  className="table-empty"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              // Data rows
              sortedData.map((row, index) => {
                const rowKey = row[keyField];
                const isSelected = selectedRows?.has(rowKey);

                return (
                  <tr
                    key={rowKey}
                    className={`
                      ${onRowClick ? 'clickable' : ''}
                      ${isSelected ? 'selected' : ''}
                    `}
                    onClick={() => onRowClick?.(row)}
                  >
                    {showCheckboxes && (
                      <td className="table-checkbox-cell">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectRow(rowKey);
                          }}
                          className="table-checkbox"
                          aria-label={`Select row ${index + 1}`}
                        />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        style={{ textAlign: column.align || 'left' }}
                      >
                        {column.render
                          ? column.render(row[column.key], row, index)
                          : row[column.key]}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .table-container {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--card-radius);
          overflow: hidden;
        }

        .table-scroll {
          overflow-x: auto;
        }

        .premium-table {
          width: 100%;
          border-collapse: collapse;
          font-size: var(--text-sm);
        }

        /* Header */
        .premium-table th {
          padding: 14px 16px;
          font-size: var(--text-xs);
          font-weight: var(--font-weight-semibold);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-tertiary);
          background: var(--color-surface);
          border-bottom: 1px solid var(--color-border);
          white-space: nowrap;
        }

        .table-sticky-header th {
          position: sticky;
          top: 0;
          z-index: 1;
        }

        .premium-table th.sortable {
          cursor: pointer;
          user-select: none;
          transition: color var(--duration-fast) var(--ease-out);
        }

        .premium-table th.sortable:hover {
          color: var(--color-text-primary);
        }

        .premium-table th.sorted {
          color: var(--color-primary);
        }

        .th-content {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .sort-icon {
          flex-shrink: 0;
        }

        /* Cells */
        .premium-table td {
          padding: 14px 16px;
          color: var(--color-text-secondary);
          border-bottom: 1px solid var(--color-border-subtle);
          vertical-align: middle;
        }

        .premium-table tbody tr:last-child td {
          border-bottom: none;
        }

        /* Compact */
        .table-compact th,
        .table-compact td {
          padding: 10px 12px;
        }

        /* Striped */
        .table-striped tbody tr:nth-child(even) {
          background: var(--color-muted);
        }

        /* Hoverable */
        .table-hoverable tbody tr:hover {
          background: rgba(186, 143, 90, 0.04);
        }

        /* Clickable rows */
        .premium-table tbody tr.clickable {
          cursor: pointer;
        }

        /* Selected */
        .premium-table tbody tr.selected {
          background: var(--color-accent-muted) !important;
        }

        /* Checkbox */
        .table-checkbox-cell {
          width: 48px;
          text-align: center;
        }

        .table-checkbox {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: var(--color-primary);
        }

        /* Empty state */
        .table-empty {
          text-align: center;
          padding: 48px 16px !important;
          color: var(--color-text-tertiary);
          font-style: italic;
        }

        /* Skeleton */
        .skeleton-row td {
          padding: 14px 16px;
        }

        .skeleton-checkbox {
          width: 18px;
          height: 18px;
          border-radius: 4px;
        }

        .skeleton-cell {
          height: 16px;
          border-radius: 4px;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .premium-table th,
          .premium-table td {
            padding: 12px;
          }
        }
      `}</style>
    </div>
  );
}

// =============================================================================
// TABLE ACTIONS
// =============================================================================

export interface TableActionsProps {
  children: React.ReactNode;
  className?: string;
}

export function TableActions({ children, className = '' }: TableActionsProps) {
  return (
    <div className={`table-actions ${className}`}>
      {children}
      <style>{`
        .table-actions {
          display: flex;
          gap: 8px;
          opacity: 0;
          transition: opacity var(--duration-fast) var(--ease-out);
        }

        tr:hover .table-actions {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}

// =============================================================================
// STATUS BADGE FOR TABLES
// =============================================================================

export type StatusType = 'active' | 'inactive' | 'pending' | 'completed' | 'error';

const statusStyles: Record<StatusType, { bg: string; text: string }> = {
  active: { bg: 'var(--color-success-light)', text: 'var(--color-success)' },
  inactive: { bg: 'var(--color-muted)', text: 'var(--color-text-tertiary)' },
  pending: { bg: 'var(--color-warning-light)', text: 'var(--color-warning)' },
  completed: { bg: 'var(--color-success-light)', text: 'var(--color-success)' },
  error: { bg: 'var(--color-error-light)', text: 'var(--color-error)' },
};

export function StatusBadge({ 
  status, 
  label 
}: { 
  status: StatusType;
  label?: string;
}) {
  const styles = statusStyles[status];
  const displayLabel = label || status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span 
      className="status-badge"
      style={{
        background: styles.bg,
        color: styles.text,
      }}
    >
      <span className="status-dot" style={{ background: styles.text }} />
      {displayLabel}
      <style>{`
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: var(--text-xs);
          font-weight: var(--font-weight-medium);
          padding: 4px 10px;
          border-radius: var(--radius-pill);
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }
      `}</style>
    </span>
  );
}



