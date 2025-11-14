/**
 * Watermark Overlay Component
 *
 * Visual badges and watermarks for report approval states:
 * - DRAFT - Yellow/gray watermark for draft reports
 * - APPROVED - Green watermark for approved reports
 * - LOCKED - Blue/green watermark with approver name and timestamp
 * - ARCHIVED - Gray watermark for archived reports
 * - REJECTED - Red watermark for rejected reports
 *
 * @module components/reports/WatermarkOverlay
 */

import React from 'react';
import type { ApprovalStatus } from '../../../../../services/reporting/src/types/approvals.js';

interface WatermarkOverlayProps {
  status: ApprovalStatus;
  approverName?: string;
  approvalDate?: string | Date;
  companyLogo?: string;
  position?: 'header' | 'footer' | 'diagonal' | 'corner' | 'center';
  opacity?: number;
  includeTimestamp?: boolean;
  includeApproverName?: boolean;
}

export default function WatermarkOverlay({
  status,
  approverName,
  approvalDate,
  companyLogo,
  position = 'diagonal',
  opacity = 0.15,
  includeTimestamp = true,
  includeApproverName = true,
}: WatermarkOverlayProps) {
  const config = getWatermarkConfig(status);
  const text = getWatermarkText(status, approverName, approvalDate, includeApproverName, includeTimestamp);

  // Don't show watermark for certain statuses
  if (['submitted', 'in_review', 'review_approved'].includes(status)) {
    return null;
  }

  if (position === 'diagonal') {
    return <DiagonalWatermark text={text} color={config.color} opacity={opacity} />;
  }

  if (position === 'corner') {
    return (
      <CornerBadge
        text={config.label}
        color={config.color}
        icon={config.icon}
        companyLogo={companyLogo}
      />
    );
  }

  if (position === 'header') {
    return (
      <HeaderBanner
        text={text}
        color={config.color}
        backgroundColor={config.backgroundColor}
        icon={config.icon}
      />
    );
  }

  if (position === 'footer') {
    return (
      <FooterBanner
        text={text}
        color={config.color}
        backgroundColor={config.backgroundColor}
        icon={config.icon}
      />
    );
  }

  if (position === 'center') {
    return <CenterWatermark text={text} color={config.color} opacity={opacity} />;
  }

  return null;
}

/**
 * Diagonal Watermark (classic watermark across page)
 */
