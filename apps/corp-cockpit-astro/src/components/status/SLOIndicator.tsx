/**
 * SLO Indicator Component
 *
 * Displays SLO metrics for key services using circular progress rings.
 * Shows uptime percentage, latency metrics, and success rates with
 * red/yellow/green thresholds.
 *
 * @module components/status/SLOIndicator
 */

import React, { useState, useEffect } from 'react';

interface ServiceSLO {
  serviceName: string;
  uptime?: number; // Percentage (e.g., 99.95)
  latencyP99?: number; // Milliseconds
  latencyP95?: number; // Milliseconds
  successRate?: number; // Percentage (e.g., 99.8)
  target: number; // Target percentage or latency
  metricType: 'uptime' | 'latency' | 'success_rate';
}

interface SLOData {
  services: ServiceSLO[];
  period: string; // e.g., "Last 30 days"
  lastUpdate: string;
}

interface SLOIndicatorProps {
  compact?: boolean;
}

export default function SLOIndicator({ compact = false }: SLOIndicatorProps) {
  const [sloData, setSloData] = useState<SLOData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSLOData();

    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchSLOData, 60000);
    return () => clearInterval(interval);
  }, []);

  async function fetchSLOData() {
    try {
      // TODO: Replace with actual Worker 1/2 API endpoint
      // const response = await fetch('/api/status/slo');
      // const data = await response.json();

      const mockData = getMockSLOData();
      setSloData(mockData);
    } catch (error) {
      console.error('Failed to fetch SLO data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="slo-indicator loading">
        <div className="spinner"></div>
        <p>Loading SLO metrics...</p>
        <style jsx>{`
          .slo-indicator.loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px;
            gap: 16px;
          }

          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #e5e7eb;
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  if (!sloData) {
    return (
      <div className="slo-indicator error">
        <p>Unable to load SLO metrics.</p>
        <style jsx>{`
          .slo-indicator.error {
            padding: 32px;
            text-align: center;
            color: #dc2626;
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="slo-indicator">
      {!compact && (
        <div className="header">
          <h3>Service Level Objectives</h3>
          <p className="period">Rolling window: {sloData.period}</p>
        </div>
      )}

      <div className={`slo-grid ${compact ? 'compact' : ''}`}>
        {sloData.services.map((service, index) => (
          <SLOCard key={index} service={service} compact={compact} />
        ))}
      </div>

      {!compact && (
        <div className="slo-footer">
          <p className="info-text">
            SLO metrics are calculated over a rolling {sloData.period.toLowerCase()} window.
            Thresholds: <span className="threshold green">Green ≥99%</span>,{' '}
            <span className="threshold yellow">Yellow 95-99%</span>,{' '}
            <span className="threshold red">Red &lt;95%</span>
          </p>
        </div>
      )}

      <style jsx>{`
        .slo-indicator {
          width: 100%;
        }

        .header {
          margin-bottom: 24px;
        }

        h3 {
          margin: 0 0 8px 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: #111827;
        }

        .period {
          margin: 0;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .slo-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }

        .slo-grid.compact {
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
        }

        .slo-footer {
          margin-top: 24px;
          padding: 16px;
          background: #f9fafb;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }

        .info-text {
          margin: 0;
          font-size: 0.8125rem;
          color: #6b7280;
          line-height: 1.6;
        }

        .threshold {
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .threshold.green {
          background: #d1fae5;
          color: #065f46;
        }

        .threshold.yellow {
          background: #fef3c7;
          color: #92400e;
        }

        .threshold.red {
          background: #fee2e2;
          color: #991b1b;
        }

        @media (max-width: 768px) {
          .slo-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .slo-grid.compact {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * SLO Card Component with Circular Progress
 */
function SLOCard({ service, compact }: { service: ServiceSLO; compact: boolean }) {
  const value = getServiceValue(service);
  const percentage = getPercentageForDisplay(service, value);
  const status = getSLOStatus(service, value);
  const statusColor = getStatusColor(status);

  // Calculate circle parameters
  const size = compact ? 100 : 140;
  const strokeWidth = compact ? 8 : 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="slo-card" title={`${service.serviceName}: ${formatValue(service, value)}`}>
      {/* Circular Progress */}
      <div className="progress-circle">
        <svg width={size} height={size}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={statusColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            className="progress-ring"
          />
        </svg>

        {/* Center value */}
        <div className="center-value">
          <div className={`value-text ${compact ? 'compact' : ''}`} style={{ color: statusColor }}>
            {formatDisplayValue(service, value)}
          </div>
          {!compact && (
            <div className="value-unit">{getUnitLabel(service.metricType)}</div>
          )}
        </div>
      </div>

      {/* Service name */}
      <div className={`service-name ${compact ? 'compact' : ''}`}>
        {service.serviceName}
      </div>

      {/* Target info */}
      {!compact && (
        <div className="target-info">
          Target: {formatTargetValue(service)}
        </div>
      )}

      <style jsx>{`
        .slo-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: ${compact ? '12px' : '20px'};
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .slo-card:hover {
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        .progress-circle {
          position: relative;
          margin-bottom: ${compact ? '8px' : '12px'};
        }

        .progress-ring {
          transition: stroke-dashoffset 0.5s ease;
        }

        .center-value {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }

        .value-text {
          font-size: ${compact ? '1.25rem' : '1.75rem'};
          font-weight: 700;
          line-height: 1;
        }

        .value-text.compact {
          font-size: 1rem;
        }

        .value-unit {
          font-size: 0.625rem;
          color: #9ca3af;
          margin-top: 4px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .service-name {
          font-size: ${compact ? '0.8125rem' : '0.9375rem'};
          font-weight: 600;
          color: #374151;
          text-align: center;
          line-height: 1.3;
        }

        .service-name.compact {
          font-size: 0.75rem;
        }

        .target-info {
          font-size: 0.75rem;
          color: #9ca3af;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}

/**
 * Helper functions
 */
function getServiceValue(service: ServiceSLO): number {
  if (service.uptime !== undefined) return service.uptime;
  if (service.latencyP99 !== undefined) return service.latencyP99;
  if (service.latencyP95 !== undefined) return service.latencyP95;
  if (service.successRate !== undefined) return service.successRate;
  return 0;
}

function getPercentageForDisplay(service: ServiceSLO, value: number): number {
  if (service.metricType === 'latency') {
    // For latency, invert the percentage (lower is better)
    // If target is 200ms and actual is 150ms, that's 75% (good)
    // If target is 200ms and actual is 300ms, that's 150% (bad, cap at 100%)
    const latencyPercentage = (service.target / value) * 100;
    return Math.min(latencyPercentage, 100);
  }
  // For uptime and success rate, use direct percentage
  return Math.min(value, 100);
}

function getSLOStatus(service: ServiceSLO, value: number): 'good' | 'warning' | 'critical' {
  if (service.metricType === 'latency') {
    // For latency, lower is better
    if (value <= service.target) return 'good';
    if (value <= service.target * 1.5) return 'warning';
    return 'critical';
  }

  // For uptime and success rate, higher is better
  if (value >= 99) return 'good';
  if (value >= 95) return 'warning';
  return 'critical';
}

function getStatusColor(status: 'good' | 'warning' | 'critical'): string {
  switch (status) {
    case 'good':
      return '#22c55e'; // Green
    case 'warning':
      return '#f59e0b'; // Yellow
    case 'critical':
      return '#ef4444'; // Red
  }
}

function formatValue(service: ServiceSLO, value: number): string {
  if (service.metricType === 'latency') {
    return `${Math.round(value)}ms`;
  }
  return `${value.toFixed(2)}%`;
}

function formatDisplayValue(service: ServiceSLO, value: number): string {
  if (service.metricType === 'latency') {
    return `${Math.round(value)}`;
  }
  return value.toFixed(1);
}

function formatTargetValue(service: ServiceSLO): string {
  if (service.metricType === 'latency') {
    return `≤${service.target}ms`;
  }
  return `≥${service.target}%`;
}

function getUnitLabel(metricType: ServiceSLO['metricType']): string {
  switch (metricType) {
    case 'uptime':
      return 'uptime';
    case 'latency':
      return 'ms';
    case 'success_rate':
      return 'success';
  }
}

/**
 * Mock data function (replace with real API calls)
 */
function getMockSLOData(): SLOData {
  return {
    services: [
      {
        serviceName: 'Ingestion Pipeline',
        uptime: 99.8,
        latencyP99: 120,
        target: 99.9,
        metricType: 'uptime',
      },
      {
        serviceName: 'Reporting API',
        uptime: 98.2,
        latencyP95: 450,
        target: 99.0,
        metricType: 'uptime',
      },
      {
        serviceName: 'SSE Stream',
        successRate: 99.5,
        target: 99.0,
        metricType: 'success_rate',
      },
      {
        serviceName: 'Export Service',
        successRate: 97.8,
        target: 98.0,
        metricType: 'success_rate',
      },
    ],
    period: 'Last 30 days',
    lastUpdate: new Date().toISOString(),
  };
}
