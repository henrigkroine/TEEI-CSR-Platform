/**
 * Scenario Builder Component
 *
 * Interactive UI for creating and adjusting scenario parameters
 */

import { useState } from 'react';
import type { ScenarioParameters } from '@teei/shared-types';

interface ScenarioBuilderProps {
  initialParams?: ScenarioParameters;
  onParamsChange: (params: ScenarioParameters) => void;
  onRun: () => void;
  isRunning?: boolean;
}

export function ScenarioBuilder({
  initialParams = {},
  onParamsChange,
  onRun,
  isRunning = false,
}: ScenarioBuilderProps) {
  const [params, setParams] = useState<ScenarioParameters>(initialParams);

  const updateParam = (key: keyof ScenarioParameters, value: any) => {
    const updated = { ...params, [key]: value };
    setParams(updated);
    onParamsChange(updated);
  };

  const updateProgramMix = (program: string, value: number) => {
    const updated = {
      ...params,
      programMix: {
        ...params.programMix,
        [program]: value,
      },
    };
    setParams(updated);
    onParamsChange(updated);
  };

  const programMixTotal =
    (params.programMix?.buddySystem || 0) +
    (params.programMix?.skillShare || 0) +
    (params.programMix?.mentorship || 0) +
    (params.programMix?.communityEvents || 0);

  const programMixValid = Math.abs(programMixTotal - 100) < 1 || programMixTotal === 0;

  return (
    <div className="scenario-builder" role="region" aria-label="Scenario Parameters">
      <div className="space-y-6">
        {/* Cohort Size */}
        <div className="parameter-group">
          <label htmlFor="cohort-size" className="block text-sm font-medium mb-2">
            Cohort Size Multiplier
            <span className="text-gray-500 ml-2">
              ({((params.cohortSizeMultiplier || 1.0) * 100 - 100).toFixed(0)}% change)
            </span>
          </label>
          <input
            id="cohort-size"
            type="range"
            min="0.5"
            max="3.0"
            step="0.1"
            value={params.cohortSizeMultiplier || 1.0}
            onChange={(e) => updateParam('cohortSizeMultiplier', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            aria-valuemin={0.5}
            aria-valuemax={3.0}
            aria-valuenow={params.cohortSizeMultiplier || 1.0}
            aria-label="Cohort size multiplier slider"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0.5x (50% decrease)</span>
            <span>1.0x (baseline)</span>
            <span>3.0x (200% increase)</span>
          </div>
        </div>

        {/* Investment Multiplier */}
        <div className="parameter-group">
          <label htmlFor="investment" className="block text-sm font-medium mb-2">
            Investment Multiplier
            <span className="text-gray-500 ml-2">
              ({((params.investmentMultiplier || 1.0) * 100 - 100).toFixed(0)}% change)
            </span>
          </label>
          <input
            id="investment"
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={params.investmentMultiplier || 1.0}
            onChange={(e) => updateParam('investmentMultiplier', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            aria-valuemin={0.5}
            aria-valuemax={2.0}
            aria-valuenow={params.investmentMultiplier || 1.0}
            aria-label="Investment multiplier slider"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0.5x</span>
            <span>1.0x</span>
            <span>2.0x</span>
          </div>
        </div>

        {/* Grant Amount Delta */}
        <div className="parameter-group">
          <label htmlFor="grant-delta" className="block text-sm font-medium mb-2">
            Grant Amount Change (USD)
          </label>
          <input
            id="grant-delta"
            type="number"
            value={params.grantAmountDelta || 0}
            onChange={(e) => updateParam('grantAmountDelta', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., 5000 or -1000"
            aria-label="Grant amount change in USD"
          />
        </div>

        {/* Cohort Duration */}
        <div className="parameter-group">
          <label htmlFor="duration" className="block text-sm font-medium mb-2">
            Cohort Duration (Months)
          </label>
          <input
            id="duration"
            type="number"
            min="1"
            max="60"
            value={params.cohortDurationMonths || ''}
            onChange={(e) =>
              updateParam('cohortDurationMonths', parseInt(e.target.value) || undefined)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            placeholder="Leave empty for baseline"
            aria-label="Cohort duration in months"
          />
        </div>

        {/* Program Mix */}
        <div className="parameter-group">
          <h3 className="text-sm font-medium mb-3">
            Program Mix
            <span className={`ml-2 text-xs ${programMixValid ? 'text-green-600' : 'text-red-600'}`}>
              ({programMixTotal}% {!programMixValid && '⚠ Should sum to 100%'})
            </span>
          </h3>

          <div className="space-y-3">
            <div>
              <label htmlFor="buddy-system" className="text-xs text-gray-600">
                Buddy System
              </label>
              <input
                id="buddy-system"
                type="range"
                min="0"
                max="100"
                step="5"
                value={params.programMix?.buddySystem || 40}
                onChange={(e) => updateProgramMix('buddySystem', parseFloat(e.target.value))}
                className="w-full h-2 bg-blue-200 rounded-lg"
                aria-label="Buddy System allocation percentage"
              />
              <span className="text-xs">{params.programMix?.buddySystem || 40}%</span>
            </div>

            <div>
              <label htmlFor="skill-share" className="text-xs text-gray-600">
                Skill Share
              </label>
              <input
                id="skill-share"
                type="range"
                min="0"
                max="100"
                step="5"
                value={params.programMix?.skillShare || 30}
                onChange={(e) => updateProgramMix('skillShare', parseFloat(e.target.value))}
                className="w-full h-2 bg-purple-200 rounded-lg"
                aria-label="Skill Share allocation percentage"
              />
              <span className="text-xs">{params.programMix?.skillShare || 30}%</span>
            </div>

            <div>
              <label htmlFor="mentorship" className="text-xs text-gray-600">
                Mentorship
              </label>
              <input
                id="mentorship"
                type="range"
                min="0"
                max="100"
                step="5"
                value={params.programMix?.mentorship || 20}
                onChange={(e) => updateProgramMix('mentorship', parseFloat(e.target.value))}
                className="w-full h-2 bg-green-200 rounded-lg"
                aria-label="Mentorship allocation percentage"
              />
              <span className="text-xs">{params.programMix?.mentorship || 20}%</span>
            </div>

            <div>
              <label htmlFor="community-events" className="text-xs text-gray-600">
                Community Events
              </label>
              <input
                id="community-events"
                type="range"
                min="0"
                max="100"
                step="5"
                value={params.programMix?.communityEvents || 10}
                onChange={(e) => updateProgramMix('communityEvents', parseFloat(e.target.value))}
                className="w-full h-2 bg-yellow-200 rounded-lg"
                aria-label="Community Events allocation percentage"
              />
              <span className="text-xs">{params.programMix?.communityEvents || 10}%</span>
            </div>
          </div>
        </div>

        {/* Run Button */}
        <button
          onClick={onRun}
          disabled={isRunning || !programMixValid}
          className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="Run scenario calculation"
        >
          {isRunning ? 'Running Scenario...' : 'Run Scenario'}
        </button>
      </div>
    </div>
  );
}
