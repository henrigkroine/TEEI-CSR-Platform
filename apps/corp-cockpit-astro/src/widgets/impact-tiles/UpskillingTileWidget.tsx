import React from 'react';
import TileCard, { MetricRow, ProgressBar } from './TileCard';
import type { UpskillingTile } from '@teei/shared-types';

interface UpskillingTileWidgetProps {
  tile: UpskillingTile;
  loading?: boolean;
  error?: string | null;
  onExport?: () => void;
}

/**
 * Upskilling Tile Widget
 * Displays metrics for Upskilling program
 */
export default function UpskillingTileWidget({
  tile,
  loading = false,
  error = null,
  onExport,
}: UpskillingTileWidgetProps) {
  const { data } = tile;

  return (
    <TileCard
      title="Upskilling"
      subtitle={`${tile.metadata.period.start} to ${tile.metadata.period.end}`}
      icon="🎓"
      loading={loading}
      error={error}
      onExport={onExport}
      ariaLabel="Upskilling program metrics"
    >
      {/* Funnel */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Learner Funnel</h4>
        <MetricRow label="Enrollments" value={data.funnel.enrollments} />
        <MetricRow label="In Progress" value={data.funnel.inProgress} />
        <MetricRow label="Completions" value={data.funnel.completions} trend="up" />
        <MetricRow label="Placements" value={data.funnel.placements} trend="up" />

        <div className="mt-3 space-y-2">
          <ProgressBar
            label="Completion Rate"
            current={data.funnel.completionRate * 100}
            target={70}
            max={100}
            unit="%"
          />
          <ProgressBar
            label="Placement Rate"
            current={data.funnel.placementRate * 100}
            target={60}
            max={100}
            unit="%"
          />
        </div>
      </div>

      {/* Course Locales */}
      <div className="border-t border-gray-200 pt-3 mt-3">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Course Locales</h4>
        <div className="grid grid-cols-2 gap-2">
          {data.locales.UA && (
            <div className="flex justify-between items-center bg-gray-50 rounded px-3 py-2">
              <span className="text-sm text-gray-700">🇺🇦 UA</span>
              <span className="text-sm font-medium">{data.locales.UA}</span>
            </div>
          )}
          {data.locales.EN && (
            <div className="flex justify-between items-center bg-gray-50 rounded px-3 py-2">
              <span className="text-sm text-gray-700">🇬🇧 EN</span>
              <span className="text-sm font-medium">{data.locales.EN}</span>
            </div>
          )}
          {data.locales.DE && (
            <div className="flex justify-between items-center bg-gray-50 rounded px-3 py-2">
              <span className="text-sm text-gray-700">🇩🇪 DE</span>
              <span className="text-sm font-medium">{data.locales.DE}</span>
            </div>
          )}
          {data.locales.NO && (
            <div className="flex justify-between items-center bg-gray-50 rounded px-3 py-2">
              <span className="text-sm text-gray-700">🇳🇴 NO</span>
              <span className="text-sm font-medium">{data.locales.NO}</span>
            </div>
          )}
        </div>
      </div>

      {/* Course Details */}
      <div className="border-t border-gray-200 pt-3 mt-3">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Courses</h4>
        <MetricRow label="Total Courses" value={data.courses.totalCourses} />
        <MetricRow label="Active Courses" value={data.courses.activeCourses} />
        <MetricRow
          label="Avg Duration"
          value={data.courses.avgCourseDuration.toFixed(1)}
          unit=" weeks"
        />
      </div>

      {/* Top Courses */}
      {data.courses.topCourses && data.courses.topCourses.length > 0 && (
        <div className="border-t border-gray-200 pt-3 mt-3">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Top Courses</h4>
          <div className="space-y-2">
            {data.courses.topCourses.map((course, idx) => (
              <div key={idx} className="bg-gray-50 rounded p-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-900">{course.courseName}</span>
                  <span className="text-xs text-gray-600">{course.enrollments} enrolled</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full"
                    style={{ width: `${course.completionRate * 100}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-600">
                  {(course.completionRate * 100).toFixed(1)}% completion
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {data.skills && (
        <div className="border-t border-gray-200 pt-3 mt-3">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Skills Acquired</h4>
          <MetricRow label="Total Skills" value={data.skills.totalSkillsAcquired} />
          <MetricRow
            label="Avg Skills/Learner"
            value={data.skills.avgSkillsPerLearner.toFixed(2)}
          />
          {data.skills.topSkills && data.skills.topSkills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {data.skills.topSkills.map((skill, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
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
