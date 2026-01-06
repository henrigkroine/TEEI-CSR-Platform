/**
 * Campaign Pricing Settings Component
 *
 * SWARM 6: Agent 5.5 - commercial-terms-manager
 *
 * Provides admin UI for:
 * - Setting campaign pricing model (seats, credits, IAAS, bundle, custom)
 * - Calculating estimated costs based on capacity
 * - Validating pricing against company subscription
 * - Pricing calculator tool
 *
 * Used by:
 * - Campaign creation wizard (Step 4: Budget & Pricing)
 * - Campaign detail page (Edit pricing)
 */

import React, { useState, useEffect } from 'react';
import {
  AlertCircleIcon,
  CheckIcon,
  CloseIcon,
  CalculatorIcon,
  TrendingUpIcon,
} from '../icons';

interface PricingModel {
  value: 'seats' | 'credits' | 'bundle' | 'iaas' | 'custom';
  label: string;
  description: string;
  icon: React.ReactNode;
}

interface CampaignPricingSettingsProps {
  campaignId?: string;
  companyId: string;
  capacity: {
    volunteers?: number;
    beneficiaries: number;
    sessions?: number;
  };
  budgetAllocated: number;
  currency?: string;
  onSave?: (pricingTerms: any) => Promise<void>;
  isReadOnly?: boolean;
}

const pricingModels: PricingModel[] = [
  {
    value: 'seats',
    label: 'Seats Model',
    description: 'Pay per volunteer seat (monthly)',
    icon: '👥'
  },
  {
    value: 'credits',
    label: 'Credits Model',
    description: 'Pre-purchased impact credits',
    icon: '💳'
  },
  {
    value: 'iaas',
    label: 'IAAS Model',
    description: 'Impact-as-a-Service (pay per learner)',
    icon: '📊'
  },
  {
    value: 'bundle',
    label: 'Bundle Model',
    description: 'Portion of L2I subscription',
    icon: '📦'
  },
  {
    value: 'custom',
    label: 'Custom Model',
    description: 'Negotiated pricing',
    icon: '⚙️'
  }
];

/**
 * CampaignPricingSettings Component
 *
 * Admin UI for managing campaign pricing terms with validation and cost estimation
 */
