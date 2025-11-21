/**
 * Scope Configuration Component
 * Configure evidence scope (programs, metrics, staleness)
 */

interface Props {
  selectedPrograms: string[];
  selectedMetrics: string[];
  includeStale: boolean;
  onProgramsChange: (programs: string[]) => void;
  onMetricsChange: (metrics: string[]) => void;
  onIncludeStaleChange: (include: boolean) => void;
}

const PROGRAMS = [
  { id: 'buddy', label: 'Buddy Program', icon: '🤝' },
  { id: 'language', label: 'Language Learning', icon: '🗣️' },
  { id: 'mentorship', label: 'Mentorship', icon: '👥' },
  { id: 'upskilling', label: 'Upskilling', icon: '📚' },
];

const METRICS = [
  { id: 'sroi', label: 'SROI', description: 'Social Return on Investment' },
  { id: 'vis', label: 'VIS', description: 'Volunteer Impact Score' },
  { id: 'integration_score', label: 'Integration Score', description: 'Employee integration metrics' },
  { id: 'engagement_rate', label: 'Engagement Rate', description: 'Program engagement' },
];

export function ScopeConfiguration({
  selectedPrograms,
  selectedMetrics,
  includeStale,
  onProgramsChange,
  onMetricsChange,
  onIncludeStaleChange,
}: Props) {
  const toggleProgram = (programId: string) => {
    if (selectedPrograms.includes(programId)) {
      onProgramsChange(selectedPrograms.filter((id) => id !== programId));
    } else {
      onProgramsChange([...selectedPrograms, programId]);
    }
  };

  const toggleMetric = (metricId: string) => {
    if (selectedMetrics.includes(metricId)) {
      onMetricsChange(selectedMetrics.filter((id) => id !== metricId));
    } else {
      onMetricsChange([...selectedMetrics, metricId]);
    }
  };

  const selectAllPrograms = () => {
    onProgramsChange(PROGRAMS.map((p) => p.id));
  };

  const clearAllPrograms = () => {
    onProgramsChange([]);
  };

  const selectAllMetrics = () => {
    onMetricsChange(METRICS.map((m) => m.id));
  };

  const clearAllMetrics = () => {
    onMetricsChange([]);
  };

  return (
    <div className="scope-configuration">
      <div className="scope-section">
        <div className="section-header">
          <h4>Programs</h4>
          <div className="section-actions">
            <button
              type="button"
              onClick={selectAllPrograms}
              className="link-button"
            >
              All
            </button>
            <span className="separator">|</span>
            <button
              type="button"
              onClick={clearAllPrograms}
              className="link-button"
            >
              None
            </button>
          </div>
        </div>
        <div className="chips-grid">
          {PROGRAMS.map((program) => (
            <button
              key={program.id}
              type="button"
              onClick={() => toggleProgram(program.id)}
              className={`chip ${selectedPrograms.includes(program.id) ? 'selected' : ''}`}
            >
              <span className="chip-icon">{program.icon}</span>
              <span className="chip-label">{program.label}</span>
            </button>
          ))}
        </div>
        <p className="help-text">
          Leave empty to include all programs
        </p>
      </div>

      <div className="scope-section">
        <div className="section-header">
          <h4>Metrics</h4>
          <div className="section-actions">
            <button
              type="button"
              onClick={selectAllMetrics}
              className="link-button"
            >
              All
            </button>
            <span className="separator">|</span>
            <button
              type="button"
              onClick={clearAllMetrics}
              className="link-button"
            >
              None
            </button>
          </div>
        </div>
        <div className="metrics-list">
          {METRICS.map((metric) => (
            <label key={metric.id} className="checkbox-label">
              <input
                type="checkbox"
                checked={selectedMetrics.includes(metric.id)}
                onChange={() => toggleMetric(metric.id)}
                className="checkbox"
              />
              <div className="checkbox-content">
                <strong>{metric.label}</strong>
                <span className="metric-description">{metric.description}</span>
              </div>
            </label>
          ))}
        </div>
        <p className="help-text">
          Leave empty to include all metrics
        </p>
      </div>

      <div className="scope-section">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={includeStale}
            onChange={(e) => onIncludeStaleChange(e.target.checked)}
            className="checkbox"
          />
          <div className="checkbox-content">
            <strong>Include stale metrics</strong>
            <span className="metric-description">
              Include metrics that are more than 90 days old (may reduce data quality)
            </span>
          </div>
        </label>
      </div>

      <style jsx>{`
        .scope-configuration {
          display: flex;
          flex-direction: column;
          gap: 25px;
        }

        .scope-section {
          padding-bottom: 20px;
          border-bottom: 1px solid #e5e7eb;
        }

        .scope-section:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .section-header h4 {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin: 0;
        }

        .section-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .link-button {
          background: none;
          border: none;
          color: #667eea;
          font-size: 13px;
          cursor: pointer;
          padding: 0;
        }

        .link-button:hover {
          text-decoration: underline;
        }

        .separator {
          color: #d1d5db;
          font-size: 12px;
        }

        .chips-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .chip {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border: 2px solid #e5e7eb;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 14px;
        }

        .chip:hover {
          border-color: #d1d5db;
        }

        .chip.selected {
          border-color: #667eea;
          background: #eef2ff;
          color: #667eea;
          font-weight: 600;
        }

        .chip-icon {
          font-size: 18px;
        }

        .chip-label {
          flex: 1;
        }

        .metrics-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .checkbox-label {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          cursor: pointer;
        }

        .checkbox {
          margin-top: 4px;
          cursor: pointer;
          width: 18px;
          height: 18px;
        }

        .checkbox-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .checkbox-content strong {
          font-size: 14px;
          color: #1f2937;
        }

        .metric-description {
          font-size: 13px;
          color: #6b7280;
        }

        .help-text {
          margin-top: 10px;
          font-size: 12px;
          color: #9ca3af;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
