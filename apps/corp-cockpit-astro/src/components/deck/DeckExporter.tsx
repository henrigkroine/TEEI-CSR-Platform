/**
 * Deck Exporter Component
 *
 * UI for exporting decks to PPTX/PDF with:
 * - Watermark configuration
 * - Export options (notes, evidence, compression)
 * - Progress tracking
 * - Download link
 *
 * @module components/deck/DeckExporter
 */

import { useState, useEffect } from 'react';
import type { DeckExportRequest, DeckExportResponse } from '@teei/shared-types';

export interface DeckExporterProps {
  deckId: string;
  deckTitle: string;
  approvalStatus?: 'draft' | 'pending' | 'approved' | 'rejected';
  onClose?: () => void;
}

export function DeckExporter({
  deckId,
  deckTitle,
  approvalStatus = 'draft',
  onClose,
}: DeckExporterProps) {
  const [format, setFormat] = useState<'pptx' | 'pdf' | 'both'>('pptx');
  const [includeWatermark, setIncludeWatermark] = useState(approvalStatus !== 'approved');
  const [watermarkText, setWatermarkText] = useState(
    approvalStatus === 'draft' ? 'DRAFT' : approvalStatus === 'pending' ? 'PENDING APPROVAL' : ''
  );
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeEvidence, setIncludeEvidence] = useState(true);
  const [compressImages, setCompressImages] = useState(true);

  const [isExporting, setIsExporting] = useState(false);
  const [exportId, setExportId] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<DeckExportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Poll export status
  useEffect(() => {
    if (!exportId) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/v2/deck/export/${exportId}/status`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch export status');
        }

        const status: DeckExportResponse = await response.json();
        setExportStatus(status);

        // Stop polling if completed or failed
        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(pollInterval);
          setIsExporting(false);

          if (status.status === 'failed') {
            setError(status.error || 'Export failed');
          }
        }
      } catch (err) {
        console.error('[DeckExporter] Error polling status:', err);
        setError('Failed to check export status');
        clearInterval(pollInterval);
        setIsExporting(false);
      }
    }, 1000); // Poll every second

    return () => clearInterval(pollInterval);
  }, [exportId]);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    setExportStatus(null);

    try {
      const exportRequest: DeckExportRequest = {
        deckId,
        format,
        options: {
          includeWatermark,
          watermarkText: includeWatermark ? watermarkText : undefined,
          includeNotes,
          includeEvidence,
          compressImages,
        },
      };

      const response = await fetch(`/api/v2/deck/${deckId}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(exportRequest),
      });

      if (!response.ok) {
        throw new Error('Failed to start export');
      }

      const data = await response.json();
      setExportId(data.exportId);

      console.log('[DeckExporter] Export started:', data.exportId);
    } catch (err) {
      console.error('[DeckExporter] Error starting export:', err);
      setError('Failed to start export. Please try again.');
      setIsExporting(false);
    }
  };

  const handleDownload = () => {
    if (!exportStatus?.pptxUrl) return;

    // Open download URL in new tab
    window.open(exportStatus.pptxUrl, '_blank');
  };

  return (
    <div className="deck-exporter bg-white rounded-lg shadow-lg p-6 max-w-2xl">
      {/* Header */}
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Export Deck</h2>
        <p className="text-gray-600 mt-1">{deckTitle}</p>
      </header>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg" role="alert">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Export Form */}
      {!exportStatus || exportStatus.status === 'failed' ? (
        <div className="space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Export Format
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setFormat('pptx')}
                className={`flex-1 px-4 py-3 border-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  format === 'pptx'
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                aria-pressed={format === 'pptx'}
              >
                <div className="text-2xl mb-1">📊</div>
                <div className="font-medium">PowerPoint</div>
                <div className="text-xs text-gray-600">(.pptx)</div>
              </button>

              <button
                onClick={() => setFormat('pdf')}
                className={`flex-1 px-4 py-3 border-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  format === 'pdf'
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                aria-pressed={format === 'pdf'}
              >
                <div className="text-2xl mb-1">📄</div>
                <div className="font-medium">PDF</div>
                <div className="text-xs text-gray-600">(.pdf)</div>
              </button>

              <button
                onClick={() => setFormat('both')}
                className={`flex-1 px-4 py-3 border-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  format === 'both'
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                aria-pressed={format === 'both'}
              >
                <div className="text-2xl mb-1">📦</div>
                <div className="font-medium">Both</div>
                <div className="text-xs text-gray-600">(PPTX + PDF)</div>
              </button>
            </div>
          </div>

          {/* Watermark Options */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeWatermark}
                onChange={(e) => setIncludeWatermark(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Include Watermark</span>
            </label>

            {includeWatermark && (
              <div className="mt-3">
                <label htmlFor="watermark-text" className="block text-sm text-gray-600 mb-1">
                  Watermark Text
                </label>
                <input
                  id="watermark-text"
                  type="text"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  placeholder="e.g., DRAFT, CONFIDENTIAL"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Export Options */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeNotes}
                onChange={(e) => setIncludeNotes(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Include speaker notes</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeEvidence}
                onChange={(e) => setIncludeEvidence(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Include evidence lineage in notes</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={compressImages}
                onChange={(e) => setCompressImages(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Compress images (smaller file size)</span>
            </label>
          </div>

          {/* Performance Note */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-600">
              <strong>Performance SLA:</strong> Export typically completes in under 10 seconds
              (p95). Large decks with many charts may take longer.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-busy={isExporting}
            >
              {isExporting ? 'Starting Export...' : `Export to ${format.toUpperCase()}`}
            </button>
          </div>
        </div>
      ) : (
        /* Export Progress */
        <div className="space-y-6">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                {exportStatus.message}
              </span>
              <span className="text-sm text-gray-600">{exportStatus.progress}%</span>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${exportStatus.progress}%` }}
                role="progressbar"
                aria-valuenow={exportStatus.progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-3">
            {exportStatus.status === 'queued' && (
              <span className="inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                ⏳ Queued
              </span>
            )}
            {exportStatus.status === 'generating' && (
              <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                🔄 Generating...
              </span>
            )}
            {exportStatus.status === 'completed' && (
              <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                ✓ Completed
              </span>
            )}
          </div>

          {/* Download Link */}
          {exportStatus.status === 'completed' && exportStatus.pptxUrl && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="text-sm font-semibold text-green-900 mb-2">
                Export Ready for Download
              </h3>
              <button
                onClick={handleDownload}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                📥 Download {format.toUpperCase()}
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            {exportStatus.status === 'completed' ? (
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Close
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