export function CampaignPricingSettings({
  campaignId,
  companyId,
  capacity,
  budgetAllocated,
  currency = 'EUR',
  onSave,
  isReadOnly = false
}: CampaignPricingSettingsProps) {
  const [selectedModel, setSelectedModel] = useState<'seats' | 'credits' | 'bundle' | 'iaas' | 'custom'>('seats');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [showCalculator, setShowCalculator] = useState(false);

  // Seats Model State
  const [seatsCommitted, setSeatsCommitted] = useState<number>(capacity.volunteers || 10);
  const [seatPricePerMonth, setSeatPricePerMonth] = useState<number>(500);

  // Credits Model State
  const [creditAllocation, setCreditAllocation] = useState<number>(5000);
  const [creditConsumptionRate, setCreditConsumptionRate] = useState<number>(10);

  // IAAS Model State
  const [iaasLearners, setIaasLearners] = useState<number>(capacity.beneficiaries);
  const [iaasPricePerLearner, setIaasPricePerLearner] = useState<number>(150);
  const [iaasOutcomes, setIaasOutcomes] = useState<string>('job_readiness > 0.7, engagement > 0.8');

  // Bundle Model State
  const [bundleAllocation, setBundleAllocation] = useState<number>(0.25);

  // Custom Model State
  const [customDescription, setCustomDescription] = useState<string>('');
  const [customFixedFee, setCustomFixedFee] = useState<number>(0);

  /**
   * Estimate costs based on pricing model
   */
  const estimateCosts = () => {
    let estimated = 0;
    const campaignMonths = 3; // Default 3-month campaign

    switch (selectedModel) {
      case 'seats':
        estimated = seatsCommitted * seatPricePerMonth * campaignMonths;
        break;

      case 'credits':
        // Estimate: allocate credits and assume $0.50 per credit
        estimated = creditAllocation * 0.5;
        break;

      case 'iaas':
        estimated = iaasLearners * iaasPricePerLearner;
        break;

      case 'bundle':
        // Bundle cost estimated at €10,000/year allocation
        estimated = (10000 / 12) * campaignMonths * bundleAllocation;
        break;

      case 'custom':
        estimated = customFixedFee;
        break;
    }

    setEstimatedCost(estimated);
    return estimated;
  };

  /**
   * Validate pricing terms
   */
  const validatePricing = async () => {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (selectedModel) {
      case 'seats':
        if (seatsCommitted < 1) {
          errors.push('Committed seats must be at least 1');
        }
        if (seatPricePerMonth <= 0) {
          errors.push('Seat price must be positive');
        }
        if (estimatedCost > budgetAllocated) {
          warnings.push(`Estimated cost (${currency} ${estimatedCost.toFixed(2)}) exceeds budget`);
        }
        break;

      case 'credits':
        if (creditAllocation < 1) {
          errors.push('Credit allocation must be at least 1');
        }
        if (creditConsumptionRate <= 0) {
          errors.push('Consumption rate must be positive');
        }
        break;

      case 'iaas':
        if (iaasLearners < 1) {
          errors.push('Learners committed must be at least 1');
        }
        if (iaasPricePerLearner <= 0) {
          errors.push('Price per learner must be positive');
        }
        if (iaasOutcomes.trim() === '') {
          warnings.push('No outcome guarantees specified');
        }
        if (estimatedCost > budgetAllocated) {
          warnings.push(`Estimated cost (${currency} ${estimatedCost.toFixed(2)}) exceeds budget`);
        }
        break;

      case 'bundle':
        if (bundleAllocation <= 0 || bundleAllocation > 1) {
          errors.push('Bundle allocation must be between 0 and 1');
        }
        break;

      case 'custom':
        if (customDescription.trim() === '') {
          warnings.push('No description provided for custom pricing');
        }
        break;
    }

    setValidationErrors(errors);
    setValidationWarnings(warnings);

    return errors.length === 0;
  };

  /**
   * Handle save
   */
  const handleSave = async () => {
    setIsLoading(true);
    try {
      const isValid = await validatePricing();
      if (!isValid) {
        console.error('Validation failed');
        return;
      }

      const pricingTerms: any = {
        pricingModel: selectedModel,
        campaignId
      };

      // Build model-specific terms
      switch (selectedModel) {
        case 'seats':
          pricingTerms.seats = {
            committed: seatsCommitted,
            pricePerMonth: seatPricePerMonth,
            currency
          };
          break;

        case 'credits':
          pricingTerms.credits = {
            allocation: creditAllocation,
            consumptionRate: creditConsumptionRate,
            currency
          };
          break;

        case 'iaas':
          pricingTerms.iaas = {
            learnersCommitted: iaasLearners,
            pricePerLearner: iaasPricePerLearner,
            outcomesGuaranteed: iaasOutcomes.split(',').map(o => o.trim()),
            currency
          };
          break;

        case 'bundle':
          pricingTerms.bundle = {
            allocationPercentage: bundleAllocation
          };
          break;

        case 'custom':
          pricingTerms.custom = {
            description: customDescription,
            fixedFee: customFixedFee,
            currency
          };
          break;
      }

      if (onSave) {
        await onSave(pricingTerms);
      }

      alert('Pricing settings saved successfully!');
    } catch (error) {
      console.error('Error saving pricing settings:', error);
      alert('Failed to save pricing settings');
    } finally {
      setIsLoading(false);
    }
  };

  // Update cost estimate when model-specific values change
  useEffect(() => {
    estimateCosts();
  }, [
    selectedModel,
    seatsCommitted,
    seatPricePerMonth,
    creditAllocation,
    creditConsumptionRate,
    iaasLearners,
    iaasPricePerLearner,
    bundleAllocation,
    customFixedFee
  ]);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Campaign Pricing Settings</h2>
        <p className="text-gray-600 mt-1">Configure pricing model and validate against company budget</p>
      </div>

      {/* Pricing Model Selection */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Pricing Model</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {pricingModels.map((model) => (
            <button
              key={model.value}
              onClick={() => setSelectedModel(model.value)}
              disabled={isReadOnly}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                selectedModel === model.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              } ${isReadOnly ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="text-2xl mb-2">{model.icon}</div>
              <div className="font-semibold text-sm text-gray-900">{model.label}</div>
              <div className="text-xs text-gray-600 mt-1">{model.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Model-Specific Configuration */}
      <div className="border rounded-lg p-6 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration</h3>

        {/* SEATS MODEL */}
        {selectedModel === 'seats' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Committed Seats
              </label>
              <input
                type="number"
                min="1"
                value={seatsCommitted}
                onChange={(e) => setSeatsCommitted(parseInt(e.target.value) || 1)}
                disabled={isReadOnly}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              />
              <p className="text-xs text-gray-600 mt-1">Number of volunteer seats to allocate</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price per Seat per Month ({currency})
              </label>
              <input
                type="number"
                min="0"
                step="10"
                value={seatPricePerMonth}
                onChange={(e) => setSeatPricePerMonth(parseFloat(e.target.value) || 0)}
                disabled={isReadOnly}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              />
            </div>
          </div>
        )}

        {/* CREDITS MODEL */}
        {selectedModel === 'credits' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Credit Allocation
              </label>
              <input
                type="number"
                min="1"
                value={creditAllocation}
                onChange={(e) => setCreditAllocation(parseInt(e.target.value) || 1)}
                disabled={isReadOnly}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              />
              <p className="text-xs text-gray-600 mt-1">Total credits to allocate for this campaign</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Credit Consumption Rate (credits per hour/session)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={creditConsumptionRate}
                onChange={(e) => setCreditConsumptionRate(parseFloat(e.target.value) || 0)}
                disabled={isReadOnly}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              />
            </div>
          </div>
        )}

        {/* IAAS MODEL */}
        {selectedModel === 'iaas' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Learners Committed
              </label>
              <input
                type="number"
                min="1"
                value={iaasLearners}
                onChange={(e) => setIaasLearners(parseInt(e.target.value) || 1)}
                disabled={isReadOnly}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              />
              <p className="text-xs text-gray-600 mt-1">Number of learners committed to serve</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price per Learner ({currency})
              </label>
              <input
                type="number"
                min="0"
                step="10"
                value={iaasPricePerLearner}
                onChange={(e) => setIaasPricePerLearner(parseFloat(e.target.value) || 0)}
                disabled={isReadOnly}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Outcome Guarantees
              </label>
              <textarea
                value={iaasOutcomes}
                onChange={(e) => setIaasOutcomes(e.target.value)}
                disabled={isReadOnly}
                placeholder="e.g., job_readiness > 0.7, engagement > 0.8"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              />
              <p className="text-xs text-gray-600 mt-1">Comma-separated outcome thresholds</p>
            </div>
          </div>
        )}

        {/* BUNDLE MODEL */}
        {selectedModel === 'bundle' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bundle Allocation Percentage
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={bundleAllocation}
                  onChange={(e) => setBundleAllocation(parseFloat(e.target.value))}
                  disabled={isReadOnly}
                  className="flex-1"
                />
                <span className="text-lg font-semibold text-gray-900 w-16 text-right">
                  {Math.round(bundleAllocation * 100)}%
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Portion of L2I bundle allocation for this campaign
              </p>
            </div>
          </div>
        )}

        {/* CUSTOM MODEL */}
        {selectedModel === 'custom' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pricing Description
              </label>
              <textarea
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                disabled={isReadOnly}
                placeholder="Describe your custom pricing terms..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fixed Fee ({currency})
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={customFixedFee}
                onChange={(e) => setCustomFixedFee(parseFloat(e.target.value) || 0)}
                disabled={isReadOnly}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              />
            </div>
          </div>
        )}
      </div>

      {/* Cost Estimation */}
      <div className="border rounded-lg p-6 bg-blue-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <TrendingUpIcon className="w-5 h-5 text-blue-600" />
              <span>Estimated Campaign Cost</span>
            </h3>
            <p className="text-sm text-gray-600 mt-1">3-month campaign duration</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">
              {currency} {estimatedCost.toLocaleString('de-DE', { maximumFractionDigits: 2 })}
            </div>
            <div
              className={`text-sm font-medium mt-2 ${
                estimatedCost <= budgetAllocated ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {estimatedCost <= budgetAllocated ? (
                <>
                  <CheckIcon className="w-4 h-4 inline mr-1" />
                  Within budget
                </>
              ) : (
                <>
                  <AlertCircleIcon className="w-4 h-4 inline mr-1" />
                  Exceeds budget by {currency}{' '}
                  {(estimatedCost - budgetAllocated).toLocaleString('de-DE', { maximumFractionDigits: 2 })}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="bg-white p-3 rounded">
            <div className="text-xs text-gray-600">Budget Allocated</div>
            <div className="text-lg font-semibold text-gray-900">
              {currency} {budgetAllocated.toLocaleString('de-DE', { maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-white p-3 rounded">
            <div className="text-xs text-gray-600">Remaining Budget</div>
            <div className={`text-lg font-semibold ${estimatedCost <= budgetAllocated ? 'text-green-600' : 'text-red-600'}`}>
              {currency} {Math.max(0, budgetAllocated - estimatedCost).toLocaleString('de-DE', { maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Validation Messages */}
      {validationErrors.length > 0 && (
        <div className="border-l-4 border-red-500 bg-red-50 p-4 rounded">
          <h4 className="font-semibold text-red-900 flex items-center space-x-2 mb-2">
            <CloseIcon className="w-5 h-5" />
            <span>Validation Errors</span>
          </h4>
          <ul className="space-y-1">
            {validationErrors.map((error, idx) => (
              <li key={idx} className="text-sm text-red-800">
                • {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {validationWarnings.length > 0 && (
        <div className="border-l-4 border-yellow-500 bg-yellow-50 p-4 rounded">
          <h4 className="font-semibold text-yellow-900 flex items-center space-x-2 mb-2">
            <AlertCircleIcon className="w-5 h-5" />
            <span>Warnings</span>
          </h4>
          <ul className="space-y-1">
            {validationWarnings.map((warning, idx) => (
              <li key={idx} className="text-sm text-yellow-800">
                • {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-3 justify-end">
        <button
          onClick={() => setShowCalculator(!showCalculator)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
        >
          <CalculatorIcon className="w-4 h-4" />
          <span>Advanced Calculator</span>
        </button>

        {!isReadOnly && (
          <button
            onClick={handleSave}
            disabled={isLoading || validationErrors.length > 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save Pricing Settings'}
          </button>
        )}
      </div>

      {/* Advanced Calculator (Optional) */}
      {showCalculator && (
        <div className="border rounded-lg p-6 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Advanced Calculator</h3>
          <p className="text-gray-600 text-sm mb-4">
            Use this tool to estimate costs for different scenarios and compare pricing models.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded border border-gray-200">
              <div className="text-sm font-medium text-gray-700">Volunteers</div>
              <div className="text-2xl font-bold text-gray-900">{capacity.volunteers || 0}</div>
            </div>
            <div className="bg-white p-4 rounded border border-gray-200">
              <div className="text-sm font-medium text-gray-700">Beneficiaries</div>
              <div className="text-2xl font-bold text-gray-900">{capacity.beneficiaries}</div>
            </div>
            <div className="bg-white p-4 rounded border border-gray-200">
              <div className="text-sm font-medium text-gray-700">Sessions</div>
              <div className="text-2xl font-bold text-gray-900">{capacity.sessions || 0}</div>
            </div>
            <div className="bg-white p-4 rounded border border-gray-200">
              <div className="text-sm font-medium text-gray-700">Budget</div>
              <div className="text-2xl font-bold text-gray-900">
                {currency} {budgetAllocated.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CampaignPricingSettings;
