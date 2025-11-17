import { useState, useRef, useEffect } from 'react';
import { FocusTrap } from '../a11y/FocusManager';

interface CaseStudyGeneratorProps {
  companyId: string;
  lang?: string;
}

interface GenerationConfig {
  periodStart: string;
  periodEnd: string;
  programType: string;
  targetDemographic: string;
  locale: string;
  deterministic: boolean;
  temperature: number;
  maxTokens: number;
}

interface GeneratedCaseStudy {
  reportId: string;
  content: string;
  citations: Array<{
    id: string;
    snippetId: string;
    text: string;
    relevanceScore?: number;
  }>;
  wordCount: number;
  characterCount: number;
  lineage: {
    modelName: string;
    promptVersion: string;
    timestamp: string;
    tokensUsed: number;
    estimatedCostUsd: string;
  };
}

export default function CaseStudyGenerator({ companyId, lang = 'en' }: CaseStudyGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedReport, setGeneratedReport] = useState<GeneratedCaseStudy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [config, setConfig] = useState<GenerationConfig>({
    periodStart: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0],
    periodEnd: new Date().toISOString().split('T')[0],
    programType: 'mentorship',
    targetDemographic: 'young-adults',
    locale: lang,
    deterministic: false,
    temperature: 0.7,
    maxTokens: 4000,
  });

  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgress(0);
    setError(null);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 1000);

      // Call API
      const response = await fetch('/api/v1/gen-reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId,
          period: {
            start: config.periodStart,
            end: config.periodEnd,
          },
          reportType: 'case-study',
          locale: config.locale,
          deterministic: config.deterministic,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
        }),
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate case study');
      }

      const data = await response.json();
      setGeneratedReport({
        reportId: data.reportId,
        content: data.sections[0]?.content || '',
        citations: data.sections[0]?.citations || [],
        wordCount: data.sections[0]?.wordCount || 0,
        characterCount: data.sections[0]?.characterCount || 0,
        lineage: data.lineage,
      });
      setShowModal(true);
    } catch (err: any) {
      setError(err.message || 'Failed to generate case study');
      console.error('[CaseStudyGenerator] Error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'pptx') => {
    if (!generatedReport) return;

    try {
      const response = await fetch('/api/v1/export/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportId: generatedReport.reportId,
          options: {
            includeCharts: true,
            includeCitations: true,
            includeTableOfContents: true,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `case-study-${generatedReport.reportId}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || 'Export failed');
    }
  };

  const closeModal = () => {
    setShowModal(false);
  };

  useEffect(() => {
    if (showModal && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [showModal]);

  return (
    <div className="case-study-generator">
      <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="generator-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="period-start">
              {lang === 'en' ? 'Period Start' : lang === 'es' ? 'Inicio del Período' : lang === 'fr' ? 'Début de Période' : lang === 'uk' ? 'Початок Періоду' : 'Periodestart'}
            </label>
            <input
              type="date"
              id="period-start"
              value={config.periodStart}
              onChange={(e) => setConfig({ ...config, periodStart: e.target.value })}
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="period-end">
              {lang === 'en' ? 'Period End' : lang === 'es' ? 'Fin del Período' : lang === 'fr' ? 'Fin de Période' : lang === 'uk' ? 'Кінець Періоду' : 'Periodeslutt'}
            </label>
            <input
              type="date"
              id="period-end"
              value={config.periodEnd}
              onChange={(e) => setConfig({ ...config, periodEnd: e.target.value })}
              required
              className="form-input"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="program-type">
              {lang === 'en' ? 'Program Type' : lang === 'es' ? 'Tipo de Programa' : lang === 'fr' ? 'Type de Programme' : lang === 'uk' ? 'Тип Програми' : 'Programtype'}
            </label>
            <select
              id="program-type"
              value={config.programType}
              onChange={(e) => setConfig({ ...config, programType: e.target.value })}
              className="form-select"
            >
              <option value="mentorship">{lang === 'en' ? 'Mentorship' : lang === 'es' ? 'Mentoría' : lang === 'fr' ? 'Mentorat' : lang === 'uk' ? 'Менторство' : 'Mentorskap'}</option>
              <option value="upskilling">{lang === 'en' ? 'Upskilling' : lang === 'es' ? 'Desarrollo de Habilidades' : lang === 'fr' ? 'Montée en Compétences' : lang === 'uk' ? 'Підвищення Кваліфікації' : 'Opplæring'}</option>
              <option value="buddy-matching">{lang === 'en' ? 'Buddy Matching' : lang === 'es' ? 'Emparejamiento de Compañeros' : lang === 'fr' ? 'Jumelage' : lang === 'uk' ? 'Підбір Партнерів' : 'Vennematching'}</option>
              <option value="hybrid">{lang === 'en' ? 'Hybrid' : lang === 'es' ? 'Híbrido' : lang === 'fr' ? 'Hybride' : lang === 'uk' ? 'Гібрид' : 'Hybrid'}</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="locale">
              {lang === 'en' ? 'Report Language' : lang === 'es' ? 'Idioma del Informe' : lang === 'fr' ? 'Langue du Rapport' : lang === 'uk' ? 'Мова Звіту' : 'Rapportspråk'}
            </label>
            <select
              id="locale"
              value={config.locale}
              onChange={(e) => setConfig({ ...config, locale: e.target.value })}
              className="form-select"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="uk">Українська</option>
              <option value="no">Norsk</option>
            </select>
          </div>
        </div>

        <details className="advanced-options">
          <summary>
            {lang === 'en' ? 'Advanced Options' : lang === 'es' ? 'Opciones Avanzadas' : lang === 'fr' ? 'Options Avancées' : lang === 'uk' ? 'Розширені Параметри' : 'Avanserte Alternativer'}
          </summary>
          <div className="advanced-content">
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={config.deterministic}
                  onChange={(e) => setConfig({ ...config, deterministic: e.target.checked })}
                />
                {lang === 'en' ? 'Deterministic (reproducible outputs)' : lang === 'es' ? 'Determinístico (salidas reproducibles)' : lang === 'fr' ? 'Déterministe (sorties reproductibles)' : lang === 'uk' ? 'Детерміністичний (відтворювані результати)' : 'Deterministisk (reproduserbare resultater)'}
              </label>
            </div>

            <div className="form-group">
              <label htmlFor="temperature">
                {lang === 'en' ? 'Temperature' : lang === 'es' ? 'Temperatura' : lang === 'fr' ? 'Température' : lang === 'uk' ? 'Температура' : 'Temperatur'}: {config.temperature}
              </label>
              <input
                type="range"
                id="temperature"
                min="0"
                max="1"
                step="0.1"
                value={config.temperature}
                onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                className="form-range"
              />
            </div>

            <div className="form-group">
              <label htmlFor="max-tokens">
                {lang === 'en' ? 'Max Tokens' : lang === 'es' ? 'Tokens Máximos' : lang === 'fr' ? 'Tokens Maximum' : lang === 'uk' ? 'Макс. Токенів' : 'Maks Tokens'}: {config.maxTokens}
              </label>
              <input
                type="number"
                id="max-tokens"
                min="1000"
                max="8000"
                step="500"
                value={config.maxTokens}
                onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value, 10) })}
                className="form-input"
              />
            </div>
          </div>
        </details>

        <button
          type="submit"
          disabled={isGenerating}
          className="btn btn-primary btn-generate"
        >
          {isGenerating ? (
            <>
              <span className="spinner" />
              {lang === 'en' ? 'Generating...' : lang === 'es' ? 'Generando...' : lang === 'fr' ? 'Génération...' : lang === 'uk' ? 'Генерація...' : 'Genererer...'} {progress}%
            </>
          ) : (
            lang === 'en' ? 'Generate Case Study' : lang === 'es' ? 'Generar Estudio de Caso' : lang === 'fr' ? 'Générer Étude de Cas' : lang === 'uk' ? 'Створити Кейс-Студію' : 'Generer Casestudie'
          )}
        </button>

        {error && (
          <div className="error-message" role="alert">
            ⚠️ {error}
          </div>
        )}
      </form>

      {/* Preview Modal */}
      {showModal && generatedReport && (
        <FocusTrap isActive={showModal}>
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal" ref={modalRef} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-title">
              <div className="modal-header">
                <h2 id="modal-title">
                  {lang === 'en' ? 'Case Study Generated' : lang === 'es' ? 'Estudio de Caso Generado' : lang === 'fr' ? 'Étude de Cas Générée' : lang === 'uk' ? 'Кейс-Студія Створена' : 'Casestudie Generert'}
                </h2>
                <button
                  ref={closeButtonRef}
                  onClick={closeModal}
                  className="btn-close"
                  aria-label={lang === 'en' ? 'Close' : lang === 'es' ? 'Cerrar' : lang === 'fr' ? 'Fermer' : lang === 'uk' ? 'Закрити' : 'Lukk'}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <div className="report-meta">
                  <div className="meta-item">
                    <span className="meta-label">
                      {lang === 'en' ? 'Words' : lang === 'es' ? 'Palabras' : lang === 'fr' ? 'Mots' : lang === 'uk' ? 'Слова' : 'Ord'}:
                    </span>
                    <span className="meta-value">{generatedReport.wordCount.toLocaleString()}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">
                      {lang === 'en' ? 'Citations' : lang === 'es' ? 'Citas' : lang === 'fr' ? 'Citations' : lang === 'uk' ? 'Цитати' : 'Sitater'}:
                    </span>
                    <span className="meta-value">{generatedReport.citations.length}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">
                      {lang === 'en' ? 'Cost' : lang === 'es' ? 'Costo' : lang === 'fr' ? 'Coût' : lang === 'uk' ? 'Вартість' : 'Kostnad'}:
                    </span>
                    <span className="meta-value">${generatedReport.lineage.estimatedCostUsd}</span>
                  </div>
                </div>

                <div className="report-content">
                  <pre>{generatedReport.content}</pre>
                </div>

                <div className="report-citations">
                  <h3>
                    {lang === 'en' ? 'Evidence Citations' : lang === 'es' ? 'Citas de Evidencia' : lang === 'fr' ? 'Citations de Preuves' : lang === 'uk' ? 'Цитати Доказів' : 'Bevis Sitater'} ({generatedReport.citations.length})
                  </h3>
                  <ul>
                    {generatedReport.citations.map((citation, idx) => (
                      <li key={idx}>
                        <strong>[{idx + 1}]</strong> {citation.text}
                        {citation.relevanceScore && (
                          <span className="relevance-score"> (Score: {(citation.relevanceScore * 100).toFixed(0)}%)</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="modal-footer">
                <button onClick={() => handleExport('pdf')} className="btn btn-secondary">
                  📄 {lang === 'en' ? 'Export PDF' : lang === 'es' ? 'Exportar PDF' : lang === 'fr' ? 'Exporter PDF' : lang === 'uk' ? 'Експорт PDF' : 'Eksporter PDF'}
                </button>
                <button onClick={() => handleExport('pptx')} className="btn btn-secondary">
                  📊 {lang === 'en' ? 'Export PPTX' : lang === 'es' ? 'Exportar PPTX' : lang === 'fr' ? 'Exporter PPTX' : lang === 'uk' ? 'Експорт PPTX' : 'Eksporter PPTX'}
                </button>
                <button onClick={closeModal} className="btn btn-primary">
                  {lang === 'en' ? 'Close' : lang === 'es' ? 'Cerrar' : lang === 'fr' ? 'Fermer' : lang === 'uk' ? 'Закрити' : 'Lukk'}
                </button>
              </div>
            </div>
          </div>
        </FocusTrap>
      )}

      <style jsx>{`
        .case-study-generator {
          width: 100%;
        }

        .generator-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-weight: 500;
          font-size: 0.875rem;
          color: var(--color-text-primary, #1a202c);
        }

        .form-input,
        .form-select {
          padding: 0.5rem 0.75rem;
          border: 1px solid var(--color-border, #e2e8f0);
          border-radius: 6px;
          font-size: 0.875rem;
          background: var(--color-surface, white);
          color: var(--color-text-primary, #1a202c);
        }

        .form-input:focus,
        .form-select:focus {
          outline: 2px solid var(--color-primary, #3b82f6);
          outline-offset: 2px;
        }

        .advanced-options {
          border: 1px solid var(--color-border, #e2e8f0);
          border-radius: 6px;
          padding: 1rem;
        }

        .advanced-options summary {
          cursor: pointer;
          font-weight: 500;
          user-select: none;
        }

        .advanced-content {
          margin-top: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.875rem;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: var(--color-primary, #3b82f6);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: var(--color-primary-dark, #2563eb);
        }

        .btn-secondary {
          background: var(--color-secondary, #6b7280);
          color: white;
        }

        .btn-generate {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .spinner {
          display: inline-block;
          width: 1rem;
          height: 1rem;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .error-message {
          padding: 1rem;
          background: #fee2e2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          color: #991b1b;
          font-size: 0.875rem;
        }

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
          z-index: 1000;
          padding: 1rem;
        }

        .modal {
          background: var(--color-surface, white);
          border-radius: 12px;
          max-width: 900px;
          width: 100%;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem;
          border-bottom: 1px solid var(--color-border, #e2e8f0);
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.5rem;
        }

        .btn-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.25rem;
          line-height: 1;
          color: var(--color-text-secondary, #6b7280);
        }

        .btn-close:hover {
          color: var(--color-text-primary, #1a202c);
        }

        .modal-body {
          padding: 1.5rem;
          overflow-y: auto;
          flex: 1;
        }

        .report-meta {
          display: flex;
          gap: 2rem;
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: var(--color-surface-alt, #f9fafb);
          border-radius: 6px;
        }

        .meta-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .meta-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-secondary, #6b7280);
        }

        .meta-value {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--color-text-primary, #1a202c);
        }

        .report-content {
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: var(--color-surface-alt, #f9fafb);
          border-radius: 6px;
          max-height: 400px;
          overflow-y: auto;
        }

        .report-content pre {
          white-space: pre-wrap;
          word-wrap: break-word;
          font-family: inherit;
          font-size: 0.875rem;
          line-height: 1.6;
          margin: 0;
        }

        .report-citations {
          margin-top: 1.5rem;
        }

        .report-citations h3 {
          font-size: 1rem;
          margin-bottom: 0.75rem;
        }

        .report-citations ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .report-citations li {
          padding: 0.5rem;
          margin-bottom: 0.5rem;
          background: var(--color-surface-alt, #f9fafb);
          border-radius: 4px;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .relevance-score {
          color: var(--color-text-secondary, #6b7280);
          font-size: 0.75rem;
        }

        .modal-footer {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          padding: 1.5rem;
          border-top: 1px solid var(--color-border, #e2e8f0);
        }
      `}</style>
    </div>
  );
}
