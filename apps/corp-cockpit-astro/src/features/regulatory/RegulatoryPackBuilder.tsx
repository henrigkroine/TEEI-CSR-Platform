/**
 * Regulatory Pack Builder
 *
 * Main component for building and exporting regulatory compliance packs.
 * Supports CSRD, GRI, and SDG frameworks with evidence scoping.
 */

import { useState, useEffect } from 'react';
import type {
  FrameworkType,
  GeneratePackRequest,
  GeneratePackResponse,
  RegulatoryPack,
  PackListItem,
} from '@teei/shared-types';
import { FrameworkSelector } from './components/FrameworkSelector';
import { ScopeConfiguration } from './components/ScopeConfiguration';
import { CompletenessPreview } from './components/CompletenessPreview';
import { ExportActions } from './components/ExportActions';
import { PacksList } from './components/PacksList';

interface Props {
  companyId: string;
}

export function RegulatoryPackBuilder({ companyId }: Props) {
  // State
  const [selectedFrameworks, setSelectedFrameworks] = useState<FrameworkType[]>(['CSRD']);
  const [periodStart, setPeriodStart] = useState<string>('');
  const [periodEnd, setPeriodEnd] = useState<string>('');
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [includeStale, setIncludeStale] = useState(false);
  const [language, setLanguage] = useState<string>('en');

  const [isGenerating, setIsGenerating] = useState(false);
  const [currentPack, setCurrentPack] = useState<RegulatoryPack | null>(null);
  const [packsList, setPacksList] = useState<PackListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Set default dates (last 12 months)
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setFullYear(start.getFullYear() - 1);

    setPeriodEnd(end.toISOString().split('T')[0]);
    setPeriodStart(start.toISOString().split('T')[0]);
  }, []);

  // Load existing packs
  useEffect(() => {
    loadPacks();
  }, [companyId]);

  const loadPacks = async () => {
    try {
      const response = await fetch(
        `/api/regulatory/packs?companyId=${companyId}`
      );

      if (!response.ok) {
        throw new Error('Failed to load packs');
      }

      const data = await response.json();
      setPacksList(data.packs || []);
    } catch (err) {
      console.error('Error loading packs:', err);
    }
  };

  const handleGenerate = async () => {
    setError(null);
    setIsGenerating(true);

    try {
      const payload: GeneratePackRequest = {
        companyId,
        period: {
          start: periodStart,
          end: periodEnd,
        },
        frameworks: selectedFrameworks,
        evidenceScope: {
          programs: selectedPrograms.length > 0 ? selectedPrograms as any : undefined,
          metrics: selectedMetrics.length > 0 ? selectedMetrics : undefined,
          includeStale,
        },
        options: {
          language: language as any,
          includeGaps: true,
          pdfOptions: {
            includeTOC: true,
            includeFootnotes: true,
            watermark: true,
          },
        },
      };

      const response = await fetch('/api/regulatory/packs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate pack');
      }

      const result: GeneratePackResponse = await response.json();

      // Poll for pack completion
      pollPackStatus(result.packId);
    } catch (err: any) {
      setError(err.message);
      setIsGenerating(false);
    }
  };

  const pollPackStatus = async (packId: string) => {
    const maxAttempts = 60; // 60 * 2s = 2 minutes max
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/regulatory/packs/${packId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch pack status');
        }

        const pack: RegulatoryPack = await response.json();

        if (pack.status === 'ready') {
          setCurrentPack(pack);
          setIsGenerating(false);
          loadPacks(); // Refresh list
        } else if (pack.status === 'failed') {
          setError('Pack generation failed');
          setIsGenerating(false);
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 2000); // Poll every 2 seconds
        } else {
          setError('Pack generation timed out');
          setIsGenerating(false);
        }
      } catch (err: any) {
        setError(err.message);
        setIsGenerating(false);
      }
    };

    poll();
  };

  const handleLoadPack = async (packId: string) => {
    try {
      const response = await fetch(`/api/regulatory/packs/${packId}`);

      if (!response.ok) {
        throw new Error('Failed to load pack');
      }

      const pack: RegulatoryPack = await response.json();
      setCurrentPack(pack);

      // Update form with pack settings
      setSelectedFrameworks(pack.frameworks);
      setPeriodStart(pack.period.start);
      setPeriodEnd(pack.period.end);
      setLanguage(pack.metadata.language);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleExportJSON = () => {
    if (!currentPack) return;

    const blob = new Blob([JSON.stringify(currentPack, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `regulatory-pack-${currentPack.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    if (!currentPack) return;

    try {
      const response = await fetch(`/api/regulatory/packs/${currentPack.id}/pdf`);

      if (!response.ok) {
        throw new Error('Failed to export PDF');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `regulatory-pack-${currentPack.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="regulatory-pack-builder">
      <div className="builder-header">
        <h1>Regulatory Compliance Pack Builder</h1>
        <p className="description">
          Generate comprehensive compliance packs for CSRD, GRI, and SDG frameworks
          with evidence-based disclosures and gap analysis.
        </p>
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          <strong>Error:</strong> {error}
          <button
            onClick={() => setError(null)}
            className="alert-close"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      <div className="builder-grid">
        {/* Left Column: Configuration */}
        <div className="builder-config">
          <section className="config-section">
            <h2>1. Select Frameworks</h2>
            <FrameworkSelector
              selected={selectedFrameworks}
              onChange={setSelectedFrameworks}
            />
          </section>

          <section className="config-section">
            <h2>2. Reporting Period</h2>
            <div className="period-inputs">
              <div className="form-group">
                <label htmlFor="period-start">Start Date</label>
                <input
                  id="period-start"
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label htmlFor="period-end">End Date</label>
                <input
                  id="period-end"
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="form-control"
                />
              </div>
            </div>
          </section>

          <section className="config-section">
            <h2>3. Evidence Scope</h2>
            <ScopeConfiguration
              selectedPrograms={selectedPrograms}
              selectedMetrics={selectedMetrics}
              includeStale={includeStale}
              onProgramsChange={setSelectedPrograms}
              onMetricsChange={setSelectedMetrics}
              onIncludeStaleChange={setIncludeStale}
            />
          </section>

          <section className="config-section">
            <h2>4. Options</h2>
            <div className="form-group">
              <label htmlFor="language">Report Language</label>
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="form-control"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="uk">Ukrainian</option>
                <option value="no">Norwegian</option>
              </select>
            </div>
          </section>

          <div className="action-buttons">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || selectedFrameworks.length === 0 || !periodStart || !periodEnd}
              className="btn btn-primary btn-lg"
            >
              {isGenerating ? (
                <>
                  <span className="spinner" />
                  Generating...
                </>
              ) : (
                'Generate Pack'
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Preview & Export */}
        <div className="builder-preview">
          {currentPack ? (
            <>
              <CompletenessPreview pack={currentPack} />
              <ExportActions
                pack={currentPack}
                onExportJSON={handleExportJSON}
                onExportPDF={handleExportPDF}
              />
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>No Pack Generated</h3>
              <p>
                Configure your pack settings and click "Generate Pack" to create
                a compliance pack.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Existing Packs List */}
      <section className="packs-list-section">
        <h2>Previous Packs</h2>
        <PacksList packs={packsList} onLoad={handleLoadPack} />
      </section>

      <style jsx>{`
        .regulatory-pack-builder {
          max-width: 1400px;
          margin: 0 auto;
          padding: 30px;
        }

        .builder-header {
          margin-bottom: 40px;
        }

        .builder-header h1 {
          font-size: 28px;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 10px;
        }

        .builder-header .description {
          font-size: 16px;
          color: #6b7280;
        }

        .alert {
          padding: 15px 20px;
          border-radius: 8px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .alert-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
        }

        .alert-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #991b1b;
        }

        .builder-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 40px;
        }

        .config-section {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 25px;
          margin-bottom: 20px;
        }

        .config-section h2 {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 20px;
        }

        .period-inputs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .form-group {
          margin-bottom: 15px;
        }

        .form-group label {
          display: block;
          font-weight: 500;
          color: #374151;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .form-control {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
        }

        .form-control:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .action-buttons {
          margin-top: 20px;
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #667eea;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #5568d3;
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-lg {
          width: 100%;
          padding: 14px 28px;
          font-size: 18px;
        }

        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
          margin-right: 8px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .empty-state {
          background: white;
          border: 2px dashed #d1d5db;
          border-radius: 8px;
          padding: 60px 40px;
          text-align: center;
          color: #6b7280;
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 20px;
        }

        .empty-state h3 {
          font-size: 20px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 10px;
        }

        .packs-list-section {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 25px;
        }

        .packs-list-section h2 {
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 20px;
        }

        @media (max-width: 1024px) {
          .builder-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
