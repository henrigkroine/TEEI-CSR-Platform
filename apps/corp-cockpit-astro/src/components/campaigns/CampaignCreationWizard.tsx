/**
 * Campaign Creation Wizard Component
 *
 * SWARM 6: Agent 6.3 - campaign-creation-wizard
 *
 * 5-step wizard for creating campaigns:
 * 1. Basic Info
 * 2. Program Template Selection
 * 3. Beneficiary Group Selection
 * 4. Dates & Capacity
 * 5. Pricing & Review
 */
import React, { useState, useEffect } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';
import WizardProgressBar from './WizardProgressBar';
import TemplateCard, { ProgramTemplate } from './TemplateCard';
import BeneficiaryGroupCard, { BeneficiaryGroup } from './BeneficiaryGroupCard';
import { CampaignPricingSettings } from '../admin/CampaignPricingSettings';
import './CampaignWizard.css';

interface CampaignCreationWizardProps {
  companyId: string;
}

interface CampaignFormData {
  // Step 1: Basic Info
  name: string;
  description: string;
  campaignOwnerId: string;
  internalReference: string;

  // Step 2: Program Template
  programTemplateId: string;

  // Step 3: Beneficiary Group
  beneficiaryGroupId: string;

  // Step 4: Dates & Capacity
  startDate: string;
  endDate: string;
  targetCapacity: {
    seats?: number;
    credits?: number;
    outcomeTargets?: string;
  };
  budget: number;

  // Step 5: Pricing (handled by CampaignPricingSettings component)
  pricingTerms?: any;
}

interface CompanyAdmin {
  id: string;
  name: string;
  email: string;
}

const WIZARD_STEPS = [
  { id: 1, name: 'Basic Info', description: 'Campaign details' },
  { id: 2, name: 'Program Template', description: 'Select template' },
  { id: 3, name: 'Beneficiary Group', description: 'Target audience' },
  { id: 4, name: 'Dates & Capacity', description: 'Timeline & goals' },
  { id: 5, name: 'Pricing & Review', description: 'Finalize' }
];

