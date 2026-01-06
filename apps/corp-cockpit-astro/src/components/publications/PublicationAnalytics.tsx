import React, { useState, useEffect } from 'react';
import type { Publication, PublicationStats } from '@teei/shared-types';

interface PublicationAnalyticsProps {
  publication: Publication;
  onBack: () => void;
}

export function PublicationAnalytics({ publication, onBack }: PublicationAnalyticsProps) {
  const [stats, setStats] = useState<PublicationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, [publication.id]);

  async function fetchStats() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/publications/${publication.id}/stats`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      setStats(data.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="publication-analytics">
      <div className="analytics-header">
        <h2>Analytics: {publication.title}</h2>
        <button onClick={onBack} className="btn btn-secondary">
          ← Back
        </button>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading analytics...</p>
        </div>
      )}

      {error && (
        <div className="error-state">
          <p>⚠️ {error}</p>
          <button onClick={fetchStats} className="btn btn-primary">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && stats && (
        <div className="analytics-grid">
          <div className="stat-card">
            <h3>Total Views</h3>
            <p className="stat-value">{stats.totalViews.toLocaleString()}</p>
          </div>

          <div className="stat-card">
            <h3>Unique Visitors</h3>
            <p className="stat-value">{stats.uniqueVisitors.toLocaleString()}</p>
          </div>

          <div className="stat-card">
            <h3>Last 7 Days</h3>
            <p className="stat-value">{stats.viewsLast7Days.toLocaleString()}</p>
          </div>

          <div className="stat-card">
            <h3>Last 30 Days</h3>
            <p className="stat-value">{stats.viewsLast30Days.toLocaleString()}</p>
          </div>

          {stats.topReferrers.length > 0 && (
            <div className="referrers-card">
              <h3>Top Referrers</h3>
              <table className="referrers-table">
                <thead>
                  <tr>
                    <th>Referrer</th>
                    <th>Views</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topReferrers.map((ref, index) => (
                    <tr key={index}>
                      <td>{ref.referrer || 'Direct'}</td>
                      <td>{ref.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
