/**
 * Report Generation Modal (Enhanced for Executive Packs)
 *
 * 5-step wizard for generating executive-grade reports:
 * 1. Template Selection
 * 2. Configure Parameters
 * 3. Narrative Editor (for executive templates)
 * 4. Generate Report
 * 5. Download (with PPTX option)
 *
 * @module components/reports/ReportGenerationModal
 */

import React, { useState, useEffect } from 'react';
import NarrativeEditor from './NarrativeEditor';

interface ReportGenerationModalProps {
  companyId: string;
  onClose: () => void;
  onReportGenerated: (reportId: string) => void;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  estimated_pages: number;
  supports_narrative: boolean;
  supports_pptx: boolean;
}

type ReportFormat = 'pdf' | 'html' | 'pptx';

export default function ReportGenerationModal({
  companyId,
  onClose,
  onReportGenerated,
}: ReportGenerationModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [format, setFormat] = useState<ReportFormat>('pdf');
  const [title, setTitle] = useState('');
  const [period, setPeriod] = useState('2024-Q4');
  const [sections, setSections] = useState<string[]>([]);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeEvidence, setIncludeEvidence] = useState(false);
  const [includeLineage, setIncludeLineage] = useState(false);
  const [narrative, setNarrative] = useState('');
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [reportId, setReportId] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    try {
      const response = await fetch(`/api/companies/${companyId}/reports/templates`);
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  }

  async function generateReport() {
    if (!selectedTemplate) return;

    setGenerating(true);
    setProgress(0);

    try {
      const response = await fetch(`/api/companies/${companyId}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: selectedTemplate.id,
          title,
          format,
          parameters: {
            period,
            sections,
            include_charts: includeCharts,
            include_evidence: includeEvidence,
            include_lineage: includeLineage,
            narrative: narrative || undefined,
          },
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setReportId(result.report_id);
        setStep(5);
        onReportGenerated(result.report_id);
        // Simulate progress updates (in production, use SSE)
        simulateProgress();
      } else {
        alert(`Error: ${result.message}`);
        setGenerating(false);
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Failed to generate report');
      setGenerating(false);
    }
  }

  function simulateProgress() {
    let current = 0;
    const interval = setInterval(() => {
      current += 10;
      setProgress(current);
      if (current >= 100) {
        clearInterval(interval);
        setGenerating(false);
      }
    }, 500);
  }

  function handleTemplateSelect(template: ReportTemplate) {
    setSelectedTemplate(template);
    setTitle(`${template.name} - ${period}`);
    setSections(['cover', 'at-a-glance', 'sroi']);
    setFormat(template.supports_pptx ? 'pptx' : 'pdf');
    setStep(2);
  }

  function handleNext() {
    if (step === 2 && selectedTemplate?.supports_narrative) {
      setStep(3);
    } else if (step === 2 || step === 3) {
      setStep(4);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Generate Report</h2>
          <button onClick={onClose} className="close-btn">
            ×
          </button>
        </div>

        {/* Progress Steps */}
        <div className="steps-indicator">
          <div className={`step ${step >= 1 ? 'active' : ''}`}>1. Template</div>
          <div className={`step ${step >= 2 ? 'active' : ''}`}>2. Configure</div>
          {selectedTemplate?.supports_narrative && (
            <div className={`step ${step >= 3 ? 'active' : ''}`}>3. Narrative</div>
          )}
          <div className={`step ${step >= 4 ? 'active' : ''}`}>
            {selectedTemplate?.supports_narrative ? '4' : '3'}. Generate
          </div>
          <div className={`step ${step >= 5 ? 'active' : ''}`}>
            {selectedTemplate?.supports_narrative ? '5' : '4'}. Download
          </div>
        </div>

        <div className="modal-body">
          {/* Step 1: Template Selection */}
          {step === 1 && (
            <div className="step-content">
              <h3>Select Report Template</h3>
              <div className="templates-grid">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="template-card"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <h4>{template.name}</h4>
                    <p className="template-desc">{template.description}</p>
                    <div className="template-meta">
                      <span className="category">{template.category}</span>
                      <span className="pages">~{template.estimated_pages} pages</span>
                    </div>
                    {template.supports_pptx && (
                      <span className="pptx-badge">📊 PPTX Available</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Configure Parameters */}
          {step === 2 && (
            <div className="step-content">
              <h3>Configure Report</h3>

              <div className="form-group">
                <label>Report Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Reporting Period</label>
                <input
                  type="text"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  placeholder="e.g., 2024-Q4, 2024, Jan-Dec 2024"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Output Format</label>
                <div className="format-options">
                  <label className="format-option">
                    <input
                      type="radio"
                      value="pdf"
                      checked={format === 'pdf'}
                      onChange={(e) => setFormat(e.target.value as ReportFormat)}
                    />
                    <span>PDF Document</span>
                  </label>
                  {selectedTemplate?.supports_pptx && (
                    <label className="format-option">
                      <input
                        type="radio"
                        value="pptx"
                        checked={format === 'pptx'}
                        onChange={(e) => setFormat(e.target.value as ReportFormat)}
                      />
                      <span>PowerPoint (PPTX)</span>
                    </label>
                  )}
                  <label className="format-option">
                    <input
                      type="radio"
                      value="html"
                      checked={format === 'html'}
                      onChange={(e) => setFormat(e.target.value as ReportFormat)}
                    />
                    <span>Web Page (HTML)</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Options</label>
                <div className="checkbox-group">
                  <label className="checkbox-option">
                    <input
                      type="checkbox"
                      checked={includeCharts}
                      onChange={(e) => setIncludeCharts(e.target.checked)}
                    />
                    <span>Include Charts & Visualizations</span>
                  </label>
                  <label className="checkbox-option">
                    <input
                      type="checkbox"
                      checked={includeEvidence}
                      onChange={(e) => setIncludeEvidence(e.target.checked)}
                    />
                    <span>Include Evidence Appendix</span>
                  </label>
                  <label className="checkbox-option">
                    <input
                      type="checkbox"
                      checked={includeLineage}
                      onChange={(e) => setIncludeLineage(e.target.checked)}
                    />
                    <span>Include Calculation Lineage</span>
                  </label>
                </div>
              </div>

              <div className="step-actions">
                <button onClick={() => setStep(1)} className="btn btn-secondary">
                  Back
                </button>
                <button onClick={handleNext} className="btn btn-primary">
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Narrative Editor (for executive templates) */}
          {step === 3 && selectedTemplate?.supports_narrative && (
            <div className="step-content">
              <h3>Executive Narrative</h3>
              <p className="help-text">
                Write a compelling narrative for your board or stakeholders. This will appear in the
                executive summary section.
              </p>

              <NarrativeEditor
                value={narrative}
                onChange={setNarrative}
                maxLength={2000}
                showWordCount
                showPreview
              />

              <div className="step-actions">
                <button onClick={() => setStep(2)} className="btn btn-secondary">
                  Back
                </button>
                <button onClick={handleNext} className="btn btn-primary">
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Generate */}
          {step === 4 && (
            <div className="step-content">
              <h3>Ready to Generate</h3>

              <div className="summary-box">
                <h4>Report Summary</h4>
                <dl className="summary-list">
                  <dt>Template:</dt>
                  <dd>{selectedTemplate?.name}</dd>
                  <dt>Title:</dt>
                  <dd>{title}</dd>
                  <dt>Period:</dt>
                  <dd>{period}</dd>
                  <dt>Format:</dt>
                  <dd>{format.toUpperCase()}</dd>
                  {narrative && (
                    <>
                      <dt>Narrative:</dt>
                      <dd>{narrative.substring(0, 100)}...</dd>
                    </>
                  )}
                </dl>
              </div>

              <div className="step-actions">
                <button onClick={() => setStep(selectedTemplate?.supports_narrative ? 3 : 2)} className="btn btn-secondary">
                  Back
                </button>
                <button onClick={generateReport} disabled={generating} className="btn btn-primary">
                  {generating ? 'Generating...' : 'Generate Report'}
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Download */}
          {step === 5 && (
            <div className="step-content">
              <div className="success-message">
                <div className="success-icon">✓</div>
                <h3>Report Generated Successfully!</h3>
                <p>Your {format.toUpperCase()} report is ready to download.</p>
              </div>

              {generating && (
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                  <span className="progress-label">{progress}%</span>
                </div>
              )}

              {!generating && reportId && (
                <div className="download-actions">
                  <a
                    href={`/api/companies/${companyId}/reports/${reportId}/download`}
                    className="btn btn-primary btn-lg"
                  >
                    📥 Download Report
                  </a>
                  <button onClick={() => setStep(1)} className="btn btn-secondary">
                    Generate Another Report
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <style jsx>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            padding: 20px;
          }

          .modal-content {
            background: white;
            border-radius: 12px;
            width: 100%;
            max-width: 900px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 24px;
            border-bottom: 1px solid #e5e7eb;
          }

          .modal-header h2 {
            margin: 0;
            font-size: 1.5rem;
          }

          .close-btn {
            width: 32px;
            height: 32px;
            border: none;
            background: #f3f4f6;
            border-radius: 50%;
            font-size: 24px;
            cursor: pointer;
            line-height: 1;
          }

          .close-btn:hover {
            background: #e5e7eb;
          }

          .steps-indicator {
            display: flex;
            justify-content: center;
            gap: 16px;
            padding: 24px;
            background: #f9fafb;
            border-bottom: 1px solid #e5e7eb;
          }

          .step {
            padding: 8px 16px;
            background: white;
            border: 1px solid #d1d5db;
            border-radius: 20px;
            font-size: 0.875rem;
            font-weight: 600;
            color: #9ca3af;
          }

          .step.active {
            background: #3b82f6;
            color: white;
            border-color: #3b82f6;
          }

          .modal-body {
            padding: 24px;
          }

          .step-content h3 {
            margin-top: 0;
            margin-bottom: 24px;
          }

          .templates-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 16px;
          }

          .template-card {
            padding: 20px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
          }

          .template-card:hover {
            border-color: #3b82f6;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
          }

          .template-card h4 {
            margin: 0 0 8px;
            font-size: 1.125rem;
          }

          .template-desc {
            margin: 0 0 16px;
            font-size: 0.875rem;
            color: #6b7280;
            line-height: 1.5;
          }

          .template-meta {
            display: flex;
            justify-content: space-between;
            font-size: 0.8125rem;
            color: #9ca3af;
          }

          .category {
            text-transform: uppercase;
            font-weight: 600;
          }

          .pptx-badge {
            display: inline-block;
            margin-top: 8px;
            padding: 4px 8px;
            background: #dbeafe;
            color: #1e40af;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
          }

          .form-group {
            margin-bottom: 24px;
          }

          .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #374151;
          }

          .form-input {
            width: 100%;
            padding: 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 1rem;
            font-family: inherit;
          }

          .form-input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }

          .format-options,
          .checkbox-group {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .format-option,
          .checkbox-option {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
          }

          .format-option input,
          .checkbox-option input {
            cursor: pointer;
          }

          .help-text {
            color: #6b7280;
            font-size: 0.9375rem;
            margin-bottom: 16px;
          }

          .summary-box {
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 24px;
          }

          .summary-box h4 {
            margin-top: 0;
          }

          .summary-list {
            display: grid;
            grid-template-columns: 120px 1fr;
            gap: 12px;
            margin: 0;
          }

          .summary-list dt {
            font-weight: 600;
            color: #6b7280;
          }

          .summary-list dd {
            margin: 0;
            color: #374151;
          }

          .step-actions {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            margin-top: 32px;
          }

          .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }

          .btn-primary {
            background: #3b82f6;
            color: white;
          }

          .btn-primary:hover:not(:disabled) {
            background: #2563eb;
          }

          .btn-primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .btn-secondary {
            background: #f3f4f6;
            color: #374151;
            border: 1px solid #d1d5db;
          }

          .btn-secondary:hover {
            background: #e5e7eb;
          }

          .btn-lg {
            padding: 16px 32px;
            font-size: 1.125rem;
          }

          .success-message {
            text-align: center;
            margin-bottom: 32px;
          }

          .success-icon {
            width: 80px;
            height: 80px;
            margin: 0 auto 16px;
            background: #d1fae5;
            color: #059669;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
          }

          .success-message h3 {
            margin: 16px 0 8px;
            color: #059669;
          }

          .success-message p {
            margin: 0;
            color: #6b7280;
          }

          .progress-bar {
            position: relative;
            height: 32px;
            background: #e5e7eb;
            border-radius: 16px;
            overflow: hidden;
            margin-bottom: 24px;
          }

          .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #3b82f6, #2563eb);
            transition: width 0.3s ease-in-out;
          }

          .progress-label {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-weight: 700;
            color: #374151;
          }

          .download-actions {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
          }

          @media (max-width: 768px) {
            .steps-indicator {
              flex-wrap: wrap;
            }

            .templates-grid {
              grid-template-columns: 1fr;
            }

            .summary-list {
              grid-template-columns: 1fr;
              gap: 8px;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
