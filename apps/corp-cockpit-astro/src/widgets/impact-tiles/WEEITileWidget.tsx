import React from 'react';
import TileCard, { MetricRow, ProgressBar } from './TileCard';
import type { WEEITile } from '@teei/shared-types';

interface WEEITileWidgetProps {
  tile: WEEITile;
  loading?: boolean;
  error?: string | null;
  onExport?: () => void;
}

/**
 * WEEI Tile Widget
 * Displays metrics for Women's Economic Empowerment Initiative
 */
export default function WEEITileWidget({
  tile,
  loading = false,
  error = null,
  onExport,
}: WEEITileWidgetProps) {
  const { data } = tile;

  return (
    <TileCard
      title="WEEI (Women's Empowerment)"
      subtitle={`${tile.metadata.period.start} to ${tile.metadata.period.end}`}
      icon="👩‍💼"
      loading={loading}
      error={error}
      onExport={onExport}
      ariaLabel="Women's Economic Empowerment Initiative metrics"
    >
      {/* Stages */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Program Stages</h4>
        <div className="space-y-3">
          {/* U:LEARN */}
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-blue-900">U:LEARN</span>
              <span className="text-xs text-blue-700">
                {data.stages.ULEARN.completions} / {data.stages.ULEARN.enrollments}
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${data.stages.ULEARN.completionRate * 100}%` }}
              ></div>
            </div>
            <span className="text-xs text-blue-700">
              {(data.stages.ULEARN.completionRate * 100).toFixed(1)}% completion
            </span>
          </div>

          {/* U:START */}
          <div className="bg-green-50 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-green-900">U:START</span>
              <span className="text-xs text-green-700">
                {data.stages.USTART.completions} / {data.stages.USTART.enrollments}
              </span>
            </div>
            <div className="w-full bg-green-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{ width: `${data.stages.USTART.completionRate * 100}%` }}
              ></div>
            </div>
            <span className="text-xs text-green-700">
              {(data.stages.USTART.completionRate * 100).toFixed(1)}% completion
            </span>
          </div>

          {/* U:GROW */}
          <div className="bg-yellow-50 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-yellow-900">U:GROW</span>
              <span className="text-xs text-yellow-700">
                {data.stages.UGROW.completions} / {data.stages.UGROW.enrollments}
              </span>
            </div>
            <div className="w-full bg-yellow-200 rounded-full h-2">
              <div
                className="bg-yellow-600 h-2 rounded-full"
                style={{ width: `${data.stages.UGROW.completionRate * 100}%` }}
              ></div>
            </div>
            <span className="text-xs text-yellow-700">
              {(data.stages.UGROW.completionRate * 100).toFixed(1)}% completion
            </span>
          </div>

          {/* U:LEAD */}
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-purple-900">U:LEAD</span>
              <span className="text-xs text-purple-700">
                {data.stages.ULEAD.completions} / {data.stages.ULEAD.enrollments}
              </span>
            </div>
            <div className="w-full bg-purple-200 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full"
                style={{ width: `${data.stages.ULEAD.completionRate * 100}%` }}
              ></div>
            </div>
            <span className="text-xs text-purple-700">
              {(data.stages.ULEAD.completionRate * 100).toFixed(1)}% completion
            </span>
          </div>
        </div>
      </div>

      {/* Overall Throughput */}
      <div className="border-t border-gray-200 pt-3 mt-3">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Overall Throughput</h4>
        <MetricRow label="Total Enrollments" value={data.throughput.totalEnrollments} />
        <MetricRow label="Total Completions" value={data.throughput.totalCompletions} trend="up" />
        <MetricRow
          label="Avg Time to Complete"
          value={data.throughput.avgTimeToComplete.toFixed(1)}
          unit=" weeks"
        />
        <div className="mt-2">
          <ProgressBar
            label="Overall Completion Rate"
            current={data.throughput.overallCompletionRate * 100}
            target={70}
            max={100}
            unit="%"
          />
        </div>
      </div>

      {/* Progression Between Stages */}
      <div className="border-t border-gray-200 pt-3 mt-3">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Stage Progression</h4>
        <MetricRow
          label="U:LEARN → U:START"
          value={(data.progression.learnToStart * 100).toFixed(1)}
          unit="%"
        />
        <MetricRow
          label="U:START → U:GROW"
          value={(data.progression.startToGrow * 100).toFixed(1)}
          unit="%"
        />
        <MetricRow
          label="U:GROW → U:LEAD"
          value={(data.progression.growToLead * 100).toFixed(1)}
          unit="%"
        />
      </div>

      {/* Demo Day */}
      <div className="border-t border-gray-200 pt-3 mt-3">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Demo Days</h4>
        <MetricRow label="Demo Days Held" value={data.demoDay.demoDayCount} />
        <MetricRow label="Total Presentations" value={data.demoDay.totalPresentations} />
        <MetricRow label="Unique Participants" value={data.demoDay.uniqueParticipants} />
        <MetricRow
          label="Avg Presentations/Demo"
          value={data.demoDay.avgPresentationsPerDemoDay.toFixed(2)}
        />
      </div>

      {/* Business Outcomes */}
      {data.businessOutcomes && (
        <div className="border-t border-gray-200 pt-3 mt-3">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Business Outcomes</h4>
          <MetricRow label="Businesses Started" value={data.businessOutcomes.businessesStarted} />
          <MetricRow label="Jobs Created" value={data.businessOutcomes.jobsCreated} />
          {data.businessOutcomes.revenueGenerated && (
            <MetricRow
              label="Revenue Generated"
              value={`$${data.businessOutcomes.revenueGenerated.toLocaleString()}`}
            />
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
