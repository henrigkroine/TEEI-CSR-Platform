/**
 * Report Generation Modal
 *
 * Modal interface for creating custom reports with:
 * - Template selection
 * - Parameter configuration
 * - Section customization
 * - Format selection (PDF, HTML, CSV, XLSX)
 * - Real-time generation progress
 *
 * @module reports/ReportGenerationModal
 */

import React, { useState, useEffect } from 'react';
import { memoize } from '../../utils/memoization';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  sections: ReportSection[];
  estimated_pages: number;
}

interface ReportSection {
  id: string;
  name: string;
  description: string;
  required: boolean;
}

interface ReportGenerationModalProps {
  companyId: string;
  onClose: () => void;
  onReportGenerated?: (reportId: string) => void;
}

const TEMPLATES: ReportTemplate[] = [
  {
    id: 'executive-summary',
    name: 'Executive Summary',
    description: 'High-level overview for executive stakeholders',
    category: 'executive',
    estimated_pages: 8,
    sections: [
      { id: 'cover', name: 'Cover Page', description: 'Title and branding', required: true },
      { id: 'at-a-glance', name: 'Impact At-a-Glance', description: 'Key metrics', required: true },
      { id: 'sroi', name: 'SROI Analysis', description: 'Social ROI breakdown', required: true },
      { id: 'outcomes', name: 'Outcome Highlights', description: 'Top achievements', required: false },
    ],
  },
  {
    id: 'detailed-impact',
    name: 'Detailed Impact Report',
    description: 'Comprehensive analysis with evidence trail',
    category: 'detailed',
    estimated_pages: 35,
    sections: [
      { id: 'cover', name: 'Cover Page', description: 'Title and branding', required: true },
      { id: 'executive-summary', name: 'Executive Summary', description: '1-page overview', required: true },
      { id: 'methodology', name: 'Methodology', description: 'Calculation approaches', required: true },
      { id: 'sroi-detailed', name: 'SROI Detailed', description: 'Full SROI with evidence', required: true },
      { id: 'vis-detailed', name: 'VIS Detailed', description: 'Volunteer impact breakdown', required: true },
      { id: 'outcomes', name: 'Outcome Analysis', description: 'All dimensions over time', required: true },
      { id: 'evidence-appendix', name: 'Evidence Appendix', description: 'Complete trail', required: false },
    ],
  },
  {
    id: 'stakeholder-briefing',
    name: 'Stakeholder Briefing',
    description: 'Narrative-focused for external partners',
    category: 'stakeholder',
    estimated_pages: 12,
    sections: [
      { id: 'cover', name: 'Cover Page', description: 'Title and branding', required: true },
      { id: 'narrative', name: 'Impact Narrative', description: 'Story-driven summary', required: true },
      { id: 'key-achievements', name: 'Key Achievements', description: 'Highlighted successes', required: true },
      { id: 'social-value', name: 'Social Value Created', description: 'SROI and impact', required: true },
      { id: 'next-steps', name: 'Looking Forward', description: 'Future goals', required: false },
    ],
  },
  {
    id: 'csrd-compliance',
    name: 'CSRD Compliance',
    description: 'EU sustainability reporting directive',
    category: 'compliance',
    estimated_pages: 45,
    sections: [
      { id: 'cover', name: 'Cover Page', description: 'Title and entity', required: true },
      { id: 'esrs-s1', name: 'ESRS S1 - Own Workforce', description: 'Workforce disclosures', required: true },
      { id: 'esrs-s2', name: 'ESRS S2 - Value Chain', description: 'Value chain workers', required: true },
      { id: 'esrs-s3', name: 'ESRS S3 - Communities', description: 'Community impact', required: true },
      { id: 'data-quality', name: 'Data Quality', description: 'Evidence verification', required: true },
    ],
  },
];

/**
 * Report Generation Modal Component
 */
