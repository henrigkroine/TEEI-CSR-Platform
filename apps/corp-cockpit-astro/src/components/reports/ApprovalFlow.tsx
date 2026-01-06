/**
 * Approval Flow Component
 *
 * Visual workflow diagram showing approval states and transitions
 * - Draft → Submitted → In Review → Review Approved → Approved → Locked
 * - Shows current state and available transitions
 * - Highlights path taken through workflow
 *
 * @module components/reports/ApprovalFlow
 */

import type { ApprovalStatus } from '../../../../../services/reporting/src/types/approvals.js';

interface ApprovalFlowProps {
  currentStatus: ApprovalStatus;
  history?: Array<{
    status: ApprovalStatus;
    timestamp: Date;
    user_name: string;
  }>;
  compact?: boolean;
  showLabels?: boolean;
}

/**
 * Workflow state definitions
 */
const WORKFLOW_STATES = [
  { status: 'draft', label: 'Draft', color: '#6b7280', icon: '📝' },
  { status: 'submitted', label: 'Submitted', color: '#3b82f6', icon: '📤' },
  { status: 'in_review', label: 'In Review', color: '#f59e0b', icon: '👀' },
  { status: 'review_approved', label: 'Review Approved', color: '#10b981', icon: '✓' },
  { status: 'approved', label: 'Approved', color: '#059669', icon: '✅' },
  { status: 'locked', label: 'Locked', color: '#065f46', icon: '🔒' },
] as const;

/**
 * Rejection and change request paths (shown as side branches)
 */
const ALTERNATE_STATES = [
  { status: 'changes_requested', label: 'Changes Requested', color: '#ef4444', icon: '🔄' },
  { status: 'rejected', label: 'Rejected', color: '#dc2626', icon: '❌' },
] as const;

