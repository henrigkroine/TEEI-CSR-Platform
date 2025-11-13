import { useState } from 'react';
import GenerateReportModal from '@components/reports/GenerateReportModal';

interface DashboardActionsProps {
  companyId: string;
}

export default function DashboardActions({ companyId }: DashboardActionsProps) {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  return (
    <>
      <div className="space-y-3">
        <button
          onClick={() => setIsReportModalOpen(true)}
          className="btn-primary w-full"
        >
          Generate Report
        </button>
        <a href={`/en/cockpit/${companyId}/evidence`} className="btn-secondary w-full">
          View Evidence
        </a>
        <a href={`/en/cockpit/${companyId}/exports`} className="btn-secondary w-full">
          Export Data
        </a>
        <a href={`/en/cockpit/${companyId}/admin`} className="btn-secondary w-full">
          Admin Settings
        </a>
      </div>

      <GenerateReportModal
        companyId={companyId}
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </>
  );
}
