/**
 * SCIM Sync Test Button Component
 *
 * Triggers a manual SCIM sync test and displays results in a modal.
 * Calls Worker 1 /identity/scim/test endpoint.
 *
 * @module components/identity/SyncTestButton
 */

import React, { useState } from 'react';
import { testSCIMSync, getErrorMessage } from '@/api/identity';

interface SyncTestButtonProps {
  companyId: string;
}

interface SyncTestResult {
  status: 'success' | 'error';
  timestamp: string;
  usersFound: number;
  groupsFound: number;
  latency: number;
  errors: string[];
  message?: string;
}

export default function SyncTestButton({ companyId }: SyncTestButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [testResult, setTestResult] = useState<SyncTestResult | null>(null);

  async function runSyncTest() {
    setIsLoading(true);

    try {
      // Call Worker 1 API: POST /v1/identity/scim-config/{companyId}/test-sync
      // The API client will use mock data as fallback if USE_REAL_IDENTITY_API is false
      const result = await testSCIMSync(companyId);

      setTestResult({
        status: 'success',
        timestamp: new Date().toISOString(),
        usersFound: result.usersFound,
        groupsFound: result.groupsFound,
        latency: result.latency,
        errors: result.errors,
        message: result.success ? undefined : 'Some validation errors occurred',
      });
      setShowResults(true);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      console.error('Sync test failed:', err);

      setTestResult({
        status: 'error',
        timestamp: new Date().toISOString(),
        usersFound: 0,
        groupsFound: 0,
        latency: 0,
        errors: [errorMessage],
        message: 'Failed to connect to SCIM endpoint',
      });
      setShowResults(true);

      // In development mode, show a helpful message
      if (import.meta.env.DEV) {
        console.warn(
          '[SCIM Sync Test] API call failed. Using mock data. ' +
          'Set USE_REAL_IDENTITY_API=true in .env to use real API.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  }

  function closeModal() {
    setShowResults(false);
  }

  return (
    <>
      <button
        onClick={runSyncTest}
        disabled={isLoading}
        className="test-sync-btn"
        aria-label="Test SCIM synchronization"
      >
        {isLoading ? (
          <>
            <span className="spinner" aria-hidden="true"></span>
            Testing Sync...
          </>
        ) : (
          <>
            <span className="icon" aria-hidden="true">🔄</span>
            Test Sync
          </>
        )}
      </button>

      {/* Results Modal */}
      {showResults && testResult && (
        <div className="modal-overlay" onClick={closeModal} role="dialog" aria-modal="true">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>SCIM Sync Test Results</h3>
              <button
                className="close-btn"
                onClick={closeModal}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              {/* Overall Status */}
              <div className={`status-banner ${testResult.status}`}>
                <div className="status-icon">
                  {testResult.status === 'success' ? '✓' : '✗'}
                </div>
                <div>
                  <h4>
                    {testResult.status === 'success'
                      ? 'Connection Successful'
                      : 'Connection Failed'}
                  </h4>
                  <p className="timestamp">
                    {new Date(testResult.timestamp).toLocaleString()}
                  </p>
                </div>
                {testResult.status === 'success' && (
                  <div className="response-time">
                    {testResult.latency}ms
                  </div>
                )}
              </div>

              {testResult.message && (
                <div className="message-box">
                  <p>{testResult.message}</p>
                </div>
              )}

              {testResult.status === 'success' && (
                <>
                  {/* Summary Stats */}
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-label">Users Found</div>
                      <div className="stat-value">{testResult.usersFound}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Groups Found</div>
                      <div className="stat-value">{testResult.groupsFound}</div>
                    </div>
                  </div>

                  {/* Sync Errors */}
                  {testResult.errors.length > 0 && (
                    <div className="validation-errors">
                      <h4>Sync Errors ({testResult.errors.length})</h4>
                      <ul>
                        {testResult.errors.map((err, idx) => (
                          <li key={idx}>
                            <span className="error-message">{err}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeModal}>
                Close
              </button>
              {testResult.status === 'success' && (
                <button className="btn-primary" onClick={closeModal}>
                  Looks Good
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .test-sync-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .test-sync-btn:hover:not(:disabled) {
          background: #2563eb;
          transform: translateY(-1px);
          box-shadow: 0 4px 6px rgba(59, 130, 246, 0.2);
        }

        .test-sync-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .icon {
          font-size: 1.125rem;
        }

        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
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

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal {
          background: white;
          border-radius: 8px;
          max-width: 600px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 1.25rem;
          color: #111827;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 2rem;
          line-height: 1;
          cursor: pointer;
          color: #9ca3af;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background: #f3f4f6;
          color: #111827;
        }

        .modal-body {
          padding: 24px;
        }

        .status-banner {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 24px;
        }

        .status-banner.success {
          background: #d1fae5;
          border: 2px solid #10b981;
        }

        .status-banner.error {
          background: #fee2e2;
          border: 2px solid #ef4444;
        }

        .status-icon {
          font-size: 3rem;
          line-height: 1;
        }

        .status-banner.success .status-icon {
          color: #065f46;
        }

        .status-banner.error .status-icon {
          color: #991b1b;
        }

        .status-banner h4 {
          margin: 0 0 4px;
          font-size: 1.125rem;
        }

        .status-banner.success h4 {
          color: #065f46;
        }

        .status-banner.error h4 {
          color: #991b1b;
        }

        .timestamp {
          margin: 0;
          font-size: 0.875rem;
          opacity: 0.8;
        }

        .response-time {
          margin-left: auto;
          font-size: 1.5rem;
          font-weight: 700;
          color: #065f46;
        }

        .message-box {
          background: #fef3c7;
          border: 1px solid #fcd34d;
          padding: 16px;
          border-radius: 6px;
          margin-bottom: 24px;
        }

        .message-box p {
          margin: 0;
          color: #92400e;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: #f9fafb;
          padding: 16px;
          border-radius: 6px;
          text-align: center;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #6b7280;
          margin-bottom: 8px;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.05em;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: #3b82f6;
        }

        .validation-errors {
          background: #fef2f2;
          border: 1px solid #fca5a5;
          padding: 16px;
          border-radius: 6px;
          margin-top: 24px;
        }

        .validation-errors h4 {
          margin: 0 0 12px;
          font-size: 0.9375rem;
          color: #991b1b;
        }

        .validation-errors ul {
          list-style: disc;
          padding-left: 24px;
          margin: 0;
        }

        .validation-errors li {
          padding: 6px 0;
          color: #991b1b;
        }

        .error-message {
          font-size: 0.9375rem;
          color: #7f1d1d;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 20px 24px;
          border-top: 1px solid #e5e7eb;
        }

        .btn-secondary,
        .btn-primary {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
        }

        .btn-secondary:hover {
          background: #e5e7eb;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover {
          background: #2563eb;
        }

        @media (max-width: 640px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
