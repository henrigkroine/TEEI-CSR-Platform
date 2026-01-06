/**
 * Scenario Planner Main Component
 *
 * Orchestrates scenario creation, execution, and visualization
 */

import { useState } from 'react';
import type {
  ScenarioParameters,
  ScenarioResult,
  CreateScenarioRequest,
} from '@teei/shared-types';
import { ScenarioBuilder } from './ScenarioBuilder';
import { ScenarioResults } from './ScenarioResults';

interface ScenarioPlannerProps {
  companyId: string;
  tenantId: string;
}

export function ScenarioPlanner({ companyId, tenantId }: ScenarioPlannerProps) {
  const [scenarioName, setScenarioName] = useState('New Scenario');
  const [scenarioDescription, setScenarioDescription] = useState('');
  const [parameters, setParameters] = useState<ScenarioParameters>({});
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedScenarioId, setSavedScenarioId] = useState<string | null>(null);

  const handleRunScenario = async () => {
    setIsRunning(true);
    setError(null);

    try {
      // First, create/update scenario
      const scenarioId = await saveScenario();

      // Then run it
      const response = await fetch(
        `/api/scenarios/${scenarioId}/run`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to run scenario');
      }

      const result: ScenarioResult = await response.json();
      setResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run scenario');
    } finally {
      setIsRunning(false);
    }
  };

  const saveScenario = async (): Promise<string> => {
    setIsSaving(true);
    try {
      if (savedScenarioId) {
        // Update existing
        const response = await fetch(`/api/scenarios/${savedScenarioId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: scenarioName,
            description: scenarioDescription,
            parameters,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update scenario');
        }

        return savedScenarioId;
      } else {
        // Create new
        const request: CreateScenarioRequest = {
          tenantId,
          companyId,
          name: scenarioName,
          description: scenarioDescription,
          parameters,
        };

        const response = await fetch('/api/scenarios', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          throw new Error('Failed to create scenario');
        }

        const scenario = await response.json();
        setSavedScenarioId(scenario.id);
        return scenario.id;
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      await saveScenario();
      alert('Scenario saved successfully');
    } catch (err) {
      alert('Failed to save scenario');
    }
  };

  return (
    <div className="scenario-planner max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Scenario Planner</h1>
        <p className="text-gray-600">
          Model different program configurations and see projected SROI, VIS, and SDG impacts
        </p>
      </div>

      {/* Scenario Metadata */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="scenario-name" className="block text-sm font-medium mb-1">
              Scenario Name
            </label>
            <input
              id="scenario-name"
              type="text"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Q4 Growth Plan"
            />
          </div>
          <div>
            <label htmlFor="scenario-description" className="block text-sm font-medium mb-1">
              Description (Optional)
            </label>
            <input
              id="scenario-description"
              type="text"
              value={scenarioDescription}
              onChange={(e) => setScenarioDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Model 50% cohort increase"
            />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            {isSaving ? 'Saving...' : savedScenarioId ? 'Update' : 'Save'}
          </button>
          {savedScenarioId && (
            <span className="flex items-center text-sm text-green-600">
              ✓ Saved
            </span>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6" role="alert">
          <p className="font-medium text-red-800">Error</p>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Main Grid: Builder + Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Parameter Builder */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Parameters</h2>
          <ScenarioBuilder
            initialParams={parameters}
            onParamsChange={setParameters}
            onRun={handleRunScenario}
            isRunning={isRunning}
          />
        </div>

        {/* Right: Results */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Results</h2>
          <ScenarioResults result={result} />
        </div>
      </div>

      {/* Quick Tips */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">💡 Quick Tips</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>
            <strong>Cohort Size Multiplier</strong>: Model scaling your program (1.5x = 50% more
            participants)
          </li>
          <li>
            <strong>Investment Multiplier</strong>: Account for cost changes (1.2x = 20% more
            budget)
          </li>
          <li>
            <strong>Program Mix</strong>: Reallocate resources to see SDG impact (must sum to 100%)
          </li>
          <li>
            <strong>Confidence</strong>: Green (≥80%) = realistic, Yellow (60-80%) = moderate risk,
            Red (&lt;60%) = high uncertainty
          </li>
        </ul>
      </div>
    </div>
  );
}
