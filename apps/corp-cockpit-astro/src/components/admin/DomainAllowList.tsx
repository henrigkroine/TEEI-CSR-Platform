import React, { useState, useEffect } from 'react';

/**
 * Domain entry
 */
interface DomainEntry {
  id: string;
  domain: string;
  environment: 'production' | 'staging' | 'development';
  allowedFeatures: string[];
  createdAt: Date;
  createdBy: string;
  verified: boolean;
}

/**
 * Domain Allow-List Component
 */
export default function DomainAllowList({ companyId }: { companyId: string }) {
  const [domains, setDomains] = useState<DomainEntry[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [newEnvironment, setNewEnvironment] = useState<'production' | 'staging' | 'development'>('production');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDomains();
  }, [companyId]);

  async function loadDomains() {
    setLoading(true);
    try {
      // Mock data - would call API in production
      const mockDomains: DomainEntry[] = [
        {
          id: 'dom-001',
          domain: 'app.example.com',
          environment: 'production',
          allowedFeatures: ['embed', 'api', 'webhooks'],
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          createdBy: 'admin@example.com',
          verified: true,
        },
        {
          id: 'dom-002',
          domain: 'staging.example.com',
          environment: 'staging',
          allowedFeatures: ['embed', 'api'],
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          createdBy: 'admin@example.com',
          verified: true,
        },
        {
          id: 'dom-003',
          domain: 'localhost:3000',
          environment: 'development',
          allowedFeatures: ['embed'],
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          createdBy: 'dev@example.com',
          verified: false,
        },
      ];
      setDomains(mockDomains);
    } catch (error) {
      console.error('Failed to load domains:', error);
      setError('Failed to load domains');
    } finally {
      setLoading(false);
    }
  }

  async function addDomain() {
    if (!newDomain.trim()) {
      setError('Domain cannot be empty');
      return;
    }

    // Validate domain format
    const domainRegex = /^([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$|^localhost(:\d+)?$/;
    if (!domainRegex.test(newDomain.trim())) {
      setError('Invalid domain format');
      return;
    }

    // Check for duplicates
    if (domains.some(d => d.domain.toLowerCase() === newDomain.toLowerCase())) {
      setError('Domain already exists');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Mock implementation - would call API
      const newEntry: DomainEntry = {
        id: `dom-${Date.now()}`,
        domain: newDomain.trim(),
        environment: newEnvironment,
        allowedFeatures: ['embed'],
        createdAt: new Date(),
        createdBy: 'current-user@example.com',
        verified: false,
      };

      setDomains([...domains, newEntry]);
      setNewDomain('');
      setNewEnvironment('production');
    } catch (error) {
      console.error('Failed to add domain:', error);
      setError('Failed to add domain');
    } finally {
      setSaving(false);
    }
  }

  async function removeDomain(id: string) {
    if (!confirm('Are you sure you want to remove this domain?')) {
      return;
    }

    try {
      setDomains(domains.filter(d => d.id !== id));
    } catch (error) {
      console.error('Failed to remove domain:', error);
      setError('Failed to remove domain');
    }
  }

  async function verifyDomain(id: string) {
    try {
      // In production, this would:
      // 1. Generate a verification token
      // 2. Ask user to add DNS TXT record or meta tag
      // 3. Verify the record/tag exists
      // 4. Update domain status

      setDomains(domains.map(d =>
        d.id === id ? { ...d, verified: true } : d
      ));
    } catch (error) {
      console.error('Failed to verify domain:', error);
      setError('Failed to verify domain');
    }
  }

  function getEnvironmentBadge(env: DomainEntry['environment']) {
    const colors = {
      production: 'bg-green-100 text-green-800',
      staging: 'bg-yellow-100 text-yellow-800',
      development: 'bg-blue-100 text-blue-800',
    };
    return colors[env];
  }

  if (loading) {
    return <div className="text-center py-8">Loading domains...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Domain Allow-List</h2>
        <p className="mt-1 text-sm text-gray-600">
          Control which domains can embed your dashboards and access APIs
        </p>
      </div>

      {/* Add Domain Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Domain</h3>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Domain Name
            </label>
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onFocus={() => setError(null)}
              placeholder="app.example.com or localhost:3000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">
              Examples: app.example.com, staging.example.com, localhost:3000
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Environment
            </label>
            <select
              value={newEnvironment}
              onChange={(e) => setNewEnvironment(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="development">Development</option>
            </select>
          </div>
        </div>

        <button
          onClick={addDomain}
          disabled={saving}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {saving ? 'Adding...' : '+ Add Domain'}
        </button>
      </div>

      {/* Domain List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Configured Domains ({domains.length})</h3>
        </div>

        {domains.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            No domains configured. Add your first domain to enable embedding.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {domains.map(domain => (
              <div key={domain.id} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900 font-mono">{domain.domain}</h4>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getEnvironmentBadge(domain.environment)}`}>
                        {domain.environment}
                      </span>
                      {domain.verified ? (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded flex items-center gap-1">
                          <span>✓</span> Verified
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                          Unverified
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-gray-600 space-y-1">
                      <div>
                        <strong>Allowed Features:</strong>{' '}
                        {domain.allowedFeatures.join(', ')}
                      </div>
                      <div>
                        <strong>Added:</strong>{' '}
                        {domain.createdAt.toLocaleDateString()} by {domain.createdBy}
                      </div>
                    </div>

                    {!domain.verified && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <div className="text-sm text-yellow-800 mb-2">
                          <strong>Verification Required</strong>
                        </div>
                        <div className="text-xs text-yellow-700">
                          Add this TXT record to your DNS or meta tag to your site:
                        </div>
                        <div className="mt-2 p-2 bg-white rounded font-mono text-xs break-all">
                          teei-verification={domain.id}
                        </div>
                        <button
                          onClick={() => verifyDomain(domain.id)}
                          className="mt-2 px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 transition"
                        >
                          Check Verification
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => removeDomain(domain.id)}
                    className="ml-4 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CORS Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          🛡️ Security Information
        </h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p>
            <strong>CORS Protection:</strong> Only domains in this allow-list can make
            cross-origin requests to your dashboards and APIs.
          </p>
          <p>
            <strong>Verification:</strong> Production domains must be verified before
            they can access protected resources.
          </p>
          <p>
            <strong>Localhost:</strong> Development domains (localhost) are automatically
            allowed for testing without verification.
          </p>
        </div>
      </div>
    </div>
  );
}
