/**
 * Demo Factory Manager Component
 * React component for creating and managing demo tenants
 */

import React, { useState, useEffect } from 'react';
import type { DemoTenant, CreateDemoTenantRequest } from '@teei/shared-types/demo';

export default function DemoFactoryManager() {
  const [tenants, setTenants] = useState<DemoTenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<CreateDemoTenantRequest>>({
    tenantName: '',
    size: 'small',
    regions: ['US'],
    vertical: 'technology',
    timeRangeMonths: 12,
    includeSeasonality: true,
    locale: 'en',
    adminEmail: '',
  });

  // Load demo tenants on mount
  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/demo/tenants');
      if (!response.ok) throw new Error('Failed to load demo tenants');

      const data = await response.json();
      setTenants(data.tenants || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const createTenant = async () => {
    if (!formData.tenantName || !formData.adminEmail) {
      setError('Tenant name and admin email are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/v1/demo/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create demo tenant');
      }

      const result = await response.json();
      setTenants([...tenants, result.tenant]);
      setShowCreateForm(false);

      // Reset form
      setFormData({
        tenantName: '',
        size: 'small',
        regions: ['US'],
        vertical: 'technology',
        timeRangeMonths: 12,
        includeSeasonality: true,
        locale: 'en',
        adminEmail: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const deleteTenant = async (tenantId: string) => {
    if (!confirm(`Delete demo tenant ${tenantId}? This cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/v1/demo/${tenantId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete demo tenant');

      setTenants(tenants.filter((t) => t.tenantId !== tenantId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="demo-factory-manager">
      {error && (
        <div className="alert alert-error">
          <strong>Error:</strong> {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="actions-bar">
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
          disabled={loading}
        >
          {showCreateForm ? 'Cancel' : 'Create Demo Tenant'}
        </button>
        <button className="btn btn-secondary" onClick={loadTenants} disabled={loading}>
          Refresh
        </button>
      </div>

      {showCreateForm && (
        <div className="create-form">
          <h2>Create Demo Tenant</h2>

          <div className="form-group">
            <label htmlFor="tenantName">Tenant Name *</label>
            <input
              id="tenantName"
              type="text"
              value={formData.tenantName}
              onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
              placeholder="acme-demo"
              pattern="^[a-z0-9-]+$"
              required
            />
            <small>Lowercase letters, numbers, and hyphens only (will be prefixed with 'demo-')</small>
          </div>

          <div className="form-group">
            <label htmlFor="size">Size *</label>
            <select
              id="size"
              value={formData.size}
              onChange={(e) => setFormData({ ...formData, size: e.target.value as any })}
            >
              <option value="small">Small (~1K events, ~1 min)</option>
              <option value="medium">Medium (~25K events, ~4 min)</option>
              <option value="large">Large (~126K events, ~15 min)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="regions">Regions *</label>
            <select
              id="regions"
              multiple
              value={formData.regions}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                setFormData({ ...formData, regions: selected as any });
              }}
            >
              <option value="US">United States</option>
              <option value="UK">United Kingdom</option>
              <option value="EU">European Union</option>
              <option value="APAC">Asia-Pacific</option>
              <option value="LATAM">Latin America</option>
              <option value="MULTI">Multi-Regional</option>
            </select>
            <small>Hold Ctrl/Cmd to select multiple</small>
          </div>

          <div className="form-group">
            <label htmlFor="vertical">Industry Vertical</label>
            <select
              id="vertical"
              value={formData.vertical}
              onChange={(e) => setFormData({ ...formData, vertical: e.target.value as any })}
            >
              <option value="technology">Technology</option>
              <option value="finance">Finance</option>
              <option value="healthcare">Healthcare</option>
              <option value="retail">Retail</option>
              <option value="manufacturing">Manufacturing</option>
              <option value="nonprofit">Nonprofit</option>
              <option value="education">Education</option>
              <option value="consulting">Consulting</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="adminEmail">Admin Email *</label>
            <input
              id="adminEmail"
              type="email"
              value={formData.adminEmail}
              onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
              placeholder="admin@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="timeRangeMonths">Historical Data Range (months)</label>
            <input
              id="timeRangeMonths"
              type="number"
              min="1"
              max="36"
              value={formData.timeRangeMonths}
              onChange={(e) => setFormData({ ...formData, timeRangeMonths: parseInt(e.target.value) })}
            />
          </div>

          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                checked={formData.includeSeasonality}
                onChange={(e) => setFormData({ ...formData, includeSeasonality: e.target.checked })}
              />
              Include seasonality patterns
            </label>
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" onClick={createTenant} disabled={loading}>
              {loading ? 'Creating...' : 'Create'}
            </button>
            <button className="btn btn-secondary" onClick={() => setShowCreateForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="tenants-list">
        <h2>Demo Tenants ({tenants.length})</h2>

        {loading && <p>Loading...</p>}

        {!loading && tenants.length === 0 && (
          <p className="empty-state">No demo tenants yet. Create one to get started!</p>
        )}

        {!loading && tenants.length > 0 && (
          <div className="tenants-grid">
            {tenants.map((tenant) => (
              <div key={tenant.tenantId} className="tenant-card">
                <div className="tenant-header">
                  <h3>{tenant.tenantId}</h3>
                  <span className={`status-badge status-${tenant.status}`}>{tenant.status}</span>
                </div>

                <div className="tenant-details">
                  <div className="detail-row">
                    <span className="label">Size:</span>
                    <span className="value">{tenant.size}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Regions:</span>
                    <span className="value">{tenant.regions.join(', ')}</span>
                  </div>
                  {tenant.vertical && (
                    <div className="detail-row">
                      <span className="label">Vertical:</span>
                      <span className="value">{tenant.vertical}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="label">Created:</span>
                    <span className="value">{new Date(tenant.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Expires:</span>
                    <span className="value">{new Date(tenant.expiresAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {tenant.seedStats && (
                  <div className="seed-stats">
                    <div className="stat">
                      <span className="stat-value">{tenant.seedStats.usersCreated}</span>
                      <span className="stat-label">Users</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">{tenant.seedStats.eventsCreated.toLocaleString()}</span>
                      <span className="stat-label">Events</span>
                    </div>
                  </div>
                )}

                <div className="tenant-actions">
                  <button className="btn btn-sm btn-danger" onClick={() => deleteTenant(tenant.tenantId)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .demo-factory-manager {
          font-family: system-ui, -apple-system, sans-serif;
        }

        .alert {
          padding: 1rem;
          margin-bottom: 1rem;
          border-radius: 0.375rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .alert-error {
          background-color: #fee;
          color: #c33;
          border: 1px solid #fcc;
        }

        .alert button {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: inherit;
        }

        .actions-bar {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
        }

        .btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-primary {
          background-color: #3b82f6;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #2563eb;
        }

        .btn-secondary {
          background-color: #e5e7eb;
          color: #374151;
        }

        .btn-secondary:hover:not(:disabled) {
          background-color: #d1d5db;
        }

        .btn-danger {
          background-color: #ef4444;
          color: white;
        }

        .btn-danger:hover:not(:disabled) {
          background-color: #dc2626;
        }

        .btn-sm {
          padding: 0.375rem 0.75rem;
          font-size: 0.75rem;
        }

        .create-form {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .create-form h2 {
          margin: 0 0 1.5rem 0;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
        }

        .form-group select[multiple] {
          height: 120px;
        }

        .form-group small {
          display: block;
          margin-top: 0.25rem;
          font-size: 0.75rem;
          color: #6b7280;
        }

        .form-group.checkbox label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .form-group.checkbox input {
          width: auto;
        }

        .form-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 1.5rem;
        }

        .tenants-list h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .empty-state {
          padding: 2rem;
          text-align: center;
          color: #6b7280;
        }

        .tenants-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1rem;
        }

        .tenant-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 1.5rem;
        }

        .tenant-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .tenant-header h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: #1f2937;
        }

        .status-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
        }

        .status-ready {
          background-color: #d1fae5;
          color: #065f46;
        }

        .status-creating,
        .status-seeding,
        .status-warming {
          background-color: #fed7aa;
          color: #92400e;
        }

        .status-error {
          background-color: #fee2e2;
          color: #991b1b;
        }

        .tenant-details {
          margin-bottom: 1rem;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 0.375rem 0;
          font-size: 0.875rem;
        }

        .detail-row .label {
          color: #6b7280;
        }

        .detail-row .value {
          font-weight: 500;
          color: #1f2937;
        }

        .seed-stats {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          background-color: #f9fafb;
          border-radius: 0.375rem;
          margin-bottom: 1rem;
        }

        .stat {
          flex: 1;
          text-align: center;
        }

        .stat-value {
          display: block;
          font-size: 1.25rem;
          font-weight: 700;
          color: #1f2937;
        }

        .stat-label {
          display: block;
          font-size: 0.75rem;
          color: #6b7280;
          margin-top: 0.25rem;
        }

        .tenant-actions {
          display: flex;
          gap: 0.5rem;
        }
      `}</style>
    </div>
  );
}
