/**
 * Narrative Controls Component
 *
 * UI controls for adjusting AI-generated narrative reports:
 * - Tone: Formal, Conversational, Technical
 * - Length: Brief (1-2 pages), Standard (3-5 pages), Detailed (6+ pages)
 * - Audience: Board, Management, Public
 *
 * These controls adjust server-side prompts for Worker 2 AI generation.
 *
 * @module components/reports/NarrativeControls
 */


export interface NarrativeSettings {
  tone: 'formal' | 'conversational' | 'technical';
  length: 'brief' | 'standard' | 'detailed';
  audience: 'board' | 'management' | 'public';
}

interface NarrativeControlsProps {
  settings: NarrativeSettings;
  onChange: (settings: NarrativeSettings) => void;
  showPreview?: boolean;
}

const TONE_OPTIONS = [
  {
    value: 'formal' as const,
    label: 'Formal',
    description: 'Professional, executive-level language',
    icon: '🎩',
    example: 'Our organization achieved significant outcomes through strategic initiatives...',
  },
  {
    value: 'conversational' as const,
    label: 'Conversational',
    description: 'Approachable, engaging narrative',
    icon: '💬',
    example: 'We\'re proud to share how our programs made a real difference...',
  },
  {
    value: 'technical' as const,
    label: 'Technical',
    description: 'Data-driven, methodology-focused',
    icon: '📊',
    example: 'Analysis of outcome metrics indicates a 34% improvement across dimensions...',
  },
];

const LENGTH_OPTIONS = [
  {
    value: 'brief' as const,
    label: 'Brief',
    pages: '1-2 pages',
    description: 'Executive summary only',
    icon: '📄',
    wordCount: '300-500 words',
  },
  {
    value: 'standard' as const,
    label: 'Standard',
    pages: '3-5 pages',
    description: 'Balanced overview with key details',
    icon: '📋',
    wordCount: '1,000-1,500 words',
  },
  {
    value: 'detailed' as const,
    label: 'Detailed',
    pages: '6+ pages',
    description: 'Comprehensive analysis with evidence',
    icon: '📚',
    wordCount: '2,500+ words',
  },
];

const AUDIENCE_OPTIONS = [
  {
    value: 'board' as const,
    label: 'Board of Directors',
    description: 'Strategic focus, high-level metrics',
    icon: '👔',
    focus: 'ROI, strategic alignment, governance',
  },
  {
    value: 'management' as const,
    label: 'Management Team',
    description: 'Operational details, actionable insights',
    icon: '💼',
    focus: 'KPIs, program performance, recommendations',
  },
  {
    value: 'public' as const,
    label: 'Public/Stakeholders',
    description: 'Impact stories, community outcomes',
    icon: '🌍',
    focus: 'Beneficiary impact, community stories, transparency',
  },
];

/**
 * Narrative Controls Component
 */
