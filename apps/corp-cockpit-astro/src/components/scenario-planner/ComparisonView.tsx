import type { ScenarioResult, MetricDelta } from '@teei/shared-types';

export interface ComparisonViewProps {
  result: ScenarioResult;
}

function DeltaIndicator({ delta }: { delta: MetricDelta }) {
  const isPositive = delta.delta >= 0;
  const color = isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
        {delta.metric.replace(/_/g, ' ').toUpperCase()}
      </h3>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Baseline:</span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {delta.baseline.toFixed(2)} {delta.unit || ''}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Scenario:</span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {delta.scenario.toFixed(2)} {delta.unit || ''}
          </span>
        </div>

        <div className={`flex justify-between items-center ${color} font-bold`}>
          <span className="text-xs">Delta:</span>
          <span className="text-lg flex items-center">
            {isPositive ? '↑' : '↓'}
            {Math.abs(delta.delta).toFixed(2)} ({delta.deltaPercent.toFixed(1)}%)
          </span>
        </div>
      </div>

      {/* Visual Bar */}
      <div className="mt-3 relative h-6 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
        <div
          className={`absolute left-0 top-0 h-full ${isPositive ? 'bg-green-500' : 'bg-red-500'} transition-all`}
          style={{ width: `${Math.min(Math.abs(delta.deltaPercent), 100)}%` }}
          role="progressbar"
          aria-valuenow={delta.deltaPercent}
          aria-valuemin={-100}
          aria-valuemax={100}
          aria-label={`${delta.metric} change: ${delta.deltaPercent.toFixed(1)} percent`}
        />
      </div>
    </div>
  );
}

export default function ComparisonView({ result }: ComparisonViewProps) {
  const { metrics, sdgCoverage, metadata } = result;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Scenario Results
        </h2>
        <div className="text-xs text-gray-500">
          Calculated in {metadata.calculationDurationMs}ms
        </div>
      </div>

      {/* Metric Deltas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {metrics.vis && <DeltaIndicator delta={metrics.vis} />}
        {metrics.sroi && <DeltaIndicator delta={metrics.sroi} />}
        {metrics.totalVolunteerHours && <DeltaIndicator delta={metrics.totalVolunteerHours} />}
        {metrics.totalParticipants && <DeltaIndicator delta={metrics.totalParticipants} />}
        {metrics.totalGrantAmount && <DeltaIndicator delta={metrics.totalGrantAmount} />}
      </div>

      {/* SDG Coverage Impact */}
      {sdgCoverage && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
            SDG Coverage Impact
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Baseline Coverage ({sdgCoverage.baseline.length} targets)
              </h4>
              <ul className="space-y-1">
                {sdgCoverage.baseline.map((target, idx) => (
                  <li key={idx} className="text-xs text-gray-600 dark:text-gray-400">
                    SDG {target.goal}.{target.target}: {target.description}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Scenario Coverage ({sdgCoverage.scenario.length} targets)
              </h4>
              <ul className="space-y-1">
                {sdgCoverage.scenario.map((target, idx) => (
                  <li key={idx} className="text-xs text-gray-600 dark:text-gray-400">
                    SDG {target.goal}.{target.target}: {target.description}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* New and Lost Targets */}
          {(sdgCoverage.newTargets.length > 0 || sdgCoverage.lostTargets.length > 0) && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {sdgCoverage.newTargets.length > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
                  <h5 className="text-sm font-medium text-green-800 dark:text-green-300 mb-1">
                    New Targets ({sdgCoverage.newTargets.length})
                  </h5>
                  <ul className="space-y-1">
                    {sdgCoverage.newTargets.map((target, idx) => (
                      <li key={idx} className="text-xs text-green-700 dark:text-green-400">
                        + SDG {target.goal}.{target.target}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {sdgCoverage.lostTargets.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded">
                  <h5 className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                    Lost Targets ({sdgCoverage.lostTargets.length})
                  </h5>
                  <ul className="space-y-1">
                    {sdgCoverage.lostTargets.map((target, idx) => (
                      <li key={idx} className="text-xs text-red-700 dark:text-red-400">
                        - SDG {target.goal}.{target.target}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Metadata & Warnings */}
      {metadata.warnings && metadata.warnings.length > 0 && (
        <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded">
          <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">
            Warnings
          </h4>
          <ul className="list-disc list-inside space-y-1">
            {metadata.warnings.map((warning, idx) => (
              <li key={idx} className="text-xs text-yellow-700 dark:text-yellow-400">
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
