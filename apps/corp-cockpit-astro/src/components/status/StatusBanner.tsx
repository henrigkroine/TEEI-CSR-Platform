/**
 * Status Banner Component
 *
 * Top banner showing overall system status with slide-down animation.
 * Auto-refreshes every 30 seconds to pull latest status from Worker 1/2.
 *
 * @module components/status/StatusBanner
 */

import React, { useState, useEffect } from 'react';

export type SystemStatus = 'operational' | 'degraded' | 'partial_outage' | 'major_outage';

interface StatusBannerData {
  systemStatus: SystemStatus;
  affectedServices: string[];
  incidentCount: number;
  message?: string;
  lastUpdate: string;
}

interface StatusBannerProps {
  onViewIncidents?: () => void;
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
}

export default function StatusBanner({
  onViewIncidents,
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds
}: StatusBannerProps) {
  const [status, setStatus] = useState<StatusBannerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    fetchStatus();

    if (autoRefresh) {
      const interval = setInterval(fetchStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  async function fetchStatus() {
    try {
      // TODO: Replace with actual Worker 1/2 API endpoint
      // const response = await fetch('/api/status/system');
      // const data = await response.json();

      const mockData = getMockStatusData();
      setStatus(mockData);
      setVisible(true);
    } catch (error) {
      console.error('Failed to fetch system status:', error);
      // Show degraded status on fetch failure
      setStatus({
        systemStatus: 'degraded',
        affectedServices: ['Status Service'],
        incidentCount: 0,
        message: 'Unable to fetch system status',
        lastUpdate: new Date().toISOString(),
      });
      setVisible(true);
    } finally {
      setLoading(false);
    }
  }

  // Don't show banner if operational
  if (!loading && status?.systemStatus === 'operational') {
    return null;
  }

  if (loading || !status) {
    return null;
  }

  const statusConfig = getStatusConfig(status.systemStatus);

  return (
    <div
      className={`status-banner ${visible ? 'visible' : ''} status-${status.systemStatus}`}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="banner-content">
        <div className="status-indicator">
          <span className="status-icon" aria-hidden="true">
            {statusConfig.icon}
          </span>
          <div className="status-text">
            <h3 className="status-title">{statusConfig.title}</h3>
            <p className="status-message">
              {status.message || statusConfig.defaultMessage}
              {status.affectedServices.length > 0 && (
                <span className="affected-services">
                  {' '}
                  Affected: {status.affectedServices.join(', ')}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="banner-actions">
          {status.incidentCount > 0 && (
            <div className="incident-count">
              <span className="count-badge">{status.incidentCount}</span>
              <span className="count-label">
                {status.incidentCount === 1 ? 'Active Incident' : 'Active Incidents'}
              </span>
            </div>
          )}

          {onViewIncidents && (
            <button
              className="view-details-btn"
              onClick={onViewIncidents}
              aria-label="View incident details"
            >
              View Details
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .status-banner {
          width: 100%;
          padding: 16px 24px;
          border-bottom: 2px solid;
          transition: all 0.3s ease-in-out;
          transform: translateY(-100%);
          opacity: 0;
        }

        .status-banner.visible {
          transform: translateY(0);
          opacity: 1;
          animation: slideDown 0.5s ease-out;
        }

        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .status-banner.status-operational {
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
          border-color: #22c55e;
        }

        .status-banner.status-degraded {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border-color: #f59e0b;
        }

        .status-banner.status-partial_outage {
          background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
          border-color: #f97316;
        }

        .status-banner.status-major_outage {
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          border-color: #ef4444;
        }

        .banner-content {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 16px;
          flex: 1;
        }

        .status-icon {
          font-size: 2rem;
          line-height: 1;
          flex-shrink: 0;
        }

        .status-text {
          flex: 1;
        }

        .status-title {
          margin: 0 0 4px 0;
          font-size: 1.125rem;
          font-weight: 700;
        }

        .status-banner.status-operational .status-title {
          color: #065f46;
        }

        .status-banner.status-degraded .status-title {
          color: #92400e;
        }

        .status-banner.status-partial_outage .status-title {
          color: #9a3412;
        }

        .status-banner.status-major_outage .status-title {
          color: #991b1b;
        }

        .status-message {
          margin: 0;
          font-size: 0.9375rem;
          line-height: 1.5;
        }

        .status-banner.status-operational .status-message {
          color: #047857;
        }

        .status-banner.status-degraded .status-message {
          color: #78350f;
        }

        .status-banner.status-partial_outage .status-message {
          color: #7c2d12;
        }

        .status-banner.status-major_outage .status-message {
          color: #7f1d1d;
        }

        .affected-services {
          font-weight: 600;
        }

        .banner-actions {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-shrink: 0;
        }

        .incident-count {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .count-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 32px;
          height: 32px;
          padding: 0 10px;
          background: rgba(0, 0, 0, 0.1);
          border-radius: 16px;
          font-size: 0.875rem;
          font-weight: 700;
        }

        .status-banner.status-degraded .count-badge {
          background: #92400e;
          color: #fef3c7;
        }

        .status-banner.status-partial_outage .count-badge {
          background: #9a3412;
          color: #fed7aa;
        }

        .status-banner.status-major_outage .count-badge {
          background: #991b1b;
          color: #fee2e2;
        }

        .count-label {
          font-size: 0.875rem;
          font-weight: 600;
        }

        .view-details-btn {
          padding: 10px 20px;
          background: white;
          border: 2px solid;
          border-radius: 8px;
          font-size: 0.9375rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .status-banner.status-degraded .view-details-btn {
          border-color: #92400e;
          color: #92400e;
        }

        .status-banner.status-partial_outage .view-details-btn {
          border-color: #9a3412;
          color: #9a3412;
        }

        .status-banner.status-major_outage .view-details-btn {
          border-color: #991b1b;
          color: #991b1b;
        }

        .view-details-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }

        .view-details-btn:active {
          transform: translateY(0);
        }

        .view-details-btn:focus {
          outline: 2px solid;
          outline-offset: 2px;
        }

        @media (max-width: 768px) {
          .status-banner {
            padding: 16px;
          }

          .banner-content {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }

          .status-indicator {
            width: 100%;
          }

          .banner-actions {
            width: 100%;
            flex-direction: column;
            align-items: stretch;
          }

          .incident-count {
            justify-content: center;
          }

          .view-details-btn {
            width: 100%;
            text-align: center;
          }

          .status-icon {
            font-size: 1.5rem;
          }

          .status-title {
            font-size: 1rem;
          }

          .status-message {
            font-size: 0.875rem;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Status configuration helper
 */
function getStatusConfig(status: SystemStatus) {
  switch (status) {
    case 'operational':
      return {
        icon: '✓',
        title: 'All Systems Operational',
        defaultMessage: 'All platform services are functioning normally.',
      };
    case 'degraded':
      return {
        icon: '⚠',
        title: 'Degraded Performance',
        defaultMessage: 'Some services are experiencing reduced performance.',
      };
    case 'partial_outage':
      return {
        icon: '⚠',
        title: 'Partial Service Outage',
        defaultMessage: 'Some services are currently unavailable.',
      };
    case 'major_outage':
      return {
        icon: '✕',
        title: 'Major Service Outage',
        defaultMessage: 'Critical services are currently unavailable. Our team is working to resolve the issue.',
      };
  }
}

/**
 * Mock data function (replace with real API calls to Worker-1)
 */
function getMockStatusData(): StatusBannerData {
  // Mock: Return operational status most of the time
  // In production, this would fetch from /api/status/system

  // Simulate occasional degraded state (10% chance)
  const isDegraded = Math.random() < 0.1;

  if (isDegraded) {
    return {
      systemStatus: 'degraded',
      affectedServices: ['Reporting API', 'Export Service'],
      incidentCount: 1,
      message: 'Experiencing elevated API latency.',
      lastUpdate: new Date().toISOString(),
    };
  }

  return {
    systemStatus: 'operational',
    affectedServices: [],
    incidentCount: 0,
    lastUpdate: new Date().toISOString(),
  };
}
