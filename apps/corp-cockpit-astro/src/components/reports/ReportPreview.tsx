import { useState, useRef, useEffect } from 'react';
import type { GenerateReportResponse, ReportSection } from '@teei/shared-types';

interface ReportPreviewProps {
  report: GenerateReportResponse;
  onClose: () => void;
  onBack: () => void;
}

export default function ReportPreview({ report, onClose, onBack }: ReportPreviewProps) {
  const [editedSections, setEditedSections] = useState<ReportSection[]>(report.sections);
  const [showCitations, setShowCitations] = useState(true);
  const [exportingPDF, setExportingPDF] = useState(false);
  const contentRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Update edited sections when report changes
  useEffect(() => {
    setEditedSections(report.sections);
  }, [report]);

  const handleSectionEdit = (sectionIndex: number) => {
    const contentElement = contentRefs.current[sectionIndex];
    if (!contentElement) return;

    const newContent = contentElement.innerText;
    const updatedSections = [...editedSections];
    updatedSections[sectionIndex] = {
      ...updatedSections[sectionIndex],
      content: newContent,
    };
    setEditedSections(updatedSections);
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      // TODO: Implement PDF export in Slice D
      // For now, just download as JSON
      const dataStr = JSON.stringify(
        {
          sections: editedSections,
          citations: report.citations,
          metadata: report.metadata,
        },
        null,
        2
      );
      const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
      const exportFileDefaultName = `quarterly-report-${report.metadata.generatedAt}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (err) {
      console.error('Failed to export report:', err);
      alert('Failed to export report. Please try again.');
    } finally {
      setExportingPDF(false);
    }
  };

  const getCitationById = (evidenceId: string) => {
    return report.citations.find((c) => c.evidenceId === evidenceId);
  };

  // Extract citation IDs from content
  const extractCitationIds = (content: string): string[] => {
    const citationRegex = /\[citation:([^\]]+)\]/g;
    const ids: string[] = [];
    let match;
    while ((match = citationRegex.exec(content)) !== null) {
      ids.push(match[1]);
    }
    return ids;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Preview Modal */}
      <div
        className="fixed left-1/2 top-1/2 z-50 h-[90vh] w-full max-w-6xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg bg-background shadow-2xl"
        role="dialog"
        aria-labelledby="report-preview-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="border-b border-border bg-background px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="report-preview-title" className="text-xl font-bold">
                Quarterly Report Preview
              </h2>
              <p className="mt-1 text-sm text-foreground/60">
                {report.metadata.generatedAt} • {report.metadata.model} • Prompt v
                {report.metadata.promptVersion}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCitations(!showCitations)}
                className="btn-secondary text-sm"
                aria-label={showCitations ? 'Hide citations' : 'Show citations'}
              >
                {showCitations ? '📑 Hide Citations' : '📑 Show Citations'}
              </button>
              <button
                onClick={onClose}
                className="btn-secondary"
                aria-label="Close preview"
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
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-8rem)] overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="mx-auto max-w-4xl space-y-8">
              {/* Metadata Card */}
              <div className="card bg-primary/5">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-foreground/60">Tokens Used</div>
                    <div className="text-lg font-semibold">{report.metadata.tokensUsed}</div>
                  </div>
                  <div>
                    <div className="font-medium text-foreground/60">Total Citations</div>
                    <div className="text-lg font-semibold">{report.citations.length}</div>
                  </div>
                  <div>
                    <div className="font-medium text-foreground/60">Seed</div>
                    <div className="text-lg font-semibold">
                      {report.metadata.seed ?? 'Random'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Editable Notice */}
              <div className="rounded-md bg-border/20 p-4 text-sm">
                <p className="font-medium">📝 Editable Content</p>
                <p className="mt-1 text-foreground/60">
                  Click any section to make minor edits. Citation markers like [citation:xxx] will
                  be preserved in the export.
                </p>
              </div>

              {/* Sections */}
              {editedSections.map((section, index) => (
                <section key={section.order} className="space-y-3">
                  <h3 className="text-2xl font-bold">{section.title}</h3>
                  <div
                    ref={(el) => (contentRefs.current[index] = el)}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={() => handleSectionEdit(index)}
                    className="whitespace-pre-wrap rounded-md border border-border bg-background p-4 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    style={{ minHeight: '100px' }}
                    role="textbox"
                    aria-label={`Edit ${section.title} section`}
                    aria-multiline="true"
                  >
                    {section.content}
                  </div>

                  {/* Section Citations */}
                  {showCitations && (
                    <div className="ml-4 space-y-2">
                      {extractCitationIds(section.content).map((evidenceId, citationIndex) => {
                        const citation = getCitationById(evidenceId);
                        if (!citation) return null;

                        return (
                          <div
                            key={`${evidenceId}-${citationIndex}`}
                            className="flex gap-3 rounded-md bg-border/10 p-3 text-sm"
                          >
                            <div className="shrink-0 font-mono text-xs text-foreground/40">
                              [{evidenceId.slice(0, 8)}...]
                            </div>
                            <div className="flex-1">
                              <p className="text-foreground/80">{citation.snippetText}</p>
                              <div className="mt-1 flex items-center gap-3 text-xs text-foreground/60">
                                <span>{citation.source}</span>
                                <span>•</span>
                                <span>
                                  Confidence: {(citation.confidence * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              ))}
            </div>
          </div>

          {/* Citations Sidebar (when enabled) */}
          {showCitations && (
            <div className="w-80 border-l border-border bg-border/10 p-6 overflow-y-auto">
              <h3 className="mb-4 font-semibold">All Citations ({report.citations.length})</h3>
              <div className="space-y-3">
                {report.citations.map((citation) => (
                  <div key={citation.id} className="rounded-md bg-background p-3 text-sm">
                    <div className="mb-2 flex items-start justify-between">
                      <span className="font-mono text-xs text-foreground/40">
                        {citation.evidenceId.slice(0, 8)}...
                      </span>
                      <span className="shrink-0 rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium">
                        {(citation.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="mb-2 text-foreground/80">{citation.snippetText}</p>
                    <p className="text-xs text-foreground/60">{citation.source}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-background px-6 py-4">
          <div className="flex items-center justify-between">
            <button onClick={onBack} className="btn-secondary" disabled={exportingPDF}>
              ← Back to Generation
            </button>
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="btn-secondary" disabled={exportingPDF}>
                Close
              </button>
              <button
                onClick={handleExportPDF}
                className="btn-primary"
                disabled={exportingPDF}
              >
                {exportingPDF ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Exporting...
                  </>
                ) : (
                  '📄 Export PDF'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
