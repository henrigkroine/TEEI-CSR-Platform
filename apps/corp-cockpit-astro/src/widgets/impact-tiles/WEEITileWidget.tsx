/**
 * WEEITileWidget - Display WEEI Program metrics
 */

import { TileCard, MetricRow, MetricGrid, MetricCard } from './TileCard';
import type { WEEITile } from '@teei/shared-types';

export interface WEEITileWidgetProps {
  tile: WEEITile;
  isLoading?: boolean;
  error?: string;
}

export function WEEITileWidget({ tile, isLoading = false, error }: WEEITileWidgetProps) {
  return (
    <TileCard
      title="WEEI Program"
      isLoading={isLoading}
      error={error}
      className="weei-tile"
    >
      <MetricGrid columns={2}>
        <MetricCard
          label="Total Participants"
          value={tile.metrics.totalParticipants}
        />
        <MetricCard
          label="Demo Days"
          value={tile.metrics.demoDaysCount}
        />
      </MetricGrid>

      {/* Stage Pipeline */}
      <div className="tile-section">
        <h4 className="tile-section__title">Stage Progression</h4>
        {[
          { key: 'uLearn', label: 'U:LEARN', data: tile.stageMetrics.uLearn },
          { key: 'uStart', label: 'U:START', data: tile.stageMetrics.uStart },
          { key: 'uGrow', label: 'U:GROW', data: tile.stageMetrics.uGrow },
          { key: 'uLead', label: 'U:LEAD', data: tile.stageMetrics.uLead },
        ].map(({ key, label, data }) => (
          <div key={key} className="stage-row">
            <span className="stage-row__label">{label}</span>
            <span className="stage-row__enrolled">{data.enrolled}</span>
            <div className="stage-row__bar" role="progressbar" aria-label={`${label} completion ${data.completionRate}%`}>
              <div style={{ width: `${data.completionRate}%` }}></div>
            </div>
            <span className="stage-row__completed">{data.completed} ({data.completionRate}%)</span>
          </div>
        ))}
      </div>

      <div className="tile-section">
        <h4 className="tile-section__title">Progression Rates</h4>
        <MetricRow label="LEARN → START" value={`${tile.progressionMetrics.learnToStart}%`} />
        <MetricRow label="START → GROW" value={`${tile.progressionMetrics.startToGrow}%`} />
        <MetricRow label="GROW → LEAD" value={`${tile.progressionMetrics.growToLead}%`} />
      </div>
    </TileCard>
  );
}
