/**
 * MetricTooltip Component
 *
 * Educational tooltip providing explanations for various metrics
 * WCAG 2.2 AA compliant with accessible tooltip pattern
 */

import { useState, useId } from 'react';

interface Props {
  metric: string;
  label: string;
}

const METRIC_EXPLANATIONS: Record<string, MetricExplanation> = {
  sroi: {
    title: 'Social Return on Investment (SROI)',
    description:
      'SROI measures the social value generated for every dollar invested in CSR programs. A ratio of 4:1 means every $1 creates $4 of social value.',
    calculation: 'SROI = Total Social Value Created / Total Investment',
    example: 'If you invest $100,000 and create $400,000 in social value, your SROI is 4:1',
    link: '/docs/metrics/sroi',
  },
  vis: {
    title: 'Volunteer Impact Score (VIS)',
    description:
      'VIS quantifies the effectiveness and reach of employee volunteer programs, considering hours contributed, skills applied, and beneficiary impact.',
    calculation: 'VIS = (Volunteer Hours × Skill Multiplier × Impact Factor) / 100',
    example: '500 hours of skilled volunteering with high impact might yield a VIS of 85/100',
    link: '/docs/metrics/vis',
  },
  participation_rate: {
    title: 'Employee Participation Rate',
    description:
      'Percentage of employees who participated in at least one CSR activity during the reporting period. Indicates organizational engagement.',
    calculation: 'Participation Rate = (Participating Employees / Total Employees) × 100',
    example: 'If 350 of 500 employees participated, the rate is 70%',
    link: '/docs/metrics/participation',
  },
  retention: {
    title: 'Program Retention Rate',
    description:
      'Percentage of program participants who remain engaged over time. Higher retention indicates program sustainability and participant satisfaction.',
    calculation: 'Retention Rate = (Returning Participants / Total Initial Participants) × 100',
    example: 'If 80 of 100 initial participants return, retention is 80%',
    link: '/docs/metrics/retention',
  },
  beneficiaries: {
    title: 'Total Beneficiaries',
    description:
      'Number of unique individuals who directly benefited from CSR programs. Includes program participants, community members, and service recipients.',
    calculation: 'Sum of unique beneficiaries across all programs (deduplicated)',
    example: '1,250 unique beneficiaries served through various programs',
    link: '/docs/metrics/beneficiaries',
  },
  volunteer_hours: {
    title: 'Volunteer Hours',
    description:
      'Total hours contributed by employees to CSR initiatives, including skills-based volunteering, mentorship, and community service.',
    calculation: 'Sum of all documented volunteer hours across all employees',
    example: '3,200 total volunteer hours = 40 employees × 80 hours each (average)',
    link: '/docs/metrics/volunteer-hours',
  },
  impact_score: {
    title: 'Overall Impact Score',
    description:
      'Composite metric (0-100) combining SROI, engagement, scale, and sustainability factors. Provides holistic view of CSR effectiveness.',
    calculation: 'Weighted average of SROI (40%), Engagement (30%), Scale (20%), Sustainability (10%)',
    example: 'Score of 87 indicates high performance across all dimensions',
    link: '/docs/metrics/impact-score',
  },
  engagement_rate: {
    title: 'Employee Engagement Rate',
    description:
      'Percentage of employees actively participating in CSR programs. Higher rates indicate stronger organizational commitment to social impact.',
    calculation: 'Engagement Rate = (Active Participants / Total Employees) × 100',
    example: '68% engagement means 68 of every 100 employees participate',
    link: '/docs/metrics/engagement',
  },
  programs: {
    title: 'Active Programs',
    description:
      'Number of distinct CSR programs operating during the reporting period, including ongoing and completed programs with measurable outcomes.',
    calculation: 'Count of unique programs with documented activities and outcomes',
    example: '12 active programs across education, environment, and community development',
    link: '/docs/metrics/programs',
  },
};

interface MetricExplanation {
  title: string;
  description: string;
  calculation: string;
  example: string;
  link: string;
}

