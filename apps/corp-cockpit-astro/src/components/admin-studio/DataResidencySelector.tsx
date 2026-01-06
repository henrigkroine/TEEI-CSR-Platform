/**
 * Data Residency Selector - Phase H3-B
 *
 * Allows configuration of where company data is stored and processed.
 * Wired to backend residency API with RBAC enforcement.
 *
 * AC: CRUD works with RBAC, audit log line per action, zero unsafe navigation
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface ResidencyRegion {
  id: string;
  name: string;
  code: string;
  dataCenter: string;
  complianceFrameworks: string[];
  latencyMs: number;
}

interface DataResidencySelectorProps {
  companyId: string;
}

export default function DataResidencySelector({ companyId }: DataResidencySelectorProps) {
  const queryClient = useQueryClient();
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Fetch available regions
  const { data: regions, isLoading: regionsLoading } = useQuery({
    queryKey: ['residency', 'regions'],
    queryFn: async () => {
      const response = await fetch('/api/admin-studio/residency/regions');
      if (!response.ok) throw new Error('Failed to fetch regions');
      return response.json() as Promise<ResidencyRegion[]>;
    },
  });

  // Fetch current residency configuration
  const {
    data: currentConfig,
    isLoading: configLoading,
    error: configError,
  } = useQuery({
    queryKey: ['residency', 'config', companyId],
    queryFn: async () => {
      const response = await fetch(`/api/admin-studio/residency/${companyId}`);
      if (!response.ok) throw new Error('Failed to fetch current configuration');
      return response.json();
    },
  });

  // Update residency mutation
  const updateResidency = useMutation({
    mutationFn: async (regionId: string) => {
      const response = await fetch(`/api/admin-studio/residency/${companyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regionId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update residency');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residency', 'config', companyId] });
      queryClient.invalidateQueries({ queryKey: ['admin-studio', 'audit', companyId] });
      setShowConfirmDialog(false);
      setSelectedRegion('');
    },
  });

  // Set initial selected region
  useEffect(() => {
    if (currentConfig && !selectedRegion) {
      setSelectedRegion(currentConfig.regionId);
    }
  }, [currentConfig, selectedRegion]);

  const handleRegionChange = (regionId: string) => {
    setSelectedRegion(regionId);
    if (regionId !== currentConfig?.regionId) {
      setShowConfirmDialog(true);
    }
  };

  const handleConfirmChange = () => {
    updateResidency.mutate(selectedRegion);
  };

  const handleCancelChange = () => {
    setSelectedRegion(currentConfig?.regionId || '');
    setShowConfirmDialog(false);
  };

  if (regionsLoading || configLoading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading residency configuration...</p>
      </div>
    );
  }

  if (configError) {
    return (
      <div className="error-state">
        <p>Failed to load residency configuration. Please try again.</p>
      </div>
    );
  }

  const currentRegion = regions?.find(r => r.id === currentConfig?.regionId);
  const selectedRegionData = regions?.find(r => r.id === selectedRegion);

  return (
    <div className="data-residency-selector">
      {/* Current Configuration */}
      <div className="current-config">
        <h3>Current Region</h3>
        {currentRegion && (
          <div className="region-card active">
            <div className="region-header">
              <span className="region-name">{currentRegion.name}</span>
              <span className="region-code">{currentRegion.code}</span>
            </div>
            <div className="region-details">
              <div className="detail-item">
                <span className="detail-label">Data Center:</span>
                <span className="detail-value">{currentRegion.dataCenter}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Latency:</span>
                <span className="detail-value">{currentRegion.latencyMs}ms</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Compliance:</span>
                <span className="detail-value">
                  {currentRegion.complianceFrameworks.join(', ')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Region Selector */}
      <div className="region-selector">
        <label htmlFor="region-select" className="select-label">
          Select Data Region
        </label>
        <select
          id="region-select"
          value={selectedRegion}
          onChange={(e) => handleRegionChange(e.target.value)}
          className="region-select"
          disabled={updateResidency.isPending}
          aria-describedby="region-help"
        >
          {regions?.map((region) => (
            <option key={region.id} value={region.id}>
              {region.name} ({region.code}) - {region.latencyMs}ms
            </option>
          ))}
        </select>
        <p id="region-help" className="help-text">
          Changes take effect immediately and trigger a compliance audit.
        </p>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && selectedRegionData && (
        <div className="confirm-dialog" role="dialog" aria-labelledby="dialog-title">
          <div className="dialog-content">
            <h3 id="dialog-title">Confirm Region Change</h3>
            <p className="dialog-message">
              You are about to change the data residency region from{' '}
              <strong>{currentRegion?.name}</strong> to{' '}
              <strong>{selectedRegionData.name}</strong>.
            </p>
            <div className="warning-box">
              <strong>⚠️ Warning:</strong> This change will:
              <ul>
                <li>Trigger immediate data migration</li>
                <li>Generate a compliance audit entry</li>
                <li>May affect service availability during migration</li>
              </ul>
            </div>
            <div className="dialog-actions">
              <button
                onClick={handleCancelChange}
                className="button button-secondary"
                disabled={updateResidency.isPending}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmChange}
                className="button button-primary"
                disabled={updateResidency.isPending}
              >
                {updateResidency.isPending ? 'Updating...' : 'Confirm Change'}
              </button>
            </div>
            {updateResidency.isError && (
              <div className="error-message">
                Error: {updateResidency.error.message}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .data-residency-selector {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .loading-state,
        .error-state {
          padding: 32px;
          text-align: center;
          color: var(--color-text-secondary);
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(0, 0, 0, 0.1);
          border-top-color: var(--color-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 12px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .current-config h3 {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text);
          margin-bottom: 12px;
        }

        .region-card {
          background: var(--color-bg-light, #f9fafb);
          border: 2px solid var(--color-border);
          border-radius: 8px;
          padding: 16px;
        }

        .region-card.active {
          border-color: var(--color-success, #10b981);
          background: rgba(16, 185, 129, 0.05);
        }

        .region-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .region-name {
          font-weight: 600;
          font-size: 1.125rem;
          color: var(--color-text);
        }

        .region-code {
          padding: 4px 8px;
          background: var(--color-primary);
          color: white;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .region-details {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          font-size: 0.875rem;
        }

        .detail-label {
          color: var(--color-text-secondary);
        }

        .detail-value {
          color: var(--color-text);
          font-weight: 500;
        }

        .select-label {
          display: block;
          font-weight: 600;
          margin-bottom: 8px;
          color: var(--color-text);
        }

        .region-select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--color-border);
          border-radius: 6px;
          font-size: 1rem;
          background: white;
          color: var(--color-text);
        }

        .region-select:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .help-text {
          margin-top: 8px;
          font-size: 0.875rem;
          color: var(--color-text-secondary);
        }

        .confirm-dialog {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 24px;
        }

        .dialog-content {
          background: white;
          border-radius: 12px;
          padding: 24px;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .dialog-content h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-text);
          margin-bottom: 16px;
        }

        .dialog-message {
          color: var(--color-text);
          margin-bottom: 16px;
          line-height: 1.6;
        }

        .warning-box {
          background: #fef3c7;
          border: 1px solid #fbbf24;
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 24px;
        }

        .warning-box strong {
          color: #92400e;
        }

        .warning-box ul {
          margin: 8px 0 0 20px;
          color: #92400e;
        }

        .dialog-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .button {
          padding: 10px 20px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .button-primary {
          background: var(--color-primary);
          color: white;
        }

        .button-primary:hover:not(:disabled) {
          background: var(--color-primary-dark);
        }

        .button-secondary {
          background: transparent;
          color: var(--color-text);
          border: 1px solid var(--color-border);
        }

        .button-secondary:hover:not(:disabled) {
          background: var(--color-bg-light);
        }

        .error-message {
          margin-top: 12px;
          padding: 12px;
          background: #fee2e2;
          color: #991b1b;
          border-radius: 6px;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}
