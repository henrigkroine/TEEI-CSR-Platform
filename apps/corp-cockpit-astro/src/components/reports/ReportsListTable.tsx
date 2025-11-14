import { useState, useEffect } from 'react';
import type { ReportListItem, ReportType, ReportStatus } from '../../types/reports';
import GenerateReportModal from './GenerateReportModal';

interface ReportsListTableProps {
  companyId: string;
  lang?: string;
}

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  quarterly: 'Quarterly',
  annual: 'Annual',
  board_presentation: 'Board',
  csrd: 'CSRD'
};

export default function ReportsListTable({ companyId, lang = 'en' }: ReportsListTableProps) {
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  
  // Filters
  const [filterType, setFilterType] = useState<ReportType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<ReportStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'type'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  useEffect(() => {
    fetchReports();
  }, [companyId, filterType, filterStatus, sortBy, sortOrder]);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        ...(filterType !== 'all' && { type: filterType }),
        ...(filterStatus !== 'all' && { status: filterStatus }),
        sortBy,
        sortOrder,
      });

      const response = await fetch(
        `/api/companies/${companyId}/gen-reports?${params}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }

      const data = await response.json();
      setReports(data.reports || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/companies/${companyId}/gen-reports/${reportId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to delete report');
      }

      fetchReports();
    } catch (err) {
      alert('Failed to delete report. Please try again.');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(lang, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatPeriod = (report: ReportListItem) => {
    const from = new Date(report.period.from);
    const to = new Date(report.period.to);
    return `${from.toLocaleDateString(lang, { month: 'short', year: 'numeric' })} - ${to.toLocaleDateString(lang, { month: 'short', year: 'numeric' })}`;
  };

  // Pagination
  const totalPages = Math.ceil(reports.length / pageSize);
  const paginatedReports = reports.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Generated Reports</h2>
          <p className="text-sm text-foreground/60 mt-1">
            View, edit, and export your AI-generated reports
          </p>
        </div>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="btn-primary"
          aria-label="Open modal to generate a new report"
        >
          + Generate New Report
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label htmlFor="filter-type" className="text-sm font-medium">
            Type:
          </label>
          <select
            id="filter-type"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as typeof filterType)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="all">All Types</option>
            {Object.keys(REPORT_TYPE_LABELS).map((type) => (
              <option key={type} value={type}>
                {REPORT_TYPE_LABELS[type as ReportType]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="filter-status" className="text-sm font-medium">
            Status:
          </label>
          <select
            id="filter-status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="final">Final</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="sort-by" className="text-sm font-medium">
            Sort:
          </label>
          <select
            id="sort-by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="date">Date</option>
            <option value="type">Type</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="btn-secondary p-2"
            aria-label={`Sort order: ${sortOrder === 'asc' ? 'Ascending, click to sort descending' : 'Descending, click to sort ascending'}`}
          >
            <span aria-hidden="true">{sortOrder === 'asc' ? '↑' : '↓'}</span>
          </button>
        </div>

        <button
          onClick={fetchReports}
          className="btn-secondary ml-auto"
          aria-label="Refresh reports list"
        >
          <span role="img" aria-label="Refresh icon">🔄</span> Refresh
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" aria-hidden="true" />
          <span className="sr-only">Loading reports...</span>
        </div>
      ) : error ? (
        <div className="rounded-md bg-red-50 p-4 text-red-600 border border-red-200" role="alert" aria-live="assertive">
          <p className="font-medium">Error loading reports</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 border border-border rounded-lg bg-border/5">
          <p className="text-lg font-medium text-foreground/60">No reports found</p>
          <p className="text-sm text-foreground/40 mt-2">
            Generate your first report to get started
          </p>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="btn-primary mt-4"
          >
            Generate Report
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-sm" role="table" aria-label="Generated reports list">
              <thead className="bg-border/10 border-b border-border">
                <tr>
                  <th scope="col" className="text-left px-4 py-3 font-semibold">Type</th>
                  <th scope="col" className="text-left px-4 py-3 font-semibold">Period</th>
                  <th scope="col" className="text-left px-4 py-3 font-semibold">Generated</th>
                  <th scope="col" className="text-left px-4 py-3 font-semibold">Status</th>
                  <th scope="col" className="text-left px-4 py-3 font-semibold">Tokens</th>
                  <th scope="col" className="text-right px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedReports.map((report) => (
                  <tr key={report.reportId} className="hover:bg-border/5">
                    <td className="px-4 py-3">
                      <span className="font-medium">
                        {REPORT_TYPE_LABELS[report.reportType]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground/80">
                      {formatPeriod(report)}
                    </td>
                    <td className="px-4 py-3 text-foreground/80">
                      {formatDate(report.generatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`
                        inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                        ${report.status === 'final'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-200'
                        }
                      `}>
                        {report.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground/60">
                      {report.tokensUsed.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/${lang}/cockpit/${companyId}/reports/${report.reportId}`}
                          className="text-primary hover:text-primary/80 font-medium"
                          aria-label={`View ${REPORT_TYPE_LABELS[report.reportType]} report for ${formatPeriod(report)}`}
                        >
                          View
                        </a>
                        {report.status === 'draft' && (
                          <a
                            href={`/${lang}/cockpit/${companyId}/reports/${report.reportId}/edit`}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                            aria-label={`Edit ${REPORT_TYPE_LABELS[report.reportType]} report for ${formatPeriod(report)}`}
                          >
                            Edit
                          </a>
                        )}
                        <button
                          onClick={() => handleDelete(report.reportId)}
                          className="text-red-600 hover:text-red-700 font-medium"
                          aria-label={`Delete ${REPORT_TYPE_LABELS[report.reportType]} report for ${formatPeriod(report)}`}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-foreground/60">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, reports.length)} of {reports.length} reports
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn-secondary"
                >
                  Previous
                </button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="btn-secondary"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Generate Modal */}
      {showGenerateModal && (
        <GenerateReportModal
          companyId={companyId}
          isOpen={showGenerateModal}
          onClose={() => {
            setShowGenerateModal(false);
            fetchReports(); // Refresh list after generating
          }}
          lang={lang}
        />
      )}
    </div>
  );
}
