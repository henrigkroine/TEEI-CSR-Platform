/**
 * Usage Filters - Phase H3-C
 * Shared filters for all usage analytics views.
 */

import { useState } from 'react';

interface UsageFiltersProps {
  companyId: string;
}

export default function UsageFilters({ companyId }: UsageFiltersProps) {
  const [timeRange, setTimeRange] = useState('30d');
  const [tenant, setTenant] = useState('all');
  const [program, setProgram] = useState('all');

  return (
    <div className="usage-filters">
      <div className="filter-group">
        <label htmlFor="time-range">Time Range</label>
        <select
          id="time-range"
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="filter-select"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="tenant-filter">Tenant</label>
        <select
          id="tenant-filter"
          value={tenant}
          onChange={(e) => setTenant(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Tenants</option>
          <option value="tenant-1">Tenant 1</option>
          <option value="tenant-2">Tenant 2</option>
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="program-filter">Program</label>
        <select
          id="program-filter"
          value={program}
          onChange={(e) => setProgram(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Programs</option>
          <option value="prog-1">Program 1</option>
          <option value="prog-2">Program 2</option>
        </select>
      </div>

      <style>{`
        .usage-filters {
          display: flex;
          gap: 20px;
          padding: 20px;
          background: var(--color-bg-light, #f9fafb);
          border-radius: 8px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 180px;
        }

        .filter-group label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text);
        }

        .filter-select {
          padding: 8px 12px;
          border: 1px solid var(--color-border);
          border-radius: 6px;
          font-size: 0.9375rem;
          background: white;
        }

        .filter-select:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
      `}</style>
    </div>
  );
}
