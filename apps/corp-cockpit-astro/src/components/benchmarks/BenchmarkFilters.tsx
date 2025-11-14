/**
 * BenchmarkFilters Component
 *
 * Enhanced filtering interface for benchmark comparisons
 * Includes cohort type, metric, and time period selectors
 */

import { useState, useEffect } from 'react';

interface Props {
  companyId: string;
}

const COHORT_TYPES = [
  { value: 'industry', label: 'Industry', icon: '🏢' },
  { value: 'country', label: 'Country', icon: '🌍' },
  { value: 'size', label: 'Company Size', icon: '📏' },
  { value: 'program_mix', label: 'Program Mix', icon: '🎯' },
];

const METRICS = [
  { value: 'sroi', label: 'SROI (Social Return on Investment)' },
  { value: 'vis', label: 'VIS (Volunteer Impact Score)' },
  { value: 'participation_rate', label: 'Employee Participation Rate' },
  { value: 'retention', label: 'Program Retention Rate' },
  { value: 'beneficiaries', label: 'Total Beneficiaries' },
  { value: 'volunteer_hours', label: 'Volunteer Hours' },
  { value: 'impact_score', label: 'Overall Impact Score' },
];

const TIME_PERIODS = [
  { value: '2024Q4', label: 'Q4 2024 (Current)' },
  { value: '2024Q3', label: 'Q3 2024' },
  { value: '2024Q2', label: 'Q2 2024' },
  { value: '2024Q1', label: 'Q1 2024' },
  { value: '2024', label: 'Full Year 2024' },
  { value: '2023', label: 'Full Year 2023' },
  { value: 'all_time', label: 'All Time' },
];

const INDUSTRIES = [
  { value: '', label: 'All Industries' },
  { value: 'technology', label: 'Technology' },
  { value: 'finance', label: 'Financial Services' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'retail', label: 'Retail & Consumer Goods' },
  { value: 'energy', label: 'Energy & Utilities' },
  { value: 'education', label: 'Education' },
  { value: 'nonprofit', label: 'Nonprofit & NGO' },
  { value: 'consulting', label: 'Consulting & Professional Services' },
  { value: 'other', label: 'Other' },
];

const SIZES = [
  { value: '', label: 'All Sizes' },
  { value: 'small', label: 'Small (1-50 employees)' },
  { value: 'medium', label: 'Medium (51-500 employees)' },
  { value: 'large', label: 'Large (501-5000 employees)' },
  { value: 'enterprise', label: 'Enterprise (5000+ employees)' },
];

const GEOGRAPHIES = [
  { value: '', label: 'Global' },
  { value: 'north_america', label: 'North America' },
  { value: 'south_america', label: 'South America' },
  { value: 'europe', label: 'Europe' },
  { value: 'asia_pacific', label: 'Asia-Pacific' },
  { value: 'middle_east', label: 'Middle East' },
  { value: 'africa', label: 'Africa' },
];

