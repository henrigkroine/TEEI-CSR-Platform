/**
 * Embed Token Manager - Phase H3-B
 *
 * Full CRUD operations for managing embed authentication tokens.
 * Includes RBAC enforcement and audit logging.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface EmbedToken {
  id: string;
  name: string;
  token: string;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  usageCount: number;
  scopes: string[];
  isActive: boolean;
}

interface EmbedTokenManagerProps {
  companyId: string;
}

export default function EmbedTokenManager({ companyId }: EmbedTokenManagerProps) {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenScopes, setNewTokenScopes] = useState<string[]>(['read:dashboards']);
  const [showToken, setShowToken] = useState<string | null>(null);

  // Fetch embed tokens
  const { data: tokens, isLoading } = useQuery({
    queryKey: ['embed-tokens', companyId],
    queryFn: async () => {
      const response = await fetch(`/api/admin-studio/embed-tokens/${companyId}`);
      if (!response.ok) throw new Error('Failed to fetch tokens');
      return response.json() as Promise<EmbedToken[]>;
    },
  });

  // Create token mutation
  const createToken = useMutation({
    mutationFn: async (data: { name: string; scopes: string[] }) => {
      const response = await fetch(`/api/admin-studio/embed-tokens/${companyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create token');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['embed-tokens', companyId] });
      setShowToken(data.token);
      setIsCreating(false);
      setNewTokenName('');
    },
  });

  // Revoke token mutation
  const revokeToken = useMutation({
    mutationFn: async (tokenId: string) => {
      const response = await fetch(`/api/admin-studio/embed-tokens/${companyId}/${tokenId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to revoke token');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['embed-tokens', companyId] });
    },
  });

  const handleCreate = () => {
    if (!newTokenName.trim()) return;
    createToken.mutate({ name: newTokenName, scopes: newTokenScopes });
  };

  return (
    <div className="embed-token-manager">
      {/* Create Token Form */}
      {!isCreating ? (
        <button onClick={() => setIsCreating(true)} className="button button-primary">
          + Create New Token
        </button>
      ) : (
        <div className="create-form">
          <input
            type="text"
            placeholder="Token name (e.g., Production Dashboard)"
            value={newTokenName}
            onChange={(e) => setNewTokenName(e.target.value)}
            className="input"
            aria-label="Token name"
          />
          <div className="form-actions">
            <button onClick={handleCreate} disabled={createToken.isPending} className="button button-primary">
              {createToken.isPending ? 'Creating...' : 'Create'}
            </button>
            <button onClick={() => setIsCreating(false)} className="button button-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Show newly created token */}
      {showToken && (
        <div className="token-reveal">
          <p className="token-reveal-title">⚠️ Save this token now - it won't be shown again!</p>
          <code className="token-code">{showToken}</code>
          <button onClick={() => setShowToken(null)} className="button button-secondary">
            I've saved the token
          </button>
        </div>
      )}

      {/* Token List */}
      {isLoading ? (
        <div className="loading">Loading tokens...</div>
      ) : (
        <div className="token-list">
          {tokens && tokens.length > 0 ? (
            tokens.map((token) => (
              <div key={token.id} className="token-item">
                <div className="token-header">
                  <h4>{token.name}</h4>
                  <span className={`status ${token.isActive ? 'active' : 'inactive'}`}>
                    {token.isActive ? 'Active' : 'Revoked'}
                  </span>
                </div>
                <div className="token-meta">
                  <span>Created: {new Date(token.createdAt).toLocaleDateString()}</span>
                  <span>Used: {token.usageCount} times</span>
                  {token.lastUsedAt && <span>Last: {new Date(token.lastUsedAt).toLocaleDateString()}</span>}
                </div>
                {token.isActive && (
                  <button
                    onClick={() => revokeToken.mutate(token.id)}
                    disabled={revokeToken.isPending}
                    className="button button-danger"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))
          ) : (
            <p className="empty-state">No embed tokens yet. Create one to get started.</p>
          )}
        </div>
      )}

      <style>{`
        .embed-token-manager {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .button {
          padding: 10px 16px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }

        .button-primary {
          background: var(--color-primary, #3b82f6);
          color: white;
        }

        .button-primary:hover:not(:disabled) {
          opacity: 0.9;
        }

        .button-secondary {
          background: transparent;
          color: var(--color-text);
          border: 1px solid var(--color-border);
        }

        .button-danger {
          background: #ef4444;
          color: white;
          font-size: 0.8rem;
          padding: 6px 12px;
        }

        .create-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 16px;
          background: var(--color-bg-light, #f9fafb);
          border-radius: 8px;
        }

        .input {
          padding: 10px 12px;
          border: 1px solid var(--color-border);
          border-radius: 6px;
          font-size: 1rem;
        }

        .form-actions {
          display: flex;
          gap: 8px;
        }

        .token-reveal {
          padding: 16px;
          background: #fef3c7;
          border: 2px solid #fbbf24;
          border-radius: 8px;
        }

        .token-reveal-title {
          font-weight: 600;
          color: #92400e;
          margin-bottom: 12px;
        }

        .token-code {
          display: block;
          padding: 12px;
          background: white;
          border-radius: 4px;
          font-family: monospace;
          word-break: break-all;
          margin-bottom: 12px;
        }

        .token-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .token-item {
          padding: 16px;
          background: var(--color-bg-light, #f9fafb);
          border: 1px solid var(--color-border);
          border-radius: 8px;
        }

        .token-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .token-header h4 {
          margin: 0;
          font-size: 1rem;
        }

        .status {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .status.active {
          background: #d1fae5;
          color: #065f46;
        }

        .status.inactive {
          background: #fee2e2;
          color: #991b1b;
        }

        .token-meta {
          display: flex;
          gap: 16px;
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          margin-bottom: 12px;
        }

        .empty-state {
          text-align: center;
          padding: 32px;
          color: var(--color-text-secondary);
        }
      `}</style>
    </div>
  );
}
