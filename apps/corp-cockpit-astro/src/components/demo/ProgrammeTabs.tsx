/**
 * Programme Tabs
 *
 * Tabs for switching between Language Connect and Mentorship programmes.
 */

export interface ProgrammeTabsProps {
  selectedProgramme: 'language_connect' | 'mentorship' | 'all';
  onProgrammeChange: (programme: 'language_connect' | 'mentorship' | 'all') => void;
  className?: string;
}

export default function ProgrammeTabs({
  selectedProgramme,
  onProgrammeChange,
  className = '',
}: ProgrammeTabsProps) {
  return (
    <div className={`programme-tabs ${className}`} role="tablist">
      <button
        role="tab"
        aria-selected={selectedProgramme === 'all'}
        onClick={() => onProgrammeChange('all')}
        className={`programme-tab ${selectedProgramme === 'all' ? 'active' : ''}`}
      >
        All Programmes
      </button>
      <button
        role="tab"
        aria-selected={selectedProgramme === 'language_connect'}
        onClick={() => onProgrammeChange('language_connect')}
        className={`programme-tab ${selectedProgramme === 'language_connect' ? 'active' : ''}`}
      >
        Language Connect for Ukraine
      </button>
      <button
        role="tab"
        aria-selected={selectedProgramme === 'mentorship'}
        onClick={() => onProgrammeChange('mentorship')}
        className={`programme-tab ${selectedProgramme === 'mentorship' ? 'active' : ''}`}
      >
        Mentorship for Ukraine
      </button>
      <style>{`
        .programme-tabs {
          display: flex;
          gap: 8px;
          border-bottom: 2px solid #e5e7eb;
          margin-bottom: 24px;
        }

        .programme-tab {
          padding: 12px 20px;
          background: transparent;
          border: none;
          border-bottom: 3px solid transparent;
          font-size: 0.875rem;
          font-weight: 500;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: -2px;
        }

        .programme-tab:hover {
          color: #111827;
          background: #f9fafb;
        }

        .programme-tab.active {
          color: #0066cc;
          border-bottom-color: #0066cc;
          font-weight: 600;
        }

        .programme-tab:focus {
          outline: 2px solid #0066cc;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}