function DiagonalWatermark({
  text,
  color,
  opacity,
}: {
  text: string;
  color: string;
  opacity: number;
}) {
  return (
    <div className="diagonal-watermark" aria-hidden="true">
      <div className="watermark-text" style={{ color, opacity }}>
        {text}
      </div>

      <style jsx>{`
        .diagonal-watermark {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 9999;
          overflow: hidden;
        }

        .watermark-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 5rem;
          font-weight: 900;
          text-transform: uppercase;
          white-space: nowrap;
          letter-spacing: 0.2em;
          user-select: none;
        }

        @media (max-width: 768px) {
          .watermark-text {
            font-size: 3rem;
          }
        }

        @media print {
          .diagonal-watermark {
            display: block;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Corner Badge (small badge in corner)
 */
function CornerBadge({
  text,
  color,
  icon,
  companyLogo,
}: {
  text: string;
  color: string;
  icon: string;
  companyLogo?: string;
}) {
  return (
    <div className="corner-badge" role="status" aria-label={`Report status: ${text}`}>
      <div className="badge-content" style={{ backgroundColor: color }}>
        {companyLogo ? (
          <img src={companyLogo} alt="Company logo" className="company-logo" />
        ) : (
          <span className="badge-icon">{icon}</span>
        )}
        <span className="badge-text">{text}</span>
      </div>

      <style jsx>{`
        .corner-badge {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 9998;
          pointer-events: none;
        }

        .badge-content {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: 8px;
          color: white;
          font-weight: 700;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .badge-icon {
          font-size: 1.25rem;
        }

        .company-logo {
          width: 24px;
          height: 24px;
          object-fit: contain;
        }

        @media print {
          .corner-badge {
            display: flex;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Header Banner (full-width banner at top)
 */
function HeaderBanner({
  text,
  color,
  backgroundColor,
  icon,
}: {
  text: string;
  color: string;
  backgroundColor: string;
  icon: string;
}) {
  return (
    <div
      className="header-banner"
      style={{ backgroundColor, color }}
      role="banner"
      aria-label={text}
    >
      <div className="banner-content">
        <span className="banner-icon">{icon}</span>
        <span className="banner-text">{text}</span>
      </div>

      <style jsx>{`
        .header-banner {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 9998;
          pointer-events: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .banner-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 12px 24px;
          font-weight: 700;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .banner-icon {
          font-size: 1.25rem;
        }

        @media print {
          .header-banner {
            display: flex;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Footer Banner (full-width banner at bottom)
 */
function FooterBanner({
  text,
  color,
  backgroundColor,
  icon,
}: {
  text: string;
  color: string;
  backgroundColor: string;
  icon: string;
}) {
  return (
    <div
      className="footer-banner"
      style={{ backgroundColor, color }}
      role="contentinfo"
      aria-label={text}
    >
      <div className="banner-content">
        <span className="banner-icon">{icon}</span>
        <span className="banner-text">{text}</span>
      </div>

      <style jsx>{`
        .footer-banner {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 9998;
          pointer-events: none;
          box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
        }

        .banner-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 12px 24px;
          font-weight: 700;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .banner-icon {
          font-size: 1.25rem;
        }

        @media print {
          .footer-banner {
            display: flex;
            position: relative;
            margin-top: auto;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Center Watermark (large centered text)
 */
function CenterWatermark({
  text,
  color,
  opacity,
}: {
  text: string;
  color: string;
  opacity: number;
}) {
  return (
    <div className="center-watermark" aria-hidden="true">
      <div className="watermark-text" style={{ color, opacity }}>
        {text}
      </div>

      <style jsx>{`
        .center-watermark {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .watermark-text {
          font-size: 6rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          user-select: none;
        }

        @media (max-width: 768px) {
          .watermark-text {
            font-size: 3rem;
          }
        }

        @media print {
          .center-watermark {
            display: flex;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Status Badge (inline badge for lists/tables)
 */
export function StatusBadge({
  status,
  size = 'medium',
}: {
  status: ApprovalStatus;
  size?: 'small' | 'medium' | 'large';
}) {
  const config = getWatermarkConfig(status);

  return (
    <span
      className={`status-badge ${size}`}
      style={{
        backgroundColor: config.backgroundColor,
        color: config.color,
      }}
      role="status"
      aria-label={`Status: ${config.label}`}
    >
      <span className="badge-icon">{config.icon}</span>
      <span className="badge-label">{config.label}</span>

      <style jsx>{`
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 6px;
          font-weight: 700;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .status-badge.small {
          padding: 4px 8px;
          font-size: 0.625rem;
          gap: 4px;
        }

        .status-badge.small .badge-icon {
          font-size: 0.75rem;
        }

        .status-badge.medium {
          padding: 6px 12px;
          font-size: 0.75rem;
        }

        .status-badge.medium .badge-icon {
          font-size: 1rem;
        }

        .status-badge.large {
          padding: 8px 16px;
          font-size: 0.875rem;
        }

        .status-badge.large .badge-icon {
          font-size: 1.25rem;
        }
      `}</style>
    </span>
  );
}

/**
 * Get watermark configuration for status
 */
function getWatermarkConfig(status: ApprovalStatus): {
  label: string;
  color: string;
  backgroundColor: string;
  icon: string;
} {
  const configs: Record<ApprovalStatus, any> = {
    draft: {
      label: 'Draft',
      color: '#6b7280',
      backgroundColor: '#f3f4f6',
      icon: '📝',
    },
    submitted: {
      label: 'Submitted',
      color: '#3b82f6',
      backgroundColor: '#dbeafe',
      icon: '📤',
    },
    in_review: {
      label: 'In Review',
      color: '#f59e0b',
      backgroundColor: '#fef3c7',
      icon: '👀',
    },
    changes_requested: {
      label: 'Changes Requested',
      color: '#ef4444',
      backgroundColor: '#fee2e2',
      icon: '🔄',
    },
    review_approved: {
      label: 'Review Approved',
      color: '#10b981',
      backgroundColor: '#d1fae5',
      icon: '✓',
    },
    approved: {
      label: 'Approved',
      color: '#059669',
      backgroundColor: '#d1fae5',
      icon: '✅',
    },
    locked: {
      label: 'Locked',
      color: '#ffffff',
      backgroundColor: '#065f46',
      icon: '🔒',
    },
    rejected: {
      label: 'Rejected',
      color: '#ffffff',
      backgroundColor: '#dc2626',
      icon: '❌',
    },
  };

  return configs[status];
}

/**
 * Get watermark text based on status and options
 */
function getWatermarkText(
  status: ApprovalStatus,
  approverName?: string,
  approvalDate?: string | Date,
  includeApproverName?: boolean,
  includeTimestamp?: boolean
): string {
  const config = getWatermarkConfig(status);
  let text = config.label.toUpperCase();

  if (status === 'locked' || status === 'approved') {
    if (includeApproverName && approverName) {
      text += ` BY ${approverName.toUpperCase()}`;
    }

    if (includeTimestamp && approvalDate) {
      const date = new Date(approvalDate);
      text += ` - ${date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).toUpperCase()}`;
    }
  }

  return text;
}

/**
 * Print-specific watermark component
 */
export function PrintWatermark({
  status,
  approverName,
  approvalDate,
}: {
  status: ApprovalStatus;
  approverName?: string;
  approvalDate?: string | Date;
}) {
  const config = getWatermarkConfig(status);
  const text = getWatermarkText(status, approverName, approvalDate, true, true);

  return (
    <div className="print-watermark">
      <div className="watermark-header" style={{ backgroundColor: config.backgroundColor }}>
        <span className="watermark-icon">{config.icon}</span>
        <span className="watermark-label" style={{ color: config.color }}>
          {text}
        </span>
      </div>

      <style jsx>{`
        .print-watermark {
          display: none;
        }

        @media print {
          .print-watermark {
            display: block;
            page-break-before: avoid;
            page-break-after: avoid;
          }

          .watermark-header {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            padding: 16px;
            margin: 0;
            border-top: 3px solid currentColor;
            border-bottom: 3px solid currentColor;
          }

          .watermark-icon {
            font-size: 1.5rem;
          }

          .watermark-label {
            font-weight: 900;
            font-size: 1.125rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Composite watermark (combines multiple positions)
 */
export function CompositeWatermark({
  status,
  approverName,
  approvalDate,
  showDiagonal = true,
  showCorner = true,
  companyLogo,
}: {
  status: ApprovalStatus;
  approverName?: string;
  approvalDate?: string | Date;
  showDiagonal?: boolean;
  showCorner?: boolean;
  companyLogo?: string;
}) {
  return (
    <>
      {showDiagonal && (
        <WatermarkOverlay
          status={status}
          approverName={approverName}
          approvalDate={approvalDate}
          position="diagonal"
          opacity={0.1}
        />
      )}
      {showCorner && (
        <WatermarkOverlay
          status={status}
          approverName={approverName}
          approvalDate={approvalDate}
          position="corner"
          companyLogo={companyLogo}
        />
      )}
      <PrintWatermark status={status} approverName={approverName} approvalDate={approvalDate} />
    </>
  );
}
