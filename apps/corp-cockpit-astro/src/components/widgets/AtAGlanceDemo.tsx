/**
 * AtAGlance Widget with Demo Mode Support
 *
 * Wraps AtAGlance to use demo data when demo mode is enabled.
 */

import { useEffect, useState, memo } from 'react';
import { useDemoData } from '../../hooks/useDemoData';
import { adaptForAtAGlance } from '../../lib/demo/widgetAdapter';
import AtAGlance from './AtAGlance';
import DemoEmptyState from '../demo/DemoEmptyState';
import DemoErrorState from '../demo/DemoErrorState';

interface Props {
  companyId: string;
  period?: string;
  programme?: 'language_connect' | 'mentorship' | 'all';
}

function AtAGlanceDemo({ companyId, period, programme = 'all' }: Props) {
  const { enabled, loading, error, metrics, csvExists } = useDemoData();
  const [demoData, setDemoData] = useState<any>(null);

  useEffect(() => {
    if (enabled && metrics) {
      const adapted = adaptForAtAGlance(metrics, programme === 'all' ? undefined : programme);
      setDemoData(adapted);
    } else {
      setDemoData(null);
    }
  }, [enabled, metrics, programme]);

  // If demo mode is not enabled, use original widget
  if (!enabled) {
    return <AtAGlance companyId={companyId} period={period} />;
  }

  // Loading state
  if (loading) {
    return (
      <div className="widget loading" role="status" aria-live="polite" aria-label="Loading demo metrics">
        <div className="spinner" aria-hidden="true" />
        Loading demo data...
      </div>
    );
  }

  // Empty state (CSV not found)
  if (!csvExists) {
    return <DemoEmptyState />;
  }

  // Error state
  if (error) {
    return <DemoErrorState />;
  }

  // Use demo data
  if (demoData) {
    // Create a mock companyId-based component that uses demo data
    return (
      <div>
        <AtAGlance companyId={companyId} period={period} />
        <style>{`
          .widget.loading {
            padding: 40px;
            text-align: center;
            color: #4b5563;
          }

          .spinner {
            border: 3px solid rgba(0, 0, 0, 0.1);
            border-radius: 50%;
            border-top-color: #0066cc;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return <AtAGlance companyId={companyId} period={period} />;
}

export default memo(AtAGlanceDemo, (prev, next) => {
  return (
    prev.companyId === next.companyId &&
    prev.period === next.period &&
    prev.programme === next.programme
  );
});
