/**
 * Lineage Drawer Component
 *
 * Visualizes evidence lineage showing:
 * - Evidence dependencies ("Why this metric?")
 * - Calculation steps with formulas
 * - Data transformations
 * - Source traceability
 *
 * @module evidence/LineageDrawer
 */

import React, { useState, useEffect, useRef } from 'react';
import { memoize } from '../../utils/memoization';
import { FocusTrap } from '../a11y/FocusManager';

interface LineageData {
  evidence_id: string;
  metric_name: string;
  value: number | string;
  source: string;
  collected_at: string;
  dependencies: Dependency[];
  calculations: CalculationStep[];
  transformations: TransformationStep[];
}

interface Dependency {
  evidence_id: string;
  metric_name: string;
  value: number | string;
  relationship: 'input' | 'reference' | 'derived_from';
}

interface CalculationStep {
  step: number;
  operation: string;
  formula: string;
  inputs: Record<string, number>;
  output: number;
  timestamp?: string;
}

interface TransformationStep {
  step: number;
  type: 'normalization' | 'aggregation' | 'conversion' | 'validation';
  description: string;
  input_value: unknown;
  output_value: unknown;
  timestamp?: string;
}

interface LineageDrawerProps {
  companyId: string;
  evidenceId: string;
  onClose: () => void;
}

/**
 * Lineage Drawer Component
 */
