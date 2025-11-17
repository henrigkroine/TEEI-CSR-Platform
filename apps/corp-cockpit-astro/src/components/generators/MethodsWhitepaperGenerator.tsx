import { useState, useRef, useEffect } from 'react';
import { FocusTrap } from '../a11y/FocusManager';

interface MethodsWhitepaperGeneratorProps {
  companyId: string;
  lang?: string;
}

interface GenerationConfig {
  periodStart: string;
  periodEnd: string;
  locale: string;
  includeLineageDetails: boolean;
  includeDataQualityMetrics: boolean;
  deterministic: boolean;
  temperature: number;
  maxTokens: number;
}

interface GeneratedWhitepaper {
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

export default function MethodsWhitepaperGenerator({ companyId, lang = 'en' }: MethodsWhitepaperGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedReport, setGeneratedReport] = useState<GeneratedWhitepaper | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [config, setConfig] = useState<GenerationConfig>({
    periodStart: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0],
    periodEnd: new Date().toISOString().split('T')[0],
    locale: lang,
    includeLineageDetails: true,
    includeDataQualityMetrics: true,
    deterministic: true, // Methods whitepapers should be deterministic by default
    temperature: 0.3, // Lower temperature for technical accuracy
    maxTokens: 6000, // Larger for technical depth
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
      }, 1200); // Slower progress for longer generation

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
          reportType: 'methods-whitepaper',
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
        throw new Error(errorData.error || 'Failed to generate methods whitepaper');
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
      setError(err.message || 'Failed to generate methods whitepaper');
      console.error('[MethodsWhitepaperGenerator] Error:', err);
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
            includeCharts: false, // Methods whitepapers have tables, not charts
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
      a.download = `methods-whitepaper-${generatedReport.reportId}.${format}`;
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
    <div className="methods-whitepaper-generator">
      <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="generator-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="wp-period-start">
              {lang === 'en' ? 'Analysis Period Start' : lang === 'es' ? 'Inicio del Período de Análisis' : lang === 'fr' ? 'Début de Période d\'Analyse' : lang === 'uk' ? 'Початок Періоду Аналізу' : 'Analyseperiodestart'}
            </label>
            <input
              type="date"
              id="wp-period-start"
              value={config.periodStart}
              onChange={(e) => setConfig({ ...config, periodStart: e.target.value })}
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="wp-period-end">
              {lang === 'en' ? 'Analysis Period End' : lang === 'es' ? 'Fin del Período de Análisis' : lang === 'fr' ? 'Fin de Période d\'Analyse' : lang === 'uk' ? 'Кінець Періоду Аналізу' : 'Analyseperiodeslutt'}
            </label>
            <input
              type="date"
              id="wp-period-end"
              value={config.periodEnd}
              onChange={(e) => setConfig({ ...config, periodEnd: e.target.value })}
              required
              className="form-input"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="wp-locale">
            {lang === 'en' ? 'Report Language' : lang === 'es' ? 'Idioma del Informe' : lang === 'fr' ? 'Langue du Rapport' : lang === 'uk' ? 'Мова Звіту' : 'Rapportspråk'}
          </label>
          <select
            id="wp-locale"
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

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={config.includeLineageDetails}
              onChange={(e) => setConfig({ ...config, includeLineageDetails: e.target.checked })}
            />
            {lang === 'en' ? 'Include detailed data lineage tracking' : lang === 'es' ? 'Incluir seguimiento detallado del linaje de datos' : lang === 'fr' ? 'Inclure le suivi détaillé de la lignée des données' : lang === 'uk' ? 'Включити детальне відстеження походження даних' : 'Inkluder detaljert dataopphavssporing'}
          </label>
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={config.includeDataQualityMetrics}
              onChange={(e) => setConfig({ ...config, includeDataQualityMetrics: e.target.checked })}
            />
            {lang === 'en' ? 'Include data quality metrics and validation results' : lang === 'es' ? 'Incluir métricas de calidad de datos y resultados de validación' : lang === 'fr' ? 'Inclure les métriques de qualité des données et les résultats de validation' : lang === 'uk' ? 'Включити метрики якості даних та результати валідації' : 'Inkluder datakvalitetsmetrikk og valideringsresultater'}
          </label>
        </div>

        <details className="advanced-options" open>
          <summary>
            {lang === 'en' ? 'Generation Parameters' : lang === 'es' ? 'Parámetros de Generación' : lang === 'fr' ? 'Paramètres de Génération' : lang === 'uk' ? 'Параметри Генерації' : 'Genereringsparametere'}
          </summary>
          <div className="advanced-content">
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={config.deterministic}
                  onChange={(e) => setConfig({ ...config, deterministic: e.target.checked })}
                />
                {lang === 'en' ? 'Deterministic (recommended for methods documentation)' : lang === 'es' ? 'Determinístico (recomendado para documentación de métodos)' : lang === 'fr' ? 'Déterministe (recommandé pour la documentation des méthodes)' : lang === 'uk' ? 'Детерміністичний (рекомендовано для документації методів)' : 'Deterministisk (anbefalt for metodedokumentasjon)'}
              </label>
            </div>

            <div className="form-group">
              <label htmlFor="wp-temperature">
                {lang === 'en' ? 'Temperature (precision vs. creativity)' : lang === 'es' ? 'Temperatura (precisión vs. creatividad)' : lang === 'fr' ? 'Température (précision vs. créativité)' : lang === 'uk' ? 'Температура (точність vs. креативність)' : 'Temperatur (presisjon vs. kreativitet)'}: {config.temperature}
              </label>
              <input
                type="range"
                id="wp-temperature"
                min="0"
                max="1"
                step="0.1"
                value={config.temperature}
                onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                className="form-range"
              />
              <p className="help-text">
                {lang === 'en' ? 'Lower values (0.0-0.3) provide more precise, technical writing. Higher values allow more natural language.' : lang === 'es' ? 'Valores más bajos (0.0-0.3) proporcionan escritura más precisa y técnica. Valores más altos permiten un lenguaje más natural.' : lang === 'fr' ? 'Des valeurs plus faibles (0.0-0.3) fournissent une écriture plus précise et technique. Des valeurs plus élevées permettent un langage plus naturel.' : lang === 'uk' ? 'Нижчі значення (0.0-0.3) забезпечують більш точне технічне письмо. Вищі значення дозволяють більш природну мову.' : 'Lavere verdier (0.0-0.3) gir mer presis, teknisk skriving. Høyere verdier tillater mer naturlig språk.'}
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="wp-max-tokens">
                {lang === 'en' ? 'Max Tokens (document length)' : lang === 'es' ? 'Tokens Máximos (longitud del documento)' : lang === 'fr' ? 'Tokens Maximum (longueur du document)' : lang === 'uk' ? 'Макс. Токенів (довжина документа)' : 'Maks Tokens (dokumentlengde)'}: {config.maxTokens}
              </label>
              <input
                type="number"
                id="wp-max-tokens"
                min="2000"
                max="8000"
                step="500"
                value={config.maxTokens}
                onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value, 10) })}
                className="form-input"
              />
              <p className="help-text">
                {lang === 'en' ? 'Methods whitepapers are typically 2000-2500 words (4000-6000 tokens recommended)' : lang === 'es' ? 'Los documentos técnicos de métodos suelen tener 2000-2500 palabras (se recomiendan 4000-6000 tokens)' : lang === 'fr' ? 'Les livres blancs sur les méthodes comptent généralement 2000 à 2500 mots (4000 à 6000 jetons recommandés)' : lang === 'uk' ? 'Методичні документи зазвичай містять 2000-2500 слів (рекомендовано 4000-6000 токенів)' : 'Metodehvitebøker er vanligvis 2000-2500 ord (4000-6000 tokens anbefalt)'}
              </p>
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
            lang === 'en' ? 'Generate Methods Whitepaper' : lang === 'es' ? 'Generar Documento Técnico de Métodos' : lang === 'fr' ? 'Générer Livre Blanc sur les Méthodes' : lang === 'uk' ? 'Створити Методичний Документ' : 'Generer Metodehvitebok'
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
                  {lang === 'en' ? 'Methods Whitepaper Generated' : lang === 'es' ? 'Documento Técnico de Métodos Generado' : lang === 'fr' ? 'Livre Blanc sur les Méthodes Généré' : lang === 'uk' ? 'Методичний Документ Створено' : 'Metodehvitebok Generert'}
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
                      {lang === 'en' ? 'Lineage Citations' : lang === 'es' ? 'Citas de Linaje' : lang === 'fr' ? 'Citations de Lignée' : lang === 'uk' ? 'Цитати Походження' : 'Opphavsitater'}:
                    </span>
                    <span className="meta-value">{generatedReport.citations.length}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">
                      {lang === 'en' ? 'Model' : lang === 'es' ? 'Modelo' : lang === 'fr' ? 'Modèle' : lang === 'uk' ? 'Модель' : 'Modell'}:
                    </span>
                    <span className="meta-value">{generatedReport.lineage.modelName}</span>
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
                    {lang === 'en' ? 'Data Lineage & Evidence References' : lang === 'es' ? 'Referencias de Linaje de Datos y Evidencia' : lang === 'fr' ? 'Références de Lignée de Données et de Preuves' : lang === 'uk' ? 'Посилання на Походження Даних та Докази' : 'Dataopphav og Bevisreferanser'} ({generatedReport.citations.length})
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
        .methods-whitepaper-generator {
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

        .help-text {
          font-size: 0.75rem;
          color: var(--color-text-secondary, #6b7280);
          margin: 0;
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
          gap: 1.5rem;
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: var(--color-surface-alt, #f9fafb);
          border-radius: 6px;
          flex-wrap: wrap;
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
