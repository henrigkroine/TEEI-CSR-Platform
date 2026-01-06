import React from 'react';

interface ErrorDisplayProps {
  error: string;
  onDismiss: () => void;
}

export function ErrorDisplay({ error, onDismiss }: ErrorDisplayProps) {
  return (
    <div className="error-display">
      <div className="error-icon">⚠️</div>
      <div className="error-content">
        <strong>Error:</strong> {error}
      </div>
      <button onClick={onDismiss} className="dismiss-btn">×</button>

      <style>{`
        .error-display {
          background: #fef2f2;
          border: 1px solid #ef4444;
          border-radius: 0.375rem;
          padding: 1rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .error-icon {
          font-size: 1.5rem;
        }

        .error-content {
          flex: 1;
          color: #991b1b;
        }

        .error-content strong {
          font-weight: 600;
        }

        .dismiss-btn {
          background: transparent;
          border: none;
          font-size: 1.5rem;
          color: #991b1b;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .dismiss-btn:hover {
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
}
