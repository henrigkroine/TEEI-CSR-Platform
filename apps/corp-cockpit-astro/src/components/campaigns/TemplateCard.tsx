/**
 * Program Template Card Component
 *
 * SWARM 6: Agent 6.3 - campaign-creation-wizard
 *
 * Displays program template information as a selectable card
 */
import React from 'react';
import { UsersIcon, BookOpenIcon, MessageIcon, TrendingUpIcon, ClockIcon } from '../icons';

export interface ProgramTemplate {
  id: string;
  name: string;
  programType: 'mentorship' | 'language' | 'buddy' | 'upskilling';
  description: string;
  eligibleBeneficiaryTypes: string[];
  estimatedHoursPerParticipant: number;
}

interface TemplateCardProps {
  template: ProgramTemplate;
  isSelected: boolean;
  onSelect: (templateId: string) => void;
}

const programTypeIcons = {
  mentorship: UsersIcon,
  language: BookOpenIcon,
  buddy: MessageIcon,
  upskilling: TrendingUpIcon
};

const programTypeLabels = {
  mentorship: 'Mentorship',
  language: 'Language Learning',
  buddy: 'Buddy System',
  upskilling: 'Skills Development'
};

export function TemplateCard({ template, isSelected, onSelect }: TemplateCardProps) {
  const Icon = programTypeIcons[template.programType];

  return (
    <button
      type="button"
      onClick={() => onSelect(template.id)}
      className={`template-card ${isSelected ? 'selected' : ''}`}
      aria-pressed={isSelected}
    >
      <div className="template-header">
        <div className="template-icon">
          <Icon className="icon" aria-hidden="true" />
        </div>
        <div className="template-type">
          {programTypeLabels[template.programType]}
        </div>
      </div>

      <div className="template-body">
        <h3 className="template-name">{template.name}</h3>
        <p className="template-description">{template.description}</p>
      </div>

      <div className="template-footer">
        <div className="template-meta">
          <ClockIcon className="meta-icon" aria-hidden="true" />
          <span className="meta-text">
            {template.estimatedHoursPerParticipant}h per participant
          </span>
        </div>
        <div className="template-meta">
          <UsersIcon className="meta-icon" aria-hidden="true" />
          <span className="meta-text">
            {template.eligibleBeneficiaryTypes.length} eligible group types
          </span>
        </div>
      </div>

      {isSelected && (
        <div className="selected-indicator" aria-hidden="true">
          <div className="checkmark">✓</div>
        </div>
      )}
    </button>
  );
}

export default TemplateCard;