function ReportGenerationModal({
  companyId,
  onClose,
  onReportGenerated,
}: ReportGenerationModalProps) {
  const [step, setStep] = useState<'template' | 'configure' | 'generating' | 'complete'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [title, setTitle] = useState('');
  const [period, setPeriod] = useState('2024-Q4');
  const [format, setFormat] = useState<'pdf' | 'html'>('pdf');
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeEvidence, setIncludeEvidence] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedReportId, setGeneratedReportId] = useState<string | null>(null);

  // Initialize selected sections when template changes
  useEffect(() => {
    if (selectedTemplate) {
      const requiredSections = selectedTemplate.sections
        .filter((s) => s.required)
        .map((s) => s.id);
      setSelectedSections(requiredSections);
      setTitle(`${selectedTemplate.name} - ${period}`);

      // Set defaults based on template
      if (selectedTemplate.id === 'detailed-impact') {
        setIncludeEvidence(true);
      }
    }
  }, [selectedTemplate, period]);

  const handleTemplateSelect = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setStep('configure');
  };

  const toggleSection = (sectionId: string) => {
    const section = selectedTemplate?.sections.find((s) => s.id === sectionId);
    if (section?.required) return; // Can't toggle required sections

    setSelectedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) return;

    setStep('generating');
    setProgress(0);

    try {
      // Start report generation
      const response = await fetch(`http://localhost:3001/companies/${companyId}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: selectedTemplate.id,
          title,
          format,
          parameters: {
            period,
            sections: selectedSections,
            include_charts: includeCharts,
            include_evidence: includeEvidence,
            include_lineage: includeEvidence,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Report generation failed');
      }

      const result = await response.json();
      setGeneratedReportId(result.report_id);

      // Simulate progress (in real implementation, poll for status)
      simulateProgress();
    } catch (error) {
      console.error('[ReportGenerationModal] Generation error:', error);
      alert('Failed to generate report. Please try again.');
      setStep('configure');
    }
  };

  const simulateProgress = () => {
    let current = 0;
    const interval = setInterval(() => {
      current += Math.random() * 15;
      if (current >= 100) {
        current = 100;
        clearInterval(interval);
        setStep('complete');
      }
      setProgress(Math.min(current, 100));
    }, 500);
  };

  const handleDownload = () => {
    if (generatedReportId) {
      window.open(
        `http://localhost:3001/companies/${companyId}/reports/${generatedReportId}/download`,
        '_blank'
      );
      onReportGenerated?.(generatedReportId);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Generate Report</h2>
          <button onClick={onClose} className="close-btn" aria-label="Close modal">
            ×
          </button>
        </div>

        <div className="modal-content">
          {/* Step 1: Template Selection */}
          {step === 'template' && (
            <div className="template-selection">
              <p className="step-description">
                Choose a report template that best fits your needs:
              </p>
              <div className="template-grid">
                {TEMPLATES.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onSelect={() => handleTemplateSelect(template)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Configuration */}
          {step === 'configure' && selectedTemplate && (
            <div className="configuration">
              <button onClick={() => setStep('template')} className="back-btn">
                ← Change Template
              </button>

              <div className="config-section">
                <label>Report Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter report title"
                  className="text-input"
                />
              </div>

              <div className="config-section">
                <label>Reporting Period</label>
                <select value={period} onChange={(e) => setPeriod(e.target.value)} className="select-input">
                  <option value="2024-Q4">Q4 2024</option>
                  <option value="2024-Q3">Q3 2024</option>
                  <option value="2024-Q2">Q2 2024</option>
                  <option value="2024-Q1">Q1 2024</option>
                  <option value="2024">Full Year 2024</option>
                </select>
              </div>

              <div className="config-section">
                <label>Output Format</label>
                <div className="format-options">
                  <label className="radio-label">
                    <input
                      type="radio"
                      value="pdf"
                      checked={format === 'pdf'}
                      onChange={() => setFormat('pdf')}
                    />
                    <span>PDF (Recommended)</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      value="html"
                      checked={format === 'html'}
                      onChange={() => setFormat('html')}
                    />
                    <span>HTML (Web View)</span>
                  </label>
                </div>
              </div>

              <div className="config-section">
                <label>Sections</label>
                <div className="sections-list">
                  {selectedTemplate.sections.map((section) => (
                    <label key={section.id} className="section-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedSections.includes(section.id)}
                        onChange={() => toggleSection(section.id)}
                        disabled={section.required}
                      />
                      <div className="section-info">
                        <div className="section-name">
                          {section.name}
                          {section.required && <span className="required-badge">Required</span>}
                        </div>
                        <div className="section-description">{section.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="config-section">
                <label>Options</label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={includeCharts}
                    onChange={(e) => setIncludeCharts(e.target.checked)}
                  />
                  <span>Include Charts and Visualizations</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={includeEvidence}
                    onChange={(e) => setIncludeEvidence(e.target.checked)}
                  />
                  <span>Include Evidence Trail and Lineage</span>
                </label>
              </div>

              <div className="estimated-pages">
                Estimated pages: ~{selectedTemplate.estimated_pages}
                {includeEvidence && ' (+10-15 with evidence)'}
              </div>
            </div>
          )}

          {/* Step 3: Generating */}
          {step === 'generating' && (
            <div className="generating">
              <div className="progress-spinner" />
              <h3>Generating Report...</h3>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <p className="progress-text">{Math.round(progress)}% complete</p>
              <p className="progress-step">
                {progress < 30 && 'Collecting data...'}
                {progress >= 30 && progress < 60 && 'Calculating metrics...'}
                {progress >= 60 && progress < 90 && 'Rendering sections...'}
                {progress >= 90 && 'Finalizing report...'}
              </p>
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 'complete' && (
            <div className="complete">
              <div className="success-icon">✓</div>
              <h3>Report Ready!</h3>
              <p>Your report has been generated successfully.</p>
              <div className="report-info">
                <div className="info-item">
                  <span className="label">Title:</span>
                  <span className="value">{title}</span>
                </div>
                <div className="info-item">
                  <span className="label">Format:</span>
                  <span className="value">{format.toUpperCase()}</span>
                </div>
                <div className="info-item">
                  <span className="label">Period:</span>
                  <span className="value">{period}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step === 'configure' && (
            <>
              <button onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                className="btn btn-primary"
                disabled={!title || selectedSections.length === 0}
              >
                Generate Report
              </button>
            </>
          )}

          {step === 'complete' && (
            <>
              <button onClick={onClose} className="btn btn-secondary">
                Close
              </button>
              <button onClick={handleDownload} className="btn btn-primary">
                Download Report
              </button>
            </>
          )}
        </div>

        <style>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            z-index: 2000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.2s;
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          .modal {
            background: white;
            border-radius: 12px;
            width: 900px;
            max-width: 90vw;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            animation: slideUp 0.3s;
          }

          @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }

          .modal-header {
            padding: 24px;
            border-bottom: 1px solid var(--color-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .modal-header h2 {
            margin: 0;
            font-size: 1.5rem;
          }

          .close-btn {
            background: none;
            border: none;
            font-size: 2rem;
            cursor: pointer;
            color: var(--color-text-secondary);
            line-height: 1;
            width: 32px;
            height: 32px;
            border-radius: 4px;
            transition: background 0.2s;
          }

          .close-btn:hover {
            background: rgba(0, 0, 0, 0.05);
          }

          .modal-content {
            padding: 24px;
            overflow-y: auto;
            flex: 1;
          }

          .step-description {
            margin-bottom: 24px;
            color: var(--color-text-secondary);
          }

          .template-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 16px;
          }

          .back-btn {
            margin-bottom: 24px;
            padding: 8px 16px;
            background: var(--color-bg-secondary);
            border: 1px solid var(--color-border);
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.875rem;
            transition: background 0.2s;
          }

          .back-btn:hover {
            background: var(--color-border);
          }

          .config-section {
            margin-bottom: 24px;
          }

          .config-section label {
            display: block;
            font-weight: 600;
            margin-bottom: 8px;
            font-size: 0.9375rem;
          }

          .text-input, .select-input {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid var(--color-border);
            border-radius: 6px;
            font-size: 0.9375rem;
          }

          .format-options, .sections-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .radio-label, .checkbox-label, .section-checkbox {
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            padding: 12px;
            min-height: 44px;
            border: 1px solid var(--color-border);
            border-radius: 6px;
            transition: all 0.2s;
          }

          .radio-label input[type="radio"],
          .checkbox-label input[type="checkbox"],
          .section-checkbox input[type="checkbox"] {
            width: 24px;
            height: 24px;
            cursor: pointer;
            flex-shrink: 0;
          }

          .radio-label:hover, .checkbox-label:hover, .section-checkbox:hover {
            border-color: var(--color-primary);
            background: var(--color-primary-light, #e6f2ff);
          }

          .section-info {
            flex: 1;
          }

          .section-name {
            font-weight: 600;
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .required-badge {
            padding: 2px 6px;
            background: var(--color-primary);
            color: white;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
          }

          .section-description {
            font-size: 0.875rem;
            color: var(--color-text-secondary);
          }

          .estimated-pages {
            padding: 12px;
            background: var(--color-bg-secondary);
            border-radius: 6px;
            font-size: 0.875rem;
            color: var(--color-text-secondary);
          }

          .generating, .complete {
            text-align: center;
            padding: 48px 24px;
          }

          .progress-spinner {
            width: 60px;
            height: 60px;
            border: 4px solid var(--color-bg-secondary);
            border-top-color: var(--color-primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 24px;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          .progress-bar {
            width: 100%;
            height: 8px;
            background: var(--color-bg-secondary);
            border-radius: 4px;
            overflow: hidden;
            margin: 24px 0 12px;
          }

          .progress-fill {
            height: 100%;
            background: var(--color-primary);
            transition: width 0.3s;
          }

          .progress-text {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 8px;
          }

          .progress-step {
            color: var(--color-text-secondary);
            font-size: 0.9375rem;
          }

          .success-icon {
            width: 80px;
            height: 80px;
            background: #10b981;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 3rem;
            margin: 0 auto 24px;
          }

          .report-info {
            margin-top: 24px;
            padding: 16px;
            background: var(--color-bg-secondary);
            border-radius: 8px;
            text-align: left;
          }

          .info-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid var(--color-border);
          }

          .info-item:last-child {
            border-bottom: none;
          }

          .info-item .label {
            font-weight: 600;
          }

          .modal-footer {
            padding: 24px;
            border-top: 1px solid var(--color-border);
            display: flex;
            justify-content: flex-end;
            gap: 12px;
          }

          .btn {
            padding: 10px 20px;
            border-radius: 6px;
            font-size: 0.9375rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
          }

          .btn-secondary {
            background: var(--color-bg-secondary);
            color: var(--color-text);
            border: 1px solid var(--color-border);
          }

          .btn-secondary:hover {
            background: var(--color-border);
          }

          .btn-primary {
            background: var(--color-primary);
            color: white;
          }

          .btn-primary:hover {
            opacity: 0.9;
          }

          .btn-primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        `}</style>
      </div>
    </div>
  );
}

/**
 * Template Card Component
 */
const TemplateCard = memoize<{
  template: ReportTemplate;
  onSelect: () => void;
}>(function TemplateCard({ template, onSelect }) {
  const categoryColors: Record<string, string> = {
    executive: '#6366f1',
    detailed: '#10b981',
    stakeholder: '#f59e0b',
    compliance: '#8b5cf6',
  };

  return (
    <button className="template-card" onClick={onSelect}>
      <div className="template-category" style={{ backgroundColor: categoryColors[template.category] }}>
        {template.category}
      </div>
      <h3 className="template-name">{template.name}</h3>
      <p className="template-description">{template.description}</p>
      <div className="template-meta">
        {template.sections.length} sections · ~{template.estimated_pages} pages
      </div>
      <style>{`
        .template-card {
          padding: 20px;
          border: 2px solid var(--color-border);
          border-radius: 8px;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s;
          background: white;
          width: 100%;
        }

        .template-card:hover {
          border-color: var(--color-primary);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        .template-category {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          color: white;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .template-name {
          font-size: 1.125rem;
          margin: 0 0 8px 0;
          color: var(--color-text);
        }

        .template-description {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          margin: 0 0 12px 0;
          line-height: 1.5;
        }

        .template-meta {
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
          padding-top: 12px;
          border-top: 1px solid var(--color-border);
        }
      `}</style>
    </button>
  );
});

export default memoize(ReportGenerationModal);
