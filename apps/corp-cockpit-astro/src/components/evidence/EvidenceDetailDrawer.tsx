import { useEffect, useRef, useState } from 'react';
import type { EvidenceSnippet, OutcomeScore, OutcomeDimension } from '@teei/shared-types';

interface EvidenceDetailDrawerProps {
  snippet: EvidenceSnippet | null;
  outcomeScores: OutcomeScore[];
  isOpen: boolean;
  onClose: () => void;
  lang: string;
}

export default function EvidenceDetailDrawer({
  snippet,
  outcomeScores,
  isOpen,
  onClose,
  lang,
}: EvidenceDetailDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      // Focus close button when drawer opens (accessibility)
      setTimeout(() => closeButtonRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    // Handle escape key
    if (!isOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const getDimensionLabel = (dim: OutcomeDimension): string => {
    const labels: Record<OutcomeDimension, Record<string, string>> = {
      confidence: { en: 'Confidence', no: 'Selvtillit', uk: 'Впевненість' },
      belonging: { en: 'Belonging', no: 'Tilhørighet', uk: 'Приналежність' },
      lang_level_proxy: { en: 'Language Proficiency', no: 'Språkferdighet', uk: 'Мовна майстерність' },
      job_readiness: { en: 'Job Readiness', no: 'Jobberedskap', uk: 'Готовність до роботи' },
      well_being: { en: 'Well-being', no: 'Velvære', uk: 'Добробут' },
    };
    return labels[dim][lang] || labels[dim].en;
  };

  const getProgramLabel = (programType: string): string => {
    const labels: Record<string, Record<string, string>> = {
      buddy: { en: 'Buddy Program', no: 'Buddy-program', uk: 'Програма бадді' },
      language: { en: 'Language Connect', no: 'Språkkontakt', uk: 'Мовне з\'єднання' },
      mentorship: { en: 'Mentorship Program', no: 'Mentorprogram', uk: 'Програма менторства' },
      upskilling: { en: 'Upskilling Program', no: 'Opplæringsprogram', uk: 'Програма підвищення кваліфікації' },
    };
    return labels[programType]?.[lang] || programType;
  };

  const getSourceTypeLabel = (sourceType: string): string => {
    const labels: Record<string, Record<string, string>> = {
      buddy_feedback: { en: 'Buddy Feedback', no: 'Buddy-tilbakemelding', uk: 'Відгук бадді' },
      kintell_feedback: { en: 'Kintell Feedback', no: 'Kintell-tilbakemelding', uk: 'Відгук Kintell' },
      checkin: { en: 'Check-in', no: 'Sjekk inn', uk: 'Реєстрація' },
      survey: { en: 'Survey', no: 'Undersøkelse', uk: 'Опитування' },
    };
    return labels[sourceType]?.[lang] || sourceType;
  };

  const getConfidenceLevel = (confidence: number): { label: string; color: string } => {
    const levels = {
      en: {
        high: 'High',
        medium: 'Medium',
        low: 'Low',
      },
      no: {
        high: 'Høy',
        medium: 'Middels',
        low: 'Lav',
      },
      uk: {
        high: 'Високий',
        medium: 'Середній',
        low: 'Низький',
      },
    };

    const currentLang = levels[lang as keyof typeof levels] || levels.en;

    if (confidence >= 0.9)
      return { label: currentLang.high, color: 'bg-green-100 text-green-800' };
    if (confidence >= 0.75)
      return { label: currentLang.medium, color: 'bg-yellow-100 text-yellow-800' };
    return { label: currentLang.low, color: 'bg-orange-100 text-orange-800' };
  };

  const copyFullText = async () => {
    if (!snippet) return;

    try {
      const csrdText = `[Evidence ID: ${snippet.id}]
Date Collected: ${new Date(snippet.submittedAt).toLocaleDateString()}
Program: ${getProgramLabel(snippet.programType)}
Source Type: ${getSourceTypeLabel(snippet.sourceType)}
Source: ${snippet.source}
${snippet.cohort ? `Cohort: ${snippet.cohort}` : ''}

EVIDENCE TEXT:
${snippet.snippetText}

OUTCOME DIMENSIONS:
${outcomeScores
  .map(
    (score) => {
      const confidenceLevel = getConfidenceLevel(score.confidence);
      return `- ${getDimensionLabel(score.dimension)}: ${(score.score * 100).toFixed(0)}% (Confidence: ${(score.confidence * 100).toFixed(0)}% - ${confidenceLevel.label})`;
    }
  )
  .join('\n')}

PROVENANCE:
- Evidence Hash: ${snippet.snippetHash}
- Q2Q Model Version: ${snippet.metadata?.q2qModelVersion || 'N/A'}
- Processed At: ${snippet.metadata?.processedAt ? new Date(snippet.metadata.processedAt).toISOString() : 'N/A'}
- Redacted Fields: ${snippet.metadata?.redactionApplied?.join(', ') || 'None'}
- Participant ID (Internal): ${snippet.participantId || 'N/A'}

This evidence has been anonymized and redacted for privacy protection in accordance with GDPR and data protection requirements.`;

      await navigator.clipboard.writeText(csrdText);
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const translations = {
    en: {
      title: 'Evidence Details',
      fullEvidence: 'Full Evidence Text',
      metadata: 'Metadata',
      outcomeScores: 'Outcome Scores',
      provenance: 'Provenance Chain',
      program: 'Program',
      sourceType: 'Source Type',
      source: 'Source',
      cohort: 'Cohort',
      dateCollected: 'Date Collected',
      participantId: 'Participant ID (Internal)',
      evidenceHash: 'Evidence Hash',
      q2qModel: 'Q2Q Model Version',
      processedAt: 'Processed At',
      redactedFields: 'Redacted Fields',
      score: 'Score',
      confidence: 'Confidence',
      copyFull: 'Copy Full Text for CSRD',
      copied: 'Copied to Clipboard!',
      close: 'Close',
      explanation: 'This evidence snippet has been anonymized and all personally identifiable information has been redacted to protect participant privacy.',
    },
    no: {
      title: 'Evidensdetaljer',
      fullEvidence: 'Full evidenstekst',
      metadata: 'Metadata',
      outcomeScores: 'Resultatpoeng',
      provenance: 'Proveniens kjede',
      program: 'Program',
      sourceType: 'Kildetype',
      source: 'Kilde',
      cohort: 'Kohort',
      dateCollected: 'Dato innsamlet',
      participantId: 'Deltaker-ID (Intern)',
      evidenceHash: 'Evidens-hash',
      q2qModel: 'Q2Q-modellversjon',
      processedAt: 'Behandlet',
      redactedFields: 'Redigerte felt',
      score: 'Poengsum',
      confidence: 'Tillit',
      copyFull: 'Kopier full tekst for CSRD',
      copied: 'Kopiert til utklippstavle!',
      close: 'Lukk',
      explanation: 'Dette evidensutdraget er anonymisert og all personlig identifiserbar informasjon er redigert for å beskytte deltakerens personvern.',
    },
    uk: {
      title: 'Деталі доказів',
      fullEvidence: 'Повний текст доказів',
      metadata: 'Метадані',
      outcomeScores: 'Оцінки результатів',
      provenance: 'Ланцюг походження',
      program: 'Програма',
      sourceType: 'Тип джерела',
      source: 'Джерело',
      cohort: 'Когорта',
      dateCollected: 'Дата збору',
      participantId: 'ID учасника (Внутрішній)',
      evidenceHash: 'Хеш доказів',
      q2qModel: 'Версія моделі Q2Q',
      processedAt: 'Оброблено',
      redactedFields: 'Редаговані поля',
      score: 'Оцінка',
      confidence: 'Впевненість',
      copyFull: 'Копіювати повний текст для CSRD',
      copied: 'Скопійовано в буфер обміну!',
      close: 'Закрити',
      explanation: 'Цей фрагмент доказів було анонімізовано, і всю особисту інформацію було відредаговано для захисту конфіденційності учасників.',
    },
  };

  const t = translations[lang as keyof typeof translations] || translations.en;

  if (!isOpen || !snippet) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 z-50 h-full w-full max-w-3xl overflow-y-auto bg-background shadow-2xl"
        role="dialog"
        aria-labelledby="evidence-drawer-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-border bg-background px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="evidence-drawer-title" className="text-xl font-bold">
                {t.title}
              </h2>
              <p className="mt-1 text-sm text-foreground/60">
                {getProgramLabel(snippet.programType)}
              </p>
            </div>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="rounded-md p-2 hover:bg-border/50 focus:bg-border/50 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label={t.close}
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
          {/* Privacy Notice */}
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 text-sm text-blue-800 dark:text-blue-200">
            <svg
              className="h-5 w-5 inline-block mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            {t.explanation}
          </div>

          {/* Full Evidence Text */}
          <section>
            <h3 className="text-lg font-semibold mb-3">{t.fullEvidence}</h3>
            <div className="card bg-border/20">
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                {snippet.snippetText}
              </p>
            </div>
          </section>

          {/* Metadata */}
          <section>
            <h3 className="text-lg font-semibold mb-3">{t.metadata}</h3>
            <div className="card space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-foreground/60">{t.program}</div>
                  <div className="text-foreground">{getProgramLabel(snippet.programType)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground/60">{t.sourceType}</div>
                  <div className="text-foreground">{getSourceTypeLabel(snippet.sourceType)}</div>
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <div className="text-sm font-medium text-foreground/60 mb-1">{t.source}</div>
                <div className="text-foreground">{snippet.source}</div>
              </div>

              {snippet.cohort && (
                <div className="border-t border-border pt-3">
                  <div className="text-sm font-medium text-foreground/60 mb-1">{t.cohort}</div>
                  <div className="text-foreground">{snippet.cohort}</div>
                </div>
              )}

              <div className="border-t border-border pt-3">
                <div className="text-sm font-medium text-foreground/60 mb-1">{t.dateCollected}</div>
                <div className="text-foreground">
                  {new Date(snippet.submittedAt).toLocaleString(lang, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Outcome Scores */}
          <section>
            <h3 className="text-lg font-semibold mb-3">{t.outcomeScores}</h3>
            <div className="space-y-3">
              {outcomeScores.map((score) => {
                const confidenceLevel = getConfidenceLevel(score.confidence);
                return (
                  <div key={score.id} className="card">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{getDimensionLabel(score.dimension)}</div>
                      <div className="text-2xl font-bold text-primary">
                        {(score.score * 100).toFixed(0)}%
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground/60">{t.confidence}:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-foreground">
                          {(score.confidence * 100).toFixed(0)}%
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${confidenceLevel.color}`}
                        >
                          {confidenceLevel.label}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-foreground/40">
                      Model: {score.modelVersion} • Created:{' '}
                      {new Date(score.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Provenance */}
          <section>
            <h3 className="text-lg font-semibold mb-3">{t.provenance}</h3>
            <div className="card space-y-3">
              <div>
                <div className="text-sm font-medium text-foreground/60 mb-1">{t.evidenceHash}</div>
                <div className="font-mono text-xs text-foreground/80 break-all bg-border/30 p-2 rounded">
                  {snippet.snippetHash}
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <div className="text-sm font-medium text-foreground/60 mb-1">{t.q2qModel}</div>
                <div className="text-foreground">{snippet.metadata?.q2qModelVersion || 'N/A'}</div>
              </div>

              {snippet.metadata?.processedAt && (
                <div className="border-t border-border pt-3">
                  <div className="text-sm font-medium text-foreground/60 mb-1">{t.processedAt}</div>
                  <div className="text-foreground">
                    {new Date(snippet.metadata.processedAt).toLocaleString(lang)}
                  </div>
                </div>
              )}

              {snippet.metadata?.redactionApplied && snippet.metadata.redactionApplied.length > 0 && (
                <div className="border-t border-border pt-3">
                  <div className="text-sm font-medium text-foreground/60 mb-1">
                    {t.redactedFields}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {snippet.metadata.redactionApplied.map((field, idx) => (
                      <span
                        key={idx}
                        className="rounded-full bg-orange-100 dark:bg-orange-900/30 px-2 py-1 text-xs text-orange-800 dark:text-orange-200"
                      >
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {snippet.participantId && (
                <div className="border-t border-border pt-3">
                  <div className="text-sm font-medium text-foreground/60 mb-1">
                    {t.participantId}
                  </div>
                  <div className="font-mono text-xs text-foreground/60">{snippet.participantId}</div>
                </div>
              )}
            </div>
          </section>

          {/* Copy Button */}
          <div className="sticky bottom-0 pt-4 pb-2 bg-background border-t border-border">
            <button
              onClick={copyFullText}
              className="btn-primary w-full"
              disabled={copiedToClipboard}
            >
              {copiedToClipboard ? (
                <>
                  <svg
                    className="h-5 w-5 mr-2 inline-block"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {t.copied}
                </>
              ) : (
                <>
                  <svg
                    className="h-5 w-5 mr-2 inline-block"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  {t.copyFull}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