export default function BenchmarkFilters({ companyId }: Props) {
  const [selectedCohortType, setSelectedCohortType] = useState('industry');
  const [selectedMetric, setSelectedMetric] = useState('sroi');
  const [selectedPeriod, setSelectedPeriod] = useState('2024Q4');
  const [industry, setIndustry] = useState('');
  const [size, setSize] = useState('');
  const [geography, setGeography] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  // Apply filters
  async function applyFilters() {
    setIsApplying(true);

    const filters = {
      cohortType: selectedCohortType,
      metric: selectedMetric,
      period: selectedPeriod,
      industry: industry || undefined,
      size: size || undefined,
      geography: geography || undefined,
    };

    // Store filters globally for export component
    (window as any).currentBenchmarkFilters = filters;

    // Call the global handler set by the Astro page
    if ((window as any).handleFilterChange) {
      await (window as any).handleFilterChange(filters);
    }

    setIsApplying(false);
  }

  // Auto-apply on mount
  useEffect(() => {
    applyFilters();
  }, []);

  return (
    <div className="benchmark-filters">
      <div className="filters-header">
        <h3>Filter Benchmarks</h3>
        <p className="subtitle">Customize your comparison criteria</p>
      </div>

      {/* Cohort Type Selector */}
      <div className="filter-section">
        <label className="filter-label">Cohort Type</label>
        <div className="cohort-type-buttons">
          {COHORT_TYPES.map((type) => (
            <button
              key={type.value}
              className={`cohort-btn ${selectedCohortType === type.value ? 'active' : ''}`}
              onClick={() => setSelectedCohortType(type.value)}
              aria-pressed={selectedCohortType === type.value}
            >
              <span className="btn-icon">{type.icon}</span>
              <span className="btn-label">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Specific Cohort Filters (based on selected type) */}
      <div className="filter-section">
        <label className="filter-label">Cohort Criteria</label>
        <div className="criteria-grid">
          <div className="filter-group">
            <label htmlFor="industry-select">Industry</label>
            <select
              id="industry-select"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="filter-select"
            >
              {INDUSTRIES.map((ind) => (
                <option key={ind.value} value={ind.value}>
                  {ind.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="size-select">Company Size</label>
            <select
              id="size-select"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="filter-select"
            >
              {SIZES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="geography-select">Geography</label>
            <select
              id="geography-select"
              value={geography}
              onChange={(e) => setGeography(e.target.value)}
              className="filter-select"
            >
              {GEOGRAPHIES.map((geo) => (
                <option key={geo.value} value={geo.value}>
                  {geo.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Metric and Period Selectors */}
      <div className="filter-section">
        <div className="dual-select">
          <div className="filter-group">
            <label htmlFor="metric-select">Metric</label>
            <select
              id="metric-select"
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="filter-select"
            >
              {METRICS.map((metric) => (
                <option key={metric.value} value={metric.value}>
                  {metric.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="period-select">Time Period</label>
            <select
              id="period-select"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="filter-select"
            >
              {TIME_PERIODS.map((period) => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Apply Button */}
      <div className="filter-actions">
        <button
          className="apply-btn"
          onClick={applyFilters}
          disabled={isApplying}
        >
          {isApplying ? (
            <>
              <span className="spinner"></span>
              Applying Filters...
            </>
          ) : (
            <>Apply Filters</>
          )}
        </button>
      </div>

      <style>{`
        .benchmark-filters {
          background: white;
          padding: 1.5rem;
          border-radius: 0.75rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          margin-bottom: 1.5rem;
        }

        .filters-header h3 {
          margin: 0 0 0.25rem 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
        }

        .filters-header .subtitle {
          margin: 0 0 1.5rem 0;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .filter-section {
          margin-bottom: 1.5rem;
        }

        .filter-section:last-of-type {
          margin-bottom: 1rem;
        }

        .filter-label {
          display: block;
          margin-bottom: 0.75rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
        }

        .cohort-type-buttons {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 0.75rem;
        }

        .cohort-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .cohort-btn:hover {
          border-color: #3b82f6;
          background: #f0f9ff;
        }

        .cohort-btn.active {
          border-color: #3b82f6;
          background: #dbeafe;
        }

        .cohort-btn:focus {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }

        .btn-icon {
          font-size: 1.5rem;
        }

        .btn-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #1f2937;
        }

        .criteria-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .dual-select {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .filter-group label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .filter-select {
          padding: 0.625rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          color: #1f2937;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-select:hover {
          border-color: #9ca3af;
        }

        .filter-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .filter-actions {
          display: flex;
          justify-content: flex-end;
        }

        .apply-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .apply-btn:hover:not(:disabled) {
          background: #059669;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .apply-btn:focus {
          outline: 2px solid #10b981;
          outline-offset: 2px;
        }

        .apply-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinner {
          display: inline-block;
          width: 1rem;
          height: 1rem;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 768px) {
          .benchmark-filters {
            padding: 1rem;
          }

          .cohort-type-buttons {
            grid-template-columns: repeat(2, 1fr);
          }

          .criteria-grid,
          .dual-select {
            grid-template-columns: 1fr;
          }

          .apply-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
