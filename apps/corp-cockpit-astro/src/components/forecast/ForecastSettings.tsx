import { useState, useEffect } from 'react';

export interface ForecastSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  metric: string;
}

interface ModelSettings {
  ets: {
    method: 'simple' | 'holt' | 'holt-winters';
    seasonalPeriod: number;
    damped: boolean;
  };
  prophet: {
    growthType: 'linear' | 'logistic';
    seasonalityWeekly: boolean;
    seasonalityYearly: boolean;
    holidays: boolean;
    changepoints: number;
  };
  ensemble: {
    etsWeight: number;
    prophetWeight: number;
  };
  backtest: {
    trainTestSplit: number;
    stride: number;
    folds: number;
  };
}

const DEFAULT_SETTINGS: ModelSettings = {
  ets: {
    method: 'holt-winters',
    seasonalPeriod: 12,
    damped: false,
  },
  prophet: {
    growthType: 'linear',
    seasonalityWeekly: true,
    seasonalityYearly: true,
    holidays: true,
    changepoints: 5,
  },
  ensemble: {
    etsWeight: 0.5,
    prophetWeight: 0.5,
  },
  backtest: {
    trainTestSplit: 0.8,
    stride: 1,
    folds: 5,
  },
};

export default function ForecastSettings({
  isOpen,
  onClose,
  companyId,
  metric,
}: ForecastSettingsProps) {
  const [settings, setSettings] = useState<ModelSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<'ets' | 'prophet' | 'ensemble' | 'backtest'>('ets');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Load saved settings for this company/metric
      const saved = localStorage.getItem(`forecast-settings-${companyId}-${metric}`);
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    }
  }, [isOpen, companyId, metric]);

  const handleSave = () => {
    setSaving(true);
    // Save to localStorage
    localStorage.setItem(
      `forecast-settings-${companyId}-${metric}`,
      JSON.stringify(settings)
    );
    setTimeout(() => {
      setSaving(false);
      onClose();
    }, 500);
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  if (!isOpen) return null;

  // Normalize ensemble weights to sum to 1
  const normalizeWeights = () => {
    const total = settings.ensemble.etsWeight + settings.ensemble.prophetWeight;
    if (total > 0) {
      setSettings({
        ...settings,
        ensemble: {
          etsWeight: settings.ensemble.etsWeight / total,
          prophetWeight: settings.ensemble.prophetWeight / total,
        },
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 transition-opacity"
          aria-hidden="true"
          onClick={onClose}
        ></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3
                className="text-xl font-semibold text-gray-900 dark:text-white"
                id="modal-title"
              >
                Advanced Forecast Settings
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Close settings"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
              <nav className="flex -mb-px space-x-8" aria-label="Settings tabs">
                {[
                  { id: 'ets' as const, label: 'ETS Model' },
                  { id: 'prophet' as const, label: 'Prophet Model' },
                  { id: 'ensemble' as const, label: 'Ensemble' },
                  { id: 'backtest' as const, label: 'Validation' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="max-h-96 overflow-y-auto">
              {/* ETS Settings */}
              {activeTab === 'ets' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      ETS Method
                    </label>
                    <select
                      value={settings.ets.method}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          ets: {
                            ...settings.ets,
                            method: e.target.value as 'simple' | 'holt' | 'holt-winters',
                          },
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="simple">Simple Exponential Smoothing</option>
                      <option value="holt">Holt's Linear Trend</option>
                      <option value="holt-winters">Holt-Winters Seasonal</option>
                    </select>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Choose based on data characteristics (trend, seasonality)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Seasonal Period: {settings.ets.seasonalPeriod} months
                    </label>
                    <input
                      type="range"
                      min="2"
                      max="24"
                      value={settings.ets.seasonalPeriod}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          ets: { ...settings.ets, seasonalPeriod: parseInt(e.target.value) },
                        })
                      }
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Length of seasonal cycle (e.g., 12 for yearly patterns)
                    </p>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="ets-damped"
                      checked={settings.ets.damped}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          ets: { ...settings.ets, damped: e.target.checked },
                        })
                      }
                      className="w-4 h-4 text-primary-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500"
                    />
                    <label
                      htmlFor="ets-damped"
                      className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                    >
                      Use damped trend (prevents over-extrapolation)
                    </label>
                  </div>
                </div>
              )}

              {/* Prophet Settings */}
              {activeTab === 'prophet' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Growth Type
                    </label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="linear"
                          checked={settings.prophet.growthType === 'linear'}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              prophet: {
                                ...settings.prophet,
                                growthType: e.target.value as 'linear' | 'logistic',
                              },
                            })
                          }
                          className="w-4 h-4 text-primary-600"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Linear
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="logistic"
                          checked={settings.prophet.growthType === 'logistic'}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              prophet: {
                                ...settings.prophet,
                                growthType: e.target.value as 'linear' | 'logistic',
                              },
                            })
                          }
                          className="w-4 h-4 text-primary-600"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Logistic (with saturation)
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Seasonality Components
                    </p>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="prophet-weekly"
                        checked={settings.prophet.seasonalityWeekly}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            prophet: {
                              ...settings.prophet,
                              seasonalityWeekly: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 text-primary-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded"
                      />
                      <label
                        htmlFor="prophet-weekly"
                        className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                      >
                        Weekly seasonality
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="prophet-yearly"
                        checked={settings.prophet.seasonalityYearly}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            prophet: {
                              ...settings.prophet,
                              seasonalityYearly: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 text-primary-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded"
                      />
                      <label
                        htmlFor="prophet-yearly"
                        className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                      >
                        Yearly seasonality
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="prophet-holidays"
                        checked={settings.prophet.holidays}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            prophet: { ...settings.prophet, holidays: e.target.checked },
                          })
                        }
                        className="w-4 h-4 text-primary-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded"
                      />
                      <label
                        htmlFor="prophet-holidays"
                        className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                      >
                        Include holidays
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Changepoints: {settings.prophet.changepoints}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={settings.prophet.changepoints}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          prophet: {
                            ...settings.prophet,
                            changepoints: parseInt(e.target.value),
                          },
                        })
                      }
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Number of potential trend changes to detect
                    </p>
                  </div>
                </div>
              )}

              {/* Ensemble Settings */}
              {activeTab === 'ensemble' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Combine predictions from multiple models using weighted averaging. Weights are
                    automatically normalized to sum to 1.
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      ETS Weight: {(settings.ensemble.etsWeight * 100).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.ensemble.etsWeight * 100}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          ensemble: {
                            ...settings.ensemble,
                            etsWeight: parseInt(e.target.value) / 100,
                          },
                        })
                      }
                      onMouseUp={normalizeWeights}
                      onTouchEnd={normalizeWeights}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Prophet Weight: {(settings.ensemble.prophetWeight * 100).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.ensemble.prophetWeight * 100}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          ensemble: {
                            ...settings.ensemble,
                            prophetWeight: parseInt(e.target.value) / 100,
                          },
                        })
                      }
                      onMouseUp={normalizeWeights}
                      onTouchEnd={normalizeWeights}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Tip:</strong> Equal weights (50/50) often provide robust results.
                      Adjust based on historical model performance shown in the Accuracy tab.
                    </p>
                  </div>
                </div>
              )}

              {/* Backtest Settings */}
              {activeTab === 'backtest' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Train/Test Split: {(settings.backtest.trainTestSplit * 100).toFixed(0)}%
                      training
                    </label>
                    <input
                      type="range"
                      min="50"
                      max="95"
                      step="5"
                      value={settings.backtest.trainTestSplit * 100}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          backtest: {
                            ...settings.backtest,
                            trainTestSplit: parseInt(e.target.value) / 100,
                          },
                        })
                      }
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Percentage of data used for training in each fold
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Number of Folds: {settings.backtest.folds}
                    </label>
                    <input
                      type="range"
                      min="3"
                      max="10"
                      value={settings.backtest.folds}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          backtest: { ...settings.backtest, folds: parseInt(e.target.value) },
                        })
                      }
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      More folds = more thorough validation but slower
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Stride: {settings.backtest.stride} month(s)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="6"
                      value={settings.backtest.stride}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          backtest: { ...settings.backtest, stride: parseInt(e.target.value) },
                        })
                      }
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Time step between validation windows
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-400"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            <button
              onClick={handleReset}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Reset to Defaults
            </button>
            <button
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
