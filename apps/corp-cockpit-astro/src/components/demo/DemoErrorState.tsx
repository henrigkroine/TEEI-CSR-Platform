/**
 * Demo Error State
 *
 * Displays human-readable error message with retry action.
 */

import { useDemoData } from '../../hooks/useDemoData';

export interface DemoErrorStateProps {
  className?: string;
}

export default function DemoErrorState({ className = '' }: DemoErrorStateProps) {
  const { error, retry } = useDemoData();

  if (!error) {
    return null;
  }

  return (
    <div className={`demo-error-state ${className}`} role="alert">
      <div className="demo-error-content">
        <svg
          viewBox="0 0 24 24"
          width="48"
          height="48"
          aria-hidden="true"
          className="demo-error-icon"
        >
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
            fill="currentColor"
          />
        </svg>
        <h3 className="demo-error-title">Error Loading Demo Data</h3>
        <p className="demo-error-message">{error}</p>
        <button onClick={retry} className="demo-error-retry">
          Retry
        </button>
      </div>
      <style>{`
        .demo-error-state {
          padding: 48px 24px;
          text-align: center;
          background: #fef2f2;
          border: 2px solid #fecaca;
          border-radius: 8px;
        }

        .demo-error-content {
          max-width: 500px;
          margin: 0 auto;
        }

        .demo-error-icon {
          color: #ef4444;
          margin-bottom: 16px;
        }

        .demo-error-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #991b1b;
          margin-bottom: 8px;
        }

        .demo-error-message {
          font-size: 0.875rem;
          color: #7f1d1d;
          margin-bottom: 16px;
        }

        .demo-error-retry {
          padding: 8px 16px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .demo-error-retry:hover {
          background: #dc2626;
        }

        .demo-error-retry:active {
          background: #b91c1c;
        }
      `}</style>
    </div>
  );
}
