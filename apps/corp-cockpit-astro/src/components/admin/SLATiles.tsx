import React, { useState, useEffect } from 'react';

/**
 * SLA Metric
 */
interface SLAMetric {
  id: string;
  name: string;
  description: string;
  target: number; // target percentage (e.g., 99.9)
  current: number; // current percentage
  budget: number; // error budget remaining (minutes per month)
  burnRate: number; // current burn rate (multiplier)
  status: 'healthy' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  incidents: number;
  lastIncident?: Date;
}

/**
 * SLA Tiles Component
 */
export default function SLATiles({ companyId }: { companyId: string }) {
  const [metrics, setMetrics] = useState<SLAMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('month');

  useEffect(() => {
    loadSLAMetrics();
  }, [companyId, selectedPeriod]);

  async function loadSLAMetrics() {
    setLoading(true);
    try {
      // Mock data - would call API in production
      const mockMetrics: SLAMetric[] = [
        {
          id: 'uptime',
          name: 'API Uptime',
          description: 'Availability of API endpoints',
          target: 99.9,
          current: 99.95,
          budget: 43.2, // minutes remaining this month
          burnRate: 0.5,
          status: 'healthy',
          trend: 'up',
          incidents: 0,
        },
        {
          id: 'latency-p95',
          name: 'P95 Latency',
          description: '95th percentile response time < 200ms',
          target: 95.0,
          current: 97.2,
          budget: 180, // minutes remaining
          burnRate: 0.3,
          status: 'healthy',
          trend: 'stable',
          incidents: 1,
          lastIncident: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        },
        {
          id: 'error-rate',
          name: 'Error Rate',
          description: 'Error rate < 0.1%',
          target: 99.9,
          current: 99.85,
          budget: 21.6,
          burnRate: 1.2,
          status: 'warning',
          trend: 'down',
          incidents: 2,
          lastIncident: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
        {
          id: 'data-freshness',
          name: 'Data Freshness',
          description: 'Reports updated within 15 minutes',
          target: 99.5,
          current: 99.7,
          budget: 65.4,
          burnRate: 0.8,
          status: 'healthy',
          trend: 'up',
          incidents: 0,
        },
      ];

      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Failed to load SLA metrics:', error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status: SLAMetric['status']) {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
    }
  }

  function getStatusIcon(status: SLAMetric['status']) {
    switch (status) {
      case 'healthy':
        return '✓';
      case 'warning':
        return '⚠';
      case 'critical':
        return '✕';
    }
  }

  function getTrendIcon(trend: SLAMetric['trend']) {
    switch (trend) {
      case 'up':
        return '↗';
      case 'down':
        return '↘';
      case 'stable':
        return '→';
    }
  }

  function getBurnRateStatus(burnRate: number): { color: string; label: string } {
    if (burnRate < 1) return { color: 'text-green-600', label: 'Good' };
    if (burnRate < 2) return { color: 'text-yellow-600', label: 'Elevated' };
    return { color: 'text-red-600', label: 'Critical' };
  }

  if (loading) {
    return <div className="text-center py-8">Loading SLA metrics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">SLA Dashboard</h2>
          <p className="mt-1 text-sm text-gray-600">
            Monitor service level agreements and error budgets
          </p>
        </div>
        <div className="flex gap-2">
          {(['day', 'week', 'month'] as const).map(period => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-1 text-sm font-medium rounded-lg transition ${
                selectedPeriod === period
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total SLAs</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{metrics.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Healthy</div>
          <div className="text-2xl font-bold text-green-600 mt-1">
            {metrics.filter(m => m.status === 'healthy').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Warning</div>
          <div className="text-2xl font-bold text-yellow-600 mt-1">
            {metrics.filter(m => m.status === 'warning').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Incidents (30d)</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {metrics.reduce((sum, m) => sum + m.incidents, 0)}
          </div>
        </div>
      </div>

      {/* SLA Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {metrics.map(metric => (
          <div
            key={metric.id}
            className={`bg-white rounded-lg shadow border-2 ${getStatusColor(metric.status)} p-6`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">{metric.name}</h3>
                  <span className="text-xl">{getStatusIcon(metric.status)}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{metric.description}</p>
              </div>
              <span className={`text-2xl ${metric.trend === 'down' ? 'text-red-500' : metric.trend === 'up' ? 'text-green-500' : 'text-gray-400'}`}>
                {getTrendIcon(metric.trend)}
              </span>
            </div>

            {/* Current vs Target */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-xs text-gray-500 uppercase">Target</div>
                <div className="text-xl font-bold text-gray-900">{metric.target}%</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase">Current</div>
                <div className={`text-xl font-bold ${
                  metric.current >= metric.target ? 'text-green-600' : 'text-red-600'
                }`}>
                  {metric.current}%
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    metric.current >= metric.target ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(metric.current, 100)}%` }}
                />
              </div>
            </div>

            {/* Error Budget */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Error Budget</span>
                <span className="text-sm font-bold text-gray-900">
                  {metric.budget.toFixed(1)} min
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${
                    metric.budget > 30 ? 'bg-green-500' : metric.budget > 10 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, (metric.budget / 100) * 100))}%` }}
                />
              </div>
            </div>

            {/* Burn Rate */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-600">Burn Rate</span>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${getBurnRateStatus(metric.burnRate).color}`}>
                  {metric.burnRate.toFixed(1)}x
                </span>
                <span className="text-xs text-gray-500">
                  ({getBurnRateStatus(metric.burnRate).label})
                </span>
              </div>
            </div>

            {/* Incidents */}
            <div className="pt-3 border-t border-gray-200">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">
                  {metric.incidents} incident{metric.incidents !== 1 ? 's' : ''} (30d)
                </span>
                {metric.lastIncident && (
                  <span className="text-gray-500 text-xs">
                    Last: {metric.lastIncident.toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alert Policies */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Alert Policies</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div className="flex-1">
              <div className="font-medium text-gray-900">Critical: Burn Rate {'>'} 2x</div>
              <div className="text-sm text-gray-600">Alert immediately via PagerDuty</div>
            </div>
            <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded">
              Active
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div className="flex-1">
              <div className="font-medium text-gray-900">Warning: Budget {'<'} 20%</div>
              <div className="text-sm text-gray-600">Notify SRE team via Slack</div>
            </div>
            <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded">
              Active
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div className="flex-1">
              <div className="font-medium text-gray-900">Info: Weekly SLA Report</div>
              <div className="text-sm text-gray-600">Send summary every Monday</div>
            </div>
            <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded">
              Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
