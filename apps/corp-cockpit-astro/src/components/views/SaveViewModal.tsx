/**
 * SaveViewModal Component
 *
 * Modal for saving current dashboard filter configuration as a named view
 * Max 10 views per user with optional default flag
 */

import { useState } from 'react';
import type { FC } from 'react';

interface SaveViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilters: Record<string, any>;
  companyId: string;
  onViewSaved: () => void;
}

export const SaveViewModal: FC<SaveViewModalProps> = ({
  isOpen,
  onClose,
  currentFilters,
  companyId,
  onViewSaved,
}) => {
  const [viewName, setViewName] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!viewName.trim()) {
      setError('View name is required');
      return;
    }

    if (viewName.length > 100) {
      setError('View name must be 100 characters or less');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/companies/${companyId}/views`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          view_name: viewName,
          description: description || undefined,
          filter_config: currentFilters,
          is_default: isDefault,
          is_shared: isShared,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save view');
      }

      onViewSaved();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save view');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setViewName('');
    setDescription('');
    setIsDefault(false);
    setIsShared(false);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
          Save Current View
        </h2>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Save your current dashboard filter configuration for quick access later. You can save up
          to 10 views.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label
              htmlFor="view-name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              View Name <span className="text-red-500">*</span>
            </label>
            <input
              id="view-name"
              type="text"
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              placeholder="e.g., Q4 2024 Overview"
              maxLength={100}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                       bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              disabled={isSaving}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {viewName.length}/100 characters
            </p>
          </div>

          <div>
            <label
              htmlFor="view-description"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Description (optional)
            </label>
            <textarea
              id="view-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description to help remember what this view shows..."
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                       bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                       resize-none"
              disabled={isSaving}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {description.length}/500 characters
            </p>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded
                         focus:ring-blue-500 dark:focus:ring-blue-400
                         dark:border-gray-600 dark:bg-gray-900"
                disabled={isSaving}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Set as my default view
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isShared}
                onChange={(e) => setIsShared(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded
                         focus:ring-blue-500 dark:focus:ring-blue-400
                         dark:border-gray-600 dark:bg-gray-900"
                disabled={isSaving}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Share with my team
              </span>
            </label>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600
                     text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50
                     dark:hover:bg-gray-700 transition-colors disabled:opacity-50
                     focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !viewName.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md
                     hover:bg-blue-700 transition-colors disabled:opacity-50
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {isSaving ? 'Saving...' : 'Save View'}
          </button>
        </div>
      </div>
    </div>
  );
};
