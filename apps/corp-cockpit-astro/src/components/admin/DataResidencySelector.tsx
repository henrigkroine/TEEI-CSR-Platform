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
          </div>
        </div>
      )}

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
        </div>
      )}
    </div>
  );
}
