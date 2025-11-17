/**
 * TileCard - Base component for Impact Tiles
 * Provides common layout, loading states, and accessibility features
 */

import { type ReactNode } from 'react';

export interface TileCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  isLoading?: boolean;
  error?: string;
  className?: string;
}

export function TileCard({
  title,
  icon,
  children,
  footer,
  isLoading = false,
  error,
  className = '',
}: TileCardProps) {
  return (
    <div
      className={`tile-card ${className}`}
      role="region"
      aria-label={`${title} metrics`}
      data-testid={`tile-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="tile-card__header">
        {icon && <div className="tile-card__icon" aria-hidden="true">{icon}</div>}
        <h3 className="tile-card__title">{title}</h3>
      </div>

      <div className="tile-card__body">
        {isLoading && (
          <div
            className="tile-card__loading"
            role="status"
            aria-live="polite"
            aria-label="Loading data"
          >
            <div className="spinner" aria-hidden="true"></div>
            <span className="sr-only">Loading {title} data...</span>
          </div>
        )}

        {error && !isLoading && (
          <div
            className="tile-card__error"
            role="alert"
            aria-live="assertive"
          >
            <svg
              className="tile-card__error-icon"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p>{error}</p>
          </div>
        )}

        {!isLoading && !error && children}
      </div>

      {footer && !isLoading && !error && (
        <div className="tile-card__footer">{footer}</div>
      )}
    </div>
  );
}

/**
 * MetricRow - Display a single metric with label and value
 */
export interface MetricRowProps {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  suffix?: string;
  important?: boolean;
}

export function MetricRow({ label, value, trend, suffix, important = false }: MetricRowProps) {
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '';
  const trendClass = trend === 'up' ? 'positive' : trend === 'down' ? 'negative' : '';

  return (
    <div
      className={`metric-row ${important ? 'metric-row--important' : ''}`}
      role="group"
      aria-label={label}
    >
      <span className="metric-row__label">{label}</span>
      <span className={`metric-row__value ${trendClass}`}>
        {trendIcon && (
          <span className="metric-row__trend" aria-label={`Trending ${trend}`}>
            {trendIcon}
          </span>
        )}
        <span>{value}</span>
        {suffix && <span className="metric-row__suffix">{suffix}</span>}
      </span>
    </div>
  );
}

/**
 * MetricGrid - Display metrics in a grid layout
 */
export interface MetricGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
}

export function MetricGrid({ children, columns = 2 }: MetricGridProps) {
  return (
    <div
      className="metric-grid"
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      role="list"
    >
      {children}
    </div>
  );
}

/**
 * MetricCard - Compact metric display for grid
 */
export interface MetricCardProps {
  label: string;
  value: string | number;
  suffix?: string;
  description?: string;
}

export function MetricCard({ label, value, suffix, description }: MetricCardProps) {
  return (
    <div
      className="metric-card"
      role="listitem"
      aria-label={`${label}: ${value}${suffix || ''}`}
    >
      <div className="metric-card__label">{label}</div>
      <div className="metric-card__value">
        {value}
        {suffix && <span className="metric-card__suffix">{suffix}</span>}
      </div>
      {description && (
        <div className="metric-card__description" aria-label={`Detail: ${description}`}>
          {description}
        </div>
      )}
    </div>
  );
}
