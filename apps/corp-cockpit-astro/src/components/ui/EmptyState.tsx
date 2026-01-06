/**
 * EmptyState — Premium empty state component
 * 
 * Elegant illustrations and clear messaging for empty views.
 */

import React from 'react';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: 'chart' | 'search' | 'document' | 'users' | 'calendar' | 'inbox' | 'folder';
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// =============================================================================
// ICON ILLUSTRATIONS
// =============================================================================

const icons = {
  chart: (
    <svg viewBox="0 0 64 64" fill="none" className="empty-state-icon">
      <rect x="8" y="40" width="10" height="16" rx="2" fill="currentColor" opacity="0.15"/>
      <rect x="22" y="28" width="10" height="28" rx="2" fill="currentColor" opacity="0.25"/>
      <rect x="36" y="18" width="10" height="38" rx="2" fill="currentColor" opacity="0.35"/>
      <rect x="50" y="32" width="10" height="24" rx="2" fill="currentColor" opacity="0.25"/>
      <path 
        d="M8 22L22 14L36 20L50 10L60 14" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        opacity="0.5"
      />
      <circle cx="8" cy="22" r="3" fill="currentColor" opacity="0.6"/>
      <circle cx="22" cy="14" r="3" fill="currentColor" opacity="0.6"/>
      <circle cx="36" cy="20" r="3" fill="currentColor" opacity="0.6"/>
      <circle cx="50" cy="10" r="3" fill="currentColor" opacity="0.6"/>
    </svg>
  ),
  search: (
    <svg viewBox="0 0 64 64" fill="none" className="empty-state-icon">
      <circle cx="28" cy="28" r="16" stroke="currentColor" strokeWidth="2.5" opacity="0.3"/>
      <circle cx="28" cy="28" r="10" stroke="currentColor" strokeWidth="2" opacity="0.15"/>
      <path 
        d="M40 40L52 52" 
        stroke="currentColor" 
        strokeWidth="3" 
        strokeLinecap="round"
        opacity="0.4"
      />
      <path 
        d="M22 24a6 6 0 0 1 6-6" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round"
        opacity="0.3"
      />
    </svg>
  ),
  document: (
    <svg viewBox="0 0 64 64" fill="none" className="empty-state-icon">
      <path 
        d="M16 8h24l12 12v36a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4z" 
        stroke="currentColor" 
        strokeWidth="2"
        opacity="0.3"
      />
      <path 
        d="M40 8v12h12" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        opacity="0.3"
      />
      <path d="M20 28h24M20 36h24M20 44h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.2"/>
    </svg>
  ),
  users: (
    <svg viewBox="0 0 64 64" fill="none" className="empty-state-icon">
      <circle cx="24" cy="20" r="8" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
      <path 
        d="M8 52c0-8 8-12 16-12s16 4 16 12" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round"
        opacity="0.25"
      />
      <circle cx="44" cy="22" r="6" stroke="currentColor" strokeWidth="2" opacity="0.2"/>
      <path 
        d="M48 52c0-6 4-9 8-9" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round"
        opacity="0.15"
      />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 64 64" fill="none" className="empty-state-icon">
      <rect x="8" y="12" width="48" height="44" rx="4" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
      <path d="M8 24h48" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
      <path d="M20 8v8M44 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3"/>
      <rect x="16" y="32" width="8" height="8" rx="1" fill="currentColor" opacity="0.15"/>
      <rect x="28" y="32" width="8" height="8" rx="1" fill="currentColor" opacity="0.2"/>
      <rect x="40" y="32" width="8" height="8" rx="1" fill="currentColor" opacity="0.15"/>
      <rect x="16" y="44" width="8" height="8" rx="1" fill="currentColor" opacity="0.1"/>
      <rect x="28" y="44" width="8" height="8" rx="1" fill="currentColor" opacity="0.15"/>
    </svg>
  ),
  inbox: (
    <svg viewBox="0 0 64 64" fill="none" className="empty-state-icon">
      <path 
        d="M8 32l8-20h32l8 20v20a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V32z" 
        stroke="currentColor" 
        strokeWidth="2"
        opacity="0.3"
      />
      <path 
        d="M8 32h16l4 8h8l4-8h16" 
        stroke="currentColor" 
        strokeWidth="2"
        opacity="0.25"
      />
    </svg>
  ),
  folder: (
    <svg viewBox="0 0 64 64" fill="none" className="empty-state-icon">
      <path 
        d="M8 16h16l4 4h28a4 4 0 0 1 4 4v28a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V20a4 4 0 0 1 4-4z" 
        stroke="currentColor" 
        strokeWidth="2"
        opacity="0.3"
      />
      <path 
        d="M4 24h56" 
        stroke="currentColor" 
        strokeWidth="2"
        opacity="0.2"
      />
    </svg>
  ),
};

