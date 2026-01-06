/**
 * Conversion Funnel - Phase H3-C
 * Visualizes user journey: Builder → Boardroom → Export
 * Accessible with ARIA labels and table fallback.
 */

import { useQuery } from '@tanstack/react-query';

interface FunnelStage {
  name: string;
  count: number;
  percentage: number;
  dropoff?: number;
}

interface ConversionFunnelProps {
  companyId: string;
}

export default function ConversionFunnel({ companyId }: ConversionFunnelProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['usage', 'funnel', companyId],
    queryFn: async () => {
      const response = await fetch(`/api/usage-analytics/${companyId}/funnel`);
      if (!response.ok) throw new Error('Failed to fetch funnel data');
      return response.json() as Promise<FunnelStage[]>;
    },
  });

  const stages: FunnelStage[] = data || [
    { name: 'Report Builder', count: 1250, percentage: 100 },
    { name: 'Boardroom View', count: 890, percentage: 71.2, dropoff: 28.8 },
    { name: 'Export/Share', count: 456, percentage: 36.5, dropoff: 34.7 },
  ];

  if (isLoading) {
    return <div className="loading">Loading funnel data...</div>;
  }

  return (
    <div className="conversion-funnel">
      {/* Visual Funnel */}
      <div className="funnel-chart" role="img" aria-label="Conversion funnel visualization">
        {stages.map((stage, index) => (
          <div
            key={stage.name}
            className="funnel-stage"
            style={{ width: `${stage.percentage}%` }}
          >
            <div className="stage-label">
              <span className="stage-name">{stage.name}</span>
              <span className="stage-count" aria-label={`${stage.count} users`}>
                {stage.count.toLocaleString()}
              </span>
            </div>
            <div className="stage-bar">
              <div className="stage-percentage">{stage.percentage.toFixed(1)}%</div>
            </div>
            {stage.dropoff !== undefined && (
              <div className="dropoff-indicator" aria-label={`${stage.dropoff}% drop-off`}>
                ↓ {stage.dropoff.toFixed(1)}% drop-off
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Accessible Table Fallback */}
      <details className="table-fallback">
        <summary>View as table (accessible)</summary>
        <table>
          <caption>Conversion funnel data</caption>
          <thead>
            <tr>
              <th scope="col">Stage</th>
              <th scope="col">Users</th>
              <th scope="col">Percentage</th>
              <th scope="col">Drop-off</th>
            </tr>
          </thead>
          <tbody>
            {stages.map((stage) => (
              <tr key={stage.name}>
                <th scope="row">{stage.name}</th>
                <td>{stage.count.toLocaleString()}</td>
                <td>{stage.percentage.toFixed(1)}%</td>
                <td>{stage.dropoff ? `${stage.dropoff.toFixed(1)}%` : 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>

      <style>{`
        .conversion-funnel {
          padding: 20px 0;
        }

        .funnel-chart {
          display: flex;
          flex-direction: column;
          gap: 16px;
          align-items: center;
        }

        .funnel-stage {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 200px;
          max-width: 100%;
        }

        .stage-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 12px;
        }

        .stage-name {
          font-weight: 600;
          font-size: 1rem;
          color: var(--color-text);
        }

        .stage-count {
          font-weight: 700;
          font-size: 1.25rem;
          color: var(--color-primary);
        }

        .stage-bar {
          height: 64px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .stage-percentage {
          color: white;
          font-weight: 700;
          font-size: 1.25rem;
        }

        .dropoff-indicator {
          text-align: center;
          color: #ef4444;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .table-fallback {
          margin-top: 32px;
          padding: 16px;
          background: var(--color-bg-light, #f9fafb);
          border-radius: 8px;
        }

        .table-fallback summary {
          cursor: pointer;
          font-weight: 600;
          color: var(--color-primary);
        }

        table {
          width: 100%;
          margin-top: 16px;
          border-collapse: collapse;
        }

        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid var(--color-border);
        }

        thead th {
          font-weight: 700;
          background: var(--color-bg-light, #f9fafb);
        }

        caption {
          text-align: left;
          font-weight: 600;
          margin-bottom: 8px;
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
