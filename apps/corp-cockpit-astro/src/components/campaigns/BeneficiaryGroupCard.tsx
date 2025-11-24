/**
 * Beneficiary Group Card Component
 *
 * SWARM 6: Agent 6.3 - campaign-creation-wizard
 *
 * Displays beneficiary group information as a selectable card
 */
import React from 'react';
import { MapPin, Users, AlertCircle, CheckCircle } from 'lucide-react';

export interface BeneficiaryGroup {
  id: string;
  name: string;
  location: {
    country: string;
    city?: string;
  };
  groupType: string;
  demographics: {
    ageRange?: string;
    size: number;
    description?: string;
  };
}

interface BeneficiaryGroupCardProps {
  group: BeneficiaryGroup;
  isSelected: boolean;
  isCompatible: boolean;
  onSelect: (groupId: string) => void;
}

export function BeneficiaryGroupCard({
  group,
  isSelected,
  isCompatible,
  onSelect
}: BeneficiaryGroupCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(group.id)}
      className={`beneficiary-card ${isSelected ? 'selected' : ''} ${!isCompatible ? 'incompatible' : ''}`}
      aria-pressed={isSelected}
      disabled={!isCompatible}
    >
      <div className="beneficiary-header">
        <h3 className="beneficiary-name">{group.name}</h3>
        {!isCompatible && (
          <div className="compatibility-badge incompatible">
            <AlertCircle className="badge-icon" aria-hidden="true" />
            <span className="badge-text">Incompatible</span>
          </div>
        )}
        {isCompatible && (
          <div className="compatibility-badge compatible">
            <CheckCircle className="badge-icon" aria-hidden="true" />
            <span className="badge-text">Compatible</span>
          </div>
        )}
      </div>

      <div className="beneficiary-body">
        <div className="beneficiary-meta">
          <MapPin className="meta-icon" aria-hidden="true" />
          <span className="meta-text">
            {group.location.city ? `${group.location.city}, ` : ''}{group.location.country}
          </span>
        </div>

        <div className="beneficiary-meta">
          <Users className="meta-icon" aria-hidden="true" />
          <span className="meta-text">
            {group.demographics.size} members
          </span>
        </div>

        <div className="group-type-badge">
          {group.groupType}
        </div>

        {group.demographics.ageRange && (
          <div className="demographic-info">
            Age Range: {group.demographics.ageRange}
          </div>
        )}

        {group.demographics.description && (
          <p className="beneficiary-description">
            {group.demographics.description}
          </p>
        )}
      </div>

      {isSelected && (
        <div className="selected-indicator" aria-hidden="true">
          <div className="checkmark">✓</div>
        </div>
      )}
    </button>
  );
}

export default BeneficiaryGroupCard;
