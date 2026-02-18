/**
 * Saved Views Integration Component
 * 
 * Client-side wrapper for saved views functionality in the dashboard
 */

import { useState, useEffect } from 'react';
import { SavedViewsList } from '../views/SavedViewsList';
import { SaveViewModal } from '../views/SaveViewModal';

interface SavedViewsIntegrationProps {
  companyId: string;
}

export default function SavedViewsIntegration({ companyId }: SavedViewsIntegrationProps) {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<Record<string, any>>({});

  // Load default view on mount
  useEffect(() => {
    loadDefaultView();
  }, [companyId]);

  async function loadDefaultView() {
    try {
      const response = await fetch(`/api/companies/${companyId}/views?default=true`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.views && data.views.length > 0) {
          const defaultView = data.views.find((v: any) => v.is_default);
          if (defaultView) {
            applyViewFilters(defaultView.filter_config);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load default view:', err);
    }
  }

  function applyViewFilters(filterConfig: Record<string, any>) {
    setCurrentFilters(filterConfig);
    
    // Dispatch event for widgets to listen to
    window.dispatchEvent(
      new CustomEvent('dashboard-view-loaded', {
        detail: filterConfig,
      })
    );
  }

  function handleViewLoad(filterConfig: Record<string, any>) {
    applyViewFilters(filterConfig);
  }

  return (
    <div className="saved-views-integration">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowSaveModal(true)}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300
                   bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
                   rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                   focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Save View
        </button>
      </div>

      {showSaveModal && (
        <SaveViewModal
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          currentFilters={currentFilters}
          companyId={companyId}
          onViewSaved={() => {
            setShowSaveModal(false);
            // Reload views list would be handled by SavedViewsList component
          }}
        />
      )}

      <div className="mt-4">
        <SavedViewsList
          companyId={companyId}
          onViewLoad={handleViewLoad}
          currentFilters={currentFilters}
        />
      </div>
    </div>
  );
}

