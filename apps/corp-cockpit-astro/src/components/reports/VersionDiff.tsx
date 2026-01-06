/**
 * Version Diff Component
 *
 * Side-by-side diff viewer for comparing report versions
 * - Shows changes in narrative content
 * - Highlights additions, deletions, modifications
 * - Displays chart configuration changes
 * - Supports inline and split view modes
 *
 * @module components/reports/VersionDiff
 */

import React, { useState, useMemo } from 'react';

interface ReportVersion {
  version: number;
  created_at: string | Date;
  created_by_name: string;
  content?: string;
  chart_config?: any;
  narrative?: string;
  metadata?: Record<string, any>;
}

interface VersionDiffProps {
  oldVersion: ReportVersion;
  newVersion: ReportVersion;
  viewMode?: 'split' | 'unified';
  showMetadata?: boolean;
}

type DiffType = 'added' | 'removed' | 'unchanged' | 'modified';

interface DiffLine {
  type: DiffType;
  oldLine?: string;
  newLine?: string;
  lineNumber: number;
}

export default function VersionDiff({
  oldVersion,
  newVersion,
  viewMode: initialViewMode = 'split',
  showMetadata = true,
}: VersionDiffProps) {
  const [viewMode, setViewMode] = useState<'split' | 'unified'>(initialViewMode);
  const [activeTab, setActiveTab] = useState<'narrative' | 'config' | 'metadata'>('narrative');

  // Compute diffs
  const narrativeDiff = useMemo(
    () => computeDiff(oldVersion.narrative || '', newVersion.narrative || ''),
    [oldVersion, newVersion]
  );

  const configDiff = useMemo(
    () => computeObjectDiff(oldVersion.chart_config || {}, newVersion.chart_config || {}),
    [oldVersion, newVersion]
  );

  const metadataDiff = useMemo(
    () => computeObjectDiff(oldVersion.metadata || {}, newVersion.metadata || {}),
    [oldVersion, newVersion]
  );

  const hasNarrativeChanges = narrativeDiff.some((line) => line.type !== 'unchanged');
  const hasConfigChanges = Object.keys(configDiff.added).length > 0 ||
    Object.keys(configDiff.removed).length > 0 ||
    Object.keys(configDiff.modified).length > 0;
  const hasMetadataChanges = Object.keys(metadataDiff.added).length > 0 ||
    Object.keys(metadataDiff.removed).length > 0 ||
    Object.keys(metadataDiff.modified).length > 0;

  return (
    <div className="version-diff" role="region" aria-label="Version comparison">
      {/* Header */}
      <div className="diff-header">
        <div className="version-info">
          <div className="version-column">
            <h4>Version {oldVersion.version}</h4>
            <p className="version-meta">
              By {oldVersion.created_by_name} on{' '}
              {new Date(oldVersion.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="arrow">→</div>
          <div className="version-column">
            <h4>Version {newVersion.version}</h4>
            <p className="version-meta">
              By {newVersion.created_by_name} on{' '}
              {new Date(newVersion.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="view-controls">
          <div className="view-mode-toggle" role="group" aria-label="View mode">
            <button
              className={viewMode === 'split' ? 'active' : ''}
              onClick={() => setViewMode('split')}
              aria-pressed={viewMode === 'split'}
            >
              <svg className="icon" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3 4a1 1 0 011-1h4a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM11 4a1 1 0 011-1h4a1 1 0 011 1v12a1 1 0 01-1 1h-4a1 1 0 01-1-1V4z" />
              </svg>
              Split
            </button>
            <button
              className={viewMode === 'unified' ? 'active' : ''}
              onClick={() => setViewMode('unified')}
              aria-pressed={viewMode === 'unified'}
            >
              <svg className="icon" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4z" />
              </svg>
              Unified
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="diff-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'narrative'}
          aria-controls="narrative-panel"
          className={`tab ${activeTab === 'narrative' ? 'active' : ''} ${
            hasNarrativeChanges ? 'has-changes' : ''
          }`}
          onClick={() => setActiveTab('narrative')}
        >
          Narrative
          {hasNarrativeChanges && <span className="change-indicator" />}
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'config'}
          aria-controls="config-panel"
          className={`tab ${activeTab === 'config' ? 'active' : ''} ${
            hasConfigChanges ? 'has-changes' : ''
          }`}
          onClick={() => setActiveTab('config')}
        >
          Chart Config
          {hasConfigChanges && <span className="change-indicator" />}
        </button>
        {showMetadata && (
          <button
            role="tab"
            aria-selected={activeTab === 'metadata'}
            aria-controls="metadata-panel"
            className={`tab ${activeTab === 'metadata' ? 'active' : ''} ${
              hasMetadataChanges ? 'has-changes' : ''
            }`}
            onClick={() => setActiveTab('metadata')}
          >
            Metadata
            {hasMetadataChanges && <span className="change-indicator" />}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="diff-content">
        {activeTab === 'narrative' && (
          <div id="narrative-panel" role="tabpanel" aria-labelledby="narrative-tab">
            {viewMode === 'split' ? (
              <SplitDiffView lines={narrativeDiff} />
            ) : (
              <UnifiedDiffView lines={narrativeDiff} />
            )}
          </div>
        )}

        {activeTab === 'config' && (
          <div id="config-panel" role="tabpanel" aria-labelledby="config-tab">
            <ObjectDiffView diff={configDiff} title="Chart Configuration" />
          </div>
        )}

        {activeTab === 'metadata' && showMetadata && (
          <div id="metadata-panel" role="tabpanel" aria-labelledby="metadata-tab">
            <ObjectDiffView diff={metadataDiff} title="Metadata" />
          </div>
        )}
      </div>

      <style jsx>{`
        .version-diff {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }

        .diff-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          flex-wrap: wrap;
          gap: 16px;
        }

        .version-info {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .version-column h4 {
          margin: 0 0 4px 0;
          font-size: 1rem;
          font-weight: 700;
          color: #111827;
        }

        .version-meta {
          margin: 0;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .arrow {
          font-size: 1.5rem;
          color: #6b7280;
          font-weight: 300;
        }

        .view-controls {
          display: flex;
          gap: 12px;
        }

        .view-mode-toggle {
          display: flex;
          gap: 4px;
          padding: 4px;
          background: #e5e7eb;
          border-radius: 6px;
        }

        .view-mode-toggle button {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: transparent;
          border: none;
          border-radius: 4px;
          font-size: 0.875rem;
          font-weight: 600;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
        }

        .view-mode-toggle button.active {
          background: white;
          color: #111827;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .view-mode-toggle .icon {
          width: 16px;
          height: 16px;
        }

        .diff-tabs {
          display: flex;
          gap: 4px;
          padding: 0 24px;
          background: #f9fafb;
          border-bottom: 2px solid #e5e7eb;
        }

        .tab {
          position: relative;
          padding: 12px 20px;
          background: transparent;
          border: none;
          border-bottom: 3px solid transparent;
          font-size: 0.9375rem;
          font-weight: 600;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: -2px;
        }

        .tab:hover {
          color: #111827;
          background: #f3f4f6;
        }

        .tab.active {
          color: #2563eb;
          border-bottom-color: #2563eb;
        }

        .tab.has-changes .change-indicator {
          display: inline-block;
          width: 6px;
          height: 6px;
          background: #ef4444;
          border-radius: 50%;
          margin-left: 6px;
          vertical-align: middle;
        }

        .diff-content {
          min-height: 400px;
          max-height: 600px;
          overflow-y: auto;
        }

        @media (max-width: 768px) {
          .version-info {
            flex-direction: column;
            align-items: flex-start;
          }

          .arrow {
            transform: rotate(90deg);
          }

          .diff-tabs {
            overflow-x: auto;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Split view (side-by-side)
 */
function SplitDiffView({ lines }: { lines: DiffLine[] }) {
  return (
    <div className="split-view">
      <div className="split-pane old-pane">
        <div className="pane-header">Old Version</div>
        <div className="pane-content">
          {lines.map((line, index) => (
            <DiffLineOld key={index} line={line} />
          ))}
        </div>
      </div>
      <div className="split-pane new-pane">
        <div className="pane-header">New Version</div>
        <div className="pane-content">
          {lines.map((line, index) => (
            <DiffLineNew key={index} line={line} />
          ))}
        </div>
      </div>

      <style jsx>{`
        .split-view {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
        }

        .split-pane {
          overflow-x: auto;
        }

        .pane-header {
          padding: 12px 16px;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          font-weight: 600;
          color: #6b7280;
          font-size: 0.875rem;
          position: sticky;
          top: 0;
          z-index: 1;
        }

        .pane-content {
          font-family: 'Courier New', monospace;
          font-size: 0.875rem;
          line-height: 1.6;
        }

        .old-pane {
          border-right: 1px solid #e5e7eb;
        }

        @media (max-width: 1024px) {
          .split-view {
            grid-template-columns: 1fr;
          }

          .old-pane {
            border-right: none;
            border-bottom: 2px solid #e5e7eb;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Unified view (inline)
 */
function UnifiedDiffView({ lines }: { lines: DiffLine[] }) {
  return (
    <div className="unified-view">
      <div className="unified-content">
        {lines.map((line, index) => (
          <DiffLineUnified key={index} line={line} />
        ))}
      </div>

      <style jsx>{`
        .unified-view {
          font-family: 'Courier New', monospace;
          font-size: 0.875rem;
          line-height: 1.6;
        }

        .unified-content {
          padding: 0;
        }
      `}</style>
    </div>
  );
}

/**
 * Individual diff line components
 */
function DiffLineOld({ line }: { line: DiffLine }) {
  if (line.type === 'added') return <div className="diff-line empty" />;
  if (line.type === 'removed')
    return <div className="diff-line removed">{line.oldLine || ''}</div>;
  return <div className="diff-line unchanged">{line.oldLine || ''}</div>;
}

function DiffLineNew({ line }: { line: DiffLine }) {
  if (line.type === 'removed') return <div className="diff-line empty" />;
  if (line.type === 'added') return <div className="diff-line added">{line.newLine || ''}</div>;
  return <div className="diff-line unchanged">{line.newLine || ''}</div>;
}

function DiffLineUnified({ line }: { line: DiffLine }) {
  if (line.type === 'removed')
    return <div className="diff-line removed">- {line.oldLine || ''}</div>;
  if (line.type === 'added')
    return <div className="diff-line added">+ {line.newLine || ''}</div>;
  return <div className="diff-line unchanged">  {line.oldLine || line.newLine || ''}</div>;
}

/**
 * Object diff view (for configs and metadata)
 */
function ObjectDiffView({
  diff,
  title,
}: {
  diff: { added: any; removed: any; modified: any };
  title: string;
}) {
  const hasChanges =
    Object.keys(diff.added).length > 0 ||
    Object.keys(diff.removed).length > 0 ||
    Object.keys(diff.modified).length > 0;

  if (!hasChanges) {
    return (
      <div className="no-changes">
        <p>No changes in {title.toLowerCase()}</p>

        <style jsx>{`
          .no-changes {
            padding: 48px 24px;
            text-align: center;
            color: #6b7280;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="object-diff">
      {Object.keys(diff.removed).length > 0 && (
        <div className="diff-section removed-section">
          <h5>Removed</h5>
          <pre>{JSON.stringify(diff.removed, null, 2)}</pre>
        </div>
      )}

      {Object.keys(diff.added).length > 0 && (
        <div className="diff-section added-section">
          <h5>Added</h5>
          <pre>{JSON.stringify(diff.added, null, 2)}</pre>
        </div>
      )}

      {Object.keys(diff.modified).length > 0 && (
        <div className="diff-section modified-section">
          <h5>Modified</h5>
          {Object.entries(diff.modified).map(([key, value]: [string, any]) => (
            <div key={key} className="modification">
              <strong>{key}:</strong>
              <div className="mod-values">
                <div className="old-value">- {JSON.stringify(value.old)}</div>
                <div className="new-value">+ {JSON.stringify(value.new)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .object-diff {
          padding: 24px;
        }

        .diff-section {
          margin-bottom: 24px;
          padding: 16px;
          border-radius: 6px;
        }

        .diff-section h5 {
          margin: 0 0 12px 0;
          font-size: 0.875rem;
          font-weight: 700;
          text-transform: uppercase;
        }

        .removed-section {
          background: #fef2f2;
          border: 1px solid #fecaca;
        }

        .removed-section h5 {
          color: #dc2626;
        }

        .added-section {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
        }

        .added-section h5 {
          color: #16a34a;
        }

        .modified-section {
          background: #fffbeb;
          border: 1px solid #fde68a;
        }

        .modified-section h5 {
          color: #d97706;
        }

        pre {
          margin: 0;
          padding: 12px;
          background: rgba(0, 0, 0, 0.03);
          border-radius: 4px;
          overflow-x: auto;
          font-family: 'Courier New', monospace;
          font-size: 0.875rem;
        }

        .modification {
          margin-bottom: 12px;
          padding: 12px;
          background: rgba(0, 0, 0, 0.03);
          border-radius: 4px;
        }

        .modification strong {
          color: #111827;
        }

        .mod-values {
          margin-top: 8px;
          font-family: 'Courier New', monospace;
          font-size: 0.875rem;
        }

        .old-value {
          color: #dc2626;
          padding: 4px 0;
        }

        .new-value {
          color: #16a34a;
          padding: 4px 0;
        }
      `}</style>
    </div>
  );
}

/**
 * Compute diff between two strings (line by line)
 */
function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const diff: DiffLine[] = [];

  // Simple line-by-line diff (can be improved with proper diff algorithm)
  const maxLen = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine === undefined) {
      diff.push({ type: 'added', newLine, lineNumber: i + 1 });
    } else if (newLine === undefined) {
      diff.push({ type: 'removed', oldLine, lineNumber: i + 1 });
    } else if (oldLine === newLine) {
      diff.push({ type: 'unchanged', oldLine, newLine, lineNumber: i + 1 });
    } else {
      diff.push({ type: 'modified', oldLine, newLine, lineNumber: i + 1 });
    }
  }

  return diff;
}

/**
 * Compute diff between two objects
 */
function computeObjectDiff(
  oldObj: any,
  newObj: any
): { added: any; removed: any; modified: any } {
  const added: any = {};
  const removed: any = {};
  const modified: any = {};

  // Find added and modified
  for (const key in newObj) {
    if (!(key in oldObj)) {
      added[key] = newObj[key];
    } else if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
      modified[key] = { old: oldObj[key], new: newObj[key] };
    }
  }

  // Find removed
  for (const key in oldObj) {
    if (!(key in newObj)) {
      removed[key] = oldObj[key];
    }
  }

  return { added, removed, modified };
}

// Global styles for diff lines
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .diff-line {
      padding: 2px 8px;
      min-height: 1.6em;
      white-space: pre-wrap;
      word-break: break-all;
    }

    .diff-line.unchanged {
      background: white;
      color: #111827;
    }

    .diff-line.added {
      background: #dcfce7;
      color: #166534;
    }

    .diff-line.removed {
      background: #fee2e2;
      color: #991b1b;
    }

    .diff-line.empty {
      background: #f3f4f6;
    }
  `;
  document.head.appendChild(style);
}
