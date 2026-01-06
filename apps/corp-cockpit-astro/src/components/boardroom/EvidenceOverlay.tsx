/**
 * Evidence Overlay - Phase H3-A
 *
 * Displays evidence, citations, and data lineage for the current view.
 * Toggleable overlay that shows source information for metrics.
 */

import { useState, useMemo } from 'react';

interface EvidenceItem {
  id: string;
  metric: string;
  value: string | number;
  source: string;
  timestamp: string;
  citation?: string;
  confidence?: number;
}

interface EvidenceOverlayProps {
  data: any;
  currentView: string;
  onClose: () => void;
}

export function EvidenceOverlay({
  data,
  currentView,
  onClose,
}: EvidenceOverlayProps) {
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Extract evidence items from data
  const evidenceItems = useMemo<EvidenceItem[]>(() => {
    if (!data || !data.evidence) {
      return [];
    }

    // Filter evidence by current view
    return data.evidence
      .filter((item: any) => !currentView || item.view === currentView)
      .map((item: any) => ({
        id: item.id || `evidence-${Math.random()}`,
        metric: item.metric || 'Unknown',
        value: item.value ?? 'N/A',
        source: item.source || 'Internal',
        timestamp: item.timestamp || new Date().toISOString(),
        citation: item.citation,
        confidence: item.confidence,
      }));
  }, [data, currentView]);

  // Filter evidence by search query
  const filteredEvidence = useMemo(() => {
    if (!searchQuery.trim()) {
      return evidenceItems;
    }

    const query = searchQuery.toLowerCase();
    return evidenceItems.filter(
      (item) =>
        item.metric.toLowerCase().includes(query) ||
        item.source.toLowerCase().includes(query) ||
        (item.citation && item.citation.toLowerCase().includes(query))
    );
  }, [evidenceItems, searchQuery]);

  const handleClose = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="evidence-overlay" onClick={handleClose}>
      <div className="evidence-panel" role="dialog" aria-label="Evidence Details">
        {/* Header */}
        <div className="evidence-header">
          <div>
            <h2 className="evidence-title">Evidence & Citations</h2>
            <p className="evidence-subtitle">
              {filteredEvidence.length} item{filteredEvidence.length !== 1 ? 's' : ''} for {currentView} view
            </p>
          </div>
          <button
            onClick={onClose}
            className="close-button"
            aria-label="Close evidence overlay"
          >
            <svg
              className="close-icon"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="evidence-search">
          <svg
            className="search-icon"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            placeholder="Search evidence..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
            aria-label="Search evidence"
          />
        </div>

        {/* Evidence List */}
        <div className="evidence-list">
          {filteredEvidence.length === 0 ? (
            <div className="empty-state">
              <p>No evidence found</p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="clear-search-button"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            filteredEvidence.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedEvidence(item)}
                className={`evidence-item ${selectedEvidence?.id === item.id ? 'selected' : ''}`}
              >
                <div className="evidence-item-header">
                  <span className="evidence-metric">{item.metric}</span>
                  {item.confidence !== undefined && (
                    <span
                      className={`confidence-badge confidence-${
                        item.confidence >= 0.8 ? 'high' : item.confidence >= 0.5 ? 'medium' : 'low'
                      }`}
                    >
                      {Math.round(item.confidence * 100)}% confidence
                    </span>
                  )}
                </div>
                <div className="evidence-value">{item.value}</div>
                <div className="evidence-meta">
                  <span className="evidence-source">{item.source}</span>
                  <span className="evidence-timestamp">
                    {new Date(item.timestamp).toLocaleString()}
                  </span>
                </div>
                {item.citation && (
                  <div className="evidence-citation">{item.citation}</div>
                )}
              </button>
            ))
          )}
        </div>

        {/* Selected Evidence Details */}
        {selectedEvidence && (
          <div className="evidence-details">
            <h3 className="details-title">Details</h3>
            <dl className="details-list">
              <div className="detail-row">
                <dt>Metric</dt>
                <dd>{selectedEvidence.metric}</dd>
              </div>
              <div className="detail-row">
                <dt>Value</dt>
                <dd>{selectedEvidence.value}</dd>
              </div>
              <div className="detail-row">
                <dt>Source</dt>
                <dd>{selectedEvidence.source}</dd>
              </div>
              <div className="detail-row">
                <dt>Timestamp</dt>
                <dd>{new Date(selectedEvidence.timestamp).toLocaleString()}</dd>
              </div>
              {selectedEvidence.confidence !== undefined && (
                <div className="detail-row">
                  <dt>Confidence</dt>
                  <dd>{Math.round(selectedEvidence.confidence * 100)}%</dd>
                </div>
              )}
              {selectedEvidence.citation && (
                <div className="detail-row">
                  <dt>Citation</dt>
                  <dd>{selectedEvidence.citation}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>

      <style>{`
        .evidence-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(8px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .evidence-panel {
          background: #1f2937;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          width: 100%;
          max-width: 900px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .evidence-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .evidence-title {
          font-size: 24px;
          font-weight: 700;
          color: white;
          margin: 0;
        }

        .evidence-subtitle {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.6);
          margin: 4px 0 0;
        }

        .close-button {
          padding: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: none;
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .close-button:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .close-icon {
          width: 24px;
          height: 24px;
        }

        .evidence-search {
          padding: 16px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 36px;
          top: 50%;
          transform: translateY(-50%);
          width: 20px;
          height: 20px;
          color: rgba(255, 255, 255, 0.4);
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          padding: 10px 16px 10px 44px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: white;
          font-size: 14px;
        }

        .search-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
        }

        .evidence-list {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          min-height: 300px;
        }

        .evidence-item {
          width: 100%;
          text-align: left;
          padding: 16px;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          margin-bottom: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .evidence-item:hover {
          background: rgba(0, 0, 0, 0.3);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .evidence-item.selected {
          background: rgba(59, 130, 246, 0.1);
          border-color: #3b82f6;
        }

        .evidence-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .evidence-metric {
          font-size: 16px;
          font-weight: 600;
          color: white;
        }

        .confidence-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }

        .confidence-high {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
        }

        .confidence-medium {
          background: rgba(251, 191, 36, 0.2);
          color: #fbbf24;
        }

        .confidence-low {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .evidence-value {
          font-size: 20px;
          font-weight: 700;
          color: #3b82f6;
          margin-bottom: 8px;
        }

        .evidence-meta {
          display: flex;
          gap: 16px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
        }

        .evidence-citation {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 13px;
          color: rgba(255, 255, 255, 0.7);
          font-style: italic;
        }

        .evidence-details {
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding: 24px;
          background: rgba(0, 0, 0, 0.2);
        }

        .details-title {
          font-size: 18px;
          font-weight: 600;
          color: white;
          margin: 0 0 16px;
        }

        .details-list {
          display: grid;
          gap: 12px;
        }

        .detail-row {
          display: grid;
          grid-template-columns: 120px 1fr;
          gap: 16px;
        }

        .detail-row dt {
          font-weight: 600;
          color: rgba(255, 255, 255, 0.6);
          font-size: 14px;
        }

        .detail-row dd {
          color: white;
          font-size: 14px;
          margin: 0;
        }

        .empty-state {
          text-align: center;
          padding: 48px 24px;
          color: rgba(255, 255, 255, 0.5);
        }

        .clear-search-button {
          margin-top: 12px;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .clear-search-button:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }
      `}</style>
    </div>
  );
}
