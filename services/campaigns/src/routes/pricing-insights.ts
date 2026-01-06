/**
 * Pricing Insights & Signals API Routes
 *
 * SWARM 6: Beneficiary Groups, Campaigns & Monetization
 * Agent 5.3: pricing-signal-exporter
 *
 * Endpoints:
 * - GET /api/campaigns/:id/pricing - Campaign-specific pricing analytics
 * - GET /api/companies/:id/pricing-signals - All campaigns pricing signals for company
 * - GET /api/companies/:id/pricing-report - Comprehensive pricing report
 * - GET /api/campaigns/:id/pricing/export - Export pricing data (CSV/JSON)
 * - GET /api/companies/:id/pricing-signals/export - Export all signals (CSV/JSON)
 *
 * Export Formats:
 * - CSV: Compatible with CRM tools (HubSpot, Salesforce)
 * - JSON: For programmatic integration
 */

import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, campaigns } from '@teei/shared-schema';
import type { AuthenticatedRequest } from '../middleware/auth.js';

import {
  calculateCostPerLearner,
  compareUsageVsContract,
  identifyHighValueCampaigns,
  generatePricingSignals,
  generatePricingReport,
  type PricingSignal,
} from '../lib/pricing-signals.js';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Export format query parameter
 */
const ExportFormatSchema = z.enum(['csv', 'json']).default('json');

/**
 * Campaign ID param
 */
const CampaignIdParamSchema = z.object({
  id: z.string().uuid(),
});

/**
 * Company ID param
 */
const CompanyIdParamSchema = z.object({
  id: z.string().uuid(),
});

/**
 * Export query schema
 */
const ExportQuerySchema = z.object({
  format: ExportFormatSchema.optional(),
});

// ============================================================================
// CSV EXPORT UTILITIES
// ============================================================================

/**
 * Convert pricing signals to CSV
 */
