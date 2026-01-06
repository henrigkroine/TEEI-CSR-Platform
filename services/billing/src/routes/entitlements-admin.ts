/**
 * Entitlements Admin Routes
 * Manage plans, features, quotas, and add-ons for tenants
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createServiceLogger } from '@teei/shared-utils';
import { DEFAULT_PLAN_FEATURES, Feature } from '@teei/entitlements';

const logger = createServiceLogger('entitlements-admin-routes');

// Mock data store
interface TenantEntitlement {
  tenantId: string;
  planId: string;
  addons: string[];
  customFeatures: Array<{
    featureId: string;
    enabled: boolean;
    quotaOverride?: number;
  }>;
  usage: Record<string, { used: number; limit: number; unit: string }>;
}

const entitlementsStore = new Map<string, TenantEntitlement>();

// Available plans
const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    tier: 'starter',
    features: [
      { id: Feature.REPORT_BUILDER, name: 'Report Builder', description: 'Build custom CSR reports', category: 'reporting', enabled: true },
      { id: Feature.EXPORT_PDF, name: 'Export PDF', description: 'Export reports to PDF', category: 'export', enabled: true },
      { id: Feature.EXPORT_CSV, name: 'Export CSV', description: 'Export data to CSV', category: 'export', enabled: true },
    ],
    quotas: {
      maxSeats: 5,
      maxReportsPerMonth: 10,
      maxStorageGB: 10,
    },
  },
  {
    id: 'professional',
    name: 'Professional',
    tier: 'professional',
    features: [
      { id: Feature.REPORT_BUILDER, name: 'Report Builder', description: 'Build custom CSR reports', category: 'reporting', enabled: true },
      { id: Feature.BOARDROOM_LIVE, name: 'Boardroom Live', description: 'Real-time dashboards', category: 'dashboards', enabled: true },
      { id: Feature.FORECAST, name: 'Forecast', description: 'Predictive analytics', category: 'analytics', enabled: true },
      { id: Feature.BENCHMARKING, name: 'Benchmarking', description: 'Compare with peers', category: 'analytics', enabled: true },
      { id: Feature.NLQ, name: 'Natural Language Query', description: 'Ask questions in plain English', category: 'ai', enabled: true },
      { id: Feature.EXPORT_PDF, name: 'Export PDF', description: 'Export reports to PDF', category: 'export', enabled: true },
      { id: Feature.EXPORT_CSV, name: 'Export CSV', description: 'Export data to CSV', category: 'export', enabled: true },
      { id: Feature.EXPORT_PPTX, name: 'Export PowerPoint', description: 'Export to PPTX', category: 'export', enabled: true },
      { id: Feature.API_ACCESS, name: 'API Access', description: 'REST API access', category: 'integration', enabled: true },
    ],
    quotas: {
      maxSeats: 25,
      maxReportsPerMonth: 100,
      maxStorageGB: 100,
    },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tier: 'enterprise',
    features: [
      { id: Feature.REPORT_BUILDER, name: 'Report Builder', description: 'Build custom CSR reports', category: 'reporting', enabled: true },
      { id: Feature.BOARDROOM_LIVE, name: 'Boardroom Live', description: 'Real-time dashboards', category: 'dashboards', enabled: true },
      { id: Feature.FORECAST, name: 'Forecast', description: 'Predictive analytics', category: 'analytics', enabled: true },
      { id: Feature.BENCHMARKING, name: 'Benchmarking', description: 'Compare with peers', category: 'analytics', enabled: true },
      { id: Feature.NLQ, name: 'Natural Language Query', description: 'Ask questions in plain English', category: 'ai', enabled: true },
      { id: Feature.GEN_AI_REPORTS, name: 'Gen AI Reports', description: 'AI-generated narratives', category: 'ai', enabled: true },
      { id: Feature.EXPORT_PDF, name: 'Export PDF', description: 'Export reports to PDF', category: 'export', enabled: true },
      { id: Feature.EXPORT_CSV, name: 'Export CSV', description: 'Export data to CSV', category: 'export', enabled: true },
      { id: Feature.EXPORT_PPTX, name: 'Export PowerPoint', description: 'Export to PPTX', category: 'export', enabled: true },
      { id: Feature.API_ACCESS, name: 'API Access', description: 'REST API access', category: 'integration', enabled: true },
      { id: Feature.SSO, name: 'Single Sign-On', description: 'SAML/OIDC SSO', category: 'security', enabled: true },
      { id: Feature.CUSTOM_BRANDING, name: 'Custom Branding', description: 'White-label branding', category: 'customization', enabled: true },
      { id: Feature.PRIORITY_SUPPORT, name: 'Priority Support', description: '24/7 support', category: 'support', enabled: true },
    ],
    quotas: {
      maxSeats: null,
      maxReportsPerMonth: null,
      maxStorageGB: null,
    },
  },
];

// Available add-ons
const ADDONS = [
  {
    id: 'l2i_kintell',
    name: 'Learn-to-Impact: Kintell',
    description: 'Microlearning platform integration',
    features: ['kintell_sessions', 'learning_analytics'],
  },
  {
    id: 'l2i_buddy',
    name: 'Learn-to-Impact: Buddy Program',
    description: 'Peer mentoring and matching',
    features: ['buddy_matching', 'buddy_analytics'],
  },
  {
    id: 'l2i_full',
    name: 'Learn-to-Impact: Full Suite',
    description: 'Complete L2I platform with Kintell + Buddy',
    features: ['kintell_sessions', 'learning_analytics', 'buddy_matching', 'buddy_analytics'],
  },
  {
    id: 'advanced_analytics',
    name: 'Advanced Analytics',
    description: 'SROI, VIS, and custom metrics',
    features: ['sroi_calculator', 'vis_calculator', 'custom_metrics'],
  },
  {
    id: 'white_label',
    name: 'White Label',
    description: 'Complete branding customization',
    features: ['custom_branding', 'custom_domain', 'custom_email'],
  },
];

// Available connectors (based on plan + add-ons)
const CONNECTORS = [
  { id: 'benevity', name: 'Benevity', type: 'benevity', status: 'available', requiredAddon: null },
  { id: 'goodera', name: 'Goodera', type: 'goodera', status: 'available', requiredAddon: null },
  { id: 'workday', name: 'Workday', type: 'workday', status: 'available', requiredAddon: null },
  { id: 'salesforce', name: 'Salesforce', type: 'salesforce', status: 'available', requiredAddon: 'advanced_analytics' },
  { id: 'servicenow', name: 'ServiceNow', type: 'servicenow', status: 'available', requiredAddon: 'advanced_analytics' },
];

export async function entitlementsAdminRoutes(app: FastifyInstance) {
  // List available plans
  app.get('/admin/v2/entitlements/plans', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      return reply.code(200).send(PLANS);
    } catch (error: any) {
      logger.error('List plans error', { error });
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get tenant entitlements
  app.get('/admin/v2/entitlements/tenants/:tenantId', async (request: FastifyRequest<{ Params: { tenantId: string } }>, reply: FastifyReply) => {
    try {
      const { tenantId } = request.params;

      let entitlement = entitlementsStore.get(tenantId);
      if (!entitlement) {
        // Create default
        entitlement = {
          tenantId,
          planId: 'starter',
          addons: [],
          customFeatures: [],
          usage: {
            seats: { used: 2, limit: 5, unit: 'users' },
            reports: { used: 3, limit: 10, unit: 'reports/month' },
            storage: { used: 2, limit: 10, unit: 'GB' },
          },
        };
        entitlementsStore.set(tenantId, entitlement);
      }

      const plan = PLANS.find(p => p.id === entitlement!.planId);
      const tenantAddons = ADDONS.filter(a => entitlement!.addons.includes(a.id));

      return reply.code(200).send({
        tenantId,
        plan,
        addons: tenantAddons,
        customFeatures: entitlement.customFeatures,
        usage: entitlement.usage,
      });
    } catch (error: any) {
      logger.error('Get tenant entitlements error', { error });
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update tenant entitlements
  app.put('/admin/v2/entitlements/tenants/:tenantId', async (request: FastifyRequest<{ Params: { tenantId: string } }>, reply: FastifyReply) => {
    try {
      const { tenantId } = request.params;
      const body = request.body as any;

      let entitlement = entitlementsStore.get(tenantId);
      if (!entitlement) {
        entitlement = {
          tenantId,
          planId: 'starter',
          addons: [],
          customFeatures: [],
          usage: {},
        };
      }

      if (body.planId) {
        entitlement.planId = body.planId;
      }

      if (body.featureOverrides) {
        entitlement.customFeatures = body.featureOverrides;
      }

      entitlementsStore.set(tenantId, entitlement);

      logger.info('Tenant entitlements updated', { tenantId, planId: entitlement.planId });
      return reply.code(200).send(entitlement);
    } catch (error: any) {
      logger.error('Update entitlements error', { error });
      return reply.code(400).send({ error: error.message });
    }
  });

  // Toggle feature for tenant
  app.put('/admin/v2/entitlements/tenants/:tenantId/features/:featureId', async (request: FastifyRequest<{ Params: { tenantId: string; featureId: string } }>, reply: FastifyReply) => {
    try {
      const { tenantId, featureId } = request.params;
      const body = request.body as { enabled: boolean; quotaOverride?: number };

      let entitlement = entitlementsStore.get(tenantId);
      if (!entitlement) {
        return reply.code(404).send({ error: 'Tenant entitlements not found' });
      }

      // Update or add custom feature
      const existingIndex = entitlement.customFeatures.findIndex(f => f.featureId === featureId);
      if (existingIndex >= 0) {
        entitlement.customFeatures[existingIndex] = {
          featureId,
          enabled: body.enabled,
          quotaOverride: body.quotaOverride,
        };
      } else {
        entitlement.customFeatures.push({
          featureId,
          enabled: body.enabled,
          quotaOverride: body.quotaOverride,
        });
      }

      entitlementsStore.set(tenantId, entitlement);

      logger.info('Feature toggled', { tenantId, featureId, enabled: body.enabled });
      return reply.code(200).send({ featureId, enabled: body.enabled, quota: body.quotaOverride });
    } catch (error: any) {
      logger.error('Toggle feature error', { error });
      return reply.code(400).send({ error: error.message });
    }
  });

  // List active connectors for tenant
  app.get('/admin/v2/entitlements/tenants/:tenantId/connectors', async (request: FastifyRequest<{ Params: { tenantId: string } }>, reply: FastifyReply) => {
    try {
      const { tenantId } = request.params;

      const entitlement = entitlementsStore.get(tenantId);
      if (!entitlement) {
        return reply.code(404).send({ error: 'Tenant entitlements not found' });
      }

      const plan = PLANS.find(p => p.id === entitlement.planId);
      const tenantAddons = entitlement.addons;

      // Filter connectors based on plan and add-ons
      const activeConnectors = CONNECTORS.filter(connector => {
        if (!connector.requiredAddon) return true; // Available to all
        return tenantAddons.includes(connector.requiredAddon);
      });

      return reply.code(200).send(activeConnectors);
    } catch (error: any) {
      logger.error('List connectors error', { error });
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Attach add-on to tenant
  app.post('/admin/v2/entitlements/tenants/:tenantId/addons', async (request: FastifyRequest<{ Params: { tenantId: string } }>, reply: FastifyReply) => {
    try {
      const { tenantId } = request.params;
      const body = request.body as { addonId: string; startDate?: string };

      if (!['l2i_kintell', 'l2i_buddy', 'l2i_full', 'advanced_analytics', 'white_label'].includes(body.addonId)) {
        return reply.code(400).send({ error: 'Invalid addonId' });
      }

      let entitlement = entitlementsStore.get(tenantId);
      if (!entitlement) {
        return reply.code(404).send({ error: 'Tenant entitlements not found' });
      }

      if (!entitlement.addons.includes(body.addonId)) {
        entitlement.addons.push(body.addonId);
      }

      entitlementsStore.set(tenantId, entitlement);

      const addon = ADDONS.find(a => a.id === body.addonId);
      logger.info('Add-on attached', { tenantId, addonId: body.addonId });

      return reply.code(201).send({
        id: `addon_${Date.now()}`,
        tenantId,
        addon,
        attachedAt: new Date().toISOString(),
        startDate: body.startDate || new Date().toISOString().split('T')[0],
      });
    } catch (error: any) {
      logger.error('Attach add-on error', { error });
      return reply.code(400).send({ error: error.message });
    }
  });

  logger.info('Entitlements admin routes registered');
}
