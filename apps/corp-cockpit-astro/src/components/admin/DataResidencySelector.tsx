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
          </div>
        </div>
      )}

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
        </div>
      )}
    </div>
  );
}
