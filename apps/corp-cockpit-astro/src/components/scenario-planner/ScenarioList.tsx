import { useState } from 'react';
import type { Scenario } from '@teei/shared-types';

export interface ScenarioListProps {
  scenarios: Scenario[];
  selectedScenario: Scenario | null;
  onLoad: (scenario: Scenario) => void;
  onDelete: (scenarioId: string) => void;
}

export default function ScenarioList({
  scenarios,
  selectedScenario,
  onLoad,
  onDelete,
}: ScenarioListProps) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDelete = async (scenarioId: string) => {
    try {
      const response = await fetch(`/v1/scenarios/${scenarioId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete scenario');

      onDelete(scenarioId);
      setConfirmDelete(null);
    } catch (error) {
      console.error('Error deleting scenario:', error);
      alert('Failed to delete scenario');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Saved Scenarios
      </h2>

      {scenarios.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
          No saved scenarios yet.
          <br />
          Create and save a scenario to see it here.
        </p>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {scenarios.map((scenario) => (
            <div
              key={scenario.id}
              className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                selectedScenario?.id === scenario.id
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              onClick={() => onLoad(scenario)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onLoad(scenario);
                }
              }}
              aria-label={`Load scenario: ${scenario.name}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                    {scenario.name}
                  </h3>
                  {scenario.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      {scenario.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1 mt-2">
                    {scenario.tags?.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-block px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="mt-2 text-xs text-gray-500">
                    Created: {new Date(scenario.createdAt).toLocaleDateString()}
                    {scenario.lastExecutedAt && (
                      <>
                        {' '}
                        | Last run: {new Date(scenario.lastExecutedAt).toLocaleDateString()}
                      </>
                    )}
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(scenario.id);
                  }}
                  className="ml-2 p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  aria-label={`Delete scenario: ${scenario.name}`}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>

              {/* Confirm Delete Modal */}
              {confirmDelete === scenario.id && (
                <div
                  className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(null);
                  }}
                >
                  <div
                    className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Delete Scenario?
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Are you sure you want to delete "{scenario.name}"? This action cannot be undone.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(scenario.id);
                        }}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg"
                      >
                        Delete
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDelete(null);
                        }}
                        className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium py-2 px-4 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
