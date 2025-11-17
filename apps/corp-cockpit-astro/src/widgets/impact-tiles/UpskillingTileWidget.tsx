/**
 * UpskillingTileWidget - Display Upskilling Program metrics
 */

import { TileCard, MetricRow, MetricGrid, MetricCard } from './TileCard';
import type { UpskillingTile } from '@teei/shared-types';

export interface UpskillingTileWidgetProps {
  tile: UpskillingTile;
  isLoading?: boolean;
  error?: string;
}

export function UpskillingTileWidget({ tile, isLoading = false, error }: UpskillingTileWidgetProps) {
  return (
    <TileCard
      title="Upskilling"
      isLoading={isLoading}
      error={error}
      className="upskilling-tile"
    >
      {/* Funnel */}
      <div className="funnel-section">
        <MetricCard
          label="Enrollments"
          value={tile.metrics.enrollmentsCount}
          description="Started courses"
        />
        <div className="funnel-arrow" aria-hidden="true">→</div>
        <MetricCard
          label="Completions"
          value={tile.metrics.completionsCount}
          description={`${tile.metrics.completionRate}% conversion`}
        />
        <div className="funnel-arrow" aria-hidden="true">→</div>
        <MetricCard
          label="Placements"
          value={tile.metrics.placementsCount}
          description={`${tile.metrics.placementRate}% conversion`}
        />
      </div>

      {/* Locales */}
      <div className="tile-section">
        <h4 className="tile-section__title">Course Locales</h4>
        <MetricGrid columns={4}>
          <MetricCard label="UA" value={tile.localeBreakdown.UA} />
          <MetricCard label="EN" value={tile.localeBreakdown.EN} />
          <MetricCard label="DE" value={tile.localeBreakdown.DE} />
          <MetricCard label="NO" value={tile.localeBreakdown.NO} />
        </MetricGrid>
      </div>

      <MetricRow label="Active Courses" value={tile.metrics.activeCoursesCount} />
      <MetricRow label="Avg Duration" value={tile.metrics.avgCourseDurationWeeks.toFixed(1)} suffix=" weeks" />
    </TileCard>
  );
}
