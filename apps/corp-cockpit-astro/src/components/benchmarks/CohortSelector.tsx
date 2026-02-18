/**
 * CohortSelector Component
 *
 * Allows users to select cohort comparison criteria
 */

import { useState, useEffect } from 'react';

interface Cohort {
  id: string;
  name: string;
  description: string;
  criteria: {
    industry?: string;
    size?: string;
    geography?: string;
  };
  company_count: number;
  last_updated: string;
}

interface Props {
  companyId: string;
  onCohortChange: (industry?: string, size?: string, geography?: string) => void;
  selectedIndustry?: string;
  selectedSize?: string;
  selectedGeography?: string;
}

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

export default function CohortSelector({
  companyId,
  onCohortChange,
  selectedIndustry = '',
  selectedSize = '',
  selectedGeography = '',
}: Props) {
  const [industry, setIndustry] = useState(selectedIndustry);
  const [size, setSize] = useState(selectedSize);
  const [geography, setGeography] = useState(selectedGeography);
  const [suggestedCohort, setSuggestedCohort] = useState<Cohort | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch suggested cohort on mount
  useEffect(() => {
    fetchSuggestedCohort();
  }, [companyId]);

  async function fetchSuggestedCohort() {
    try {
      const baseUrl = import.meta.env.PUBLIC_REPORTING_API_URL || '';
      const response = await fetch(`${baseUrl}/api/companies/${companyId}/cohorts`);
      if (response.ok) {
        const data = await response.json();
        setSuggestedCohort(data.suggested_cohort);
      }
    } catch (err) {
      console.error('Failed to fetch suggested cohort:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleIndustryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value || undefined;
    setIndustry(value || '');
    onCohortChange(value, size || undefined, geography || undefined);
  }

  function handleSizeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value || undefined;
    setSize(value || '');
    onCohortChange(industry || undefined, value, geography || undefined);
  }

  function handleGeographyChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value || undefined;
    setGeography(value || '');
    onCohortChange(industry || undefined, size || undefined, value);
  }

  function applySuggestedCohort() {
    if (!suggestedCohort) return;
    const { industry: i, size: s, geography: g } = suggestedCohort.criteria;
    setIndustry(i || '');
    setSize(s || '');
    setGeography(g || '');
    onCohortChange(i, s, g);
  }

  return (
    <div className="cohort-selector">
      <div className="selector-header">
        <h3>Select Comparison Cohort</h3>
        <p className="subtitle">Choose criteria to find similar companies for benchmarking</p>
      </div>

      {!loading && suggestedCohort && (
        <div className="suggested-cohort">
          <div className="suggestion-content">
            <span className="icon">💡</span>
            <div className="text">
              <strong>Suggested:</strong> {suggestedCohort.name}
              <span className="company-count">({suggestedCohort.company_count} companies)</span>
            </div>
          </div>
          <button className="apply-btn" onClick={applySuggestedCohort}>
            Apply
          </button>
        </div>
      )}

      <div className="selectors-grid">
        <div className="selector-group">
          <label htmlFor="industry-select">
            <span className="icon">🏢</span>
            Industry
          </label>
          <select
            id="industry-select"
            value={industry}
            onChange={handleIndustryChange}
            className="selector-input"
          >
            {INDUSTRIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="selector-group">
          <label htmlFor="size-select">
            <span className="icon">📏</span>
            Company Size
          </label>
          <select
            id="size-select"
            value={size}
            onChange={handleSizeChange}
            className="selector-input"
          >
            {SIZES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="selector-group">
          <label htmlFor="geography-select">
            <span className="icon">🌍</span>
            Geography
          </label>
          <select
            id="geography-select"
            value={geography}
            onChange={handleGeographyChange}
            className="selector-input"
          >
            {GEOGRAPHIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <style>{`
        .cohort-selector {
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          margin-bottom: 24px;
        }

        .selector-header h3 {
          margin: 0 0 4px 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
        }

        .selector-header .subtitle {
          margin: 0 0 20px 0;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .suggested-cohort {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 16px;
          background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%);
          border: 1px solid #93c5fd;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .suggestion-content {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
        }

        .suggestion-content .icon {
          font-size: 1.25rem;
        }

        .suggestion-content .text {
          font-size: 0.875rem;
          color: #1e40af;
        }

        .suggestion-content .text strong {
          font-weight: 600;
        }

        .suggestion-content .company-count {
          margin-left: 6px;
          color: #3b82f6;
          font-size: 0.8125rem;
        }

        .apply-btn {
          padding: 6px 16px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .apply-btn:hover {
          background: #2563eb;
        }

        .selectors-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
        }

        .selector-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .selector-group label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .selector-group label .icon {
          font-size: 1rem;
        }

        .selector-input {
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.9375rem;
          color: #1f2937;
          background: white;
          cursor: pointer;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .selector-input:hover {
          border-color: #9ca3af;
        }

        .selector-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        @media (max-width: 768px) {
          .cohort-selector {
            padding: 16px;
          }

          .selectors-grid {
            grid-template-columns: 1fr;
          }

          .suggested-cohort {
            flex-direction: column;
            align-items: flex-start;
          }

          .apply-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