// =============================================================================
// SIZE CONFIGURATIONS
// =============================================================================

const sizes = {
  sm: {
    wrapper: 'py-8',
    icon: 48,
    title: 'text-base',
    description: 'text-sm',
  },
  md: {
    wrapper: 'py-12',
    icon: 64,
    title: 'text-lg',
    description: 'text-sm',
  },
  lg: {
    wrapper: 'py-16',
    icon: 80,
    title: 'text-xl',
    description: 'text-base',
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function EmptyState({
  title,
  description,
  icon = 'chart',
  action,
  size = 'md',
  className = '',
}: EmptyStateProps) {
  const sizeConfig = sizes[size];
  const IconComponent = icons[icon];

  return (
    <div className={`empty-state ${sizeConfig.wrapper} ${className}`}>
      <div 
        className="empty-state-icon-wrapper"
        style={{ width: sizeConfig.icon, height: sizeConfig.icon }}
      >
        {IconComponent}
      </div>
      
      <h3 className={`empty-state-title ${sizeConfig.title}`}>
        {title}
      </h3>
      
      {description && (
        <p className={`empty-state-description ${sizeConfig.description}`}>
          {description}
        </p>
      )}
      
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className={`btn ${action.variant === 'secondary' ? 'btn-secondary' : 'btn-primary'} empty-state-action`}
        >
          {action.label}
        </button>
      )}

      <style>{`
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding-left: 24px;
          padding-right: 24px;
        }

        .empty-state-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          color: var(--color-primary);
        }

        .empty-state-icon {
          width: 100%;
          height: 100%;
        }

        .empty-state-title {
          font-weight: var(--font-weight-semibold);
          color: var(--color-text-primary);
          margin: 0 0 8px;
          line-height: var(--leading-tight);
        }

        .empty-state-description {
          color: var(--color-text-secondary);
          margin: 0;
          max-width: 320px;
          line-height: var(--leading-relaxed);
        }

        .empty-state-action {
          margin-top: 20px;
        }
      `}</style>
    </div>
  );
}

// =============================================================================
// PRESET EMPTY STATES
// =============================================================================

export function NoCampaignsEmpty({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon="folder"
      title="No campaigns yet"
      description="Create your first campaign to start tracking impact and engaging volunteers."
      action={onCreate ? {
        label: 'Create Campaign',
        onClick: onCreate,
      } : undefined}
    />
  );
}

export function NoVolunteersEmpty({ onInvite }: { onInvite?: () => void }) {
  return (
    <EmptyState
      icon="users"
      title="No volunteers assigned"
      description="Invite volunteers to participate in this campaign and make a difference."
      action={onInvite ? {
        label: 'Invite Volunteers',
        onClick: onInvite,
      } : undefined}
    />
  );
}

export function NoEvidenceEmpty({ onCollect }: { onCollect?: () => void }) {
  return (
    <EmptyState
      icon="document"
      title="No evidence collected"
      description="Evidence helps demonstrate impact. Start collecting stories, feedback, and outcomes."
      action={onCollect ? {
        label: 'Collect Evidence',
        onClick: onCollect,
      } : undefined}
    />
  );
}

export function NoReportsEmpty({ onGenerate }: { onGenerate?: () => void }) {
  return (
    <EmptyState
      icon="chart"
      title="No reports generated"
      description="Generate your first impact report to share your achievements with stakeholders."
      action={onGenerate ? {
        label: 'Generate Report',
        onClick: onGenerate,
      } : undefined}
    />
  );
}

export function NoSearchResultsEmpty({ query }: { query?: string }) {
  return (
    <EmptyState
      icon="search"
      title="No results found"
      description={query 
        ? `We couldn't find anything matching "${query}". Try a different search term.`
        : "We couldn't find any matching results. Try adjusting your filters."
      }
      size="sm"
    />
  );
}

export function NoEventsEmpty() {
  return (
    <EmptyState
      icon="calendar"
      title="No upcoming events"
      description="There are no scheduled events at this time. Check back later or create a new event."
      size="sm"
    />
  );
}

export function EmptyInboxState() {
  return (
    <EmptyState
      icon="inbox"
      title="All caught up!"
      description="You have no pending notifications or tasks. Great job staying on top of things."
      size="sm"
    />
  );
}



