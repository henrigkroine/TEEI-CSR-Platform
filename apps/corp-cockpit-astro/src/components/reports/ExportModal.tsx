import { useState } from 'react';
import type { ExportFormat, ExportOptions } from '../../types/reports';

interface ExportModalProps {
  reportId: string;
  companyId: string;
  isOpen: boolean;
  onClose: () => void;
  isDraft?: boolean;
}

const FORMAT_LABELS: Record<ExportFormat, { label: string; description: string; icon: string }> = {
  pdf: {
    label: 'PDF',
    description: 'Professional PDF document with formatting',
    icon: '📄'
  },
  docx: {
    label: 'Word (DOCX)',
    description: 'Editable Microsoft Word document',
    icon: '📝'
  },
  markdown: {
    label: 'Markdown',
    description: 'Plain text with markdown formatting',
    icon: '📋'
  },
  plain_text: {
    label: 'Plain Text',
    description: 'Simple text file without formatting',
    icon: '📃'
  }
};

export default function ExportModal({
  reportId,
  companyId,
  isOpen,
  onClose,
  isDraft = false
}: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeCitations, setIncludeCitations] = useState(true);
  const [watermark, setWatermark] = useState(isDraft);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setError(null);

    try {
      const options: ExportOptions = {
        format,
        includeCharts,
        includeCitations,
        watermark,
      };

      const response = await fetch(
        `/api/companies/${companyId}/gen-reports/${reportId}/export/${format}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(options),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to export report');
      }

      // Get the blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Set filename based on format
      const extensions: Record<ExportFormat, string> = {
        pdf: 'pdf',
        docx: 'docx',
        markdown: 'md',
        plain_text: 'txt'
      };
      a.download = `report-${reportId}.${extensions[format]}`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Close modal on success
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during export');
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 
                   rounded-lg bg-background shadow-2xl"
        role="dialog"
        aria-labelledby="export-modal-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 id="export-modal-title" className="text-xl font-bold">
              Export Report
            </h2>
            <button
              onClick={onClose}
              className="btn-secondary"
              aria-label="Close modal"
              disabled={exporting}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-red-600 border border-red-200">
              <p className="font-medium">Export failed</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Format Selection */}
          <div>
            <h3 className="mb-3 font-semibold text-foreground">Export Format</h3>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(FORMAT_LABELS) as ExportFormat[]).map((fmt) => {
                const info = FORMAT_LABELS[fmt];
                return (
                  <label
                    key={fmt}
                    className={`
                      flex flex-col p-4 rounded-lg border-2 cursor-pointer transition-all
                      hover:border-primary/50
                      ${format === fmt 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border bg-background'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="format"
                      value={fmt}
                      checked={format === fmt}
                      onChange={(e) => setFormat(e.target.value as ExportFormat)}
                      disabled={exporting}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{info.icon}</span>
                      <span className="font-medium text-sm">{info.label}</span>
                    </div>
                    <span className="text-xs text-foreground/60">
                      {info.description}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Options */}
          <div>
            <h3 className="mb-3 font-semibold text-foreground">Export Options</h3>
            <div className="space-y-3">
              {/* Include Charts */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={includeCharts}
                  onChange={(e) => setIncludeCharts(e.target.checked)}
                  disabled={exporting || format === 'plain_text'}
                  className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary
                           disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">
                    Include charts and visualizations
                  </span>
                  <p className="text-xs text-foreground/60 mt-0.5">
                    Embed charts in the exported document
                  </p>
                  {format === 'plain_text' && (
                    <p className="text-xs text-orange-600 mt-1">
                      Not available for plain text format
                    </p>
                  )}
                </div>
              </label>

              {/* Include Citations */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={includeCitations}
                  onChange={(e) => setIncludeCitations(e.target.checked)}
                  disabled={exporting}
                  className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary
                           disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">
                    Include evidence citations
                  </span>
                  <p className="text-xs text-foreground/60 mt-0.5">
                    Add reference section with all cited evidence
                  </p>
                </div>
              </label>

              {/* Watermark */}
              {isDraft && (
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={watermark}
                    onChange={(e) => setWatermark(e.target.checked)}
                    disabled={exporting}
                    className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium group-hover:text-primary transition-colors">
                      Add "DRAFT" watermark
                    </span>
                    <p className="text-xs text-foreground/60 mt-0.5">
                      Recommended for draft reports
                    </p>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Format-specific notes */}
          <div className="rounded-md bg-border/20 p-4 text-sm">
            <p className="font-medium mb-2">Format notes:</p>
            {format === 'pdf' && (
              <ul className="list-disc list-inside space-y-1 text-foreground/80">
                <li>Best for sharing and printing</li>
                <li>Preserves all formatting and styling</li>
                <li>Cannot be edited after export</li>
              </ul>
            )}
            {format === 'docx' && (
              <ul className="list-disc list-inside space-y-1 text-foreground/80">
                <li>Editable in Microsoft Word or compatible apps</li>
                <li>Formatting may vary slightly between apps</li>
                <li>Best for further editing</li>
              </ul>
            )}
            {format === 'markdown' && (
              <ul className="list-disc list-inside space-y-1 text-foreground/80">
                <li>Plain text with markdown syntax</li>
                <li>Easy to version control and edit</li>
                <li>Compatible with most documentation tools</li>
              </ul>
            )}
            {format === 'plain_text' && (
              <ul className="list-disc list-inside space-y-1 text-foreground/80">
                <li>Simple text without any formatting</li>
                <li>Smallest file size</li>
                <li>Universal compatibility</li>
              </ul>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 bg-border/5">
          <div className="flex items-center justify-end gap-3">
            <button 
              onClick={onClose} 
              className="btn-secondary" 
              disabled={exporting}
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              className="btn-primary"
              disabled={exporting}
            >
              {exporting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download {FORMAT_LABELS[format].label}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
