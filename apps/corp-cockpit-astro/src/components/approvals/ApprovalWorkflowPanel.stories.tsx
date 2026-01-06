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
    companyId: 'company-123',
    reportId: 'report-123',
    userRole: 'editor',
  },
};

export const InReview: Story = {
  args: {
    companyId: 'company-123',
    reportId: 'report-123',
    userRole: 'reviewer',
  },
};

export const Approved: Story = {
  args: {
    companyId: 'company-123',
    reportId: 'report-123',
    userRole: 'approver',
  },
};

export const Locked: Story = {
  args: {
    companyId: 'company-123',
    reportId: 'report-123',
    userRole: 'viewer',
  },
};

export const WithComments: Story = {
  args: {
    companyId: 'company-123',
    reportId: 'report-123',
    userRole: 'reviewer',
  },
};

export const ViewerRole: Story = {
  args: {
    companyId: 'company-123',
    reportId: 'report-123',
    userRole: 'VIEWER',
  },
};
