import { useState, useRef, useEffect } from 'react';
import type {
  GenerateReportRequest,
  ReportType,
  ReportTone,
  ReportLength
} from '../../types/reports';
import ReportPreview from './ReportPreview';
import type { GeneratedReport } from '../../types/reports';
import { FocusTrap } from '../a11y/FocusManager';
import { reportingClient, estimateReportCost, formatCost, ReportingAPIError } from '../../api/reporting';

interface GenerateReportModalProps {
  companyId: string;
  isOpen: boolean;
  onClose: () => void;
  lang?: string;
}

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  quarterly: 'Quarterly Report',
  annual: 'Annual Report',
  board_presentation: 'Board Presentation',
  csrd: 'CSRD Compliance Report'
};

const TONE_LABELS: Record<ReportTone, string> = {
  professional: 'Professional',
  inspiring: 'Inspiring',
  technical: 'Technical'
};

const LENGTH_LABELS: Record<ReportLength, string> = {
  brief: 'Brief',
  standard: 'Standard',
  detailed: 'Detailed'
};

export default function GenerateReportModal({
  companyId,
  isOpen,
  onClose,
  lang = 'en'
}: GenerateReportModalProps) {
  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'general' | 'rate_limit' | 'budget' | 'timeout'>('general');
  const [progress, setProgress] = useState(0);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [estimatedCost, setEstimatedCost] = useState<string | null>(null);
  const [showCostWarning, setShowCostWarning] = useState(false);

  // Form state - Step 1: Configuration
  const [reportType, setReportType] = useState<ReportType>('quarterly');
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-03-31');
  const [programs, setPrograms] = useState<string[]>([]);
  const [outcomes, setOutcomes] = useState<string[]>([]);
  
  // Options
  const [tone, setTone] = useState<ReportTone>('professional');
  const [length, setLength] = useState<ReportLength>('standard');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [deterministic, setDeterministic] = useState(false);
  const [seed, setSeed] = useState<string>('');

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) {
        event.preventDefault();
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, loading]);

  // Focus close button when modal opens
  useEffect(() => {
    if (isOpen && closeButtonRef.current && !report) {
      setTimeout(() => closeButtonRef.current?.focus(), 100);
    }
  }, [isOpen, report]);

  // Update cost estimate when options change
  useEffect(() => {
    const request: GenerateReportRequest = {
      reportType,
      period: { from: startDate, to: endDate },
      options: { tone, length, includeCharts, deterministic },
    };
    const estimate = estimateReportCost(request);
    setEstimatedCost(estimate.estimatedCostUsd);
    // Show warning if estimated cost is high (>$0.50)
    setShowCostWarning(parseFloat(estimate.estimatedCostUsd) > 0.5);
  }, [reportType, startDate, endDate, tone, length, includeCharts, deterministic]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setErrorType('general');
    setProgress(0);

    try {
      const request: GenerateReportRequest = {
        reportType,
        period: {
          from: startDate,
          to: endDate,
        },
        filters: {
          programs: programs.length > 0 ? programs : undefined,
          outcomes: outcomes.length > 0 ? outcomes : undefined,
        },
        options: {
          tone,
          length,
          includeCharts,
          deterministic,
          seed: deterministic && seed ? parseInt(seed, 10) : undefined,
        },
      };

      // Simulate progress (in production, use SSE or polling)
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 1000);

      // Use reporting client to generate report
      const data = await reportingClient.generateReport(request, companyId);

      clearInterval(progressInterval);
      setProgress(100);
      setReport(data);
    } catch (err) {
      // Handle different error types
      if (err instanceof ReportingAPIError) {
        setError(err.message);

        if (err.isRateLimited()) {
          setErrorType('rate_limit');
        } else if (err.isBudgetExceeded()) {
          setErrorType('budget');
        } else if (err.message.includes('timeout')) {
          setErrorType('timeout');
        } else {
          setErrorType('general');
        }
      } else {
        setError(err instanceof Error ? err.message : 'An error occurred while generating the report');
        setErrorType('general');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProgramToggle = (program: string) => {
    setPrograms(prev => 
      prev.includes(program) 
        ? prev.filter(p => p !== program)
        : [...prev, program]
    );
  };

  const handleOutcomeToggle = (outcome: string) => {
    setOutcomes(prev => 
      prev.includes(outcome) 
        ? prev.filter(o => o !== outcome)
        : [...prev, outcome]
    );
  };

  const handleClose = () => {
    setReport(null);
    setError(null);
    setProgress(0);
    onClose();
  };

  const isValid = startDate && endDate && new Date(startDate) < new Date(endDate);

  if (!isOpen) return null;

  // Show report preview if report generated
  if (report) {
    return (
      <ReportPreview
        report={report}
        companyId={companyId}
        onClose={handleClose}
        onBack={() => setReport(null)}
        lang={lang}
      />
    );
  }

  return (
    <FocusTrap active={isOpen} restoreFocusOnDeactivate={true} focusFirstOnActivate={true}>
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={handleClose}
          aria-hidden="true"
        />

        {/* Modal */}
        <div
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2
                     max-h-[90vh] overflow-hidden rounded-lg bg-background shadow-2xl"
          role="dialog"
          aria-labelledby="generate-report-title"
          aria-modal="true"
        >
          {/* Header */}
          <div className="border-b border-border px-6 py-4 bg-background sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <h2 id="generate-report-title" className="text-xl font-bold">
                Generate Report
              </h2>
              <button
                ref={closeButtonRef}
                onClick={handleClose}
                className="btn-secondary"
                aria-label="Close modal"
                disabled={loading}
              >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <title>Close icon</title>
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
        <div className="max-h-[calc(90vh-10rem)] overflow-y-auto p-6">
          {/* Error Display */}
          {error && (
            <div className={`mb-4 rounded-md p-4 border ${
              errorType === 'rate_limit' ? 'bg-orange-50 text-orange-600 border-orange-200' :
              errorType === 'budget' ? 'bg-red-50 text-red-600 border-red-200' :
              errorType === 'timeout' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
              'bg-red-50 text-red-600 border-red-200'
            }`} role="alert" aria-live="assertive">
              <p className="font-medium">
                {errorType === 'rate_limit' && '⏱️ Rate Limit Exceeded'}
                {errorType === 'budget' && '💰 Budget Exceeded'}
                {errorType === 'timeout' && '⏰ Request Timeout'}
                {errorType === 'general' && 'Error Generating Report'}
              </p>
              <p className="text-sm mt-1">{error}</p>
              {errorType === 'rate_limit' && (
                <p className="text-sm mt-2">
                  Please wait a few minutes before trying again. Rate limits help ensure fair usage for all users.
                </p>
              )}
              {errorType === 'budget' && (
                <p className="text-sm mt-2">
                  Your AI generation budget has been exceeded. Contact your administrator to increase limits.
                </p>
              )}
              {errorType === 'timeout' && (
                <p className="text-sm mt-2">
                  The request took too long. Try generating a briefer report or try again later.
                </p>
              )}
            </div>
          )}

          {/* Cost Estimate Warning */}
          {estimatedCost && showCostWarning && !loading && !error && (
            <div className="mb-4 rounded-md bg-yellow-50 p-4 text-yellow-800 border border-yellow-200">
              <p className="font-medium flex items-center gap-2">
                💰 High Cost Estimate
              </p>
              <p className="text-sm mt-1">
                This report will cost approximately {formatCost(estimatedCost)} to generate.
                Consider using a briefer format to reduce costs.
              </p>
            </div>
          )}

          {loading && (
            <div className="mb-4 rounded-md bg-blue-50 p-4 border border-blue-200" role="status" aria-live="polite">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" aria-hidden="true" />
                <div className="flex-1">
                  <p className="font-medium text-blue-900">Generating report...</p>
                  <p className="text-sm text-blue-700 mt-1">
                    This typically takes 8-15 seconds
                  </p>
                </div>
              </div>
              {progress > 0 && (
                <div className="mt-3">
                  <div className="h-2 bg-blue-200 rounded-full overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Report generation progress">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-blue-600 mt-1" aria-live="polite">{progress}% complete</p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-6">
            {/* Report Type */}
            <div>
              <h3 className="mb-3 font-semibold text-foreground">Report Type</h3>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(REPORT_TYPE_LABELS) as ReportType[]).map((type) => (
                  <label
                    key={type}
                    className={`
                      flex items-center justify-center gap-2 p-4 rounded-lg border-2 cursor-pointer
                      transition-all hover:border-primary/50
                      ${reportType === type 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border bg-background'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="reportType"
                      value={type}
                      checked={reportType === type}
                      onChange={(e) => setReportType(e.target.value as ReportType)}
                      className="sr-only"
                    />
                    <span className="font-medium text-sm">
                      {REPORT_TYPE_LABELS[type]}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Period */}
            <div>
              <h3 className="mb-3 font-semibold text-foreground">Report Period</h3>
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
                    disabled={loading}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm 
                             focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary
                             disabled:opacity-50 disabled:cursor-not-allowed"
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
                    disabled={loading}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm 
                             focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-2 gap-6">
              {/* Programs */}
              <div>
                <h3 className="mb-3 font-semibold text-foreground">Programs (optional)</h3>
                <div className="space-y-2">
                  {['buddy', 'language', 'mentorship', 'upskilling'].map((program) => (
                    <label key={program} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={programs.includes(program)}
                        onChange={() => handleProgramToggle(program)}
                        disabled={loading}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary
                                 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <span className="text-sm capitalize">{program}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-foreground/60">
                  Leave unchecked to include all programs
                </p>
              </div>

              {/* Outcomes */}
              <div>
                <h3 className="mb-3 font-semibold text-foreground">Outcomes (optional)</h3>
                <div className="space-y-2">
                  {['integration', 'employment', 'language', 'wellbeing'].map((outcome) => (
                    <label key={outcome} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={outcomes.includes(outcome)}
                        onChange={() => handleOutcomeToggle(outcome)}
                        disabled={loading}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary
                                 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <span className="text-sm capitalize">{outcome}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-foreground/60">
                  Filter by specific outcome types
                </p>
              </div>
            </div>

            {/* Options */}
            <details className="group" open>
              <summary className="cursor-pointer font-semibold hover:text-primary text-foreground
                               flex items-center gap-2 select-none">
                <span className="transform transition-transform group-open:rotate-90">▶</span>
                Report Options
              </summary>
              <div className="mt-4 space-y-4 pl-6">
                {/* Tone */}
                <div>
                  <label htmlFor="tone" className="mb-2 block text-sm font-medium">
                    Tone
                  </label>
                  <select
                    id="tone"
                    value={tone}
                    onChange={(e) => setTone(e.target.value as ReportTone)}
                    disabled={loading}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm 
                             focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {(Object.keys(TONE_LABELS) as ReportTone[]).map((t) => (
                      <option key={t} value={t}>
                        {TONE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-foreground/60">
                    Adjust the narrative style
                  </p>
                </div>

                {/* Length */}
                <div>
                  <label htmlFor="length" className="mb-2 block text-sm font-medium">
                    Length
                  </label>
                  <select
                    id="length"
                    value={length}
                    onChange={(e) => setLength(e.target.value as ReportLength)}
                    disabled={loading}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm 
                             focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {(Object.keys(LENGTH_LABELS) as ReportLength[]).map((l) => (
                      <option key={l} value={l}>
                        {LENGTH_LABELS[l]}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-foreground/60">
                    Brief: ~500 words | Standard: ~1000 words | Detailed: ~2000 words
                  </p>
                </div>

                {/* Include Charts */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeCharts}
                    onChange={(e) => setIncludeCharts(e.target.checked)}
                    disabled={loading}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="text-sm">Include charts and visualizations</span>
                </label>

                {/* Deterministic */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deterministic}
                      onChange={(e) => setDeterministic(e.target.checked)}
                      disabled={loading}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary
                               disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="text-sm">Deterministic output (reproducible)</span>
                  </label>
                  {deterministic && (
                    <input
                      type="number"
                      value={seed}
                      onChange={(e) => setSeed(e.target.value)}
                      placeholder="Seed (e.g., 42)"
                      disabled={loading}
                      className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm 
                               focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary
                               disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  )}
                  <p className="mt-1 text-xs text-foreground/60">
                    Use the same seed to generate identical reports
                  </p>
                </div>
              </div>
            </details>

            {/* Info box */}
            <div className="rounded-md bg-primary/10 border border-primary/20 p-4 text-sm">
              <p className="mb-2 font-medium text-foreground">What to expect:</p>
              <ul className="list-inside list-disc space-y-1 text-foreground/80">
                <li>AI-generated narrative with evidence citations</li>
                <li>Structured sections: Summary, Metrics, Outcomes, Recommendations</li>
                <li>Generation takes 8-15 seconds</li>
                <li>All claims backed by Q2Q evidence</li>
                <li>Editable content with inline citation tracking</li>
                {estimatedCost && (
                  <li className="font-medium text-foreground">
                    Estimated cost: {formatCost(estimatedCost)}
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 bg-background sticky bottom-0">
          <div className="flex items-center justify-end gap-3">
            <button 
              onClick={handleClose} 
              className="btn-secondary" 
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              className="btn-primary"
              disabled={loading || !isValid}
              aria-label={loading ? 'Generating report' : 'Generate report'}
            >
              {loading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Generating...
                </>
              ) : (
                'Generate Report'
              )}
            </button>
          </div>
        </div>
      </div>
      </>
    </FocusTrap>
  );
}
