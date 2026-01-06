/**
 * Wizard Progress Bar Component
 *
 * SWARM 6: Agent 6.3 - campaign-creation-wizard
 *
 * Displays a 5-step progress indicator for the campaign creation wizard
 */
import React from 'react';
import { CheckIcon } from '../icons';

interface Step {
  id: number;
  name: string;
  description: string;
}

interface WizardProgressBarProps {
  currentStep: number;
  steps: Step[];
}

export function WizardProgressBar({ currentStep, steps }: WizardProgressBarProps) {
  return (
    <nav aria-label="Campaign creation progress" className="wizard-progress">
      <ol className="steps-list">
        {steps.map((step, index) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isPending = step.id > currentStep;

          return (
            <li
              key={step.id}
              className={`step-item ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isPending ? 'pending' : ''}`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <div className="step-indicator">
                <div className="step-circle">
                  {isCompleted ? (
                    <CheckIcon className="check-icon" aria-hidden="true" />
                  ) : (
                    <span className="step-number">{step.id}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`step-connector ${isCompleted ? 'completed' : ''}`} aria-hidden="true"></div>
                )}
              </div>
              <div className="step-content">
                <div className="step-name">{step.name}</div>
                <div className="step-description">{step.description}</div>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default WizardProgressBar;
