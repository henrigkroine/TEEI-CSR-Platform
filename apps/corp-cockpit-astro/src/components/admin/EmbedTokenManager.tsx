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

  useEffect(() => {
    loadTokens();
  }, [companyId]);

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
      return;
    }

    try {
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
        </div>
      </div>
    </div>
  );
}
