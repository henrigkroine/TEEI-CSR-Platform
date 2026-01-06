/**
 * Scenario Results Component
 *
 * Displays baseline vs. projected metrics with delta indicators
 */

import type { ScenarioResult } from '@teei/shared-types';

interface ScenarioResultsProps {
  result: ScenarioResult | null;
}

export function ScenarioResults({ result }: ScenarioResultsProps) {
  if (!result) {
    return (
      <div className="text-center py-12 text-gray-500" role="status" aria-live="polite">
        <p>Run a scenario to see projected results</p>
      </div>
    );
  }

  const { baseline, projected, confidence, warnings } = result;

  return (
    <div className="scenario-results space-y-6" role="region" aria-label="Scenario Results">
      {/* Confidence Badge */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Projected Results</h3>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            confidence >= 0.8
              ? 'bg-green-100 text-green-800'
              : confidence >= 0.6
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}
          role="status"
          aria-label={`Confidence score: ${(confidence * 100).toFixed(0)}%`}
        >
          Confidence: {(confidence * 100).toFixed(0)}%
        </span>
      </div>

      {/* Warnings */}
      {warnings && warnings.length > 0 && (
        <div
          className="bg-yellow-50 border-l-4 border-yellow-400 p-4"
          role="alert"
          aria-live="polite"
        >
          <p className="font-medium text-yellow-800">⚠️ Warnings:</p>
          <ul className="list-disc list-inside text-sm text-yellow-700 mt-1">
            {warnings.map((warning, idx) => (
              <li key={idx}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* SROI */}
        <MetricCard
          title="SROI"
          baseline={baseline.sroi}
          projected={projected.sroi}
          delta={projected.sroiDelta}
          percentChange={projected.sroiPercentChange}
          format="ratio"
        />

        {/* VIS */}
        <MetricCard
          title="VIS"
          baseline={baseline.vis}
          projected={projected.vis}
          delta={projected.visDelta}
          percentChange={projected.visPercentChange}
          format="score"
        />

        {/* Social Value */}
        <MetricCard
          title="Social Value"
          baseline={baseline.socialValue}
          projected={projected.socialValue}
          delta={projected.socialValueDelta}
          percentChange={projected.socialValuePercentChange}
          format="currency"
        />

        {/* Investment */}
        <MetricCard
          title="Investment"
          baseline={baseline.investment}
          projected={projected.investment}
          delta={projected.investmentDelta}
          percentChange={projected.investmentPercentChange}
          format="currency"
        />
      </div>

      {/* SDG Coverage */}
      <div className="mt-6">
        <h4 className="text-sm font-medium mb-3">SDG Coverage Changes</h4>
        <div className="space-y-2">
          {projected.sdgCoverage.map((sdg) => {
            const baselineSdg = baseline.sdgCoverage.find((s) => s.goalId === sdg.goalId);
            return (
              <div
                key={sdg.goalId}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <span className="text-sm font-medium">SDG {sdg.goalId}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">{baselineSdg?.coverage.toFixed(1)}%</span>
                  <span className="text-sm">→</span>
                  <span className="text-sm font-medium">{sdg.coverage.toFixed(1)}%</span>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded ${
                      sdg.delta > 0
                        ? 'bg-green-100 text-green-700'
                        : sdg.delta < 0
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {sdg.delta > 0 ? '+' : ''}
                    {sdg.delta.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Calculation Metadata */}
      <div className="text-xs text-gray-500 text-right" role="contentinfo">
        Calculated in {result.calculationDurationMs}ms
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  baseline: number;
  projected: number;
  delta: number;
  percentChange: number;
  format: 'ratio' | 'score' | 'currency';
}

function MetricCard({
  title,
  baseline,
  projected,
  delta,
  percentChange,
  format,
}: MetricCardProps) {
  const formatValue = (value: number) => {
    if (format === 'currency') return `$${value.toLocaleString()}`;
    if (format === 'ratio') return `${value.toFixed(2)}:1`;
    return value.toFixed(1);
  };

  const isPositive = delta > 0;
  const isNegative = delta < 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <h4 className="text-sm font-medium text-gray-600 mb-2">{title}</h4>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-2xl font-bold">{formatValue(projected)}</span>
        <span
          className={`text-sm font-medium px-2 py-1 rounded ${
            isPositive
              ? 'bg-green-100 text-green-700'
              : isNegative
              ? 'bg-red-100 text-red-700'
              : 'bg-gray-100 text-gray-700'
          }`}
          aria-label={`Change: ${percentChange.toFixed(1)}%`}
        >
          {isPositive ? '+' : ''}
          {percentChange.toFixed(1)}%
        </span>
      </div>
      <div className="text-xs text-gray-500">
        Baseline: {formatValue(baseline)}
        <span className="ml-2">
          ({isPositive ? '+' : ''}
          {formatValue(delta)})
        </span>
      </div>
    </div>
  );
}
