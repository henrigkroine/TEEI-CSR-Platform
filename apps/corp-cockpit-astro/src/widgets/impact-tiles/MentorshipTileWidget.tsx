/**
 * MentorshipTileWidget - Display Mentorship Program metrics
 */

import { TileCard, MetricRow, MetricGrid, MetricCard } from './TileCard';
import type { MentorshipTile } from '@teei/shared-types';

export interface MentorshipTileWidgetProps {
  tile: MentorshipTile;
  isLoading?: boolean;
  error?: string;
}

export function MentorshipTileWidget({ tile, isLoading = false, error }: MentorshipTileWidgetProps) {
  return (
    <TileCard
      title="Mentorship"
      isLoading={isLoading}
      error={error}
      className="mentorship-tile"
    >
      <MetricGrid columns={2}>
        <MetricCard
          label="Bookings"
          value={tile.metrics.bookingsCount}
        />
        <MetricCard
          label="Attended"
          value={tile.metrics.attendedCount}
        />
        <MetricCard
          label="Attendance Rate"
          value={`${tile.metrics.attendanceRate}%`}
        />
        <MetricCard
          label="No-Show Rate"
          value={`${tile.metrics.noShowRate}%`}
        />
      </MetricGrid>

      <div className="tile-section">
        <MetricRow label="Unique Mentees" value={tile.metrics.uniqueMentees} important />
        <MetricRow label="Unique Mentors" value={tile.metrics.uniqueMentors} />
        <MetricRow label="Avg Sessions/Mentee" value={tile.metrics.avgSessionsPerMentee.toFixed(1)} />
        <MetricRow label="Repeat Mentoring" value={tile.metrics.repeatMentoringCount} />
        {tile.metrics.avgMentorRating && (
          <MetricRow label="Mentor Rating" value={`${tile.metrics.avgMentorRating.toFixed(1)}/5`} />
        )}
      </div>
    </TileCard>
  );
}
