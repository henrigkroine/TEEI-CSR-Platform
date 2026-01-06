/**
 * Embed Token Manager Component (Phase H3-B)
 *
 * Manages embed tokens for iframe integration of cockpit dashboards.
 * Allows external applications to securely embed dashboard views.
 *
 * Features:
 * - Generate embed tokens with expiration
 * - Configure allowed views/metrics
 * - Set token permissions (read-only, export, etc.)
 * - Revoke tokens
 * - Copy embed code snippets
 * - Token usage analytics
 * - RBAC enforcement
 *
 * API Integration:
 * - GET /api/admin/embed-tokens - List tokens
 * - POST /api/admin/embed-tokens - Create token
 * - DELETE /api/admin/embed-tokens/:id - Revoke token
 * - PUT /api/admin/embed-tokens/:id - Update token
 *
 * @module EmbedTokenManager
 */

import { useState, useEffect } from 'react';
import { createApiClient } from '../../lib/api';

export interface EmbedToken {
  id: string;
  name: string;
  token: string;
  createdAt: string;
  expiresAt: string | null;
  createdBy: string;
  permissions: {
    views: string[]; // e.g., ['dashboard', 'impact', 'trends']
    allowExport: boolean;
    allowEvidence: boolean;
  };
  restrictions: {
    maxRequests: number | null;
    requestCount: number;
    lastUsedAt: string | null;
  };
  status: 'active' | 'expired' | 'revoked';
}

export interface EmbedTokenManagerProps {
  companyId: string;
  /** Whether user can manage tokens */
  canManage?: boolean;
}

