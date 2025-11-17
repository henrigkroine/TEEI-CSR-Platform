/**
 * Generator Page Component
 *
 * Main page for generating case studies and methods whitepapers
 * Handles API calls, loading states, and export functionality
 */

import { useState } from 'react';
import GeneratorSelector, { type GeneratorConfig } from './GeneratorSelector';

interface GeneratedSection {
  type: string;
  content: string;
  citations: {
    id: string;
    snippetId: string;
    text: string;
    relevanceScore?: number;
  }[];
  wordCount: number;
  characterCount: number;
}

interface GeneratedReport {
  reportId: string;
  sections: GeneratedSection[];
  lineage: {
    modelName: string;
    promptVersion: string;
    timestamp: string;
    tokensUsed: number;
    tokensInput: number;
    tokensOutput: number;
    estimatedCostUsd: string;
  };
  warnings?: string[];
}

interface GeneratorPageProps {
  companyId: string;
}

export default function GeneratorPage({ companyId }: GeneratorPageProps) {
  const [step, setStep] = useState<'select' | 'generating' | 'preview'>('select');
  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleGenerate = async (config: GeneratorConfig) => {
    setStep('generating');
    setError(null);
    setProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      // Call API
      const response = await fetch('/api/reporting/gen-reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: config.companyId,
          period: {
            start: config.period.start,
            end: config.period.end,
          },
          locale: config.locale,
          reportType: config.type,
          deterministic: config.deterministic,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
        }),
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Generation failed');
      }

      const result: GeneratedReport = await response.json();
      setReport(result);
      setStep('preview');
    } catch (err: any) {
      setError(err.message || 'An error occurred during generation');
      setStep('select');
      setProgress(0);
    }
  };

  const handleCancel = () => {
    setStep('select');
    setReport(null);
    setError(null);
    setProgress(0);
  };

  const handleExport = async (format: 'pdf' | 'pptx') => {
    if (!report) return;

    try {
      const response = await fetch(`/api/reporting/export/${format}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportId: report.reportId,
          companyId,
          format,
        }),
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${report.reportId}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Export failed');
    }
  };

  return (
    <div className="generator-page min-h-screen bg-gray-50 py-8 px-4">
      {/* Error Alert */}
      {error && (
        <div className="max-w-3xl mx-auto mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
            <span className="text-xl">❌</span>
            Generation Failed
          </h4>
          <p className="text-sm text-red-800">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-3 text-sm text-red-700 hover:text-red-900 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Step 1: Configuration */}
      {step === 'select' && (
        <GeneratorSelector
          companyId={companyId}
          onGenerate={handleGenerate}
          onCancel={() => window.history.back()}
        />
      )}

      {/* Step 2: Generating */}
      {step === 'generating' && (
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">
            Generating Report...
          </h2>

          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-indigo-600 h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-center text-sm text-gray-600 mt-2">{progress}% complete</p>
          </div>

          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <span className={progress >= 10 ? 'text-green-600' : 'text-gray-400'}>
                {progress >= 10 ? '✓' : '○'}
              </span>
              Extracting evidence snippets...
            </div>
            <div className="flex items-center gap-2">
              <span className={progress >= 30 ? 'text-green-600' : 'text-gray-400'}>
                {progress >= 30 ? '✓' : '○'}
              </span>
              Redacting PII from evidence...
            </div>
            <div className="flex items-center gap-2">
              <span className={progress >= 50 ? 'text-green-600' : 'text-gray-400'}>
                {progress >= 50 ? '✓' : '○'}
              </span>
              Generating narrative with LLM...
            </div>
            <div className="flex items-center gap-2">
              <span className={progress >= 70 ? 'text-green-600' : 'text-gray-400'}>
                {progress >= 70 ? '✓' : '○'}
              </span>
              Validating citations (Evidence Gate)...
            </div>
            <div className="flex items-center gap-2">
              <span className={progress >= 90 ? 'text-green-600' : 'text-gray-400'}>
                {progress >= 90 ? '✓' : '○'}
              </span>
              Storing lineage metadata...
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && report && (
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Report Preview</h2>
              <button
                onClick={handleCancel}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                ← Back to Selector
              </button>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg mb-6">
              <div>
                <dt className="text-xs text-gray-600">Report ID</dt>
                <dd className="text-sm font-mono text-gray-900">{report.reportId.slice(0, 8)}...</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-600">Model</dt>
                <dd className="text-sm text-gray-900">{report.lineage.modelName}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-600">Tokens Used</dt>
                <dd className="text-sm text-gray-900">{report.lineage.tokensUsed.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-600">Cost</dt>
                <dd className="text-sm text-gray-900">${report.lineage.estimatedCostUsd}</dd>
              </div>
            </div>

            {/* Warnings */}
            {report.warnings && report.warnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-yellow-900 mb-2">Warnings</h4>
                <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1">
                  {report.warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Export Buttons */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={() => handleExport('pdf')}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
              >
                <span>📄</span>
                Export PDF
              </button>
              <button
                onClick={() => handleExport('pptx')}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 font-medium"
              >
                <span>📊</span>
                Export PPTX
              </button>
            </div>
          </div>

          {/* Content Preview */}
          {report.sections.map((section, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800 capitalize">
                  {section.type.replace(/-/g, ' ')}
                </h3>
                <div className="flex gap-4 text-sm text-gray-600">
                  <span>{section.wordCount} words</span>
                  <span>{section.citations.length} citations</span>
                </div>
              </div>

              {/* Content with citation highlighting */}
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-700">
                  {section.content}
                </pre>
              </div>

              {/* Citations List */}
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-indigo-600 hover:text-indigo-700">
                  View {section.citations.length} Citations
                </summary>
                <ul className="mt-2 space-y-2 text-sm">
                  {section.citations.map((citation, i) => (
                    <li key={i} className="p-2 bg-gray-50 rounded border border-gray-200">
                      <span className="font-mono text-xs text-gray-500">[{citation.id}]</span>{' '}
                      <span className="text-gray-700">{citation.text}</span>
                      {citation.relevanceScore && (
                        <span className="ml-2 text-xs text-gray-500">
                          (relevance: {citation.relevanceScore.toFixed(2)})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
