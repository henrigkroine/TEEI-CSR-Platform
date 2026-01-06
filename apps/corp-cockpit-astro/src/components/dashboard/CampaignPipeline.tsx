import clsx from 'clsx';
import { scoringWeights } from '@/data/scoringWeights';

interface PipelineCard {
  id: string;
  title: string;
  deadline: string;
  strategicFit: number;
  interpretiveFit: number;
  scoreDelta: number[];
  collaborators: string[];
}

interface PipelineLane {
  id: string;
  title: string;
  cards: PipelineCard[];
}

const lanes: PipelineLane[] = [
  {
    id: 'draft',
    title: 'Draft',
    cards: [
      {
        id: 'p1',
        title: 'Mentorship Program — Q2 2025',
        deadline: 'Mar 30',
        strategicFit: 74,
        interpretiveFit: 56,
        scoreDelta: [45, 48, 47, 52, 55, 58],
        collaborators: ['MH', 'AD'],
      },
    ],
  },
  {
    id: 'active',
    title: 'Active',
    cards: [
      {
        id: 'q1',
        title: 'Language Connect — Ukraine Support',
        deadline: 'Apr 4',
        strategicFit: 81,
        interpretiveFit: 63,
        scoreDelta: [60, 62, 65, 64, 68, 70],
        collaborators: ['TS', 'AP', 'LW'],
      },
      {
        id: 'q2',
        title: 'Buddy Program — Oslo Region',
        deadline: 'Apr 6',
        strategicFit: 69,
        interpretiveFit: 58,
        scoreDelta: [52, 55, 54, 57, 58, 60],
        collaborators: ['FG'],
      },
    ],
  },
  {
    id: 'paused',
    title: 'Paused',
    cards: [
      {
        id: 'd1',
        title: 'Upskilling Ukraine — Cohort 4',
        deadline: 'Apr 9',
        strategicFit: 88,
        interpretiveFit: 71,
        scoreDelta: [70, 71, 74, 77, 80, 82],
        collaborators: ['MH', 'JS', 'BT'],
      },
    ],
  },
  {
    id: 'completed',
    title: 'Completed',
    cards: [
      {
        id: 's1',
        title: 'WEEI Entrepreneurship — Q1 2025',
        deadline: 'Mar 18',
        strategicFit: 79,
        interpretiveFit: 68,
        scoreDelta: [65, 66, 68, 70, 72, 74],
        collaborators: ['AD', 'CR'],
      },
    ],
  },
];

const weightSummary = `${Math.round(scoringWeights.compositeWeights.strategicFit * 100)}% strategic / ${Math.round(
  scoringWeights.compositeWeights.interpretiveFit * 100,
)}% interpretive`;