export default function EmbedTokenManager({ companyId, canManage = false }: EmbedTokenManagerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState<EmbedToken[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const api = createApiClient();

  useEffect(() => {
    loadTokens();
  }, [companyId]);

  const loadTokens = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get<EmbedToken[]>(
        `/api/admin/embed-tokens?companyId=${companyId}`
      );
      setTokens(response);
    } catch (err: any) {
      console.error('[EmbedTokenManager] Load failed:', err);
      setError(err.message || 'Failed to load embed tokens');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (tokenId: string) => {
    if (!confirm('Are you sure you want to revoke this embed token? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/api/admin/embed-tokens/${tokenId}`);
      await loadTokens();
    } catch (err: any) {
      console.error('[EmbedTokenManager] Revoke failed:', err);
      alert(`Failed to revoke token: ${err.message}`);
    }
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleCopyEmbedCode = (token: string) => {
    const embedCode = generateEmbedCode(token);
    navigator.clipboard.writeText(embedCode);
    alert('Embed code copied to clipboard!');
  };

  const generateEmbedCode = (token: string): string => {
    return `<!-- TEEI Corporate Cockpit Embed -->
<iframe
  src="${window.location.origin}/embed?token=${token}"
  width="100%"
  height="600"
  frameborder="0"
  allow="fullscreen"
  sandbox="allow-scripts allow-same-origin"
  title="TEEI Corporate Cockpit"
></iframe>`;
  };

  const getStatusColor = (status: EmbedToken['status']): string => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-yellow-100 text-yellow-800';
      case 'revoked':
        return 'bg-red-100 text-red-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading embed tokens...</div>
      </div>
    );
  }

  return (
    <div className="embed-token-manager space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Embed Token Management</h3>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage tokens for embedding dashboards in external applications
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setShowCreateDialog(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                     transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            + Create Token
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="text-red-800 text-sm">{error}</div>
        </div>
      )}

      {/* Tokens List */}
      {tokens.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <div className="text-gray-500 mb-4">No embed tokens created yet</div>
          {canManage && (
            <button
              onClick={() => setShowCreateDialog(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                       transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Create Your First Token
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {tokens.map((token) => (
            <div key={token.id} className="bg-white border border-gray-200 rounded-lg p-6">
              {/* Token Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-lg">{token.name}</h4>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(token.status)}`}>
                      {token.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Created {new Date(token.createdAt).toLocaleDateString()} by {token.createdBy}
                  </div>
                </div>

                {canManage && token.status === 'active' && (
                  <button
                    onClick={() => handleRevoke(token.id)}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded
                             transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Revoke
                  </button>
                )}
              </div>

              {/* Token Details */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">Token</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded font-mono text-sm overflow-hidden text-ellipsis">
                      {token.status === 'active' ? token.token : '••••••••••••••••'}
                    </code>
                    {token.status === 'active' && (
                      <button
                        onClick={() => handleCopyToken(token.token)}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm
                                 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
                        aria-label="Copy token"
                      >
                        {copiedToken === token.token ? '✓' : '📋'}
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">Expires</div>
                  <div className="text-sm">
                    {token.expiresAt ? new Date(token.expiresAt).toLocaleDateString() : 'Never'}
                  </div>
                </div>
              </div>

              {/* Permissions */}
              <div className="mb-4">
                <div className="text-xs text-gray-500 uppercase mb-2">Allowed Views</div>
                <div className="flex flex-wrap gap-2">
                  {token.permissions.views.map((view) => (
                    <span
                      key={view}
                      className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium"
                    >
                      {view}
                    </span>
                  ))}
                  {token.permissions.allowExport && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                      Export
                    </span>
                  )}
                  {token.permissions.allowEvidence && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                      Evidence
                    </span>
                  )}
                </div>
              </div>

              {/* Usage Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-gray-50 rounded">
                <div>
                  <div className="text-xs text-gray-500 uppercase">Requests</div>
                  <div className="text-sm font-semibold">
                    {token.restrictions.requestCount}
                    {token.restrictions.maxRequests && ` / ${token.restrictions.maxRequests}`}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Last Used</div>
                  <div className="text-sm">
                    {token.restrictions.lastUsedAt
                      ? new Date(token.restrictions.lastUsedAt).toLocaleDateString()
                      : 'Never'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Status</div>
                  <div className="text-sm font-semibold capitalize">{token.status}</div>
                </div>
              </div>

              {/* Embed Code */}
              {token.status === 'active' && (
                <button
                  onClick={() => handleCopyEmbedCode(token.token)}
                  className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded
                           text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  📋 Copy Embed Code
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Token Dialog */}
      {showCreateDialog && (
        <CreateTokenDialog
          companyId={companyId}
          onClose={() => setShowCreateDialog(false)}
          onCreated={() => {
            setShowCreateDialog(false);
            loadTokens();
          }}
        />
      )}
    </div>
  );
}

interface CreateTokenDialogProps {
  companyId: string;
  onClose: () => void;
  onCreated: () => void;
}

function CreateTokenDialog({ companyId, onClose, onCreated }: CreateTokenDialogProps) {
  const [name, setName] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(90);
  const [views, setViews] = useState<string[]>(['dashboard']);
  const [allowExport, setAllowExport] = useState(false);
  const [allowEvidence, setAllowEvidence] = useState(false);
  const [maxRequests, setMaxRequests] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const api = createApiClient();

  const availableViews = [
    { id: 'dashboard', label: 'Main Dashboard' },
    { id: 'impact', label: 'Impact Metrics' },
    { id: 'trends', label: 'Trends & Analytics' },
    { id: 'engagement', label: 'Engagement' },
    { id: 'reports', label: 'Reports' },
  ];

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Token name is required');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      await api.post('/api/admin/embed-tokens', {
        companyId,
        name: name.trim(),
        expiresAt: expiresAt.toISOString(),
        permissions: {
          views,
          allowExport,
          allowEvidence,
        },
        restrictions: {
          maxRequests,
        },
      });

      onCreated();
    } catch (err: any) {
      console.error('[CreateTokenDialog] Create failed:', err);
      setError(err.message || 'Failed to create token');
    } finally {
      setCreating(false);
    }
  };

  const handleViewToggle = (viewId: string) => {
    setViews((prev) =>
      prev.includes(viewId) ? prev.filter((v) => v !== viewId) : [...prev, viewId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-2xl p-6 max-w-lg w-full mx-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="create-token-title"
      >
        <h3 id="create-token-title" className="text-xl font-bold mb-6">
          Create Embed Token
        </h3>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <div className="text-red-800 text-sm">{error}</div>
          </div>
        )}

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Token Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Marketing Dashboard Embed"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Expiration */}
          <div>
            <label className="block text-sm font-medium mb-1">Expires In (Days)</label>
            <input
              type="number"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 90)}
              min="1"
              max="365"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Views */}
          <div>
            <label className="block text-sm font-medium mb-2">Allowed Views *</label>
            <div className="space-y-2">
              {availableViews.map((view) => (
                <label key={view.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={views.includes(view.id)}
                    onChange={() => handleViewToggle(view.id)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm">{view.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Permissions */}
          <div>
            <label className="block text-sm font-medium mb-2">Permissions</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allowExport}
                  onChange={(e) => setAllowExport(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm">Allow Export</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allowEvidence}
                  onChange={(e) => setAllowEvidence(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm">Allow Evidence View</span>
              </label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleCreate}
            disabled={creating || views.length === 0}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400
                     text-white rounded-lg transition-colors
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {creating ? 'Creating...' : 'Create Token'}
          </button>
          <button
            onClick={onClose}
            disabled={creating}
            className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100
                     text-gray-800 rounded-lg transition-colors
                     focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