export default function NarrativeControls({
  settings,
  onChange,
  showPreview = true,
}: NarrativeControlsProps) {
  const updateSetting = <K extends keyof NarrativeSettings>(
    key: K,
    value: NarrativeSettings[K]
  ) => {
    onChange({ ...settings, [key]: value });
  };

  const selectedTone = TONE_OPTIONS.find((opt) => opt.value === settings.tone)!;
  const selectedLength = LENGTH_OPTIONS.find((opt) => opt.value === settings.length)!;
  const selectedAudience = AUDIENCE_OPTIONS.find((opt) => opt.value === settings.audience)!;

  return (
    <div className="narrative-controls">
      {/* Tone Selection */}
      <div className="control-section">
        <label className="control-label">
          <span className="label-text">Tone</span>
          <span className="label-hint">How should the narrative be written?</span>
        </label>
        <div className="option-grid">
          {TONE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => updateSetting('tone', option.value)}
              className={`option-card ${settings.tone === option.value ? 'selected' : ''}`}
              type="button"
            >
              <div className="option-icon">{option.icon}</div>
              <div className="option-header">
                <div className="option-label">{option.label}</div>
                <div className="option-description">{option.description}</div>
              </div>
              {settings.tone === option.value && showPreview && (
                <div className="option-example">"{option.example}"</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Length Selection */}
      <div className="control-section">
        <label className="control-label">
          <span className="label-text">Length</span>
          <span className="label-hint">How much detail should be included?</span>
        </label>
        <div className="option-grid">
          {LENGTH_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => updateSetting('length', option.value)}
              className={`option-card ${settings.length === option.value ? 'selected' : ''}`}
              type="button"
            >
              <div className="option-icon">{option.icon}</div>
              <div className="option-header">
                <div className="option-label">{option.label}</div>
                <div className="option-meta">{option.pages}</div>
                <div className="option-description">{option.description}</div>
              </div>
              {showPreview && (
                <div className="option-meta-small">{option.wordCount}</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Audience Selection */}
      <div className="control-section">
        <label className="control-label">
          <span className="label-text">Audience</span>
          <span className="label-hint">Who will read this report?</span>
        </label>
        <div className="option-grid">
          {AUDIENCE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => updateSetting('audience', option.value)}
              className={`option-card ${settings.audience === option.value ? 'selected' : ''}`}
              type="button"
            >
              <div className="option-icon">{option.icon}</div>
              <div className="option-header">
                <div className="option-label">{option.label}</div>
                <div className="option-description">{option.description}</div>
              </div>
              {settings.audience === option.value && showPreview && (
                <div className="option-focus">
                  <strong>Focus:</strong> {option.focus}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Preview Summary */}
      {showPreview && (
        <div className="settings-summary">
          <div className="summary-header">
            <span className="summary-icon">✨</span>
            <span className="summary-title">Report Configuration</span>
          </div>
          <div className="summary-content">
            This report will be <strong>{selectedTone.label.toLowerCase()}</strong> in tone,
            approximately <strong>{selectedLength.pages}</strong> in length, and tailored for{' '}
            <strong>{selectedAudience.label.toLowerCase()}</strong>.
          </div>
        </div>
      )}

      <style jsx>{`
        .narrative-controls {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .control-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .control-label {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .label-text {
          font-weight: 600;
          font-size: 1rem;
          color: #111827;
        }

        .label-hint {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .option-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 12px;
        }

        .option-card {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 16px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
          min-height: 120px;
        }

        .option-card:hover {
          border-color: #3b82f6;
          background: #f0f9ff;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
        }

        .option-card.selected {
          border-color: #3b82f6;
          background: #eff6ff;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .option-icon {
          font-size: 1.5rem;
          line-height: 1;
        }

        .option-header {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .option-label {
          font-weight: 600;
          font-size: 0.9375rem;
          color: #111827;
        }

        .option-description {
          font-size: 0.8125rem;
          color: #6b7280;
          line-height: 1.4;
        }

        .option-meta {
          font-size: 0.8125rem;
          color: #3b82f6;
          font-weight: 600;
        }

        .option-meta-small {
          font-size: 0.75rem;
          color: #9ca3af;
          margin-top: 4px;
        }

        .option-example {
          padding: 8px 12px;
          background: white;
          border-radius: 4px;
          border-left: 3px solid #3b82f6;
          font-size: 0.8125rem;
          color: #4b5563;
          font-style: italic;
          line-height: 1.5;
          margin-top: 8px;
        }

        .option-focus {
          padding: 8px 12px;
          background: white;
          border-radius: 4px;
          font-size: 0.8125rem;
          color: #4b5563;
          line-height: 1.5;
          margin-top: 8px;
        }

        .option-focus strong {
          color: #111827;
        }

        .settings-summary {
          padding: 16px 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 8px;
          color: white;
        }

        .summary-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .summary-icon {
          font-size: 1.25rem;
        }

        .summary-title {
          font-weight: 600;
          font-size: 0.9375rem;
        }

        .summary-content {
          font-size: 0.9375rem;
          line-height: 1.6;
          opacity: 0.95;
        }

        .summary-content strong {
          font-weight: 700;
          opacity: 1;
        }

        @media (max-width: 768px) {
          .option-grid {
            grid-template-columns: 1fr;
          }

          .narrative-controls {
            gap: 24px;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Get prompt instructions for Worker 2 based on narrative settings
 */
export function getNarrativePromptInstructions(settings: NarrativeSettings): string {
  const toneInstructions: Record<NarrativeSettings['tone'], string> = {
    formal:
      'Use formal, professional language suitable for executive audiences. Employ precise terminology and maintain an authoritative tone.',
    conversational:
      'Use approachable, engaging language that tells a compelling story. Make the content accessible without sacrificing professionalism.',
    technical:
      'Focus on data, methodology, and quantitative analysis. Use technical terminology and emphasize statistical rigor.',
  };

  const lengthInstructions: Record<NarrativeSettings['length'], string> = {
    brief:
      'Keep the narrative concise (300-500 words). Focus only on the most critical insights and top-level metrics.',
    standard:
      'Provide a balanced narrative (1,000-1,500 words) covering key insights, supporting evidence, and actionable recommendations.',
    detailed:
      'Create a comprehensive narrative (2,500+ words) with in-depth analysis, extensive evidence, and thorough contextual explanation.',
  };

  const audienceInstructions: Record<NarrativeSettings['audience'], string> = {
    board:
      'Tailor content for board of directors: emphasize strategic alignment, ROI, governance, and high-level outcomes. Minimize operational details.',
    management:
      'Tailor content for management team: include operational metrics, program-level performance, and actionable recommendations for improvement.',
    public:
      'Tailor content for public stakeholders: emphasize beneficiary impact, community stories, transparency, and social value created.',
  };

  return `
NARRATIVE GENERATION INSTRUCTIONS:

TONE: ${toneInstructions[settings.tone]}

LENGTH: ${lengthInstructions[settings.length]}

AUDIENCE: ${audienceInstructions[settings.audience]}

Generate the report narrative according to these specifications.
`.trim();
}

/**
 * Validate narrative settings
 */
export function validateNarrativeSettings(settings: NarrativeSettings): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!['formal', 'conversational', 'technical'].includes(settings.tone)) {
    errors.push('Invalid tone selection');
  }

  if (!['brief', 'standard', 'detailed'].includes(settings.length)) {
    errors.push('Invalid length selection');
  }

  if (!['board', 'management', 'public'].includes(settings.audience)) {
    errors.push('Invalid audience selection');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Default narrative settings
 */
export const DEFAULT_NARRATIVE_SETTINGS: NarrativeSettings = {
  tone: 'formal',
  length: 'standard',
  audience: 'management',
};
