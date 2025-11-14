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

const mockData = {
  company: { sroi: 3.2, volunteers: 1234, hours: 8456, impact: 2400000 },
  cohortAverage: { sroi: 2.8, volunteers: 980, hours: 7200, impact: 2100000 },
  cohortMedian: { sroi: 2.5, volunteers: 850, hours: 6500, impact: 1900000 },
};

export const Default: Story = {
  args: {
    data: mockData,
    chartType: 'bar',
  },
};

export const RadarChart: Story = {
  args: {
    data: mockData,
    chartType: 'radar',
  },
};

export const LineChart: Story = {
  args: {
    data: mockData,
    chartType: 'line',
  },
};

export const Loading: Story = {
  args: {
    data: null,
    loading: true,
  },
};

export const TopPerformer: Story = {
  args: {
    data: {
      company: { sroi: 4.5, volunteers: 2000, hours: 12000, impact: 3500000 },
      cohortAverage: { sroi: 2.8, volunteers: 980, hours: 7200, impact: 2100000 },
      cohortMedian: { sroi: 2.5, volunteers: 850, hours: 6500, impact: 1900000 },
    },
    chartType: 'bar',
  },
};

export const BelowAverage: Story = {
  args: {
    data: {
      company: { sroi: 1.8, volunteers: 650, hours: 4200, impact: 1200000 },
      cohortAverage: { sroi: 2.8, volunteers: 980, hours: 7200, impact: 2100000 },
      cohortMedian: { sroi: 2.5, volunteers: 850, hours: 6500, impact: 1900000 },
    },
    chartType: 'bar',
  },
};
