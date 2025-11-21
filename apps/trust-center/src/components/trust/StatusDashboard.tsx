/**
 * Status Dashboard Component
 *
 * Real-time system status dashboard with:
 * - Live service status updates via SSE
 * - Historical uptime graphs
 * - Performance metrics
 * - Service status badges
 *
 * Ref: AGENTS.md § Trust Boardroom Implementation / Status API Engineer
 */

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'outage';
  latency?: number;
}

interface StatusData {
  status: 'operational' | 'degraded' | 'outage';
  timestamp: string;
  services: ServiceStatus[];
  metrics: {
    p95Latency: number;
    p99Latency: number;
    errorRate: number;
    requestsPerMinute: number;
  };
  performance: {
    lcp: number | null;
    fid: number | null;
    cls: number | null;
  };
  uptime: {
    percentage: number;
    lastIncident: string | null;
  };
}

interface HistoricalDataPoint {
  timestamp: number;
  uptime: number;
}

const STATUS_COLORS = {
  operational: 'bg-green-500',
  degraded: 'bg-yellow-500',
  outage: 'bg-red-500',
};

const STATUS_TEXT_COLORS = {
  operational: 'text-green-800 dark:text-green-300',
  degraded: 'text-yellow-800 dark:text-yellow-300',
  outage: 'text-red-800 dark:text-red-300',
};

const STATUS_BG_COLORS = {
  operational: 'bg-green-100 dark:bg-green-900/30',
  degraded: 'bg-yellow-100 dark:bg-yellow-900/30',
  outage: 'bg-red-100 dark:bg-red-900/30',
};

const STATUS_BORDER_COLORS = {
  operational: 'border-green-200 dark:border-green-800',
  degraded: 'border-yellow-200 dark:border-yellow-800',
  outage: 'border-red-200 dark:border-red-800',
};

const STATUS_LABELS = {
  operational: 'All Systems Operational',
  degraded: 'Partial Service Disruption',
  outage: 'Service Outage',
};

export function StatusDashboard() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [historyDays, setHistoryDays] = useState(7);

  // Fetch current status
  const fetchStatus = async () => {
    try {
      const response = await fetch('/status.json');
      if (!response.ok) {
        throw new Error('Failed to fetch status');
      }
      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load status');
    } finally {
      setLoading(false);
    }
  };

  // Fetch historical data
  const fetchHistory = async (days: number) => {
    try {
      const response = await fetch(`/status/history?days=${days}`);
      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }
      const data = await response.json();
      setHistoricalData(data);
    } catch (err) {
      console.error('Failed to load historical data:', err);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchStatus();
    fetchHistory(historyDays);
  }, []);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStatus();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Refresh history when days change
  useEffect(() => {
    fetchHistory(historyDays);
  }, [historyDays]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 border border-red-200 dark:border-red-800">
        <p className="text-red-800 dark:text-red-300">
          {error || 'Failed to load status data'}
        </p>
      </div>
    );
  }

  const overallStatus = status.status;
  const lastUpdated = new Date(status.timestamp).toLocaleString('en-GB', {
    timeZone: 'UTC',
    timeZoneName: 'short',
  });

  // Format historical data for chart
  const chartData = historicalData.map((point) => ({
    time: new Date(point.timestamp).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
    uptime: point.uptime,
  }));

  return (
    <div className="space-y-8">
      {/* Overall Status Banner */}
      <div
        className={`${STATUS_BG_COLORS[overallStatus]} rounded-lg p-6 border ${STATUS_BORDER_COLORS[overallStatus]}`}
      >
        <div className="flex items-center gap-3 mb-2">
          <span
            className={`w-3 h-3 ${STATUS_COLORS[overallStatus]} rounded-full`}
            aria-hidden="true"
          ></span>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {STATUS_LABELS[overallStatus]}
          </h2>
        </div>
        <p className="text-gray-700 dark:text-gray-300">
          Last updated: {lastUpdated}
        </p>
      </div>

      {/* Performance Metrics */}
      <section aria-labelledby="metrics-heading">
        <h2 id="metrics-heading" className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
          Performance Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card">
            <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">p95 Latency</dt>
            <dd className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {status.metrics.p95Latency.toFixed(2)}ms
            </dd>
          </div>
          <div className="card">
            <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">p99 Latency</dt>
            <dd className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {status.metrics.p99Latency.toFixed(2)}ms
            </dd>
          </div>
          <div className="card">
            <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Error Rate</dt>
            <dd className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {status.metrics.errorRate.toFixed(2)}%
            </dd>
          </div>
          <div className="card">
            <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Requests/min</dt>
            <dd className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {status.metrics.requestsPerMinute.toLocaleString()}
            </dd>
          </div>
        </div>
      </section>

      {/* Service Status Grid */}
      <section aria-labelledby="services-heading">
        <h2 id="services-heading" className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
          Service Status
        </h2>
        <div className="space-y-4">
          {status.services.map((service) => (
            <div key={service.name} className="card">
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {service.name}
                  </h3>
                  {service.latency !== undefined && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Response time: {service.latency}ms
                    </p>
                  )}
                </div>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    STATUS_BG_COLORS[service.status]
                  } ${STATUS_TEXT_COLORS[service.status]}`}
                >
                  {service.status === 'operational' ? 'Operational' : service.status === 'degraded' ? 'Degraded' : 'Outage'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Uptime Statistics */}
      <section aria-labelledby="uptime-heading">
        <h2 id="uptime-heading" className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
          Uptime Statistics
        </h2>
        <div className="card mb-4">
          <dl className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Current (30 days)</dt>
              <dd className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                {status.uptime.percentage.toFixed(2)}%
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Target SLO</dt>
              <dd className="text-3xl font-bold text-gray-900 dark:text-white mt-1">99.9%</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Incident</dt>
              <dd className="text-lg font-medium text-gray-900 dark:text-white mt-1">
                {status.uptime.lastIncident || 'None'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Historical Graph */}
        {chartData.length > 0 && (
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Historical Uptime
              </h3>
              <select
                value={historyDays}
                onChange={(e) => setHistoryDays(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-600" />
                <XAxis
                  dataKey="time"
                  className="text-gray-900 dark:text-white"
                />
                <YAxis
                  domain={[99, 100]}
                  className="text-gray-900 dark:text-white"
                  label={{ value: 'Uptime %', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  formatter={(value: number) => [`${value.toFixed(3)}%`, 'Uptime']}
                />
                <Line
                  type="monotone"
                  dataKey="uptime"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Web Vitals (if available) */}
      {(status.performance.lcp || status.performance.fid || status.performance.cls) && (
        <section aria-labelledby="vitals-heading">
          <h2 id="vitals-heading" className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Web Vitals (p75)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {status.performance.lcp && (
              <div className="card">
                <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Largest Contentful Paint
                </dt>
                <dd className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {status.performance.lcp.toFixed(0)}ms
                </dd>
              </div>
            )}
            {status.performance.fid && (
              <div className="card">
                <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  First Input Delay
                </dt>
                <dd className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {status.performance.fid.toFixed(0)}ms
                </dd>
              </div>
            )}
            {status.performance.cls && (
              <div className="card">
                <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Cumulative Layout Shift
                </dt>
                <dd className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {status.performance.cls.toFixed(3)}
                </dd>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
