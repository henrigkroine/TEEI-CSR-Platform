/**
 * Export Logs Viewer Component
 *
 * Displays audit trail of all data exports. Shows who exported what data, when, and why.
 * Supports filtering by user, date range, and data type. Admin only.
 *
 * @module components/governance/ExportLogsViewer
 */

import React, { useState, useEffect } from 'react';

interface ExportLogsViewerProps {
  companyId: string;
}

type ExportFormat = 'PDF' | 'PPTX' | 'CSV' | 'JSON' | 'HTML';
type ExportDataType =
  | 'report'
  | 'evidence'
  | 'user_data'
  | 'audit_log'
  | 'system_config'
  | 'dashboard';

interface ExportLogEntry {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_role: string;
  export_type: ExportDataType;
  export_format: ExportFormat;
  resource_id?: string;
  resource_name?: string;
  file_size: number;
  timestamp: string;
  ip_address: string;
  user_agent: string;
  reason?: string;
  status: 'success' | 'failed';
}

export default function ExportLogsViewer({ companyId }: ExportLogsViewerProps) {
  const [logs, setLogs] = useState<ExportLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ExportDataType | 'all'>('all');
  const [filterFormat, setFilterFormat] = useState<ExportFormat | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchExportLogs();
  }, [companyId]);

  async function fetchExportLogs() {
    try {
      // TODO: Fetch from Worker-2 audit tables
      // For now, use mock data
      const mockLogs = getMockExportLogs();
      setLogs(mockLogs);
    } catch (error) {
      console.error('Failed to fetch export logs:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleExportAuditLog() {
    // Export audit log to CSV
    const csv = convertLogsToCSV(filteredLogs);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export-audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    // Log this export action (meta-audit!)
    console.log('Audit log exported:', {
      company_id: companyId,
      timestamp: new Date().toISOString(),
      filtered_count: filteredLogs.length,
    });
  }

  // Apply filters
  let filteredLogs = logs;

  // Search filter (user name, email, resource name)
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredLogs = filteredLogs.filter(
      (log) =>
        log.user_name.toLowerCase().includes(query) ||
        log.user_email.toLowerCase().includes(query) ||
        log.resource_name?.toLowerCase().includes(query)
    );
  }

  // Type filter
  if (filterType !== 'all') {
    filteredLogs = filteredLogs.filter((log) => log.export_type === filterType);
  }

  // Format filter
  if (filterFormat !== 'all') {
    filteredLogs = filteredLogs.filter((log) => log.export_format === filterFormat);
  }

  // Date range filter
  if (dateFrom) {
    const fromDate = new Date(dateFrom).getTime();
    filteredLogs = filteredLogs.filter((log) => new Date(log.timestamp).getTime() >= fromDate);
  }

  if (dateTo) {
    const toDate = new Date(dateTo).getTime() + 24 * 60 * 60 * 1000; // Include end date
    filteredLogs = filteredLogs.filter((log) => new Date(log.timestamp).getTime() < toDate);
  }

  // Sort by timestamp (newest first)
  filteredLogs = [...filteredLogs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (loading) {
    return <div className="export-logs loading">Loading export logs...</div>;
  }

  return (
    <div className="export-logs">
      {/* Header */}
      <div className="logs-header">
        <div>
          <h3>Export Audit Trail</h3>
          <p className="subtitle">
            Complete record of all data exports. Retained for compliance and security monitoring.
          </p>
        </div>
        <button className="btn-export" onClick={handleExportAuditLog}>
          Export Audit Log (CSV)
        </button>
      </div>

      {/* Compliance Notice */}
      <div className="compliance-notice">
        <strong>Audit Log Retention</strong>
        <p>
          Export logs are retained for 7 years to comply with SOC 2, GDPR, and regulatory
          requirements. All export actions are logged with user identity, IP address, and
          timestamp. Logs are immutable and tamper-evident.
        </p>
      </div>

      {/* Filters */}
      <div className="filter-panel">
        <div className="filter-row">
          <div className="filter-field">
            <label>Search:</label>
            <input
              type="text"
              placeholder="User name, email, or resource..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-field">
            <label>Data Type:</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)}>
              <option value="all">All Types</option>
              <option value="report">Reports</option>
              <option value="evidence">Evidence</option>
              <option value="user_data">User Data</option>
              <option value="audit_log">Audit Logs</option>
              <option value="system_config">System Config</option>
              <option value="dashboard">Dashboards</option>
            </select>
          </div>

          <div className="filter-field">
            <label>Format:</label>
            <select value={filterFormat} onChange={(e) => setFilterFormat(e.target.value as any)}>
              <option value="all">All Formats</option>
              <option value="PDF">PDF</option>
              <option value="PPTX">PPTX</option>
              <option value="CSV">CSV</option>
              <option value="JSON">JSON</option>
              <option value="HTML">HTML</option>
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

          <div className="filter-stats">
            <span className="stat">
              <strong>{filteredLogs.length}</strong> exports
            </span>
            <span className="stat">
              <strong>{formatFileSize(getTotalSize(filteredLogs))}</strong> total
            </span>
          </div>
        </div>

        {(searchQuery || filterType !== 'all' || filterFormat !== 'all' || dateFrom || dateTo) && (
          <button
            className="btn-clear-filters"
            onClick={() => {
              setSearchQuery('');
              setFilterType('all');
              setFilterFormat('all');
              setDateFrom('');
              setDateTo('');
            }}
          >
            Clear All Filters
          </button>
        )}
      </div>

      {/* Logs Table */}
      {filteredLogs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h4>No exports found</h4>
          <p>No export logs match your current filters.</p>
        </div>
      ) : (
        <div className="logs-table-wrapper">
          <table className="logs-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Role</th>
                <th>Data Type</th>
                <th>Resource</th>
                <th>Format</th>
                <th>Size</th>
                <th>IP Address</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className={log.status === 'failed' ? 'failed-export' : ''}>
                  <td className="timestamp">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="user-cell">
                    <div className="user-info">
                      <span className="user-name">{log.user_name}</span>
                      <span className="user-email">{log.user_email}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`role-badge ${log.user_role.toLowerCase()}`}>
                      {log.user_role}
                    </span>
                  </td>
                  <td>
                    <span className="type-badge">{getTypeLabel(log.export_type)}</span>
                  </td>
                  <td className="resource-cell">
                    {log.resource_name || <span className="no-resource">N/A</span>}
                    {log.resource_id && (
                      <span className="resource-id" title={log.resource_id}>
                        ({log.resource_id.substring(0, 8)}...)
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`format-badge format-${log.export_format.toLowerCase()}`}>
                      {log.export_format}
                    </span>
                  </td>
                  <td className="size-cell">{formatFileSize(log.file_size)}</td>
                  <td className="ip-cell">{log.ip_address}</td>
                  <td>
                    <span className={`status-badge ${log.status}`}>
                      {log.status === 'success' ? '✓' : '✗'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        .export-logs {
          background: white;
        }

        .logs-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px solid #e5e7eb;
        }

        .logs-header h3 {
          margin: 0 0 8px 0;
          font-size: 1.5rem;
          color: #111827;
        }

        .subtitle {
          margin: 0;
          color: #6b7280;
          font-size: 0.9375rem;
        }

        .compliance-notice {
          background: #fef3c7;
          border: 1px solid #fcd34d;
          border-left: 4px solid #f59e0b;
          padding: 16px;
          border-radius: 6px;
          margin-bottom: 24px;
        }

        .compliance-notice strong {
          display: block;
          margin-bottom: 8px;
          color: #92400e;
          font-size: 0.9375rem;
        }

        .compliance-notice p {
          margin: 0;
          color: #78350f;
          line-height: 1.6;
          font-size: 0.9375rem;
        }

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

        .filter-field input:focus,
        .filter-field select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .filter-stats {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 8px;
          padding: 8px 0;
        }

        .stat {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .stat strong {
          color: #111827;
          font-size: 1rem;
        }

        .btn-export,
        .btn-clear-filters {
          padding: 10px 20px;
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

        .btn-clear-filters {
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
          width: 100%;
        }

        .btn-clear-filters:hover {
          background: #e5e7eb;
        }

        .logs-table-wrapper {
          overflow-x: auto;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }

        .logs-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        .logs-table thead {
          background: #f9fafb;
          border-bottom: 2px solid #e5e7eb;
        }

        .logs-table th {
          padding: 12px;
          text-align: left;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
        }

        .logs-table td {
          padding: 12px;
          border-bottom: 1px solid #f3f4f6;
        }

        .logs-table tbody tr:hover {
          background: #f9fafb;
        }

        .logs-table tbody tr.failed-export {
          background: #fee2e2;
        }

        .logs-table tbody tr.failed-export:hover {
          background: #fecaca;
        }

        .timestamp {
          font-family: 'Courier New', monospace;
          color: #6b7280;
          white-space: nowrap;
        }

        .user-cell {
          min-width: 180px;
        }

        .user-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .user-name {
          font-weight: 600;
          color: #111827;
        }

        .user-email {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .role-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .role-badge.super_admin {
          background: #fef3c7;
          color: #92400e;
        }

        .role-badge.admin {
          background: #dbeafe;
          color: #1e40af;
        }

        .role-badge.manager {
          background: #e0e7ff;
          color: #3730a3;
        }

        .role-badge.viewer {
          background: #f3f4f6;
          color: #374151;
        }

        .type-badge {
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

        .resource-id {
          color: #6b7280;
          font-size: 0.75rem;
          margin-left: 4px;
        }

        .no-resource {
          color: #9ca3af;
          font-style: italic;
        }

        .format-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 700;
          white-space: nowrap;
        }

        .format-badge.format-pdf {
          background: #fee2e2;
          color: #991b1b;
        }

        .format-badge.format-pptx {
          background: #fef3c7;
          color: #92400e;
        }

        .format-badge.format-csv {
          background: #d1fae5;
          color: #065f46;
        }

        .format-badge.format-json {
          background: #dbeafe;
          color: #1e40af;
        }

        .format-badge.format-html {
          background: #e0e7ff;
          color: #3730a3;
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

        .loading {
          padding: 40px;
          text-align: center;
          color: #6b7280;
          font-size: 1rem;
        }

        @media (max-width: 768px) {
          .logs-header {
            flex-direction: column;
            gap: 16px;
          }

          .btn-export {
            width: 100%;
          }

          .filter-row {
            grid-template-columns: 1fr;
          }

          .logs-table {
            font-size: 0.75rem;
          }

          .logs-table th,
          .logs-table td {
            padding: 8px;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Helper functions
 */
function getTypeLabel(type: ExportDataType): string {
  const labels: Record<ExportDataType, string> = {
    report: 'Report',
    evidence: 'Evidence',
    user_data: 'User Data',
    audit_log: 'Audit Log',
    system_config: 'System Config',
    dashboard: 'Dashboard',
  };
  return labels[type];
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

function convertLogsToCSV(logs: ExportLogEntry[]): string {
  const headers = [
    'Timestamp',
    'User Name',
    'User Email',
    'User Role',
    'Data Type',
    'Resource Name',
    'Resource ID',
    'Format',
    'File Size (bytes)',
    'IP Address',
    'User Agent',
    'Status',
    'Reason',
  ];

  const rows = logs.map((log) => [
    log.timestamp,
    log.user_name,
    log.user_email,
    log.user_role,
    log.export_type,
    log.resource_name || '',
    log.resource_id || '',
    log.export_format,
    log.file_size.toString(),
    log.ip_address,
    log.user_agent,
    log.status,
    log.reason || '',
  ]);

  return [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');
}

/**
 * Mock data function (replace with real API call to Worker-2)
 */
function getMockExportLogs(): ExportLogEntry[] {
  const now = Date.now();
  return [
    {
      id: 'export-001',
      user_id: 'user-123',
      user_name: 'Sarah Johnson',
      user_email: 'sarah.johnson@example.com',
      user_role: 'ADMIN',
      export_type: 'report',
      export_format: 'PDF',
      resource_id: 'report-456',
      resource_name: 'Q3 2024 ESG Report',
      file_size: 2457600,
      timestamp: new Date(now - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      status: 'success',
    },
    {
      id: 'export-002',
      user_id: 'user-456',
      user_name: 'Michael Chen',
      user_email: 'michael.chen@example.com',
      user_role: 'MANAGER',
      export_type: 'evidence',
      export_format: 'JSON',
      resource_id: 'evidence-789',
      resource_name: 'Carbon Emission Data - Facility A',
      file_size: 512000,
      timestamp: new Date(now - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
      ip_address: '192.168.1.105',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      status: 'success',
    },
    {
      id: 'export-003',
      user_id: 'user-789',
      user_name: 'Emily Davis',
      user_email: 'emily.davis@example.com',
      user_role: 'SUPER_ADMIN',
      export_type: 'user_data',
      export_format: 'CSV',
      resource_name: 'All Users - Company Export',
      file_size: 1024000,
      timestamp: new Date(now - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      ip_address: '192.168.1.110',
      user_agent: 'Mozilla/5.0 (X11; Linux x86_64)',
      reason: 'Quarterly audit compliance export',
      status: 'success',
    },
    {
      id: 'export-004',
      user_id: 'user-123',
      user_name: 'Sarah Johnson',
      user_email: 'sarah.johnson@example.com',
      user_role: 'ADMIN',
      export_type: 'report',
      export_format: 'PPTX',
      resource_id: 'report-456',
      resource_name: 'Q3 2024 ESG Report - Executive Summary',
      file_size: 3145728,
      timestamp: new Date(now - 26 * 60 * 60 * 1000).toISOString(), // 26 hours ago
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      status: 'success',
    },
    {
      id: 'export-005',
      user_id: 'user-999',
      user_name: 'Alex Martinez',
      user_email: 'alex.martinez@example.com',
      user_role: 'VIEWER',
      export_type: 'dashboard',
      export_format: 'HTML',
      resource_id: 'dashboard-123',
      resource_name: 'CSR Overview Dashboard',
      file_size: 204800,
      timestamp: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      ip_address: '10.0.0.50',
      user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
      status: 'success',
    },
    {
      id: 'export-006',
      user_id: 'user-789',
      user_name: 'Emily Davis',
      user_email: 'emily.davis@example.com',
      user_role: 'SUPER_ADMIN',
      export_type: 'audit_log',
      export_format: 'JSON',
      resource_name: 'Full Audit Trail - September 2024',
      file_size: 5242880,
      timestamp: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      ip_address: '192.168.1.110',
      user_agent: 'Mozilla/5.0 (X11; Linux x86_64)',
      reason: 'SOC 2 compliance audit',
      status: 'success',
    },
    {
      id: 'export-007',
      user_id: 'user-456',
      user_name: 'Michael Chen',
      user_email: 'michael.chen@example.com',
      user_role: 'MANAGER',
      export_type: 'report',
      export_format: 'PDF',
      resource_id: 'report-999',
      resource_name: 'Invalid Report ID',
      file_size: 0,
      timestamp: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
      ip_address: '192.168.1.105',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      status: 'failed',
    },
  ];
}
