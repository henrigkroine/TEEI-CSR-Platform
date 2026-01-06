/**
 * Navigation — Premium navigation components
 * 
 * Breadcrumbs, Tabs, and Pagination components with consistent styling.
 */

import React from 'react';

// =============================================================================
// BREADCRUMBS
// =============================================================================

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  return (
    <nav className={`breadcrumbs ${className}`} aria-label="Breadcrumb">
      <ol className="breadcrumbs-list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="breadcrumb-item">
              {isLast ? (
                <span className="breadcrumb-current" aria-current="page">
                  {item.label}
                </span>
              ) : item.href ? (
                <a href={item.href} className="breadcrumb-link">
                  {item.label}
                </a>
              ) : (
                <span className="breadcrumb-text">{item.label}</span>
              )}
              {!isLast && <span className="breadcrumb-separator" aria-hidden="true">›</span>}
            </li>
          );
        })}
      </ol>

      <style>{`
        .breadcrumbs {
          display: flex;
          align-items: center;
        }

        .breadcrumbs-list {
          display: flex;
          align-items: center;
          gap: var(--space-8);
          margin: 0;
          padding: 0;
          list-style: none;
          font-size: var(--text-sm);
        }

        .breadcrumb-item {
          display: flex;
          align-items: center;
          gap: var(--space-8);
        }

        .breadcrumb-link {
          color: var(--color-text-secondary);
          text-decoration: none;
          transition: color var(--duration-fast) var(--ease-out);
        }

        .breadcrumb-link:hover {
          color: var(--color-primary);
        }

        .breadcrumb-text {
          color: var(--color-text-secondary);
        }

        .breadcrumb-current {
          color: var(--color-text-primary);
          font-weight: var(--font-weight-medium);
        }

        .breadcrumb-separator {
          color: var(--color-text-tertiary);
          user-select: none;
        }
      `}</style>
    </nav>
  );
}

// =============================================================================
// TABS
// =============================================================================

export interface Tab {
  id: string;
  label: string;
  count?: number;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className = '' }: TabsProps) {
  return (
    <div className={`tabs ${className}`} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            className={`tab ${isActive ? 'tab-active' : ''} ${tab.disabled ? 'tab-disabled' : ''}`}
            onClick={() => !tab.disabled && onChange(tab.id)}
            disabled={tab.disabled}
          >
            <span className="tab-label">{tab.label}</span>
            {tab.count !== undefined && (
              <span className="tab-count">{tab.count}</span>
            )}
          </button>
        );
      })}

      <style>{`
        .tabs {
          display: flex;
          gap: var(--space-4);
          border-bottom: 1px solid var(--color-border);
          margin-bottom: var(--space-24);
        }

        .tab {
          position: relative;
          display: flex;
          align-items: center;
          gap: var(--space-8);
          padding: var(--space-12) var(--space-16);
          border: none;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          background: transparent;
          font-size: var(--text-sm);
          font-weight: var(--font-weight-medium);
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all var(--duration-fast) var(--ease-out);
        }

        .tab:hover:not(.tab-disabled) {
          color: var(--color-text-primary);
        }

        .tab-active {
          color: var(--color-primary);
          border-bottom-color: var(--color-primary);
        }

        .tab-disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .tab:focus-visible {
          outline: 2px solid var(--color-primary);
          outline-offset: -2px;
          border-radius: var(--radius-md) var(--radius-md) 0 0;
        }

        .tab-label {
          line-height: var(--leading-tight);
        }

        .tab-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          font-size: var(--text-xs);
          font-weight: var(--font-weight-semibold);
          color: var(--color-text-secondary);
          background: var(--color-muted);
          border-radius: var(--radius-pill);
        }

        .tab-active .tab-count {
          color: var(--color-primary);
          background: var(--color-primary);
          color: white;
        }
      `}</style>
    </div>
  );
}

// =============================================================================
// PAGINATION
// =============================================================================

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  showFirstLast?: boolean;
  maxVisible?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = '',
  showFirstLast = true,
  maxVisible = 7,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const half = Math.floor(maxVisible / 2);

    if (totalPages <= maxVisible) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else if (currentPage <= half) {
      // Near the start
      for (let i = 1; i <= maxVisible - 2; i++) {
        pages.push(i);
      }
      pages.push('ellipsis');
      pages.push(totalPages);
    } else if (currentPage >= totalPages - half) {
      // Near the end
      pages.push(1);
      pages.push('ellipsis');
      for (let i = totalPages - (maxVisible - 3); i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // In the middle
      pages.push(1);
      pages.push('ellipsis');
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        pages.push(i);
      }
      pages.push('ellipsis');
      pages.push(totalPages);
    }

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <nav className={`pagination ${className}`} aria-label="Pagination">
      <div className="pagination-controls">
        {showFirstLast && (
          <button
            type="button"
            className="pagination-button"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            aria-label="First page"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M11 2L6 7l5 5M5 2L0 7l5 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}

        <button
          type="button"
          className="pagination-button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M10 2L5 7l5 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className="pagination-pages">
          {pages.map((page, index) => {
            if (page === 'ellipsis') {
              return (
                <span key={`ellipsis-${index}`} className="pagination-ellipsis" aria-hidden="true">
                  ...
                </span>
              );
            }

            const pageNum = page as number;
            const isActive = pageNum === currentPage;

            return (
              <button
                key={pageNum}
                type="button"
                className={`pagination-button ${isActive ? 'pagination-button-active' : ''}`}
                onClick={() => onPageChange(pageNum)}
                aria-label={`Page ${pageNum}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="pagination-button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M6 2l5 5-5 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {showFirstLast && (
          <button
            type="button"
            className="pagination-button"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            aria-label="Last page"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M5 2l5 5-5 5M11 2l5 5-5 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>

      <style>{`
        .pagination {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pagination-controls {
          display: flex;
          align-items: center;
          gap: var(--space-8);
        }

        .pagination-pages {
          display: flex;
          align-items: center;
          gap: var(--space-4);
        }

        .pagination-button {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 36px;
          height: 36px;
          padding: 0 8px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          background: var(--color-surface);
          font-size: var(--text-sm);
          font-weight: var(--font-weight-medium);
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all var(--duration-fast) var(--ease-out);
        }

        .pagination-button:hover:not(:disabled) {
          background: var(--color-surface-alt);
          border-color: var(--color-primary);
          color: var(--color-primary);
        }

        .pagination-button:focus-visible {
          outline: 2px solid var(--color-primary);
          outline-offset: 2px;
        }

        .pagination-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pagination-button-active {
          background: var(--color-primary);
          border-color: var(--color-primary);
          color: white;
        }

        .pagination-button-active:hover:not(:disabled) {
          background: var(--color-primary-strong);
        }

        .pagination-ellipsis {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 36px;
          height: 36px;
          color: var(--color-text-tertiary);
          user-select: none;
        }
      `}</style>
    </nav>
  );
}