function Sparkline({ data }: { data: number[] }) {
  const width = 120;
  const height = 48;
  const points = data
    .map((value, index) => {
      const clamped = Math.min(Math.max(value, 0), 100);
      const x = (index / Math.max(data.length - 1, 1)) * width;
      const y = height - (clamped / 100) * height;
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints = `${points} ${width},${height} 0,${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-14 w-full" preserveAspectRatio="none">
      <polygon points={areaPoints} fill="rgba(10,89,97,0.15)" />
      <polyline points={points} fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function CampaignPipeline() {
  return (
    <section className="card">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-text-tertiary">Campaign Pipeline</p>
          <p className="text-sm text-text-secondary">
            Dual progress bars represent composite weighting ({weightSummary}).
          </p>
        </div>
        <button className="btn-secondary px-6">Run Pipeline</button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {lanes.map((lane) => (
          <div
            key={lane.id}
            className="rounded-2xl border border-border p-4"
            style={{ background: 'var(--color-surface-alt)' }}
          >
            <div className="flex items-center justify-between text-sm font-semibold text-text-secondary mb-3">
              <span>{lane.title}</span>
              <span className="text-text-tertiary">{lane.cards.length}</span>
            </div>
            <div className="space-y-3">
              {lane.cards.map((card) => (
                <article key={card.id} className="rounded-2xl border border-border bg-white/90 p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{card.title}</p>
                      <p className="text-xs uppercase tracking-[0.2em] text-text-tertiary">Due {card.deadline}</p>
                    </div>
                    <span className="rounded-full border border-border px-3 py-1 text-xs text-text-secondary">Stage</span>
                  </div>

                  <div className="mt-3 space-y-2">
                    <div className="text-xs font-semibold text-text-secondary">
                      Strategic Fit <span className="text-text-primary">{card.strategicFit}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary/80" style={{ width: `${card.strategicFit}%` }} />
                    </div>
                    <div className="text-xs font-semibold text-text-secondary">
                      Interpretive Fit <span className="text-text-primary">{card.interpretiveFit}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-accent/80" style={{ width: `${card.interpretiveFit}%` }} />
                    </div>
                  </div>

                  <div className="mt-3">
                    <Sparkline data={card.scoreDelta} />
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-text-secondary">
                    <div className="flex -space-x-2">
                      {card.collaborators.map((initials) => (
                        <span key={initials} className="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-primary/80 text-white text-xs font-semibold">
                          {initials}
                        </span>
                      ))}
                    </div>
                    <button className="text-accent underline-offset-4 hover:underline">View Campaign</button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default CampaignPipeline;

// Alternative export for pages that pass lanes as prop
import { useEffect, useState, useCallback } from 'react';
import type { FC } from 'react';
import './dashboard.css';
import { fetchCampaigns } from '../../api/dashboard';
import { useSSEConnection, useSSEMessage } from '../../hooks/useSSEConnection';

export interface PipelineCard {
  id: string;
  title: string;
  strategicFit: number;
  interpretiveFit: number;
  deadline: string;
  collaborators: string[];
  delta: number[];
}

export interface PipelineLane {
  name: string;
  stage: 'Draft' | 'Active' | 'Paused' | 'Completed';
  items: PipelineCard[];
}

interface Props {
  companyId: string;
  lanes?: PipelineLane[]; // Optional for backward compatibility
  enableSSE?: boolean;
}

/**
 * Convert campaign to pipeline card
 */
function campaignToPipelineCard(campaign: any): PipelineCard {
  const deadline = campaign.deadline
    ? new Date(campaign.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'TBD';

  // Extract collaborator initials
  const collaborators = campaign.collaborators?.map((c: any) => {
    if (typeof c === 'string') return c;
    const name = c.name || c.email || '';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }) || [];

  // Generate delta array (simplified - would need historical data)
  const currentScore = Math.round(
    (campaign.strategicFit || 0) * 0.67 + (campaign.interpretiveFit || 0) * 0.33
  );
  const delta = Array.from({ length: 6 }, (_, i) =>
    currentScore - (6 - i) * 2 + Math.floor(Math.random() * 3)
  );

  return {
    id: campaign.id,
    title: campaign.title || campaign.name || 'Untitled Campaign',
    strategicFit: campaign.strategicFit || 0,
    interpretiveFit: campaign.interpretiveFit || 0,
    deadline,
    collaborators,
    delta,
  };
}

export const CampaignPipelineWithLanes: FC<Props> = ({ companyId, lanes: propLanes, enableSSE = true }) => {
  const [lanes, setLanes] = useState<PipelineLane[]>(propLanes || []);
  const [loading, setLoading] = useState(!propLanes);
  const [error, setError] = useState<string | null>(null);

  // SSE connection for real-time updates
  const sseConnection = useSSEConnection({
    companyId,
    channel: 'dashboard-updates',
    autoConnect: enableSSE,
  });

  // Subscribe to campaign updates
  const handleCampaignUpdate = useCallback((updateData: any) => {
    if (updateData.companyId === companyId) {
      console.log('[CampaignPipeline] Refreshing due to SSE update');
      fetchData(true);
    }
  }, [companyId, fetchData]);

  useSSEMessage(sseConnection, 'campaign_updated', handleCampaignUpdate);

  const fetchData = useCallback(async (skipCache = false) => {
    // If lanes provided as prop, use them (backward compatibility)
    if (propLanes) {
      setLanes(propLanes);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch campaigns grouped by status
      const statuses: Array<'Draft' | 'Active' | 'Paused' | 'Completed'> = ['Draft', 'Active', 'Paused', 'Completed'];
      const lanesData: PipelineLane[] = [];

      for (const status of statuses) {
        const { campaigns } = await fetchCampaigns(companyId, {
          status: status.toLowerCase(),
          limit: 20,
        });

        const cards = campaigns.map(campaignToPipelineCard);

        lanesData.push({
          name: status,
          stage: status,
          items: cards,
        });
      }

      setLanes(lanesData);
    } catch (err) {
      console.error('[CampaignPipeline] Error fetching campaigns:', err);
      setError(err instanceof Error ? err.message : 'Failed to load campaigns');
      // Fallback to empty lanes on error
      setLanes(statuses.map(status => ({ name: status, stage: status, items: [] })));
    } finally {
      setLoading(false);
    }
  }, [companyId, propLanes]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Listen for manual refresh events
  useEffect(() => {
    const handleRefresh = () => {
      fetchData(true);
    };
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, [fetchData]);

  const statuses: Array<'Draft' | 'Active' | 'Paused' | 'Completed'> = ['Draft', 'Active', 'Paused', 'Completed'];

  if (loading) {
    return (
      <section className="experience-card experience-card-loading">
        <div className="experience-card__header">
          <div>
            <p className="experience-card__title">Campaign Pipeline</p>
            <p className="experience-card__subtitle">Loading campaigns...</p>
          </div>
        </div>
        <div className="pipeline-board">
          {statuses.map((status) => (
            <div className="pipeline-lane" key={status}>
              <div className="lane-title">{status}</div>
              <div className="skeleton-card"></div>
              <div className="skeleton-card"></div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="experience-card experience-card-error">
        <div className="experience-card__header">
          <div>
            <p className="experience-card__title">Campaign Pipeline</p>
            <p className="experience-card__subtitle error-message">{error}</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => fetchData(true)}>
            Retry
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="experience-card">
      <div className="experience-card__header">
        <div>
          <p className="experience-card__title">Campaign Pipeline</p>
          <p className="experience-card__subtitle">Strategic vs interpretive fit overview</p>
          {sseConnection.isConnected && (
            <span className="sse-indicator" title="Real-time updates active">
              <span className="sse-dot"></span>
            </span>
          )}
        </div>
      </div>
      <div className="pipeline-board">
        {lanes.map((lane) => (
          <div className="pipeline-lane" key={lane.stage}>
            <div className="lane-title">{lane.stage}</div>
            {lane.items.length === 0 ? (
              <div className="empty-lane">
                <p>No campaigns in {lane.stage.toLowerCase()}</p>
              </div>
            ) : (
              lane.items.map((card) => (
                <article className="pipeline-card" key={card.id}>
                  <header>
                    <strong>{card.title}</strong>
                    <div className="pipeline-meta">
                      <span>Due {card.deadline}</span>
                      <span>{card.collaborators.length} people</span>
                    </div>
                  </header>
                  <div className="fit-bars">
                    <div className="fit-row">
                      <span>Strategic Fit</span>
                      <span>{card.strategicFit}</span>
                    </div>
                    <div className="fit-track" aria-hidden="true">
                      <span
                        className="strategic"
                        style={{ width: `${card.strategicFit}%` }}
                      ></span>
                    </div>
                    <div className="fit-row">
                      <span>Interpretive Fit</span>
                      <span>{card.interpretiveFit}</span>
                    </div>
                    <div className="fit-track" aria-hidden="true">
                      <span
                        className="interpretive"
                        style={{ width: `${card.interpretiveFit}%` }}
                      ></span>
                    </div>
                  </div>
                  <div className="pipeline-meta">
                    <span>Δ last 7d</span>
                    <small>{card.delta.slice(-1)[0] >= 0 ? '↑' : '↓'} {card.delta.slice(-1)[0]} pts</small>
                  </div>
                </article>
              ))
            )}
          </div>
        ))}
      </div>
      <style>{`
        .experience-card-loading .skeleton-card {
          height: 120px;
          background: var(--color-muted);
          border-radius: var(--radius-lg);
          margin-bottom: var(--space-3);
          animation: pulse 1.5s ease-in-out infinite;
        }

        .experience-card-error .error-message {
          color: var(--color-error);
        }

        .empty-lane {
          padding: var(--space-4);
          text-align: center;
          color: var(--color-text-tertiary);
          font-size: var(--text-sm);
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

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </section>
  );
};


