/**
 * CohortBuilder Component
 *
 * Advanced cohort builder with faceted filters, real-time k-anonymity preview,
 * and saved cohort management.
 *
 * @author percentile-viz-engineer & opt-in-governance
 */

import { useState, useEffect, useCallback } from 'react';

export interface CohortDefinition {
  dimensions: {
    industry?: string[];
    region?: string[];
    employeeRange?: string[];
    programType?: string[];
  };
  size?: number; // Preview from API
}

export interface SavedCohort {
  id: string;
  name: string;
  definition: CohortDefinition;
  createdAt: string;
  createdBy: string;
}

interface CohortBuilderProps {
  companyId: string;
  onCohortChange: (cohort: CohortDefinition) => void;
  savedCohorts?: SavedCohort[];
}

const INDUSTRIES = [
  'Technology',
  'Financial Services',
  'Healthcare',
  'Manufacturing',
  'Retail & Consumer Goods',
  'Energy & Utilities',
  'Education',
  'Nonprofit & NGO',
  'Consulting & Professional Services',
  'Other',
];

const REGIONS = [
  'North America',
  'South America',
  'Europe',
  'Asia-Pacific',
  'Middle East',
  'Africa',
];

const EMPLOYEE_RANGES = [
  '1-50',
  '51-500',
  '501-5000',
  '5000+',
];

const PROGRAM_TYPES = [
  'Skills Development',
  'Community Outreach',
  'Environmental',
  'Health & Wellness',
  'Education & Literacy',
  'Economic Empowerment',
];

const K_ANONYMITY_THRESHOLD = 5;
const DEBOUNCE_DELAY = 300;

