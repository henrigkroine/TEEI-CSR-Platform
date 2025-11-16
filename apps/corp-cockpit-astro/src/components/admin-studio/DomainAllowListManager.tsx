/**
 * Domain Allow-List Manager - Phase H3-B
 *
 * Manage authorized domains for dashboard embedding.
 * Full CRUD with validation and RBAC.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface AllowedDomain {
  id: string;
  domain: string;
  addedAt: string;
  addedBy: string;
  isActive: boolean;
}

interface DomainAllowListManagerProps {
  companyId: string;
}

export default function DomainAllowListManager({ companyId }: DomainAllowListManagerProps) {
  const queryClient = useQueryClient();
  const [newDomain, setNewDomain] = useState('');
  const [validationError, setValidationError] = useState('');

  // Fetch allowed domains
  const { data: domains, isLoading } = useQuery({
    queryKey: ['domain-allowlist', companyId],
    queryFn: async () => {
      const response = await fetch(`/api/admin-studio/domain-allowlist/${companyId}`);
      if (!response.ok) throw new Error('Failed to fetch domains');
      return response.json() as Promise<AllowedDomain[]>;
    },
  });

  // Add domain mutation
  const addDomain = useMutation({
    mutationFn: async (domain: string) => {
      const response = await fetch(`/api/admin-studio/domain-allowlist/${companyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add domain');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domain-allowlist', companyId] });
      setNewDomain('');
      setValidationError('');
    },
    onError: (error: Error) => {
      setValidationError(error.message);
    },
  });

  // Remove domain mutation
  const removeDomain = useMutation({
    mutationFn: async (domainId: string) => {
      const response = await fetch(`/api/admin-studio/domain-allowlist/${companyId}/${domainId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to remove domain');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domain-allowlist', companyId] });
    },
  });

  const validateDomain = (domain: string): boolean => {
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
    if (!domainRegex.test(domain)) {
      setValidationError('Invalid domain format');
      return false;
    }
    setValidationError('');
    return true;
  };

  const handleAddDomain = () => {
    const trimmed = newDomain.trim().toLowerCase();
    if (!trimmed) return;

    if (validateDomain(trimmed)) {
      addDomain.mutate(trimmed);
    }
  };

  return (
    <div className="domain-allowlist-manager">
      {/* Add Domain Form */}
      <div className="add-domain-form">
        <input
          type="text"
          placeholder="example.com"
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
          className="input"
          aria-label="Domain to add"
          aria-invalid={!!validationError}
          aria-describedby={validationError ? 'domain-error' : undefined}
        />
        <button
          onClick={handleAddDomain}
          disabled={addDomain.isPending}
          className="button button-primary"
        >
          {addDomain.isPending ? 'Adding...' : 'Add Domain'}
        </button>
      </div>

      {validationError && (
        <div id="domain-error" className="error-message" role="alert">
          {validationError}
        </div>
      )}

      {/* Domain List */}
      {isLoading ? (
        <div className="loading">Loading domains...</div>
      ) : (
        <div className="domain-list">
          {domains && domains.length > 0 ? (
            domains.map((domain) => (
              <div key={domain.id} className="domain-item">
                <div className="domain-info">
                  <code className="domain-name">{domain.domain}</code>
                  <span className="domain-meta">
                    Added {new Date(domain.addedAt).toLocaleDateString()} by {domain.addedBy}
                  </span>
                </div>
                <button
                  onClick={() => removeDomain.mutate(domain.id)}
                  disabled={removeDomain.isPending}
                  className="button button-danger"
                  aria-label={`Remove ${domain.domain}`}
                >
                  Remove
                </button>
              </div>
            ))
          ) : (
            <p className="empty-state">
              No domains in allow-list. Add domains that are authorized to embed your dashboards.
            </p>
          )}
        </div>
      )}

      <style>{`
        .domain-allowlist-manager {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .add-domain-form {
          display: flex;
          gap: 8px;
        }

        .input {
          flex: 1;
          padding: 10px 12px;
          border: 1px solid var(--color-border);
          border-radius: 6px;
          font-size: 1rem;
        }

        .input[aria-invalid="true"] {
          border-color: #ef4444;
        }

        .button {
          padding: 10px 16px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .button-primary {
          background: var(--color-primary, #3b82f6);
          color: white;
        }

        .button-danger {
          background: #ef4444;
          color: white;
          font-size: 0.8rem;
          padding: 6px 12px;
        }

        .error-message {
          padding: 12px;
          background: #fee2e2;
          color: #991b1b;
          border-radius: 6px;
          font-size: 0.875rem;
        }

        .domain-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .domain-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: var(--color-bg-light, #f9fafb);
          border: 1px solid var(--color-border);
          border-radius: 8px;
        }

        .domain-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .domain-name {
          font-family: monospace;
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text);
        }

        .domain-meta {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
        }

        .empty-state {
          text-align: center;
          padding: 32px;
          color: var(--color-text-secondary);
          font-size: 0.875rem;
        }

        @media (max-width: 640px) {
          .domain-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
        }
      `}</style>
    </div>
  );
}
