/**
 * Loading — Premium loading states and spinners
 * 
 * Skeleton loaders, spinners, and progress indicators.
 */

import React from 'react';

// =============================================================================
// SPINNER
// =============================================================================

export interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'accent' | 'white' | 'current';
  className?: string;
}

const spinnerSizes = {
  xs: 12,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
};

const spinnerColors = {
  primary: 'var(--color-primary)',
  accent: 'var(--color-accent)',
  white: '#ffffff',
  current: 'currentColor',
};

export function Spinner({ 
  size = 'md', 
  color = 'primary',
  className = '',
}: SpinnerProps) {
  const sizeValue = spinnerSizes[size];
  const colorValue = spinnerColors[color];

  return (
    <svg 
      className={`spinner ${className}`}
      width={sizeValue}
      height={sizeValue}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle 
        cx="12" 
        cy="12" 
        r="10" 
        stroke={colorValue}
        strokeWidth="2.5"
        opacity="0.2"
      />
      <path 
        d="M12 2a10 10 0 0 1 10 10"
        stroke={colorValue}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <style>{`
        .spinner {
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </svg>
  );
}

// =============================================================================
// SKELETON
// =============================================================================

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  className?: string;
}

export function Skeleton({
  width,
  height,
  variant = 'rectangular',
  className = '',
}: SkeletonProps) {
  const variantClasses = {
    text: 'skeleton-text',
    circular: 'skeleton-circular',
    rectangular: 'skeleton-rectangular',
    rounded: 'skeleton-rounded',
  };

  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div 
      className={`skeleton ${variantClasses[variant]} ${className}`}
      style={style}
      aria-hidden="true"
    >
      <style>{`
        .skeleton {
          background: linear-gradient(
            90deg,
            var(--color-muted) 0%,
            rgba(255, 255, 255, 0.6) 50%,
            var(--color-muted) 100%
          );
          background-size: 200% 100%;
          animation: shimmer 1.5s ease-in-out infinite;
        }

        .skeleton-text {
          height: 1em;
          border-radius: var(--radius-sm);
        }

        .skeleton-circular {
          border-radius: 50%;
        }

        .skeleton-rectangular {
          border-radius: var(--radius-sm);
        }

        .skeleton-rounded {
          border-radius: var(--radius-lg);
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        [data-theme="dark"] .skeleton,
        html.dark .skeleton {
          background: linear-gradient(
            90deg,
            var(--color-muted) 0%,
            rgba(255, 255, 255, 0.1) 50%,
            var(--color-muted) 100%
          );
          background-size: 200% 100%;
        }
      `}</style>
    </div>
  );
}

// =============================================================================
// SKELETON PRESETS
// =============================================================================

export function SkeletonText({ 
  lines = 3,
  className = '',
}: { 
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`skeleton-text-block ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          variant="text" 
          width={i === lines - 1 ? '75%' : '100%'}
          height={14}
        />
      ))}
      <style>{`
        .skeleton-text-block {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
      `}</style>
    </div>
  );
}

export function SkeletonCard({
  showHeader = true,
  showFooter = false,
  className = '',
}: {
  showHeader?: boolean;
  showFooter?: boolean;
  className?: string;
}) {
  return (
    <div className={`skeleton-card ${className}`}>
      {showHeader && (
        <div className="skeleton-card-header">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="skeleton-card-header-text">
            <Skeleton variant="text" width={120} height={14} />
            <Skeleton variant="text" width={80} height={12} />
          </div>
        </div>
      )}
      
      <div className="skeleton-card-body">
        <SkeletonText lines={3} />
      </div>
      
      {showFooter && (
        <div className="skeleton-card-footer">
          <Skeleton variant="rounded" width={80} height={32} />
          <Skeleton variant="rounded" width={80} height={32} />
        </div>
      )}

      <style>{`
        .skeleton-card {
          padding: 20px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--card-radius);
        }

        .skeleton-card-header {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }

        .skeleton-card-header-text {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
        }

        .skeleton-card-body {
          margin-bottom: 16px;
        }

        .skeleton-card-footer {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }
      `}</style>
    </div>
  );
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
  className = '',
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={`skeleton-table ${className}`}>
      {/* Header */}
      <div className="skeleton-table-header">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} variant="text" height={12} />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="skeleton-table-row">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton 
              key={colIndex} 
              variant="text" 
              height={14}
              width={colIndex === 0 ? '80%' : '60%'}
            />
          ))}
        </div>
      ))}

      <style>{`
        .skeleton-table {
          border: 1px solid var(--color-border);
          border-radius: var(--card-radius);
          overflow: hidden;
        }

        .skeleton-table-header {
          display: grid;
          grid-template-columns: repeat(${columns}, 1fr);
          gap: 16px;
          padding: 16px 20px;
          background: var(--color-surface-alt);
          border-bottom: 1px solid var(--color-border);
        }

        .skeleton-table-row {
          display: grid;
          grid-template-columns: repeat(${columns}, 1fr);
          gap: 16px;
          padding: 16px 20px;
          border-bottom: 1px solid var(--color-border-subtle);
        }

        .skeleton-table-row:last-child {
          border-bottom: none;
        }
      `}</style>
    </div>
  );
}

// =============================================================================
// LOADING OVERLAY
// =============================================================================

export interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
}

export function LoadingOverlay({
  isLoading,
  message,
  children,
}: LoadingOverlayProps) {
  return (
    <div className="loading-overlay-container">
      {children}
      
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-overlay-content">
            <Spinner size="lg" />
            {message && <p className="loading-overlay-message">{message}</p>}
          </div>
        </div>
      )}

      <style>{`
        .loading-overlay-container {
          position: relative;
        }

        .loading-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(2px);
          border-radius: inherit;
          z-index: 10;
          animation: fadeIn 200ms ease-out;
        }

        [data-theme="dark"] .loading-overlay,
        html.dark .loading-overlay {
          background: rgba(30, 41, 59, 0.8);
        }

        .loading-overlay-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .loading-overlay-message {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          margin: 0;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// =============================================================================
// BUTTON LOADING STATE
// =============================================================================

export function ButtonSpinner({ className = '' }: { className?: string }) {
  return (
    <Spinner size="sm" color="current" className={className} />
  );
}

// =============================================================================
// PAGE LOADING
// =============================================================================

export function PageLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="page-loader">
      <div className="page-loader-content">
        <Spinner size="xl" />
        <p className="page-loader-message">{message}</p>
      </div>

      <style>{`
        .page-loader {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          width: 100%;
        }

        .page-loader-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .page-loader-message {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          margin: 0;
        }
      `}</style>
    </div>
  );
}



