/**
 * Status Display Component
 *
 * Displays overall platform status and individual service component health.
 * Auto-refreshes every 60 seconds to keep status current.
 *
 * @module components/status/StatusDisplay
 */

import React, { useState, useEffect } from 'react';

export type ServiceStatus = 'operational' | 'degraded' | 'outage';

interface ServiceComponent {
  id: string;
  name: string;
  status: ServiceStatus;
  description: string;
  lastChecked: string;
}

interface PlatformStatus {
  overall: ServiceStatus;
  components: ServiceComponent[];
  lastUpdate: string;
}

export default function StatusDisplay() {
  const [status, setStatus] = useState<PlatformStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    fetchStatus();

    // Auto-refresh every 60 seconds
    const interval = setInterval(() => {
      fetchStatus();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  async function fetchStatus() {
    try {
      // TODO: Fetch from Worker-1 status API
      // For now, use mock data
      const mockStatus = getMockPlatformStatus();
      setStatus(mockStatus);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to fetch platform status:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="status-display loading">
        <div className="loading-spinner"></div>
        <p>Loading platform status...</p>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="status-display error">
        <p>Unable to load platform status. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="status-display">
      {/* Overall Status Banner */}
      <div className={`status-banner status-${status.overall}`}>
        <div className="status-icon">{getStatusIcon(status.overall)}</div>
        <div className="status-content">
          <h2 className="status-title">{getStatusTitle(status.overall)}</h2>
          <p className="status-description">{getStatusDescription(status.overall)}</p>
        </div>
        <div className="status-meta">
          <div className="last-update">
            Last updated: {formatTimestamp(lastRefresh)}
          </div>
          <button onClick={fetchStatus} className="refresh-btn" title="Refresh status">
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Component Status Grid */}
      <div className="components-section">
        <h3>Service Components</h3>
        <div className="components-grid">
          {status.components.map((component) => (
            <ComponentCard key={component.id} component={component} />
          ))}
        </div>
      </div>

      <style jsx>{`
        .status-display {
          width: 100%;
        }

        .loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 64px 24px;
          gap: 16px;
        }

        .loading-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #e5e7eb;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .error {
          padding: 32px;
          text-align: center;
          color: #dc2626;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
        }

        .status-banner {
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 32px;
          border-radius: 12px;
          margin-bottom: 32px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .status-banner.status-operational {
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
          border: 2px solid #10b981;
        }

        .status-banner.status-degraded {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border: 2px solid #f59e0b;
        }

        .status-banner.status-outage {
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          border: 2px solid #ef4444;
        }

        .status-icon {
          font-size: 4rem;
          line-height: 1;
          flex-shrink: 0;
        }

        .status-content {
          flex: 1;
        }

        .status-title {
          margin: 0 0 8px 0;
          font-size: 1.875rem;
          font-weight: 700;
        }

        .status-banner.status-operational .status-title {
          color: #065f46;
        }

        .status-banner.status-degraded .status-title {
          color: #92400e;
        }

        .status-banner.status-outage .status-title {
          color: #991b1b;
        }

        .status-description {
          margin: 0;
          font-size: 1.125rem;
          opacity: 0.9;
        }

        .status-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 12px;
        }

        .last-update {
          font-size: 0.875rem;
          opacity: 0.8;
          font-weight: 500;
        }

        .refresh-btn {
          padding: 8px 16px;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          transition: all 0.2s;
        }

        .refresh-btn:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .refresh-btn:active {
          transform: scale(0.95);
        }

        .components-section h3 {
          font-size: 1.5rem;
          margin: 0 0 24px 0;
          color: #111827;
        }

        .components-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 16px;
        }

        @media (max-width: 768px) {
          .status-banner {
            flex-direction: column;
            text-align: center;
            padding: 24px;
          }

          .status-meta {
            align-items: center;
            width: 100%;
          }

          .components-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Component Status Card
 */
function ComponentCard({ component }: { component: ServiceComponent }) {
  return (
    <div className={`component-card status-${component.status}`}>
      <div className="component-header">
        <div className="component-status-indicator">
          <span className="status-dot"></span>
          <span className="status-label">{getStatusLabel(component.status)}</span>
        </div>
        <div className="component-icon">{getComponentIcon(component.id)}</div>
      </div>
      <h4 className="component-name">{component.name}</h4>
      <p className="component-description">{component.description}</p>
      <div className="component-meta">
        Last checked: {formatTimestamp(new Date(component.lastChecked))}
      </div>

      <style jsx>{`
        .component-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          transition: all 0.2s;
        }

        .component-card:hover {
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        .component-card.status-operational {
          border-left: 4px solid #10b981;
        }

        .component-card.status-degraded {
          border-left: 4px solid #f59e0b;
        }

        .component-card.status-outage {
          border-left: 4px solid #ef4444;
        }

        .component-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .component-status-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .component-card.status-operational .status-dot {
          background: #10b981;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
        }

        .component-card.status-degraded .status-dot {
          background: #f59e0b;
          box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
        }

        .component-card.status-outage .status-dot {
          background: #ef4444;
          box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
        }

        .status-label {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .component-card.status-operational .status-label {
          color: #065f46;
        }

        .component-card.status-degraded .status-label {
          color: #92400e;
        }

        .component-card.status-outage .status-label {
          color: #991b1b;
        }

        .component-icon {
          font-size: 1.5rem;
        }

        .component-name {
          margin: 0 0 8px 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
        }

        .component-description {
          margin: 0 0 12px 0;
          font-size: 0.875rem;
          color: #6b7280;
          line-height: 1.5;
        }

        .component-meta {
          font-size: 0.75rem;
          color: #9ca3af;
          padding-top: 12px;
          border-top: 1px solid #f3f4f6;
        }
      `}</style>
    </div>
  );
}

/**
 * Helper functions
 */
function getStatusIcon(status: ServiceStatus): string {
  switch (status) {
    case 'operational':
      return '✓';
    case 'degraded':
      return '⚠';
    case 'outage':
      return '✕';
  }
}

function getStatusTitle(status: ServiceStatus): string {
  switch (status) {
    case 'operational':
      return 'All Systems Operational';
    case 'degraded':
      return 'Partial System Outage';
    case 'outage':
      return 'Major System Outage';
  }
}

function getStatusDescription(status: ServiceStatus): string {
  switch (status) {
    case 'operational':
      return 'All platform services are functioning normally.';
    case 'degraded':
      return 'Some services are experiencing reduced performance.';
    case 'outage':
      return 'Critical services are currently unavailable. Our team is working to resolve the issue.';
  }
}

function getStatusLabel(status: ServiceStatus): string {
  switch (status) {
    case 'operational':
      return 'Operational';
    case 'degraded':
      return 'Degraded';
    case 'outage':
      return 'Outage';
  }
}

function getComponentIcon(componentId: string): string {
  const icons: Record<string, string> = {
    'api-gateway': '🌐',
    'database': '💾',
    'cache': '⚡',
    'auth': '🔐',
    'storage': '📦',
    'analytics': '📊',
    'reports': '📄',
    'notifications': '🔔',
  };
  return icons[componentId] || '🔧';
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Mock data function (replace with real API calls to Worker-1)
 */
function getMockPlatformStatus(): PlatformStatus {
  const components: ServiceComponent[] = [
    {
      id: 'api-gateway',
      name: 'API Gateway',
      status: 'operational',
      description: 'REST and GraphQL APIs',
      lastChecked: new Date(Date.now() - 120000).toISOString(),
    },
    {
      id: 'database',
      name: 'Database',
      status: 'operational',
      description: 'PostgreSQL primary and replicas',
      lastChecked: new Date(Date.now() - 60000).toISOString(),
    },
    {
      id: 'cache',
      name: 'Cache Layer',
      status: 'operational',
      description: 'Redis distributed cache',
      lastChecked: new Date(Date.now() - 90000).toISOString(),
    },
    {
      id: 'auth',
      name: 'Authentication',
      status: 'operational',
      description: 'SSO, SAML, and OIDC services',
      lastChecked: new Date(Date.now() - 45000).toISOString(),
    },
    {
      id: 'storage',
      name: 'Object Storage',
      status: 'operational',
      description: 'S3-compatible blob storage',
      lastChecked: new Date(Date.now() - 180000).toISOString(),
    },
    {
      id: 'analytics',
      name: 'Analytics Engine',
      status: 'operational',
      description: 'Data warehouse and BI queries',
      lastChecked: new Date(Date.now() - 75000).toISOString(),
    },
    {
      id: 'reports',
      name: 'Report Generation',
      status: 'operational',
      description: 'PDF/PPTX export service',
      lastChecked: new Date(Date.now() - 150000).toISOString(),
    },
    {
      id: 'notifications',
      name: 'Notifications',
      status: 'operational',
      description: 'Email and webhook delivery',
      lastChecked: new Date(Date.now() - 30000).toISOString(),
    },
  ];

  // Determine overall status
  const hasOutage = components.some((c) => c.status === 'outage');
  const hasDegraded = components.some((c) => c.status === 'degraded');

  const overall: ServiceStatus = hasOutage ? 'outage' : hasDegraded ? 'degraded' : 'operational';

  return {
    overall,
    components,
    lastUpdate: new Date().toISOString(),
  };
}
