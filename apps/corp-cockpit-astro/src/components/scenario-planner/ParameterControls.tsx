import type { ScenarioParameters } from '@teei/shared-types';

export interface ParameterControlsProps {
  parameters: ScenarioParameters;
  onChange: (parameters: ScenarioParameters) => void;
}

export default function ParameterControls({ parameters, onChange }: ParameterControlsProps) {
  const handleVolunteerHoursChange = (value: number) => {
    onChange({
      ...parameters,
      volunteerHours: { adjustment: value },
    });
  };

  const handleCampaignBudgetChange = (value: number) => {
    onChange({
      ...parameters,
      campaignBudget: { ...parameters.campaignBudget, adjustment: value, currency: 'EUR' },
    });
  };

  const handleCohortSizeChange = (value: number) => {
    onChange({
      ...parameters,
      cohortSize: { adjustment: value },
    });
  };

  const handleProgramMixChange = (program: string, value: number) => {
    const currentMix = parameters.programMix || {
      buddy: 0.25,
      language: 0.25,
      mentorship: 0.25,
      upskilling: 0.25,
    };

    // Distribute remaining percentage equally among other programs
    const otherPrograms = ['buddy', 'language', 'mentorship', 'upskilling'].filter(
      (p) => p !== program
    );
    const remaining = 1.0 - value;
    const perOther = remaining / otherPrograms.length;

    const newMix = { ...currentMix, [program]: value };
    otherPrograms.forEach((p) => {
      newMix[p as keyof typeof newMix] = perOther;
    });

    onChange({
      ...parameters,
      programMix: newMix,
    });
  };

  const volunteerHoursAdjustment = parameters.volunteerHours?.adjustment || 1.0;
  const campaignBudgetAdjustment = parameters.campaignBudget?.adjustment || 1.0;
  const cohortSizeAdjustment = parameters.cohortSize?.adjustment || 1.0;

  return (
    <div className="space-y-6">
      {/* Volunteer Hours */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Volunteer Hours
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({((volunteerHoursAdjustment - 1) * 100).toFixed(0)}% change)
          </span>
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={volunteerHoursAdjustment}
            onChange={(e) => handleVolunteerHoursChange(parseFloat(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            aria-label="Adjust volunteer hours multiplier"
            aria-valuemin={0.5}
            aria-valuemax={2.0}
            aria-valuenow={volunteerHoursAdjustment}
            aria-valuetext={`${(volunteerHoursAdjustment * 100).toFixed(0)}% of baseline`}
          />
          <input
            type="number"
            value={volunteerHoursAdjustment.toFixed(1)}
            onChange={(e) => handleVolunteerHoursChange(parseFloat(e.target.value) || 1.0)}
            min="0.5"
            max="2.0"
            step="0.1"
            className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
            aria-label="Volunteer hours multiplier value"
          />
        </div>
        <div className="mt-1 text-xs text-gray-500 flex justify-between">
          <span>50% (-50%)</span>
          <span>Baseline (100%)</span>
          <span>200% (+100%)</span>
        </div>
      </div>

      {/* Campaign Budget */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Campaign Budget (EUR)
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({((campaignBudgetAdjustment - 1) * 100).toFixed(0)}% change)
          </span>
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0.5"
            max="3.0"
            step="0.1"
            value={campaignBudgetAdjustment}
            onChange={(e) => handleCampaignBudgetChange(parseFloat(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            aria-label="Adjust campaign budget multiplier"
            aria-valuemin={0.5}
            aria-valuemax={3.0}
            aria-valuenow={campaignBudgetAdjustment}
            aria-valuetext={`${(campaignBudgetAdjustment * 100).toFixed(0)}% of baseline`}
          />
          <input
            type="number"
            value={campaignBudgetAdjustment.toFixed(1)}
            onChange={(e) => handleCampaignBudgetChange(parseFloat(e.target.value) || 1.0)}
            min="0.5"
            max="3.0"
            step="0.1"
            className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
            aria-label="Campaign budget multiplier value"
          />
        </div>
        <div className="mt-1 text-xs text-gray-500 flex justify-between">
          <span>50%</span>
          <span>Baseline</span>
          <span>300%</span>
        </div>
      </div>

      {/* Cohort Size */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Cohort Size (Participants)
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({((cohortSizeAdjustment - 1) * 100).toFixed(0)}% change)
          </span>
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0.5"
            max="2.5"
            step="0.1"
            value={cohortSizeAdjustment}
            onChange={(e) => handleCohortSizeChange(parseFloat(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            aria-label="Adjust cohort size multiplier"
            aria-valuemin={0.5}
            aria-valuemax={2.5}
            aria-valuenow={cohortSizeAdjustment}
            aria-valuetext={`${(cohortSizeAdjustment * 100).toFixed(0)}% of baseline`}
          />
          <input
            type="number"
            value={cohortSizeAdjustment.toFixed(1)}
            onChange={(e) => handleCohortSizeChange(parseFloat(e.target.value) || 1.0)}
            min="0.5"
            max="2.5"
            step="0.1"
            className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
            aria-label="Cohort size multiplier value"
          />
        </div>
        <div className="mt-1 text-xs text-gray-500 flex justify-between">
          <span>50%</span>
          <span>Baseline</span>
          <span>250%</span>
        </div>
      </div>

      {/* Program Mix */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Program Mix
          <span className="ml-2 text-xs font-normal text-gray-500">
            (must total 100%)
          </span>
        </label>
        <div className="space-y-4">
          {/* Buddy Program */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700 dark:text-gray-300">Buddy System</span>
              <span className="text-gray-600 dark:text-gray-400">
                {((parameters.programMix?.buddy || 0.25) * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={parameters.programMix?.buddy || 0.25}
              onChange={(e) => handleProgramMixChange('buddy', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              aria-label="Buddy program allocation percentage"
              aria-valuemin={0}
              aria-valuemax={1}
              aria-valuenow={parameters.programMix?.buddy || 0.25}
              aria-valuetext={`${((parameters.programMix?.buddy || 0.25) * 100).toFixed(0)} percent`}
            />
          </div>

          {/* Language Program */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700 dark:text-gray-300">Language Training</span>
              <span className="text-gray-600 dark:text-gray-400">
                {((parameters.programMix?.language || 0.25) * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={parameters.programMix?.language || 0.25}
              onChange={(e) => handleProgramMixChange('language', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              aria-label="Language program allocation percentage"
            />
          </div>

          {/* Mentorship Program */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700 dark:text-gray-300">Mentorship</span>
              <span className="text-gray-600 dark:text-gray-400">
                {((parameters.programMix?.mentorship || 0.25) * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={parameters.programMix?.mentorship || 0.25}
              onChange={(e) => handleProgramMixChange('mentorship', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              aria-label="Mentorship program allocation percentage"
            />
          </div>

          {/* Upskilling Program */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700 dark:text-gray-300">Upskilling</span>
              <span className="text-gray-600 dark:text-gray-400">
                {((parameters.programMix?.upskilling || 0.25) * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={parameters.programMix?.upskilling || 0.25}
              onChange={(e) => handleProgramMixChange('upskilling', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              aria-label="Upskilling program allocation percentage"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
