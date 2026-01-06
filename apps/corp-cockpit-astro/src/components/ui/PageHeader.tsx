/**
 * PageHeader — Consistent page header component
 * 
 * Standardized page headers with title, subtitle, breadcrumbs, and actions.
 */

import React from 'react';
import { Breadcrumbs, BreadcrumbItem } from './Navigation';

// =============================================================================
// TYPES
// =============================================================================

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}

// =============================================================================
// PAGE HEADER COMPONENT
// =============================================================================

export default function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <header className={`page-header ${className}`}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="page-header-breadcrumbs">
          <Breadcrumbs items={breadcrumbs} />
        </div>
      )}

      <div className="page-header-content">
        <div className="page-header-text">
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>

        {actions && <div className="page-actions">{actions}</div>}
      </div>

      <style>{`
        .page-header {
          margin-bottom: var(--space-24);
          padding-bottom: var(--space-16);
          border-bottom: 1px solid var(--color-border);
        }

        .page-header-breadcrumbs {
          margin-bottom: var(--space-12);
        }

        .page-header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--space-16);
        }

        .page-header-text {
          flex: 1;
          min-width: 0;
        }

        .page-title {
          font-size: var(--text-2xl);
          font-weight: var(--font-weight-bold);
          color: var(--color-text-primary);
          letter-spacing: var(--tracking-tight);
          line-height: var(--leading-tight);
          margin: 0;
        }

        .page-subtitle {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          margin-top: var(--space-4);
          line-height: var(--leading-relaxed);
        }

        .page-actions {
          display: flex;
          align-items: center;
          gap: var(--space-12);
          flex-shrink: 0;
        }

        @media (max-width: 768px) {
          .page-header-content {
            flex-direction: column;
            align-items: stretch;
          }

          .page-actions {
            width: 100%;
            flex-wrap: wrap;
          }

          .page-title {
            font-size: var(--text-xl);
          }
        }

        /* Page enter animation */
        .page-header {
          animation: pageEnter 0.3s var(--ease-out) backwards;
        }

        @keyframes pageEnter {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .page-header {
            animation: none;
          }
        }
      `}</style>
    </header>
  );
}



