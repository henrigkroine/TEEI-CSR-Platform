import { useState, useEffect } from 'react';
import './admin.css';

interface WeightConfig {
  category: 'sroi' | 'vis';
  weights: {
    [key: string]: number;
  };
  defaults: {
    [key: string]: number;
  };
  lastModifiedAt?: string;
  lastModifiedBy?: string;
}

interface WeightOverridesProps {
  companyId: string;
}

const SROI_WEIGHTS = {
  volunteer_hour_value: {
    label: 'Volunteer Hour Value ($)',
    description: 'Monetary value per volunteer hour',
    min: 0,
    max: 200,
    step: 0.01,
  },
  integration_improvement: {
    label: 'Integration Improvement Weight',
    description: 'Weight for integration point improvements',
    min: 0,
    max: 5,
    step: 0.1,
  },
  language_advancement: {
    label: 'Language Advancement Weight',
    description: 'Weight for language level advancement',
    min: 0,
    max: 5,
    step: 0.1,
  },
  job_readiness: {
    label: 'Job Readiness Weight',
    description: 'Weight for job readiness improvements',
    min: 0,
    max: 5,
    step: 0.1,
  },
};

const VIS_WEIGHTS = {
  hours_weight: {
    label: 'Hours Weight',
    description: 'Weight for total volunteer hours',
    min: 0,
    max: 1,
    step: 0.01,
  },
  consistency_weight: {
    label: 'Consistency Weight',
    description: 'Weight for session frequency/consistency',
    min: 0,
    max: 1,
    step: 0.01,
  },
  impact_weight: {
    label: 'Impact Weight',
    description: 'Weight for outcome impact on mentees',
    min: 0,
    max: 1,
    step: 0.01,
  },
};

export default function WeightOverrides({ companyId }: WeightOverridesProps) {
  const [sroiConfig, setSroiConfig] = useState<WeightConfig | null>(null);
  const [visConfig, setVisConfig] = useState<WeightConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<'sroi' | 'vis' | null>(null);
  const [activeTab, setActiveTab] = useState<'sroi' | 'vis'>('sroi');

  useEffect(() => {
    fetchWeights();
  }, [companyId]);

  async function fetchWeights() {
    try {
      setLoading(true);
      const response = await fetch(`/api/companies/${companyId}/weights`);
      if (response.ok) {
        const data = await response.json();
        setSroiConfig(data.sroi);
        setVisConfig(data.vis);
      }
    } catch (error) {
      console.error('Failed to fetch weights:', error);
    } finally {
      setLoading(false);
    }
  }

  async function saveWeights(category: 'sroi' | 'vis', weights: { [key: string]: number }) {
    setSaving(category);
    try {
      const response = await fetch(`/api/companies/${companyId}/weights/${category}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weights }),
      });

      if (response.ok) {
        const data = await response.json();
        if (category === 'sroi') {
          setSroiConfig(data.config);
        } else {
          setVisConfig(data.config);
        }
        alert('Weights saved successfully');
      }
    } catch (error) {
      console.error('Failed to save weights:', error);
      alert('Failed to save weights');
    } finally {
      setSaving(null);
    }
  }

  async function resetToDefaults(category: 'sroi' | 'vis') {
    if (!confirm(`Are you sure you want to reset ${category.toUpperCase()} weights to defaults?`)) {
      return;
    }

    const config = category === 'sroi' ? sroiConfig : visConfig;
    if (!config) return;

    await saveWeights(category, config.defaults);
  }

  function updateWeight(category: 'sroi' | 'vis', key: string, value: number) {
    if (category === 'sroi' && sroiConfig) {
      setSroiConfig({
        ...sroiConfig,
        weights: { ...sroiConfig.weights, [key]: value },
      });
    } else if (category === 'vis' && visConfig) {
      setVisConfig({
        ...visConfig,
        weights: { ...visConfig.weights, [key]: value },
      });
    }
  }

  if (loading) {
    return <div className="loading">Loading weight configurations...</div>;
  }

  const activeConfig = activeTab === 'sroi' ? sroiConfig : visConfig;
  const activeWeightDefs = activeTab === 'sroi' ? SROI_WEIGHTS : VIS_WEIGHTS;

  return (
    <div className="weight-overrides">
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'sroi' ? 'active' : ''}`}
          onClick={() => setActiveTab('sroi')}
        >
          SROI Weights
        </button>
        <button
          className={`tab ${activeTab === 'vis' ? 'active' : ''}`}
          onClick={() => setActiveTab('vis')}
        >
          VIS Weights
        </button>
      </div>

      {activeConfig && (
        <div className="weight-form">
          {activeConfig.lastModifiedAt && (
            <div className="last-modified">
              Last modified: {new Date(activeConfig.lastModifiedAt).toLocaleString()}
              {activeConfig.lastModifiedBy && ` by ${activeConfig.lastModifiedBy}`}
            </div>
          )}

          <div className="weight-inputs">
            {Object.entries(activeWeightDefs).map(([key, def]) => {
              const currentValue = activeConfig.weights[key] ?? activeConfig.defaults[key];
              const defaultValue = activeConfig.defaults[key];
              const isModified = currentValue !== defaultValue;

              return (
                <div key={key} className="weight-input-group">
                  <div className="weight-label">
                    <label htmlFor={key}>
                      {def.label}
                      {isModified && <span className="modified-indicator">*</span>}
                    </label>
                    <span className="weight-description">{def.description}</span>
                  </div>

                  <div className="weight-input-controls">
                    <input
                      id={key}
                      type="number"
                      min={def.min}
                      max={def.max}
                      step={def.step}
                      value={currentValue}
                      onChange={(e) => updateWeight(activeTab, key, parseFloat(e.target.value))}
                      className={isModified ? 'modified' : ''}
                    />
                    <input
                      type="range"
                      min={def.min}
                      max={def.max}
                      step={def.step}
                      value={currentValue}
                      onChange={(e) => updateWeight(activeTab, key, parseFloat(e.target.value))}
                      className="weight-slider"
                    />
                    <span className="default-value">Default: {defaultValue}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {activeTab === 'vis' && (
            <div className="weight-validation">
              {(() => {
                const total =
                  (visConfig?.weights.hours_weight || 0) +
                  (visConfig?.weights.consistency_weight || 0) +
                  (visConfig?.weights.impact_weight || 0);
                const isValid = Math.abs(total - 1.0) < 0.01;
                return (
                  <div className={`validation-message ${isValid ? 'success' : 'error'}`}>
                    {isValid ? (
                      <>✓ VIS weights sum to 1.0 (total: {total.toFixed(2)})</>
                    ) : (
                      <>⚠ VIS weights must sum to 1.0 (current total: {total.toFixed(2)})</>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          <div className="weight-actions">
            <button
              className="btn btn-secondary"
              onClick={() => resetToDefaults(activeTab)}
              disabled={saving !== null}
            >
              Reset to Defaults
            </button>
            <button
              className="btn btn-primary"
              onClick={() => saveWeights(activeTab, activeConfig.weights)}
              disabled={saving !== null}
            >
              {saving === activeTab ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          <div className="weight-note">
            <strong>Note:</strong> Weight changes will affect all future calculations. Historical metrics
            will not be recalculated. Changes are logged for audit purposes.
          </div>
        </div>
      )}
    </div>
  );
}
