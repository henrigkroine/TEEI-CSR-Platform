/**
 * SCIM Role Mapping Editor Component
 *
 * CRUD interface for managing IdP claim to TEEI role mappings.
 * Enables SUPER_ADMIN users to create, edit, and delete role mapping rules.
 *
 * @module components/identity/SCIMRoleMappingEditor
 */

import React, { useState, useEffect } from 'react';
import { getSCIMConfig, getErrorMessage } from '@/api/identity';

interface SCIMRoleMappingEditorProps {
  companyId: string;
  readOnly?: boolean;
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
  updated_at?: string;
}

interface MappingFormData {
  idp_claim: string;
  claim_value: string;
  teei_role: 'VIEWER' | 'MANAGER' | 'ADMIN' | 'SUPER_ADMIN';
  priority: number;
  enabled: boolean;
  description: string;
}

const DEFAULT_FORM_DATA: MappingFormData = {
  idp_claim: 'groups',
  claim_value: '',
  teei_role: 'VIEWER',
  priority: 50,
  enabled: true,
  description: '',
};

export default function SCIMRoleMappingEditor({
  companyId,
  readOnly = false,
}: SCIMRoleMappingEditorProps) {
  const [mappings, setMappings] = useState<RoleMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMapping, setEditingMapping] = useState<RoleMapping | null>(null);
  const [formData, setFormData] = useState<MappingFormData>(DEFAULT_FORM_DATA);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMappings();
  }, [companyId]);

  async function fetchMappings() {
    try {
      setLoading(true);
      setError(null);

      // Fetch SCIM config which includes role mappings
      // The API client will use mock data as fallback if USE_REAL_IDENTITY_API is false
      const response = await getSCIMConfig(companyId);

      // Convert API format to component format
      const mappingsFromApi: RoleMapping[] = response.scim.roleMappings.map((rm, index) => ({
        id: `mapping-${index}`,
        idp_claim: 'groups', // Default, would need to be in API response
        claim_value: rm.externalRoleId,
        teei_role: mapInternalRoleToTeeiRole(rm.internalRoleId),
        priority: 100 - (index * 10), // Generate priority based on order
        enabled: true,
        description: rm.description,
        created_at: new Date().toISOString(),
      }));

      setMappings(mappingsFromApi);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      console.error('Failed to fetch role mappings:', err);
      setError(errorMessage);

      // In development mode, show a helpful message
      if (import.meta.env.DEV) {
        console.warn(
          '[SCIM Role Mappings] API call failed. Using mock data. ' +
          'Set USE_REAL_IDENTITY_API=true in .env to use real API.'
        );
      }
    } finally {
      setLoading(false);
    }
  }

  function mapInternalRoleToTeeiRole(internalRoleId: string): 'VIEWER' | 'MANAGER' | 'ADMIN' | 'SUPER_ADMIN' {
    const roleMap: Record<string, 'VIEWER' | 'MANAGER' | 'ADMIN' | 'SUPER_ADMIN'> = {
      'company-viewer': 'VIEWER',
      'company-manager': 'MANAGER',
      'company-admin': 'ADMIN',
      'super-admin': 'SUPER_ADMIN',
    };
    return roleMap[internalRoleId] || 'VIEWER';
  }

  function openCreateModal() {
    setEditingMapping(null);
    setFormData(DEFAULT_FORM_DATA);
    setError(null);
    setShowModal(true);
  }

  function openEditModal(mapping: RoleMapping) {
    setEditingMapping(mapping);
    setFormData({
      idp_claim: mapping.idp_claim,
      claim_value: mapping.claim_value,
      teei_role: mapping.teei_role,
      priority: mapping.priority,
      enabled: mapping.enabled,
      description: mapping.description || '',
    });
    setError(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingMapping(null);
    setFormData(DEFAULT_FORM_DATA);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // TODO: These CRUD endpoints need to be defined in the Worker 1 API spec
      // For now, we'll show an error message that the feature is not yet implemented
      setError('CRUD operations for SCIM role mappings are not yet available. Please contact your administrator.');

      // When the API endpoints are available, implement like this:
      /*
      if (editingMapping) {
        // Update existing mapping
        // PUT /v1/identity/scim-config/{companyId}/role-mappings/{id}
        const response = await fetch(
          `/api/identity/scim/${companyId}/mappings/${editingMapping.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
          }
        );

        if (response.ok) {
          const updated = await response.json();
          setMappings(
            mappings.map((m) => (m.id === editingMapping.id ? updated.mapping : m))
          );
          closeModal();
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to update mapping');
        }
      } else {
        // Create new mapping
        // POST /v1/identity/scim-config/{companyId}/role-mappings
        const response = await fetch(`/api/identity/scim/${companyId}/mappings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          const created = await response.json();
          setMappings([...mappings, created.mapping]);
          closeModal();
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to create mapping');
        }
      }
      */
    } catch (error) {
      console.error('Failed to save mapping:', error);
      setError(error instanceof Error ? error.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(mapping: RoleMapping) {
    const confirmed = window.confirm(
      `Are you sure you want to delete the mapping for "${mapping.claim_value}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    // TODO: DELETE endpoint needs to be defined in the Worker 1 API spec
    // For now, show an error message
    alert('Delete operation for SCIM role mappings is not yet available. Please contact your administrator.');

    // When the API endpoint is available, implement like this:
    /*
    try {
      // DELETE /v1/identity/scim-config/{companyId}/role-mappings/{id}
      const response = await fetch(
        `/api/identity/scim/${companyId}/mappings/${mapping.id}`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        setMappings(mappings.filter((m) => m.id !== mapping.id));
      } else {
        const errorData = await response.json();
        alert(`Failed to delete mapping: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to delete mapping:', error);
      alert('Failed to delete mapping: Network error');
    }
    */
  }

  const sortedMappings = [...mappings].sort((a, b) => b.priority - a.priority);

  if (loading) {
    return <div className="mapping-editor loading">Loading role mappings...</div>;
  }

  return (
    <div className="mapping-editor">
      {/* Header */}
      <div className="editor-header">
        <div>
          <h3>SCIM Role Mappings ({mappings.length})</h3>
          <p className="subtitle">
            Map identity provider claims to TEEI roles for automatic user provisioning
          </p>
        </div>
        {!readOnly && (
          <button className="btn-primary" onClick={openCreateModal}>
            + Add Mapping
          </button>
        )}
      </div>

      {/* Info Box */}
      <div className="info-box">
        <strong>How mappings work:</strong> When users authenticate via SSO, their identity
        provider sends claims (attributes). These mappings automatically assign TEEI roles
        based on matching claim values. Higher priority mappings take precedence.
      </div>

      {/* Mappings Table */}
      {sortedMappings.length === 0 ? (
        <div className="empty-state">
          <p>No role mappings configured</p>
          {!readOnly && (
            <button className="btn-secondary" onClick={openCreateModal}>
              Create First Mapping
            </button>
          )}
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
                {!readOnly && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {sortedMappings.map((mapping) => (
                <tr key={mapping.id} className={!mapping.enabled ? 'disabled' : ''}>
                  <td>
                    <span className="priority-badge">{mapping.priority}</span>
                  </td>
                  <td>
                    <code>{mapping.idp_claim}</code>
                  </td>
                  <td>
                    <code>{mapping.claim_value}</code>
                  </td>
                  <td>
                    <RoleBadge role={mapping.teei_role} />
                  </td>
                  <td>
                    <span className={`status ${mapping.enabled ? 'enabled' : 'disabled'}`}>
                      {mapping.enabled ? '● Enabled' : '○ Disabled'}
                    </span>
                  </td>
                  <td className="description">{mapping.description || '—'}</td>
                  {!readOnly && (
                    <td className="actions">
                      <button
                        className="btn-icon"
                        onClick={() => openEditModal(mapping)}
                        title="Edit mapping"
                        aria-label="Edit mapping"
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-icon delete"
                        onClick={() => handleDelete(mapping)}
                        title="Delete mapping"
                        aria-label="Delete mapping"
                      >
                        🗑️
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal} role="dialog" aria-modal="true">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSubmit}>
              <div className="modal-header">
                <h3>{editingMapping ? 'Edit Role Mapping' : 'Create Role Mapping'}</h3>
                <button
                  type="button"
                  className="close-btn"
                  onClick={closeModal}
                  aria-label="Close modal"
                >
                  ×
                </button>
              </div>

              <div className="modal-body">
                {error && (
                  <div className="error-banner" role="alert">
                    <strong>Error:</strong> {error}
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="idp_claim">
                    IdP Claim <span className="required">*</span>
                  </label>
                  <select
                    id="idp_claim"
                    value={formData.idp_claim}
                    onChange={(e) => setFormData({ ...formData, idp_claim: e.target.value })}
                    required
                  >
                    <option value="groups">groups</option>
                    <option value="email">email</option>
                    <option value="department">department</option>
                    <option value="roles">roles</option>
                    <option value="custom">custom</option>
                  </select>
                  <small>The claim attribute from your identity provider</small>
                </div>

                <div className="form-group">
                  <label htmlFor="claim_value">
                    Claim Value <span className="required">*</span>
                  </label>
                  <input
                    id="claim_value"
                    type="text"
                    value={formData.claim_value}
                    onChange={(e) =>
                      setFormData({ ...formData, claim_value: e.target.value })
                    }
                    placeholder="e.g., teei-admins, *@company.com, HR"
                    required
                  />
                  <small>
                    The value to match (use * for wildcards, e.g., *@executive.com)
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="teei_role">
                    TEEI Role <span className="required">*</span>
                  </label>
                  <select
                    id="teei_role"
                    value={formData.teei_role}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        teei_role: e.target.value as MappingFormData['teei_role'],
                      })
                    }
                    required
                  >
                    <option value="VIEWER">VIEWER - Read-only access</option>
                    <option value="MANAGER">MANAGER - Create and submit reports</option>
                    <option value="ADMIN">ADMIN - Review and approve</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN - Full access</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="priority">
                    Priority <span className="required">*</span>
                  </label>
                  <input
                    id="priority"
                    type="number"
                    min="1"
                    max="100"
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: Number(e.target.value) })
                    }
                    required
                  />
                  <small>Higher numbers = higher priority (1-100)</small>
                </div>

                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional: Describe this mapping rule"
                    rows={3}
                  />
                </div>

                <div className="form-group checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.enabled}
                      onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    />
                    <span>Enable this mapping</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting
                    ? 'Saving...'
                    : editingMapping
                      ? 'Update Mapping'
                      : 'Create Mapping'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .mapping-editor {
          background: white;
        }

        .editor-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          gap: 16px;
        }

        .editor-header h3 {
          margin: 0 0 4px;
          font-size: 1.25rem;
        }

        .subtitle {
          margin: 0;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .info-box {
          background: #eff6ff;
          border: 1px solid #3b82f6;
          padding: 16px;
          border-radius: 6px;
          margin-bottom: 24px;
          color: #1e3a8a;
          line-height: 1.6;
        }

        .info-box strong {
          color: #1e40af;
        }

        .empty-state {
          text-align: center;
          padding: 64px 24px;
          background: #f9fafb;
          border-radius: 8px;
          border: 2px dashed #d1d5db;
        }

        .empty-state p {
          margin: 0 0 16px;
          color: #6b7280;
          font-size: 1rem;
        }

        .table-wrapper {
          overflow-x: auto;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
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
          font-size: 0.9375rem;
        }

        .mappings-table tr.disabled {
          opacity: 0.5;
        }

        .priority-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: #3b82f6;
          color: white;
          border-radius: 50%;
          font-weight: 700;
          font-size: 0.875rem;
        }

        .mappings-table code {
          background: #f3f4f6;
          padding: 4px 8px;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          font-size: 0.875rem;
        }

        .status.enabled {
          color: #059669;
          font-weight: 600;
        }

        .status.disabled {
          color: #9ca3af;
          font-weight: 600;
        }

        .description {
          color: #6b7280;
          max-width: 300px;
        }

        .actions {
          display: flex;
          gap: 8px;
        }

        .btn-icon {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1.125rem;
          padding: 4px 8px;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .btn-icon:hover {
          background: #f3f4f6;
        }

        .btn-icon.delete:hover {
          background: #fee2e2;
        }

        .btn-primary,
        .btn-secondary {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
        }

        .btn-secondary:hover {
          background: #e5e7eb;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal {
          background: white;
          border-radius: 8px;
          max-width: 600px;
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

        .close-btn {
          background: none;
          border: none;
          font-size: 2rem;
          line-height: 1;
          cursor: pointer;
          color: #9ca3af;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background: #f3f4f6;
          color: #111827;
        }

        .modal-body {
          padding: 24px;
        }

        .error-banner {
          background: #fee2e2;
          border: 1px solid #fca5a5;
          padding: 12px 16px;
          border-radius: 6px;
          margin-bottom: 20px;
          color: #991b1b;
        }

        .error-banner strong {
          font-weight: 700;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          font-weight: 600;
          margin-bottom: 8px;
          color: #374151;
        }

        .required {
          color: #dc2626;
        }

        .form-group input[type='text'],
        .form-group input[type='number'],
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.9375rem;
          font-family: inherit;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-group small {
          display: block;
          margin-top: 4px;
          color: #6b7280;
          font-size: 0.8125rem;
        }

        .form-group.checkbox label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .form-group.checkbox input[type='checkbox'] {
          width: auto;
          cursor: pointer;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 20px 24px;
          border-top: 1px solid #e5e7eb;
        }

        @media (max-width: 768px) {
          .editor-header {
            flex-direction: column;
          }

          .table-wrapper {
            font-size: 0.875rem;
          }

          .actions {
            flex-direction: column;
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
    <>
      <span className="role-badge" style={{ backgroundColor: color.bg, color: color.text }}>
        {role}
      </span>
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
    </>
  );
}

