/**
 * Framework Selector Component
 * Allows users to select one or more regulatory frameworks
 */

import type { FrameworkType } from '@teei/shared-types';

interface Props {
  selected: FrameworkType[];
  onChange: (selected: FrameworkType[]) => void;
}

const FRAMEWORKS = [
  {
    id: 'CSRD' as FrameworkType,
    name: 'CSRD',
    fullName: 'Corporate Sustainability Reporting Directive',
    description: 'EU sustainability reporting standard (ESRS)',
    color: '#1e40af',
  },
  {
    id: 'GRI' as FrameworkType,
    name: 'GRI',
    fullName: 'Global Reporting Initiative',
    description: 'Widely adopted sustainability reporting standards',
    color: '#059669',
  },
  {
    id: 'SDG' as FrameworkType,
    name: 'SDG',
    fullName: 'Sustainable Development Goals',
    description: 'UN global development targets',
    color: '#dc2626',
  },
];

export function FrameworkSelector({ selected, onChange }: Props) {
  const toggleFramework = (frameworkId: FrameworkType) => {
    if (selected.includes(frameworkId)) {
      onChange(selected.filter((id) => id !== frameworkId));
    } else {
      onChange([...selected, frameworkId]);
    }
  };

  return (
    <div className="framework-selector">
      {FRAMEWORKS.map((framework) => {
        const isSelected = selected.includes(framework.id);

        return (
          <button
            key={framework.id}
            type="button"
            onClick={() => toggleFramework(framework.id)}
            className={`framework-card ${isSelected ? 'selected' : ''}`}
            style={{
              borderColor: isSelected ? framework.color : undefined,
            }}
            aria-pressed={isSelected}
          >
            <div className="framework-header">
              <div
                className="framework-badge"
                style={{ backgroundColor: framework.color }}
              >
                {framework.name}
              </div>
              <div className="framework-check">
                {isSelected && <CheckIcon />}
              </div>
            </div>
            <h3 className="framework-title">{framework.fullName}</h3>
            <p className="framework-description">{framework.description}</p>
          </button>
        );
      })}

      <style jsx>{`
        .framework-selector {
          display: grid;
          grid-template-columns: 1fr;
          gap: 15px;
        }

        .framework-card {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
          width: 100%;
        }

        .framework-card:hover {
          border-color: #d1d5db;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .framework-card.selected {
          background: #f9fafb;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
        }

        .framework-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .framework-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 4px;
          color: white;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .framework-check {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .framework-title {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 6px;
        }

        .framework-description {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
        }
      `}</style>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: '#10b981' }}
    >
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );
}