export default function MetricTooltip({ metric, label }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipId = useId();
  const explanation = METRIC_EXPLANATIONS[metric];

  if (!explanation) {
    return null;
  }

  return (
    <div className="metric-tooltip">
      <button
        className="tooltip-trigger"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        aria-label={`Learn more about ${label}`}
        aria-describedby={isOpen ? tooltipId : undefined}
        aria-expanded={isOpen}
        type="button"
      >
        <span className="info-icon" aria-hidden="true">
          ℹ️
        </span>
      </button>

      {isOpen && (
        <div id={tooltipId} className="tooltip-content" role="tooltip">
          <div className="tooltip-header">
            <h4>{explanation.title}</h4>
            <button
              className="close-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Close tooltip"
              type="button"
            >
              ×
            </button>
          </div>

          <div className="tooltip-body">
            <p className="description">{explanation.description}</p>

            <div className="calculation-section">
              <strong>Calculation:</strong>
              <code>{explanation.calculation}</code>
            </div>

            <div className="example-section">
              <strong>Example:</strong>
              <p>{explanation.example}</p>
            </div>

            <a href={explanation.link} className="learn-more-link" target="_blank" rel="noopener noreferrer">
              Learn more about this metric →
            </a>
          </div>
        </div>
      )}

      <style>{`
        .metric-tooltip {
          position: relative;
          display: inline-block;
        }

        .tooltip-trigger {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 1.25rem;
          height: 1.25rem;
          padding: 0;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .tooltip-trigger:hover {
          transform: scale(1.1);
        }

        .tooltip-trigger:focus {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
          border-radius: 50%;
        }

        .info-icon {
          font-size: 1rem;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .tooltip-trigger:hover .info-icon {
          opacity: 1;
        }

        .tooltip-content {
          position: absolute;
          top: calc(100% + 0.5rem);
          left: 50%;
          transform: translateX(-50%);
          background: #1f2937;
          color: white;
          padding: 0;
          border-radius: 0.5rem;
          width: 320px;
          max-width: 90vw;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
          z-index: 1000;
          animation: tooltipFadeIn 0.2s ease;
        }

        @keyframes tooltipFadeIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        .tooltip-content::before {
          content: '';
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 8px solid transparent;
          border-bottom-color: #1f2937;
        }

        .tooltip-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .tooltip-header h4 {
          margin: 0;
          font-size: 0.9375rem;
          font-weight: 600;
          color: white;
          line-height: 1.4;
          flex: 1;
        }

        .close-btn {
          width: 1.5rem;
          height: 1.5rem;
          padding: 0;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          font-size: 1.5rem;
          line-height: 1;
          cursor: pointer;
          transition: color 0.2s;
          flex-shrink: 0;
          margin-left: 0.5rem;
        }

        .close-btn:hover {
          color: white;
        }

        .close-btn:focus {
          outline: 2px solid white;
          outline-offset: 2px;
          border-radius: 0.25rem;
        }

        .tooltip-body {
          padding: 1rem;
        }

        .description {
          margin: 0 0 1rem 0;
          font-size: 0.875rem;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.95);
        }

        .calculation-section,
        .example-section {
          margin-bottom: 1rem;
        }

        .calculation-section strong,
        .example-section strong {
          display: block;
          margin-bottom: 0.5rem;
          font-size: 0.8125rem;
          color: #93c5fd;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
        }

        .calculation-section code {
          display: block;
          padding: 0.5rem;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 0.25rem;
          font-size: 0.8125rem;
          font-family: 'Courier New', monospace;
          color: #fcd34d;
          line-height: 1.5;
          overflow-x: auto;
        }

        .example-section p {
          margin: 0;
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.85);
          line-height: 1.5;
          font-style: italic;
        }

        .learn-more-link {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.8125rem;
          color: #60a5fa;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s;
        }

        .learn-more-link:hover {
          color: #93c5fd;
          text-decoration: underline;
        }

        .learn-more-link:focus {
          outline: 2px solid #60a5fa;
          outline-offset: 2px;
          border-radius: 0.25rem;
        }

        /* Mobile adjustments */
        @media (max-width: 640px) {
          .tooltip-content {
            width: 280px;
            left: auto;
            right: 0;
            transform: none;
          }

          .tooltip-content::before {
            left: auto;
            right: 1rem;
            transform: none;
          }
        }

        /* Ensure tooltip stays within viewport */
        @media (max-width: 400px) {
          .tooltip-content {
            width: calc(100vw - 2rem);
          }
        }
      `}</style>
    </div>
  );
}
