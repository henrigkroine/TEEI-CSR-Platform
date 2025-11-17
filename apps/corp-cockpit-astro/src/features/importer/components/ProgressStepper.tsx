import React from 'react';

type Step = 'upload' | 'map' | 'preview' | 'commit' | 'complete';

interface ProgressStepperProps {
  currentStep: Step;
}

const STEPS: { id: Step; label: string }[] = [
  { id: 'upload', label: 'Upload' },
  { id: 'map', label: 'Map Fields' },
  { id: 'preview', label: 'Preview' },
  { id: 'commit', label: 'Import' },
];

export function ProgressStepper({ currentStep }: ProgressStepperProps) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="progress-stepper">
      {STEPS.map((step, index) => (
        <div
          key={step.id}
          className={`step ${index <= currentIndex ? 'active' : ''} ${
            index < currentIndex ? 'completed' : ''
          }`}
        >
          <div className="step-circle">
            {index < currentIndex ? '✓' : index + 1}
          </div>
          <div className="step-label">{step.label}</div>
        </div>
      ))}

      <style>{`
        .progress-stepper {
          display: flex;
          justify-content: space-between;
          position: relative;
          margin: 2rem 0;
        }

        .progress-stepper::before {
          content: '';
          position: absolute;
          top: 20px;
          left: 10%;
          right: 10%;
          height: 2px;
          background: #e5e7eb;
          z-index: 0;
        }

        .step {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          z-index: 1;
        }

        .step-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #e5e7eb;
          color: #6b7280;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          margin-bottom: 0.5rem;
          transition: all 0.3s;
        }

        .step.active .step-circle {
          background: #2563eb;
          color: white;
        }

        .step.completed .step-circle {
          background: #10b981;
          color: white;
        }

        .step-label {
          font-size: 0.875rem;
          color: #6b7280;
          font-weight: 500;
        }

        .step.active .step-label {
          color: #2563eb;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
