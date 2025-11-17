import { useState, useEffect } from 'react';
import type { Scenario, ScenarioParameters, ScenarioResult } from '@teei/shared-types';
import ParameterControls from './ParameterControls';
import ComparisonView from './ComparisonView';
import ScenarioList from './ScenarioList';

export interface ScenarioPlannerProps {
  companyId: string;
  companyName: string;
  onError?: (error: Error) => void;
}

export default function ScenarioPlanner({
  companyId,
  companyName,
  onError,
}: ScenarioPlannerProps) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [parameters, setParameters] = useState<ScenarioParameters>({
    volunteerHours: { adjustment: 1.0 },
    grantAmount: { adjustment: 1.0, currency: 'EUR' },
    cohortSize: { adjustment: 1.0 },
    programMix: { buddy: 0.25, language: 0.25, mentorship: 0.25, upskilling: 0.25 },
  });
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Fetch scenarios on load
  useEffect(() => {
    fetchScenarios();
  }, [companyId]);

  const fetchScenarios = async () => {
    try {
      const response = await fetch(`/v1/scenarios?companyId=${companyId}&limit=50`);
      if (!response.ok) throw new Error('Failed to fetch scenarios');
      const data = await response.json();
      setScenarios(data.scenarios || []);
    } catch (error) {
      console.error('Error fetching scenarios:', error);
      onError?.(error as Error);
    }
  };

  const handleRunScenario = async () => {
    setLoading(true);
    try {
      // Create temporary scenario
      const createResponse = await fetch('/v1/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          name: scenarioName || `Scenario ${new Date().toISOString()}`,
          description: 'Temporary scenario for what-if analysis',
          parameters,
          executeImmediately: true,
        }),
      });

      if (!createResponse.ok) throw new Error('Failed to create scenario');
      const scenario: Scenario = await createResponse.json();

      setResult(scenario.result || null);
      setSelectedScenario(scenario);
    } catch (error) {
      console.error('Error running scenario:', error);
      onError?.(error as Error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveScenario = async () => {
    if (!scenarioName.trim()) {
      alert('Please enter a scenario name');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/v1/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          name: scenarioName,
          description: `Saved scenario with ${Object.keys(parameters).length} parameter adjustments`,
          parameters,
          executeImmediately: false,
        }),
      });

      if (!response.ok) throw new Error('Failed to save scenario');
      const scenario: Scenario = await response.json();

      setScenarios([scenario, ...scenarios]);
      setShowSaveModal(false);
      setScenarioName('');
      alert('Scenario saved successfully!');
    } catch (error) {
      console.error('Error saving scenario:', error);
      onError?.(error as Error);
    } finally {
      setSaving(false);
    }
  };

  const handleLoadScenario = async (scenario: Scenario) => {
    setSelectedScenario(scenario);
    setParameters(scenario.parameters);
    setScenarioName(scenario.name);

    // Execute if not already executed
    if (!scenario.result) {
      setLoading(true);
      try {
        const response = await fetch(`/v1/scenarios/${scenario.id}/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyId }),
        });

        if (!response.ok) throw new Error('Failed to execute scenario');
        const execResult = await response.json();
        setResult(execResult.result);

        // Update scenario in list
        setScenarios(
          scenarios.map((s) => (s.id === scenario.id ? { ...s, result: execResult.result } : s))
        );
      } catch (error) {
        console.error('Error executing scenario:', error);
        onError?.(error as Error);
      } finally {
        setLoading(false);
      }
    } else {
      setResult(scenario.result);
    }
  };

  const handleExportDeck = async () => {
    if (!selectedScenario) {
      alert('Please run a scenario first');
      return;
    }

    try {
      const response = await fetch(
        `/v1/scenarios/${selectedScenario.id}/export/deck?format=json`,
        { method: 'POST' }
      );

      if (!response.ok) throw new Error('Failed to export scenario');
      const payload = await response.json();

      // Download JSON
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scenario-${selectedScenario.name}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting scenario:', error);
      onError?.(error as Error);
    }
  };

  const handleReset = () => {
    setParameters({
      volunteerHours: { adjustment: 1.0 },
      grantAmount: { adjustment: 1.0, currency: 'EUR' },
      cohortSize: { adjustment: 1.0 },
      programMix: { buddy: 0.25, language: 0.25, mentorship: 0.25, upskilling: 0.25 },
    });
    setResult(null);
    setSelectedScenario(null);
    setScenarioName('');
  };

  return (
    <div className="scenario-planner min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Scenario Planner
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Model "what-if" scenarios to forecast impact on VIS, SROI, and SDG metrics for{' '}
            {companyName}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Parameter Controls */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Scenario Parameters
                </h2>
                <button
                  onClick={handleReset}
                  className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  aria-label="Reset parameters to baseline"
                >
                  Reset
                </button>
              </div>

              <ParameterControls
                parameters={parameters}
                onChange={setParameters}
              />

              {/* Action Buttons */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleRunScenario}
                  disabled={loading}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  aria-label="Run scenario simulation"
                >
                  {loading ? 'Running...' : 'Run Scenario'}
                </button>
                <button
                  onClick={() => setShowSaveModal(true)}
                  disabled={!result}
                  className="bg-secondary-600 hover:bg-secondary-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  aria-label="Save scenario"
                >
                  Save
                </button>
                <button
                  onClick={handleExportDeck}
                  disabled={!selectedScenario}
                  className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  aria-label="Export scenario to deck"
                >
                  Export
                </button>
              </div>
            </div>

            {/* Comparison View */}
            {result && (
              <div className="mt-6">
                <ComparisonView result={result} />
              </div>
            )}
          </div>

          {/* Right Column: Saved Scenarios */}
          <div className="lg:col-span-1">
            <ScenarioList
              scenarios={scenarios}
              selectedScenario={selectedScenario}
              onLoad={handleLoadScenario}
              onDelete={(id) => {
                setScenarios(scenarios.filter((s) => s.id !== id));
              }}
            />
          </div>
        </div>

        {/* Save Modal */}
        {showSaveModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowSaveModal(false)}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Save Scenario
              </h3>
              <input
                type="text"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                placeholder="Enter scenario name"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                aria-label="Scenario name"
              />
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleSaveScenario}
                  disabled={saving || !scenarioName.trim()}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium py-2 px-4 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
