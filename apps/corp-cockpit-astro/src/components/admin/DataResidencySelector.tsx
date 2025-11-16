<<<<<<< HEAD
/**
 * Data Residency Selector Component (Phase H3-B)
 *
 * Allows administrators to configure where company data is stored.
 * Supports multiple geographic regions with compliance requirements.
 *
 * Features:
 * - Select primary data region
 * - Configure backup regions
 * - Display compliance badges (GDPR, CCPA, etc.)
 * - Show data transfer restrictions
 * - Audit log for residency changes
 * - RBAC enforcement
 *
 * API Integration:
 * - GET /api/admin/residency - Get current residency config
 * - PUT /api/admin/residency - Update residency config
 * - GET /api/admin/residency/regions - Get available regions
 *
 * @module DataResidencySelector
 */

import { useState, useEffect } from 'react';
import { createApiClient } from '../../lib/api';

export interface DataRegion {
  id: string;
  name: string;
  code: string; // e.g., 'eu-west-1', 'us-east-1'
  country: string;
  compliance: string[]; // e.g., ['GDPR', 'ISO-27001']
  latency: number; // Estimated latency in ms
  available: boolean;
}

export interface ResidencyConfig {
  primaryRegion: string;
  backupRegions: string[];
  enforceLocalProcessing: boolean;
  allowCrossBorderTransfer: boolean;
  complianceFrameworks: string[];
  lastUpdated: string;
  updatedBy: string;
}

export interface DataResidencySelectorProps {
  companyId: string;
  /** Whether user can edit (RBAC check) */
  canEdit?: boolean;
  /** Callback when residency is updated */
  onUpdate?: (config: ResidencyConfig) => void;
}

