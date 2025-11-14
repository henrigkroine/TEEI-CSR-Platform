/**
 * Consent Status Viewer Component
 *
 * Read-only viewer for participant consent records from Worker 2.
 * Displays consent breakdown, search/filter capabilities, and CSV export.
 *
 * @module components/governance/ConsentStatus
 */

import React, { useState, useEffect } from 'react';

interface ConsentStatusProps {
  companyId: string;
  userId: string;
}

type ConsentType = 'opt-in' | 'opt-out' | 'pending' | 'expired';
type ConsentSource = 'manual' | 'imported' | 'api' | 'system';
type ConsentStatus = 'active' | 'expired' | 'withdrawn' | 'pending';

interface ConsentRecord {
  id: string;
  participant_id: string;
  participant_name?: string;
  participant_email?: string;
  consent_type: ConsentType;
  purpose: string;
  granted_date: string;
  expires_date?: string;
  status: ConsentStatus;
  source: ConsentSource;
  version: string;
  ip_address?: string;
}

interface ConsentSummary {
  total_participants: number;
  consent_breakdown: {
    opt_in: number;
    opt_out: number;
    pending: number;
    expired: number;
  };
  source_breakdown: {
    manual: number;
    imported: number;
    api: number;
    system: number;
  };
}

export default function ConsentStatus({ companyId, userId }: ConsentStatusProps) {
  const [records, setRecords] = useState<ConsentRecord[]>([]);
  const [summary, setSummary] = useState<ConsentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ConsentType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<ConsentStatus | 'all'>('all');
  const [filterSource, setFilterSource] = useState<ConsentSource | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchConsentData();
  }, [companyId]);

  async function fetchConsentData() {
    try {
      // TODO: GET /governance/consent?companyId=X&filters
      // For now, use mock data
      const mockRecords = getMockConsentRecords(companyId);
      const mockSummary = calculateSummary(mockRecords);

      setRecords(mockRecords);
      setSummary(mockSummary);
    } catch (error) {
      console.error('Failed to fetch consent data:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleExportCSV() {
    const csv = convertToCSV(filteredRecords);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consent-records-${companyId}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Apply filters
  let filteredRecords = records;

  // Search filter
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredRecords = filteredRecords.filter(
      (record) =>
        record.participant_id.toLowerCase().includes(query) ||
        record.participant_name?.toLowerCase().includes(query) ||
        record.participant_email?.toLowerCase().includes(query) ||
        record.purpose.toLowerCase().includes(query)
    );
  }

  // Type filter
  if (filterType !== 'all') {
    filteredRecords = filteredRecords.filter((record) => record.consent_type === filterType);
  }

  // Status filter
  if (filterStatus !== 'all') {
    filteredRecords = filteredRecords.filter((record) => record.status === filterStatus);
  }

  // Source filter
  if (filterSource !== 'all') {
    filteredRecords = filteredRecords.filter((record) => record.source === filterSource);
  }

  // Date range filter
  if (dateFrom) {
    const fromDate = new Date(dateFrom).getTime();
    filteredRecords = filteredRecords.filter(
      (record) => new Date(record.granted_date).getTime() >= fromDate
    );
  }

  if (dateTo) {
    const toDate = new Date(dateTo).getTime() + 24 * 60 * 60 * 1000;
    filteredRecords = filteredRecords.filter(
      (record) => new Date(record.granted_date).getTime() < toDate
    );
  }

  if (loading) {
    return <div className="consent-status loading">Loading consent records...</div>;
  }

  return (
    <div className="consent-status">
      {/* Summary Cards */}
      {summary && (
        <div className="summary-grid">
          <div className="summary-card total">
            <h4>Total Participants</h4>
            <p className="summary-value">{summary.total_participants.toLocaleString()}</p>
            <p className="summary-label">with consent records</p>
          </div>

          <div className="summary-card breakdown">
            <h4>Consent Type Breakdown</h4>
            <div className="breakdown-bars">
              <div className="breakdown-item">
                <span className="breakdown-label">Opt-in</span>
                <div className="breakdown-bar">
                  <div
                    className="breakdown-fill opt-in"
                    style={{
                      width: `${(summary.consent_breakdown.opt_in / summary.total_participants) * 100}%`,
                    }}
                  ></div>
                </div>
                <span className="breakdown-value">{summary.consent_breakdown.opt_in}</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-label">Opt-out</span>
                <div className="breakdown-bar">
                  <div
                    className="breakdown-fill opt-out"
                    style={{
                      width: `${(summary.consent_breakdown.opt_out / summary.total_participants) * 100}%`,
                    }}
                  ></div>
                </div>
                <span className="breakdown-value">{summary.consent_breakdown.opt_out}</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-label">Pending</span>
                <div className="breakdown-bar">
                  <div
                    className="breakdown-fill pending"
                    style={{
                      width: `${(summary.consent_breakdown.pending / summary.total_participants) * 100}%`,
                    }}
                  ></div>
                </div>
                <span className="breakdown-value">{summary.consent_breakdown.pending}</span>
              </div>
            </div>
          </div>

          <div className="summary-card source">
            <h4>Consent Source</h4>
            <div className="source-list">
              <div className="source-item">
                <span className="source-label">Manual</span>
                <span className="source-value">{summary.source_breakdown.manual}</span>
              </div>
              <div className="source-item">
                <span className="source-label">Imported</span>
                <span className="source-value">{summary.source_breakdown.imported}</span>
              </div>
              <div className="source-item">
                <span className="source-label">API</span>
                <span className="source-value">{summary.source_breakdown.api}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div class="filter-panel">
        <div className="filter-row">
          <div className="filter-field">
            <label>Search:</label>
            <input
              type="text"
              placeholder="Participant ID, name, email, or purpose..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-field">
            <label>Consent Type:</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)}>
              <option value="all">All Types</option>
              <option value="opt-in">Opt-in</option>
              <option value="opt-out">Opt-out</option>
              <option value="pending">Pending</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <div className="filter-field">
            <label>Status:</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="withdrawn">Withdrawn</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div className="filter-field">
            <label>Source:</label>
            <select value={filterSource} onChange={(e) => setFilterSource(e.target.value as any)}>
              <option value="all">All Sources</option>
              <option value="manual">Manual</option>
              <option value="imported">Imported</option>
              <option value="api">API</option>
              <option value="system">System</option>
            </select>
          </div>
        </div>

        <div className="filter-row">
          <div className="filter-field">
            <label>Granted From:</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>

          <div className="filter-field">
            <label>Granted To:</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>

          <div className="filter-actions">
            <button className="btn-export" onClick={handleExportCSV}>
              Export to CSV ({filteredRecords.length} records)
            </button>
            {(searchQuery ||
              filterType !== 'all' ||
              filterStatus !== 'all' ||
              filterSource !== 'all' ||
              dateFrom ||
              dateTo) && (
              <button
                className="btn-clear"
                onClick={() => {
                  setSearchQuery('');
                  setFilterType('all');
                  setFilterStatus('all');
                  setFilterSource('all');
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

      {/* Records Table */}
      {filteredRecords.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h4>No consent records found</h4>
          <p>No records match your current filters.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="consent-table">
            <thead>
              <tr>
                <th>Participant ID</th>
                <th>Name / Email</th>
                <th>Consent Type</th>
                <th>Purpose</th>
                <th>Granted Date</th>
                <th>Expires</th>
                <th>Status</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.id}>
                  <td className="id-cell">{record.participant_id}</td>
                  <td className="participant-cell">
                    {record.participant_name && (
                      <div className="participant-name">{record.participant_name}</div>
                    )}
                    {record.participant_email && (
                      <div className="participant-email">{record.participant_email}</div>
                    )}
                    {!record.participant_name && !record.participant_email && (
                      <span className="no-info">N/A</span>
                    )}
                  </td>
                  <td>
                    <span className={`type-badge ${record.consent_type}`}>
                      {formatConsentType(record.consent_type)}
                    </span>
                  </td>
                  <td className="purpose-cell">{record.purpose}</td>
                  <td className="date-cell">{new Date(record.granted_date).toLocaleDateString()}</td>
                  <td className="date-cell">
                    {record.expires_date ? (
                      <span
                        className={
                          isExpiringSoon(record.expires_date) ? 'expires-soon' : ''
                        }
                      >
                        {new Date(record.expires_date).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="no-expiry">Never</span>
                    )}
                  </td>
                  <td>
                    <span className={`status-badge ${record.status}`}>
                      {formatStatus(record.status)}
                    </span>
                  </td>
                  <td>
                    <span className={`source-badge ${record.source}`}>
                      {formatSource(record.source)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        .consent-status {
          background: white;
        }

        .loading {
          padding: 40px;
          text-align: center;
          color: #6b7280;
          font-size: 1rem;
        }

        /* Summary Cards */
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }

        .summary-card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
        }

        .summary-card h4 {
          margin: 0 0 12px 0;
          font-size: 0.875rem;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .summary-value {
          margin: 0;
          font-size: 2.5rem;
          font-weight: 700;
          color: #111827;
          line-height: 1;
        }

        .summary-label {
          margin: 8px 0 0;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .breakdown-bars {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .breakdown-item {
          display: grid;
          grid-template-columns: 80px 1fr 60px;
          align-items: center;
          gap: 12px;
        }

        .breakdown-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
        }

        .breakdown-bar {
          height: 24px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
        }

        .breakdown-fill {
          height: 100%;
          transition: width 0.3s;
        }

        .breakdown-fill.opt-in {
          background: #22c55e;
        }

        .breakdown-fill.opt-out {
          background: #ef4444;
        }

        .breakdown-fill.pending {
          background: #f59e0b;
        }

        .breakdown-value {
          font-weight: 700;
          color: #111827;
          text-align: right;
        }

        .source-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .source-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .source-item:last-child {
          border-bottom: none;
        }

        .source-label {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .source-value {
          font-weight: 700;
          color: #111827;
          font-size: 1.125rem;
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

        .filter-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          justify-content: flex-end;
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

        .consent-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        .consent-table thead {
          background: #f9fafb;
          border-bottom: 2px solid #e5e7eb;
        }

        .consent-table th {
          padding: 12px;
          text-align: left;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
        }

        .consent-table td {
          padding: 12px;
          border-bottom: 1px solid #f3f4f6;
        }

        .consent-table tbody tr:hover {
          background: #f9fafb;
        }

        .id-cell {
          font-family: 'Courier New', monospace;
          color: #6b7280;
          font-size: 0.75rem;
        }

        .participant-cell {
          min-width: 200px;
        }

        .participant-name {
          font-weight: 600;
          color: #111827;
        }

        .participant-email {
          font-size: 0.75rem;
          color: #6b7280;
          margin-top: 2px;
        }

        .no-info {
          color: #9ca3af;
          font-style: italic;
        }

        .type-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .type-badge.opt-in {
          background: #d1fae5;
          color: #065f46;
        }

        .type-badge.opt-out {
          background: #fee2e2;
          color: #991b1b;
        }

        .type-badge.pending {
          background: #fef3c7;
          color: #92400e;
        }

        .type-badge.expired {
          background: #e5e7eb;
          color: #374151;
        }

        .purpose-cell {
          max-width: 250px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .date-cell {
          font-family: 'Courier New', monospace;
          color: #6b7280;
          white-space: nowrap;
          font-size: 0.75rem;
        }

        .expires-soon {
          color: #dc2626;
          font-weight: 600;
        }

        .no-expiry {
          color: #9ca3af;
          font-style: italic;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .status-badge.active {
          background: #d1fae5;
          color: #065f46;
        }

        .status-badge.expired {
          background: #e5e7eb;
          color: #374151;
        }

        .status-badge.withdrawn {
          background: #fee2e2;
          color: #991b1b;
        }

        .status-badge.pending {
          background: #fef3c7;
          color: #92400e;
        }

        .source-badge {
          padding: 4px 8px;
          background: #f3f4f6;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: capitalize;
          white-space: nowrap;
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

        @media (max-width: 768px) {
          .summary-grid {
            grid-template-columns: 1fr;
          }

          .filter-row {
            grid-template-columns: 1fr;
          }

          .consent-table {
            font-size: 0.75rem;
          }

          .consent-table th,
          .consent-table td {
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
function formatConsentType(type: ConsentType): string {
  const labels: Record<ConsentType, string> = {
    'opt-in': 'Opt-in',
    'opt-out': 'Opt-out',
    pending: 'Pending',
    expired: 'Expired',
  };
  return labels[type];
}

function formatStatus(status: ConsentStatus): string {
  const labels: Record<ConsentStatus, string> = {
    active: 'Active',
    expired: 'Expired',
    withdrawn: 'Withdrawn',
    pending: 'Pending',
  };
  return labels[status];
}

function formatSource(source: ConsentSource): string {
  const labels: Record<ConsentSource, string> = {
    manual: 'Manual',
    imported: 'Imported',
    api: 'API',
    system: 'System',
  };
  return labels[source];
}

function isExpiringSoon(expiresDate: string): boolean {
  const daysUntilExpiry = Math.ceil(
    (new Date(expiresDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
}

function calculateSummary(records: ConsentRecord[]): ConsentSummary {
  const summary: ConsentSummary = {
    total_participants: records.length,
    consent_breakdown: {
      opt_in: 0,
      opt_out: 0,
      pending: 0,
      expired: 0,
    },
    source_breakdown: {
      manual: 0,
      imported: 0,
      api: 0,
      system: 0,
    },
  };

  records.forEach((record) => {
    summary.consent_breakdown[record.consent_type.replace('-', '_') as keyof typeof summary.consent_breakdown]++;
    summary.source_breakdown[record.source]++;
  });

  return summary;
}

function convertToCSV(records: ConsentRecord[]): string {
  const headers = [
    'Participant ID',
    'Participant Name',
    'Participant Email',
    'Consent Type',
    'Purpose',
    'Granted Date',
    'Expires Date',
    'Status',
    'Source',
    'Version',
    'IP Address',
  ];

  const rows = records.map((record) => [
    record.participant_id,
    record.participant_name || '',
    record.participant_email || '',
    record.consent_type,
    record.purpose,
    record.granted_date,
    record.expires_date || 'Never',
    record.status,
    record.source,
    record.version,
    record.ip_address || '',
  ]);

  return [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');
}

/**
 * Mock data function (replace with real API call to Worker 2)
 * GET /governance/consent?companyId=X&filters
 */
function getMockConsentRecords(companyId: string): ConsentRecord[] {
  const now = Date.now();
  const records: ConsentRecord[] = [];

  // Generate 50 mock records
  for (let i = 1; i <= 50; i++) {
    const types: ConsentType[] = ['opt-in', 'opt-out', 'pending', 'expired'];
    const statuses: ConsentStatus[] = ['active', 'expired', 'withdrawn', 'pending'];
    const sources: ConsentSource[] = ['manual', 'imported', 'api', 'system'];

    const type = types[Math.floor(Math.random() * types.length)];
    const grantedDays = Math.floor(Math.random() * 730); // 0-2 years ago
    const expiryDays = grantedDays + 365; // 1 year after granted

    records.push({
      id: `consent-${i.toString().padStart(3, '0')}`,
      participant_id: `P${i.toString().padStart(5, '0')}`,
      participant_name: i % 3 !== 0 ? `Participant ${i}` : undefined,
      participant_email: i % 2 === 0 ? `p${i}@example.com` : undefined,
      consent_type: type,
      purpose: [
        'Analytics & Performance Monitoring',
        'Marketing Communications',
        'Essential Platform Operations',
        'Third-party Data Sharing',
        'Research & Product Development',
      ][Math.floor(Math.random() * 5)],
      granted_date: new Date(now - grantedDays * 24 * 60 * 60 * 1000).toISOString(),
      expires_date:
        type !== 'opt-out'
          ? new Date(now - expiryDays * 24 * 60 * 60 * 1000 + 730 * 24 * 60 * 60 * 1000).toISOString()
          : undefined,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      source: sources[Math.floor(Math.random() * sources.length)],
      version: '2.0',
      ip_address: i % 4 === 0 ? `192.168.1.${i}` : undefined,
    });
  }

  return records;
}
