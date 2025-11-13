/**
 * Evidence List Component
 *
 * Displays filterable list of evidence items with:
 * - Multi-select filters (metric type, source, verification status)
 * - Search functionality
 * - Pagination
 * - Real-time updates via SSE
 * - Evidence detail drawer
 *
 * @module evidence/EvidenceList
 */

import React, { useState, useEffect, useCallback } from 'react';
import { memoize, useMemoizedSelector } from '../../utils/memoization';
import type { PermissionGateProps } from '../PermissionGate';

interface Evidence {
  id: string;
  metric_type: string;
  metric_name: string;
  value: number | string;
  source: string;
  source_identifier: string;
  collected_at: string;
  period: string;
  verified: boolean;
  confidence_score: number;
  tags: string[];
}

interface EvidenceListProps {
  companyId: string;
  role: string;
}

interface EvidenceFilters {
  metric_type: string[];
  source: string[];
  verified?: boolean;
  search: string;
  period?: string;
}

/**
 * Evidence List Component
 */
function EvidenceList({ companyId, role }: EvidenceListProps) {
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<EvidenceFilters>({
    metric_type: [],
    source: [],
    search: '',
  });
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  const [showLineageDrawer, setShowLineageDrawer] = useState(false);

  // Fetch evidence
  const fetchEvidence = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', '50');

      if (filters.metric_type.length > 0) {
        filters.metric_type.forEach((type) => params.append('metric_type', type));
      }

      if (filters.source.length > 0) {
        filters.source.forEach((source) => params.append('source', source));
      }

      if (filters.verified !== undefined) {
        params.append('verified', String(filters.verified));
      }

      if (filters.search) {
        params.append('search', filters.search);
      }

      if (filters.period) {
        params.append('period', filters.period);
      }

      const url = `http://localhost:3001/companies/${companyId}/evidence?${params.toString()}`;
      const response = await fetch(url);

      if (response.ok) {
        const result = await response.json();
        setEvidence(result.data);
      }
    } catch (error) {
      console.error('[EvidenceList] Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [companyId, filters]);

  useEffect(() => {
    fetchEvidence();
  }, [fetchEvidence]);

  // Filter toggles
  const toggleMetricType = useCallback((type: string) => {
    setFilters((prev) => ({
      ...prev,
      metric_type: prev.metric_type.includes(type)
        ? prev.metric_type.filter((t) => t !== type)
        : [...prev.metric_type, type],
    }));
  }, []);

  const toggleSource = useCallback((source: string) => {
    setFilters((prev) => ({
      ...prev,
      source: prev.source.includes(source)
        ? prev.source.filter((s) => s !== source)
        : [...prev.source, source],
    }));
  }, []);

  const toggleVerified = useCallback((verified: boolean | undefined) => {
    setFilters((prev) => ({
      ...prev,
      verified: prev.verified === verified ? undefined : verified,
    }));
  }, []);

  const handleSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search }));
  }, []);

  const handleRowClick = useCallback((item: Evidence) => {
    setSelectedEvidence(item);
    setShowLineageDrawer(true);
  }, []);

  const metricTypes = [
    'volunteer_hours',
    'integration_score',
    'language_score',
    'job_readiness_score',
    'beneficiaries_reached',
    'investment_amount',
    'outcome_delta',
  ];

  const sources = [
    'manual_entry',
    'csv_import',
    'api_integration',
    'benevity',
    'goodera',
    'workday',
    'calculated',
  ];

  return (
    <div className="evidence-list">
      <div className="evidence-header">
        <h2>Evidence Explorer</h2>
        <p className="subtitle">View and trace data sources for impact metrics</p>
      </div>

      {/* Filters */}
      <div className="filters-panel">
        <div className="filter-group">
          <label>Search</label>
          <input
            type="text"
            placeholder="Search metric names..."
            value={filters.search}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <label>Metric Type</label>
          <div className="filter-chips">
            {metricTypes.map((type) => (
              <button
                key={type}
                onClick={() => toggleMetricType(type)}
                className={`chip ${filters.metric_type.includes(type) ? 'active' : ''}`}
              >
                {formatMetricType(type)}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <label>Source</label>
          <div className="filter-chips">
            {sources.map((source) => (
              <button
                key={source}
                onClick={() => toggleSource(source)}
                className={`chip ${filters.source.includes(source) ? 'active' : ''}`}
              >
                {formatSource(source)}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <label>Verification</label>
          <div className="filter-chips">
            <button
              onClick={() => toggleVerified(true)}
              className={`chip ${filters.verified === true ? 'active' : ''}`}
            >
              ✓ Verified
            </button>
            <button
              onClick={() => toggleVerified(false)}
              className={`chip ${filters.verified === false ? 'active' : ''}`}
            >
              ⚠️ Unverified
            </button>
          </div>
        </div>
      </div>

      {/* Evidence table */}
      {loading ? (
        <div className="loading">Loading evidence...</div>
      ) : evidence.length === 0 ? (
        <div className="empty-state">
          <p>No evidence found matching your filters.</p>
          <button onClick={() => setFilters({ metric_type: [], source: [], search: '' })}>
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="evidence-table">
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
                <th>Source</th>
                <th>Period</th>
                <th>Collected</th>
                <th>Status</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {evidence.map((item) => (
                <EvidenceRow
                  key={item.id}
                  evidence={item}
                  onClick={() => handleRowClick(item)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Lineage drawer */}
      {showLineageDrawer && selectedEvidence && (
        <LineageDrawer
          companyId={companyId}
          evidenceId={selectedEvidence.id}
          onClose={() => setShowLineageDrawer(false)}
        />
      )}

      <style>{`
        .evidence-list {
          padding: 24px;
        }

        .evidence-header h2 {
          font-size: 1.5rem;
          margin-bottom: 4px;
        }

        .subtitle {
          color: var(--color-text-secondary);
          font-size: 0.9rem;
          margin-bottom: 24px;
        }

        .filters-panel {
          background: var(--color-bg-secondary);
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 24px;
        }

        .filter-group {
          margin-bottom: 16px;
        }

        .filter-group:last-child {
          margin-bottom: 0;
        }

        .filter-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 8px;
          color: var(--color-text);
        }

        .search-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--color-border);
          border-radius: 6px;
          font-size: 0.9375rem;
        }

        .filter-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .chip {
          padding: 6px 12px;
          border: 1px solid var(--color-border);
          border-radius: 16px;
          background: white;
          font-size: 0.8125rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .chip:hover {
          border-color: var(--color-primary);
          background: var(--color-primary-light, #e6f2ff);
        }

        .chip.active {
          background: var(--color-primary);
          color: white;
          border-color: var(--color-primary);
        }

        .evidence-table {
          overflow-x: auto;
          background: white;
          border-radius: 8px;
          border: 1px solid var(--color-border);
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        thead {
          background: var(--color-bg-secondary);
        }

        th {
          text-align: left;
          padding: 12px 16px;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        tbody tr {
          border-top: 1px solid var(--color-border);
          cursor: pointer;
          transition: background 0.15s;
        }

        tbody tr:hover {
          background: var(--color-bg-secondary);
        }

        td {
          padding: 12px 16px;
          font-size: 0.9375rem;
        }

        .loading, .empty-state {
          text-align: center;
          padding: 48px;
          color: var(--color-text-secondary);
        }

        .empty-state button {
          margin-top: 16px;
          padding: 10px 20px;
          background: var(--color-primary);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

/**
 * Evidence Row Component
 */
const EvidenceRow = memoize<{
  evidence: Evidence;
  onClick: () => void;
}>(function EvidenceRow({ evidence, onClick }) {
  return (
    <tr onClick={onClick}>
      <td>
        <div className="metric-cell">
          <div className="metric-name">{evidence.metric_name}</div>
          <div className="metric-type">{formatMetricType(evidence.metric_type)}</div>
        </div>
      </td>
      <td>
        <strong>{formatValue(evidence.value)}</strong>
      </td>
      <td>
        <div className="source-cell">
          <span className="source-badge">{formatSource(evidence.source)}</span>
          <div className="source-id">{evidence.source_identifier}</div>
        </div>
      </td>
      <td>{evidence.period}</td>
      <td>{formatDate(evidence.collected_at)}</td>
      <td>
        {evidence.verified ? (
          <span className="status-badge verified">✓ Verified</span>
        ) : (
          <span className="status-badge unverified">⚠️ Unverified</span>
        )}
      </td>
      <td>
        <div className="confidence-bar">
          <div
            className="confidence-fill"
            style={{ width: `${evidence.confidence_score * 100}%` }}
          />
          <span className="confidence-text">{Math.round(evidence.confidence_score * 100)}%</span>
        </div>
      </td>
      <style>{`
        .metric-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .metric-name {
          font-weight: 500;
        }

        .metric-type {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
        }

        .source-cell {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .source-badge {
          display: inline-block;
          padding: 2px 8px;
          background: var(--color-bg-secondary);
          border-radius: 4px;
          font-size: 0.75rem;
          width: fit-content;
        }

        .source-id {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          font-family: monospace;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .status-badge.verified {
          background: #d1fae5;
          color: #065f46;
        }

        .status-badge.unverified {
          background: #fef3c7;
          color: #92400e;
        }

        .confidence-bar {
          position: relative;
          width: 80px;
          height: 20px;
          background: var(--color-bg-secondary);
          border-radius: 4px;
          overflow: hidden;
        }

        .confidence-fill {
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          background: linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #10b981 100%);
          transition: width 0.3s;
        }

        .confidence-text {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--color-text);
        }
      `}</style>
    </tr>
  );
});

/**
 * Lineage Drawer Component (placeholder)
 */
function LineageDrawer({
  companyId,
  evidenceId,
  onClose,
}: {
  companyId: string;
  evidenceId: string;
  onClose: () => void;
}) {
  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h3>Evidence Lineage</h3>
          <button onClick={onClose} className="close-btn">
            ×
          </button>
        </div>
        <div className="drawer-content">
          <p>Lineage view for evidence: {evidenceId}</p>
          <p>Coming in B.3...</p>
        </div>
        <style>{`
          .drawer-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1000;
          }

          .drawer {
            position: fixed;
            right: 0;
            top: 0;
            bottom: 0;
            width: 600px;
            max-width: 90vw;
            background: white;
            box-shadow: -4px 0 16px rgba(0, 0, 0, 0.1);
            overflow-y: auto;
          }

          .drawer-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px;
            border-bottom: 1px solid var(--color-border);
          }

          .drawer-header h3 {
            font-size: 1.25rem;
            margin: 0;
          }

          .close-btn {
            background: none;
            border: none;
            font-size: 2rem;
            cursor: pointer;
            color: var(--color-text-secondary);
            line-height: 1;
          }

          .drawer-content {
            padding: 24px;
          }
        `}</style>
      </div>
    </div>
  );
}

/**
 * Format helpers
 */
function formatMetricType(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatSource(source: string): string {
  return source
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatValue(value: number | string): string {
  if (typeof value === 'number') {
    return value.toLocaleString();
  }
  return String(value);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default memoize(EvidenceList);
