/**
 * Answer Card Component Stories
 *
 * Example usage and documentation for NLQ Answer Card components
 */

import { AnswerCard } from './index';
import type { AnswerCardProps } from '../../types/nlq';

export default {
  title: 'NLQ/AnswerCard',
  component: AnswerCard,
};

/**
 * Sample data for demos
 */
const sampleAnswer: AnswerCardProps = {
  queryId: 'q-001',
  question: 'What are the top 5 programs by volunteer hours?',
  answer: {
    summary: 'Based on the data from Q1 2024, the top 5 programs by volunteer hours are led by the Community Garden Initiative with 1,245 hours, followed by English Language Classes with 1,120 hours. These programs have shown consistent growth over the past quarter, with the Community Garden Initiative seeing a 23% increase in volunteer participation.',
    data: [
      { program: 'Community Garden Initiative', hours: 1245, volunteers: 52 },
      { program: 'English Language Classes', hours: 1120, volunteers: 45 },
      { program: 'Youth Mentorship', hours: 980, volunteers: 38 },
      { program: 'Food Bank Operations', hours: 875, volunteers: 62 },
      { program: 'Senior Care Visits', hours: 720, volunteers: 28 },
    ],
    confidence: {
      overall: 0.92,
      components: {
        queryUnderstanding: 0.95,
        dataRelevance: 0.91,
        calculationAccuracy: 0.94,
        completeness: 0.88,
      },
      reasoning: 'High confidence based on complete data coverage for Q1 2024 and clear query intent.',
    },
    lineage: {
      dataSources: [
        {
          id: 'ds-001',
          name: 'Volunteer Hours Database',
          type: 'database',
          recordCount: 3420,
          lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'ds-002',
          name: 'Program Registry',
          type: 'database',
          recordCount: 125,
          lastUpdated: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
      transformations: [
        {
          step: 1,
          operation: 'Filter by Date Range',
          description: 'Filtered volunteer hours records for Q1 2024 (Jan 1 - Mar 31)',
          inputCount: 3420,
          outputCount: 892,
        },
        {
          step: 2,
          operation: 'Aggregate by Program',
          description: 'Grouped hours by program and calculated total hours and volunteer counts',
          inputCount: 892,
          outputCount: 125,
        },
        {
          step: 3,
          operation: 'Sort and Limit',
          description: 'Sorted by total hours (descending) and limited to top 5 programs',
          inputCount: 125,
          outputCount: 5,
        },
      ],
      evidenceSnippets: [
        {
          id: 'ev-001',
          evidenceId: 'evd-community-garden-2024-q1',
          text: 'Community Garden Initiative recorded 1,245 volunteer hours across 52 unique volunteers during Q1 2024, representing a 23% increase from Q4 2023.',
          source: 'Volunteer Hours Summary Report',
          relevance: 0.95,
          highlighted: true,
        },
        {
          id: 'ev-002',
          evidenceId: 'evd-english-classes-2024-q1',
          text: 'English Language Classes maintained strong participation with 1,120 hours from 45 volunteers, with sessions held twice weekly at 3 community centers.',
          source: 'Program Activity Log',
          relevance: 0.88,
        },
      ],
    },
    visualization: {
      type: 'bar',
      autoDetected: true,
    },
  },
  metadata: {
    executionTimeMs: 145,
    cached: false,
    timestamp: new Date().toISOString(),
    modelVersion: 'nlq-v2.1',
    tokensUsed: 2840,
  },
  onFeedback: (rating) => console.log('Feedback:', rating),
  onExport: (format) => console.log('Export as:', format),
  onLineageExpand: () => console.log('Lineage expanded'),
};

/**
 * High confidence answer with cached result
 */
export const HighConfidence = () => (
  <div className="p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
    <AnswerCard {...sampleAnswer} />
  </div>
);

/**
 * Medium confidence answer with recommendations
 */
export const MediumConfidence = () => {
  const mediumConfidenceAnswer: AnswerCardProps = {
    ...sampleAnswer,
    queryId: 'q-002',
    question: 'How has volunteer engagement changed over the past year?',
    answer: {
      ...sampleAnswer.answer,
      summary: 'Volunteer engagement has shown mixed trends over the past year. Overall participation increased by 12%, but there are some data gaps in Q2 that may affect accuracy.',
      confidence: {
        overall: 0.68,
        components: {
          queryUnderstanding: 0.85,
          dataRelevance: 0.72,
          calculationAccuracy: 0.65,
          completeness: 0.52,
        },
        reasoning: 'Medium confidence due to incomplete data coverage in Q2 2023 and ambiguous date range interpretation.',
        recommendations: [
          'Consider specifying exact date ranges for more accurate results',
          'Review Q2 2023 data completeness in the source systems',
          'Use "Show Lineage" to see which data sources contributed to this answer',
        ],
      },
    },
    metadata: {
      ...sampleAnswer.metadata,
      cached: true,
      executionTimeMs: 32,
    },
  };

  return (
    <div className="p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <AnswerCard {...mediumConfidenceAnswer} />
    </div>
  );
};

/**
 * Low confidence answer
 */
export const LowConfidence = () => {
  const lowConfidenceAnswer: AnswerCardProps = {
    ...sampleAnswer,
    queryId: 'q-003',
    question: 'What is the predicted volunteer retention rate for next quarter?',
    answer: {
      ...sampleAnswer.answer,
      summary: 'Based on limited historical data, the predicted volunteer retention rate for next quarter is approximately 72%, though this estimate has significant uncertainty.',
      confidence: {
        overall: 0.42,
        components: {
          queryUnderstanding: 0.78,
          dataRelevance: 0.45,
          calculationAccuracy: 0.38,
          completeness: 0.28,
        },
        reasoning: 'Low confidence due to predictive nature of query, limited historical retention data, and lack of seasonal adjustment factors.',
        recommendations: [
          'Collect more historical retention data for better predictions',
          'Consider using retention-specific analytics tools',
          'Rephrase as a historical query for more accurate results',
          'Add seasonal and program-specific factors to the analysis',
        ],
      },
    },
    metadata: {
      ...sampleAnswer.metadata,
      executionTimeMs: 523,
    },
  };

  return (
    <div className="p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <AnswerCard {...lowConfidenceAnswer} />
    </div>
  );
};

/**
 * Line chart visualization
 */
export const LineChartVisualization = () => {
  const lineChartAnswer: AnswerCardProps = {
    ...sampleAnswer,
    queryId: 'q-004',
    question: 'Show me volunteer hours by month for 2024',
    answer: {
      ...sampleAnswer.answer,
      summary: 'Volunteer hours in 2024 have shown steady growth, starting at 3,200 hours in January and increasing to 4,100 hours by May, representing a 28% increase.',
      data: [
        { month: 'Jan', hours: 3200 },
        { month: 'Feb', hours: 3450 },
        { month: 'Mar', hours: 3680 },
        { month: 'Apr', hours: 3920 },
        { month: 'May', hours: 4100 },
      ],
      visualization: {
        type: 'line',
        autoDetected: true,
      },
    },
  };

  return (
    <div className="p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <AnswerCard {...lineChartAnswer} />
    </div>
  );
};

/**
 * Pie chart visualization
 */
export const PieChartVisualization = () => {
  const pieChartAnswer: AnswerCardProps = {
    ...sampleAnswer,
    queryId: 'q-005',
    question: 'What is the distribution of volunteers by age group?',
    answer: {
      ...sampleAnswer.answer,
      summary: 'The volunteer base is well-distributed across age groups, with the largest segment being 25-34 year olds (32%), followed by 35-44 year olds (28%).',
      data: [
        { age_group: '18-24', count: 45 },
        { age_group: '25-34', count: 98 },
        { age_group: '35-44', count: 85 },
        { age_group: '45-54', count: 62 },
        { age_group: '55+', count: 55 },
      ],
      visualization: {
        type: 'pie',
        autoDetected: true,
      },
    },
  };

  return (
    <div className="p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <AnswerCard {...pieChartAnswer} />
    </div>
  );
};

/**
 * Multiple answer cards
 */
export const MultipleAnswers = () => (
  <div className="p-8 bg-gray-50 dark:bg-gray-900 min-h-screen space-y-6">
    <AnswerCard {...sampleAnswer} />
    <AnswerCard
      {...{
        ...sampleAnswer,
        queryId: 'q-006',
        question: 'What is the average volunteer satisfaction score?',
        answer: {
          ...sampleAnswer.answer,
          summary: 'The average volunteer satisfaction score is 4.2 out of 5.0, based on 234 survey responses collected in Q1 2024.',
          data: [
            { metric: 'Overall Satisfaction', score: 4.2 },
            { metric: 'Program Organization', score: 4.5 },
            { metric: 'Communication', score: 4.1 },
            { metric: 'Impact Perception', score: 4.3 },
          ],
        },
        metadata: {
          ...sampleAnswer.metadata,
          cached: true,
          executionTimeMs: 28,
        },
      }}
    />
  </div>
);
