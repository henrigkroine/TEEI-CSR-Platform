import { useState } from 'react';
import clsx from 'clsx';
import LineageDrawer from '@components/evidence/LineageDrawer';
import { SparklineSVG } from '../charts/Sparkline';

interface MetricCardProps {
  metricId: string;
  label: string;
  value: string | number;
  change?: string;
  changePositive?: boolean;
  showLineage?: boolean;
  badge?: string;
  trend?: number[];
  target?: number;
  isLoading?: boolean;
  subtitle?: string;
  companyId?: string; // Optional: needed for lineage drawer
  evidenceId?: string; // Optional: needed for lineage drawer
}

function Sparkline({ data = [], trend }: { data: number[]; trend?: 'up' | 'down' | 'neutral' }) {
  if (!data.length) return null;

  return (
    <div className="sparkline-wrapper">
      <SparklineSVG
        data={data}
        width={140}
        height={48}
        color={trend === 'down' ? 'error' : trend === 'up' ? 'success' : 'primary'}
        showArea={true}
      />
      <style>{`
        .sparkline-wrapper {
          width: 100%;
          display: flex;
          justify-content: center;
        }
        .sparkline-wrapper svg {
          width: 100%;
          max-width: 140px;
        }
      `}</style>
    </div>
  );
}

export default function MetricCard({
  metricId,
  label,
  value,
  change,
  changePositive = true,
  showLineage = true,
  badge = 'Core KPI',
  trend = [62, 64, 71, 74, 78, 82],
  target = 80,
  isLoading = false,
  subtitle,
  companyId,
  evidenceId,
}: MetricCardProps) {
  const [isLineageOpen, setIsLineageOpen] = useState(false);

  // Only enable lineage if both companyId and evidenceId are provided
  const canShowLineage = showLineage && companyId && evidenceId && companyId !== 'undefined' && evidenceId !== 'undefined';

  if (isLoading) {
    return (
      <div className="card">
        <div className="h-6 w-24 rounded-full skeleton mb-4" />
        <div className="h-8 w-32 rounded-full skeleton mb-3" />
        <div className="h-4 w-40 rounded-full skeleton mb-6" />
        <div className="h-16 w-full rounded-xl skeleton" />
      </div>
    );
  }

  return (
    <>
      <div className="card relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-text-tertiary">{badge}</p>
            <p className="text-sm text-text-secondary">{subtitle}</p>
          </div>
          {canShowLineage && (
            <button
              onClick={() => setIsLineageOpen(true)}
              className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-text-secondary transition hover:border-color-accent hover:text-color-accent"
            >
              Why this metric?
            </button>
          )}
        </div>

        <div className="mt-5 flex items-baseline gap-3">
          <span className="text-4xl font-semibold text-text-primary">{value}</span>
          {change && (
            <span
              className={clsx(
                'text-sm font-medium',
                changePositive ? 'text-success' : 'text-danger',
              )}
            >
              {change}
            </span>
          )}
        </div>
        <p className="text-sm text-text-secondary mt-1">{label}</p>
        <p className="text-xs uppercase tracking-[0.3em] text-text-tertiary mt-1">Target {target}%</p>

        <div className="mt-6">
          <Sparkline
            data={trend}
            trend={changePositive ? 'up' : change ? 'down' : 'neutral'}
          />
        </div>
      </div>

      {canShowLineage && companyId && evidenceId && (
        <LineageDrawer
          companyId={companyId}
          evidenceId={evidenceId}
          onClose={() => setIsLineageOpen(false)}
        />
      )}
    </>
  );
}
