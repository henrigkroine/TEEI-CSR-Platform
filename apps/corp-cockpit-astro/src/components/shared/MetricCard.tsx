import { useState } from 'react';
import LineageDrawer from '@components/evidence/LineageDrawer';

interface MetricCardProps {
  metricId: string;
  label: string;
  value: string | number;
  change?: string;
  changePositive?: boolean;
  showLineage?: boolean;
}

export default function MetricCard({
  metricId,
  label,
  value,
  change,
  changePositive = true,
  showLineage = true,
}: MetricCardProps) {
  const [isLineageOpen, setIsLineageOpen] = useState(false);

  return (
    <>
      <div className="card relative">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-medium text-foreground/60">{label}</div>
          {showLineage && (
            <button
              onClick={() => setIsLineageOpen(true)}
              className="group rounded-md p-1 hover:bg-border/50 focus:bg-border/50 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label={`Why this ${label} metric?`}
              title="View evidence lineage"
            >
              <svg
                className="h-5 w-5 text-foreground/40 group-hover:text-primary group-focus:text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
          )}
        </div>
        <div className="text-3xl font-bold">{value}</div>
        {change && (
          <div
            className={`mt-2 text-sm ${
              changePositive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {change}
          </div>
        )}
      </div>

      {showLineage && (
        <LineageDrawer
          metricId={metricId}
          metricName={label}
          isOpen={isLineageOpen}
          onClose={() => setIsLineageOpen(false)}
        />
      )}
    </>
  );
}
