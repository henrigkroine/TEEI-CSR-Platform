/**
 * LanguageTileWidget - Display Language Program metrics
 * Shows class sessions, cohort duration, volunteer hours, and retention
 */

import { TileCard, MetricRow, MetricGrid, MetricCard } from './TileCard';
import type { LanguageTile } from '@teei/shared-types';

export interface LanguageTileWidgetProps {
  tile: LanguageTile;
  isLoading?: boolean;
  error?: string;
}

export function LanguageTileWidget({ tile, isLoading = false, error }: LanguageTileWidgetProps) {
  const icon = (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z" />
    </svg>
  );

  const footer = (
    <div className="tile-footer">
      {tile.visScore && (
        <span className="tile-footer__metric">
          VIS: <strong>{tile.visScore.toFixed(1)}</strong>
        </span>
      )}
      {tile.sroiRatio && (
        <span className="tile-footer__metric">
          SROI: <strong>{tile.sroiRatio.toFixed(2)}:1</strong>
        </span>
      )}
      <span className="tile-footer__updated">
        Updated {new Date(tile.lastUpdated).toLocaleTimeString()}
      </span>
    </div>
  );

  return (
    <TileCard
      title="Language Learning"
      icon={icon}
      isLoading={isLoading}
      error={error}
      footer={!isLoading && !error ? footer : undefined}
      className="language-tile"
    >
      <div className="tile-content">
        {/* Primary Metrics */}
        <MetricGrid columns={2}>
          <MetricCard
            label="Sessions/Week"
            value={tile.metrics.sessionsPerWeek}
            description="Average frequency"
          />
          <MetricCard
            label="Retention Rate"
            value={`${tile.metrics.retentionRate}%`}
            description="4+ sessions"
          />
          <MetricCard
            label="Volunteer Hours"
            value={tile.metrics.volunteerHours.toFixed(0)}
            suffix="hrs"
          />
          <MetricCard
            label="Attendance"
            value={`${tile.metrics.avgAttendanceRate}%`}
            description="Completion rate"
          />
        </MetricGrid>

        <div className="tile-divider" role="separator" aria-hidden="true"></div>

        {/* Detailed Metrics */}
        <div className="tile-section">
          <h4 className="tile-section__title">Program Details</h4>
          <MetricRow
            label="Participants"
            value={tile.metrics.participantsCount}
            important={true}
          />
          <MetricRow
            label="Total Sessions"
            value={tile.metrics.totalSessions}
          />
          <MetricRow
            label="Active Cohorts"
            value={tile.metrics.activeCohorts}
          />
          <MetricRow
            label="Cohort Duration"
            value={tile.metrics.cohortDurationMonths}
            suffix=" months"
          />
        </div>

        {/* Frequency Breakdown */}
        {tile.frequencyBreakdown && (
          <div className="tile-section">
            <h4 className="tile-section__title">Session Frequency</h4>
            <div className="breakdown-bars" role="group" aria-label="Session frequency breakdown">
              <div className="breakdown-bar">
                <span className="breakdown-bar__label">2×/week</span>
                <div className="breakdown-bar__track" role="progressbar" aria-valuenow={tile.frequencyBreakdown.twicePerWeek} aria-valuemin={0} aria-valuemax={tile.metrics.activeCohorts}>
                  <div
                    className="breakdown-bar__fill"
                    style={{
                      width: `${(tile.frequencyBreakdown.twicePerWeek / tile.metrics.activeCohorts) * 100}%`,
                    }}
                  ></div>
                </div>
                <span className="breakdown-bar__value">{tile.frequencyBreakdown.twicePerWeek}</span>
              </div>
              <div className="breakdown-bar">
                <span className="breakdown-bar__label">3×/week</span>
                <div className="breakdown-bar__track" role="progressbar" aria-valuenow={tile.frequencyBreakdown.thricePerWeek} aria-valuemin={0} aria-valuemax={tile.metrics.activeCohorts}>
                  <div
                    className="breakdown-bar__fill"
                    style={{
                      width: `${(tile.frequencyBreakdown.thricePerWeek / tile.metrics.activeCohorts) * 100}%`,
                    }}
                  ></div>
                </div>
                <span className="breakdown-bar__value">{tile.frequencyBreakdown.thricePerWeek}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </TileCard>
  );
}
