import type { Meta, StoryObj } from '@storybook/react';
import ApprovalWorkflowPanel from './ApprovalWorkflowPanel';

/**
 * Approval Workflow Panel
 * Manages report approval state transitions
 */
const meta: Meta<typeof ApprovalWorkflowPanel> = {
  title: 'Approvals/ApprovalWorkflowPanel',
  component: ApprovalWorkflowPanel,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ApprovalWorkflowPanel>;

export const Draft: Story = {
  args: {
    reportId: 'report-123',
    currentStatus: 'draft',
    canSubmit: true,
    canApprove: false,
    canLock: false,
  },
};

export const InReview: Story = {
  args: {
    reportId: 'report-123',
    currentStatus: 'review',
    canSubmit: false,
    canApprove: true,
    canLock: false,
    reviewerName: 'Jane Smith',
  },
};

export const Approved: Story = {
  args: {
    reportId: 'report-123',
    currentStatus: 'approved',
    canSubmit: false,
    canApprove: false,
    canLock: true,
    approverName: 'John Doe',
    approvedAt: new Date().toISOString(),
  },
};

export const Locked: Story = {
  args: {
    reportId: 'report-123',
    currentStatus: 'locked',
    canSubmit: false,
    canApprove: false,
    canLock: false,
    lockedBy: 'Admin User',
    lockedAt: new Date().toISOString(),
  },
};

export const WithComments: Story = {
  args: {
    reportId: 'report-123',
    currentStatus: 'review',
    canSubmit: false,
    canApprove: true,
    canLock: false,
    comments: [
      {
        id: '1',
        author: 'Jane Smith',
        content: 'Please update the Q1 metrics section.',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: '2',
        author: 'John Doe',
        content: 'Metrics updated as requested.',
        timestamp: new Date().toISOString(),
      },
    ],
  },
};

export const ViewerRole: Story = {
  args: {
    reportId: 'report-123',
    currentStatus: 'review',
    canSubmit: false,
    canApprove: false,
    canLock: false,
    userRole: 'VIEWER',
  },
};
