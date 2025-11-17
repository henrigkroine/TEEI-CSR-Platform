/**
 * Make Available Offline Button
 *
 * Features:
 * - Trigger board pack prefetch
 * - Show download progress
 * - Indicate offline availability status
 * - Handle errors and retries
 */

import { useState, useEffect } from 'react';
import { prefetchBoardPack } from './prefetch';
import { getBoardPack } from './storage';
import type { BoardPackDownloadProgress } from './types';

interface MakeOfflineButtonProps {
  reportId: string;
  companyId: string;
  reportTitle: string;
  className?: string;
  variant?: 'button' | 'icon';
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export default function MakeOfflineButton({
  reportId,
  companyId,
  reportTitle,
  className = '',
  variant = 'button',
  onSuccess,
  onError,
}: MakeOfflineButtonProps) {
  const [isOffline, setIsOffline] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState<BoardPackDownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkOfflineAvailability();
  }, [reportId]);

  const checkOfflineAvailability = async () => {
    try {
      const pack = await getBoardPack(reportId);
      setIsOffline(!!pack);
    } catch (error) {
      console.error('[MakeOfflineButton] Failed to check offline availability:', error);
    }
  };

  const handleMakeOffline = async () => {
    if (isDownloading || isOffline) {
      return;
    }

    setIsDownloading(true);
    setError(null);

    try {
      await prefetchBoardPack(reportId, companyId, (downloadProgress) => {
        setProgress(downloadProgress);
      });

      setIsOffline(true);
      setIsDownloading(false);
      setProgress(null);

      if (onSuccess) {
        onSuccess();
      }

      // Show success notification
      showNotification('Board pack available offline', `"${reportTitle}" is now available offline.`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Download failed';
      setError(errorMessage);
      setIsDownloading(false);
      setProgress(null);

      if (onError && err instanceof Error) {
        onError(err);
      }

      // Show error notification
      showNotification('Download failed', errorMessage, 'error');
    }
  };

  const showNotification = (title: string, body: string, type: 'success' | 'error' = 'success') => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/icons/icon-192x192.png',
        tag: `offline-${reportId}`,
      });
    }
  };

  if (variant === 'icon') {
    return (
      <button
        className={`offline-icon-button ${className}`}
        onClick={handleMakeOffline}
        disabled={isDownloading || isOffline}
        title={isOffline ? 'Available offline' : 'Make available offline'}
        aria-label={isOffline ? 'Available offline' : 'Make available offline'}
      >
        {isDownloading ? (
          <svg className="spinner" width="20" height="20" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="50" strokeDashoffset="25" />
          </svg>
        ) : isOffline ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        )}

        {isDownloading && progress && (
          <span className="progress-badge">{progress.percentage}%</span>
        )}

        <style jsx>{`
          .offline-icon-button {
            background: transparent;
            border: none;
            padding: 8px;
            cursor: pointer;
            color: #4a5568;
            transition: color 0.2s;
            position: relative;
          }

          .offline-icon-button:hover:not(:disabled) {
            color: #2d3748;
          }

          .offline-icon-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .spinner {
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }

          .progress-badge {
            position: absolute;
            top: -4px;
            right: -4px;
            background: #3b82f6;
            color: white;
            font-size: 10px;
            padding: 2px 4px;
            border-radius: 8px;
            font-weight: 600;
          }
        `}</style>
      </button>
    );
  }

  return (
    <div className={`make-offline-container ${className}`}>
      <button
        className={`make-offline-button ${isOffline ? 'offline' : ''} ${isDownloading ? 'downloading' : ''}`}
        onClick={handleMakeOffline}
        disabled={isDownloading || isOffline}
      >
        {isDownloading ? (
          <svg className="spinner" width="16" height="16" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="50" strokeDashoffset="25" />
          </svg>
        ) : isOffline ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        )}
        <span>
          {isDownloading
            ? `Downloading... ${progress?.percentage || 0}%`
            : isOffline
            ? 'Available Offline'
            : 'Make Available Offline'}
        </span>
      </button>

      {isDownloading && progress && (
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: `${progress.percentage}%` }} />
          <span className="progress-text">
            {progress.downloadedAssets} / {progress.totalAssets} assets
          </span>
        </div>
      )}

      {error && (
        <div className="error-message">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <span>{error}</span>
          <button onClick={handleMakeOffline} className="retry-button">
            Retry
          </button>
        </div>
      )}

      <style jsx>{`
        .make-offline-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .make-offline-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: white;
          color: #374151;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .make-offline-button:hover:not(:disabled) {
          border-color: #3b82f6;
          color: #3b82f6;
        }

        .make-offline-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .make-offline-button.offline {
          background: #10b981;
          border-color: #10b981;
          color: white;
        }

        .make-offline-button.downloading {
          background: #dbeafe;
          border-color: #3b82f6;
          color: #1e40af;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .progress-bar-container {
          position: relative;
          height: 24px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #60a5fa);
          transition: width 0.3s ease;
        }

        .progress-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 12px;
          font-weight: 600;
          color: #1f2937;
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          font-size: 13px;
          color: #991b1b;
        }

        .error-message svg {
          flex-shrink: 0;
        }

        .retry-button {
          margin-left: auto;
          background: #ef4444;
          color: white;
          border: none;
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .retry-button:hover {
          background: #dc2626;
        }
      `}</style>
    </div>
  );
}
