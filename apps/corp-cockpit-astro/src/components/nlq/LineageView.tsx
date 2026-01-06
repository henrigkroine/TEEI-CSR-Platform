/**
 * Lineage View Component
 *
 * Displays data lineage for NLQ answers including:
 * - Data sources
 * - Transformation steps
 * - Evidence snippets
 * - Optional Mermaid diagram integration
 *
 * @module nlq/LineageView
 */

import { useState } from 'react';
import type { LineageViewProps } from '../../types/nlq';

export default function LineageView({
  lineage,
  expanded = false,
  onEvidenceClick
}: LineageViewProps) {
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [activeTab, setActiveTab] = useState<'sources' | 'transformations' | 'evidence'>('sources');

  if (!lineage) {
    return (
      <div className="p-4 bg-foreground/5 rounded-lg border border-border">
        <p className="text-sm text-foreground/60">No lineage data available</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="
          w-full flex items-center justify-between px-4 py-3 bg-foreground/5
          hover:bg-foreground/10 transition-colors min-h-[44px]
        "
        aria-expanded={isExpanded}
        aria-controls="lineage-content"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden="true">🔍</span>
          <span className="font-semibold text-foreground">Data Lineage</span>
          <span className="text-xs text-foreground/60 bg-foreground/10 px-2 py-1 rounded-full">
            {lineage.dataSources.length} source{lineage.dataSources.length !== 1 ? 's' : ''}
          </span>
        </div>
        <span className={`text-foreground/70 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {/* Content */}
      {isExpanded && (
        <div id="lineage-content" className="p-4 bg-background">
          {/* Tabs */}
          <div className="flex gap-2 mb-4 border-b border-border" role="tablist">
            <button
              onClick={() => setActiveTab('sources')}
              className={`
                px-4 py-2 text-sm font-medium border-b-2 transition-colors min-h-[44px]
                ${activeTab === 'sources'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-foreground/60 hover:text-foreground'
                }
              `}
              role="tab"
              aria-selected={activeTab === 'sources'}
              aria-controls="sources-panel"
            >
              Data Sources ({lineage.dataSources.length})
            </button>
            <button
              onClick={() => setActiveTab('transformations')}
              className={`
                px-4 py-2 text-sm font-medium border-b-2 transition-colors min-h-[44px]
                ${activeTab === 'transformations'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-foreground/60 hover:text-foreground'
                }
              `}
              role="tab"
              aria-selected={activeTab === 'transformations'}
              aria-controls="transformations-panel"
            >
              Transformations ({lineage.transformations.length})
            </button>
            <button
              onClick={() => setActiveTab('evidence')}
              className={`
                px-4 py-2 text-sm font-medium border-b-2 transition-colors min-h-[44px]
                ${activeTab === 'evidence'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-foreground/60 hover:text-foreground'
                }
              `}
              role="tab"
              aria-selected={activeTab === 'evidence'}
              aria-controls="evidence-panel"
            >
              Evidence ({lineage.evidenceSnippets.length})
            </button>
          </div>

          {/* Tab Panels */}
          <div className="min-h-[200px]">
            {activeTab === 'sources' && (
              <div id="sources-panel" role="tabpanel" aria-labelledby="sources-tab">
                <DataSourcesPanel sources={lineage.dataSources} />
              </div>
            )}
            {activeTab === 'transformations' && (
              <div id="transformations-panel" role="tabpanel" aria-labelledby="transformations-tab">
                <TransformationsPanel transformations={lineage.transformations} />
              </div>
            )}
            {activeTab === 'evidence' && (
              <div id="evidence-panel" role="tabpanel" aria-labelledby="evidence-tab">
                <EvidencePanel
                  snippets={lineage.evidenceSnippets}
                  onEvidenceClick={onEvidenceClick}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Data Sources Panel
 */
function DataSourcesPanel({ sources }: { sources: any[] }) {
  if (sources.length === 0) {
    return <p className="text-sm text-foreground/60">No data sources</p>;
  }

  return (
    <div className="space-y-3">
      {sources.map((source, idx) => (
        <div
          key={source.id || idx}
          className="p-4 bg-foreground/5 rounded-lg border-l-4 border-primary"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden="true">{getSourceIcon(source.type)}</span>
              <h4 className="font-semibold text-foreground">{source.name}</h4>
            </div>
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded uppercase font-medium">
              {source.type}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {source.recordCount !== undefined && (
              <div className="text-foreground/70">
                <span className="font-medium">Records:</span> {source.recordCount.toLocaleString()}
              </div>
            )}
            {source.lastUpdated && (
              <div className="text-foreground/70">
                <span className="font-medium">Updated:</span> {formatDate(source.lastUpdated)}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Transformations Panel
 */
function TransformationsPanel({ transformations }: { transformations: any[] }) {
  if (transformations.length === 0) {
    return <p className="text-sm text-foreground/60">No transformations applied</p>;
  }

  return (
    <div className="space-y-3">
      {transformations.map((transform, idx) => (
        <div
          key={idx}
          className="relative pl-8 pb-4"
        >
          {/* Step indicator */}
          <div className="absolute left-0 top-0">
            <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
              {transform.step}
            </div>
            {idx < transformations.length - 1 && (
              <div className="absolute top-6 left-3 w-0.5 h-full bg-primary/30" />
            )}
          </div>

          {/* Content */}
          <div className="bg-foreground/5 rounded-lg p-3 border border-border">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-sm text-foreground">{transform.operation}</h4>
              <div className="flex items-center gap-2 text-xs text-foreground/60">
                <span>{transform.inputCount} in</span>
                <span>→</span>
                <span>{transform.outputCount} out</span>
              </div>
            </div>
            <p className="text-sm text-foreground/80">{transform.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Evidence Panel
 */
function EvidencePanel({
  snippets,
  onEvidenceClick
}: {
  snippets: any[];
  onEvidenceClick?: (evidenceId: string) => void;
}) {
  if (snippets.length === 0) {
    return <p className="text-sm text-foreground/60">No evidence snippets</p>;
  }

  return (
    <div className="space-y-3">
      {snippets.map((snippet, idx) => {
        const relevanceColor =
          snippet.relevance >= 0.8 ? 'border-green-500' :
          snippet.relevance >= 0.6 ? 'border-yellow-500' :
          'border-orange-500';

        return (
          <div
            key={snippet.id || idx}
            className={`p-4 bg-foreground/5 rounded-lg border-l-4 ${relevanceColor}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-foreground/50">
                    {snippet.evidenceId.slice(0, 12)}...
                  </span>
                  <span className="text-xs bg-foreground/10 px-2 py-1 rounded">
                    {Math.round(snippet.relevance * 100)}% relevant
                  </span>
                </div>
                <p className="text-xs text-foreground/60">{snippet.source}</p>
              </div>
            </div>
            <p className={`text-sm ${snippet.highlighted ? 'bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded' : ''}`}>
              {snippet.text}
            </p>
            {onEvidenceClick && (
              <button
                onClick={() => onEvidenceClick(snippet.evidenceId)}
                className="
                  mt-3 text-xs text-primary hover:text-primary/80 font-medium
                  flex items-center gap-1 transition-colors min-h-[24px]
                "
              >
                View full evidence →
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Helper functions
 */
function getSourceIcon(type: string): string {
  const icons: Record<string, string> = {
    database: '🗄️',
    api: '🔌',
    file: '📄',
    calculation: '🧮',
  };
  return icons[type] || '📊';
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}
