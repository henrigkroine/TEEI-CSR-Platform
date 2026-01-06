import { useState, useEffect } from 'react';
import './admin.css';

interface APIKey {
  id: string;
  name: string;
  keyPrefix: string; // Only first 8 chars shown (e.g., "teei_123...")
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
  scopes: string[];
}

interface APIKeyManagerProps {
  companyId: string;
}

export default function APIKeyManager({ companyId }: APIKeyManagerProps) {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyData, setNewKeyData] = useState({
    name: '',
    scopes: ['read:metrics', 'read:reports'],
    expiresInDays: 365,
  });
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  useEffect(() => {
    fetchAPIKeys();
  }, [companyId]);

  async function fetchAPIKeys() {
    try {
      setLoading(true);
      const response = await fetch(`/api/companies/${companyId}/api-keys`);
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.keys);
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createAPIKey() {
    try {
      const response = await fetch(`/api/companies/${companyId}/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKeyData),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedKey(data.key); // Full key shown only once
        setApiKeys([...apiKeys, data.keyInfo]);
        setNewKeyData({ name: '', scopes: ['read:metrics', 'read:reports'], expiresInDays: 365 });
      }
    } catch (error) {
      console.error('Failed to create API key:', error);
    }
  }

  async function revokeAPIKey(keyId: string) {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/companies/${companyId}/api-keys/${keyId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setApiKeys(apiKeys.filter((key) => key.id !== keyId));
      }
    } catch (error) {
      console.error('Failed to revoke API key:', error);
    }
  }

  function closeModal() {
    setShowCreateModal(false);
    setGeneratedKey(null);
  }

  if (loading) {
    return <div className="loading">Loading API keys...</div>;
  }

  return (
    <div className="api-key-manager">
      <div className="key-list-header">
        <h3>Active API Keys ({apiKeys.length})</h3>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          + Create New Key
        </button>
      </div>

      {apiKeys.length === 0 ? (
        <div className="empty-state">
          <p>No API keys found. Create one to enable programmatic access.</p>
        </div>
      ) : (
        <table className="key-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Key</th>
              <th>Scopes</th>
              <th>Created</th>
              <th>Last Used</th>
              <th>Expires</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {apiKeys.map((key) => (
              <tr key={key.id}>
                <td className="key-name">{key.name}</td>
                <td className="key-prefix">
                  <code>{key.keyPrefix}••••••••</code>
                </td>
                <td>
                  <div className="scopes">
                    {key.scopes.map((scope) => (
                      <span key={scope} className="scope-badge">
                        {scope}
                      </span>
                    ))}
                  </div>
                </td>
                <td>{new Date(key.createdAt).toLocaleDateString()}</td>
                <td>{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}</td>
                <td className={key.expiresAt && new Date(key.expiresAt) < new Date() ? 'expired' : ''}>
                  {key.expiresAt ? new Date(key.expiresAt).toLocaleDateString() : 'Never'}
                </td>
                <td>
                  <button className="btn btn-danger btn-sm" onClick={() => revokeAPIKey(key.id)}>
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{generatedKey ? 'API Key Created' : 'Create New API Key'}</h3>
              <button className="close-btn" onClick={closeModal}>
                ×
              </button>
            </div>

            {generatedKey ? (
              <div className="modal-body">
                <div className="success-message">
                  <strong>✅ API key created successfully!</strong>
                  <p>Copy this key now. You won't be able to see it again.</p>
                </div>
                <div className="generated-key">
                  <code>{generatedKey}</code>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigator.clipboard.writeText(generatedKey)}
                  >
                    Copy
                  </button>
                </div>
              </div>
            ) : (
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="keyName">Key Name *</label>
                  <input
                    id="keyName"
                    type="text"
                    placeholder="e.g., Production API, Analytics Script"
                    value={newKeyData.name}
                    onChange={(e) => setNewKeyData({ ...newKeyData, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Scopes *</label>
                  <div className="checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={newKeyData.scopes.includes('read:metrics')}
                        onChange={(e) => {
                          const scopes = e.target.checked
                            ? [...newKeyData.scopes, 'read:metrics']
                            : newKeyData.scopes.filter((s) => s !== 'read:metrics');
                          setNewKeyData({ ...newKeyData, scopes });
                        }}
                      />
                      Read Metrics
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={newKeyData.scopes.includes('read:reports')}
                        onChange={(e) => {
                          const scopes = e.target.checked
                            ? [...newKeyData.scopes, 'read:reports']
                            : newKeyData.scopes.filter((s) => s !== 'read:reports');
                          setNewKeyData({ ...newKeyData, scopes });
                        }}
                      />
                      Read Reports
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={newKeyData.scopes.includes('write:data')}
                        onChange={(e) => {
                          const scopes = e.target.checked
                            ? [...newKeyData.scopes, 'write:data']
                            : newKeyData.scopes.filter((s) => s !== 'write:data');
                          setNewKeyData({ ...newKeyData, scopes });
                        }}
                      />
                      Write Data
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="expiresIn">Expires In</label>
                  <select
                    id="expiresIn"
                    value={newKeyData.expiresInDays}
                    onChange={(e) =>
                      setNewKeyData({ ...newKeyData, expiresInDays: Number(e.target.value) })
                    }
                  >
                    <option value={30}>30 days</option>
                    <option value={90}>90 days</option>
                    <option value={365}>1 year</option>
                    <option value={730}>2 years</option>
                    <option value={0}>Never</option>
                  </select>
                </div>
              </div>
            )}

            <div className="modal-footer">
              {generatedKey ? (
                <button className="btn btn-primary" onClick={closeModal}>
                  Done
                </button>
              ) : (
                <>
                  <button className="btn btn-secondary" onClick={closeModal}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={createAPIKey}
                    disabled={!newKeyData.name || newKeyData.scopes.length === 0}
                  >
                    Create Key
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
