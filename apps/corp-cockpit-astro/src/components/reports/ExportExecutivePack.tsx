/**
 * Export Executive Pack Component
 *
 * Modal dialog for exporting executive-grade reports with:
 * - Format selection (PDF, PPTX, Both)
 * - Narrative controls (tone, length, audience)
 * - Watermarking options
 * - Evidence appendix toggle
 * - Progress tracking
 *
 * @module components/reports/ExportExecutivePack
 */

import React, { useState } from 'react';
import NarrativeControls, {
  type NarrativeSettings,
  DEFAULT_NARRATIVE_SETTINGS,
  getNarrativePromptInstructions,
} from './NarrativeControls';

interface ExportExecutivePackProps {
  companyId: string;
  reportId?: string;
  period: string;
  onClose: () => void;
  onExportComplete?: (exportId: string) => void;
}

interface WatermarkOptions {
  enabled: boolean;
  customText?: string;
  includeSignature: boolean;
  includeConfidentiality: boolean;
}

type ExportFormat = 'pdf' | 'pptx' | 'both';

type ExportStep = 'configure' | 'generating' | 'complete' | 'error';

interface ExportResult {
  exportId: string;
  pdfUrl?: string;
  pptxUrl?: string;
  generatedAt: string;
}

/**
 * Export Executive Pack Modal
 */