export default function ApprovalFlow({
  currentStatus,
  history = [],
  compact = false,
  showLabels = true,
}: ApprovalFlowProps) {
  // Determine which states have been completed
  const completedStates = new Set<string>();
  history.forEach((h) => completedStates.add(h.status));
  completedStates.add(currentStatus);

  // Find current state index
  const currentStateIndex = WORKFLOW_STATES.findIndex((s) => s.status === currentStatus);
  const isAlternateState = ALTERNATE_STATES.some((s) => s.status === currentStatus);

  return (
    <div className="approval-flow" role="region" aria-label="Approval workflow diagram">
      {/* Main workflow path */}
      <div className={`workflow-container ${compact ? 'compact' : ''}`}>
        <div className="workflow-path">
          {WORKFLOW_STATES.map((state, index) => {
            const isActive = state.status === currentStatus;
            const isCompleted = completedStates.has(state.status) && !isActive;
            const isPending = !isCompleted && !isActive;

            return (
              <React.Fragment key={state.status}>
                {/* State node */}
                <div
                  className={`state-node ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${
                    isPending ? 'pending' : ''
                  }`}
                  style={{
                    borderColor: isActive || isCompleted ? state.color : '#d1d5db',
                    backgroundColor: isActive ? state.color : isCompleted ? `${state.color}15` : 'white',
                  }}
                  role="status"
                  aria-label={`${state.label} - ${isActive ? 'current' : isCompleted ? 'completed' : 'pending'}`}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <div className="state-icon" style={{ opacity: isActive || isCompleted ? 1 : 0.3 }}>
                    {state.icon}
                  </div>
                  {showLabels && (
                    <div
                      className="state-label"
                      style={{
                        color: isActive ? 'white' : isCompleted ? state.color : '#6b7280',
                        fontWeight: isActive ? 700 : 600,
                      }}
                    >
                      {state.label}
                    </div>
                  )}
                </div>

                {/* Connector */}
                {index < WORKFLOW_STATES.length - 1 && (
                  <div
                    className="state-connector"
                    style={{
                      backgroundColor: isCompleted ? state.color : '#e5e7eb',
                    }}
                    role="presentation"
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Alternate paths (changes requested, rejected) */}
        {isAlternateState && (
          <div className="alternate-paths" role="complementary" aria-label="Alternate workflow states">
            {ALTERNATE_STATES.map((altState) => {
              if (altState.status !== currentStatus) return null;

              return (
                <div key={altState.status} className="alternate-state">
                  <div className="alternate-connector" />
                  <div
                    className="state-node active"
                    style={{
                      borderColor: altState.color,
                      backgroundColor: altState.color,
                    }}
                    role="status"
                    aria-label={`${altState.label} - current`}
                    aria-current="step"
                  >
                    <div className="state-icon">{altState.icon}</div>
                    {showLabels && <div className="state-label text-white">{altState.label}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Status description */}
      {!compact && (
        <div className="status-description" role="status" aria-live="polite">
          {getStatusDescription(currentStatus)}
        </div>
      )}

      <style jsx>{`
        .approval-flow {
          padding: 24px;
          background: #f9fafb;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }

        .workflow-container {
          position: relative;
        }

        .workflow-container.compact {
          padding: 8px 0;
        }

        .workflow-path {
          display: flex;
          align-items: center;
          gap: 0;
          position: relative;
        }

        .state-node {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 16px;
          border: 3px solid;
          border-radius: 12px;
          min-width: 120px;
          background: white;
          transition: all 0.3s ease;
          position: relative;
          z-index: 2;
        }

        .workflow-container.compact .state-node {
          min-width: 80px;
          padding: 12px;
          gap: 4px;
        }

        .state-node.active {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transform: scale(1.05);
        }

        .state-icon {
          font-size: 24px;
          transition: opacity 0.3s;
        }

        .workflow-container.compact .state-icon {
          font-size: 18px;
        }

        .state-label {
          font-size: 0.875rem;
          font-weight: 600;
          text-align: center;
          line-height: 1.2;
        }

        .workflow-container.compact .state-label {
          font-size: 0.75rem;
        }

        .state-connector {
          flex: 1;
          height: 4px;
          min-width: 40px;
          background: #e5e7eb;
          position: relative;
          z-index: 1;
          margin: 0 -2px;
          transition: background-color 0.3s;
        }

        .alternate-paths {
          margin-top: 32px;
          display: flex;
          justify-content: center;
        }

        .alternate-state {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .alternate-connector {
          width: 3px;
          height: 32px;
          background: #e5e7eb;
          margin-bottom: 8px;
        }

        .status-description {
          margin-top: 24px;
          padding: 16px;
          background: white;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
          color: #4b5563;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        @media (max-width: 768px) {
          .workflow-path {
            flex-direction: column;
          }

          .state-connector {
            width: 4px;
            height: 40px;
            min-width: 0;
            min-height: 40px;
            margin: -2px 0;
          }

          .state-node {
            width: 100%;
            flex-direction: row;
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Get description for current status
 */
function getStatusDescription(status: ApprovalStatus): string {
  const descriptions: Record<ApprovalStatus, string> = {
    draft: 'The report is in draft mode and can be edited. Submit it for review when ready.',
    submitted:
      'The report has been submitted and is waiting for a reviewer to start the review process.',
    in_review:
      'The report is currently being reviewed. The reviewer can approve it or request changes.',
    changes_requested:
      'The reviewer has requested changes. Address the feedback and resubmit for review.',
    review_approved:
      'The reviewer has approved the report. It is now waiting for final approval from an authorized approver.',
    approved:
      'The report has been approved. It can now be locked to prevent further modifications.',
    locked:
      'The report is locked and cannot be modified. It has a watermark applied and is ready for distribution.',
    rejected:
      'The report has been rejected and cannot proceed. You may need to create a new version.',
  };

  return descriptions[status] || 'Unknown status';
}

/**
 * Accessibility: Screen reader announcement for state change
 */
export function announceStateChange(
  oldStatus: ApprovalStatus,
  newStatus: ApprovalStatus,
  userName: string
): string {
  return `Approval status changed from ${formatStatusForSpeech(oldStatus)} to ${formatStatusForSpeech(newStatus)} by ${userName}`;
}

function formatStatusForSpeech(status: ApprovalStatus): string {
  return status.replace(/_/g, ' ');
}