export function CampaignCreationWizard({ companyId }: CampaignCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    description: '',
    campaignOwnerId: '',
    internalReference: '',
    programTemplateId: '',
    beneficiaryGroupId: '',
    startDate: '',
    endDate: '',
    targetCapacity: {},
    budget: 0
  });

  // Data fetching state
  const [templates, setTemplates] = useState<ProgramTemplate[]>([]);
  const [beneficiaryGroups, setBeneficiaryGroups] = useState<BeneficiaryGroup[]>([]);
  const [companyAdmins, setCompanyAdmins] = useState<CompanyAdmin[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string>('');

  // UI state
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCancelWarning, setShowCancelWarning] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Filters for step 2 & 3
  const [templateFilter, setTemplateFilter] = useState<string>('all');
  const [groupLocationFilter, setGroupLocationFilter] = useState<string>('all');
  const [groupTypeFilter, setGroupTypeFilter] = useState<string>('all');

  /**
   * Fetch initial data on mount
   */
  useEffect(() => {
    fetchInitialData();
  }, [companyId]);

  /**
   * Track unsaved changes
   */
  useEffect(() => {
    const hasChanges = formData.name !== '' || formData.description !== '' || formData.programTemplateId !== '';
    setHasUnsavedChanges(hasChanges);
  }, [formData]);

  const fetchInitialData = async () => {
    setIsLoadingData(true);
    setDataError('');

    try {
      // Fetch program templates
      const templatesRes = await fetch('/api/program-templates');
      if (!templatesRes.ok) throw new Error('Failed to fetch program templates');
      const templatesData = await templatesRes.json();
      setTemplates(templatesData.templates || []);

      // Fetch beneficiary groups
      const groupsRes = await fetch('/api/beneficiary-groups');
      if (!groupsRes.ok) throw new Error('Failed to fetch beneficiary groups');
      const groupsData = await groupsRes.json();
      setBeneficiaryGroups(groupsData.groups || []);

      // Fetch company admins
      const adminsRes = await fetch(`/api/companies/${companyId}/users?role=admin`);
      if (!adminsRes.ok) throw new Error('Failed to fetch company admins');
      const adminsData = await adminsRes.json();
      setCompanyAdmins(adminsData.users || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setDataError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setIsLoadingData(false);
    }
  };

  /**
   * Validate current step before proceeding
   */
  const validateStep = (step: number): boolean => {
    const errors: string[] = [];

    switch (step) {
      case 1:
        if (!formData.name.trim()) {
          errors.push('Campaign name is required');
        }
        if (formData.name.length > 200) {
          errors.push('Campaign name must be 200 characters or less');
        }
        if (formData.description.length > 500) {
          errors.push('Description must be 500 characters or less');
        }
        if (!formData.campaignOwnerId) {
          errors.push('Campaign owner is required');
        }
        break;

      case 2:
        if (!formData.programTemplateId) {
          errors.push('Please select a program template');
        }
        break;

      case 3:
        if (!formData.beneficiaryGroupId) {
          errors.push('Please select a beneficiary group');
        }
        // Check compatibility
        const selectedTemplate = templates.find(t => t.id === formData.programTemplateId);
        const selectedGroup = beneficiaryGroups.find(g => g.id === formData.beneficiaryGroupId);
        if (selectedTemplate && selectedGroup) {
          const isCompatible = selectedTemplate.eligibleBeneficiaryTypes.includes(selectedGroup.groupType);
          if (!isCompatible) {
            errors.push('Selected beneficiary group is not compatible with the chosen program template');
          }
        }
        break;

      case 4:
        if (!formData.startDate) {
          errors.push('Start date is required');
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startDate = new Date(formData.startDate);
        if (startDate < today) {
          errors.push('Start date must be today or in the future');
        }
        if (formData.endDate) {
          const endDate = new Date(formData.endDate);
          if (endDate <= startDate) {
            errors.push('End date must be after start date');
          }
        }
        if (formData.budget < 0) {
          errors.push('Budget must be a positive number');
        }
        break;

      case 5:
        // Final validation before submission
        if (!formData.pricingTerms) {
          errors.push('Please configure pricing settings');
        }
        break;
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  /**
   * Navigate to next step
   */
  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5));
      setValidationErrors([]);
    }
  };

  /**
   * Navigate to previous step
   */
  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setValidationErrors([]);
  };

  /**
   * Handle cancel with warning if unsaved changes
   */
  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowCancelWarning(true);
    } else {
      window.location.href = `/cockpit/${companyId}/campaigns`;
    }
  };

  /**
   * Confirm cancel
   */
  const confirmCancel = () => {
    window.location.href = `/cockpit/${companyId}/campaigns`;
  };

  /**
   * Submit campaign
   */
  const handleSubmit = async () => {
    if (!validateStep(5)) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        companyId,
        name: formData.name,
        description: formData.description,
        campaignOwnerId: formData.campaignOwnerId,
        internalReference: formData.internalReference,
        programTemplateId: formData.programTemplateId,
        beneficiaryGroupId: formData.beneficiaryGroupId,
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        targetCapacity: formData.targetCapacity,
        budgetAllocated: formData.budget,
        pricingTerms: formData.pricingTerms,
        status: 'draft'
      };

      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create campaign');
      }

      const result = await response.json();
      const newCampaignId = result.campaign.id;

      // Redirect to campaign detail page
      window.location.href = `/cockpit/${companyId}/campaigns/${newCampaignId}`;
    } catch (error) {
      console.error('Error creating campaign:', error);
      setValidationErrors([error instanceof Error ? error.message : 'Failed to create campaign']);
      setIsSubmitting(false);
    }
  };

  /**
   * Check if beneficiary group is compatible with selected template
   */
  const isGroupCompatible = (group: BeneficiaryGroup): boolean => {
    if (!formData.programTemplateId) return true;
    const selectedTemplate = templates.find(t => t.id === formData.programTemplateId);
    if (!selectedTemplate) return true;
    return selectedTemplate.eligibleBeneficiaryTypes.includes(group.groupType);
  };

  /**
   * Filter templates
   */
  const filteredTemplates = templates.filter(template => {
    if (templateFilter === 'all') return true;
    return template.programType === templateFilter;
  });

  /**
   * Filter beneficiary groups
   */
  const filteredGroups = beneficiaryGroups.filter(group => {
    if (groupLocationFilter !== 'all' && group.location.country !== groupLocationFilter) {
      return false;
    }
    if (groupTypeFilter !== 'all' && group.groupType !== groupTypeFilter) {
      return false;
    }
    return true;
  });

  /**
   * Get selected template
   */
  const selectedTemplate = templates.find(t => t.id === formData.programTemplateId);

  /**
   * Get selected group
   */
  const selectedGroup = beneficiaryGroups.find(g => g.id === formData.beneficiaryGroupId);

  /**
   * Get selected admin
   */
  const selectedAdmin = companyAdmins.find(a => a.id === formData.campaignOwnerId);

  /**
   * Render Step 1: Basic Info
   */
  const renderStep1 = () => (
    <div className="wizard-step">
      <h2 className="step-title">Campaign Basic Information</h2>
      <p className="step-description">Provide essential details about your campaign</p>

      <div className="form-group">
        <label htmlFor="campaignName" className="form-label required">
          Campaign Name
        </label>
        <input
          id="campaignName"
          type="text"
          className="form-input"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Q1 2025 Youth Mentorship Program"
          maxLength={200}
          required
        />
        <p className="form-hint">{formData.name.length}/200 characters</p>
      </div>

      <div className="form-group">
        <label htmlFor="campaignDescription" className="form-label">
          Description (Optional)
        </label>
        <textarea
          id="campaignDescription"
          className="form-textarea"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe the campaign's purpose and goals..."
          maxLength={500}
          rows={4}
        />
        <p className="form-hint">{formData.description.length}/500 characters</p>
      </div>

      <div className="form-group">
        <label htmlFor="campaignOwner" className="form-label required">
          Campaign Owner
        </label>
        <select
          id="campaignOwner"
          className="form-select"
          value={formData.campaignOwnerId}
          onChange={(e) => setFormData({ ...formData, campaignOwnerId: e.target.value })}
          required
        >
          <option value="">Select campaign owner...</option>
          {companyAdmins.map(admin => (
            <option key={admin.id} value={admin.id}>
              {admin.name} ({admin.email})
            </option>
          ))}
        </select>
        <p className="form-hint">Company admin who will manage this campaign</p>
      </div>

      <div className="form-group">
        <label htmlFor="internalReference" className="form-label">
          Internal Reference / Campaign Code (Optional)
        </label>
        <input
          id="internalReference"
          type="text"
          className="form-input"
          value={formData.internalReference}
          onChange={(e) => setFormData({ ...formData, internalReference: e.target.value })}
          placeholder="e.g., CAMP-2025-Q1-001"
          maxLength={50}
        />
      </div>
    </div>
  );

  /**
   * Render Step 2: Program Template Selection
   */
  const renderStep2 = () => (
    <div className="wizard-step">
      <h2 className="step-title">Select Program Template</h2>
      <p className="step-description">Choose a template that matches your campaign goals</p>

      <div className="filter-bar">
        <label htmlFor="templateFilter" className="filter-label">Filter by type:</label>
        <select
          id="templateFilter"
          className="filter-select"
          value={templateFilter}
          onChange={(e) => setTemplateFilter(e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="mentorship">Mentorship</option>
          <option value="language">Language Learning</option>
          <option value="buddy">Buddy System</option>
          <option value="upskilling">Skills Development</option>
        </select>
      </div>

      {isLoadingData ? (
        <div className="loading-state">
          <Loader2 className="spinner" />
          <p>Loading templates...</p>
        </div>
      ) : (
        <div className="cards-grid">
          {filteredTemplates.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              isSelected={formData.programTemplateId === template.id}
              onSelect={(id) => setFormData({ ...formData, programTemplateId: id })}
            />
          ))}
        </div>
      )}

      {filteredTemplates.length === 0 && !isLoadingData && (
        <div className="empty-state">
          <p>No templates found matching your criteria.</p>
        </div>
      )}

      <div className="action-link">
        <a href="/cockpit/{companyId}/program-templates/new" className="link-button">
          + Create Custom Template (Coming Soon)
        </a>
      </div>
    </div>
  );

  /**
   * Render Step 3: Beneficiary Group Selection
   */
  const renderStep3 = () => (
    <div className="wizard-step">
      <h2 className="step-title">Select Beneficiary Group</h2>
      <p className="step-description">Choose the target audience for this campaign</p>

      <div className="filter-bar multi-filter">
        <div className="filter-item">
          <label htmlFor="locationFilter" className="filter-label">Location:</label>
          <select
            id="locationFilter"
            className="filter-select"
            value={groupLocationFilter}
            onChange={(e) => setGroupLocationFilter(e.target.value)}
          >
            <option value="all">All Locations</option>
            {Array.from(new Set(beneficiaryGroups.map(g => g.location.country))).map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label htmlFor="groupTypeFilter" className="filter-label">Group Type:</label>
          <select
            id="groupTypeFilter"
            className="filter-select"
            value={groupTypeFilter}
            onChange={(e) => setGroupTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            {Array.from(new Set(beneficiaryGroups.map(g => g.groupType))).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoadingData ? (
        <div className="loading-state">
          <Loader2 className="spinner" />
          <p>Loading beneficiary groups...</p>
        </div>
      ) : (
        <div className="cards-grid">
          {filteredGroups.map(group => (
            <BeneficiaryGroupCard
              key={group.id}
              group={group}
              isSelected={formData.beneficiaryGroupId === group.id}
              isCompatible={isGroupCompatible(group)}
              onSelect={(id) => setFormData({ ...formData, beneficiaryGroupId: id })}
            />
          ))}
        </div>
      )}

      {filteredGroups.length === 0 && !isLoadingData && (
        <div className="empty-state">
          <p>No beneficiary groups found matching your criteria.</p>
        </div>
      )}

      <div className="action-link">
        <a href="/cockpit/{companyId}/beneficiary-groups/new" className="link-button">
          + Create New Beneficiary Group (Coming Soon)
        </a>
      </div>
    </div>
  );

  /**
   * Render Step 4: Dates & Capacity
   */
  const renderStep4 = () => (
    <div className="wizard-step">
      <h2 className="step-title">Campaign Timeline & Capacity</h2>
      <p className="step-description">Set dates, capacity targets, and budget</p>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="startDate" className="form-label required">
            Start Date
          </label>
          <input
            id="startDate"
            type="date"
            className="form-input"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="endDate" className="form-label">
            End Date (Optional)
          </label>
          <input
            id="endDate"
            type="date"
            className="form-input"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
          />
        </div>
      </div>

      <div className="capacity-section">
        <h3 className="subsection-title">Target Capacity</h3>
        <p className="subsection-description">
          Define capacity targets based on your pricing model selection in the next step
        </p>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="seats" className="form-label">
              Volunteer Seats (for Seats model)
            </label>
            <input
              id="seats"
              type="number"
              className="form-input"
              value={formData.targetCapacity.seats || ''}
              onChange={(e) => setFormData({
                ...formData,
                targetCapacity: { ...formData.targetCapacity, seats: parseInt(e.target.value) || undefined }
              })}
              min="0"
              placeholder="e.g., 50"
            />
          </div>

          <div className="form-group">
            <label htmlFor="credits" className="form-label">
              Credits (for Credits model)
            </label>
            <input
              id="credits"
              type="number"
              className="form-input"
              value={formData.targetCapacity.credits || ''}
              onChange={(e) => setFormData({
                ...formData,
                targetCapacity: { ...formData.targetCapacity, credits: parseInt(e.target.value) || undefined }
              })}
              min="0"
              placeholder="e.g., 5000"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="outcomeTargets" className="form-label">
            Outcome Targets (for IAAS model)
          </label>
          <textarea
            id="outcomeTargets"
            className="form-textarea"
            value={formData.targetCapacity.outcomeTargets || ''}
            onChange={(e) => setFormData({
              ...formData,
              targetCapacity: { ...formData.targetCapacity, outcomeTargets: e.target.value }
            })}
            placeholder="e.g., job_readiness > 0.75, engagement > 0.85"
            rows={2}
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="budget" className="form-label">
          Budget Allocated (EUR)
        </label>
        <input
          id="budget"
          type="number"
          className="form-input"
          value={formData.budget || ''}
          onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })}
          min="0"
          step="100"
          placeholder="e.g., 50000"
        />
        <p className="form-hint">Total budget allocated for this campaign</p>
      </div>
    </div>
  );

  /**
   * Render Step 5: Pricing & Review
   */
  const renderStep5 = () => (
    <div className="wizard-step">
      <h2 className="step-title">Pricing & Review</h2>
      <p className="step-description">Configure pricing and review all campaign details</p>

      {/* Campaign Summary */}
      <div className="review-section">
        <h3 className="review-title">Campaign Summary</h3>
        <div className="review-grid">
          <div className="review-item">
            <div className="review-label">Campaign Name</div>
            <div className="review-value">{formData.name}</div>
          </div>
          {formData.description && (
            <div className="review-item full-width">
              <div className="review-label">Description</div>
              <div className="review-value">{formData.description}</div>
            </div>
          )}
          <div className="review-item">
            <div className="review-label">Campaign Owner</div>
            <div className="review-value">{selectedAdmin?.name || 'N/A'}</div>
          </div>
          {formData.internalReference && (
            <div className="review-item">
              <div className="review-label">Internal Reference</div>
              <div className="review-value">{formData.internalReference}</div>
            </div>
          )}
          <div className="review-item">
            <div className="review-label">Program Template</div>
            <div className="review-value">{selectedTemplate?.name || 'N/A'}</div>
          </div>
          <div className="review-item">
            <div className="review-label">Beneficiary Group</div>
            <div className="review-value">{selectedGroup?.name || 'N/A'}</div>
          </div>
          <div className="review-item">
            <div className="review-label">Start Date</div>
            <div className="review-value">{formData.startDate || 'N/A'}</div>
          </div>
          <div className="review-item">
            <div className="review-label">End Date</div>
            <div className="review-value">{formData.endDate || 'Ongoing'}</div>
          </div>
          <div className="review-item">
            <div className="review-label">Budget</div>
            <div className="review-value">EUR {formData.budget.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Pricing Configuration */}
      <div className="pricing-section">
        <CampaignPricingSettings
          companyId={companyId}
          capacity={{
            volunteers: formData.targetCapacity.seats,
            beneficiaries: selectedGroup?.demographics.size || 0,
            sessions: 0
          }}
          budgetAllocated={formData.budget}
          currency="EUR"
          onSave={async (pricingTerms) => {
            setFormData({ ...formData, pricingTerms });
          }}
        />
      </div>

      {/* Projected Impact */}
      <div className="review-section">
        <h3 className="review-title">Projected Impact</h3>
        <div className="impact-notice">
          <AlertCircle className="notice-icon" />
          <p>SROI and impact projections will be calculated after the first 30 days of campaign activity.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="campaign-wizard">
      {/* Progress Bar */}
      <WizardProgressBar currentStep={currentStep} steps={WIZARD_STEPS} />

      {/* Data Loading Error */}
      {dataError && (
        <div className="error-banner">
          <AlertCircle className="error-icon" />
          <div>
            <strong>Error loading data:</strong> {dataError}
          </div>
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="error-banner">
          <AlertCircle className="error-icon" />
          <div>
            <strong>Please fix the following errors:</strong>
            <ul className="error-list">
              {validationErrors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="step-content">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}
      </div>

      {/* Navigation Buttons */}
      <div className="wizard-actions">
        <button
          type="button"
          onClick={handleCancel}
          className="btn btn-cancel"
          disabled={isSubmitting}
        >
          Cancel
        </button>

        <div className="action-group">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handlePrevious}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              <ChevronLeft className="btn-icon" />
              Previous
            </button>
          )}

          {currentStep < 5 && (
            <button
              type="button"
              onClick={handleNext}
              className="btn btn-primary"
            >
              Next
              <ChevronRight className="btn-icon" />
            </button>
          )}

          {currentStep === 5 && (
            <button
              type="button"
              onClick={handleSubmit}
              className="btn btn-success"
              disabled={isSubmitting || validationErrors.length > 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="btn-icon spinner" />
                  Creating Campaign...
                </>
              ) : (
                'Create Campaign'
              )}
            </button>
          )}
        </div>
      </div>

      {/* Cancel Warning Modal */}
      {showCancelWarning && (
        <div className="modal-overlay" onClick={() => setShowCancelWarning(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Discard Changes?</h3>
              <button
                type="button"
                onClick={() => setShowCancelWarning(false)}
                className="modal-close"
                aria-label="Close dialog"
              >
                <X />
              </button>
            </div>
            <div className="modal-body">
              <p>You have unsaved changes. Are you sure you want to cancel?</p>
              <p className="warning-text">All progress will be lost.</p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setShowCancelWarning(false)}
                className="btn btn-secondary"
              >
                Continue Editing
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                className="btn btn-danger"
              >
                Discard & Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CampaignCreationWizard;
