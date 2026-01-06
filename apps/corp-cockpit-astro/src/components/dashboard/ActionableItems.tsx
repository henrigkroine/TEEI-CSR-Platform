import { useEffect, useState, useCallback } from 'react';
import clsx from 'clsx';
import { scoringWeights, getPriority, classifyScore } from '@/data/scoringWeights';
import { fetchCampaigns } from '../../api/dashboard';
import { useSSEConnection, useSSEMessage } from '../../hooks/useSSEConnection';

type PriorityLevel = 'high' | 'medium' | 'low';

interface ActionableItem {
  id: string;
  title: string;
  program?: string;
  deadline: string;
  cluster: string;
  score: number;
  summary?: string;
  owner: string;
}

interface Props {
  companyId?: string; // Optional to handle undefined during SSR/hydration
  items?: ActionableItem[]; // Optional prop for backward compatibility
  enableSSE?: boolean;
}

const priorityConfig: Record<PriorityLevel, { label: string; class: string }> = {
  high: { label: 'High Priority', class: 'priority-high' },
  medium: { label: 'Medium', class: 'priority-medium' },
  low: { label: 'Monitor', class: 'priority-low' },
};

const bracketConfig: Record<string, { label: string; class: string }> = {
  excellent: { label: 'Excellent', class: 'bracket-excellent' },
  strong: { label: 'Strong', class: 'bracket-strong' },
  moderate: { label: 'Moderate', class: 'bracket-moderate' },
  weak: { label: 'Needs Work', class: 'bracket-weak' },
};

/**
 * Convert campaign to actionable item
 */
