/**
 * ShareLinkModal Component
 *
 * Modal for generating secure share links with TTL and boardroom mode
 * Displays generated link with copy functionality
 */

import { useState } from 'react';
import type { FC } from 'react';

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilters: Record<string, any>;
  savedViewId?: string;
  companyId: string;
}

export const ShareLinkModal: FC<ShareLinkModalProps> = ({
  isOpen,
  onClose,
  currentFilters,
  savedViewId,
  companyId,
}) => {
  const [ttlDays, setTtlDays] = useState(7);
  const [boardroomMode, setBoardroomMode] = useState(false);
  const [includesSensitiveData, setIncludesSensitiveData] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/companies/${companyId}/share-links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          saved_view_id: savedViewId,
          filter_config: savedViewId ? undefined : currentFilters,
          ttl_days: ttlDays,
          boardroom_mode: boardroomMode,
          includes_sensitive_data: includesSensitiveData,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate share link');
      }

      const data = await response.json();
      setGeneratedLink(data.url);
      setExpiresAt(data.expires_at);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate share link');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedLink) return;

    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy link to clipboard');
    }
  };

  const handleClose = () => {
    setGeneratedLink(null);
    setExpiresAt(null);
    setTtlDays(7);
    setBoardroomMode(false);
    setIncludesSensitiveData(false);
    setCopied(false);
    setError(null);
    onClose();
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
          Share Dashboard View
        </h2>

        {!generatedLink ? (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Generate a secure, read-only link to share this dashboard view with stakeholders.
              Links expire after the specified period.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="ttl-days"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Link expires in
                </label>
                <select
                  id="ttl-days"
                  value={ttlDays}
                  onChange={(e) => setTtlDays(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                           bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                           focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  disabled={isGenerating}
                >
                  <option value={1}>1 day</option>
                  <option value={7}>7 days (default)</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days (maximum)</option>
                </select>
              </div>

              <div>
                <label className="flex items-start gap-3 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                  <input
                    type="checkbox"
                    checked={boardroomMode}
                    onChange={(e) => setBoardroomMode(e.target.checked)}
                    className="mt-0.5 w-6 h-6 text-blue-600 border-gray-300 rounded
                             focus:ring-blue-500 dark:focus:ring-blue-400
                             dark:border-gray-600 dark:bg-gray-900 cursor-pointer flex-shrink-0"
                    disabled={isGenerating}
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Enable Boardroom Mode
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Optimized for presentations with auto-refresh, large typography, and minimal
                      UI. Perfect for boardroom displays.
                    </p>
                  </div>
                </label>
              </div>

              <div>
                <label className="flex items-start gap-3 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                  <input
                    type="checkbox"
                    checked={includesSensitiveData}
                    onChange={(e) => setIncludesSensitiveData(e.target.checked)}
                    className="mt-0.5 w-6 h-6 text-orange-600 border-gray-300 rounded
                             focus:ring-orange-500 dark:focus:ring-orange-400
                             dark:border-gray-600 dark:bg-gray-900 cursor-pointer flex-shrink-0"
                    disabled={isGenerating}
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Include Sensitive Data
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      When enabled, individual names and identifiers are included. When disabled
                      (default), only aggregated metrics are shared with PII redacted.
                    </p>
                  </div>
                </label>
                {includesSensitiveData && (
                  <div className="ml-9 mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md">
                    <p className="text-xs text-orange-800 dark:text-orange-200">
                      <strong>Warning:</strong> This link will include individual-level data. Only
                      share with trusted recipients and consider using shorter TTL.
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Security Features
                </h3>
                <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Read-only access (no editing or data export)</li>
                  <li>• HMAC-signed URLs prevent tampering</li>
                  <li>• Automatic expiration after TTL</li>
                  <li>• PII redaction (unless sensitive data enabled)</li>
                  <li>• Access logging for audit trails</li>
                  <li>• Revocable at any time</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleClose}
                disabled={isGenerating}
                className="flex-1 px-4 py-2.5 min-h-[44px] border border-gray-300 dark:border-gray-600
                         text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50
                         dark:hover:bg-gray-700 transition-colors disabled:opacity-50
                         focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex-1 px-4 py-2.5 min-h-[44px] bg-blue-600 text-white rounded-md
                         hover:bg-blue-700 transition-colors disabled:opacity-50
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {isGenerating ? 'Generating...' : 'Generate Link'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <svg
                  className="w-5 h-5 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Share link generated successfully!
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Expires: {expiresAt && formatDate(expiresAt)}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Share Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={generatedLink}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                           bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100
                           text-sm font-mono"
                  onClick={(e) => e.currentTarget.select()}
                />
                <button
                  onClick={handleCopy}
                  className="px-4 py-2.5 min-h-[44px] bg-gray-100 dark:bg-gray-700 text-gray-700
                           dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600
                           transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500
                           whitespace-nowrap"
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {boardroomMode && (
              <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-md">
                <p className="text-sm text-purple-900 dark:text-purple-100">
                  <strong>Boardroom Mode enabled.</strong> This link will display in presentation
                  mode with auto-refresh and large fonts.
                </p>
              </div>
            )}

            <button
              onClick={handleClose}
              className="w-full px-4 py-2.5 min-h-[44px] bg-blue-600 text-white rounded-md
                       hover:bg-blue-700 transition-colors focus:outline-none
                       focus:ring-2 focus:ring-blue-500"
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
};
