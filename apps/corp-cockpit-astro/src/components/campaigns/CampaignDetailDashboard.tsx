/**
 * Campaign Detail Dashboard
 *
 * SWARM 6: Agent 6.2 - campaign-detail-dashboard
 *
 * Comprehensive campaign performance dashboard with 6 sections:
 * 1. Campaign Header (name, status, dates, quick actions)
 * 2. Key Metrics (4 cards: participants, hours, SROI, VIS)
 * 3. Capacity Gauges (3 gauges: volunteers, beneficiaries, budget)
 * 4. Time-Series Chart (metrics over time with granularity toggle)
 * 5. Financials & Pricing (budget tracking, burn rate)
 * 6. Top Volunteers & Evidence (leaderboards)
 *
 * Data fetching via @tanstack/react-query with 6 API endpoints.
 * Performance: <300ms (cached), <2s (cold)
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import MetricCard from '@components/shared/MetricCard';
import CapacityGauge from './CapacityGauge';
import TimeSeriesChart from './TimeSeriesChart';
import LoadingSpinner from '@components/LoadingSpinner';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface CampaignDashboardData {
  campaignId: string;
  campaignName: string;
  status: 'active' | 'paused' | 'completed' | 'draft';
  snapshotDate: string;
  capacity: {
    volunteers: {
      current: number;
      target: number;
      utilization: number;
      status: 'low' | 'healthy' | 'warning' | 'critical';
    };
    beneficiaries: {
      current: number;
      target: number;
      utilization: number;
      status: 'low' | 'healthy' | 'warning' | 'critical';
    };
    budget: {
      spent: number;
      allocated: number;
      utilization: number;
      currency: string;
      status: 'low' | 'healthy' | 'warning' | 'critical';
    };
  };
  impact: {
    sroi: number | null;
    vis: number | null;
    hoursLogged: number;
    sessionsCompleted: number;
    impactScore: number | null;
  };
}

interface TimeSeriesData {
  campaignId: string;
  period: { start: string; end: string };
  dataPoints: Array<{
    date: string;
    sroi: number | null;
    vis: number | null;
    hours: number;
    sessions: number;
    volunteersUtilization: number;
    beneficiariesUtilization: number;
    budgetUtilization: number;
  }>;
}

interface FinancialsData {
  campaignId: string;
  budget: {
    allocated: number;
    spent: number;
    remaining: number;
    utilization: number;
    currency: string;
  };
  burnRate: {
    current: number;
    projected: number;
    status: 'on_track' | 'over_budget' | 'under_budget';
  };
  forecast: {
    daysUntilDepletion: number | null;
    projectedEndDate: string | null;
  };
}

interface VolunteersData {
  campaignId: string;
  topVolunteers: Array<{
    id: string;
    name: string;
    visScore: number;
    hoursLogged: number;
  }>;
  totalVolunteers: number;
  averageVIS: number;
  averageHours: number;
}

interface ImpactData {
  campaignId: string;
  sroi: {
    score: number | null;
    trend: 'up' | 'down' | 'stable' | null;
    changePercent: number | null;
  };
  vis: {
    average: number | null;
    trend: 'up' | 'down' | 'stable' | null;
    changePercent: number | null;
  };
  outcomes: {
    integration: number | null;
    language: number | null;
    jobReadiness: number | null;
    wellbeing: number | null;
  };
  engagement: {
    totalHours: number;
    totalSessions: number;
    volunteerRetentionRate: number | null;
    beneficiaryDropoutRate: number | null;
  };
  topEvidence: Array<{
    id: string;
    text: string;
    impactScore: number;
  }>;
}

export interface CampaignDetailDashboardProps {
  campaignId: string;
  companyId: string;
}

// ============================================================================
// API CLIENT
// ============================================================================

const API_BASE = import.meta.env.PUBLIC_REPORTING_API_URL || 'http://localhost:3001/api';

async function fetchDashboard(campaignId: string): Promise<CampaignDashboardData> {
  const response = await fetch(`${API_BASE}/campaigns/${campaignId}/dashboard`);
  if (!response.ok) throw new Error('Failed to fetch dashboard data');
  return response.json();
}

async function fetchTimeSeries(
  campaignId: string,
  period: '7d' | '30d' | '90d' | 'all'
): Promise<TimeSeriesData> {
  const response = await fetch(`${API_BASE}/campaigns/${campaignId}/time-series?period=${period}`);
  if (!response.ok) throw new Error('Failed to fetch time-series data');
  return response.json();
}

async function fetchFinancials(campaignId: string): Promise<FinancialsData> {
  const response = await fetch(`${API_BASE}/campaigns/${campaignId}/financials`);
  if (!response.ok) throw new Error('Failed to fetch financials data');
  return response.json();
}

async function fetchVolunteers(campaignId: string): Promise<VolunteersData> {
  const response = await fetch(`${API_BASE}/campaigns/${campaignId}/volunteers`);
  if (!response.ok) throw new Error('Failed to fetch volunteers data');
  return response.json();
}

async function fetchImpact(campaignId: string): Promise<ImpactData> {
  const response = await fetch(`${API_BASE}/campaigns/${campaignId}/impact`);
  if (!response.ok) throw new Error('Failed to fetch impact data');
  return response.json();
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStatusBadgeColor(status: string): string {
  switch (status) {
    case 'active':
      return '#10b981'; // green-500
    case 'paused':
      return '#f59e0b'; // amber-500
    case 'completed':
      return '#6b7280'; // gray-500
    case 'draft':
      return '#3b82f6'; // blue-500
    default:
      return '#6b7280';
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getTrendIcon(trend: string | null): string {
  switch (trend) {
    case 'up':
      return '↑';
    case 'down':
      return '↓';
    case 'stable':
      return '→';
    default:
      return '';
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CampaignDetailDashboard({
  campaignId,
  companyId,
}: CampaignDetailDashboardProps) {
  const [granularity, setGranularity] = useState<'week' | 'month' | 'quarter'>('month');
  const [timeSeriesPeriod, setTimeSeriesPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  // Fetch all data using React Query
  const dashboardQuery = useQuery({
    queryKey: ['campaign-dashboard', campaignId],
    queryFn: () => fetchDashboard(campaignId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const timeSeriesQuery = useQuery({
    queryKey: ['campaign-time-series', campaignId, timeSeriesPeriod],
    queryFn: () => fetchTimeSeries(campaignId, timeSeriesPeriod),
    staleTime: 5 * 60 * 1000,
  });

  const financialsQuery = useQuery({
    queryKey: ['campaign-financials', campaignId],
    queryFn: () => fetchFinancials(campaignId),
    staleTime: 5 * 60 * 1000,
  });

  const volunteersQuery = useQuery({
    queryKey: ['campaign-volunteers', campaignId],
    queryFn: () => fetchVolunteers(campaignId),
    staleTime: 5 * 60 * 1000,
  });

  const impactQuery = useQuery({
    queryKey: ['campaign-impact', campaignId],
    queryFn: () => fetchImpact(campaignId),
    staleTime: 5 * 60 * 1000,
  });

  // Loading state
  if (dashboardQuery.isLoading) {
    return (
      <div className="dashboard-loading">
        <LoadingSpinner />
        <p>Loading campaign dashboard...</p>
      </div>
    );
  }

  // Error state
  if (dashboardQuery.isError) {
    return (
      <div className="dashboard-error">
        <h2>Error Loading Dashboard</h2>
        <p>
          {dashboardQuery.error instanceof Error
            ? dashboardQuery.error.message
            : 'Unknown error occurred'}
        </p>
        <button onClick={() => dashboardQuery.refetch()} className="btn-primary">
          Retry
        </button>
      </div>
    );
  }

  const dashboard = dashboardQuery.data;
  const timeSeries = timeSeriesQuery.data;
  const financials = financialsQuery.data;
  const volunteers = volunteersQuery.data;
  const impact = impactQuery.data;

  if (!dashboard) return null;

  return (
    <div className="campaign-dashboard">
      {/* SECTION 1: Campaign Header */}
      <header className="campaign-header">
        <div className="header-content">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <a href={`/${companyId}/campaigns`}>Campaigns</a>
            <span aria-hidden="true"> / </span>
            <span aria-current="page">{dashboard.campaignName}</span>
          </nav>
          <h1>{dashboard.campaignName}</h1>
          <div className="header-meta">
            <span
              className="status-badge"
              style={{ backgroundColor: getStatusBadgeColor(dashboard.status) }}
            >
              {dashboard.status.charAt(0).toUpperCase() + dashboard.status.slice(1)}
            </span>
            <span className="last-updated">Last updated: {formatDate(dashboard.snapshotDate)}</span>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" disabled={dashboard.status === 'completed'}>
            {dashboard.status === 'active' ? 'Pause Campaign' : 'Resume Campaign'}
          </button>
          <button className="btn-secondary">Edit Settings</button>
          <a
            href={`/${companyId}/evidence?campaignId=${campaignId}`}
            className="btn-primary"
          >
            View Evidence
          </a>
        </div>
      </header>

      {/* SECTION 2: Key Metrics (4 cards) */}
      <section className="key-metrics" aria-labelledby="key-metrics-heading">
        <h2 id="key-metrics-heading" className="section-heading">
          Key Metrics
        </h2>
        <div className="metrics-grid">
          <MetricCard
            metricId={`campaign-${campaignId}-participants`}
            label="Total Participants"
            value={`${dashboard.capacity.volunteers.current + dashboard.capacity.beneficiaries.current}`}
            change={`Target: ${dashboard.capacity.volunteers.target + dashboard.capacity.beneficiaries.target}`}
            showLineage={false}
          />
          <MetricCard
            metricId={`campaign-${campaignId}-hours`}
            label="Total Hours Volunteered"
            value={dashboard.impact.hoursLogged.toLocaleString()}
            showLineage={false}
          />
          <MetricCard
            metricId={`campaign-${campaignId}-sroi`}
            label="Campaign SROI"
            value={dashboard.impact.sroi ? `${dashboard.impact.sroi.toFixed(2)}:1` : 'N/A'}
            change={
              impact?.sroi.trend
                ? `${getTrendIcon(impact.sroi.trend)} ${Math.abs(impact.sroi.changePercent || 0).toFixed(1)}%`
                : undefined
            }
            changePositive={impact?.sroi.trend === 'up'}
            showLineage={true}
          />
          <MetricCard
            metricId={`campaign-${campaignId}-vis`}
            label="Average Volunteer VIS"
            value={dashboard.impact.vis ? dashboard.impact.vis.toFixed(1) : 'N/A'}
            change={
              impact?.vis.trend
                ? `${getTrendIcon(impact.vis.trend)} ${Math.abs(impact.vis.changePercent || 0).toFixed(1)}%`
                : undefined
            }
            changePositive={impact?.vis.trend === 'up'}
            showLineage={true}
          />
        </div>
      </section>

      {/* SECTION 3: Capacity Gauges */}
      <section className="capacity-section" aria-labelledby="capacity-heading">
        <h2 id="capacity-heading" className="section-heading">
          Capacity Utilization
        </h2>
        <div className="capacity-grid">
          <CapacityGauge
            label="Volunteers"
            current={dashboard.capacity.volunteers.current}
            target={dashboard.capacity.volunteers.target}
            utilization={dashboard.capacity.volunteers.utilization}
            status={dashboard.capacity.volunteers.status}
            unit="volunteers"
          />
          <CapacityGauge
            label="Beneficiaries"
            current={dashboard.capacity.beneficiaries.current}
            target={dashboard.capacity.beneficiaries.target}
            utilization={dashboard.capacity.beneficiaries.utilization}
            status={dashboard.capacity.beneficiaries.status}
            unit="beneficiaries"
          />
          <CapacityGauge
            label="Budget"
            current={dashboard.capacity.budget.spent}
            target={dashboard.capacity.budget.allocated}
            utilization={dashboard.capacity.budget.utilization}
            status={dashboard.capacity.budget.status}
            unit={dashboard.capacity.budget.currency}
          />
        </div>
        {dashboard.capacity.budget.utilization >= 0.8 && (
          <div className="capacity-alert">
            <span className="alert-icon">⚠️</span>
            <div>
              <strong>Capacity Alert:</strong> Campaign is at{' '}
              {(dashboard.capacity.budget.utilization * 100).toFixed(0)}% capacity.
              {dashboard.capacity.budget.utilization >= 0.95 &&
                ' Consider expanding capacity or pausing enrollment.'}
            </div>
          </div>
        )}
      </section>

      {/* SECTION 4: Time-Series Chart */}
      <section className="timeseries-section" aria-labelledby="timeseries-heading">
        <h2 id="timeseries-heading" className="sr-only">
          Metrics Over Time
        </h2>
        {timeSeriesQuery.isLoading ? (
          <div className="section-loading">
            <LoadingSpinner />
            <p>Loading time-series data...</p>
          </div>
        ) : timeSeriesQuery.isError ? (
          <div className="section-error">
            <p>Failed to load time-series data</p>
          </div>
        ) : timeSeries ? (
          <TimeSeriesChart
            dataPoints={timeSeries.dataPoints}
            granularity={granularity}
            onGranularityChange={setGranularity}
            height={400}
          />
        ) : null}
      </section>

      {/* SECTION 5: Financials & Pricing */}
      <section className="financials-section" aria-labelledby="financials-heading">
        <h2 id="financials-heading" className="section-heading">
          Budget & Financials
        </h2>
        {financialsQuery.isLoading ? (
          <div className="section-loading">
            <LoadingSpinner />
            <p>Loading financials...</p>
          </div>
        ) : financialsQuery.isError ? (
          <div className="section-error">
            <p>Failed to load financials</p>
          </div>
        ) : financials ? (
          <div className="financials-grid">
            <div className="financial-card">
              <h3>Budget Overview</h3>
              <div className="financial-metric">
                <span>Allocated:</span>
                <strong>
                  {financials.budget.allocated.toLocaleString()} {financials.budget.currency}
                </strong>
              </div>
              <div className="financial-metric">
                <span>Spent:</span>
                <strong>
                  {financials.budget.spent.toLocaleString()} {financials.budget.currency}
                </strong>
              </div>
              <div className="financial-metric">
                <span>Remaining:</span>
                <strong className={financials.budget.remaining < 0 ? 'text-error' : 'text-success'}>
                  {financials.budget.remaining.toLocaleString()} {financials.budget.currency}
                </strong>
              </div>
            </div>

            <div className="financial-card">
              <h3>Burn Rate</h3>
              <div className="financial-metric">
                <span>Current (daily):</span>
                <strong>
                  {financials.burnRate.current.toFixed(2)} {financials.budget.currency}/day
                </strong>
              </div>
              <div className="financial-metric">
                <span>Projected (daily):</span>
                <strong>
                  {financials.burnRate.projected.toFixed(2)} {financials.budget.currency}/day
                </strong>
              </div>
              <div className="financial-metric">
                <span>Status:</span>
                <span
                  className={`status-badge ${
                    financials.burnRate.status === 'over_budget'
                      ? 'badge-error'
                      : financials.burnRate.status === 'under_budget'
                        ? 'badge-warning'
                        : 'badge-success'
                  }`}
                >
                  {financials.burnRate.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>

            {financials.forecast.daysUntilDepletion && (
              <div className="financial-card">
                <h3>Forecast</h3>
                <div className="financial-metric">
                  <span>Days Until Depletion:</span>
                  <strong>{financials.forecast.daysUntilDepletion} days</strong>
                </div>
                {financials.forecast.projectedEndDate && (
                  <div className="financial-metric">
                    <span>Projected End Date:</span>
                    <strong>{formatDate(financials.forecast.projectedEndDate)}</strong>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </section>

      {/* SECTION 6: Top Volunteers & Evidence */}
      <section className="leaderboards-section" aria-labelledby="leaderboards-heading">
        <h2 id="leaderboards-heading" className="section-heading">
          Top Contributors & Impact Evidence
        </h2>
        <div className="leaderboards-grid">
          <div className="leaderboard-card">
            <h3>Top Volunteers</h3>
            {volunteersQuery.isLoading ? (
              <div className="section-loading">
                <LoadingSpinner />
              </div>
            ) : volunteersQuery.isError ? (
              <p className="section-error">Failed to load volunteers</p>
            ) : volunteers ? (
              <>
                {volunteers.topVolunteers.length > 0 ? (
                  <ul className="leaderboard-list">
                    {volunteers.topVolunteers.map((volunteer, index) => (
                      <li key={volunteer.id} className="leaderboard-item">
                        <span className="rank">#{index + 1}</span>
                        <div className="volunteer-info">
                          <strong>{volunteer.name}</strong>
                          <span className="volunteer-stats">
                            VIS: {volunteer.visScore.toFixed(1)} | {volunteer.hoursLogged}h logged
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty-state">No volunteer data available yet</p>
                )}
                <div className="leaderboard-summary">
                  <p>
                    Total: {volunteers.totalVolunteers} volunteers | Avg VIS:{' '}
                    {volunteers.averageVIS.toFixed(1)} | Avg Hours:{' '}
                    {volunteers.averageHours.toFixed(1)}h
                  </p>
                </div>
              </>
            ) : null}
          </div>

          <div className="leaderboard-card">
            <h3>Top Evidence</h3>
            {impactQuery.isLoading ? (
              <div className="section-loading">
                <LoadingSpinner />
              </div>
            ) : impactQuery.isError ? (
              <p className="section-error">Failed to load evidence</p>
            ) : impact ? (
              <>
                {impact.topEvidence.length > 0 ? (
                  <ul className="evidence-list">
                    {impact.topEvidence.map((evidence, index) => (
                      <li key={evidence.id} className="evidence-item">
                        <span className="rank">#{index + 1}</span>
                        <div className="evidence-content">
                          <p className="evidence-text">{evidence.text}</p>
                          <span className="evidence-score">
                            Impact Score: {evidence.impactScore.toFixed(1)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty-state">No evidence snippets available yet</p>
                )}
                <a
                  href={`/${companyId}/evidence?campaignId=${campaignId}`}
                  className="view-all-link"
                >
                  View All Evidence →
                </a>
              </>
            ) : null}
          </div>
        </div>
      </section>

      <style jsx>{`
        .campaign-dashboard {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
        }

        /* Campaign Header */
        .campaign-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 2px solid #e5e7eb;
          flex-wrap: wrap;
          gap: 1.5rem;
        }

        .header-content {
          flex: 1;
          min-width: 300px;
        }

        .breadcrumb {
          font-size: 0.875rem;
          color: #6b7280;
          margin-bottom: 0.5rem;
        }

        .breadcrumb a {
          color: #3b82f6;
          text-decoration: none;
        }

        .breadcrumb a:hover {
          text-decoration: underline;
        }

        .campaign-header h1 {
          font-size: 2rem;
          font-weight: 700;
          color: #111827;
          margin: 0 0 0.75rem 0;
        }

        .header-meta {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .status-badge {
          font-size: 0.75rem;
          font-weight: 600;
          color: white;
          padding: 0.375rem 0.75rem;
          border-radius: 9999px;
          text-transform: uppercase;
        }

        .last-updated {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .btn-primary,
        .btn-secondary {
          padding: 0.625rem 1.25rem;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
          display: inline-block;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover {
          background: #2563eb;
        }

        .btn-secondary {
          background: white;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #f9fafb;
        }

        .btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Sections */
        .section-heading {
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
          margin-bottom: 1.25rem;
        }

        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border-width: 0;
        }

        /* Key Metrics */
        .key-metrics {
          margin-bottom: 2.5rem;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.25rem;
        }

        /* Capacity Section */
        .capacity-section {
          margin-bottom: 2.5rem;
        }

        .capacity-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-bottom: 1rem;
        }

        .capacity-alert {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem;
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 8px;
          margin-top: 1rem;
        }

        .alert-icon {
          font-size: 1.25rem;
          line-height: 1;
        }

        /* Time Series */
        .timeseries-section {
          margin-bottom: 2.5rem;
        }

        /* Financials */
        .financials-section {
          margin-bottom: 2.5rem;
        }

        .financials-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .financial-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 1.5rem;
        }

        .financial-card h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
          margin: 0 0 1rem 0;
        }

        .financial-metric {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 0;
          border-bottom: 1px solid #f3f4f6;
        }

        .financial-metric:last-child {
          border-bottom: none;
        }

        .financial-metric span {
          color: #6b7280;
          font-size: 0.875rem;
        }

        .financial-metric strong {
          color: #111827;
          font-weight: 600;
        }

        .text-error {
          color: #dc2626 !important;
        }

        .text-success {
          color: #10b981 !important;
        }

        .badge-error {
          background: #dc2626 !important;
        }

        .badge-warning {
          background: #f59e0b !important;
        }

        .badge-success {
          background: #10b981 !important;
        }

        /* Leaderboards */
        .leaderboards-section {
          margin-bottom: 2.5rem;
        }

        .leaderboards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 1.5rem;
        }

        .leaderboard-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 1.5rem;
        }

        .leaderboard-card h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
          margin: 0 0 1rem 0;
        }

        .leaderboard-list,
        .evidence-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .leaderboard-item,
        .evidence-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.75rem 0;
          border-bottom: 1px solid #f3f4f6;
        }

        .leaderboard-item:last-child,
        .evidence-item:last-child {
          border-bottom: none;
        }

        .rank {
          font-weight: 700;
          color: #9ca3af;
          min-width: 2rem;
        }

        .volunteer-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .volunteer-info strong {
          color: #111827;
          font-size: 0.9375rem;
        }

        .volunteer-stats {
          font-size: 0.8125rem;
          color: #6b7280;
        }

        .evidence-content {
          flex: 1;
        }

        .evidence-text {
          font-size: 0.875rem;
          color: #374151;
          margin: 0 0 0.5rem 0;
          line-height: 1.5;
        }

        .evidence-score {
          font-size: 0.75rem;
          color: #6b7280;
          font-weight: 600;
        }

        .leaderboard-summary {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .view-all-link {
          display: inline-block;
          margin-top: 1rem;
          color: #3b82f6;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .view-all-link:hover {
          text-decoration: underline;
        }

        .empty-state {
          text-align: center;
          color: #9ca3af;
          font-size: 0.875rem;
          padding: 2rem 1rem;
        }

        /* Loading & Error States */
        .dashboard-loading,
        .section-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1rem;
          gap: 1rem;
        }

        .dashboard-error,
        .section-error {
          background: #fef2f2;
          border: 1px solid #ef4444;
          border-radius: 8px;
          padding: 1.5rem;
          text-align: center;
        }

        .dashboard-error h2 {
          color: #dc2626;
          margin: 0 0 0.5rem 0;
        }

        .dashboard-error p,
        .section-error p {
          color: #991b1b;
          margin: 0 0 1rem 0;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .campaign-dashboard {
            padding: 1rem;
          }

          .campaign-header {
            flex-direction: column;
          }

          .campaign-header h1 {
            font-size: 1.5rem;
          }

          .header-actions {
            width: 100%;
          }

          .header-actions button,
          .header-actions a {
            flex: 1;
            text-align: center;
          }

          .metrics-grid,
          .capacity-grid,
          .financials-grid,
          .leaderboards-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