export default function CohortBuilder({
  companyId,
  onCohortChange,
  savedCohorts = [],
}: CohortBuilderProps) {
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedEmployeeRanges, setSelectedEmployeeRanges] = useState<string[]>([]);
  const [selectedProgramTypes, setSelectedProgramTypes] = useState<string[]>([]);
  const [cohortSize, setCohortSize] = useState<number | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [cohortName, setCohortName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Debounced preview fetcher
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCohortPreview();
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timer);
  }, [selectedIndustries, selectedRegions, selectedEmployeeRanges, selectedProgramTypes]);

  const fetchCohortPreview = async () => {
    setIsLoadingPreview(true);
    try {
      const params = new URLSearchParams();
      if (selectedIndustries.length) params.append('industries', selectedIndustries.join(','));
      if (selectedRegions.length) params.append('regions', selectedRegions.join(','));
      if (selectedEmployeeRanges.length) params.append('employee_ranges', selectedEmployeeRanges.join(','));
      if (selectedProgramTypes.length) params.append('program_types', selectedProgramTypes.join(','));

      const response = await fetch(
        `http://localhost:3001/companies/${companyId}/cohorts/preview?${params.toString()}`
      );

      if (response.ok) {
        const data = await response.json();
        setCohortSize(data.size);

        // Notify parent component
        const cohort: CohortDefinition = {
          dimensions: {
            industry: selectedIndustries.length ? selectedIndustries : undefined,
            region: selectedRegions.length ? selectedRegions : undefined,
            employeeRange: selectedEmployeeRanges.length ? selectedEmployeeRanges : undefined,
            programType: selectedProgramTypes.length ? selectedProgramTypes : undefined,
          },
          size: data.size,
        };
        onCohortChange(cohort);
      }
    } catch (error) {
      console.error('Failed to fetch cohort preview:', error);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleMultiSelect = (
    value: string,
    selected: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (selected.includes(value)) {
      setter(selected.filter((v) => v !== value));
    } else {
      setter([...selected, value]);
    }
  };

  const handleSaveCohort = async () => {
    if (!cohortName.trim()) return;

    setIsSaving(true);
    try {
      const response = await fetch(`http://localhost:3001/companies/${companyId}/cohorts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cohortName,
          definition: {
            dimensions: {
              industry: selectedIndustries.length ? selectedIndustries : undefined,
              region: selectedRegions.length ? selectedRegions : undefined,
              employeeRange: selectedEmployeeRanges.length ? selectedEmployeeRanges : undefined,
              programType: selectedProgramTypes.length ? selectedProgramTypes : undefined,
            },
          },
        }),
      });

      if (response.ok) {
        setShowSaveModal(false);
        setCohortName('');
        // Refresh saved cohorts (parent should handle)
      }
    } catch (error) {
      console.error('Failed to save cohort:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadCohort = (cohort: SavedCohort) => {
    const { industry, region, employeeRange, programType } = cohort.definition.dimensions;
    setSelectedIndustries(industry || []);
    setSelectedRegions(region || []);
    setSelectedEmployeeRanges(employeeRange || []);
    setSelectedProgramTypes(programType || []);
  };

  const meetsKAnonymity = cohortSize !== null && cohortSize >= K_ANONYMITY_THRESHOLD;
  const hasSelections =
    selectedIndustries.length > 0 ||
    selectedRegions.length > 0 ||
    selectedEmployeeRanges.length > 0 ||
    selectedProgramTypes.length > 0;

  return (
    <div className="cohort-builder">
      <div className="cohort-builder-header">
        <div>
          <h2>Build Your Cohort</h2>
          <p className="subtitle">
            Select filters to find peer companies for privacy-preserving benchmarking
          </p>
        </div>
        <div className="cohort-actions">
          {hasSelections && (
            <button
              className="btn-secondary"
              onClick={() => setShowSaveModal(true)}
              disabled={!meetsKAnonymity}
              aria-label="Save current cohort configuration"
            >
              Save Cohort
            </button>
          )}
        </div>
      </div>

      {/* Cohort Size Preview Badge */}
      <div className="cohort-preview-badge" role="status" aria-live="polite">
        {isLoadingPreview ? (
          <div className="badge badge-loading">
            <span className="spinner-sm" aria-hidden="true"></span>
            <span>Calculating cohort size...</span>
          </div>
        ) : cohortSize === null ? (
          <div className="badge badge-info">
            <span aria-hidden="true">ℹ️</span>
            <span>Select filters to preview cohort size</span>
          </div>
        ) : meetsKAnonymity ? (
          <div className="badge badge-success">
            <span aria-hidden="true">✅</span>
            <span>
              <strong>{cohortSize}</strong> companies in cohort
              {cohortSize >= 10 && <span className="badge-hint"> (recommended minimum met)</span>}
            </span>
          </div>
        ) : (
          <div className="badge badge-warning">
            <span aria-hidden="true">⚠️</span>
            <span>
              Cohort too small (<strong>{cohortSize}</strong> companies) -
              privacy threshold not met (minimum: {K_ANONYMITY_THRESHOLD})
            </span>
          </div>
        )}
      </div>

      {/* Saved Cohorts Dropdown */}
      {savedCohorts.length > 0 && (
        <div className="saved-cohorts-section">
          <label htmlFor="saved-cohorts">Load Saved Cohort:</label>
          <select
            id="saved-cohorts"
            className="cohort-select"
            onChange={(e) => {
              const cohort = savedCohorts.find((c) => c.id === e.target.value);
              if (cohort) handleLoadCohort(cohort);
            }}
            aria-label="Select a previously saved cohort configuration"
          >
            <option value="">-- Select a saved cohort --</option>
            {savedCohorts.map((cohort) => (
              <option key={cohort.id} value={cohort.id}>
                {cohort.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Filter Panels */}
      <div className="filter-grid">
        {/* Industry Filter */}
        <FilterPanel
          title="Industry"
          icon="🏢"
          items={INDUSTRIES}
          selected={selectedIndustries}
          onToggle={(value) => handleMultiSelect(value, selectedIndustries, setSelectedIndustries)}
          ariaLabel="Filter by industry sector"
        />

        {/* Region Filter */}
        <FilterPanel
          title="Region"
          icon="🌍"
          items={REGIONS}
          selected={selectedRegions}
          onToggle={(value) => handleMultiSelect(value, selectedRegions, setSelectedRegions)}
          ariaLabel="Filter by geographic region"
        />

        {/* Employee Range Filter */}
        <FilterPanel
          title="Company Size (Employees)"
          icon="👥"
          items={EMPLOYEE_RANGES}
          selected={selectedEmployeeRanges}
          onToggle={(value) => handleMultiSelect(value, selectedEmployeeRanges, setSelectedEmployeeRanges)}
          ariaLabel="Filter by company size based on employee count"
        />

        {/* Program Type Filter */}
        <FilterPanel
          title="Program Type"
          icon="📋"
          items={PROGRAM_TYPES}
          selected={selectedProgramTypes}
          onToggle={(value) => handleMultiSelect(value, selectedProgramTypes, setSelectedProgramTypes)}
          ariaLabel="Filter by CSR program type"
        />
      </div>

      {/* Save Cohort Modal */}
      {showSaveModal && (
        <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="save-cohort-title">
            <div className="modal-header">
              <h3 id="save-cohort-title">Save Cohort</h3>
              <button
                className="modal-close"
                onClick={() => setShowSaveModal(false)}
                aria-label="Close save cohort dialog"
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <label htmlFor="cohort-name-input">Cohort Name:</label>
              <input
                id="cohort-name-input"
                type="text"
                className="input-text"
                value={cohortName}
                onChange={(e) => setCohortName(e.target.value)}
                placeholder="e.g., Tech Companies in North America"
                autoFocus
                aria-required="true"
              />
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowSaveModal(false)}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSaveCohort}
                disabled={!cohortName.trim() || isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .cohort-builder {
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          margin-bottom: 24px;
        }

        .cohort-builder-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          gap: 16px;
        }

        .cohort-builder-header h2 {
          margin: 0 0 4px 0;
          font-size: 1.5rem;
          font-weight: 600;
          color: #1f2937;
        }

        .cohort-builder-header .subtitle {
          margin: 0;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .cohort-actions {
          display: flex;
          gap: 8px;
        }

        .btn-primary,
        .btn-secondary {
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .btn-secondary {
          background: white;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #f9fafb;
        }

        .btn-primary:disabled,
        .btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .cohort-preview-badge {
          margin-bottom: 20px;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .badge-loading {
          background: #f3f4f6;
          color: #6b7280;
        }

        .badge-info {
          background: #dbeafe;
          color: #1e40af;
        }

        .badge-success {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #86efac;
        }

        .badge-warning {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fbbf24;
        }

        .badge-hint {
          font-size: 0.8125rem;
          opacity: 0.8;
        }

        .spinner-sm {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid #d1d5db;
          border-top-color: #6b7280;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .saved-cohorts-section {
          margin-bottom: 20px;
        }

        .saved-cohorts-section label {
          display: block;
          margin-bottom: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .cohort-select {
          width: 100%;
          max-width: 400px;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.9375rem;
          color: #1f2937;
          background: white;
          cursor: pointer;
        }

        .cohort-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .filter-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal {
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          width: 90%;
          max-width: 500px;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: #6b7280;
          cursor: pointer;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
        }

        .modal-close:hover {
          background: #f3f4f6;
        }

        .modal-body {
          padding: 24px;
        }

        .modal-body label {
          display: block;
          margin-bottom: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .input-text {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.9375rem;
          color: #1f2937;
        }

        .input-text:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid #e5e7eb;
        }

        @media (max-width: 768px) {
          .cohort-builder {
            padding: 16px;
          }

          .cohort-builder-header {
            flex-direction: column;
          }

          .filter-grid {
            grid-template-columns: 1fr;
          }

          .modal {
            width: 95%;
          }
        }
      `}</style>
    </div>
  );
}

// Filter Panel Sub-component
interface FilterPanelProps {
  title: string;
  icon: string;
  items: string[];
  selected: string[];
  onToggle: (value: string) => void;
  ariaLabel: string;
}

function FilterPanel({ title, icon, items, selected, onToggle, ariaLabel }: FilterPanelProps) {
  return (
    <div className="filter-panel">
      <div className="filter-header">
        <span className="filter-icon" aria-hidden="true">{icon}</span>
        <h3>{title}</h3>
      </div>
      <div className="filter-options" role="group" aria-label={ariaLabel}>
        {items.map((item) => (
          <label key={item} className="filter-checkbox">
            <input
              type="checkbox"
              checked={selected.includes(item)}
              onChange={() => onToggle(item)}
              aria-label={`${item}`}
            />
            <span className="checkbox-label">{item}</span>
            {selected.includes(item) && (
              <span className="check-mark" aria-hidden="true">✓</span>
            )}
          </label>
        ))}
      </div>

      <style>{`
        .filter-panel {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
        }

        .filter-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .filter-icon {
          font-size: 1.25rem;
        }

        .filter-header h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: #1f2937;
        }

        .filter-options {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .filter-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          cursor: pointer;
          border-radius: 4px;
          position: relative;
          transition: background 0.2s;
        }

        .filter-checkbox:hover {
          background: white;
        }

        .filter-checkbox input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #3b82f6;
        }

        .checkbox-label {
          flex: 1;
          font-size: 0.875rem;
          color: #374151;
        }

        .check-mark {
          color: #3b82f6;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
