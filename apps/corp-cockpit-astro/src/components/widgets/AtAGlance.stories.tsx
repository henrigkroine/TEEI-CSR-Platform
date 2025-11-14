import type { Meta, StoryObj } from '@storybook/react';
import AtAGlance from './AtAGlance';

/**
 * At-A-Glance Widget
 * Displays key metrics summary for the dashboard
 */
const meta: Meta<typeof AtAGlance> = {
  title: 'Widgets/AtAGlance',
  component: AtAGlance,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Dashboard widget showing key performance metrics at a glance.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    metrics: {
      description: 'Array of metric objects to display',
    },
    loading: {
      control: 'boolean',
      description: 'Loading state',
    },
  },
};

export default meta;
type Story = StoryObj<typeof AtAGlance>;

export const Default: Story = {
  args: {
    metrics: [
      { label: 'Total Impact', value: '£2.4M', trend: '+12%', trendDirection: 'up' },
      { label: 'Active Programs', value: '42', trend: '+5', trendDirection: 'up' },
      { label: 'Volunteers', value: '1,234', trend: '-3%', trendDirection: 'down' },
      { label: 'Hours Logged', value: '8,456', trend: '+18%', trendDirection: 'up' },
    ],
    loading: false,
  },
};

export const Loading: Story = {
  args: {
    ...Default.args,
    loading: true,
  },
};

export const Empty: Story = {
  args: {
    metrics: [],
    loading: false,
  },
};

export const SingleMetric: Story = {
  args: {
    metrics: [
      { label: 'Total Impact', value: '£2.4M', trend: '+12%', trendDirection: 'up' },
    ],
    loading: false,
  },
};

export const NegativeTrends: Story = {
  args: {
    metrics: [
      { label: 'Total Impact', value: '£2.4M', trend: '-5%', trendDirection: 'down' },
      { label: 'Active Programs', value: '42', trend: '-8', trendDirection: 'down' },
      { label: 'Volunteers', value: '1,234', trend: '-12%', trendDirection: 'down' },
    ],
    loading: false,
  },
};

export const LargeNumbers: Story = {
  args: {
    metrics: [
      { label: 'Total Impact', value: '£24.5M', trend: '+125%', trendDirection: 'up' },
      { label: 'Active Programs', value: '1,234', trend: '+456', trendDirection: 'up' },
      { label: 'Volunteers', value: '98,765', trend: '+8,234', trendDirection: 'up' },
    ],
    loading: false,
  },
};
