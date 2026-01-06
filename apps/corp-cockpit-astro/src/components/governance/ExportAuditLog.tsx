/**
 * Export Audit Log Component
 *
 * Complete audit trail of all data exports with user identity, IP address, timestamps,
 * approval records, file size, and download count. Filters and search capabilities included.
 *
 * @module components/governance/ExportAuditLog
 */

import React, { useState, useEffect } from 'react';

interface ExportAuditLogProps {
  companyId: string;
}

type ExportFormat = 'PDF' | 'PPTX' | 'CSV' | 'JSON' | 'HTML';
type ExportDataScope = 'report' | 'evidence' | 'user_data' | 'audit_log' | 'dashboard' | 'full_export';

interface ExportLogEntry {
  id: string;
  export_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  export_type: ExportFormat;
  data_scope: ExportDataScope;
  resource_id?: string;
  resource_name?: string;
  timestamp: string;
  approval_id?: string;
  approval_status?: 'approved' | 'pending' | 'rejected';
  ip_address: string;
  user_agent: string;
  file_size: number;
  download_count: number;
  status: 'success' | 'failed';
}

export default function ExportAuditLog({ companyId }: ExportAuditLogProps) {
  const [logs, setLogs] = useState<ExportLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ExportFormat | 'all'>('all');
  const [filterScope, setFilterScope] = useState<ExportDataScope | 'all'>('all');
  const [filterApprovalStatus, setFilterApprovalStatus] = useState<'approved' | 'pending' | 'rejected' | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedLog, setSelectedLog] = useState<ExportLogEntry | null>(null);

  useEffect(() => {
    fetchExportLogs();
  }, [companyId]);

  async function fetchExportLogs() {
    try {
      // TODO: GET /governance/exports/audit?companyId=X
      // For now, use mock data
      const mockLogs = getMockExportLogs(companyId);
      setLogs(mockLogs);
    } catch (error) {
      console.error('Failed to fetch export logs:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleExportAuditLog() {
    const csv = convertToCSV(filteredLogs);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export-audit-log-${companyId}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Apply filters
  let filteredLogs = logs;

  // Search filter
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredLogs = filteredLogs.filter(
      (log) =>
        log.export_id.toLowerCase().includes(query) ||
        log.user_name.toLowerCase().includes(query) ||
        log.user_email.toLowerCase().includes(query) ||
        log.resource_name?.toLowerCase().includes(query) ||
        log.ip_address.includes(query)
    );
  }

  // Type filter
  if (filterType !== 'all') {
    filteredLogs = filteredLogs.filter((log) => log.export_type === filterType);
  }

  // Scope filter
  if (filterScope !== 'all') {
    filteredLogs = filteredLogs.filter((log) => log.data_scope === filterScope);
  }

  // Approval status filter
  if (filterApprovalStatus !== 'all') {
    filteredLogs = filteredLogs.filter((log) => log.approval_status === filterApprovalStatus);
  }

  // Date range filter
  if (dateFrom) {
    const fromDate = new Date(dateFrom).getTime();
    filteredLogs = filteredLogs.filter((log) => new Date(log.timestamp).getTime() >= fromDate);
  }

  if (dateTo) {
    const toDate = new Date(dateTo).getTime() + 24 * 60 * 60 * 1000;
    filteredLogs = filteredLogs.filter((log) => new Date(log.timestamp).getTime() < toDate);
  }

  // Sort by timestamp (newest first)
  filteredLogs = [...filteredLogs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (loading) {
    return <div className="export-audit-log loading">Loading export audit log...</div>;
  }

  return (
    <div className="export-audit-log">
      {/* Summary Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <h4>Total Exports</h4>
          <p className="stat-value">{logs.length}</p>
        </div>
        <div className="stat-card">
          <h4>Last 7 Days</h4>
          <p className="stat-value">
            {logs.filter((l) => new Date(l.timestamp).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000).length}
          </p>
        </div>
        <div className="stat-card">
          <h4>Total Data Exported</h4>
          <p className="stat-value">{formatFileSize(getTotalSize(logs))}</p>
        </div>
        <div className="stat-card">
          <h4>Failed Exports</h4>
          <p className="stat-value">{logs.filter((l) => l.status === 'failed').length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-panel">
        <div className="filter-row">
          <div className="filter-field">
            <label>Search:</label>
            <input
              type="text"
              placeholder="Export ID, user, IP, or resource..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-field">
            <label>Export Type:</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)}>
              <option value="all">All Types</option>
              <option value="PDF">PDF</option>
              <option value="PPTX">PPTX</option>
              <option value="CSV">CSV</option>
              <option value="JSON">JSON</option>
              <option value="HTML">HTML</option>
            </select>
          </div>

          <div className="filter-field">
            <label>Data Scope:</label>
            <select value={filterScope} onChange={(e) => setFilterScope(e.target.value as any)}>
              <option value="all">All Scopes</option>
              <option value="report">Report</option>
              <option value="evidence">Evidence</option>
              <option value="user_data">User Data</option>
              <option value="audit_log">Audit Log</option>
              <option value="dashboard">Dashboard</option>
              <option value="full_export">Full Export</option>
            </select>
          </div>

          <div className="filter-field">
            <label>Approval Status:</label>
            <select value={filterApprovalStatus} onChange={(e) => setFilterApprovalStatus(e.target.value as any)}>
              <option value="all">All</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="filter-row">
          <div className="filter-field">
            <label>From Date:</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>

          <div className="filter-field">
            <label>To Date:</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>

          <div className="filter-actions">
            <button className="btn-export" onClick={handleExportAuditLog}>
              Export Audit Log (CSV)
            </button>
            {(searchQuery ||
              filterType !== 'all' ||
              filterScope !== 'all' ||
              filterApprovalStatus !== 'all' ||
              dateFrom ||
              dateTo) && (
              <button
                className="btn-clear"
                onClick={() => {
                  setSearchQuery('');
                  setFilterType('all');
                  setFilterScope('all');
                  setFilterApprovalStatus('all');
                  setDateFrom('');
                  setDateTo('');
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      {filteredLogs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h4>No export logs found</h4>
          <p>No exports match your current filters.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Export ID</th>
                <th>Timestamp</th>
                <th>User</th>
                <th>Type</th>
                <th>Data Scope</th>
                <th>Resource</th>
                <th>Size</th>
                <th>IP Address</th>
                <th>Approval</th>
                <th>Downloads</th>
                <th>Status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className={log.status === 'failed' ? 'failed-row' : ''}>
                  <td className="id-cell">{log.export_id}</td>
                  <td className="date-cell">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="user-cell">
                    <div className="user-name">{log.user_name}</div>
                    <div className="user-email">{log.user_email}</div>
                  </td>
                  <td>
                    <span className={`type-badge type-${log.export_type.toLowerCase()}`}>
                      {log.export_type}
                    </span>
                  </td>
                  <td>
                    <span className="scope-badge">{formatDataScope(log.data_scope)}</span>
                  </td>
                  <td className="resource-cell">
                    {log.resource_name || <span className="no-resource">N/A</span>}
                  </td>
                  <td className="size-cell">{formatFileSize(log.file_size)}</td>
                  <td className="ip-cell">{log.ip_address}</td>
                  <td>
                    {log.approval_id ? (
                      <a
                        href={`#approval-${log.approval_id}`}
                        className={`approval-link ${log.approval_status}`}
                        title="View approval record"
                      >
                        {log.approval_id}
                      </a>
                    ) : (
                      <span className="no-approval">-</span>
                    )}
                  </td>
                  <td className="downloads-cell">{log.download_count}</td>
                  <td>
                    <span className={`status-badge ${log.status}`}>
                      {log.status === 'success' ? '✓' : '✗'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-details"
                      onClick={() => setSelectedLog(log)}
                      title="View full details"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Details Modal */}
      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Export Details: {selectedLog.export_id}</h3>
              <button className="btn-close" onClick={() => setSelectedLog(null)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="details-grid">
                <div className="detail-group">
                  <h4>Export Information</h4>
                  <div className="detail-item">
                    <span className="detail-label">Export ID:</span>
                    <span className="detail-value">{selectedLog.export_id}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Timestamp:</span>
                    <span className="detail-value">{new Date(selectedLog.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Type:</span>
                    <span className="detail-value">{selectedLog.export_type}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Data Scope:</span>
                    <span className="detail-value">{formatDataScope(selectedLog.data_scope)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">File Size:</span>
                    <span className="detail-value">{formatFileSize(selectedLog.file_size)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Download Count:</span>
                    <span className="detail-value">{selectedLog.download_count}</span>
                  </div>
                </div>

                <div className="detail-group">
                  <h4>User Information</h4>
                  <div className="detail-item">
                    <span className="detail-label">User ID:</span>
                    <span className="detail-value">{selectedLog.user_id}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Name:</span>
                    <span className="detail-value">{selectedLog.user_name}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Email:</span>
                    <span className="detail-value">{selectedLog.user_email}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">IP Address:</span>
                    <span className="detail-value">{selectedLog.ip_address}</span>
                  </div>
                </div>

                <div className="detail-group">
                  <h4>Resource & Approval</h4>
                  <div className="detail-item">
                    <span className="detail-label">Resource ID:</span>
                    <span className="detail-value">{selectedLog.resource_id || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Resource Name:</span>
                    <span className="detail-value">{selectedLog.resource_name || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Approval ID:</span>
                    <span className="detail-value">{selectedLog.approval_id || 'No approval required'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Approval Status:</span>
                    <span className="detail-value">{selectedLog.approval_status || 'N/A'}</span>
                  </div>
                </div>

                <div className="detail-group">
                  <h4>Technical Details</h4>
                  <div className="detail-item">
                    <span className="detail-label">User Agent:</span>
                    <span className="detail-value mono">{selectedLog.user_agent}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Status:</span>
                    <span className="detail-value">{selectedLog.status}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-close-modal" onClick={() => setSelectedLog(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .export-audit-log {
          background: white;
        }

        .loading {
          padding: 40px;
          text-align: center;
          color: #6b7280;
          font-size: 1rem;
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: #f9fafb;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
        }

        .stat-card h4 {
          margin: 0 0 8px 0;
          font-size: 0.875rem;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-value {
          margin: 0;
          font-size: 2rem;
          font-weight: 700;
          color: #111827;
        }

        /* Filters */
        .filter-panel {
          background: #f9fafb;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 24px;
        }

        .filter-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 16px;
          align-items: end;
        }

        .filter-row:last-child {
          margin-bottom: 0;
        }

        .filter-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .filter-field label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #6b7280;
        }

        .filter-field input,
        .filter-field select {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          font-size: 0.875rem;
        }

        .filter-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .btn-export,
        .btn-clear {
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-export {
          background: #22c55e;
          color: white;
        }

        .btn-export:hover {
          background: #16a34a;
        }

        .btn-clear {
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .btn-clear:hover {
          background: #e5e7eb;
        }

        /* Table */
        .table-wrapper {
          overflow-x: auto;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }

        .audit-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        .audit-table thead {
          background: #f9fafb;
          border-bottom: 2px solid #e5e7eb;
        }

        .audit-table th {
          padding: 12px;
          text-align: left;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
        }

        .audit-table td {
          padding: 12px;
          border-bottom: 1px solid #f3f4f6;
        }

        .audit-table tbody tr:hover {
          background: #f9fafb;
        }

        .audit-table tbody tr.failed-row {
          background: #fee2e2;
        }

        .id-cell {
          font-family: 'Courier New', monospace;
          font-size: 0.75rem;
          color: #6b7280;
          font-weight: 600;
        }

        .date-cell {
          font-family: 'Courier New', monospace;
          font-size: 0.75rem;
          color: #6b7280;
          white-space: nowrap;
        }

        .user-cell {
          min-width: 180px;
        }

        .user-name {
          font-weight: 600;
          color: #111827;
        }

        .user-email {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .type-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 700;
          white-space: nowrap;
        }

        .type-badge.type-pdf {
          background: #fee2e2;
          color: #991b1b;
        }

        .type-badge.type-pptx {
          background: #fef3c7;
          color: #92400e;
        }

        .type-badge.type-csv {
          background: #d1fae5;
          color: #065f46;
        }

        .type-badge.type-json {
          background: #dbeafe;
          color: #1e40af;
        }

        .type-badge.type-html {
          background: #e0e7ff;
          color: #3730a3;
        }

        .scope-badge {
          padding: 4px 8px;
          background: #f3f4f6;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: capitalize;
          white-space: nowrap;
        }

        .resource-cell {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .no-resource {
          color: #9ca3af;
          font-style: italic;
        }

        .size-cell {
          font-family: 'Courier New', monospace;
          color: #6b7280;
          white-space: nowrap;
        }

        .ip-cell {
          font-family: 'Courier New', monospace;
          color: #6b7280;
          font-size: 0.75rem;
        }

        .approval-link {
          color: #3b82f6;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.75rem;
          font-family: 'Courier New', monospace;
        }

        .approval-link:hover {
          text-decoration: underline;
        }

        .approval-link.approved {
          color: #059669;
        }

        .approval-link.pending {
          color: #f59e0b;
        }

        .approval-link.rejected {
          color: #dc2626;
        }

        .no-approval {
          color: #9ca3af;
          font-style: italic;
        }

        .downloads-cell {
          text-align: center;
          font-weight: 600;
        }

        .status-badge {
          display: inline-block;
          width: 24px;
          height: 24px;
          line-height: 24px;
          text-align: center;
          border-radius: 50%;
          font-weight: 700;
        }

        .status-badge.success {
          background: #d1fae5;
          color: #065f46;
        }

        .status-badge.failed {
          background: #fee2e2;
          color: #991b1b;
        }

        .btn-details {
          padding: 4px 12px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-details:hover {
          background: #2563eb;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          max-width: 1000px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 1.25rem;
        }

        .btn-close {
          width: 32px;
          height: 32px;
          border: none;
          background: #f3f4f6;
          border-radius: 4px;
          font-size: 1.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-close:hover {
          background: #e5e7eb;
        }

        .modal-body {
          padding: 24px;
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
        }

        .detail-group {
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 16px;
          background: #f9fafb;
        }

        .detail-group h4 {
          margin: 0 0 16px 0;
          font-size: 0.875rem;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 12px;
        }

        .detail-item:last-child {
          margin-bottom: 0;
        }

        .detail-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .detail-value {
          font-size: 0.9375rem;
          color: #111827;
          word-break: break-word;
        }

        .detail-value.mono {
          font-family: 'Courier New', monospace;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .modal-footer {
          padding: 24px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: flex-end;
        }

        .btn-close-modal {
          padding: 10px 24px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-close-modal:hover {
          background: #2563eb;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: #f9fafb;
          border-radius: 8px;
          border: 2px dashed #e5e7eb;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 16px;
        }

        .empty-state h4 {
          margin: 0 0 8px 0;
          font-size: 1.25rem;
          color: #111827;
        }

        .empty-state p {
          margin: 0;
          color: #6b7280;
          font-size: 0.9375rem;
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: 1fr 1fr;
          }

          .filter-row {
            grid-template-columns: 1fr;
          }

          .audit-table {
            font-size: 0.75rem;
          }

          .audit-table th,
          .audit-table td {
            padding: 8px;
          }

          .details-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Helper functions
 */
function formatDataScope(scope: ExportDataScope): string {
  const labels: Record<ExportDataScope, string> = {
    report: 'Report',
    evidence: 'Evidence',
    user_data: 'User Data',
    audit_log: 'Audit Log',
    dashboard: 'Dashboard',
    full_export: 'Full Export',
  };
  return labels[scope];
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getTotalSize(logs: ExportLogEntry[]): number {
  return logs.reduce((sum, log) => sum + log.file_size, 0);
}

function convertToCSV(logs: ExportLogEntry[]): string {
  const headers = [
    'Export ID',
    'Timestamp',
    'User ID',
    'User Name',
    'User Email',
    'Type',
    'Data Scope',
    'Resource ID',
    'Resource Name',
    'IP Address',
    'User Agent',
    'File Size (bytes)',
    'Download Count',
    'Approval ID',
    'Approval Status',
    'Status',
  ];

  const rows = logs.map((log) => [
    log.export_id,
    log.timestamp,
    log.user_id,
    log.user_name,
    log.user_email,
    log.export_type,
    log.data_scope,
    log.resource_id || '',
    log.resource_name || '',
    log.ip_address,
    log.user_agent,
    log.file_size.toString(),
    log.download_count.toString(),
    log.approval_id || '',
    log.approval_status || '',
    log.status,
  ]);

  return [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');
}

/**
 * Mock data function (replace with real API call to Worker 2)
 * GET /governance/exports/audit?companyId=X
 */
function getMockExportLogs(companyId: string): ExportLogEntry[] {
  const now = Date.now();
  const logs: ExportLogEntry[] = [];

  const types: ExportFormat[] = ['PDF', 'PPTX', 'CSV', 'JSON', 'HTML'];
  const scopes: ExportDataScope[] = [
    'report',
    'evidence',
    'user_data',
    'audit_log',
    'dashboard',
    'full_export',
  ];
  const users = [
    { id: 'U001', name: 'Alice Johnson', email: 'alice.j@example.com' },
    { id: 'U002', name: 'Bob Smith', email: 'bob.s@example.com' },
    { id: 'U003', name: 'Carol Davis', email: 'carol.d@example.com' },
    { id: 'U004', name: 'David Lee', email: 'david.l@example.com' },
  ];

  for (let i = 1; i <= 30; i++) {
    const daysSinceExport = Math.floor(Math.random() * 60);
    const user = users[Math.floor(Math.random() * users.length)];
    const hasApproval = Math.random() > 0.3;
    const status: 'success' | 'failed' = Math.random() > 0.1 ? 'success' : 'failed';

    logs.push({
      id: `log-${i.toString().padStart(3, '0')}`,
      export_id: `EXP-${new Date().getFullYear()}-${i.toString().padStart(5, '0')}`,
      user_id: user.id,
      user_name: user.name,
      user_email: user.email,
      export_type: types[Math.floor(Math.random() * types.length)],
      data_scope: scopes[Math.floor(Math.random() * scopes.length)],
      resource_id: i % 2 === 0 ? `RES-${i.toString().padStart(4, '0')}` : undefined,
      resource_name: i % 2 === 0 ? `Resource ${i}` : undefined,
      timestamp: new Date(now - daysSinceExport * 24 * 60 * 60 * 1000).toISOString(),
      approval_id: hasApproval ? `APR-${i.toString().padStart(4, '0')}` : undefined,
      approval_status: hasApproval
        ? (['approved', 'pending', 'rejected'] as const)[Math.floor(Math.random() * 3)]
        : undefined,
      ip_address: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      file_size: Math.floor(Math.random() * 10000000) + 100000, // 100KB to 10MB
      download_count: Math.floor(Math.random() * 5),
      status,
    });
  }

  return logs;
}