function LineageDrawer({ companyId, evidenceId, onClose }: LineageDrawerProps) {
  const [lineage, setLineage] = useState<LineageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dependencies' | 'calculations' | 'transformations'>('dependencies');
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    fetchLineage();
  }, [companyId, evidenceId]);

  // Handle Escape key to close drawer
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Focus close button when drawer opens
  useEffect(() => {
    if (closeButtonRef.current) {
      setTimeout(() => closeButtonRef.current?.focus(), 100);
    }
  }, []);

  async function fetchLineage() {
    setLoading(true);
    try {
      const url = `http://localhost:3001/companies/${companyId}/evidence/${evidenceId}/lineage`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        setLineage(data);
      }
    } catch (error) {
      console.error('[LineageDrawer] Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <FocusTrap active={true} restoreFocusOnDeactivate={true} focusFirstOnActivate={true}>
      <div className="drawer-overlay" onClick={onClose} role="presentation">
        <div className="drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="lineage-drawer-title">
          <div className="drawer-header">
            <div>
              <h3 id="lineage-drawer-title">Evidence Lineage</h3>
              {lineage && <p className="metric-name">{lineage.metric_name}</p>}
            </div>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="close-btn"
              aria-label="Close drawer"
            >
              ×
            </button>
          </div>

        <div className="drawer-content">
          {loading ? (
            <div className="loading">Loading lineage...</div>
          ) : !lineage ? (
            <div className="error">Failed to load lineage</div>
          ) : (
            <>
              {/* Summary Section */}
              <div className="summary-section">
                <div className="summary-item">
                  <span className="label">Value:</span>
                  <span className="value">{formatValue(lineage.value)}</span>
                </div>
                <div className="summary-item">
                  <span className="label">Source:</span>
                  <span className="value">{formatSource(lineage.source)}</span>
                </div>
                <div className="summary-item">
                  <span className="label">Collected:</span>
                  <span className="value">{formatDate(lineage.collected_at)}</span>
                </div>
              </div>

              {/* Tabs */}
              <div className="tabs" role="tablist" aria-label="Evidence lineage views">
                <button
                  className={`tab ${activeTab === 'dependencies' ? 'active' : ''}`}
                  onClick={() => setActiveTab('dependencies')}
                  role="tab"
                  aria-selected={activeTab === 'dependencies'}
                  aria-controls="dependencies-panel"
                  id="dependencies-tab"
                  tabIndex={activeTab === 'dependencies' ? 0 : -1}
                >
                  Dependencies ({lineage.dependencies.length})
                </button>
                <button
                  className={`tab ${activeTab === 'calculations' ? 'active' : ''}`}
                  onClick={() => setActiveTab('calculations')}
                  role="tab"
                  aria-selected={activeTab === 'calculations'}
                  aria-controls="calculations-panel"
                  id="calculations-tab"
                  tabIndex={activeTab === 'calculations' ? 0 : -1}
                >
                  Calculations ({lineage.calculations.length})
                </button>
                <button
                  className={`tab ${activeTab === 'transformations' ? 'active' : ''}`}
                  onClick={() => setActiveTab('transformations')}
                  role="tab"
                  aria-selected={activeTab === 'transformations'}
                  aria-controls="transformations-panel"
                  id="transformations-tab"
                  tabIndex={activeTab === 'transformations' ? 0 : -1}
                >
                  Transformations ({lineage.transformations.length})
                </button>
              </div>

              {/* Tab Content */}
              <div className="tab-content">
                {activeTab === 'dependencies' && (
                  <div role="tabpanel" id="dependencies-panel" aria-labelledby="dependencies-tab">
                    <DependenciesTab dependencies={lineage.dependencies} />
                  </div>
                )}
                {activeTab === 'calculations' && (
                  <div role="tabpanel" id="calculations-panel" aria-labelledby="calculations-tab">
                    <CalculationsTab calculations={lineage.calculations} />
                  </div>
                )}
                {activeTab === 'transformations' && (
                  <div role="tabpanel" id="transformations-panel" aria-labelledby="transformations-tab">
                    <TransformationsTab transformations={lineage.transformations} />
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <style>{`
          .drawer-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            animation: fadeIn 0.2s;
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          .drawer {
            position: fixed;
            right: 0;
            top: 0;
            bottom: 0;
            width: 700px;
            max-width: 90vw;
            background: white;
            box-shadow: -4px 0 16px rgba(0, 0, 0, 0.1);
            overflow-y: auto;
            animation: slideIn 0.3s;
          }

          @keyframes slideIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }

          .drawer-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 24px;
            border-bottom: 1px solid var(--color-border);
            background: var(--color-bg-secondary);
          }

          .drawer-header h3 {
            font-size: 1.25rem;
            margin: 0 0 4px 0;
          }

          .metric-name {
            font-size: 0.875rem;
            color: var(--color-text-secondary);
          }

          .close-btn {
            background: none;
            border: none;
            font-size: 2rem;
            cursor: pointer;
            color: var(--color-text-secondary);
            line-height: 1;
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            transition: background 0.2s;
          }

          .close-btn:hover {
            background: rgba(0, 0, 0, 0.05);
          }

          .drawer-content {
            padding: 24px;
          }

          .loading, .error {
            text-align: center;
            padding: 48px 24px;
            color: var(--color-text-secondary);
          }

          .error {
            color: #dc2626;
          }

          .summary-section {
            display: grid;
            gap: 16px;
            margin-bottom: 24px;
            padding: 16px;
            background: var(--color-bg-secondary);
            border-radius: 8px;
          }

          .summary-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .summary-item .label {
            font-size: 0.875rem;
            color: var(--color-text-secondary);
            font-weight: 600;
          }

          .summary-item .value {
            font-size: 1rem;
            font-weight: 500;
          }

          .tabs {
            display: flex;
            gap: 8px;
            border-bottom: 2px solid var(--color-border);
            margin-bottom: 24px;
          }

          .tab {
            padding: 12px 16px;
            background: none;
            border: none;
            font-size: 0.9375rem;
            font-weight: 500;
            color: var(--color-text-secondary);
            cursor: pointer;
            border-bottom: 2px solid transparent;
            margin-bottom: -2px;
            transition: all 0.2s;
          }

          .tab:hover {
            color: var(--color-text);
          }

          .tab.active {
            color: var(--color-primary);
            border-bottom-color: var(--color-primary);
          }

          .tab-content {
            min-height: 200px;
          }
        `}</style>
      </div>
    </div>
    </FocusTrap>
  );
}

/**
 * Dependencies Tab
 */
const DependenciesTab = memoize<{ dependencies: Dependency[] }>(function DependenciesTab({
  dependencies,
}) {
  if (dependencies.length === 0) {
    return <div className="empty-tab">No dependencies found</div>;
  }

  return (
    <div className="dependencies-list">
      <p className="tab-description">
        This metric depends on the following evidence items:
      </p>
      {dependencies.map((dep, index) => (
        <div key={index} className="dependency-item">
          <div className="dep-header">
            <div className="dep-name">{dep.metric_name}</div>
            <div className="dep-relationship">{formatRelationship(dep.relationship)}</div>
          </div>
          <div className="dep-details">
            <span className="dep-id">{dep.evidence_id}</span>
            <span className="dep-value">{formatValue(dep.value)}</span>
          </div>
        </div>
      ))}
      <style>{`
        .tab-description {
          margin-bottom: 16px;
          color: var(--color-text-secondary);
          font-size: 0.9375rem;
        }

        .dependencies-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .dependency-item {
          padding: 16px;
          background: var(--color-bg-secondary);
          border-radius: 8px;
          border-left: 4px solid var(--color-primary);
        }

        .dep-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .dep-name {
          font-weight: 600;
          font-size: 0.9375rem;
        }

        .dep-relationship {
          padding: 2px 8px;
          background: var(--color-primary);
          color: white;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .dep-details {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.875rem;
        }

        .dep-id {
          color: var(--color-text-secondary);
          font-family: monospace;
        }

        .dep-value {
          font-weight: 600;
          font-size: 1rem;
        }
      `}</style>
    </div>
  );
});

/**
 * Calculations Tab
 */
const CalculationsTab = memoize<{ calculations: CalculationStep[] }>(function CalculationsTab({
  calculations,
}) {
  if (calculations.length === 0) {
    return <div className="empty-tab">No calculations found</div>;
  }

  return (
    <div className="calculations-list">
      <p className="tab-description">
        Step-by-step calculation breakdown:
      </p>
      {calculations.map((calc, index) => (
        <div key={index} className="calculation-step">
          <div className="step-header">
            <div className="step-number">Step {calc.step}</div>
            <div className="step-operation">{calc.operation}</div>
          </div>
          <div className="step-formula">
            <code>{calc.formula}</code>
          </div>
          <div className="step-inputs">
            <div className="inputs-label">Inputs:</div>
            {Object.entries(calc.inputs).map(([key, value]) => (
              <div key={key} className="input-item">
                <span className="input-key">{key}:</span>
                <span className="input-value">{value.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="step-output">
            <span className="output-label">Output:</span>
            <span className="output-value">{calc.output.toLocaleString()}</span>
          </div>
        </div>
      ))}
      <style>{`
        .calculations-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .calculation-step {
          padding: 16px;
          background: var(--color-bg-secondary);
          border-radius: 8px;
          border-left: 4px solid #10b981;
        }

        .step-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .step-number {
          font-weight: 700;
          color: var(--color-primary);
        }

        .step-operation {
          padding: 4px 8px;
          background: white;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .step-formula {
          margin-bottom: 12px;
          padding: 12px;
          background: #f8f9fa;
          border-radius: 4px;
          overflow-x: auto;
        }

        .step-formula code {
          font-family: 'Courier New', monospace;
          font-size: 0.875rem;
          color: #1e293b;
        }

        .step-inputs {
          margin-bottom: 12px;
          padding: 12px;
          background: white;
          border-radius: 4px;
        }

        .inputs-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .input-item {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
          font-size: 0.875rem;
        }

        .input-key {
          color: var(--color-text-secondary);
        }

        .input-value {
          font-weight: 600;
        }

        .step-output {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #10b981;
          color: white;
          border-radius: 4px;
          font-weight: 600;
        }

        .output-label {
          font-size: 0.875rem;
        }

        .output-value {
          font-size: 1.125rem;
        }
      `}</style>
    </div>
  );
});

/**
 * Transformations Tab
 */
const TransformationsTab = memoize<{ transformations: TransformationStep[] }>(
  function TransformationsTab({ transformations }) {
    if (transformations.length === 0) {
      return <div className="empty-tab">No transformations found</div>;
    }

    return (
      <div className="transformations-list">
        <p className="tab-description">
          Data transformations applied to raw input:
        </p>
        {transformations.map((transform, index) => (
          <div key={index} className="transformation-step">
            <div className="transform-header">
              <div className="step-number">Step {transform.step}</div>
              <div className="transform-type">{transform.type}</div>
            </div>
            <p className="transform-description">{transform.description}</p>
            <div className="transform-values">
              <div className="value-block">
                <div className="value-label">Input</div>
                <div className="value-content">
                  <code>{JSON.stringify(transform.input_value, null, 2)}</code>
                </div>
              </div>
              <div className="arrow">→</div>
              <div className="value-block">
                <div className="value-label">Output</div>
                <div className="value-content">
                  <code>{JSON.stringify(transform.output_value, null, 2)}</code>
                </div>
              </div>
            </div>
          </div>
        ))}
        <style>{`
          .transformations-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .transformation-step {
            padding: 16px;
            background: var(--color-bg-secondary);
            border-radius: 8px;
            border-left: 4px solid #f59e0b;
          }

          .transform-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
          }

          .transform-type {
            padding: 4px 8px;
            background: #f59e0b;
            color: white;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: capitalize;
          }

          .transform-description {
            margin-bottom: 16px;
            font-size: 0.9375rem;
            color: var(--color-text-secondary);
          }

          .transform-values {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            gap: 16px;
            align-items: center;
          }

          .value-block {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .value-label {
            font-size: 0.75rem;
            font-weight: 600;
            color: var(--color-text-secondary);
            text-transform: uppercase;
          }

          .value-content {
            padding: 12px;
            background: #f8f9fa;
            border-radius: 4px;
            overflow-x: auto;
          }

          .value-content code {
            font-family: 'Courier New', monospace;
            font-size: 0.8125rem;
            white-space: pre-wrap;
          }

          .arrow {
            font-size: 1.5rem;
            color: var(--color-text-secondary);
          }
        `}</style>
      </div>
    );
  }
);

/**
 * Format helpers
 */
function formatValue(value: number | string): string {
  if (typeof value === 'number') {
    return value.toLocaleString();
  }
  return String(value);
}

function formatSource(source: string): string {
  return source
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelationship(relationship: string): string {
  return relationship
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default memoize(LineageDrawer);
