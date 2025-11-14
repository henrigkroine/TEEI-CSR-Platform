import { useState } from 'react';
import type { EvidenceSnippet, OutcomeScore, OutcomeDimension } from '@teei/shared-types';

interface EvidenceCardProps {
  snippet: EvidenceSnippet;
  outcomeScores: OutcomeScore[];
  onViewDetails: () => void;
  lang: string;
}

export default function EvidenceCard({
  snippet,
  outcomeScores,
  onViewDetails,
  lang,
}: EvidenceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  // Truncate text if longer than 200 characters
  const shouldTruncate = snippet.snippetText.length > 200;
  const displayText =
    shouldTruncate && !expanded
      ? snippet.snippetText.substring(0, 200) + '...'
      : snippet.snippetText;

  const getDimensionLabel = (dim: OutcomeDimension): string => {
    const labels: Record<OutcomeDimension, Record<string, string>> = {
      confidence: { en: 'Confidence', no: 'Selvtillit', uk: 'Впевненість' },
      belonging: { en: 'Belonging', no: 'Tilhørighet', uk: 'Приналежність' },
      lang_level_proxy: { en: 'Language', no: 'Språk', uk: 'Мова' },
      job_readiness: { en: 'Job Readiness', no: 'Jobberedskap', uk: 'Готовність до роботи' },
      well_being: { en: 'Well-being', no: 'Velvære', uk: 'Добробут' },
    };
    return labels[dim][lang] || labels[dim].en;
  };

  const getProgramLabel = (programType: string): string => {
    const labels: Record<string, Record<string, string>> = {
      buddy: { en: 'Buddy', no: 'Buddy', uk: 'Бадді' },
      language: { en: 'Language', no: 'Språk', uk: 'Мова' },
      mentorship: { en: 'Mentorship', no: 'Mentorskap', uk: 'Менторство' },
      upskilling: { en: 'Upskilling', no: 'Opplæring', uk: 'Підвищення кваліфікації' },
    };
    return labels[programType]?.[lang] || programType;
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.75) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const copyForCSRD = async () => {
    try {
      // Create CSRD-ready text format
      const csrdText = `[Evidence ID: ${snippet.id}]
Date: ${new Date(snippet.submittedAt).toLocaleDateString()}
Program: ${snippet.programType}
Source: ${snippet.source}

Evidence:
${snippet.snippetText}

Outcome Scores:
${outcomeScores
  .map(
    (score) =>
      `- ${getDimensionLabel(score.dimension)}: ${(score.score * 100).toFixed(0)}% (confidence: ${(score.confidence * 100).toFixed(0)}%)`
  )
  .join('\n')}

Provenance:
- Model Version: ${snippet.metadata?.q2qModelVersion || 'N/A'}
- Processed: ${snippet.metadata?.processedAt || 'N/A'}
- Redacted: ${snippet.metadata?.redactionApplied?.join(', ') || 'None'}`;

      await navigator.clipboard.writeText(csrdText);
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const translations = {
    en: {
      viewDetails: 'View Details',
      copyForCSRD: 'Copy for CSRD',
      copied: 'Copied!',
      showMore: 'Show more',
      showLess: 'Show less',
      confidence: 'confidence',
    },
    no: {
      viewDetails: 'Vis detaljer',
      copyForCSRD: 'Kopier for CSRD',
      copied: 'Kopiert!',
      showMore: 'Vis mer',
      showLess: 'Vis mindre',
      confidence: 'tillit',
    },
    uk: {
      viewDetails: 'Переглянути деталі',
      copyForCSRD: 'Копіювати для CSRD',
      copied: 'Скопійовано!',
      showMore: 'Показати більше',
      showLess: 'Показати менше',
      confidence: 'довіра',
    },
  };

  const t = translations[lang as keyof typeof translations] || translations.en;

  return (
    <div className="card hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
              {getProgramLabel(snippet.programType)}
            </span>
            {snippet.cohort && (
              <span className="text-xs text-foreground/40">{snippet.cohort}</span>
            )}
          </div>
          <div className="text-sm font-medium text-foreground/60">{snippet.source}</div>
          <div className="text-xs text-foreground/40">
            {new Date(snippet.submittedAt).toLocaleDateString(lang, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </div>
      </div>

      {/* Snippet Text */}
      <p className="mb-4 text-foreground leading-relaxed">{displayText}</p>
      {shouldTruncate && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mb-4 text-sm text-primary hover:underline focus:outline-none focus:underline"
          aria-expanded={expanded}
        >
          {expanded ? t.showLess : t.showMore}
        </button>
      )}

      {/* Outcome Scores */}
      <div className="mb-4 flex flex-wrap gap-2">
        {outcomeScores.map((score) => (
          <div
            key={score.id}
            className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
            title={`${t.confidence}: ${(score.confidence * 100).toFixed(0)}%`}
          >
            <span className="font-medium">{getDimensionLabel(score.dimension)}:</span>
            <span className="text-foreground/80">{(score.score * 100).toFixed(0)}%</span>
            <span className={`text-xs ${getConfidenceColor(score.confidence)}`}>
              ●
            </span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-border">
        <button
          onClick={onViewDetails}
          className="btn-secondary flex-1 text-sm"
          aria-label={`${t.viewDetails} for evidence ${snippet.id}`}
        >
          <svg
            className="h-4 w-4 mr-1.5 inline-block"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {t.viewDetails}
        </button>
        <button
          onClick={copyForCSRD}
          className="btn-primary flex-1 text-sm"
          aria-label={`${t.copyForCSRD} evidence ${snippet.id}`}
          disabled={copiedToClipboard}
        >
          {copiedToClipboard ? (
            <>
              <svg
                className="h-4 w-4 mr-1.5 inline-block"
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
                className="h-4 w-4 mr-1.5 inline-block"
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
              {t.copyForCSRD}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
