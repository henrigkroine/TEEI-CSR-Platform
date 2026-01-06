import React from 'react';
import TileCard, { MetricRow, ProgressBar } from './TileCard';
import type { LanguageTile } from '@teei/shared-types';
import EmptyState from '../../components/EmptyState';

interface LanguageTileWidgetProps {
  tile: LanguageTile;
  loading?: boolean;
  error?: string | null;
  onExport?: () => void;
}

/**
 * Check if language tile data is empty or has zero values
 * World-class empty state detection that considers all meaningful metrics
 */
function isEmptyLanguageData(data: LanguageTile['data']): boolean {
  return (
    data.sessionsPerWeek === 0 &&
    data.cohortDurationWeeks === 0 &&
    data.volunteerHours.total === 0 &&
    data.volunteerHours.uniqueVolunteers === 0 &&
    data.retention.enrollments === 0 &&
    data.retention.activeParticipants === 0 &&
    data.retention.completions === 0
  );
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

  // Check for empty/zero data state
  const isEmpty = !loading && !error && isEmptyLanguageData(data);

  return (
    <TileCard
      title="Language Connect for Ukraine"
      subtitle={`${tile.metadata.period.start} to ${tile.metadata.period.end}`}
      icon="🗣️"
      loading={loading}
      error={error}
      onExport={onExport}
      ariaLabel="Language Connect for Ukraine program metrics"
    >
      {isEmpty ? (
        <EmptyState
          title="No Language Learning Data"
          message="No language learning sessions found for this period. Data will appear once sessions are recorded and imported via CSV."
          icon="data"
          action={{
            label: 'View Import Guide',
            onClick: () => {
              // Open documentation or help modal
              const url = window.location.origin + '/docs/kintell/KINTELL_CSV_FORMATS.md';
              window.open(url, '_blank', 'noopener,noreferrer');
            },
          }}
        />
      ) : (
        <>
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
        </>
      )}
    </TileCard>
  );
}