function campaignToActionableItem(campaign: any): ActionableItem {
  const deadline = campaign.deadline
    ? new Date(campaign.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'TBD';

  // Calculate composite score from strategic/interpretive fit
  const strategicFit = campaign.strategicFit || 0;
  const interpretiveFit = campaign.interpretiveFit || 0;
  const compositeScore = Math.round(
    strategicFit * scoringWeights.compositeWeights.strategicFit +
    interpretiveFit * scoringWeights.compositeWeights.interpretiveFit
  );

  return {
    id: campaign.id,
    title: campaign.title || campaign.name || 'Untitled Campaign',
    program: campaign.programTemplate?.name || campaign.program,
    deadline,
    cluster: campaign.beneficiaryGroup?.cluster || campaign.cluster || 'General',
    score: compositeScore,
    summary: campaign.description || campaign.summary,
    owner: campaign.owner?.name || campaign.owner || 'Unassigned',
  };
}

export default function ActionableItems({ companyId, items: propItems, enableSSE = true }: Props) {
  // Validate companyId - check for undefined, null, empty string, or string "undefined"
  const isValidCompanyId = companyId &&
    typeof companyId === 'string' &&
    companyId !== 'undefined' &&
    companyId !== 'null' &&
    companyId.trim() !== '';

  if (!isValidCompanyId) {
    console.error('[ActionableItems] Invalid companyId:', companyId);
    return (
      <div className="actionable-items">
        <div className="alert alert-error">
          Invalid company ID. Please refresh the page.
        </div>
      </div>
    );
  }

  const [items, setItems] = useState<ActionableItem[]>(propItems || []);
  const [loading, setLoading] = useState(!propItems);
  const [error, setError] = useState<string | null>(null);

  // SSE connection for real-time updates
  const sseConnection = useSSEConnection({
    companyId,
    channel: 'dashboard-updates',
    autoConnect: enableSSE && !!companyId,
  });

  // Subscribe to campaign updates
  const handleCampaignUpdate = useCallback((updateData: any) => {
    if (updateData.companyId === companyId) {
      console.log('[ActionableItems] Refreshing due to SSE update');
      fetchData(true);
    }
  }, [companyId, fetchData]);

  useSSEMessage(sseConnection, 'campaign_updated', handleCampaignUpdate);

  const fetchData = useCallback(async (skipCache = false) => {
    // If items provided as prop, use them (backward compatibility)
    if (propItems) {
      setItems(propItems);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch campaigns with upcoming deadlines, sorted by priority
      const { campaigns } = await fetchCampaigns(companyId, {
        limit: 10,
        offset: 0,
      });

      // Filter campaigns with deadlines and convert to actionable items
      const actionableCampaigns = campaigns
        .filter((campaign: any) => {
          // Only show campaigns with deadlines in the next 30 days
          if (!campaign.deadline) return false;
          const deadline = new Date(campaign.deadline);
          const now = new Date();
          const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return daysUntilDeadline >= 0 && daysUntilDeadline <= 30;
        })
        .map(campaignToActionableItem)
        .sort((a, b) => {
          // Sort by score (highest first), then by deadline (soonest first)
          if (b.score !== a.score) return b.score - a.score;
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        })
        .slice(0, 5); // Top 5 actionable items

      setItems(actionableCampaigns);
    } catch (err) {
      console.error('[ActionableItems] Error fetching campaigns:', err);
      setError(err instanceof Error ? err.message : 'Failed to load actionable items');
      // Fallback to empty array on error
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, propItems]);

  useEffect(() => {
    // Only fetch if companyId is valid
    const isValidCompanyId = companyId &&
      typeof companyId === 'string' &&
      companyId !== 'undefined' &&
      companyId !== 'null' &&
      companyId.trim() !== '';

    if (isValidCompanyId) {
      fetchData();
    }
  }, [fetchData, companyId]);

  // Listen for manual refresh events
  useEffect(() => {
    const handleRefresh = () => {
      fetchData(true);
    };
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, [fetchData]);
  if (loading) {
    return (
      <section className="actionable-section actionable-section-loading">
        <div className="section-header">
          <div className="section-header-content">
            <div className="section-title-row">
              <h2 className="section-title">Actionable Items</h2>
              <span className="section-count">...</span>
            </div>
            <p className="section-subtitle">Loading campaigns...</p>
          </div>
        </div>
        <div className="loading-placeholder">
          <div className="skeleton-item"></div>
          <div className="skeleton-item"></div>
          <div className="skeleton-item"></div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="actionable-section actionable-section-error">
        <div className="section-header">
          <div className="section-header-content">
            <div className="section-title-row">
              <h2 className="section-title">Actionable Items</h2>
            </div>
            <p className="section-subtitle error-message">{error}</p>
          </div>
        </div>
        <div className="error-state">
          <p>Failed to load actionable items. Please try refreshing.</p>
          <button className="btn btn-secondary btn-sm" onClick={() => fetchData(true)}>
            Retry
          </button>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="actionable-section actionable-section-empty">
        <div className="section-header">
          <div className="section-header-content">
            <div className="section-title-row">
              <h2 className="section-title">Actionable Items</h2>
              <span className="section-count">0</span>
            </div>
            <p className="section-subtitle">No campaigns require immediate attention</p>
          </div>
        </div>
        <div className="empty-state">
          <p>All campaigns are on track. Check back later for new actionable items.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="actionable-section">
      {/* Card Header */}
      <div className="section-header">
        <div className="section-header-content">
          <div className="section-title-row">
            <h2 className="section-title">Actionable Items</h2>
            <span className="section-count">{items.length}</span>
            {sseConnection.isConnected && (
              <span className="sse-indicator" title="Real-time updates active">
                <span className="sse-dot"></span>
              </span>
            )}
          </div>
          <p className="section-subtitle">
            Priority based on scoring thresholds ({scoringWeights.thresholds.excellent}+ excellent)
          </p>
        </div>
        <div className="section-actions">
          <button className="btn btn-secondary btn-sm">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 3v10M4 9l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Export
          </button>
          <button className="btn btn-primary btn-sm">Review All</button>
        </div>
      </div>

      {/* Items List */}
      <div className="items-list">
        {items.map((item) => {
          const priority = getPriority(item.score);
          const bracket = classifyScore(item.score);
          const config = priorityConfig[priority];
          const bracketInfo = bracketConfig[bracket] || bracketConfig.moderate;

          return (
            <article key={item.id} className="item-card">
              {/* Left accent bar */}
              <div className={clsx('item-accent', config.class)} />

              <div className="item-content">
                {/* Top row: Title + Score */}
                <div className="item-header">
                  <div className="item-info">
                    {item.program && (
                      <span className="item-program">{item.program}</span>
                    )}
                    <h3 className="item-title">{item.title}</h3>
                  </div>
                  <div className="item-score-block">
                    <div className="score-value">{item.score}</div>
                    <div className={clsx('score-bracket', bracketInfo.class)}>
                      {bracketInfo.label}
                    </div>
                  </div>
                </div>

                {/* Summary */}
                {item.summary && (
                  <p className="item-summary">{item.summary}</p>
                )}

                {/* Meta row */}
                <div className="item-meta">
                  <div className="meta-pills">
                    <span className={clsx('priority-pill', config.class)}>
                      {config.label}
                    </span>
                    <span className="meta-pill">
                      <svg viewBox="0 0 16 16" aria-hidden="true">
                        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M8 5v3l2 2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      Due {item.deadline}
                    </span>
                    <span className="meta-pill">
                      <svg viewBox="0 0 16 16" aria-hidden="true">
                        <circle cx="8" cy="6" r="3" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M2 14c0-3 3-4 6-4s6 1 6 4" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                      {item.owner}
                    </span>
                    <span className="meta-pill">
                      <svg viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M2 2h12M2 6h12M2 10h8M2 14h6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      {item.cluster}
                    </span>
                  </div>

                  {/* Quick actions - visible on hover */}
                  <div className="item-actions">
                    <button className="action-btn" title="Assign owner">
                      <svg viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M8 10a4 4 0 100-8 4 4 0 000 8zM1 14c0-2.5 3-4 7-4s7 1.5 7 4" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                    </button>
                    <button className="action-btn" title="Open AI Writer">
                      <svg viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M8 2l2 4 4 .5-3 3 .5 4.5L8 12l-3.5 2 .5-4.5-3-3L6 6l2-4z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <button className="action-btn action-primary" title="Review campaign">
                      <svg viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M6 12l4-4-4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <style>{`
        .actionable-section {
          background: var(--color-surface);
          border-radius: var(--card-radius);
          border: 1px solid var(--color-border);
          box-shadow: var(--shadow-card);
          overflow: hidden;
        }

        .section-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: var(--space-4);
          padding: var(--space-5);
          border-bottom: 1px solid var(--color-border-subtle);
          background: var(--color-surface-alt);
        }

        .section-title-row {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .section-title {
          font-size: var(--text-sm);
          font-weight: var(--font-weight-semibold);
          text-transform: uppercase;
          letter-spacing: var(--tracking-caps);
          color: var(--color-text-tertiary);
          margin: 0;
        }

        .section-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 22px;
          height: 22px;
          padding: 0 6px;
          border-radius: var(--radius-pill);
          background: var(--color-primary);
          color: var(--color-text-on-primary);
          font-size: 11px;
          font-weight: var(--font-weight-bold);
        }

        .section-subtitle {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          margin-top: var(--space-1);
        }

        .section-actions {
          display: flex;
          gap: var(--space-2);
        }

        .section-actions .btn svg {
          width: 14px;
          height: 14px;
        }

        .items-list {
          display: flex;
          flex-direction: column;
        }

        .item-card {
          display: flex;
          position: relative;
          border-bottom: 1px solid var(--color-border-subtle);
          transition: background var(--duration-fast) var(--ease-out);
        }

        .item-card:last-child {
          border-bottom: none;
        }

        .item-card:hover {
          background: var(--color-muted);
        }

        .item-accent {
          width: 4px;
          flex-shrink: 0;
          transition: opacity var(--duration-fast) var(--ease-out);
        }

        .item-accent.priority-high {
          background: linear-gradient(180deg, var(--color-error), rgba(220, 38, 38, 0.6));
        }

        .item-accent.priority-medium {
          background: linear-gradient(180deg, var(--color-accent), rgba(186, 143, 90, 0.6));
        }

        .item-accent.priority-low {
          background: linear-gradient(180deg, var(--color-success), rgba(5, 150, 105, 0.6));
        }

        .item-content {
          flex: 1;
          padding: var(--space-5);
          min-width: 0;
        }

        .item-header {
          display: flex;
          justify-content: space-between;
          gap: var(--space-4);
          margin-bottom: var(--space-3);
        }

        .item-info {
          flex: 1;
          min-width: 0;
        }

        .item-program {
          display: block;
          font-size: var(--text-xs);
          text-transform: uppercase;
          letter-spacing: var(--tracking-caps);
          color: var(--color-text-tertiary);
          margin-bottom: var(--space-1);
        }

        .item-title {
          font-size: var(--text-base);
          font-weight: var(--font-weight-semibold);
          color: var(--color-text-primary);
          margin: 0;
          line-height: var(--leading-snug);
        }

        .item-score-block {
          text-align: right;
          flex-shrink: 0;
        }

        .score-value {
          font-size: var(--text-2xl);
          font-weight: var(--font-weight-bold);
          color: var(--color-text-primary);
          line-height: 1;
        }

        .score-bracket {
          font-size: var(--text-xs);
          font-weight: var(--font-weight-semibold);
          margin-top: 2px;
        }

        .bracket-excellent { color: var(--color-success); }
        .bracket-strong { color: var(--color-primary); }
        .bracket-moderate { color: var(--color-accent); }
        .bracket-weak { color: var(--color-error); }

        .item-summary {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          line-height: var(--leading-relaxed);
          margin-bottom: var(--space-4);
        }

        .item-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-4);
        }

        .meta-pills {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-2);
        }

        .priority-pill,
        .meta-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: var(--radius-pill);
          font-size: var(--text-xs);
          font-weight: var(--font-weight-medium);
        }

        .priority-pill {
          font-weight: var(--font-weight-semibold);
          text-transform: uppercase;
          letter-spacing: var(--tracking-wider);
        }

        .priority-pill.priority-high {
          background: var(--color-error-light);
          color: var(--color-error);
        }

        .priority-pill.priority-medium {
          background: var(--color-accent-muted);
          color: var(--color-accent-dark);
        }

        .priority-pill.priority-low {
          background: var(--color-success-light);
          color: var(--color-success);
        }

        .meta-pill {
          background: var(--color-muted);
          color: var(--color-text-secondary);
        }

        .meta-pill svg {
          width: 14px;
          height: 14px;
          opacity: 0.7;
        }

        .item-actions {
          display: flex;
          gap: var(--space-1);
          opacity: 0;
          transform: translateX(8px);
          transition:
            opacity var(--duration-fast) var(--ease-out),
            transform var(--duration-fast) var(--ease-out);
        }

        .item-card:hover .item-actions {
          opacity: 1;
          transform: translateX(0);
        }

        .action-btn {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          color: var(--color-text-secondary);
          display: grid;
          place-items: center;
          transition: all var(--duration-fast) var(--ease-out);
        }

        .action-btn:hover {
          border-color: var(--color-border-strong);
          color: var(--color-text-primary);
          background: var(--color-surface-alt);
        }

        .action-btn.action-primary {
          background: var(--color-primary);
          border-color: var(--color-primary);
          color: var(--color-text-on-primary);
        }

        .action-btn.action-primary:hover {
          background: var(--color-primary-strong);
        }

        .action-btn svg {
          width: 16px;
          height: 16px;
        }

        .actionable-section-loading,
        .actionable-section-error,
        .actionable-section-empty {
          background: var(--color-surface);
          border-radius: var(--card-radius);
          border: 1px solid var(--color-border);
          box-shadow: var(--shadow-card);
        }

        .loading-placeholder {
          padding: var(--space-5);
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .skeleton-item {
          height: 80px;
          background: var(--color-muted);
          border-radius: var(--radius-md);
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .error-state {
          padding: var(--space-8);
          text-align: center;
          color: var(--color-text-secondary);
        }

        .error-message {
          color: var(--color-error);
        }

        .empty-state {
          padding: var(--space-8);
          text-align: center;
          color: var(--color-text-secondary);
        }

        .sse-indicator {
          display: inline-flex;
          align-items: center;
          margin-left: var(--space-2);
        }

        .sse-dot {
          display: block;
          width: 6px;
          height: 6px;
          border-radius: var(--radius-pill);
          background: var(--color-success);
          animation: pulse-dot 2s ease-in-out infinite;
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }

        @media (max-width: 768px) {
          .section-header {
            flex-direction: column;
            gap: var(--space-4);
          }

          .item-header {
            flex-direction: column;
            gap: var(--space-3);
          }

          .item-score-block {
            text-align: left;
            display: flex;
            align-items: baseline;
            gap: var(--space-2);
          }

          .meta-pills {
            flex-wrap: wrap;
          }

          .item-actions {
            opacity: 1;
            transform: none;
            margin-top: var(--space-3);
          }
        }
      `}</style>
    </section>
  );
}
