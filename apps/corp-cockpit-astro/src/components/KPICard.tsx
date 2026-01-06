import { useState, type ReactNode } from 'react';
import EvidenceDrawer from './EvidenceDrawer';

export interface KPICardProps {
  title: string;
  value: string | number;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  icon?: ReactNode;
  subtitle?: string;
  className?: string;
  metricId?: string;
  companyId?: string;
  period?: string;
  showEvidenceButton?: boolean;
}

export default function KPICard({
  title,
  value,
  trend,
  icon,
  subtitle,
  className = '',
  metricId,
  companyId,
  period,
  showEvidenceButton = false,
}: KPICardProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="ml-4 flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-400">
              {icon}
            </div>
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-4 flex items-center">
          <span
            className={`inline-flex items-center text-sm font-medium ${
              trend.direction === 'up'
                ? 'text-secondary-600 dark:text-secondary-400'
                : 'text-red-600 dark:text-red-400'
            }`}
            role="status"
            aria-label={`Trend: ${trend.direction === 'up' ? 'increased' : 'decreased'} by ${Math.abs(trend.value)} percent`}
          >
            {trend.direction === 'up' ? (
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            {Math.abs(trend.value)}%
          </span>
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">vs last period</span>
        </div>
      )}
      {showEvidenceButton && (metricId || (companyId && period)) && (
        <div className="mt-4">
          <button
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            View Evidence
          </button>
        </div>
      )}
      <EvidenceDrawer
        metricId={metricId}
        companyId={companyId}
        period={period}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
