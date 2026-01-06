/**
 * Dashboard Diagnostics Component
 *
 * Shows helpful information about missing dashboard views
 */

import { useState } from 'react';

interface Props {
  companyId: string;
}

export default function DashboardDiagnostics({ companyId }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <div className="dashboard-diagnostics">
      <button
        className="diagnostics-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        type="button"
      >
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path
            d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM7 4a1 1 0 1 1 2 0v4a1 1 0 1 1-2 0V4zm1 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"
            fill="currentColor"
          />
        </svg>
        {isExpanded ? 'Hide' : 'Show'} Dashboard Help
      </button>

      {isExpanded && (
        <div className="diagnostics-panel">
          <h3>Why are some dashboard views missing?</h3>
          <p className="diagnostics-note">
            Dashboard components fetch data from backend services. If views are missing or showing errors,
            the required services may not be running.
          </p>

          <div className="services-info">
            <h4>Required Services:</h4>
            <ul>
              <li>
                <strong>Reporting Service</strong> (port 3001) - KPI metrics, SROI, VIS scores
              </li>
              <li>
                <strong>Campaigns Service</strong> (port 3002) - Actionable items, campaign pipeline
              </li>
              <li>
                <strong>Q2Q AI Service</strong> (port 3005) - AI insights
              </li>
              <li>
                <strong>Analytics Service</strong> (port 3007) - Programme tiles, analytics
              </li>
            </ul>
          </div>

          <div className="diagnostics-help">
            <h4>Solutions:</h4>
            <ol>
              <li>
                <strong>Start the services:</strong> Run <code>pnpm dev</code> or start individual services
              </li>
              <li>
                <strong>Enable demo mode:</strong> Set <code>DEMO_MODE_ENABLED=true</code> in your environment
              </li>
              <li>
                <strong>Check browser console:</strong> Look for API errors (F12 → Console tab)
              </li>
            </ol>
          </div>

          <div className="diagnostics-actions">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => window.location.reload()}
              type="button"
            >
              Refresh Dashboard
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                const consoleBtn = document.createElement('button');
                consoleBtn.textContent = 'Open DevTools (F12)';
                alert('Press F12 to open browser DevTools and check the Console tab for errors');
              }}
              type="button"
            >
              Check Console
            </button>
          </div>
        </div>
      )}

      <style>{`
        .dashboard-diagnostics {
          margin-bottom: var(--space-4);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          background: var(--color-surface);
          padding: var(--space-3);
        }

        .diagnostics-toggle {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-3);
          background: var(--color-warning-light);
          border: 1px solid var(--color-warning);
          border-radius: var(--radius-md);
          color: var(--color-warning);
          font-size: var(--text-sm);
          font-weight: var(--font-weight-semibold);
          cursor: pointer;
          transition: all var(--duration-fast) var(--ease-out);
          width: 100%;
          text-align: left;
        }

        .diagnostics-toggle:hover {
          background: var(--color-warning);
          color: white;
        }

        .diagnostics-panel {
          margin-top: var(--space-4);
          padding: var(--space-4);
          background: var(--color-surface-alt);
          border-radius: var(--radius-md);
        }

        .diagnostics-panel h3 {
          margin: 0 0 var(--space-3);
          font-size: var(--text-lg);
          font-weight: var(--font-weight-semibold);
          color: var(--color-text-primary);
        }

        .diagnostics-panel h4 {
          margin: var(--space-4) 0 var(--space-2);
          font-size: var(--text-base);
          font-weight: var(--font-weight-semibold);
          color: var(--color-text-primary);
        }

        .diagnostics-note {
          margin: 0 0 var(--space-4);
          padding: var(--space-3);
          background: var(--color-warning-light);
          border-left: 3px solid var(--color-warning);
          border-radius: var(--radius-sm);
          color: var(--color-text-secondary);
          font-size: var(--text-sm);
          line-height: 1.6;
        }

        .services-info {
          margin: var(--space-4) 0;
        }

        .services-info ul {
          margin: var(--space-2) 0;
          padding-left: var(--space-5);
        }

        .services-info li {
          margin: var(--space-2) 0;
          color: var(--color-text-secondary);
          font-size: var(--text-sm);
          line-height: 1.6;
        }

        .diagnostics-help {
          margin: var(--space-4) 0;
          padding: var(--space-3);
          background: var(--color-muted);
          border-radius: var(--radius-sm);
        }

        .diagnostics-help ol {
          margin: var(--space-2) 0;
          padding-left: var(--space-5);
        }

        .diagnostics-help li {
          margin: var(--space-2) 0;
          color: var(--color-text-secondary);
          font-size: var(--text-sm);
          line-height: 1.6;
        }

        .diagnostics-help code {
          padding: 2px 6px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: var(--text-xs);
          color: var(--color-text-primary);
        }

        .diagnostics-actions {
          display: flex;
          gap: var(--space-2);
          margin-top: var(--space-4);
          flex-wrap: wrap;
        }

        .btn {
          padding: var(--space-2) var(--space-3);
          border-radius: var(--radius-md);
          font-size: var(--text-sm);
          font-weight: var(--font-weight-medium);
          cursor: pointer;
          transition: all var(--duration-fast) var(--ease-out);
          border: 1px solid var(--color-border);
        }

        .btn-secondary {
          background: var(--color-surface);
          color: var(--color-text-primary);
        }

        .btn-secondary:hover {
          background: var(--color-muted);
          border-color: var(--color-border-strong);
        }

        .btn-sm {
          padding: var(--space-1) var(--space-2);
          font-size: var(--text-xs);
        }
      `}</style>
    </div>
  );
}
