import { useState, useEffect } from 'react';
import type { GeneratedReport, Citation } from '../../types/reports';
import ReportEditor from './ReportEditor';
import ExportModal from './ExportModal';
import { renderWithCitations } from './CitationTooltip';
import { CompactCostDisplay } from './CostSummary';
import { formatCost } from '../../api/reporting';

interface ReportPreviewProps {
  report: GeneratedReport;
  companyId: string;
  onClose: () => void;
  onBack: () => void;
  lang?: string;
}

export default function ReportPreview({ 
  report, 
  companyId,
  onClose, 
  onBack,
  lang = 'en'
}: ReportPreviewProps) {
  const [editedReport, setEditedReport] = useState(report);
  const [showCitations, setShowCitations] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [editingSection, setEditingSection] = useState<number | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);

  useEffect(() => {
    setEditedReport(report);
  }, [report]);

  const handleSectionEdit = (sectionIndex: number, newSection: typeof report.sections[0]) => {
    const updatedSections = [...editedReport.sections];
    updatedSections[sectionIndex] = newSection;
    setEditedReport({
      ...editedReport,
      sections: updatedSections,
    });
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      await fetch(`/api/companies/${companyId}/gen-reports/${report.reportId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sections: editedReport.sections,
          status: 'draft'
        }),
      });
    } catch (err) {
      console.error('Failed to save draft:', err);
      alert('Failed to save draft. Please try again.');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleFinalizeReport = async () => {
    if (!confirm('Finalize this report? This will lock editing and mark it as final.')) {
      return;
    }

    try {
      await fetch(`/api/companies/${companyId}/gen-reports/${report.reportId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sections: editedReport.sections,
          status: 'final'
        }),
      });
      alert('Report finalized successfully!');
      onClose();
    } catch (err) {
      console.error('Failed to finalize report:', err);
      alert('Failed to finalize report. Please try again.');
    }
  };

  const handleRegenerateSection = async (sectionIndex: number) => {
    if (!confirm('Regenerate this section? Current edits will be lost.')) {
      return;
    }

    try {
      const section = editedReport.sections[sectionIndex];
      const response = await fetch(
        `/api/companies/${companyId}/gen-reports/${report.reportId}/sections/${section.order}/regenerate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to regenerate section');
      }

      const newSection = await response.json();
      handleSectionEdit(sectionIndex, newSection);
    } catch (err) {
      console.error('Failed to regenerate section:', err);
      alert('Failed to regenerate section. Please try again.');
    }
  };

  const handleViewCitationDetails = (citation: Citation) => {
    // Open evidence drawer with citation details
    // This would integrate with the Evidence Explorer from PHASE-C-B-01
    console.log('View citation details:', citation);
    alert(`Evidence ID: ${citation.evidenceId}\nSource: ${citation.source}\nConfidence: ${(citation.confidence * 100).toFixed(0)}%`);
  };

  const getCitationsBySection = (sectionIndex: number): Citation[] => {
    const section = editedReport.sections[sectionIndex];
    const citationRegex = /\[citation:([^\]]+)\]/g;
    const citationIds: string[] = [];
    let match;
    
    while ((match = citationRegex.exec(section.content)) !== null) {
      citationIds.push(match[1]);
    }

    return citationIds
      .map(id => editedReport.citations.find(c => c.evidenceId === id || c.id === id))
      .filter((c): c is Citation => c !== undefined);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(lang, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateCost = (tokens: number, model: string): string => {
    // GPT-4 Turbo pricing (as of 2024): $0.01/1K input, $0.03/1K output
    // Assume 60% input, 40% output
    const inputTokens = tokens * 0.6;
    const outputTokens = tokens * 0.4;
    const inputCost = (inputTokens * 0.01) / 1000;
    const outputCost = (outputTokens * 0.03) / 1000;
    return (inputCost + outputCost).toFixed(4);
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
        className="fixed left-1/2 top-1/2 z-50 h-[90vh] w-full max-w-7xl -translate-x-1/2 -translate-y-1/2 
                   overflow-hidden rounded-lg bg-background shadow-2xl flex flex-col"
        role="dialog"
        aria-labelledby="report-preview-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="border-b border-border bg-background px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="report-preview-title" className="text-xl font-bold">
                {report.reportType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Preview
              </h2>
              <div className="mt-2">
                <CompactCostDisplay
                  tokensUsed={report.metadata.tokensUsed}
                  estimatedCostUsd={calculateCost(report.metadata.tokensUsed, report.metadata.model)}
                  modelName={report.metadata.model}
                />
                <p className="mt-2 text-xs text-foreground/60">
                  Generated {formatDate(report.metadata.generatedAt)} • Prompt v{report.metadata.promptVersion}
                </p>
              </div>
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
        <div className="flex flex-1 overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="mx-auto max-w-4xl space-y-8">
              {/* Metadata Card */}
              <div className="card bg-primary/5 border-primary/20">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-foreground/60">Status</div>
                    <div className="text-lg font-semibold">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                        report.status === 'final' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {report.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-foreground/60">Tokens Used</div>
                    <div className="text-lg font-semibold">{report.metadata.tokensUsed}</div>
                  </div>
                  <div>
                    <div className="font-medium text-foreground/60">Citations</div>
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
              {report.status === 'draft' && (
                <div className="rounded-md bg-blue-50 border border-blue-200 p-4 text-sm">
                  <div className="flex items-start gap-3">
                    <span className="text-blue-600 text-xl">✏️</span>
                    <div>
                      <p className="font-medium text-blue-900">Editable Draft</p>
                      <p className="mt-1 text-blue-700">
                        Click "Edit Section" to make changes. Citation markers like [citation:xxx] 
                        will be preserved. Changes are auto-saved.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Sections */}
              {editedReport.sections.map((section, index) => (
                <section key={section.order} className="space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="text-2xl font-bold">{section.title}</h3>
                    {report.status === 'draft' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingSection(editingSection === index ? null : index)}
                          className="text-sm text-primary hover:text-primary/80 font-medium"
                        >
                          {editingSection === index ? 'View Mode' : 'Edit Section'}
                        </button>
                        <button
                          onClick={() => handleRegenerateSection(index)}
                          className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                          title="Regenerate this section with AI"
                        >
                          🔄 Regenerate
                        </button>
                      </div>
                    )}
                  </div>

                  {editingSection === index ? (
                    <ReportEditor
                      section={section}
                      onChange={(newSection) => handleSectionEdit(index, newSection)}
                      autoSave={true}
                      autoSaveDelay={2000}
                    />
                  ) : (
                    <div className="prose prose-sm max-w-none">
                      <div className="whitespace-pre-wrap rounded-md border border-border bg-background p-6 
                                    text-foreground leading-relaxed">
                        {renderWithCitations(
                          section.content, 
                          editedReport.citations,
                          handleViewCitationDetails
                        )}
                      </div>
                    </div>
                  )}

                  {/* Section Citations */}
                  {showCitations && getCitationsBySection(index).length > 0 && (
                    <div className="ml-4 space-y-2">
                      <h4 className="text-sm font-semibold text-foreground/80">
                        Citations in this section:
                      </h4>
                      {getCitationsBySection(index).map((citation, citationIndex) => (
                        <div
                          key={`${citation.id}-${citationIndex}`}
                          className="flex gap-3 rounded-md bg-border/10 p-3 text-sm hover:bg-border/20 
                                   transition-colors cursor-pointer"
                          onClick={() => handleViewCitationDetails(citation)}
                        >
                          <div className="shrink-0 font-mono text-xs text-foreground/40">
                            [{citationIndex + 1}]
                          </div>
                          <div className="flex-1">
                            <p className="text-foreground/80">{citation.snippetText}</p>
                            <div className="mt-1 flex items-center gap-3 text-xs text-foreground/60">
                              <span>{citation.source}</span>
                              <span>•</span>
                              <span className={
                                citation.confidence >= 0.8 ? 'text-green-600' :
                                citation.confidence >= 0.6 ? 'text-yellow-600' :
                                'text-orange-600'
                              }>
                                Confidence: {(citation.confidence * 100).toFixed(0)}%
                              </span>
                              <span>•</span>
                              <span className="text-primary hover:underline">Click for details</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          </div>

          {/* Citations Sidebar */}
          {showCitations && (
            <div className="w-80 border-l border-border bg-border/5 overflow-y-auto">
              <div className="sticky top-0 bg-border/10 border-b border-border px-6 py-4">
                <h3 className="font-semibold">All Citations ({editedReport.citations.length})</h3>
              </div>
              <div className="p-6 space-y-3">
                {editedReport.citations.map((citation, index) => (
                  <div 
                    key={citation.id} 
                    className="rounded-md bg-background border border-border p-3 text-sm 
                             hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => handleViewCitationDetails(citation)}
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <span className="font-mono text-xs text-foreground/40">
                        [{index + 1}] {citation.evidenceId.slice(0, 8)}...
                      </span>
                      <span className={`
                        shrink-0 rounded-full px-2 py-0.5 text-xs font-medium
                        ${citation.confidence >= 0.8 
                          ? 'bg-green-100 text-green-700' 
                          : citation.confidence >= 0.6 
                          ? 'bg-yellow-100 text-yellow-700' 
                          : 'bg-orange-100 text-orange-700'
                        }
                      `}>
                        {(citation.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="mb-2 text-foreground/80 line-clamp-3">{citation.snippetText}</p>
                    <p className="text-xs text-foreground/60">{citation.source}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-background px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <button onClick={onBack} className="btn-secondary">
              ← Back to Configuration
            </button>
            <div className="flex items-center gap-3">
              {report.status === 'draft' && (
                <>
                  <button 
                    onClick={handleSaveDraft} 
                    className="btn-secondary"
                    disabled={savingDraft}
                  >
                    {savingDraft ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button 
                    onClick={handleFinalizeReport} 
                    className="btn-secondary"
                  >
                    🔒 Finalize Report
                  </button>
                </>
              )}
              <button
                onClick={() => setShowExportModal(true)}
                className="btn-primary"
              >
                📄 Export Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          reportId={report.reportId}
          companyId={companyId}
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          isDraft={report.status === 'draft'}
        />
      )}
    </>
  );
}
