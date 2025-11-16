/**
 * NLQ Chart Components - Examples
 *
 * Demonstrates usage of all chart components with sample data.
 * Useful for testing, development, and documentation.
 */

import React from 'react';
import AutoChart from './AutoChart';
import TrendChart from './TrendChart';
import ComparisonChart from './ComparisonChart';
import DistributionChart from './DistributionChart';
import DataTable from './DataTable';

// Sample Data Sets

const timeSeriesData = [
  { month: '2024-01', revenue: 45000, costs: 32000, profit: 13000 },
  { month: '2024-02', revenue: 48000, costs: 33000, profit: 15000 },
  { month: '2024-03', revenue: 52000, costs: 35000, profit: 17000 },
  { month: '2024-04', revenue: 51000, costs: 34000, profit: 17000 },
  { month: '2024-05', revenue: 55000, costs: 36000, profit: 19000 },
  { month: '2024-06', revenue: 58000, costs: 37000, profit: 21000 },
  { month: '2024-07', revenue: 62000, costs: 38000, profit: 24000 },
  { month: '2024-08', revenue: 60000, costs: 39000, profit: 21000 },
  { month: '2024-09', revenue: 64000, costs: 40000, profit: 24000 },
  { month: '2024-10', revenue: 67000, costs: 41000, profit: 26000 },
  { month: '2024-11', revenue: 70000, costs: 42000, profit: 28000 },
  { month: '2024-12', revenue: 75000, costs: 43000, profit: 32000 },
];

const categoryComparisonData = [
  { department: 'Engineering', budget: 500000, spent: 450000, remaining: 50000 },
  { department: 'Marketing', budget: 300000, spent: 280000, remaining: 20000 },
  { department: 'Sales', budget: 400000, spent: 390000, remaining: 10000 },
  { department: 'HR', budget: 200000, spent: 180000, remaining: 20000 },
  { department: 'Operations', budget: 350000, spent: 320000, remaining: 30000 },
];

const distributionData = [
  { category: 'Product A', value: 35, market_share: 35 },
  { category: 'Product B', value: 28, market_share: 28 },
  { category: 'Product C', value: 22, market_share: 22 },
  { category: 'Product D', value: 10, market_share: 10 },
  { category: 'Others', value: 5, market_share: 5 },
];

const tableData = [
  { id: 1, name: 'Project Alpha', status: 'Active', progress: 75, budget: 50000, team_size: 8 },
  { id: 2, name: 'Project Beta', status: 'Planning', progress: 25, budget: 30000, team_size: 5 },
  { id: 3, name: 'Project Gamma', status: 'Active', progress: 60, budget: 75000, team_size: 12 },
  { id: 4, name: 'Project Delta', status: 'Completed', progress: 100, budget: 40000, team_size: 6 },
  { id: 5, name: 'Project Epsilon', status: 'Active', progress: 40, budget: 60000, team_size: 10 },
  { id: 6, name: 'Project Zeta', status: 'On Hold', progress: 15, budget: 25000, team_size: 4 },
  { id: 7, name: 'Project Eta', status: 'Active', progress: 85, budget: 80000, team_size: 15 },
  { id: 8, name: 'Project Theta', status: 'Planning', progress: 10, budget: 35000, team_size: 7 },
];

const simpleBarData = [
  { region: 'North America', sales: 125000 },
  { region: 'Europe', sales: 98000 },
  { region: 'Asia Pacific', sales: 145000 },
  { region: 'Latin America', sales: 67000 },
  { region: 'Middle East', sales: 45000 },
];

/**
 * AutoChart Examples
 */
export function AutoChartExamples() {
  return (
    <div className="space-y-8 p-6">
      <h2 className="text-2xl font-bold mb-4">AutoChart Examples</h2>

      {/* Time Series - Auto-detects as Line Chart */}
      <div>
        <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">
          Time Series (Auto-detects Line Chart)
        </h3>
        <AutoChart
          data={timeSeriesData}
          title="Monthly Revenue Trends"
          showConfidence={true}
          allowOverride={true}
          unit="$"
        />
      </div>

      {/* Category Comparison - Auto-detects as Comparison Chart */}
      <div>
        <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">
          Category Comparison (Auto-detects Comparison Chart)
        </h3>
        <AutoChart
          data={categoryComparisonData}
          title="Department Budget Analysis"
          showConfidence={true}
          allowOverride={true}
          unit="$"
        />
      </div>

      {/* Distribution - Auto-detects as Pie Chart */}
      <div>
        <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">
          Distribution (Auto-detects Pie Chart)
        </h3>
        <AutoChart
          data={distributionData}
          title="Market Share Distribution"
          showConfidence={true}
          allowOverride={true}
          unit="%"
        />
      </div>

      {/* Simple Bar - Auto-detects as Bar Chart */}
      <div>
        <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">
          Simple Bar (Auto-detects Bar Chart)
        </h3>
        <AutoChart
          data={simpleBarData}
          title="Sales by Region"
          showConfidence={true}
          allowOverride={true}
          unit="$"
        />
      </div>

      {/* Table */}
      <div>
        <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">
          Table View (Complex Data)
        </h3>
        <AutoChart
          data={tableData}
          title="Project Overview"
          showConfidence={true}
          allowOverride={true}
        />
      </div>
    </div>
  );
}

/**
 * TrendChart Examples
 */
