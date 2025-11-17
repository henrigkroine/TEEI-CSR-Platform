/**
 * Create Deck Button Component
 *
 * Floating action button for opening deck composer in boardroom mode.
 *
 * @module boardroom/CreateDeckButton
 */

import { useState } from 'react';
import { DeckComposerModal } from '../deck/DeckComposerModal';
import type { DeckConfig } from '../deck/types';

export interface CreateDeckButtonProps {
  /** Company identifier */
  companyId: string;
  /** Language locale */
  lang?: string;
  /** Company logo URL */
  logoUrl?: string;
  /** Primary brand color */
  primaryColor?: string;
}

export function CreateDeckButton({
  companyId,
  lang = 'en',
  logoUrl,
  primaryColor,
}: CreateDeckButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Calculate period (last 90 days)
  const periodEnd = new Date();
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - 90);

  const handleExport = async (config: DeckConfig) => {
    console.log('[CreateDeckButton] Exporting deck:', config);

    try {
      // Call PPTX export API
      const response = await fetch('/api/reports/export/pptx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `boardroom-deck-${config.template}-${config.locale}-${Date.now()}.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      console.log('[CreateDeckButton] Deck exported successfully');
    } catch (error) {
      console.error('[CreateDeckButton] Export failed:', error);
      throw error;
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-8 right-8 z-40 flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 group"
        aria-label="Create presentation deck"
        title="Create Deck"
      >
        {/* Icon */}
        <svg
          className="w-6 h-6 transition-transform group-hover:scale-110"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
          <path
            fillRule="evenodd"
            d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
            clipRule="evenodd"
          />
        </svg>

        {/* Text */}
        <span className="font-semibold text-lg">Create Deck</span>

        {/* Pulse indicator */}
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500"></span>
        </span>
      </button>

      {/* Deck Composer Modal */}
      <DeckComposerModal
        isOpen={isModalOpen}
        companyId={companyId}
        periodStart={periodStart}
        periodEnd={periodEnd}
        logoUrl={logoUrl}
        primaryColor={primaryColor}
        onExport={handleExport}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
