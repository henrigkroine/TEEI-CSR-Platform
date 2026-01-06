/**
 * OptInConsent Component
 *
 * Privacy-preserving data sharing consent manager for benchmarking.
 * Admin-only access with clear explanation of what's shared.
 *
 * @author opt-in-governance
 */

import { useState } from 'react';

interface OptInConsentProps {
  companyId: string;
  currentConsent: boolean;
  consentDate?: Date;
  onConsentChange: (consent: boolean) => Promise<void>;
}

export default function OptInConsent({
  companyId,
  currentConsent,
  consentDate,
  onConsentChange,
}: OptInConsentProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [localConsent, setLocalConsent] = useState(currentConsent);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingConsent, setPendingConsent] = useState<boolean | null>(null);

  const handleToggleClick = (newValue: boolean) => {
    setPendingConsent(newValue);
    setShowConfirmDialog(true);
  };

  const handleConfirm = async () => {
    if (pendingConsent === null) return;

    setIsUpdating(true);
    try {
      await onConsentChange(pendingConsent);
      setLocalConsent(pendingConsent);
      setShowConfirmDialog(false);
      setPendingConsent(null);
    } catch (error) {
      console.error('Failed to update consent:', error);
      // Keep current state on error
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
    setPendingConsent(null);
  };

  const formatConsentDate = (date?: Date): string => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="opt-in-consent">
      <div className="consent-header">
        <div>
          <h2>Data Sharing for Benchmarks</h2>
          <p className="consent-subtitle">
            Control how your company's data is used in anonymized peer benchmarking
          </p>
        </div>
        <div className="consent-status-badge" role="status" aria-live="polite">
          {localConsent ? (
            <span className="badge badge-active">
              <span aria-hidden="true">✅</span>
              <span>Active</span>
            </span>
          ) : (
            <span className="badge badge-inactive">
              <span aria-hidden="true">⭕</span>
              <span>Inactive</span>
            </span>
          )}
        </div>
      </div>

      <div className="consent-explanation">
        <p className="explanation-intro">
          By opting in, your company's aggregated metrics (SROI, VIS, etc.) will be included in
          anonymous cohort benchmarks. This helps other companies compare their performance.
        </p>

        <div className="privacy-grid">
          <div className="privacy-section">
            <h3 className="section-title shared">
              <span aria-hidden="true">✅</span>
              <span>What's Shared</span>
            </h3>
            <ul className="privacy-list">
              <li>
                <strong>Aggregated metrics only</strong> (averages, percentiles)
              </li>
              <li>
                <strong>No personally identifiable information (PII)</strong>
              </li>
              <li>
                <strong>k-anonymity protection</strong> (minimum 5 companies per cohort)
              </li>
              <li>
                <strong>Differential privacy noise</strong> added to all values
              </li>
            </ul>
          </div>

          <div className="privacy-section">
            <h3 className="section-title not-shared">
              <span aria-hidden="true">❌</span>
              <span>What's NOT Shared</span>
            </h3>
            <ul className="privacy-list">
              <li>
                <strong>Individual employee data</strong>
              </li>
              <li>
                <strong>Raw feedback or comments</strong>
              </li>
              <li>
                <strong>Company name or identifying details</strong>
              </li>
              <li>
                <strong>Proprietary program information</strong>
              </li>
            </ul>
          </div>
        </div>

        <div className="technical-details">
          <h4>Technical Privacy Safeguards</h4>
          <div className="safeguards-grid">
            <div className="safeguard-card">
              <div className="safeguard-icon" aria-hidden="true">🔐</div>
              <div>
                <div className="safeguard-title">k-Anonymity</div>
                <div className="safeguard-desc">
                  Cohorts must have at least 5 companies to prevent re-identification
                </div>
              </div>
            </div>
            <div className="safeguard-card">
              <div className="safeguard-icon" aria-hidden="true">🎲</div>
              <div>
                <div className="safeguard-title">Differential Privacy</div>
                <div className="safeguard-desc">
                  Mathematical noise (ε=0.1) added to protect individual contributions
                </div>
              </div>
            </div>
            <div className="safeguard-card">
              <div className="safeguard-icon" aria-hidden="true">🔍</div>
              <div>
                <div className="safeguard-title">Audit Trail</div>
                <div className="safeguard-desc">
                  All data access is logged and monitored for compliance
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="consent-controls">
        <div className="toggle-section">
          <label htmlFor="consent-toggle" className="toggle-label">
            Share my company's data for benchmarks
          </label>
          <button
            id="consent-toggle"
            className={`toggle-switch ${localConsent ? 'active' : ''}`}
            onClick={() => handleToggleClick(!localConsent)}
            disabled={isUpdating}
            role="switch"
            aria-checked={localConsent}
            aria-label={`Data sharing is currently ${localConsent ? 'enabled' : 'disabled'}. Click to ${localConsent ? 'disable' : 'enable'}.`}
          >
            <span className="toggle-slider"></span>
          </button>
        </div>
        <div className="consent-metadata">
          <span className="metadata-label">Last updated:</span>
          <span className="metadata-value">{formatConsentDate(consentDate)}</span>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="modal-overlay" onClick={handleCancel}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="confirm-title">
            <div className="modal-header">
              <h3 id="confirm-title">
                {pendingConsent ? 'Enable Data Sharing?' : 'Disable Data Sharing?'}
              </h3>
              <button
                className="modal-close"
                onClick={handleCancel}
                aria-label="Close confirmation dialog"
                disabled={isUpdating}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              {pendingConsent ? (
                <div>
                  <p>
                    By enabling data sharing, your company's aggregated metrics will be included in
                    anonymous peer benchmarks. This helps the CSR community gain better insights
                    while protecting your privacy.
                  </p>
                  <div className="confirmation-checklist">
                    <div className="checklist-item">
                      <span aria-hidden="true">✓</span>
                      <span>All data is aggregated and anonymized</span>
                    </div>
                    <div className="checklist-item">
                      <span aria-hidden="true">✓</span>
                      <span>k-anonymity and differential privacy applied</span>
                    </div>
                    <div className="checklist-item">
                      <span aria-hidden="true">✓</span>
                      <span>You can revoke consent at any time</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p>
                  Your company's data will no longer be included in peer benchmarks. Existing
                  aggregated data in cohorts will be recalculated without your contribution.
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={handleCancel}
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                className={`btn-primary ${pendingConsent ? '' : 'btn-danger'}`}
                onClick={handleConfirm}
                disabled={isUpdating}
              >
                {isUpdating ? 'Updating...' : pendingConsent ? 'Enable Sharing' : 'Disable Sharing'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .opt-in-consent {
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          margin-bottom: 24px;
        }

        .consent-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          gap: 16px;
        }

        .consent-header h2 {
          margin: 0 0 4px 0;
          font-size: 1.5rem;
          font-weight: 600;
          color: #1f2937;
        }

        .consent-subtitle {
          margin: 0;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .consent-status-badge .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .badge-active {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #86efac;
        }

        .badge-inactive {
          background: #f3f4f6;
          color: #6b7280;
          border: 1px solid #d1d5db;
        }

        .consent-explanation {
          margin-bottom: 24px;
        }

        .explanation-intro {
          font-size: 0.9375rem;
          line-height: 1.6;
          color: #374151;
          margin: 0 0 20px 0;
        }

        .privacy-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }

        .privacy-section {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 0 12px 0;
          font-size: 1rem;
          font-weight: 600;
        }

        .section-title.shared {
          color: #166534;
        }

        .section-title.not-shared {
          color: #991b1b;
        }

        .privacy-list {
          margin: 0;
          padding-left: 20px;
          list-style: none;
        }

        .privacy-list li {
          font-size: 0.875rem;
          line-height: 1.6;
          color: #374151;
          margin-bottom: 8px;
          position: relative;
        }

        .privacy-list li::before {
          content: "•";
          position: absolute;
          left: -16px;
          color: #6b7280;
        }

        .technical-details {
          background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%);
          border: 1px solid #93c5fd;
          border-radius: 8px;
          padding: 20px;
        }

        .technical-details h4 {
          margin: 0 0 16px 0;
          font-size: 1rem;
          font-weight: 600;
          color: #1e40af;
        }

        .safeguards-grid {
          display: grid;
          gap: 12px;
        }

        .safeguard-card {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: white;
          padding: 12px;
          border-radius: 6px;
        }

        .safeguard-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .safeguard-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 2px;
        }

        .safeguard-desc {
          font-size: 0.8125rem;
          color: #6b7280;
          line-height: 1.4;
        }

        .consent-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          background: #f9fafb;
          border-radius: 8px;
          gap: 16px;
        }

        .toggle-section {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .toggle-label {
          font-size: 0.9375rem;
          font-weight: 500;
          color: #1f2937;
        }

        .toggle-switch {
          position: relative;
          width: 56px;
          height: 32px;
          background: #d1d5db;
          border: none;
          border-radius: 16px;
          cursor: pointer;
          transition: background 0.3s;
          flex-shrink: 0;
        }

        .toggle-switch:hover:not(:disabled) {
          background: #9ca3af;
        }

        .toggle-switch.active {
          background: #3b82f6;
        }

        .toggle-switch.active:hover:not(:disabled) {
          background: #2563eb;
        }

        .toggle-switch:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .toggle-slider {
          position: absolute;
          top: 4px;
          left: 4px;
          width: 24px;
          height: 24px;
          background: white;
          border-radius: 50%;
          transition: transform 0.3s;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .toggle-switch.active .toggle-slider {
          transform: translateX(24px);
        }

        .consent-metadata {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          font-size: 0.8125rem;
        }

        .metadata-label {
          color: #6b7280;
        }

        .metadata-value {
          font-weight: 500;
          color: #1f2937;
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

        .modal-close:hover:not(:disabled) {
          background: #f3f4f6;
        }

        .modal-body {
          padding: 24px;
        }

        .modal-body p {
          margin: 0 0 16px 0;
          line-height: 1.6;
          color: #374151;
        }

        .confirmation-checklist {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 16px;
        }

        .checklist-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.875rem;
          color: #166534;
        }

        .checklist-item span:first-child {
          font-weight: 700;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid #e5e7eb;
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

        .btn-danger {
          background: #ef4444;
        }

        .btn-danger:hover:not(:disabled) {
          background: #dc2626;
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

        @media (max-width: 768px) {
          .opt-in-consent {
            padding: 16px;
          }

          .consent-header {
            flex-direction: column;
          }

          .privacy-grid {
            grid-template-columns: 1fr;
          }

          .consent-controls {
            flex-direction: column;
            align-items: flex-start;
          }

          .consent-metadata {
            align-items: flex-start;
          }

          .modal {
            width: 95%;
          }
        }
      `}</style>
    </div>
  );
}