export function TrendChartExamples() {
  return (
    <div className="space-y-8 p-6">
      <h2 className="text-2xl font-bold mb-4">TrendChart Examples</h2>

      {/* Basic Trend */}
      <div>
        <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">
          Basic Trend
        </h3>
        <TrendChart
          data={timeSeriesData}
          xColumn="month"
          yColumns={['revenue']}
          title="Monthly Revenue"
          unit="$"
        />
      </div>

      {/* Multi-Series Trend */}
      <div>
        <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">
          Multi-Series Trend
        </h3>
        <TrendChart
          data={timeSeriesData}
          xColumn="month"
          yColumns={['revenue', 'costs', 'profit']}
          title="Financial Overview"
          unit="$"
        />
      </div>

      {/* With Confidence Bands */}
      <div>
        <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">
          With Confidence Bands
        </h3>
        <TrendChart
          data={timeSeriesData}
          xColumn="month"
          yColumns={['revenue']}
          title="Revenue with 95% Confidence Interval"
          showConfidenceBands={true}
          confidenceLevel={0.95}
          unit="$"
        />
      </div>
    </div>
  );
}

/**
 * ComparisonChart Examples
 */
export function ComparisonChartExamples() {
  return (
    <div className="space-y-8 p-6">
      <h2 className="text-2xl font-bold mb-4">ComparisonChart Examples</h2>

      {/* Grouped Bars */}
      <div>
        <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">
          Grouped Bars
        </h3>
        <ComparisonChart
          data={categoryComparisonData}
          categoryColumn="department"
          valueColumns={['budget', 'spent', 'remaining']}
          title="Budget Comparison by Department"
          stacked={false}
          unit="$"
        />
      </div>

      {/* Stacked Bars */}
      <div>
        <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">
          Stacked Bars
        </h3>
        <ComparisonChart
          data={categoryComparisonData}
          categoryColumn="department"
          valueColumns={['spent', 'remaining']}
          title="Budget Status (Stacked)"
          stacked={true}
          unit="$"
        />
      </div>

      {/* Horizontal Bars */}
      <div>
        <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">
          Horizontal Bars
        </h3>
        <ComparisonChart
          data={categoryComparisonData}
          categoryColumn="department"
          valueColumns={['budget', 'spent']}
          title="Budget vs Spent (Horizontal)"
          horizontal={true}
          unit="$"
        />
      </div>
    </div>
  );
}

/**
 * DistributionChart Examples
 */
export function DistributionChartExamples() {
  return (
    <div className="space-y-8 p-6">
      <h2 className="text-2xl font-bold mb-4">DistributionChart Examples</h2>

      {/* Pie Chart */}
      <div>
        <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">
          Pie Chart
        </h3>
        <DistributionChart
          data={distributionData}
          labelColumn="category"
          valueColumn="market_share"
          title="Market Share (Pie)"
          variant="pie"
          showPercentages={true}
          unit="%"
        />
      </div>

      {/* Donut Chart */}
      <div>
        <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">
          Donut Chart
        </h3>
        <DistributionChart
          data={distributionData}
          labelColumn="category"
          valueColumn="market_share"
          title="Market Share (Donut)"
          variant="doughnut"
          showPercentages={true}
          unit="%"
        />
      </div>

      {/* Without Percentages in Legend */}
      <div>
        <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">
          Without Percentages in Legend
        </h3>
        <DistributionChart
          data={distributionData}
          labelColumn="category"
          valueColumn="value"
          title="Distribution (No Percentages in Legend)"
          variant="doughnut"
          showPercentages={false}
        />
      </div>
    </div>
  );
}

/**
 * DataTable Examples
 */
export function DataTableExamples() {
  return (
    <div className="space-y-8 p-6">
      <h2 className="text-2xl font-bold mb-4">DataTable Examples</h2>

      {/* Basic Table */}
      <div>
        <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">
          Basic Table
        </h3>
        <DataTable
          data={tableData}
          title="Project Status Overview"
          height={500}
          virtualize={false}
        />
      </div>

      {/* Virtualized Table */}
      <div>
        <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">
          Large Dataset (Virtualized)
        </h3>
        <DataTable
          data={generateLargeDataset(500)}
          title="Large Transaction Log"
          height={600}
          virtualize={true}
        />
      </div>
    </div>
  );
}

/**
 * Generate large dataset for testing virtualization
 */
function generateLargeDataset(rows: number) {
  const data = [];
  const statuses = ['Active', 'Pending', 'Completed', 'Cancelled'];
  const categories = ['A', 'B', 'C', 'D', 'E'];

  for (let i = 0; i < rows; i++) {
    data.push({
      id: i + 1,
      transaction_date: new Date(2024, 0, 1 + (i % 365)).toISOString().split('T')[0],
      amount: Math.round(Math.random() * 10000) / 100,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      category: categories[Math.floor(Math.random() * categories.length)],
      description: `Transaction ${i + 1}`,
    });
  }

  return data;
}

/**
 * All Examples Combined
 */
export default function AllExamples() {
  const [activeTab, setActiveTab] = React.useState('auto');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto py-8">
        <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-white">
          NLQ Chart Components - Examples
        </h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-300 dark:border-gray-700">
          {[
            { id: 'auto', label: 'AutoChart' },
            { id: 'trend', label: 'TrendChart' },
            { id: 'comparison', label: 'ComparisonChart' },
            { id: 'distribution', label: 'DistributionChart' },
            { id: 'table', label: 'DataTable' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div>
          {activeTab === 'auto' && <AutoChartExamples />}
          {activeTab === 'trend' && <TrendChartExamples />}
          {activeTab === 'comparison' && <ComparisonChartExamples />}
          {activeTab === 'distribution' && <DistributionChartExamples />}
          {activeTab === 'table' && <DataTableExamples />}
        </div>
      </div>
    </div>
  );
}
