/**
 * Dashboard Actions Component
 *
 * Floating action button and quick actions menu for dashboard:
 * - Generate Report
 * - View Evidence
 * - Export Data
 * - Share Dashboard
 *
 * @module DashboardActions
 */

import { useState } from 'react';
import ReportGenerationModal from './reports/ReportGenerationModal';

interface DashboardActionsProps {
  companyId: string;
  canGenerateReports: boolean;
  canViewEvidence: boolean;
  canExport: boolean;
}

export default function DashboardActions({
  companyId,
  canGenerateReports,
  canViewEvidence,
  canExport,
}: DashboardActionsProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const handleGenerateReport = () => {
    setShowMenu(false);
    setShowReportModal(true);
  };

  const handleReportGenerated = (reportId: string) => {
    console.log('[DashboardActions] Report generated:', reportId);
    // Could show a toast notification here
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fab-container">
        <button
          className={`fab ${showMenu ? 'active' : ''}`}
          onClick={() => setShowMenu(!showMenu)}
          aria-label="Quick actions menu"
          aria-expanded={showMenu}
        >
          {showMenu ? '×' : '+'}
        </button>

        {/* Actions Menu */}
        {showMenu && (
          <div className="fab-menu">
            {canGenerateReports && (
              <button className="fab-menu-item" onClick={handleGenerateReport}>
                <span className="icon">📊</span>
                <span className="label">Generate Report</span>
              </button>
            )}

            {canViewEvidence && (
              <a href={`./evidence`} className="fab-menu-item">
                <span className="icon">🔍</span>
                <span className="label">View Evidence</span>
              </a>
            )}

            {canExport && (
              <button className="fab-menu-item" onClick={() => alert('Export coming soon!')}>
                <span className="icon">📥</span>
                <span className="label">Export Data</span>
              </button>
            )}

            <button
              className="fab-menu-item"
              onClick={() => alert('Share feature coming soon!')}
            >
              <span className="icon">🔗</span>
              <span className="label">Share Dashboard</span>
            </button>
          </div>
        )}
      </div>

      {/* Report Generation Modal */}
      {showReportModal && (
        <ReportGenerationModal
          companyId={companyId}
          onClose={() => setShowReportModal(false)}
          onReportGenerated={handleReportGenerated}
        />
      )}

      <style>{`
        .fab-container {
          position: fixed;
          bottom: 32px;
          right: 32px;
          z-index: 1000;
        }

        .fab {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: var(--color-primary);
          color: white;
          border: none;
          font-size: 2rem;
          font-weight: 300;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }

        .fab:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }

        .fab.active {
          transform: rotate(45deg);
          background: #dc2626;
        }

        .fab-menu {
          position: absolute;
          bottom: 75px;
          right: 0;
          min-width: 200px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
          padding: 8px;
          animation: slideUp 0.2s;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .fab-menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px 16px;
          background: none;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s;
          text-decoration: none;
          color: var(--color-text);
        }

        .fab-menu-item:hover {
          background: var(--color-bg-secondary);
        }

        .fab-menu-item .icon {
          font-size: 1.25rem;
        }

        .fab-menu-item .label {
          font-size: 0.9375rem;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .fab-container {
            bottom: 16px;
            right: 16px;
          }

          .fab {
            width: 56px;
            height: 56px;
            font-size: 1.75rem;
          }

          .fab-menu {
            right: 0;
            bottom: 70px;
            min-width: 180px;
          }
        }
      `}</style>
    </>
  );
}
