import type { Meta, StoryObj } from '@storybook/react';
import BenchmarkCharts from './BenchmarkCharts';

const meta: Meta<typeof BenchmarkCharts> = {
  title: 'Benchmarks/BenchmarkCharts',
  component: BenchmarkCharts,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof BenchmarkCharts>;

const mockBenchmarks = [
  { metric: 'SROI', value: 3.2, cohortAverage: 2.8, cohortMedian: 2.5, percentile: 75 },
  { metric: 'Volunteers', value: 1234, cohortAverage: 980, cohortMedian: 850, percentile: 80 },
  { metric: 'Hours', value: 8456, cohortAverage: 7200, cohortMedian: 6500, percentile: 70 },
  { metric: 'Impact', value: 2400000, cohortAverage: 2100000, cohortMedian: 1900000, percentile: 65 },
];

export const Default: Story = {
  args: {
    benchmarks: mockBenchmarks,
    companyName: 'Acme Corp',
    cohortName: 'Technology Sector',
  },
};

export const RadarChart: Story = {
  args: {
    benchmarks: mockBenchmarks,
    companyName: 'Acme Corp',
    cohortName: 'Technology Sector',
  },
};

export const LineChart: Story = {
  args: {
    benchmarks: mockBenchmarks,
    companyName: 'Acme Corp',
    cohortName: 'Technology Sector',
  },
};

export const Loading: Story = {
  args: {
    benchmarks: [],
    companyName: 'Loading...',
    cohortName: 'Loading...',
  },
};

export const TopPerformer: Story = {
  args: {
    benchmarks: [
      { metric: 'SROI', value: 4.5, cohortAverage: 2.8, cohortMedian: 2.5, percentile: 95 },
      { metric: 'Volunteers', value: 2000, cohortAverage: 980, cohortMedian: 850, percentile: 90 },
      { metric: 'Hours', value: 12000, cohortAverage: 7200, cohortMedian: 6500, percentile: 92 },
      { metric: 'Impact', value: 3500000, cohortAverage: 2100000, cohortMedian: 1900000, percentile: 88 },
    ],
    companyName: 'Top Performer Inc',
    cohortName: 'Technology Sector',
  },
};

export const BelowAverage: Story = {
  args: {
    benchmarks: [
      { metric: 'SROI', value: 1.8, cohortAverage: 2.8, cohortMedian: 2.5, percentile: 35 },
      { metric: 'Volunteers', value: 650, cohortAverage: 980, cohortMedian: 850, percentile: 40 },
      { metric: 'Hours', value: 4200, cohortAverage: 7200, cohortMedian: 6500, percentile: 38 },
      { metric: 'Impact', value: 1200000, cohortAverage: 2100000, cohortMedian: 1900000, percentile: 42 },
    ],
    companyName: 'Growing Company LLC',
    cohortName: 'Technology Sector',
  },
};
