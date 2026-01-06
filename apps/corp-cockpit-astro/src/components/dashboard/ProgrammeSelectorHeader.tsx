/**
 * ProgrammeSelectorHeader
 * Programme filter dropdown for dashboard header
 * Allows filtering dashboard metrics by programme (All, Language Connect, Mentors for Ukraine)
 */

import { useState, useEffect } from 'react';
import type { ProgrammeFilter } from './ProgrammeSelector';

interface ProgrammeSelectorHeaderProps {
  companyId: string;
  selectedProgramme?: ProgrammeFilter;
  onProgrammeChange?: (programme: ProgrammeFilter) => void;
}

export default function ProgrammeSelectorHeader({
  companyId,
  selectedProgramme,
  onProgrammeChange,
}: ProgrammeSelectorHeaderProps) {
  // Initialize from URL or prop
  const getInitialProgramme = (): ProgrammeFilter => {
    if (selectedProgramme) return selectedProgramme;
    if (typeof window === 'undefined') return 'all';

    const urlParams = new URLSearchParams(window.location.search);
    const programmeParam = urlParams.get('programme');
    if (programmeParam === 'language_connect' || programmeParam === 'mentors_ukraine') {
      return programmeParam as ProgrammeFilter;
    }
    return 'all';
  };

  const [programme, setProgramme] = useState<ProgrammeFilter>(getInitialProgramme());

  // Sync with URL on mount and when prop changes
  useEffect(() => {
    if (selectedProgramme) {
      setProgramme(selectedProgramme);
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const programmeParam = urlParams.get('programme');
    if (programmeParam === 'language_connect' || programmeParam === 'mentors_ukraine') {
      setProgramme(programmeParam as ProgrammeFilter);
    } else {
      setProgramme('all');
    }
  }, [selectedProgramme]);

  // Listen for browser navigation
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const programmeParam = urlParams.get('programme');
      if (programmeParam === 'language_connect' || programmeParam === 'mentors_ukraine') {
        setProgramme(programmeParam as ProgrammeFilter);
      } else {
        setProgramme('all');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProgramme = e.target.value as ProgrammeFilter;
    setProgramme(newProgramme);

    // Update URL query parameter for deep linking
    const url = new URL(window.location.href);
    if (newProgramme === 'all') {
      url.searchParams.delete('programme');
    } else {
      url.searchParams.set('programme', newProgramme);
    }
    // Use replaceState to avoid cluttering history
    window.history.replaceState({}, '', url.toString());

    // Dispatch custom event for widgets to listen to
    window.dispatchEvent(
      new CustomEvent('programme-filter-changed', {
        detail: { programme: newProgramme, companyId },
        bubbles: true,
      })
    );

    // Call callback if provided
    if (onProgrammeChange) {
      onProgrammeChange(newProgramme);
    }
  };

  return (
    <div className="programme-selector-header" style={{ minWidth: '220px' }}>
      <label htmlFor="programme-filter" className="sr-only">
        Filter dashboard by programme
      </label>
      <select
        id="programme-filter"
        value={programme}
        onChange={handleChange}
        className="programme-filter-select"
        aria-label="Filter dashboard by programme"
        aria-describedby="programme-filter-description"
        style={{
          padding: '0.5rem 2.5rem 0.5rem 0.75rem',
          fontSize: '0.875rem',
          border: '1px solid var(--color-border, #e5e7eb)',
          borderRadius: '0.375rem',
          backgroundColor: 'var(--color-surface, #ffffff)',
          color: 'var(--color-text-primary, #111827)',
          cursor: 'pointer',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 0.5rem center',
          backgroundSize: '1rem',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--color-primary, #3b82f6)';
          e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'var(--color-border, #e5e7eb)';
          e.target.style.boxShadow = 'none';
        }}
      >
        <option value="all">All Programmes</option>
        <option value="language_connect">Language Connect for Ukraine</option>
        <option value="mentors_ukraine">Mentors for Ukraine</option>
      </select>
      <span id="programme-filter-description" className="sr-only">
        Select a programme to filter the dashboard metrics. Changes are reflected immediately.
      </span>
    </div>
  );
}
