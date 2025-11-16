<<<<<<< HEAD
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
=======
import React, { useState, useEffect } from 'react';

/**
 * Embed Token
 */
interface EmbedToken {
  id: string;
  name: string;
  token: string;
  scope: string[]; // dashboards, reports, analytics
  domains: string[];
  expiresAt: Date | null;
  createdAt: Date;
  createdBy: string;
  lastUsed: Date | null;
  usageCount: number;
  enabled: boolean;
}

/**
 * Embed Token Manager Component
 */
export default function EmbedTokenManager({ companyId }: { companyId: string }) {
  const [tokens, setTokens] = useState<EmbedToken[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenScope, setNewTokenScope] = useState<string[]>(['dashboards']);
  const [newTokenExpiry, setNewTokenExpiry] = useState<number>(90); // days
  const [revealedTokens, setRevealedTokens] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
>>>>>>> origin/claude/worker3-phaseH2-scheduler-admin-usage-aaa-0157u7VEQjoVVhqTBgYcuumh

  useEffect(() => {
    loadTokens();
  }, [companyId]);

<<<<<<< HEAD
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
=======
  async function loadTokens() {
    setLoading(true);
    try {
      // Mock data - would call API in production
      const mockTokens: EmbedToken[] = [
        {
          id: 'tok-001',
          name: 'Production Dashboard Embed',
          token: 'etk_prod_1234567890abcdef1234567890abcdef',
          scope: ['dashboards', 'reports'],
          domains: ['app.example.com'],
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          createdBy: 'admin@example.com',
          lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000),
          usageCount: 1250,
          enabled: true,
        },
        {
          id: 'tok-002',
          name: 'Partner Portal',
          token: 'etk_part_fedcba0987654321fedcba0987654321',
          scope: ['dashboards'],
          domains: ['partner.example.com'],
          expiresAt: null, // never expires
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          createdBy: 'admin@example.com',
          lastUsed: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          usageCount: 450,
          enabled: true,
        },
      ];
      setTokens(mockTokens);
    } catch (error) {
      console.error('Failed to load tokens:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createToken() {
    if (!newTokenName.trim()) {
      alert('Token name is required');
>>>>>>> origin/claude/worker3-phaseH2-scheduler-admin-usage-aaa-0157u7VEQjoVVhqTBgYcuumh
      return;
    }

    try {
<<<<<<< HEAD
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
=======
      // Generate token (in production, this would be done server-side)
      const randomBytes = crypto.getRandomValues(new Uint8Array(16));
      const tokenValue = 'etk_' + Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const newToken: EmbedToken = {
        id: `tok-${Date.now()}`,
        name: newTokenName,
        token: tokenValue,
        scope: newTokenScope,
        domains: [],
        expiresAt: newTokenExpiry > 0
          ? new Date(Date.now() + newTokenExpiry * 24 * 60 * 60 * 1000)
          : null,
        createdAt: new Date(),
        createdBy: 'current-user@example.com',
        lastUsed: null,
        usageCount: 0,
        enabled: true,
      };

      setTokens([...tokens, newToken]);
      setShowCreateModal(false);
      setNewTokenName('');
      setNewTokenScope(['dashboards']);
      setNewTokenExpiry(90);

      // Reveal the newly created token
      setRevealedTokens(new Set([...revealedTokens, newToken.id]));
    } catch (error) {
      console.error('Failed to create token:', error);
      alert('Failed to create token');
    }
  }

  async function revokeToken(id: string) {
    if (!confirm('Are you sure you want to revoke this token? This action cannot be undone.')) {
      return;
    }

    try {
      setTokens(tokens.map(t => t.id === id ? { ...t, enabled: false } : t));
    } catch (error) {
      console.error('Failed to revoke token:', error);
    }
  }

  async function deleteToken(id: string) {
    if (!confirm('Are you sure you want to delete this token? This action cannot be undone.')) {
      return;
    }

    try {
      setTokens(tokens.filter(t => t.id !== id));
    } catch (error) {
      console.error('Failed to delete token:', error);
    }
  }

  function toggleReveal(id: string) {
    const newRevealed = new Set(revealedTokens);
    if (newRevealed.has(id)) {
      newRevealed.delete(id);
    } else {
      newRevealed.add(id);
    }
    setRevealedTokens(newRevealed);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    alert('Token copied to clipboard!');
  }

  function maskToken(token: string): string {
    const prefix = token.substring(0, 8);
    const suffix = token.substring(token.length - 4);
    return `${prefix}${'*'.repeat(token.length - 12)}${suffix}`;
  }

  if (loading) {
    return <div className="text-center py-8">Loading tokens...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Embed Token Manager</h2>
          <p className="mt-1 text-sm text-gray-600">
            Manage API tokens for embedding dashboards in external applications
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          + Create Token
        </button>
      </div>

      {/* Create Token Modal */}
      {showCreateModal && (
        <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-blue-500">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Embed Token</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Token Name *
              </label>
              <input
                type="text"
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
                placeholder="e.g., Production Dashboard Embed"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scope (Permissions)
              </label>
              <div className="space-y-2">
                {['dashboards', 'reports', 'analytics', 'exports'].map(scope => (
                  <label key={scope} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newTokenScope.includes(scope)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewTokenScope([...newTokenScope, scope]);
                        } else {
                          setNewTokenScope(newTokenScope.filter(s => s !== scope));
                        }
                      }}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700 capitalize">{scope}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiration
              </label>
              <select
                value={newTokenExpiry}
                onChange={(e) => setNewTokenExpiry(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
                <option value={180}>180 days</option>
                <option value={365}>1 year</option>
                <option value={0}>Never expires</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setShowCreateModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={createToken}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Create Token
            </button>
          </div>
        </div>
      )}

      {/* Token List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Active Tokens ({tokens.length})</h3>
        </div>

        {tokens.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            No tokens created. Create your first token to enable embedding.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {tokens.map(token => (
              <div key={token.id} className="px-6 py-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900">{token.name}</h4>
                      {token.enabled ? (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                          Revoked
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <code className="px-3 py-1 bg-gray-100 rounded font-mono text-sm">
                        {revealedTokens.has(token.id) ? token.token : maskToken(token.token)}
                      </code>
                      <button
                        onClick={() => toggleReveal(token.id)}
                        className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                      >
                        {revealedTokens.has(token.id) ? 'Hide' : 'Reveal'}
                      </button>
                      <button
                        onClick={() => copyToClipboard(token.token)}
                        className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                      >
                        Copy
                      </button>
                    </div>

                    <div className="text-sm text-gray-600 space-y-1">
                      <div>
                        <strong>Scope:</strong> {token.scope.join(', ')}
                      </div>
                      <div>
                        <strong>Created:</strong> {token.createdAt.toLocaleDateString()} by {token.createdBy}
                      </div>
                      <div>
                        <strong>Expires:</strong>{' '}
                        {token.expiresAt ? token.expiresAt.toLocaleDateString() : 'Never'}
                      </div>
                      <div>
                        <strong>Usage:</strong> {token.usageCount} requests
                        {token.lastUsed && ` (last: ${token.lastUsed.toLocaleString()})`}
                      </div>
                    </div>
                  </div>

                  <div className="ml-4 flex gap-2">
                    {token.enabled && (
                      <button
                        onClick={() => revokeToken(token.id)}
                        className="px-3 py-1 text-sm text-yellow-600 hover:bg-yellow-50 rounded transition"
                      >
                        Revoke
                      </button>
                    )}
                    <button
                      onClick={() => deleteToken(token.id)}
                      className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Usage Documentation */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          📘 How to Use Embed Tokens
        </h3>
        <div className="text-sm text-blue-800 space-y-3">
          <div>
            <strong>1. HTML Embedding:</strong>
            <pre className="mt-2 p-3 bg-white rounded text-xs overflow-x-auto">
{`<iframe
  src="https://cockpit.teei.io/embed/dashboard?token=YOUR_TOKEN"
  width="100%"
  height="600"
  frameborder="0"
></iframe>`}
            </pre>
          </div>

          <div>
            <strong>2. JavaScript SDK:</strong>
            <pre className="mt-2 p-3 bg-white rounded text-xs overflow-x-auto">
{`import { CockpitEmbed } from '@teei/embed-sdk';

const embed = new CockpitEmbed({
  token: 'YOUR_TOKEN',
  container: '#dashboard',
});`}
            </pre>
          </div>

          <div>
            <strong>3. API Requests:</strong>
            <pre className="mt-2 p-3 bg-white rounded text-xs overflow-x-auto">
{`curl -H "Authorization: Bearer YOUR_TOKEN" \\
  https://api.teei.io/v1/dashboards`}
            </pre>
          </div>
>>>>>>> origin/claude/worker3-phaseH2-scheduler-admin-usage-aaa-0157u7VEQjoVVhqTBgYcuumh
        </div>
      </div>
    </div>
  );
}
