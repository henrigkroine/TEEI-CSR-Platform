/**
 * Demo Empty State
 *
 * Displays when CSV file is missing, telling user where to place it.
 */

import { useDemoData } from '../../hooks/useDemoData';

export interface DemoEmptyStateProps {
  className?: string;
}

export default function DemoEmptyState({ className = '' }: DemoEmptyStateProps) {
  const { csvPath, retry } = useDemoData();

  const defaultPath = csvPath || 'data/demo-metrics.csv';

  return (
    <div className={`demo-empty-state ${className}`} role="alert">
      <div className="demo-empty-content">
        <svg
          viewBox="0 0 24 24"
          width="48"
          height="48"
          aria-hidden="true"
          className="demo-empty-icon"
        >
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
            fill="currentColor"
          />
        </svg>
        <h3 className="demo-empty-title">Demo CSV File Not Found</h3>
        <p className="demo-empty-message">
          To enable demo mode, please place a CSV file at:
        </p>
        <code className="demo-empty-path">{defaultPath}</code>
        <p className="demo-empty-hint">
          The CSV should include columns: programme, participants, sessions, active_mentors, matches, completion, satisfaction
        </p>
        <button onClick={retry} className="demo-empty-retry">
          Retry
        </button>
      </div>
      <style>{`
        .demo-empty-state {
          padding: 48px 24px;
          text-align: center;
          background: #f9fafb;
          border: 2px dashed #d1d5db;
          border-radius: 8px;
        }

        .demo-empty-content {
          max-width: 500px;
          margin: 0 auto;
        }

        .demo-empty-icon {
          color: #6b7280;
          margin-bottom: 16px;
        }

        .demo-empty-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
          margin-bottom: 8px;
        }

        .demo-empty-message {
          font-size: 0.875rem;
          color: #4b5563;
          margin-bottom: 12px;
        }

        .demo-empty-path {
          display: block;
          padding: 8px 12px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 0.8125rem;
          color: #1f2937;
          margin: 12px 0;
          word-break: break-all;
        }

        .demo-empty-hint {
          font-size: 0.8125rem;
          color: #6b7280;
          margin: 16px 0;
        }

        .demo-empty-retry {
          margin-top: 16px;
          padding: 8px 16px;
          background: #0066cc;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .demo-empty-retry:hover {
          background: #0052a3;
        }

        .demo-empty-retry:active {
          background: #003d7a;
        }
      `}</style>
    </div>
  );
}
