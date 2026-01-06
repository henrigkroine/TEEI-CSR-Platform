import React from 'react';
import TileCard, { MetricRow, ProgressBar } from './TileCard';
import type { MentorshipTile } from '@teei/shared-types';
import EmptyState from '../../components/EmptyState';

interface MentorshipTileWidgetProps {
  tile: MentorshipTile;
  loading?: boolean;
  error?: string | null;
  onExport?: () => void;
}

/**
 * Check if mentorship tile data is empty or has zero values
 * World-class empty state detection that considers all meaningful metrics
 */
function isEmptyMentorshipData(data: MentorshipTile['data']): boolean {
  return (
    data.bookings.total === 0 &&
    data.bookings.scheduled === 0 &&
    data.bookings.completed === 0 &&
    data.attendance.totalSessions === 0 &&
    data.repeatMentoring.uniqueMentors === 0 &&
    data.repeatMentoring.uniqueMentees === 0 &&
    data.repeatMentoring.mentorsWithMultipleSessions === 0
  );
}

/**
 * Mentorship Tile Widget
 * Displays metrics for Mentorship program
 */
export default function MentorshipTileWidget({
  tile,
  loading = false,
  error = null,
  onExport,
}: MentorshipTileWidgetProps) {
  const { data } = tile;

  // Check for empty/zero data state
  const isEmpty = !loading && !error && isEmptyMentorshipData(data);

  return (
    <TileCard
      title="Mentors for Ukraine"
      subtitle={`${tile.metadata.period.start} to ${tile.metadata.period.end}`}
      icon="🤝"
      loading={loading}
      error={error}
      onExport={onExport}
      ariaLabel="Mentors for Ukraine program metrics"
    >
      {isEmpty ? (
        <EmptyState
          title="No Mentorship Data"
          message="No mentorship sessions found for this period. Data will appear once sessions are booked, completed, and imported via CSV."
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
          {/* Bookings */}
          <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Bookings</h4>
        <MetricRow label="Total" value={data.bookings.total} />
        <MetricRow label="Scheduled" value={data.bookings.scheduled} />
        <MetricRow label="Completed" value={data.bookings.completed} trend="up" />
        <MetricRow label="Cancelled" value={data.bookings.cancelled} />
      </div>

      {/* Attendance */}
      <div className="border-t border-gray-200 pt-3 mt-3">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Attendance</h4>
        <div className="mb-2">
          <ProgressBar
            label="Attendance Rate"
            current={data.attendance.attendanceRate * 100}
            target={90}
            max={100}
            unit="%"
          />
        </div>
        <MetricRow
          label="Avg Session Duration"
          value={data.attendance.avgSessionDuration.toFixed(1)}
          unit="min"
        />
        <MetricRow label="Total Sessions" value={data.attendance.totalSessions} />
      </div>

      {/* No-Show Rate */}
      <div className="border-t border-gray-200 pt-3 mt-3">
        <div className="mb-2">
          <ProgressBar
            label="No-Show Rate"
            current={data.noShowRate * 100}
            target={10}
            max={100}
            unit="%"
            showPercentage={false}
          />
          <p className="text-xs text-gray-600 mt-1">
            Lower is better (target: &lt;10%)
          </p>
        </div>
      </div>

      {/* Repeat Mentoring */}
      <div className="border-t border-gray-200 pt-3 mt-3">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Repeat Mentoring</h4>
        <MetricRow label="Unique Mentors" value={data.repeatMentoring.uniqueMentors} />
        <MetricRow label="Unique Mentees" value={data.repeatMentoring.uniqueMentees} />
        <MetricRow
          label="Avg Sessions/Mentee"
          value={data.repeatMentoring.avgSessionsPerMentee.toFixed(2)}
        />
        <MetricRow
          label="Mentors with 2+ Sessions"
          value={data.repeatMentoring.mentorsWithMultipleSessions}
        />
        <div className="mt-2">
          <ProgressBar
            label="Repeat Rate"
            current={data.repeatMentoring.repeatRate * 100}
            target={60}
            max={100}
            unit="%"
          />
        </div>
      </div>

      {/* Feedback */}
      {data.feedback && (
        <div className="border-t border-gray-200 pt-3 mt-3">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Feedback</h4>
          <MetricRow
            label="Avg Mentor Rating"
            value={data.feedback.avgMentorRating?.toFixed(2) || 'N/A'}
            unit="/ 5"
          />
          <MetricRow
            label="Avg Mentee Rating"
            value={data.feedback.avgMenteeRating?.toFixed(2) || 'N/A'}
            unit="/ 5"
          />
          <MetricRow label="Feedback Count" value={data.feedback.feedbackCount} />
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
