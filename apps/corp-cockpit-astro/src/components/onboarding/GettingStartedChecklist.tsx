/**
 * Getting Started Checklist Component
 *
 * Displays a persistent checklist of onboarding tasks for new companies.
 * Progress is saved in localStorage and can be expanded/collapsed.
 */

import React, { useState, useEffect } from 'react';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  link?: string;
  icon: string;
}

interface GettingStartedChecklistProps {
  companyId: string;
  userRole: string;
  isCollapsed?: boolean;
}

const CHECKLIST_ITEMS: Omit<ChecklistItem, 'completed'>[] = [
  {
    id: 'upload_logo',
    title: 'Upload company logo',
    description: 'Add your branding to reports and dashboards',
    link: '/en/cockpit/{companyId}/admin#branding',
    icon: '🎨',
  },
  {
    id: 'configure_sso',
    title: 'Configure SSO',
    description: 'Set up single sign-on for your organization',
    link: '/en/cockpit/{companyId}/admin#sso',
    icon: '🔐',
  },
  {
    id: 'invite_team',
    title: 'Invite team members',
    description: 'Add colleagues and assign roles',
    link: '/en/cockpit/{companyId}/admin#users',
    icon: '👥',
  },
  {
    id: 'create_program',
    title: 'Create first program',
    description: 'Set up a buddy, kintell, or upskilling program',
    link: '/en/cockpit/{companyId}/programs/new',
    icon: '📋',
  },
  {
    id: 'view_report',
    title: 'View first report',
    description: 'Explore SROI and VIS dashboards',
    link: '/en/cockpit/{companyId}/reports',
    icon: '📊',
  },
  {
    id: 'export_pdf',
    title: 'Export first PDF',
    description: 'Generate a professional impact report',
    link: '/en/cockpit/{companyId}/reports/export',
    icon: '📄',
  },
];

export const GettingStartedChecklist: React.FC<GettingStartedChecklistProps> = ({
  companyId,
  userRole,
  isCollapsed: initialCollapsed = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [isDismissed, setIsDismissed] = useState(false);

  const storageKey = `checklist-${companyId}`;
  const dismissedKey = `checklist-dismissed-${companyId}`;

  useEffect(() => {
    // Load saved progress from localStorage
    const savedProgress = localStorage.getItem(storageKey);
    const dismissed = localStorage.getItem(dismissedKey) === 'true';

    setIsDismissed(dismissed);

    if (savedProgress) {
      try {
        const progress = JSON.parse(savedProgress);
        const loadedItems = CHECKLIST_ITEMS.map((item) => ({
          ...item,
          completed: progress[item.id] || false,
          link: item.link?.replace('{companyId}', companyId),
        }));
        setItems(loadedItems);
      } catch (error) {
        console.error('Failed to load checklist progress:', error);
        initializeItems();
      }
    } else {
      initializeItems();
    }
  }, [companyId]);

  const initializeItems = () => {
    const initialItems = CHECKLIST_ITEMS.map((item) => ({
      ...item,
      completed: false,
      link: item.link?.replace('{companyId}', companyId),
    }));
    setItems(initialItems);
  };

  const saveProgress = (updatedItems: ChecklistItem[]) => {
    const progress = updatedItems.reduce(
      (acc, item) => {
        acc[item.id] = item.completed;
        return acc;
      },
      {} as Record<string, boolean>
    );
    localStorage.setItem(storageKey, JSON.stringify(progress));
  };

  const handleToggleItem = (itemId: string) => {
    const updatedItems = items.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    setItems(updatedItems);
    saveProgress(updatedItems);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(dismissedKey, 'true');
  };

  const handleRestore = () => {
    setIsDismissed(false);
    localStorage.removeItem(dismissedKey);
  };

  const completedCount = items.filter((item) => item.completed).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const isComplete = completedCount === totalCount;

  if (isDismissed && isComplete) {
    // Show a small "restore" button for completed dismissed checklists
    return (
      <div className="getting-started-dismissed">
        <button
          onClick={handleRestore}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
          aria-label="Show getting started checklist"
        >
          Show onboarding checklist
        </button>
      </div>
    );
  }

  if (isDismissed) {
    return null;
  }

  return (
    <div className="getting-started-checklist bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div
        className="checklist-header px-4 py-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsCollapsed(!isCollapsed);
          }
        }}
        aria-expanded={!isCollapsed}
        aria-controls="checklist-content"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">
              🚀
            </span>
            <div>
              <h3 className="font-semibold text-gray-900">Getting Started</h3>
              <p className="text-xs text-gray-500">
                {completedCount} of {totalCount} completed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isComplete && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                ✓ Complete
              </span>
            )}
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${
                isCollapsed ? '' : 'rotate-180'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 bg-gray-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-600 h-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {/* Checklist Items */}
      {!isCollapsed && (
        <div id="checklist-content" className="checklist-content p-4">
          <ul className="space-y-3" role="list">
            {items.map((item) => (
              <li key={item.id} className="checklist-item">
                <label
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                    item.completed
                      ? 'bg-green-50 border-green-200'
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => handleToggleItem(item.id)}
                    className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 flex-shrink-0"
                    aria-describedby={`${item.id}-description`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <span className="text-lg" aria-hidden="true">
                        {item.icon}
                      </span>
                      <div className="flex-1">
                        <strong
                          className={`block ${
                            item.completed ? 'text-green-800 line-through' : 'text-gray-900'
                          }`}
                        >
                          {item.title}
                        </strong>
                        <span
                          id={`${item.id}-description`}
                          className={`text-sm ${
                            item.completed ? 'text-green-700' : 'text-gray-600'
                          }`}
                        >
                          {item.description}
                        </span>
                      </div>
                    </div>
                    {item.link && !item.completed && (
                      <a
                        href={item.link}
                        className="text-sm text-blue-600 hover:text-blue-700 underline mt-1 inline-block ml-7"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Go to task →
                      </a>
                    )}
                  </div>
                </label>
              </li>
            ))}
          </ul>

          {/* Footer Actions */}
          <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
            {isComplete ? (
              <p className="text-sm text-green-700 font-medium">
                🎉 Great job! You've completed all onboarding tasks.
              </p>
            ) : (
              <p className="text-sm text-gray-600">
                Complete these tasks to get the most out of the platform.
              </p>
            )}
            <button
              onClick={handleDismiss}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
              aria-label="Dismiss checklist"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <style>
        {`
          .getting-started-checklist {
            transition: box-shadow 0.2s ease-in-out;
          }

          .getting-started-checklist:hover {
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
              0 2px 4px -1px rgba(0, 0, 0, 0.06);
          }

          .checklist-item label {
            transition: all 0.2s ease-in-out;
          }

          @media (prefers-reduced-motion: reduce) {
            .getting-started-checklist,
            .checklist-item label {
              transition: none;
            }
          }
        `}
      </style>
    </div>
  );
};

export default GettingStartedChecklist;
