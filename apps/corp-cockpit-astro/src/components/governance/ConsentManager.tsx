/**
 * Consent Manager Component
 *
 * GDPR-compliant consent management UI for analytics, marketing, and necessary cookies.
 * Allows users to view and update their consent preferences.
 *
 * @module components/governance/ConsentManager
 */

import React, { useState, useEffect } from 'react';

interface ConsentManagerProps {
  companyId: string;
  userId: string;
}

interface ConsentCategory {
  id: string;
  name: string;
  description: string;
  required: boolean;
  enabled: boolean;
  purposes: string[];
  data_collected: string[];
}

interface ConsentRecord {
  user_id: string;
  consents: Record<string, boolean>;
  last_updated: string;
  version: string;
}

export default function ConsentManager({ companyId, userId }: ConsentManagerProps) {
  const [categories, setCategories] = useState<ConsentCategory[]>([]);
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchConsentData();
  }, [companyId, userId]);

  async function fetchConsentData() {
    try {
      // TODO: Fetch from Worker-1 consent API
      // For now, use mock data
      const mockCategories = getMockConsentCategories();
      const mockConsents = getMockUserConsents(userId);

      setCategories(mockCategories);
      setConsents(mockConsents.consents);
      setLastUpdated(mockConsents.last_updated);
    } catch (error) {
      console.error('Failed to fetch consent data:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleConsentChange(categoryId: string, value: boolean) {
    setConsents((prev) => ({
      ...prev,
      [categoryId]: value,
    }));
    setHasChanges(true);
  }

  async function handleSaveConsents() {
    setSaving(true);
    try {
      // TODO: POST to Worker-1 consent API
      // Mock save with delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Log to audit trail
      console.log('Consent updated:', {
        user_id: userId,
        company_id: companyId,
        consents,
        timestamp: new Date().toISOString(),
      });

      setLastUpdated(new Date().toISOString());
      setHasChanges(false);
      alert('Consent preferences saved successfully.');
    } catch (error) {
      console.error('Failed to save consents:', error);
      alert('Failed to save consent preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleResetConsents() {
    if (
      confirm(
        'Are you sure you want to reset to default consent settings? This will enable only necessary cookies.'
      )
    ) {
      const defaultConsents: Record<string, boolean> = {};
      categories.forEach((cat) => {
        defaultConsents[cat.id] = cat.required;
      });
      setConsents(defaultConsents);
      setHasChanges(true);
    }
  }

  if (loading) {
    return <div className="consent-manager loading">Loading consent preferences...</div>;
  }

  return (
    <div className="consent-manager">
      {/* Header */}
      <div className="consent-header">
        <div>
          <h3>Your Consent Preferences</h3>
          <p className="subtitle">
            Manage how we collect and use your data. Changes are effective immediately.
          </p>
        </div>
        {lastUpdated && (
          <div className="last-updated">
            <span className="label">Last updated:</span>
            <span className="date">{new Date(lastUpdated).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* GDPR Notice */}
      <div className="gdpr-notice">
        <strong>Your Privacy Rights</strong>
        <p>
          Under GDPR and privacy regulations, you have the right to control how your personal data
          is processed. You can withdraw consent at any time. Necessary cookies cannot be disabled
          as they are required for the platform to function.
        </p>
      </div>

      {/* Consent Categories */}
      <div className="consent-categories">
        {categories.map((category) => (
          <div key={category.id} className="consent-card">
            <div className="card-header">
              <div className="category-info">
                <div className="category-title">
                  <h4>{category.name}</h4>
                  {category.required && <span className="required-badge">Required</span>}
                </div>
                <p className="category-description">{category.description}</p>
              </div>
              <div className="toggle-wrapper">
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={consents[category.id] || false}
                    onChange={(e) => handleConsentChange(category.id, e.target.checked)}
                    disabled={category.required || saving}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className="toggle-label">
                  {consents[category.id] ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>

            <div className="card-body">
              <div className="detail-section">
                <h5>Purposes</h5>
                <ul>
                  {category.purposes.map((purpose, idx) => (
                    <li key={idx}>{purpose}</li>
                  ))}
                </ul>
              </div>

              <div className="detail-section">
                <h5>Data Collected</h5>
                <ul>
                  {category.data_collected.map((data, idx) => (
                    <li key={idx}>{data}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="action-bar">
        <button className="btn-secondary" onClick={handleResetConsents} disabled={saving}>
          Reset to Defaults
        </button>
        <button
          className="btn-primary"
          onClick={handleSaveConsents}
          disabled={!hasChanges || saving}
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>

      {hasChanges && (
        <div className="changes-notice">
          <span>You have unsaved changes</span>
        </div>
      )}

      <style jsx>{`
        .consent-manager {
          background: white;
        }

        .consent-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px solid #e5e7eb;
        }

        .consent-header h3 {
          margin: 0 0 8px 0;
          font-size: 1.5rem;
          color: #111827;
        }

        .subtitle {
          margin: 0;
          color: #6b7280;
          font-size: 0.9375rem;
        }

        .last-updated {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
          font-size: 0.875rem;
        }

        .last-updated .label {
          color: #6b7280;
          font-weight: 600;
        }

        .last-updated .date {
          color: #111827;
          font-family: 'Courier New', monospace;
        }

        .gdpr-notice {
          background: #eff6ff;
          border: 1px solid #3b82f6;
          border-left: 4px solid #2563eb;
          padding: 16px;
          border-radius: 6px;
          margin-bottom: 24px;
        }

        .gdpr-notice strong {
          display: block;
          margin-bottom: 8px;
          color: #1e40af;
          font-size: 0.9375rem;
        }

        .gdpr-notice p {
          margin: 0;
          color: #1e3a8a;
          line-height: 1.6;
          font-size: 0.9375rem;
        }

        .consent-categories {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 24px;
        }

        .consent-card {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
          transition: all 0.2s;
        }

        .consent-card:hover {
          border-color: #3b82f6;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 20px;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
        }

        .category-info {
          flex: 1;
          margin-right: 24px;
        }

        .category-title {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .category-title h4 {
          margin: 0;
          font-size: 1.125rem;
          color: #111827;
        }

        .required-badge {
          padding: 2px 8px;
          background: #fef3c7;
          border: 1px solid #fcd34d;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 700;
          color: #92400e;
          text-transform: uppercase;
        }

        .category-description {
          margin: 0;
          color: #6b7280;
          line-height: 1.6;
          font-size: 0.9375rem;
        }

        .toggle-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .toggle {
          position: relative;
          display: inline-block;
          width: 52px;
          height: 28px;
        }

        .toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #cbd5e1;
          transition: 0.3s;
          border-radius: 28px;
        }

        .toggle-slider:before {
          position: absolute;
          content: '';
          height: 20px;
          width: 20px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
        }

        .toggle input:checked + .toggle-slider {
          background-color: #22c55e;
        }

        .toggle input:checked + .toggle-slider:before {
          transform: translateX(24px);
        }

        .toggle input:disabled + .toggle-slider {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .toggle-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #6b7280;
        }

        .card-body {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          padding: 20px;
        }

        .detail-section h5 {
          margin: 0 0 12px 0;
          font-size: 0.875rem;
          font-weight: 700;
          color: #111827;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .detail-section ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .detail-section li {
          padding: 6px 0;
          color: #4b5563;
          font-size: 0.9375rem;
          line-height: 1.5;
          border-bottom: 1px solid #f3f4f6;
        }

        .detail-section li:last-child {
          border-bottom: none;
        }

        .detail-section li:before {
          content: '•';
          color: #3b82f6;
          font-weight: bold;
          display: inline-block;
          width: 1em;
          margin-left: -1em;
          padding-right: 0.5em;
        }

        .action-bar {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }

        .btn-primary,
        .btn-secondary {
          padding: 10px 24px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.9375rem;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-primary {
          background: #2563eb;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #1d4ed8;
        }

        .btn-primary:disabled {
          background: #cbd5e1;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #e5e7eb;
        }

        .btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .changes-notice {
          margin-top: 16px;
          padding: 12px;
          background: #fef3c7;
          border: 1px solid #fcd34d;
          border-radius: 6px;
          text-align: center;
          color: #92400e;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .loading {
          padding: 40px;
          text-align: center;
          color: #6b7280;
          font-size: 1rem;
        }

        @media (max-width: 768px) {
          .consent-header {
            flex-direction: column;
            gap: 16px;
          }

          .card-header {
            flex-direction: column;
            gap: 16px;
          }

          .category-info {
            margin-right: 0;
          }

          .toggle-wrapper {
            flex-direction: row;
            width: 100%;
            justify-content: space-between;
          }

          .card-body {
            grid-template-columns: 1fr;
          }

          .action-bar {
            flex-direction: column-reverse;
          }

          .btn-primary,
          .btn-secondary {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Mock data functions (replace with real API calls to Worker-1)
 */
function getMockConsentCategories(): ConsentCategory[] {
  return [
    {
      id: 'necessary',
      name: 'Necessary Cookies',
      description:
        'Essential cookies required for the platform to function. These cannot be disabled.',
      required: true,
      enabled: true,
      purposes: [
        'User authentication and session management',
        'Security and fraud prevention',
        'Core platform functionality',
        'Load balancing and performance',
      ],
      data_collected: [
        'Session tokens',
        'User ID',
        'Language preferences',
        'Security tokens (CSRF)',
      ],
    },
    {
      id: 'analytics',
      name: 'Analytics Cookies',
      description:
        'Help us understand how you use the platform to improve user experience and performance.',
      required: false,
      enabled: true,
      purposes: [
        'Usage analytics and statistics',
        'Performance monitoring',
        'Feature usage tracking',
        'Error reporting and diagnostics',
      ],
      data_collected: [
        'Page views and interactions',
        'Time spent on pages',
        'Browser and device information',
        'Geographic location (country/region)',
        'Error logs and stack traces',
      ],
    },
    {
      id: 'marketing',
      name: 'Marketing Cookies',
      description:
        'Used to deliver relevant content and measure the effectiveness of our communications.',
      required: false,
      enabled: false,
      purposes: [
        'Personalized content recommendations',
        'Email campaign tracking',
        'Product announcements',
        'User engagement metrics',
      ],
      data_collected: [
        'Email open and click rates',
        'Content preferences',
        'Feature interest indicators',
        'Communication preferences',
      ],
    },
  ];
}

function getMockUserConsents(userId: string): ConsentRecord {
  return {
    user_id: userId,
    consents: {
      necessary: true,
      analytics: true,
      marketing: false,
    },
    last_updated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    version: '1.0',
  };
}
