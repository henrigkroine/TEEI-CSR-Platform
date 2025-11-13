import { useState } from 'react';
import type { GenerateReportResponse } from '@teei/shared-types';
import ReportPreview from './ReportPreview';

interface GenerateReportModalProps {
  companyId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function GenerateReportModal({ companyId, isOpen, onClose }: GenerateReportModalProps) {
  const [report, setReport] = useState<GenerateReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-03-31');
  const [programs, setPrograms] = useState<string[]>([]);
  const [seed, setSeed] = useState<string>('');

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/gen-reports:generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId,
          period: {
            start: startDate,
            end: endDate,
          },
          filters: {
            programs: programs.length > 0 ? programs : undefined,
          },
          options: {
            seed: seed ? parseInt(seed, 10) : undefined,
            maxTokens: 4000,
            temperature: 0.3,
            language: 'en',
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate report');
      }

      const data: GenerateReportResponse = await response.json();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleProgramToggle = (program: string) => {
    if (programs.includes(program)) {
      setPrograms(programs.filter((p) => p !== program));
    } else {
      setPrograms([...programs, program]);
    }
  };

  const handleClose = () => {
    setReport(null);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  // Show report preview if report generated
  if (report) {
    return <ReportPreview report={report} onClose={handleClose} onBack={() => setReport(null)} />;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background shadow-2xl"
        role="dialog"
        aria-labelledby="generate-report-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 id="generate-report-title" className="text-xl font-bold">
              Generate Quarterly Report
            </h2>
            <button
              onClick={handleClose}
              className="btn-secondary"
              aria-label="Close modal"
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
        <div className="max-h-[70vh] overflow-y-auto p-6">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4 text-red-600">
              <p className="font-medium">Error generating report</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Period */}
            <div>
              <h3 className="mb-3 font-semibold">Report Period</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="start-date" className="mb-1 block text-sm font-medium">
                    Start Date
                  </label>
                  <input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="end-date" className="mb-1 block text-sm font-medium">
                    End Date
                  </label>
                  <input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            {/* Programs */}
            <div>
              <h3 className="mb-3 font-semibold">Include Programs (optional)</h3>
              <div className="space-y-2">
                {['buddy', 'language', 'mentorship', 'upskilling'].map((program) => (
                  <label key={program} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={programs.includes(program)}
                      onChange={() => handleProgramToggle(program)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-sm capitalize">{program}</span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-foreground/60">
                Leave unchecked to include all programs
              </p>
            </div>

            {/* Advanced Options */}
            <details className="group">
              <summary className="cursor-pointer font-semibold hover:text-primary">
                Advanced Options
              </summary>
              <div className="mt-3 space-y-4">
                <div>
                  <label htmlFor="seed" className="mb-1 block text-sm font-medium">
                    Deterministic Seed (optional)
                  </label>
                  <input
                    id="seed"
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    placeholder="e.g., 42"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="mt-1 text-xs text-foreground/60">
                    Use the same seed for reproducible reports
                  </p>
                </div>
              </div>
            </details>

            {/* Info box */}
            <div className="rounded-md bg-primary/10 p-4 text-sm">
              <p className="mb-2 font-medium">What to expect:</p>
              <ul className="list-inside list-disc space-y-1 text-foreground/60">
                <li>AI-generated narrative with evidence citations</li>
                <li>4 sections: Summary, Metrics, Insights, Recommendations</li>
                <li>Generation takes 30-60 seconds</li>
                <li>All claims backed by Q2Q evidence</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4">
          <div className="flex items-center justify-end gap-3">
            <button onClick={handleClose} className="btn-secondary" disabled={loading}>
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              className="btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Generating... (30-60s)
                </>
              ) : (
                'Generate Report'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
