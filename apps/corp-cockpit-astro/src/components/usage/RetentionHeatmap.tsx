/**
 * Retention Heatmap - Phase H3-C
 * Week-over-week cohort retention visualization.
 * Accessible with ARIA and table fallback.
 */

import { useQuery } from '@tanstack/react-query';

interface RetentionCell {
  cohort: string;
  week: number;
  retention: number;
  users: number;
}

interface RetentionHeatmapProps {
  companyId: string;
}

export default function RetentionHeatmap({ companyId }: RetentionHeatmapProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['usage', 'retention', companyId],
    queryFn: async () => {
      const response = await fetch(`/api/usage-analytics/${companyId}/retention`);
      if (!response.ok) throw new Error('Failed to fetch retention data');
      return response.json() as Promise<RetentionCell[]>;
    },
  });

  // Mock data structure: cohorts x weeks
  const mockData: RetentionCell[] = [];
  const cohorts = ['W1 Jan', 'W2 Jan', 'W3 Jan', 'W4 Jan', 'W1 Feb'];
  for (let c = 0; c < cohorts.length; c++) {
    for (let w = 0; w <= 8; w++) {
      const retention = Math.max(0, 100 - w * (10 + Math.random() * 10));
      mockData.push({
        cohort: cohorts[c],
        week: w,
        retention,
        users: Math.floor(100 * (retention / 100)),
      });
    }
  }

  const cells = data || mockData;
  const cohortList = [...new Set(cells.map(c => c.cohort))];
  const maxWeeks = Math.max(...cells.map(c => c.week));

  const getColor = (retention: number): string => {
    if (retention >= 80) return '#10b981';
    if (retention >= 60) return '#84cc16';
    if (retention >= 40) return '#eab308';
    if (retention >= 20) return '#f97316';
    return '#ef4444';
  };

  if (isLoading) {
    return <div className="loading">Loading retention data...</div>;
  }

  return (
    <div className="retention-heatmap">
      {/* Heatmap Visualization */}
      <div className="heatmap-container" role="img" aria-label="Cohort retention heatmap">
        <div className="heatmap-grid">
          {/* Header row */}
          <div className="header-cell"></div>
          {Array.from({ length: maxWeeks + 1 }, (_, i) => (
            <div key={i} className="header-cell">
              W{i}
            </div>
          ))}

          {/* Data rows */}
          {cohortList.map((cohort) => (
            <div key={cohort} className="heatmap-row">
              <div className="cohort-label">{cohort}</div>
              {Array.from({ length: maxWeeks + 1 }, (_, week) => {
                const cell = cells.find(c => c.cohort === cohort && c.week === week);
                return (
                  <div
                    key={week}
                    className="retention-cell"
                    style={{ backgroundColor: cell ? getColor(cell.retention) : '#e5e7eb' }}
                    title={cell ? `${cell.retention.toFixed(1)}% (${cell.users} users)` : 'N/A'}
                    aria-label={cell ? `Week ${week}: ${cell.retention.toFixed(1)}% retention` : undefined}
                  >
                    {cell ? `${cell.retention.toFixed(0)}%` : '-'}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="heatmap-legend">
          <span>Low</span>
          <div className="legend-gradient"></div>
          <span>High</span>
        </div>
      </div>

      {/* Accessible Table Fallback */}
      <details className="table-fallback">
        <summary>View as table (accessible)</summary>
        <table>
          <caption>Cohort retention percentages by week</caption>
          <thead>
            <tr>
              <th scope="col">Cohort</th>
              {Array.from({ length: maxWeeks + 1 }, (_, i) => (
                <th key={i} scope="col">Week {i}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cohortList.map((cohort) => (
              <tr key={cohort}>
                <th scope="row">{cohort}</th>
                {Array.from({ length: maxWeeks + 1 }, (_, week) => {
                  const cell = cells.find(c => c.cohort === cohort && c.week === week);
                  return (
                    <td key={week}>
                      {cell ? `${cell.retention.toFixed(1)}%` : 'N/A'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </details>

      <style>{`
        .retention-heatmap {
          padding: 20px 0;
        }

        .heatmap-container {
          overflow-x: auto;
        }

        .heatmap-grid {
          display: grid;
          grid-template-columns: 100px repeat(auto-fill, 70px);
          gap: 4px;
          min-width: min-content;
        }

        .header-cell {
          padding: 8px;
          font-weight: 700;
          font-size: 0.875rem;
          text-align: center;
          color: var(--color-text);
        }

        .heatmap-row {
          display: contents;
        }

        .cohort-label {
          padding: 8px;
          font-weight: 600;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          color: var(--color-text);
        }

        .retention-cell {
          padding: 12px 8px;
          text-align: center;
          border-radius: 4px;
          font-weight: 600;
          font-size: 0.8125rem;
          color: white;
          cursor: help;
          transition: transform 0.2s;
        }

        .retention-cell:hover {
          transform: scale(1.1);
          z-index: 10;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .heatmap-legend {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 24px;
          justify-content: center;
        }

        .legend-gradient {
          width: 200px;
          height: 24px;
          border-radius: 4px;
          background: linear-gradient(to right, #ef4444, #f97316, #eab308, #84cc16, #10b981);
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
          font-size: 0.875rem;
        }

        th, td {
          padding: 8px;
          text-align: left;
          border: 1px solid var(--color-border);
        }

        thead th {
          font-weight: 700;
          background: var(--color-bg-light, #f9fafb);
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
