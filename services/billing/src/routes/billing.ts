/**
 * Billing API Routes
 * RESTful endpoints for usage tracking, budgets, invoices
 */

import type { FastifyInstance } from 'fastify';
import { createUsageCollector } from '../lib/usage-collector.js';
import {
  BudgetManager,
  InMemoryBudgetStore,
  InMemoryUsageStore,
  ConsoleAlertSink,
} from '../lib/budget-manager.js';
import { InvoiceGenerator } from '../lib/invoice-generator.js';
import { createPaymentProvider } from '../lib/stripe-provider.js';
import { BudgetConfigSchema } from '../types/index.js';

export async function billingRoutes(fastify: FastifyInstance) {
  // Initialize services
  const usageCollector = createUsageCollector();
  const usageStore = new InMemoryUsageStore();
  const budgetStore = new InMemoryBudgetStore();
  const alertSink = new ConsoleAlertSink();
  const budgetManager = new BudgetManager(budgetStore, usageStore, alertSink);
  const invoiceGenerator = new InvoiceGenerator();
  const paymentProvider = createPaymentProvider();

  /**
   * GET /api/billing/usage/:tenantId
   * Get usage metrics for a tenant
   */
  fastify.get<{ Params: { tenantId: string }; Querystring: { period?: 'hourly' | 'daily' | 'monthly' } }>(
    '/api/billing/usage/:tenantId',
    {
      schema: {
        params: { type: 'object', properties: { tenantId: { type: 'string', format: 'uuid' } } },
        querystring: { type: 'object', properties: { period: { type: 'string', enum: ['hourly', 'daily', 'monthly'] } } },
      },
    },
    async (request, _reply) => {
      const { tenantId } = request.params;
      const { period = 'daily' } = request.query;

      let usage;
      if (period === 'hourly') {
        usage = await usageCollector.collectHourly(tenantId);
      } else if (period === 'daily') {
        usage = await usageCollector.collectDaily(tenantId, new Date());
      } else {
        const now = new Date();
        usage = await usageCollector.collectMonthly(tenantId, now.getFullYear(), now.getMonth() + 1);
      }

      // Record usage
      await usageStore.recordUsage(usage);

      return { usage };
    },
  );

  /**
   * POST /api/billing/budgets
   * Set budget for a tenant
   */
  fastify.post<{ Body: Omit<typeof BudgetConfigSchema._type, 'createdAt' | 'updatedAt'> }>(
    '/api/billing/budgets',
    {
      schema: {
        body: BudgetConfigSchema.omit({ createdAt: true, updatedAt: true }),
      },
    },
    async (request, _reply) => {
      const budget = await budgetManager.setBudget(request.body);
      return { budget };
    },
  );

  /**
   * GET /api/billing/budgets/:tenantId
   * Get budget and utilization for a tenant
   */
  fastify.get<{ Params: { tenantId: string } }>(
    '/api/billing/budgets/:tenantId',
    {
      schema: {
        params: { type: 'object', properties: { tenantId: { type: 'string', format: 'uuid' } } },
      },
    },
    async (request, _reply) => {
      const { tenantId } = request.params;
      const report = await budgetManager.getUtilizationReport(tenantId);

      if (!report) {
        return _reply.status(404).send({ error: 'Budget not found' });
      }

      return report;
    },
  );

  /**
   * POST /api/billing/budgets/:tenantId/check
   * Check if current usage is within budget
   */
  fastify.post<{ Params: { tenantId: string } }>(
    '/api/billing/budgets/:tenantId/check',
    {
      schema: {
        params: { type: 'object', properties: { tenantId: { type: 'string', format: 'uuid' } } },
      },
    },
    async (request, _reply) => {
      const { tenantId } = request.params;

      // Get current month usage
      const now = new Date();
      const usage = await usageCollector.collectMonthly(tenantId, now.getFullYear(), now.getMonth() + 1);

      const budgetCheck = await budgetManager.checkBudget(tenantId, usage);
      const anomalies = await budgetManager.detectAnomalies(tenantId, usage);

      return {
        ...budgetCheck,
        anomalies,
      };
    },
  );

  /**
   * POST /api/billing/invoices/generate
   * Generate invoice for a tenant
   */
  fastify.post<{ Body: { tenantId: string; tenantName: string; year: number; month: number } }>(
    '/api/billing/invoices/generate',
    {
      schema: {
        body: {
          type: 'object',
          required: ['tenantId', 'tenantName', 'year', 'month'],
          properties: {
            tenantId: { type: 'string', format: 'uuid' },
            tenantName: { type: 'string' },
            year: { type: 'number' },
            month: { type: 'number', minimum: 1, maximum: 12 },
          },
        },
      },
    },
    async (request, _reply) => {
      const { tenantId, tenantName, year, month } = request.body;

      // Collect monthly usage
      const usage = await usageCollector.collectMonthly(tenantId, year, month);

      // Generate invoice
      const periodStart = new Date(year, month - 1, 1);
      const periodEnd = new Date(year, month, 0, 23, 59, 59, 999);

      const invoice = await invoiceGenerator.generate(tenantId, tenantName, [usage], periodStart, periodEnd);

      return { invoice };
    },
  );

  /**
   * GET /api/billing/invoices/:invoiceId/pdf
   * Export invoice as PDF
   */
  fastify.get<{ Params: { invoiceId: string }; Querystring: { tenantName: string } }>(
    '/api/billing/invoices/:invoiceId/pdf',
    {
      schema: {
        params: { type: 'object', properties: { invoiceId: { type: 'string', format: 'uuid' } } },
        querystring: { type: 'object', properties: { tenantName: { type: 'string' } } },
      },
    },
    async (_request, reply) => {
      // In production, fetch invoice from database
      // For now, generate sample invoice
      const { tenantName } = _request.query;

      const now = new Date();
      const usage = await usageCollector.collectMonthly('00000000-0000-0000-0000-000000000000', now.getFullYear(), now.getMonth() + 1);

      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const invoice = await invoiceGenerator.generate(
        '00000000-0000-0000-0000-000000000000',
        tenantName || 'Sample Tenant',
        [usage],
        periodStart,
        periodEnd,
      );

      const pdfStream = await invoiceGenerator.exportPDF(invoice, tenantName || 'Sample Tenant');

      reply.type('application/pdf');
      reply.header('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceId}.pdf"`);

      return reply.send(pdfStream);
    },
  );

  /**
   * GET /api/billing/invoices/:invoiceId/csv
   * Export invoice as CSV
   */
  fastify.get<{ Params: { invoiceId: string } }>(
    '/api/billing/invoices/:invoiceId/csv',
    {
      schema: {
        params: { type: 'object', properties: { invoiceId: { type: 'string', format: 'uuid' } } },
      },
    },
    async (_request, reply) => {
      // Simplified - in production, fetch from DB
      const now = new Date();
      const usage = await usageCollector.collectMonthly('00000000-0000-0000-0000-000000000000', now.getFullYear(), now.getMonth() + 1);

      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const invoice = await invoiceGenerator.generate(
        '00000000-0000-0000-0000-000000000000',
        'Sample Tenant',
        [usage],
        periodStart,
        periodEnd,
      );

      const csv = await invoiceGenerator.exportCSV(invoice);

      reply.type('text/csv');
      reply.header('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceId}.csv"`);

      return csv;
    },
  );

  /**
   * POST /api/billing/stripe/create-customer
   * Create Stripe customer
   */
  fastify.post<{ Body: { tenantId: string; email: string; name: string } }>(
    '/api/billing/stripe/create-customer',
    {
      schema: {
        body: {
          type: 'object',
          required: ['tenantId', 'email', 'name'],
          properties: {
            tenantId: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
          },
        },
      },
    },
    async (request, _reply) => {
      const { tenantId, email, name } = request.body;
      const result = await paymentProvider.createCustomer(tenantId, email, name);
      return result;
    },
  );

  /**
   * GET /api/billing/stripe/portal/:customerId
   * Get Stripe billing portal URL
   */
  fastify.get<{ Params: { customerId: string } }>(
    '/api/billing/stripe/portal/:customerId',
    {
      schema: {
        params: { type: 'object', properties: { customerId: { type: 'string' } } },
      },
    },
    async (request, _reply) => {
      const { customerId } = request.params;
      const result = await paymentProvider.setupBillingPortal(customerId);
      return result;
    },
  );

  /**
   * GET /api/billing/health
   * Health check endpoint
   */
  fastify.get('/api/billing/health', async (_request, _reply) => {
    return {
      status: 'healthy',
      service: 'billing',
      timestamp: new Date().toISOString(),
    };
  });
}