export default function DataResidencySelector({
  companyId,
  canEdit = false,
  onUpdate,
}: DataResidencySelectorProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regions, setRegions] = useState<DataRegion[]>([]);
  const [config, setConfig] = useState<ResidencyConfig | null>(null);
  const [editedConfig, setEditedConfig] = useState<ResidencyConfig | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const api = createApiClient();

  // Load regions and current config
  useEffect(() => {
    loadData();
  }, [companyId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load available regions
      const regionsResponse = await api.get<DataRegion[]>('/api/admin/residency/regions');
      setRegions(regionsResponse);

      // Load current config
      const configResponse = await api.get<ResidencyConfig>(
        `/api/admin/residency?companyId=${companyId}`
      );
      setConfig(configResponse);
      setEditedConfig(configResponse);
    } catch (err: any) {
      console.error('[DataResidencySelector] Load failed:', err);
      setError(err.message || 'Failed to load residency configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editedConfig) return;

    setSaving(true);
    setError(null);

    try {
      const updatedConfig = await api.put<ResidencyConfig>('/api/admin/residency', {
        companyId,
        ...editedConfig,
      });

      setConfig(updatedConfig);
      setEditedConfig(updatedConfig);
      setIsEditing(false);

      onUpdate?.(updatedConfig);
    } catch (err: any) {
      console.error('[DataResidencySelector] Save failed:', err);
      setError(err.message || 'Failed to save residency configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedConfig(config);
    setIsEditing(false);
    setError(null);
  };

  const handlePrimaryRegionChange = (regionId: string) => {
    if (!editedConfig) return;

    setEditedConfig({
      ...editedConfig,
      primaryRegion: regionId,
    });
  };

  const handleBackupRegionToggle = (regionId: string) => {
    if (!editedConfig) return;

    const backupRegions = editedConfig.backupRegions.includes(regionId)
      ? editedConfig.backupRegions.filter((r) => r !== regionId)
      : [...editedConfig.backupRegions, regionId];

    setEditedConfig({
      ...editedConfig,
      backupRegions,
    });
  };

  const getRegion = (regionId: string): DataRegion | undefined => {
    return regions.find((r) => r.id === regionId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading residency configuration...</div>
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-red-500 text-xl">⚠️</span>
          <div>
            <div className="font-semibold text-red-800">Error</div>
            <div className="text-red-600 text-sm">{error}</div>
            <button
              onClick={loadData}
              className="mt-2 text-sm text-red-700 underline hover:text-red-800"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const primaryRegion = config ? getRegion(config.primaryRegion) : null;

  return (
    <div className="data-residency-selector space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Data Residency Configuration</h3>
          <p className="text-sm text-gray-500 mt-1">
            Configure where your company's data is stored and processed
          </p>
        </div>

        {canEdit && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                     transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Edit Configuration
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="text-red-800 text-sm">{error}</div>
        </div>
      )}

      {/* Primary Region */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="font-semibold mb-4">Primary Data Region</h4>

        {!isEditing && primaryRegion ? (
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="font-medium text-lg">{primaryRegion.name}</div>
              <div className="text-sm text-gray-500">
                {primaryRegion.country} • {primaryRegion.code}
              </div>
              <div className="flex gap-2 mt-2">
                {primaryRegion.compliance.map((badge) => (
                  <span
                    key={badge}
                    className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Latency: ~{primaryRegion.latency}ms
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {regions
              .filter((r) => r.available)
              .map((region) => (
                <label
                  key={region.id}
                  className={`
                  flex items-center gap-4 p-4 border rounded-lg cursor-pointer
                  transition-colors
                  ${editedConfig?.primaryRegion === region.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
                `}
                >
                  <input
                    type="radio"
                    name="primaryRegion"
                    value={region.id}
                    checked={editedConfig?.primaryRegion === region.id}
                    onChange={(e) => handlePrimaryRegionChange(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{region.name}</div>
                    <div className="text-sm text-gray-500">
                      {region.country} • {region.code}
                    </div>
                    <div className="flex gap-2 mt-2">
                      {region.compliance.map((badge) => (
                        <span
                          key={badge}
                          className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">~{region.latency}ms</div>
                </label>
              ))}
          </div>
        )}
      </div>

      {/* Backup Regions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="font-semibold mb-4">Backup Regions (Optional)</h4>

        {!isEditing ? (
          config && config.backupRegions.length > 0 ? (
            <div className="space-y-2">
              {config.backupRegions.map((regionId) => {
                const region = getRegion(regionId);
                return region ? (
                  <div key={regionId} className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">✓</span>
                    <span>{region.name}</span>
                    <span className="text-gray-400">({region.code})</span>
                  </div>
                ) : null;
              })}
            </div>
          ) : (
            <div className="text-sm text-gray-500">No backup regions configured</div>
          )
        ) : (
          <div className="space-y-2">
            {regions
              .filter((r) => r.available && r.id !== editedConfig?.primaryRegion)
              .map((region) => (
                <label
                  key={region.id}
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={editedConfig?.backupRegions.includes(region.id)}
                    onChange={() => handleBackupRegionToggle(region.id)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{region.name}</div>
                    <div className="text-sm text-gray-500">{region.code}</div>
                  </div>
                </label>
              ))}
          </div>
        )}
      </div>

      {/* Compliance Options */}
      {isEditing && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-semibold mb-4">Data Processing Restrictions</h4>

          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={editedConfig?.enforceLocalProcessing ?? false}
                onChange={(e) =>
                  setEditedConfig(
                    editedConfig
                      ? { ...editedConfig, enforceLocalProcessing: e.target.checked }
                      : null
                  )
                }
                className="w-4 h-4 text-blue-600 rounded"
              />
              <div>
                <div className="font-medium">Enforce local processing</div>
                <div className="text-sm text-gray-500">
                  All data processing must occur in the primary region
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={editedConfig?.allowCrossBorderTransfer ?? false}
                onChange={(e) =>
                  setEditedConfig(
                    editedConfig
                      ? { ...editedConfig, allowCrossBorderTransfer: e.target.checked }
                      : null
                  )
                }
                className="w-4 h-4 text-blue-600 rounded"
              />
              <div>
                <div className="font-medium">Allow cross-border data transfer</div>
                <div className="text-sm text-gray-500">
                  Permit data transfer between regions for backup/analytics
                </div>
              </div>
            </label>
=======
import React, { useState, useEffect } from 'react';

/**
 * Data Residency Region
 */
interface DataResidency {
  region: 'EU' | 'US' | 'UK' | 'APAC' | 'CA';
  description: string;
  endpoint: string;
  compliance: string[];
  status: 'active' | 'migrating' | 'pending';
}

/**
 * Available data residency regions
 */
const REGIONS: Record<string, Omit<DataResidency, 'status'>> = {
  EU: {
    region: 'EU',
    description: 'European Union (Frankfurt, Germany)',
    endpoint: 'eu-central-1.teei.io',
    compliance: ['GDPR', 'ISO 27001', 'SOC 2'],
  },
  US: {
    region: 'US',
    description: 'United States (Virginia)',
    endpoint: 'us-east-1.teei.io',
    compliance: ['SOC 2', 'ISO 27001', 'HIPAA'],
  },
  UK: {
    region: 'UK',
    description: 'United Kingdom (London)',
    endpoint: 'uk-london-1.teei.io',
    compliance: ['GDPR', 'UK DPA', 'ISO 27001', 'SOC 2'],
  },
  APAC: {
    region: 'APAC',
    description: 'Asia Pacific (Singapore)',
    endpoint: 'ap-southeast-1.teei.io',
    compliance: ['ISO 27001', 'SOC 2', 'PDPA'],
  },
  CA: {
    region: 'CA',
    description: 'Canada (Montreal)',
    endpoint: 'ca-central-1.teei.io',
    compliance: ['PIPEDA', 'ISO 27001', 'SOC 2'],
  },
};

/**
 * Data Residency Selector Component
 */
export default function DataResidencySelector({ companyId }: { companyId: string }) {
  const [currentRegion, setCurrentRegion] = useState<DataResidency['region']>('US');
  const [selectedRegion, setSelectedRegion] = useState<DataResidency['region']>('US');
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'confirming' | 'migrating'>('idle');
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [lastMigration, setLastMigration] = useState<Date | null>(null);

  // Load current residency
  useEffect(() => {
    loadCurrentResidency();
  }, [companyId]);

  async function loadCurrentResidency() {
    try {
      // Mock implementation - would call API
      // const response = await fetch(`/api/v1/admin/${companyId}/data-residency`);
      // const data = await response.json();
      const mockRegion: DataResidency['region'] = 'US';
      setCurrentRegion(mockRegion);
      setSelectedRegion(mockRegion);
    } catch (error) {
      console.error('Failed to load data residency:', error);
    }
  }

  async function handleMigrationConfirm() {
    if (selectedRegion === currentRegion) {
      return;
    }

    setMigrationStatus('confirming');
  }

  async function startMigration() {
    setMigrationStatus('migrating');
    setMigrationProgress(0);

    // Simulate migration progress
    const interval = setInterval(() => {
      setMigrationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setCurrentRegion(selectedRegion);
          setMigrationStatus('idle');
          setLastMigration(new Date());
          return 100;
        }
        return prev + 10;
      });
    }, 500);

    // In production, this would:
    // 1. Create migration job
    // 2. Export data from current region
    // 3. Transfer to new region
    // 4. Import data
    // 5. Verify integrity
    // 6. Update DNS/routing
    // 7. Decommission old region data
  }

  function getRegionBadge(region: DataResidency['region']) {
    const colors = {
      EU: 'bg-blue-100 text-blue-800',
      US: 'bg-purple-100 text-purple-800',
      UK: 'bg-green-100 text-green-800',
      APAC: 'bg-orange-100 text-orange-800',
      CA: 'bg-red-100 text-red-800',
    };
    return colors[region] || 'bg-gray-100 text-gray-800';
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Data Residency</h2>
        <p className="mt-1 text-sm text-gray-600">
          Control where your company's data is stored and processed
        </p>
      </div>

      {/* Current Region */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Current Region</h3>
            <p className="mt-1 text-sm text-gray-600">
              All data is currently stored in this region
            </p>
          </div>
          <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getRegionBadge(currentRegion)}`}>
            {currentRegion}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-gray-700">Location</div>
            <div className="text-sm text-gray-900 mt-1">{REGIONS[currentRegion].description}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700">Endpoint</div>
            <div className="text-sm text-gray-900 mt-1 font-mono">{REGIONS[currentRegion].endpoint}</div>
          </div>
          <div className="md:col-span-2">
            <div className="text-sm font-medium text-gray-700">Compliance</div>
            <div className="flex flex-wrap gap-2 mt-2">
              {REGIONS[currentRegion].compliance.map(cert => (
                <span key={cert} className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                  ✓ {cert}
                </span>
              ))}
            </div>
          </div>
        </div>

        {lastMigration && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <div className="text-sm text-blue-800">
              Last migration: {lastMigration.toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Migration Section */}
      {migrationStatus === 'idle' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Region</h3>
          <p className="text-sm text-gray-600 mb-4">
            Select a new region to migrate your data. This process may take several hours
            depending on data volume.
          </p>

          <div className="space-y-3">
            {Object.values(REGIONS).map(region => (
              <label
                key={region.region}
                className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition ${
                  selectedRegion === region.region
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${currentRegion === region.region ? 'opacity-50' : ''}`}
              >
                <input
                  type="radio"
                  name="region"
                  value={region.region}
                  checked={selectedRegion === region.region}
                  onChange={(e) => setSelectedRegion(e.target.value as DataResidency['region'])}
                  disabled={currentRegion === region.region}
                  className="mt-1 h-4 w-4 text-blue-600"
                />
                <div className="ml-3 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{region.region}</span>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded ${getRegionBadge(region.region)}`}>
                      {region.region}
                    </span>
                    {currentRegion === region.region && (
                      <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{region.description}</div>
                  <div className="text-xs text-gray-500 mt-1 font-mono">{region.endpoint}</div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {region.compliance.map(cert => (
                      <span key={cert} className="text-xs text-gray-600">
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>
              </label>
            ))}
          </div>

          {selectedRegion !== currentRegion && (
            <div className="mt-6">
              <button
                onClick={handleMigrationConfirm}
                className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
              >
                Initiate Migration to {selectedRegion}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {migrationStatus === 'confirming' && (
        <div className="bg-white rounded-lg shadow p-6 border-2 border-yellow-400">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Confirm Data Migration</h3>
              <div className="mt-2 text-sm text-gray-600 space-y-2">
                <p>You are about to migrate data from:</p>
                <div className="pl-4 space-y-1">
                  <div><strong>From:</strong> {REGIONS[currentRegion].description}</div>
                  <div><strong>To:</strong> {REGIONS[selectedRegion].description}</div>
                </div>
                <p className="font-semibold text-yellow-800 mt-3">Important:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>This process cannot be cancelled once started</li>
                  <li>Migration may take 2-8 hours depending on data volume</li>
                  <li>Service will remain available during migration (read-only)</li>
                  <li>All users will be notified of the maintenance window</li>
                  <li>DNS changes may take up to 24 hours to propagate</li>
                </ul>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setMigrationStatus('idle')}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={startMigration}
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition font-semibold"
                >
                  Confirm Migration
                </button>
              </div>
            </div>
>>>>>>> origin/claude/worker3-phaseH2-scheduler-admin-usage-aaa-0157u7VEQjoVVhqTBgYcuumh
          </div>
        </div>
      )}

<<<<<<< HEAD
      {/* Last Updated */}
      {config && !isEditing && (
        <div className="text-xs text-gray-500">
          Last updated: {new Date(config.lastUpdated).toLocaleString()} by {config.updatedBy}
        </div>
      )}

      {/* Action Buttons */}
      {isEditing && (
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400
                     text-white rounded-lg transition-colors
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={handleCancel}
            disabled={saving}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100
                     text-gray-800 rounded-lg transition-colors
                     focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            Cancel
          </button>
=======
      {/* Migration Progress */}
      {migrationStatus === 'migrating' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Migration in Progress</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Migrating to {selectedRegion}</span>
                <span className="font-semibold text-gray-900">{migrationProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${migrationProgress}%` }}
                />
              </div>
            </div>
            <div className="text-sm text-gray-600">
              Please do not close this window. You will be notified when migration is complete.
            </div>
          </div>
>>>>>>> origin/claude/worker3-phaseH2-scheduler-admin-usage-aaa-0157u7VEQjoVVhqTBgYcuumh
        </div>
      )}
    </div>
  );
}
