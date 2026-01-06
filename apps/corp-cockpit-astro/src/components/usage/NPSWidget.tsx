/**
 * NPS Widget - Phase H3-C
 * Displays Net Promoter Score results and trends.
 */

import { useQuery } from '@tanstack/react-query';

interface NPSData {
  score: number;
  promoters: number;
  passives: number;
  detractors: number;
  totalResponses: number;
  trend: number;
}

interface NPSWidgetProps {
  companyId: string;
}

export default function NPSWidget({ companyId }: NPSWidgetProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['usage', 'nps', companyId],
    queryFn: async () => {
      const response = await fetch(`/api/usage-analytics/${companyId}/nps`);
      if (!response.ok) throw new Error('Failed to fetch NPS data');
      return response.json() as Promise<NPSData>;
    },
  });

  const npsData: NPSData = data || {
    score: 42,
    promoters: 58,
    passives: 28,
    detractors: 14,
    totalResponses: 324,
    trend: 5.3,
  };

  const getScoreCategory = (score: number): { label: string; color: string } => {
    if (score >= 70) return { label: 'Excellent', color: '#10b981' };
    if (score >= 50) return { label: 'Great', color: '#84cc16' };
    if (score >= 30) return { label: 'Good', color: '#eab308' };
    if (score >= 0) return { label: 'Needs Improvement', color: '#f97316' };
    return { label: 'Critical', color: '#ef4444' };
  };

  const scoreCategory = getScoreCategory(npsData.score);

  if (isLoading) {
    return <div className="loading">Loading NPS data...</div>;
  }

  return (
    <div className="nps-widget">
      {/* NPS Score Circle */}
      <div className="nps-score-container">
        <svg className="nps-circle" viewBox="0 0 200 200" aria-hidden="true">
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="20"
          />
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke={scoreCategory.color}
            strokeWidth="20"
            strokeDasharray={`${(npsData.score + 100) / 200 * 502.65} 502.65`}
            strokeLinecap="round"
            transform="rotate(-90 100 100)"
          />
        </svg>
        <div className="nps-score-value">
          <span className="score-number" style={{ color: scoreCategory.color }}>
            {npsData.score}
          </span>
          <span className="score-label">{scoreCategory.label}</span>
          {npsData.trend !== 0 && (
            <span className={`score-trend ${npsData.trend > 0 ? 'positive' : 'negative'}`}>
              {npsData.trend > 0 ? '↑' : '↓'} {Math.abs(npsData.trend).toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* Distribution */}
      <div className="nps-distribution">
        <div className="distribution-item promoters">
          <div className="distribution-bar" style={{ width: `${npsData.promoters}%` }}></div>
          <span className="distribution-label">
            Promoters: {npsData.promoters}%
          </span>
        </div>
        <div className="distribution-item passives">
          <div className="distribution-bar" style={{ width: `${npsData.passives}%` }}></div>
          <span className="distribution-label">
            Passives: {npsData.passives}%
          </span>
        </div>
        <div className="distribution-item detractors">
          <div className="distribution-bar" style={{ width: `${npsData.detractors}%` }}></div>
          <span className="distribution-label">
            Detractors: {npsData.detractors}%
          </span>
        </div>
      </div>

      <div className="nps-meta">
        Based on {npsData.totalResponses.toLocaleString()} responses
      </div>

      <style>{`
        .nps-widget {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .nps-score-container {
          position: relative;
          width: 200px;
          height: 200px;
          margin: 0 auto;
        }

        .nps-circle {
          width: 100%;
          height: 100%;
        }

        .nps-score-value {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }

        .score-number {
          font-size: 3rem;
          font-weight: 700;
          line-height: 1;
        }

        .score-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text-secondary);
        }

        .score-trend {
          font-size: 0.875rem;
          font-weight: 600;
        }

        .score-trend.positive {
          color: #10b981;
        }

        .score-trend.negative {
          color: #ef4444;
        }

        .nps-distribution {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .distribution-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .distribution-bar {
          height: 32px;
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .distribution-item.promoters .distribution-bar {
          background: #10b981;
        }

        .distribution-item.passives .distribution-bar {
          background: #eab308;
        }

        .distribution-item.detractors .distribution-bar {
          background: #ef4444;
        }

        .distribution-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text);
          white-space: nowrap;
        }

        .nps-meta {
          text-align: center;
          font-size: 0.875rem;
          color: var(--color-text-secondary);
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
