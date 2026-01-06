/**
 * Deck Composer Modal Component
 *
 * Modal wrapper for DeckComposer with overlay and animations.
 *
 * @module deck/DeckComposerModal
 */

import { useEffect, useCallback } from 'react';
import { DeckComposer } from './DeckComposer';
import type { DeckConfig } from './types';

export interface DeckComposerModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Company identifier */
  companyId: string;
  /** Period start date */
  periodStart: Date;
  /** Period end date */
  periodEnd: Date;
  /** Company logo URL */
  logoUrl?: string;
  /** Primary brand color */
  primaryColor?: string;
  /** Callback when export is requested */
  onExport: (config: DeckConfig) => Promise<void>;
  /** Callback when modal is closed */
  onClose: () => void;
}

export function DeckComposerModal({
  isOpen,
  companyId,
  periodStart,
  periodEnd,
  logoUrl,
  primaryColor,
  onExport,
  onClose,
}: DeckComposerModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle export and close
  const handleExport = useCallback(
    async (config: DeckConfig) => {
      await onExport(config);
      onClose();
    },
    [onExport, onClose]
  );

  // Handle overlay click
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="deck-composer-title"
    >
      <div
        className="w-full max-w-6xl h-[90vh] bg-white rounded-xl shadow-2xl animate-scaleIn overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <DeckComposer
          companyId={companyId}
          periodStart={periodStart}
          periodEnd={periodEnd}
          logoUrl={logoUrl}
          primaryColor={primaryColor}
          onExport={handleExport}
          onClose={onClose}
        />
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