export default function ExportExecutivePack({
  companyId,
  reportId,
  period,
  onClose,
  onExportComplete,
}: ExportExecutivePackProps) {
  const [step, setStep] = useState<ExportStep>('configure');
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [narrativeSettings, setNarrativeSettings] = useState<NarrativeSettings>(
    DEFAULT_NARRATIVE_SETTINGS
  );
  const [watermarkOptions, setWatermarkOptions] = useState<WatermarkOptions>({
    enabled: true,
    customText: '',
    includeSignature: true,
    includeConfidentiality: true,
  });
  const [includeEvidenceAppendix, setIncludeEvidenceAppendix] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setStep('generating');
    setProgress(0);
    setError(null);

    try {
      // Prepare export request
      const exportRequest = {
        format,
        companyId,
        reportId,
        period,
        narrative: {
          ...narrativeSettings,
          promptInstructions: getNarrativePromptInstructions(narrativeSettings),
        },
        watermark: watermarkOptions.enabled
          ? {
              enabled: true,
              text: watermarkOptions.customText || `${companyId} - ${period}`,
              includeSignature: watermarkOptions.includeSignature,
              includeConfidentiality: watermarkOptions.includeConfidentiality,
              includeIdStamp: true,
              position: 'footer' as const,
              opacity: 0.3,
              font_size: 12,
              color: '#666666',
            }
          : { enabled: false },
        includeEvidenceAppendix,
      };

      // Start export generation
      setProgressMessage('Initiating export...');
      setProgress(5);

      const response = await fetch(`http://localhost:3001/exports/presentations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportRequest),
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const result = await response.json();
      const exportId = result.exportId;

      // Poll for status
      await pollExportStatus(exportId);
    } catch (err) {
      console.error('[ExportExecutivePack] Export error:', err);
      setError(err instanceof Error ? err.message : 'Export failed');
      setStep('error');
    }
  };

  const pollExportStatus = async (exportId: string) => {
    const maxAttempts = 60; // 60 attempts * 2 seconds = 2 minutes max
    let attempts = 0;

    const poll = async () => {
      attempts++;

      try {
        const response = await fetch(`http://localhost:3001/exports/${exportId}/status`);
        if (!response.ok) throw new Error('Status check failed');

        const status = await response.json();

        // Update progress
        setProgress(status.progress || 0);
        setProgressMessage(status.message || 'Generating...');

        if (status.status === 'completed') {
          setExportResult({
            exportId,
            pdfUrl: status.pdfUrl,
            pptxUrl: status.pptxUrl,
            generatedAt: status.completedAt,
          });
          setStep('complete');
          onExportComplete?.(exportId);
        } else if (status.status === 'failed') {
          throw new Error(status.error || 'Export failed');
        } else if (attempts < maxAttempts) {
          // Continue polling
          setTimeout(poll, 2000);
        } else {
          throw new Error('Export timeout - please try again');
        }
      } catch (err) {
        console.error('[ExportExecutivePack] Status poll error:', err);
        setError(err instanceof Error ? err.message : 'Status check failed');
        setStep('error');
      }
    };

    poll();
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Export Executive Pack</h2>
          <button onClick={onClose} className="close-btn" aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-content">
          {/* Step 1: Configuration */}
          {step === 'configure' && (
            <div className="configure-step">
              {/* Format Selection */}
              <div className="section">
                <h3 className="section-title">Export Format</h3>
                <div className="format-options">
                  <button
                    onClick={() => setFormat('pdf')}
                    className={`format-btn ${format === 'pdf' ? 'selected' : ''}`}
                    type="button"
                  >
                    <div className="format-icon">📄</div>
                    <div className="format-label">PDF</div>
                    <div className="format-description">Watermarked document</div>
                  </button>
                  <button
                    onClick={() => setFormat('pptx')}
                    className={`format-btn ${format === 'pptx' ? 'selected' : ''}`}
                    type="button"
                  >
                    <div className="format-icon">📊</div>
                    <div className="format-label">PowerPoint</div>
                    <div className="format-description">Executive deck</div>
                  </button>
                  <button
                    onClick={() => setFormat('both')}
                    className={`format-btn ${format === 'both' ? 'selected' : ''}`}
                    type="button"
                  >
                    <div className="format-icon">📦</div>
                    <div className="format-label">Both</div>
                    <div className="format-description">PDF + PPTX bundle</div>
                  </button>
                </div>
              </div>

              {/* Narrative Controls */}
              <div className="section">
                <h3 className="section-title">Narrative Settings</h3>
                <NarrativeControls
                  settings={narrativeSettings}
                  onChange={setNarrativeSettings}
                  showPreview={true}
                />
              </div>

              {/* Watermark Options */}
              {(format === 'pdf' || format === 'both') && (
                <div className="section">
                  <h3 className="section-title">Watermark & Security</h3>
                  <div className="options-list">
                    <label className="option-checkbox">
                      <input
                        type="checkbox"
                        checked={watermarkOptions.enabled}
                        onChange={(e) =>
                          setWatermarkOptions({ ...watermarkOptions, enabled: e.target.checked })
                        }
                      />
                      <div className="option-info">
                        <div className="option-name">Enable Watermarking</div>
                        <div className="option-description">
                          Add company ID, period, and hash to every page
                        </div>
                      </div>
                    </label>

                    {watermarkOptions.enabled && (
                      <>
                        <div className="option-input">
                          <label htmlFor="watermark-text">Custom Watermark Text (Optional)</label>
                          <input
                            id="watermark-text"
                            type="text"
                            value={watermarkOptions.customText || ''}
                            onChange={(e) =>
                              setWatermarkOptions({
                                ...watermarkOptions,
                                customText: e.target.value,
                              })
                            }
                            placeholder={`${companyId} - ${period}`}
                            className="text-input"
                          />
                        </div>

                        <label className="option-checkbox">
                          <input
                            type="checkbox"
                            checked={watermarkOptions.includeSignature}
                            onChange={(e) =>
                              setWatermarkOptions({
                                ...watermarkOptions,
                                includeSignature: e.target.checked,
                              })
                            }
                          />
                          <div className="option-info">
                            <div className="option-name">Approver Signature Block</div>
                            <div className="option-description">
                              Include signature section if report is approved
                            </div>
                          </div>
                        </label>

                        <label className="option-checkbox">
                          <input
                            type="checkbox"
                            checked={watermarkOptions.includeConfidentiality}
                            onChange={(e) =>
                              setWatermarkOptions({
                                ...watermarkOptions,
                                includeConfidentiality: e.target.checked,
                              })
                            }
                          />
                          <div className="option-info">
                            <div className="option-name">Confidentiality Notice</div>
                            <div className="option-description">
                              Add confidentiality footer to each page
                            </div>
                          </div>
                        </label>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Additional Options */}
              <div className="section">
                <h3 className="section-title">Additional Options</h3>
                <div className="options-list">
                  <label className="option-checkbox">
                    <input
                      type="checkbox"
                      checked={includeEvidenceAppendix}
                      onChange={(e) => setIncludeEvidenceAppendix(e.target.checked)}
                    />
                    <div className="option-info">
                      <div className="option-name">Include Evidence Appendix</div>
                      <div className="option-description">
                        Attach full evidence trail with clickable IDs (adds 10-15 pages)
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Generating */}
          {step === 'generating' && (
            <div className="generating-step">
              <div className="progress-spinner" />
              <h3>Generating Executive Pack</h3>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <p className="progress-text">{Math.round(progress)}% complete</p>
              <p className="progress-message">{progressMessage}</p>
            </div>
          )}

          {/* Step 3: Complete */}
          {step === 'complete' && exportResult && (
            <div className="complete-step">
              <div className="success-icon">✓</div>
              <h3>Executive Pack Ready!</h3>
              <p>Your export has been generated successfully.</p>

              <div className="download-section">
                {exportResult.pdfUrl && (
                  <button
                    onClick={() =>
                      handleDownload(
                        exportResult.pdfUrl!,
                        `Executive_Report_${period}_${companyId}.pdf`
                      )
                    }
                    className="download-btn pdf"
                  >
                    <span className="download-icon">📄</span>
                    <div className="download-info">
                      <div className="download-label">Download PDF</div>
                      <div className="download-meta">Watermarked report</div>
                    </div>
                  </button>
                )}

                {exportResult.pptxUrl && (
                  <button
                    onClick={() =>
                      handleDownload(
                        exportResult.pptxUrl!,
                        `Executive_Deck_${period}_${companyId}.pptx`
                      )
                    }
                    className="download-btn pptx"
                  >
                    <span className="download-icon">📊</span>
                    <div className="download-info">
                      <div className="download-label">Download PowerPoint</div>
                      <div className="download-meta">Executive presentation</div>
                    </div>
                  </button>
                )}
              </div>

              <div className="export-info">
                <div className="info-item">
                  <span className="info-label">Export ID:</span>
                  <span className="info-value">{exportResult.exportId}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Generated:</span>
                  <span className="info-value">
                    {new Date(exportResult.generatedAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Error */}
          {step === 'error' && (
            <div className="error-step">
              <div className="error-icon">⚠️</div>
              <h3>Export Failed</h3>
              <p className="error-message">{error || 'An unknown error occurred'}</p>
              <button onClick={() => setStep('configure')} className="retry-btn">
                Try Again
              </button>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step === 'configure' && (
            <>
              <button onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleExport} className="btn btn-primary">
                Generate Export
              </button>
            </>
          )}

          {step === 'complete' && (
            <button onClick={onClose} className="btn btn-primary">
              Close
            </button>
          )}

          {step === 'error' && (
            <button onClick={onClose} className="btn btn-secondary">
              Close
            </button>
          )}
        </div>

        <style jsx>{`
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
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          .modal {
            background: white;
            border-radius: 12px;
            width: 900px;
            max-width: 95vw;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            animation: slideUp 0.3s;
          }

          @keyframes slideUp {
            from {
              transform: translateY(20px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }

          .modal-header {
            padding: 24px;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .modal-header h2 {
            margin: 0;
            font-size: 1.5rem;
            color: #111827;
          }

          .close-btn {
            background: none;
            border: none;
            font-size: 2rem;
            cursor: pointer;
            color: #6b7280;
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

          .section {
            margin-bottom: 32px;
          }

          .section:last-child {
            margin-bottom: 0;
          }

          .section-title {
            font-size: 1.125rem;
            font-weight: 600;
            color: #111827;
            margin: 0 0 16px 0;
          }

          .format-options {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }

          .format-btn {
            padding: 20px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            background: white;
            cursor: pointer;
            transition: all 0.2s;
            text-align: center;
          }

          .format-btn:hover {
            border-color: #3b82f6;
            background: #f0f9ff;
          }

          .format-btn.selected {
            border-color: #3b82f6;
            background: #eff6ff;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }

          .format-icon {
            font-size: 2rem;
            margin-bottom: 8px;
          }

          .format-label {
            font-weight: 600;
            font-size: 0.9375rem;
            color: #111827;
            margin-bottom: 4px;
          }

          .format-description {
            font-size: 0.8125rem;
            color: #6b7280;
          }

          .options-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .option-checkbox {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 12px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
          }

          .option-checkbox:hover {
            border-color: #3b82f6;
            background: #f0f9ff;
          }

          .option-checkbox input[type='checkbox'] {
            margin-top: 2px;
            cursor: pointer;
          }

          .option-info {
            flex: 1;
          }

          .option-name {
            font-weight: 600;
            font-size: 0.9375rem;
            color: #111827;
            margin-bottom: 4px;
          }

          .option-description {
            font-size: 0.8125rem;
            color: #6b7280;
          }

          .option-input {
            padding: 12px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
          }

          .option-input label {
            display: block;
            font-weight: 600;
            font-size: 0.875rem;
            color: #111827;
            margin-bottom: 8px;
          }

          .text-input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            font-size: 0.9375rem;
          }

          .text-input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }

          .generating-step,
          .complete-step,
          .error-step {
            text-align: center;
            padding: 48px 24px;
          }

          .progress-spinner {
            width: 60px;
            height: 60px;
            border: 4px solid #e5e7eb;
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 24px;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }

          .progress-bar {
            width: 100%;
            height: 8px;
            background: #e5e7eb;
            border-radius: 4px;
            overflow: hidden;
            margin: 24px 0 12px;
          }

          .progress-fill {
            height: 100%;
            background: #3b82f6;
            transition: width 0.3s;
          }

          .progress-text {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 8px;
            color: #111827;
          }

          .progress-message {
            color: #6b7280;
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

          .error-icon {
            font-size: 4rem;
            margin-bottom: 16px;
          }

          .error-message {
            color: #ef4444;
            font-size: 0.9375rem;
            margin: 16px 0;
          }

          .retry-btn {
            padding: 10px 20px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
          }

          .retry-btn:hover {
            background: #2563eb;
          }

          .download-section {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin: 24px 0;
          }

          .download-btn {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 16px 20px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            background: white;
            cursor: pointer;
            transition: all 0.2s;
            text-align: left;
          }

          .download-btn:hover {
            border-color: #3b82f6;
            background: #f0f9ff;
            transform: translateX(4px);
          }

          .download-icon {
            font-size: 2rem;
          }

          .download-info {
            flex: 1;
          }

          .download-label {
            font-weight: 600;
            font-size: 0.9375rem;
            color: #111827;
            margin-bottom: 4px;
          }

          .download-meta {
            font-size: 0.8125rem;
            color: #6b7280;
          }

          .export-info {
            margin-top: 24px;
            padding: 16px;
            background: #f9fafb;
            border-radius: 8px;
            text-align: left;
          }

          .info-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
          }

          .info-item:last-child {
            border-bottom: none;
          }

          .info-label {
            font-weight: 600;
            color: #6b7280;
          }

          .info-value {
            color: #111827;
            font-family: monospace;
            font-size: 0.875rem;
          }

          .modal-footer {
            padding: 24px;
            border-top: 1px solid #e5e7eb;
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
            background: #f3f4f6;
            color: #374151;
            border: 1px solid #d1d5db;
          }

          .btn-secondary:hover {
            background: #e5e7eb;
          }

          .btn-primary {
            background: #3b82f6;
            color: white;
          }

          .btn-primary:hover {
            background: #2563eb;
          }

          @media (max-width: 768px) {
            .format-options {
              grid-template-columns: 1fr;
            }

            .modal {
              width: 100%;
              max-width: 100vw;
              max-height: 100vh;
              border-radius: 0;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
