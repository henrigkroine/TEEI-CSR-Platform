/**
 * Role Mapping Table Component
 *
 * Displays IdP claim to TEEI role mappings (read-only).
 * Shows how identity provider groups/attributes map to platform roles.
 *
 * @module components/identity/RoleMappingTable
 */

import React, { useState, useEffect } from 'react';

interface RoleMappingTableProps {
  companyId: string;
}

interface RoleMapping {
  id: string;
  idp_claim: string;
  claim_value: string;
  teei_role: 'VIEWER' | 'MANAGER' | 'ADMIN' | 'SUPER_ADMIN';
  priority: number;
  enabled: boolean;
  description?: string;
  created_at: string;
}

export default function RoleMappingTable({ companyId }: RoleMappingTableProps) {
  const [mappings, setMappings] = useState<RoleMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  useEffect(() => {
    fetchRoleMappings();
  }, [companyId]);

  async function fetchRoleMappings() {
    try {
      // TODO: Fetch from Worker-1 platform API
      // For now, use mock data
      setMappings(getMockRoleMappings());
    } catch (error) {
      console.error('Failed to fetch role mappings:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredMappings = mappings
    .filter((m) => {
      if (roleFilter !== 'all' && m.teei_role !== roleFilter) return false;
      if (filter && !m.claim_value.toLowerCase().includes(filter.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => b.priority - a.priority);

  if (loading) {
    return <div className="role-mapping-table loading">Loading role mappings...</div>;
  }

  return (
    <div className="role-mapping-table">
      {/* Filters */}
      <div className="filters">
        <input
          type="text"
          placeholder="Filter by claim value..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="filter-input"
        />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="filter-select">
          <option value="all">All Roles</option>
          <option value="VIEWER">VIEWER</option>
          <option value="MANAGER">MANAGER</option>
          <option value="ADMIN">ADMIN</option>
          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
        </select>
      </div>

      {/* Info Banner */}
      <div className="info-banner">
        <p>
          <strong>How it works:</strong> When a user logs in via SSO, their identity provider
          sends claims (attributes) about the user. These mappings automatically assign TEEI roles
          based on those claims. Higher priority mappings take precedence if multiple matches occur.
        </p>
      </div>

      {/* Mappings Table */}
      {filteredMappings.length === 0 ? (
        <div className="no-data">
          <p>No role mappings configured.</p>
          <p className="help-text">
            Contact your administrator to configure role mappings via the platform API.
          </p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="mappings-table">
            <thead>
              <tr>
                <th>Priority</th>
                <th>IdP Claim</th>
                <th>Claim Value</th>
                <th>TEEI Role</th>
                <th>Status</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {filteredMappings.map((mapping) => (
                <tr key={mapping.id} className={!mapping.enabled ? 'disabled' : ''}>
                  <td className="priority-cell">
                    <span className="priority-badge">{mapping.priority}</span>
                  </td>
                  <td className="claim-cell">
                    <code>{mapping.idp_claim}</code>
                  </td>
                  <td className="value-cell">
                    <code>{mapping.claim_value}</code>
                  </td>
                  <td className="role-cell">
                    <RoleBadge role={mapping.teei_role} />
                  </td>
                  <td className="status-cell">
                    {mapping.enabled ? (
                      <span className="status-enabled">● Enabled</span>
                    ) : (
                      <span className="status-disabled">○ Disabled</span>
                    )}
                  </td>
                  <td className="description-cell">{mapping.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="legend">
        <h4>Role Permissions</h4>
        <div className="legend-grid">
          <div className="legend-item">
            <RoleBadge role="VIEWER" />
            <p>View dashboards, reports, and evidence (read-only)</p>
          </div>
          <div className="legend-item">
            <RoleBadge role="MANAGER" />
            <p>Create drafts, submit reports for approval, manage team data</p>
          </div>
          <div className="legend-item">
            <RoleBadge role="ADMIN" />
            <p>Review reports, approve drafts, manage users, view admin console</p>
          </div>
          <div className="legend-item">
            <RoleBadge role="SUPER_ADMIN" />
            <p>Full system access, final approvals, platform configuration</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .role-mapping-table {
          background: white;
        }

        .filters {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
        }

        .filter-input {
          flex: 1;
          padding: 12px 16px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.9375rem;
          font-family: inherit;
        }

        .filter-select {
          padding: 12px 16px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.9375rem;
          font-family: inherit;
          background: white;
          cursor: pointer;
          min-width: 200px;
        }

        .info-banner {
          background: #eff6ff;
          border: 1px solid #3b82f6;
          border-radius: 6px;
          padding: 16px;
          margin-bottom: 24px;
        }

        .info-banner p {
          margin: 0;
          color: #1e3a8a;
          line-height: 1.6;
        }

        .info-banner strong {
          color: #1e40af;
        }

        .no-data {
          text-align: center;
          padding: 48px 24px;
          background: #f9fafb;
          border-radius: 8px;
        }

        .no-data p {
          margin: 8px 0;
        }

        .help-text {
          color: #6b7280;
          font-size: 0.875rem;
        }

        .table-wrapper {
          overflow-x: auto;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          margin-bottom: 24px;
        }

        .mappings-table {
          width: 100%;
          border-collapse: collapse;
        }

        .mappings-table thead {
          background: #f9fafb;
        }

        .mappings-table th {
          padding: 12px 16px;
          text-align: left;
          font-size: 0.8125rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 2px solid #e5e7eb;
        }

        .mappings-table td {
          padding: 16px;
          border-bottom: 1px solid #e5e7eb;
        }

        .mappings-table tr:last-child td {
          border-bottom: none;
        }

        .mappings-table tr.disabled {
          opacity: 0.5;
        }

        .priority-cell {
          width: 80px;
        }

        .priority-badge {
          display: inline-block;
          width: 32px;
          height: 32px;
          background: #3b82f6;
          color: white;
          border-radius: 50%;
          text-align: center;
          line-height: 32px;
          font-weight: 700;
          font-size: 0.875rem;
        }

        .claim-cell code,
        .value-cell code {
          background: #f3f4f6;
          padding: 4px 8px;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          font-size: 0.875rem;
        }

        .role-cell {
          width: 150px;
        }

        .status-cell {
          width: 120px;
        }

        .status-enabled {
          color: #059669;
          font-weight: 600;
        }

        .status-disabled {
          color: #9ca3af;
          font-weight: 600;
        }

        .description-cell {
          color: #6b7280;
          font-size: 0.875rem;
        }

        .legend {
          background: #f9fafb;
          padding: 24px;
          border-radius: 8px;
        }

        .legend h4 {
          margin-top: 0;
          margin-bottom: 16px;
        }

        .legend-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
        }

        .legend-item {
          background: white;
          padding: 16px;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
        }

        .legend-item p {
          margin: 8px 0 0;
          font-size: 0.875rem;
          color: #6b7280;
          line-height: 1.5;
        }

        @media (max-width: 768px) {
          .filters {
            flex-direction: column;
          }

          .filter-select {
            min-width: auto;
          }

          .legend-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Role Badge Component
 */
function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    VIEWER: { bg: '#e5e7eb', text: '#374151' },
    MANAGER: { bg: '#dbeafe', text: '#1e40af' },
    ADMIN: { bg: '#fef3c7', text: '#92400e' },
    SUPER_ADMIN: { bg: '#fce7f3', text: '#831843' },
  };

  const color = colors[role] || colors.VIEWER;

  return (
    <span
      className="role-badge"
      style={{ backgroundColor: color.bg, color: color.text }}
    >
      {role}
      <style jsx>{`
        .role-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.8125rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }
      `}</style>
    </span>
  );
}

/**
 * Mock data function (replace with real API call to Worker-1)
 */
function getMockRoleMappings(): RoleMapping[] {
  return [
    {
      id: '1',
      idp_claim: 'groups',
      claim_value: 'teei-super-admins',
      teei_role: 'SUPER_ADMIN',
      priority: 100,
      enabled: true,
      description: 'Platform administrators with full access',
      created_at: '2024-01-15T10:00:00Z',
    },
    {
      id: '2',
      idp_claim: 'groups',
      claim_value: 'teei-admins',
      teei_role: 'ADMIN',
      priority: 90,
      enabled: true,
      description: 'Company administrators and report reviewers',
      created_at: '2024-01-15T10:00:00Z',
    },
    {
      id: '3',
      idp_claim: 'groups',
      claim_value: 'teei-managers',
      teei_role: 'MANAGER',
      priority: 80,
      enabled: true,
      description: 'Team managers who can create and submit reports',
      created_at: '2024-01-15T10:00:00Z',
    },
    {
      id: '4',
      idp_claim: 'department',
      claim_value: 'CSR',
      teei_role: 'MANAGER',
      priority: 70,
      enabled: true,
      description: 'CSR department members auto-assigned as managers',
      created_at: '2024-02-01T10:00:00Z',
    },
    {
      id: '5',
      idp_claim: 'groups',
      claim_value: 'teei-users',
      teei_role: 'VIEWER',
      priority: 10,
      enabled: true,
      description: 'Default role for all TEEI users',
      created_at: '2024-01-15T10:00:00Z',
    },
    {
      id: '6',
      idp_claim: 'email',
      claim_value: '*@executive.company.com',
      teei_role: 'ADMIN',
      priority: 85,
      enabled: false,
      description: 'Executive email domain (currently disabled)',
      created_at: '2024-03-01T10:00:00Z',
    },
  ];
}
