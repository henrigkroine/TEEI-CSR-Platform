/**
 * Stuck Detector - Phase H3-C
 * Feed of users experiencing friction with Jira deep-links.
 */

import { useQuery } from '@tanstack/react-query';

interface StuckUser {
  id: string;
  userName: string;
  email: string;
  stuckAt: string;
  duration: number;
  lastAction: string;
  jiraTicket?: string;
  severity: 'low' | 'medium' | 'high';
}

interface StuckDetectorProps {
  companyId: string;
}

export default function StuckDetector({ companyId }: StuckDetectorProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['usage', 'stuck-users', companyId],
    queryFn: async () => {
      const response = await fetch(`/api/usage-analytics/${companyId}/stuck-users`);
      if (!response.ok) throw new Error('Failed to fetch stuck users');
      return response.json() as Promise<StuckUser[]>;
    },
  });

  const stuckUsers: StuckUser[] = data || [
    {
      id: '1',
      userName: 'John Doe',
      email: 'john@example.com',
      stuckAt: 'Report Builder - Data Selection',
      duration: 1800,
      lastAction: 'Clicked "Add Data Source"',
      jiraTicket: 'SUP-1234',
      severity: 'high',
    },
    {
      id: '2',
      userName: 'Jane Smith',
      email: 'jane@example.com',
      stuckAt: 'Boardroom Mode - Chart Loading',
      duration: 300,
      lastAction: 'Waiting for chart render',
      severity: 'medium',
    },
  ];

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const getSeverityBadge = (severity: string) => {
    const styles = {
      high: { bg: '#fee2e2', color: '#991b1b', label: 'High' },
      medium: { bg: '#fef3c7', color: '#92400e', label: 'Medium' },
      low: { bg: '#dbeafe', color: '#1e40af', label: 'Low' },
    };
    return styles[severity as keyof typeof styles] || styles.low;
  };

  if (isLoading) {
    return <div className="loading">Loading stuck users...</div>;
  }

  return (
    <div className="stuck-detector">
      {stuckUsers.length > 0 ? (
        <div className="stuck-list">
          {stuckUsers.map((user) => {
            const badge = getSeverityBadge(user.severity);
            return (
              <div key={user.id} className="stuck-item">
                <div className="stuck-header">
                  <div className="user-info">
                    <span className="user-name">{user.userName}</span>
                    <span className="user-email">{user.email}</span>
                  </div>
                  <span
                    className="severity-badge"
                    style={{ background: badge.bg, color: badge.color }}
                  >
                    {badge.label}
                  </span>
                </div>

                <div className="stuck-details">
                  <div className="detail-row">
                    <span className="detail-label">Stuck at:</span>
                    <span className="detail-value">{user.stuckAt}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Duration:</span>
                    <span className="detail-value">{formatDuration(user.duration)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Last action:</span>
                    <span className="detail-value">{user.lastAction}</span>
                  </div>
                </div>

                {user.jiraTicket && (
                  <a
                    href={`https://jira.example.com/browse/${user.jiraTicket}`}
                    className="jira-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Jira Ticket: {user.jiraTicket} →
                  </a>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          ✅ No stuck users detected - everyone is flowing smoothly!
        </div>
      )}

      <style>{`
        .stuck-detector {
          padding: 12px 0;
        }

        .stuck-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-height: 500px;
          overflow-y: auto;
        }

        .stuck-item {
          padding: 16px;
          background: var(--color-bg-light, #f9fafb);
          border: 1px solid var(--color-border);
          border-radius: 8px;
        }

        .stuck-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
          gap: 12px;
        }

        .user-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .user-name {
          font-weight: 600;
          font-size: 1rem;
          color: var(--color-text);
        }

        .user-email {
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
        }

        .severity-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .stuck-details {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 12px;
        }

        .detail-row {
          display: flex;
          gap: 8px;
          font-size: 0.875rem;
        }

        .detail-label {
          font-weight: 600;
          color: var(--color-text-secondary);
          min-width: 100px;
        }

        .detail-value {
          color: var(--color-text);
        }

        .jira-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: #0052cc;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          transition: background 0.2s;
        }

        .jira-link:hover {
          background: #0747a6;
        }

        .empty-state {
          text-align: center;
          padding: 48px 24px;
          color: var(--color-text-secondary);
          font-size: 1rem;
        }

        .loading {
          text-align: center;
          padding: 48px;
          color: var(--color-text-secondary);
        }
      `}</style>
    </div>
  );
}
