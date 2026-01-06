/**
 * Cost Summary Component
 *
 * Displays AI report generation cost tracking:
 * - Total cost and tokens used
 * - Budget usage and warnings
 * - Cost per report breakdown
 * - Model usage statistics
 *
 * @module components/reports/CostSummary
 */

import React, { useState, useEffect } from 'react';
import { reportingClient, formatCost, checkBudgetWarning } from '../../api/reporting';
import type { CostSummaryResponse } from '@teei/shared-types';

interface CostSummaryProps {
  companyId?: string;
  monthlyBudgetUsd?: number;
  showBreakdown?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number; // ms
}

/**
 * Cost Summary Widget
 */
export default function CostSummary({
  companyId,
  monthlyBudgetUsd = 100, // Default $100/month budget
  showBreakdown = true,
  autoRefresh = false,
  refreshInterval = 60000, // 1 minute
}: CostSummaryProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<CostSummaryResponse | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await reportingClient.getCostSummary(companyId);
      setSummary(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cost summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();

    if (autoRefresh) {
      const interval = setInterval(fetchSummary, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [companyId, autoRefresh, refreshInterval]);

  if (loading && !summary) {
    return (
      <div className="cost-summary-loading">
        <div className="spinner" />
        <p className="text-sm text-foreground/60">Loading cost summary...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cost-summary-error">
        <p className="text-sm text-red-600">{error}</p>
        <button onClick={fetchSummary} className="btn-secondary text-sm mt-2">
          Retry
        </button>
      </div>
    );
  }

  if (!summary) return null;

  const totalCost = parseFloat(summary.totalCostUsd);
  const budgetInfo = checkBudgetWarning(summary.totalCostUsd, monthlyBudgetUsd);

  return (
    <div className="cost-summary">
      {/* Header */}
      <div className="summary-header">
        <h3 className="summary-title">AI Cost Summary</h3>
        {lastUpdated && (
          <span className="last-updated">
            Updated {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Budget Warning */}
      {budgetInfo.isWarning && (
        <div className={`budget-warning ${budgetInfo.percentUsed >= 1 ? 'critical' : ''}`}>
          <span className="warning-icon">
            {budgetInfo.percentUsed >= 1 ? '🚨' : '⚠️'}
          </span>
          <div className="warning-content">
            <p className="warning-title">
              {budgetInfo.percentUsed >= 1
                ? 'Budget Exceeded'
                : `${Math.round(budgetInfo.percentUsed * 100)}% of Budget Used`}
            </p>
            <p className="warning-message">
              {budgetInfo.percentUsed >= 1
                ? 'You have exceeded your monthly AI generation budget. Future requests may be limited.'
                : `${formatCost(budgetInfo.remaining)} remaining of ${formatCost(monthlyBudgetUsd)} monthly budget`}
            </p>
          </div>
        </div>
      )}

      {/* Main Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Cost</div>
          <div className="stat-value">{formatCost(totalCost)}</div>
          <div className="stat-meta">{summary.requestsCount} reports</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Avg Cost/Report</div>
          <div className="stat-value">{formatCost(summary.avgCostPerRequest)}</div>
          <div className="stat-meta">
            {Math.round(summary.totalTokens / summary.requestsCount).toLocaleString()} tokens
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Tokens</div>
          <div className="stat-value">{summary.totalTokens.toLocaleString()}</div>
          <div className="stat-meta">across all reports</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Budget Remaining</div>
          <div className={`stat-value ${budgetInfo.isWarning ? 'warning' : ''}`}>
            {formatCost(budgetInfo.remaining)}
          </div>
          <div className="stat-meta">
            {Math.max(0, Math.round((1 - budgetInfo.percentUsed) * 100))}% remaining
          </div>
        </div>
      </div>

      {/* Budget Progress Bar */}
      <div className="budget-progress">
        <div className="progress-header">
          <span className="progress-label">Monthly Budget Usage</span>
          <span className="progress-percentage">
            {Math.min(100, Math.round(budgetInfo.percentUsed * 100))}%
          </span>
        </div>
        <div className="progress-bar">
          <div
            className={`progress-fill ${budgetInfo.percentUsed >= 1 ? 'exceeded' : budgetInfo.isWarning ? 'warning' : ''}`}
            style={{ width: `${Math.min(100, budgetInfo.percentUsed * 100)}%` }}
          />
        </div>
      </div>

      {/* Model Breakdown */}
      {showBreakdown && summary.byModel.length > 0 && (
        <details className="model-breakdown">
          <summary className="breakdown-summary">
            <span>Cost by Model</span>
            <span className="chevron">▼</span>
          </summary>
          <div className="breakdown-content">
            {summary.byModel.map((model) => (
              <div key={model.modelName} className="model-row">
                <div className="model-info">
                  <span className="model-name">{model.modelName}</span>
                  <span className="model-meta">
                    {model.requestsCount} reports • {model.totalTokens.toLocaleString()} tokens
                  </span>
                </div>
                <div className="model-cost">{formatCost(model.totalCostUsd)}</div>
              </div>
            ))}
          </div>
        </details>
      )}

      <style>{`
        .cost-summary {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
        }

        .cost-summary-loading,
        .cost-summary-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          text-align: center;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e5e7eb;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 12px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .summary-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .summary-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: #111827;
        }

        .last-updated {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .budget-warning {
          display: flex;
          gap: 12px;
          padding: 12px;
          background: #fef3c7;
          border: 1px solid #fbbf24;
          border-radius: 6px;
          margin-bottom: 16px;
        }

        .budget-warning.critical {
          background: #fee2e2;
          border-color: #ef4444;
        }

        .warning-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .warning-content {
          flex: 1;
        }

        .warning-title {
          font-weight: 700;
          font-size: 0.875rem;
          color: #78350f;
          margin-bottom: 4px;
        }

        .budget-warning.critical .warning-title {
          color: #7f1d1d;
        }

        .warning-message {
          font-size: 0.8125rem;
          color: #92400e;
        }

        .budget-warning.critical .warning-message {
          color: #991b1b;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .stat-card {
          padding: 12px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
        }

        .stat-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 6px;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
          margin-bottom: 4px;
        }

        .stat-value.warning {
          color: #ea580c;
        }

        .stat-meta {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .budget-progress {
          margin-bottom: 16px;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .progress-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
        }

        .progress-percentage {
          font-size: 0.875rem;
          font-weight: 700;
          color: #6b7280;
        }

        .progress-bar {
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #3b82f6;
          transition: width 0.3s, background 0.3s;
        }

        .progress-fill.warning {
          background: #f59e0b;
        }

        .progress-fill.exceeded {
          background: #ef4444;
        }

        .model-breakdown {
          border-top: 1px solid #e5e7eb;
          padding-top: 16px;
        }

        .breakdown-summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.875rem;
          color: #374151;
          padding: 8px 0;
          user-select: none;
        }

        .breakdown-summary:hover {
          color: #3b82f6;
        }

        .chevron {
          font-size: 0.75rem;
          transition: transform 0.2s;
        }

        .model-breakdown[open] .chevron {
          transform: rotate(180deg);
        }

        .breakdown-content {
          padding-top: 12px;
        }

        .model-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          margin-bottom: 8px;
        }

        .model-row:last-child {
          margin-bottom: 0;
        }

        .model-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .model-name {
          font-weight: 600;
          font-size: 0.875rem;
          color: #111827;
        }

        .model-meta {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .model-cost {
          font-size: 1.125rem;
          font-weight: 700;
          color: #3b82f6;
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Compact cost display for inline use
 */
export function CompactCostDisplay({
  tokensUsed,
  estimatedCostUsd,
  modelName,
}: {
  tokensUsed: number;
  estimatedCostUsd: string;
  modelName: string;
}) {
  return (
    <div className="compact-cost">
      <div className="cost-item">
        <span className="cost-icon">💰</span>
        <span className="cost-value">{formatCost(estimatedCostUsd)}</span>
      </div>
      <div className="cost-item">
        <span className="cost-icon">🔢</span>
        <span className="cost-value">{tokensUsed.toLocaleString()} tokens</span>
      </div>
      <div className="cost-item">
        <span className="cost-icon">🤖</span>
        <span className="cost-value">{modelName}</span>
      </div>

      <style>{`
        .compact-cost {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .cost-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .cost-icon {
          font-size: 1rem;
        }

        .cost-value {
          font-size: 0.875rem;
          color: #374151;
        }

        @media (max-width: 768px) {
          .compact-cost {
            gap: 12px;
          }
        }
      `}</style>
    </div>
  );
}
