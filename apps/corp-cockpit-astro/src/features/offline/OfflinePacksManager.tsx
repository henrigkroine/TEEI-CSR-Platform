/**
 * Offline Packs Manager Component
 *
 * Features:
 * - List all offline board packs
 * - Show storage usage
 * - Delete individual packs
 * - Clear all packs
 * - Update/refresh packs
 */

import { useState, useEffect } from 'react';
import { getAllBoardPacks, deleteBoardPack, getOfflinePackMetrics, clearAllPacks } from './storage';
import { updateBoardPack } from './prefetch';
import type { BoardPack, OfflinePackMetrics } from './types';

interface OfflinePacksManagerProps {
  companyId?: string;
  className?: string;
}

export default function OfflinePacksManager({ companyId, className = '' }: OfflinePacksManagerProps) {
  const [packs, setPacks] = useState<BoardPack[]>([]);
  const [metrics, setMetrics] = useState<OfflinePackMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingPack, setUpdatingPack] = useState<string | null>(null);

  useEffect(() => {
    loadPacks();
    loadMetrics();
  }, [companyId]);

  const loadPacks = async () => {
    try {
      const allPacks = await getAllBoardPacks();
      const filtered = companyId ? allPacks.filter((p) => p.companyId === companyId) : allPacks;
      setPacks(filtered);
      setLoading(false);
    } catch (error) {
      console.error('[OfflinePacksManager] Failed to load packs:', error);
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const offlineMetrics = await getOfflinePackMetrics();
      setMetrics(offlineMetrics);
    } catch (error) {
      console.error('[OfflinePacksManager] Failed to load metrics:', error);
    }
  };

  const handleDeletePack = async (packId: string) => {
    if (!confirm('Are you sure you want to remove this board pack from offline storage?')) {
      return;
    }

    try {
      await deleteBoardPack(packId);
      await loadPacks();
      await loadMetrics();
    } catch (error) {
      console.error('[OfflinePacksManager] Failed to delete pack:', error);
      alert('Failed to delete pack. Please try again.');
    }
  };

  const handleUpdatePack = async (packId: string) => {
    setUpdatingPack(packId);
    try {
      await updateBoardPack(packId);
      await loadPacks();
      await loadMetrics();
    } catch (error) {
      console.error('[OfflinePacksManager] Failed to update pack:', error);
      alert('Failed to update pack. Please try again.');
    } finally {
      setUpdatingPack(null);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to remove all offline board packs? This cannot be undone.')) {
      return;
    }

    try {
      await clearAllPacks();
      await loadPacks();
      await loadMetrics();
    } catch (error) {
      console.error('[OfflinePacksManager] Failed to clear all packs:', error);
      alert('Failed to clear packs. Please try again.');
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className={`offline-packs-manager ${className}`}>
        <div className="loading-spinner">
          <svg width="40" height="40" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="50" strokeDashoffset="25" />
          </svg>
          <span>Loading offline packs...</span>
        </div>
        <style jsx>{`
          .loading-spinner {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
            padding: 40px;
            color: #6b7280;
          }
          .loading-spinner svg {
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`offline-packs-manager ${className}`}>
      <div className="manager-header">
        <h2>Offline Board Packs</h2>
        {packs.length > 0 && (
          <button className="clear-all-button" onClick={handleClearAll}>
            Clear All
          </button>
        )}
      </div>

      {metrics && (
        <div className="storage-metrics">
          <div className="metric-card">
            <span className="metric-label">Total Packs</span>
            <span className="metric-value">{metrics.totalPacks}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Storage Used</span>
            <span className="metric-value">{formatBytes(metrics.totalSize)}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Storage Limit</span>
            <span className="metric-value">150 MB</span>
          </div>
        </div>
      )}

      {packs.length === 0 ? (
        <div className="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3>No Offline Packs</h3>
          <p>Board packs you make available offline will appear here.</p>
        </div>
      ) : (
        <div className="packs-list">
          {packs.map((pack) => (
            <div key={pack.id} className="pack-card">
              <div className="pack-header">
                <div className="pack-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                  </svg>
                </div>
                <div className="pack-info">
                  <h4 className="pack-title">{pack.title}</h4>
                  <div className="pack-meta">
                    <span>{pack.slides.length} slides</span>
                    <span>•</span>
                    <span>{formatBytes(pack.totalSize)}</span>
                    <span>•</span>
                    <span>Downloaded {formatDate(pack.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="pack-actions">
                <button
                  className="view-button"
                  onClick={() => window.location.href = `/offline/${pack.id}`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View
                </button>

                <button
                  className="update-button"
                  onClick={() => handleUpdatePack(pack.id)}
                  disabled={updatingPack === pack.id}
                >
                  {updatingPack === pack.id ? (
                    <svg className="spinner" width="16" height="16" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="50" strokeDashoffset="25" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  Update
                </button>

                <button
                  className="delete-button"
                  onClick={() => handleDeletePack(pack.id)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .offline-packs-manager {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .manager-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .manager-header h2 {
          font-size: 24px;
          font-weight: 600;
          color: #1a202c;
          margin: 0;
        }

        .clear-all-button {
          padding: 8px 16px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .clear-all-button:hover {
          background: #dc2626;
        }

        .storage-metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .metric-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .metric-label {
          font-size: 14px;
          color: #6b7280;
          font-weight: 500;
        }

        .metric-value {
          font-size: 24px;
          color: #1a202c;
          font-weight: 600;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 60px 20px;
          text-align: center;
          color: #6b7280;
        }

        .empty-state svg {
          margin-bottom: 16px;
        }

        .empty-state h3 {
          font-size: 18px;
          font-weight: 600;
          color: #1a202c;
          margin: 0 0 8px 0;
        }

        .empty-state p {
          font-size: 14px;
          margin: 0;
        }

        .packs-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .pack-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: box-shadow 0.2s;
        }

        .pack-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .pack-header {
          display: flex;
          gap: 12px;
          flex: 1;
          min-width: 0;
        }

        .pack-icon {
          flex-shrink: 0;
          width: 48px;
          height: 48px;
          background: #dbeafe;
          color: #3b82f6;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pack-info {
          flex: 1;
          min-width: 0;
        }

        .pack-title {
          font-size: 16px;
          font-weight: 600;
          color: #1a202c;
          margin: 0 0 4px 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .pack-meta {
          font-size: 13px;
          color: #6b7280;
          display: flex;
          gap: 8px;
        }

        .pack-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }

        .pack-actions button {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          color: #374151;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pack-actions button:hover:not(:disabled) {
          border-color: #3b82f6;
          color: #3b82f6;
        }

        .pack-actions button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .delete-button:hover:not(:disabled) {
          border-color: #ef4444;
          color: #ef4444;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 768px) {
          .pack-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .pack-actions {
            width: 100%;
            justify-content: space-between;
          }

          .pack-actions button span {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
