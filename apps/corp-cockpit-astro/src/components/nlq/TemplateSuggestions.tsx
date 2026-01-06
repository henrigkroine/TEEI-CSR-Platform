/**
 * NLQ Template Suggestions Component
 *
 * Grid of template cards with category filtering
 * Features:
 * - Grid of template cards
 * - Category filtering (Impact, Financial, Outcomes, etc.)
 * - Example questions for each template
 * - Click-to-populate search bar
 * - Visual icons for categories
 */

import React, { useState } from 'react';

export interface TemplateExample {
  id: string;
  category: 'impact' | 'financial' | 'engagement' | 'outcomes' | 'governance' | 'all';
  title: string;
  description: string;
  exampleQuestions: string[];
  icon?: string;
}

export interface TemplateSuggestionsProps {
  onSelectTemplate: (question: string) => void;
  className?: string;
}

// Default template examples
const DEFAULT_TEMPLATES: TemplateExample[] = [
  {
    id: 'sroi-quarterly',
    category: 'financial',
    title: 'SROI Analysis',
    description: 'Social Return on Investment metrics',
    exampleQuestions: [
      'What is our SROI for Q4 2024?',
      'Show me SROI by program',
      'Compare SROI across regions',
    ],
  },
  {
    id: 'vis-monthly',
    category: 'engagement',
    title: 'Volunteer Impact Score',
    description: 'Volunteer engagement metrics',
    exampleQuestions: [
      'What is our total volunteer impact score?',
      'Show me volunteer hours this month',
      'Which programs have the most volunteers?',
    ],
  },
  {
    id: 'outcomes-summary',
    category: 'outcomes',
    title: 'Outcomes Summary',
    description: 'Program outcomes and beneficiary impact',
    exampleQuestions: [
      'How many beneficiaries did we serve this year?',
      'Show me outcomes by demographic',
      'What are our top performing programs?',
    ],
  },
  {
    id: 'impact-trend',
    category: 'impact',
    title: 'Impact Trends',
    description: 'Track impact metrics over time',
    exampleQuestions: [
      'Show me social impact trends for the last 6 months',
      'How has our impact changed year over year?',
      'What is the trend in volunteer participation?',
    ],
  },
  {
    id: 'budget-allocation',
    category: 'financial',
    title: 'Budget Allocation',
    description: 'Program funding and expenditure',
    exampleQuestions: [
      'How is our CSR budget allocated?',
      'What is the spending by program?',
      'Show me budget utilization rate',
    ],
  },
  {
    id: 'engagement-metrics',
    category: 'engagement',
    title: 'Engagement Metrics',
    description: 'Employee and stakeholder engagement',
    exampleQuestions: [
      'What is our employee participation rate?',
      'Show me engagement by department',
      'Which initiatives have the highest engagement?',
    ],
  },
  {
    id: 'governance-compliance',
    category: 'governance',
    title: 'Governance & Compliance',
    description: 'Compliance metrics and reporting',
    exampleQuestions: [
      'What is our CSRD compliance status?',
      'Show me data quality metrics',
      'How many evidence records do we have?',
    ],
  },
  {
    id: 'impact-deep-dive',
    category: 'impact',
    title: 'Impact Deep Dive',
    description: 'Detailed impact analysis',
    exampleQuestions: [
      'Give me a detailed impact report for our education programs',
      'What is the long-term impact of our initiatives?',
      'Show me beneficiary outcomes by location',
    ],
  },
];

const CATEGORY_ICONS = {
  all: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <title>All categories</title>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
      />
    </svg>
  ),
  impact: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <title>Impact</title>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  ),
  financial: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <title>Financial</title>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  engagement: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <title>Engagement</title>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  ),
  outcomes: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <title>Outcomes</title>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  ),
  governance: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <title>Governance</title>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  ),
};

const CATEGORY_LABELS: Record<string, string> = {
  all: 'All Templates',
  impact: 'Impact',
  financial: 'Financial',
  engagement: 'Engagement',
  outcomes: 'Outcomes',
  governance: 'Governance',
};

export default function TemplateSuggestions({
  onSelectTemplate,
  className = '',
}: TemplateSuggestionsProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Filter templates by category
  const filteredTemplates =
    selectedCategory === 'all'
      ? DEFAULT_TEMPLATES
      : DEFAULT_TEMPLATES.filter((t) => t.category === selectedCategory);

  return (
    <div className={`template-suggestions ${className}`}>
      {/* Category filters */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Browse Templates
        </h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(CATEGORY_LABELS).map(([category, label]) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`inline-flex items-center px-4 py-2 rounded-lg border transition-all ${
                selectedCategory === category
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              aria-label={`Filter by ${label}`}
              aria-pressed={selectedCategory === category}
            >
              <span className="mr-2">{CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS]}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Template cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition-shadow"
          >
            {/* Template header */}
            <div className="flex items-start mb-3">
              <div className="flex-shrink-0 p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg text-primary-600 dark:text-primary-400">
                {CATEGORY_ICONS[template.category]}
              </div>
              <div className="ml-3 flex-1">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {template.title}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {template.description}
                </p>
              </div>
            </div>

            {/* Example questions */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Example Questions:
              </p>
              {template.exampleQuestions.map((question, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => onSelectTemplate(question)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-700 dark:hover:text-primary-300 rounded-md transition-colors"
                  aria-label={`Use template: ${question}`}
                >
                  <div className="flex items-start">
                    <svg
                      className="w-4 h-4 mt-0.5 mr-2 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <title>Question icon</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="line-clamp-2">{question}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <svg
            className="mx-auto w-16 h-16 text-gray-400 dark:text-gray-600 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <title>No templates icon</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No templates found
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Try selecting a different category
          </p>
        </div>
      )}
    </div>
  );
}