function signalsToCSV(signals: PricingSignal[]): string {
  if (signals.length === 0) {
    return 'No data available';
  }

  // CSV headers
  const headers = [
    'Campaign ID',
    'Campaign Name',
    'Company',
    'Status',
    'Start Date',
    'End Date',
    'Pricing Model',
    'Budget Allocated',
    'Budget Spent',
    'Budget Remaining',
    'Budget Utilization %',
    'Target Volunteers',
    'Current Volunteers',
    'Volunteer Utilization %',
    'Target Beneficiaries',
    'Current Beneficiaries',
    'Beneficiary Utilization %',
    'SROI',
    'Avg VIS',
    'Total Hours',
    'Total Sessions',
    'Cost Per Learner',
    'Cost Per Hour',
    'High Value',
    'Near Capacity',
    'Over Capacity',
    'Budget Constrained',
    'Recommendations',
  ];

  // CSV rows
  const rows = signals.map(signal => [
    signal.campaignId,
    `"${signal.campaignName}"`,
    `"${signal.companyName}"`,
    signal.status,
    signal.startDate,
    signal.endDate,
    signal.pricingModel,
    signal.budgetAllocated.toFixed(2),
    signal.budgetSpent.toFixed(2),
    signal.budgetRemaining.toFixed(2),
    signal.budgetUtilizationPercent.toFixed(1),
    signal.targetVolunteers,
    signal.currentVolunteers,
    signal.volunteerUtilizationPercent.toFixed(1),
    signal.targetBeneficiaries,
    signal.currentBeneficiaries,
    signal.beneficiaryUtilizationPercent.toFixed(1),
    signal.sroi?.toFixed(2) || 'N/A',
    signal.averageVis?.toFixed(2) || 'N/A',
    signal.totalHours.toFixed(1),
    signal.totalSessions,
    signal.costPerLearner?.toFixed(2) || 'N/A',
    signal.costPerHour?.toFixed(2) || 'N/A',
    signal.isHighValue ? 'Yes' : 'No',
    signal.isNearCapacity ? 'Yes' : 'No',
    signal.isOverCapacity ? 'Yes' : 'No',
    signal.isBudgetConstrained ? 'Yes' : 'No',
    `"${signal.recommendations.join('; ')}"`,
  ]);

  // Combine headers and rows
  return [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');
}

/**
 * Convert pricing report to CSV (summary view)
 */
function reportToCSV(report: any): string {
  const lines = [
    `Pricing Report for ${report.companyName}`,
    `Generated: ${report.reportGeneratedAt}`,
    '',
    'SUMMARY METRICS',
    `Total Campaigns,${report.totalCampaigns}`,
    `Active Campaigns,${report.activeCampaigns}`,
    `High-Value Campaigns,${report.highValueCampaigns}`,
    '',
    'FINANCIAL SUMMARY',
    `Total Budget Allocated,${report.totalBudgetAllocated.toFixed(2)} ${report.currency}`,
    `Total Budget Spent,${report.totalBudgetSpent.toFixed(2)} ${report.currency}`,
    `Total Budget Remaining,${report.totalBudgetRemaining.toFixed(2)} ${report.currency}`,
    `Average Budget Utilization,${report.averageBudgetUtilization.toFixed(1)}%`,
    '',
    'CAPACITY SUMMARY',
    `Total Target Beneficiaries,${report.totalTargetBeneficiaries}`,
    `Total Current Beneficiaries,${report.totalCurrentBeneficiaries}`,
    `Beneficiary Utilization Average,${report.beneficiaryUtilizationAverage.toFixed(1)}%`,
    '',
    'IMPACT SUMMARY',
    `Average SROI,${report.averageSroi?.toFixed(2) || 'N/A'}`,
    `Average VIS,${report.averageVis?.toFixed(2) || 'N/A'}`,
    `Total Hours,${report.totalHours.toFixed(1)}`,
    '',
    'CAPACITY ALERTS',
    `Campaigns Near Capacity,${report.campaignsNearCapacity}`,
    `Campaigns Over Capacity,${report.campaignsOverCapacity}`,
    `Budget-Constrained Campaigns,${report.campaignsBudgetConstrained}`,
  ];

  return lines.join('\n');
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

export const pricingInsightsRoutes: FastifyPluginAsync = async (fastify) => {

  // ==========================================================================
  // GET /api/campaigns/:id/pricing - Campaign Pricing Analytics
  // ==========================================================================
  fastify.get<{ Params: z.infer<typeof CampaignIdParamSchema> }>(
    '/campaigns/:id/pricing',
    {
      schema: {
        description: 'Get pricing analytics for a specific campaign',
        tags: ['pricing'],
        params: CampaignIdParamSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as z.infer<typeof CampaignIdParamSchema>;

        // Verify campaign exists
        const [campaign] = await db
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, id))
          .limit(1);

        if (!campaign) {
          return reply.status(404).send({
            success: false,
            error: 'Campaign not found',
          });
        }

        // Calculate all pricing analytics
        const costPerLearner = await calculateCostPerLearner(id);
        const usageComparison = await compareUsageVsContract(id);

        return {
          success: true,
          data: {
            campaignId: id,
            campaignName: campaign.name,
            costPerLearner,
            usageComparison,
          },
        };
      } catch (error: any) {
        request.log.error('Failed to get campaign pricing:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to get campaign pricing',
          message: error.message,
        });
      }
    }
  );

  // ==========================================================================
  // GET /api/companies/:id/pricing-signals - Company Pricing Signals
  // ==========================================================================
  fastify.get<{ Params: z.infer<typeof CompanyIdParamSchema> }>(
    '/companies/:id/pricing-signals',
    {
      schema: {
        description: 'Get all pricing signals for a company (for CRM export)',
        tags: ['pricing'],
        params: CompanyIdParamSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as z.infer<typeof CompanyIdParamSchema>;

        // Generate pricing signals
        const signals = await generatePricingSignals(id);

        return {
          success: true,
          count: signals.length,
          data: signals,
        };
      } catch (error: any) {
        request.log.error('Failed to get pricing signals:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to get pricing signals',
          message: error.message,
        });
      }
    }
  );

  // ==========================================================================
  // GET /api/companies/:id/pricing-report - Comprehensive Pricing Report
  // ==========================================================================
  fastify.get<{ Params: z.infer<typeof CompanyIdParamSchema> }>(
    '/companies/:id/pricing-report',
    {
      schema: {
        description: 'Get comprehensive pricing report for a company',
        tags: ['pricing'],
        params: CompanyIdParamSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as z.infer<typeof CompanyIdParamSchema>;

        // Generate pricing report
        const report = await generatePricingReport(id);

        return {
          success: true,
          data: report,
        };
      } catch (error: any) {
        request.log.error('Failed to get pricing report:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to get pricing report',
          message: error.message,
        });
      }
    }
  );

  // ==========================================================================
  // GET /api/campaigns/:id/pricing/export - Export Campaign Pricing
  // ==========================================================================
  fastify.get<{
    Params: z.infer<typeof CampaignIdParamSchema>;
    Querystring: z.infer<typeof ExportQuerySchema>;
  }>(
    '/campaigns/:id/pricing/export',
    {
      schema: {
        description: 'Export campaign pricing data (CSV or JSON)',
        tags: ['pricing'],
        params: CampaignIdParamSchema,
        querystring: ExportQuerySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as z.infer<typeof CampaignIdParamSchema>;
        const { format = 'json' } = request.query as z.infer<typeof ExportQuerySchema>;

        // Verify campaign exists
        const [campaign] = await db
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, id))
          .limit(1);

        if (!campaign) {
          return reply.status(404).send({
            success: false,
            error: 'Campaign not found',
          });
        }

        // Calculate pricing data
        const costPerLearner = await calculateCostPerLearner(id);
        const usageComparison = await compareUsageVsContract(id);

        const data = {
          campaignId: id,
          campaignName: campaign.name,
          costPerLearner,
          usageComparison,
        };

        if (format === 'csv') {
          const csv = `Campaign ID,Campaign Name,Budget Allocated,Currency,Learners Served,Cost Per Learner,Cost Per Hour,Total Hours,Budget Utilization\n${id},"${campaign.name}",${costPerLearner.budgetAllocated},${costPerLearner.currency},${costPerLearner.learnersServed},${costPerLearner.costPerLearner?.toFixed(2) || 'N/A'},${costPerLearner.costPerHour?.toFixed(2) || 'N/A'},${costPerLearner.totalHours.toFixed(1)},${(costPerLearner.budgetUtilization * 100).toFixed(1)}%`;
          reply.type('text/csv');
          reply.header('Content-Disposition', `attachment; filename="campaign-pricing-${id}.csv"`);
          return csv;
        }

        return {
          success: true,
          data,
        };
      } catch (error: any) {
        request.log.error('Failed to export campaign pricing:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to export campaign pricing',
          message: error.message,
        });
      }
    }
  );

  // ==========================================================================
  // GET /api/companies/:id/pricing-signals/export - Export All Signals
  // ==========================================================================
  fastify.get<{
    Params: z.infer<typeof CompanyIdParamSchema>;
    Querystring: z.infer<typeof ExportQuerySchema>;
  }>(
    '/companies/:id/pricing-signals/export',
    {
      schema: {
        description: 'Export all pricing signals for company (CSV or JSON)',
        tags: ['pricing'],
        params: CompanyIdParamSchema,
        querystring: ExportQuerySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as z.infer<typeof CompanyIdParamSchema>;
        const { format = 'json' } = request.query as z.infer<typeof ExportQuerySchema>;

        // Generate pricing signals
        const signals = await generatePricingSignals(id);

        if (format === 'csv') {
          const csv = signalsToCSV(signals);
          reply.type('text/csv');
          reply.header('Content-Disposition', `attachment; filename="pricing-signals-${id}-${new Date().toISOString().split('T')[0]}.csv"`);
          return csv;
        }

        return {
          success: true,
          count: signals.length,
          data: signals,
        };
      } catch (error: any) {
        request.log.error('Failed to export pricing signals:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to export pricing signals',
          message: error.message,
        });
      }
    }
  );

  // ==========================================================================
  // GET /api/companies/:id/pricing-report/export - Export Pricing Report
  // ==========================================================================
  fastify.get<{
    Params: z.infer<typeof CompanyIdParamSchema>;
    Querystring: z.infer<typeof ExportQuerySchema>;
  }>(
    '/companies/:id/pricing-report/export',
    {
      schema: {
        description: 'Export comprehensive pricing report (CSV or JSON)',
        tags: ['pricing'],
        params: CompanyIdParamSchema,
        querystring: ExportQuerySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as z.infer<typeof CompanyIdParamSchema>;
        const { format = 'json' } = request.query as z.infer<typeof ExportQuerySchema>;

        // Generate pricing report
        const report = await generatePricingReport(id);

        if (format === 'csv') {
          const csv = reportToCSV(report);
          reply.type('text/csv');
          reply.header('Content-Disposition', `attachment; filename="pricing-report-${id}-${new Date().toISOString().split('T')[0]}.csv"`);
          return csv;
        }

        return {
          success: true,
          data: report,
        };
      } catch (error: any) {
        request.log.error('Failed to export pricing report:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to export pricing report',
          message: error.message,
        });
      }
    }
  );
};
