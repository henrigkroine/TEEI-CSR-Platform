import React from 'react';
import TileCard, { MetricRow, ProgressBar } from './TileCard';
import type { LanguageTile } from '@teei/shared-types';

interface LanguageTileWidgetProps {
  tile: LanguageTile;
  loading?: boolean;
  error?: string | null;
  onExport?: () => void;
}

/**
 * Language Tile Widget
 * Displays metrics for Language Learning program
 */
export default function LanguageTileWidget({
  tile,
  loading = false,
  error = null,
  onExport,
}: LanguageTileWidgetProps) {
  const { data } = tile;

  return (
    <TileCard
      title="Language Learning"
      subtitle={`${tile.metadata.period.start} to ${tile.metadata.period.end}`}
      icon="🗣️"
      loading={loading}
      error={error}
      onExport={onExport}
      ariaLabel="Language learning program metrics"
    >
      {/* Sessions Per Week */}
      <div className="mb-4">
        <ProgressBar
          label="Sessions per Week"
          current={data.sessionsPerWeek}
          target={data.targetSessionsPerWeek}
          max={data.targetSessionsPerWeek * 1.5}
          unit=" sessions"
          showPercentage={false}
        />
      </div>

      {/* Cohort Duration */}
      <div className="mb-4">
        <ProgressBar
          label="Cohort Duration"
          current={data.cohortDurationWeeks}
          target={data.targetDurationWeeks}
          max={data.targetDurationWeeks * 1.5}
          unit=" weeks"
          showPercentage={false}
        />
      </div>

      {/* Volunteer Hours */}
      <div className="border-t border-gray-200 pt-3 mt-3">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Volunteer Hours</h4>
        <MetricRow label="Total Hours" value={data.volunteerHours.total.toFixed(1)} unit="hrs" />
        <MetricRow
          label="Avg per Session"
          value={data.volunteerHours.perSession.toFixed(2)}
          unit="hrs"
        />
        <MetricRow
          label="Unique Volunteers"
          value={data.volunteerHours.uniqueVolunteers}
          unit=""
        />
      </div>

      {/* Retention */}
      <div className="border-t border-gray-200 pt-3 mt-3">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Retention</h4>
        <MetricRow label="Enrollments" value={data.retention.enrollments} />
        <MetricRow label="Active Participants" value={data.retention.activeParticipants} />
        <MetricRow label="Completions" value={data.retention.completions} />
        <div className="mt-2">
          <ProgressBar
            label="Retention Rate"
            current={data.retention.retentionRate * 100}
            target={80}
            max={100}
            unit="%"
          />
        </div>
      </div>

      {/* Language Levels (if available) */}
      {data.languageLevels && (
        <div className="border-t border-gray-200 pt-3 mt-3">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Language Progression</h4>
          <MetricRow
            label="Start Level"
            value={data.languageLevels.averageStartLevel || 'N/A'}
          />
          <MetricRow
            label="Current Level"
            value={data.languageLevels.averageCurrentLevel || 'N/A'}
          />
        </div>
      )}

      {/* Impact Scores */}
      {(data.vis || data.sroi) && (
        <div className="border-t border-gray-200 pt-3 mt-3">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Impact Scores</h4>
          {data.vis && <MetricRow label="VIS Score" value={data.vis.toFixed(2)} />}
          {data.sroi && <MetricRow label="SROI Ratio" value={data.sroi.toFixed(2)} unit=":1" />}
        </div>
      )}

      {/* Data Freshness */}
      <div className="border-t border-gray-200 pt-3 mt-3">
        <p className="text-xs text-gray-500">
          Data: {tile.metadata.dataFreshness.replace('_', ' ')} •
          Calculated: {new Date(tile.metadata.calculatedAt).toLocaleString()}
        </p>
      </div>
    </TileCard>
  );
}
