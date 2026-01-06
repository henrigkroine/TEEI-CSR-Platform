/**
 * Demo Mode Banner
 *
 * Displays demo mode indicator with data source info and last updated timestamp.
 */

import { useEffect, useState } from 'react';
import { useDemoData } from '../../hooks/useDemoData';

export interface DemoModeBannerProps {
  className?: string;
}

export default function DemoModeBanner({ className = '' }: DemoModeBannerProps) {
  const { enabled, metrics, lastUpdated, csvPath } = useDemoData();
  const [timeAgo, setTimeAgo] = useState<string>('');

  useEffect(() => {
    if (!lastUpdated) return;

    const updateTimeAgo = () => {
      const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
      if (seconds < 60) {
        setTimeAgo('just now');
      } else if (seconds < 3600) {
        setTimeAgo(`${Math.floor(seconds / 60)}m ago`);
      } else if (seconds < 86400) {
        setTimeAgo(`${Math.floor(seconds / 3600)}h ago`);
      } else {
        setTimeAgo(`${Math.floor(seconds / 86400)}d ago`);
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [lastUpdated]);

  if (!enabled) {
    return null;
  }

  return (
    <div className={`demo-mode-banner ${className}`} role="status" aria-live="polite">
      <div className="demo-mode-content">
        <span className="demo-mode-label">
          <svg
            viewBox="0 0 16 16"
            width="16"
            height="16"
            aria-hidden="true"
            className="demo-mode-icon"
          >
            <path
              d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM7 4h2v2H7V4zm0 4h2v4H7V8z"
              fill="currentColor"
            />
          </svg>
          Data source: Demo CSV
        </span>
        {lastUpdated && (
          <span className="demo-mode-timestamp" title={lastUpdated.toLocaleString()}>
            Last updated: {timeAgo}
          </span>
        )}
      </div>
      <div className="demo-mode-tooltip" title={`CSV location: ${csvPath}`}>
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path
            d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM7 4h2v2H7V4zm0 4h2v4H7V8z"
            fill="currentColor"
          />
        </svg>
      </div>
      <style>{`
        .demo-mode-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border: 1px solid #f59e0b;
          border-radius: 6px;
          font-size: 0.875rem;
          color: #92400e;
          margin-bottom: 16px;
        }

        .demo-mode-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .demo-mode-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
        }

        .demo-mode-icon {
          flex-shrink: 0;
        }

        .demo-mode-timestamp {
          font-size: 0.8125rem;
          opacity: 0.8;
        }

        .demo-mode-tooltip {
          cursor: help;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .demo-mode-tooltip:hover {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}
