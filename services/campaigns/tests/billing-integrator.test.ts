/**
 * Billing Integrator Tests
 *
 * SWARM 6: Agent 5.1 - billing-integrator
 *
 * Test Coverage:
 * - Linking campaigns to L2I subscriptions
 * - Tracking seat/credit/learner usage
 * - Campaign usage reporting for invoicing
 * - Bundle allocation validation
 * - Idempotency enforcement
 * - All pricing models (seats, credits, IAAS, bundle, custom)
 *
 * Target: ≥85% coverage
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BillingIntegrator, createBillingIntegrator } from '../src/lib/billing-integrator.js';
import postgres from 'postgres';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// TEST SETUP
// ============================================================================

const TEST_DB_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/teei_test';

describe('BillingIntegrator', () => {
  let sql: postgres.Sql;
  let integrator: BillingIntegrator;
  let testCompanyId: string;
  let testL2ISubscriptionId: string;
  let testCampaignId: string;
  let testBundleId: string;

  beforeEach(async () => {
    sql = postgres(TEST_DB_URL, { max: 1 });
    integrator = createBillingIntegrator(sql);

    // Create test company
    const [company] = await sql`
      INSERT INTO companies (name, email)
      VALUES ('TEST_BILLING_CO', 'test@billing.example.com')
      RETURNING id
    `;
    testCompanyId = company.id;

    // Create test L2I bundle
    const [bundle] = await sql`
      INSERT INTO l2i_bundles (
        sku, name, description, annual_price, impact_tier,
        learners_supported, recognition_badge, default_allocation
      )
      VALUES (
        'L2I-TEST', 'Test Bundle', 'Test bundle for billing', 50000,
        'tier1', 100, 'bronze',
        '{"language": 0.25, "mentorship": 0.25, "upskilling": 0.25, "weei": 0.25}'
      )
      RETURNING id
    `;
    testBundleId = bundle.id;

    // Create test L2I subscription
    const [subscription] = await sql`
      INSERT INTO l2i_subscriptions (
        company_id, bundle_id, sku, quantity,
        current_period_start, current_period_end, status,
        program_allocation
      )
      VALUES (
        ${testCompanyId}, ${testBundleId}, 'L2I-TEST', 1,
        NOW(), NOW() + INTERVAL '1 year', 'active',
        '{"language": 0.25, "mentorship": 0.25, "upskilling": 0.25, "weei": 0.25}'
      )
      RETURNING id
    `;
    testL2ISubscriptionId = subscription.id;

    // Clean up test data
    await sql`DELETE FROM billing_usage_records WHERE company_id = ${testCompanyId}`;
    await sql`DELETE FROM campaigns WHERE company_id = ${testCompanyId}`;
  });

  afterEach(async () => {
    // Clean up
    if (testCampaignId) {
      await sql`DELETE FROM campaigns WHERE id = ${testCampaignId}`;
    }
    if (testCompanyId) {
      await sql`DELETE FROM billing_usage_records WHERE company_id = ${testCompanyId}`;
      await sql`DELETE FROM l2i_subscriptions WHERE company_id = ${testCompanyId}`;
      await sql`DELETE FROM companies WHERE id = ${testCompanyId}`;
    }
    if (testBundleId) {
      await sql`DELETE FROM l2i_bundles WHERE id = ${testBundleId}`;
    }
    await sql.end();
  });

  // ============================================================================
  // LINK CAMPAIGN TO SUBSCRIPTION TESTS
  // ============================================================================

  describe('linkCampaignToSubscription', () => {
    it('should link a campaign to L2I subscription successfully', async () => {
      // Create test campaign with bundle pricing
      const [campaign] = await sql`
        INSERT INTO campaigns (
          name, company_id, program_template_id, beneficiary_group_id,
          start_date, end_date, target_volunteers, target_beneficiaries,
          budget_allocated, pricing_model
        )
        VALUES (
          'TEST_BUNDLE_CAMPAIGN', ${testCompanyId},
          (SELECT id FROM program_templates LIMIT 1),
          (SELECT id FROM beneficiary_groups LIMIT 1),
          '2025-01-01', '2025-12-31', 50, 100, 25000, 'bundle'
        )
        RETURNING id
      `;
      testCampaignId = campaign.id;

      const result = await integrator.linkCampaignToSubscription(
        testCampaignId,
        testL2ISubscriptionId,
        0.5
      );

      expect(result.success).toBe(true);

      // Verify campaign was updated
      const [updated] = await sql`
        SELECT l2i_subscription_id, bundle_allocation_percentage
        FROM campaigns WHERE id = ${testCampaignId}
      `;
      expect(updated.l2i_subscription_id).toBe(testL2ISubscriptionId);
      expect(parseFloat(updated.bundle_allocation_percentage)).toBe(0.5);
    });

    it('should reject invalid subscription ID', async () => {
      const [campaign] = await sql`
        INSERT INTO campaigns (
          name, company_id, program_template_id, beneficiary_group_id,
          start_date, end_date, target_volunteers, target_beneficiaries,
          budget_allocated, pricing_model
        )
        VALUES (
          'TEST_CAMPAIGN_2', ${testCompanyId},
          (SELECT id FROM program_templates LIMIT 1),
          (SELECT id FROM beneficiary_groups LIMIT 1),
          '2025-01-01', '2025-12-31', 50, 100, 25000, 'bundle'
        )
        RETURNING id
      `;
      testCampaignId = campaign.id;

      const result = await integrator.linkCampaignToSubscription(
        testCampaignId,
        uuidv4(),
        0.5
      );

      expect(result.success).toBe(false);
      expect(result.reason).toContain('not found');
    });

    it('should reject invalid allocation percentage', async () => {
      const [campaign] = await sql`
        INSERT INTO campaigns (
          name, company_id, program_template_id, beneficiary_group_id,
          start_date, end_date, target_volunteers, target_beneficiaries,
          budget_allocated, pricing_model
        )
        VALUES (
          'TEST_CAMPAIGN_3', ${testCompanyId},
          (SELECT id FROM program_templates LIMIT 1),
          (SELECT id FROM beneficiary_groups LIMIT 1),
          '2025-01-01', '2025-12-31', 50, 100, 25000, 'bundle'
        )
        RETURNING id
      `;
      testCampaignId = campaign.id;

      const result = await integrator.linkCampaignToSubscription(
        testCampaignId,
        testL2ISubscriptionId,
        1.5 // > 100%
      );

      expect(result.success).toBe(false);
      expect(result.reason).toContain('between 0 and 1');
    });

    it('should reject non-bundle pricing models', async () => {
      const [campaign] = await sql`
        INSERT INTO campaigns (
          name, company_id, program_template_id, beneficiary_group_id,
          start_date, end_date, target_volunteers, target_beneficiaries,
          budget_allocated, pricing_model, committed_seats, seat_price_per_month
        )
        VALUES (
          'TEST_SEATS_CAMPAIGN', ${testCompanyId},
          (SELECT id FROM program_templates LIMIT 1),
          (SELECT id FROM beneficiary_groups LIMIT 1),
          '2025-01-01', '2025-12-31', 50, 100, 25000, 'seats', 50, 500
        )
        RETURNING id
      `;
      testCampaignId = campaign.id;

      const result = await integrator.linkCampaignToSubscription(
        testCampaignId,
        testL2ISubscriptionId,
        0.5
      );

      expect(result.success).toBe(false);
      expect(result.reason).toContain('not bundle');
    });
  });

  // ============================================================================
  // TRACK CAMPAIGN USAGE TESTS
  // ============================================================================

  describe('trackCampaignUsage', () => {
    it('should track seat usage successfully', async () => {
      const [campaign] = await sql`
        INSERT INTO campaigns (
          name, company_id, program_template_id, beneficiary_group_id,
          start_date, end_date, target_volunteers, target_beneficiaries,
          budget_allocated, pricing_model, committed_seats, seat_price_per_month
        )
        VALUES (
          'TEST_SEATS_CAMPAIGN', ${testCompanyId},
          (SELECT id FROM program_templates LIMIT 1),
          (SELECT id FROM beneficiary_groups LIMIT 1),
          '2025-01-01', '2025-12-31', 50, 100, 25000, 'seats', 50, 500
        )
        RETURNING id
      `;
      testCampaignId = campaign.id;

      const result = await integrator.trackCampaignUsage({
        campaignId: testCampaignId,
        eventType: 'seat_usage',
        quantity: 10,
        timestamp: new Date()
      });

      expect(result.success).toBe(true);
      expect(result.isDuplicate).toBe(false);
      expect(result.usageRecordId).toBeDefined();
    });

    it('should track credit usage successfully', async () => {
      const [campaign] = await sql`
        INSERT INTO campaigns (
          name, company_id, program_template_id, beneficiary_group_id,
          start_date, end_date, target_volunteers, target_beneficiaries,
          budget_allocated, pricing_model,
          credit_allocation, credit_consumption_rate, credits_remaining
        )
        VALUES (
          'TEST_CREDITS_CAMPAIGN', ${testCompanyId},
          (SELECT id FROM program_templates LIMIT 1),
          (SELECT id FROM beneficiary_groups LIMIT 1),
          '2025-01-01', '2025-12-31', 50, 100, 10000, 'credits',
          1000, 10, 1000
        )
        RETURNING id
      `;
      testCampaignId = campaign.id;

      const result = await integrator.trackCampaignUsage({
        campaignId: testCampaignId,
        eventType: 'credit_usage',
        quantity: 100,
        timestamp: new Date()
      });

      expect(result.success).toBe(true);
      expect(result.isDuplicate).toBe(false);
    });

    it('should enforce idempotency - prevent duplicate usage records', async () => {
      const [campaign] = await sql`
        INSERT INTO campaigns (
          name, company_id, program_template_id, beneficiary_group_id,
          start_date, end_date, target_volunteers, target_beneficiaries,
          budget_allocated, pricing_model
        )
        VALUES (
          'TEST_IDEMPOTENT_CAMPAIGN', ${testCompanyId},
          (SELECT id FROM program_templates LIMIT 1),
          (SELECT id FROM beneficiary_groups LIMIT 1),
          '2025-01-01', '2025-12-31', 50, 100, 25000, 'seats'
        )
        RETURNING id
      `;
      testCampaignId = campaign.id;

      const timestamp = new Date();
      const metadata = { source: 'test' };

      // First call
      const result1 = await integrator.trackCampaignUsage({
        campaignId: testCampaignId,
        eventType: 'seat_usage',
        quantity: 5,
        timestamp,
        metadata
      });

      expect(result1.success).toBe(true);
      expect(result1.isDuplicate).toBe(false);

      // Second call with same parameters (should be detected as duplicate)
      const result2 = await integrator.trackCampaignUsage({
        campaignId: testCampaignId,
        eventType: 'seat_usage',
        quantity: 5,
        timestamp,
        metadata
      });

      expect(result2.success).toBe(true);
      expect(result2.isDuplicate).toBe(true);
      expect(result2.deduplicationKey).toBe(result1.deduplicationKey);
    });

    it('should handle invalid campaign ID', async () => {
      const result = await integrator.trackCampaignUsage({
        campaignId: uuidv4(),
        eventType: 'seat_usage',
        quantity: 10,
        timestamp: new Date()
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain('not found');
    });

    it('should track learner_served events', async () => {
      const [campaign] = await sql`
        INSERT INTO campaigns (
          name, company_id, program_template_id, beneficiary_group_id,
          start_date, end_date, target_volunteers, target_beneficiaries,
          budget_allocated, pricing_model, iaas_metrics
        )
        VALUES (
          'TEST_IAAS_CAMPAIGN', ${testCompanyId},
          (SELECT id FROM program_templates LIMIT 1),
          (SELECT id FROM beneficiary_groups LIMIT 1),
          '2025-01-01', '2025-12-31', 50, 100, 50000, 'iaas',
          '{"learnersCommitted": 100, "pricePerLearner": 500}'
        )
        RETURNING id
      `;
      testCampaignId = campaign.id;

      const result = await integrator.trackCampaignUsage({
        campaignId: testCampaignId,
        eventType: 'learner_served',
        quantity: 5,
        timestamp: new Date()
      });

      expect(result.success).toBe(true);
    });

    it('should track session_completed events', async () => {
      const [campaign] = await sql`
        INSERT INTO campaigns (
          name, company_id, program_template_id, beneficiary_group_id,
          start_date, end_date, target_volunteers, target_beneficiaries,
          budget_allocated, pricing_model
        )
        VALUES (
          'TEST_SESSION_CAMPAIGN', ${testCompanyId},
          (SELECT id FROM program_templates LIMIT 1),
          (SELECT id FROM beneficiary_groups LIMIT 1),
          '2025-01-01', '2025-12-31', 50, 100, 25000, 'seats'
        )
        RETURNING id
      `;
      testCampaignId = campaign.id;

      const result = await integrator.trackCampaignUsage({
        campaignId: testCampaignId,
        eventType: 'session_completed',
        quantity: 3,
        timestamp: new Date()
      });

      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // GET CAMPAIGN USAGE FOR BILLING TESTS
  // ============================================================================

  describe('getCampaignUsageForBilling', () => {
    it('should return campaign usage summary for seats model', async () => {
      const [campaign] = await sql`
        INSERT INTO campaigns (
          name, company_id, program_template_id, beneficiary_group_id,
          start_date, end_date, target_volunteers, target_beneficiaries,
          budget_allocated, pricing_model, committed_seats, seat_price_per_month,
          current_volunteers
        )
        VALUES (
          'TEST_SEATS_SUMMARY', ${testCompanyId},
          (SELECT id FROM program_templates LIMIT 1),
          (SELECT id FROM beneficiary_groups LIMIT 1),
          '2025-01-01', '2025-12-31', 50, 100, 25000, 'seats', 50, 500, 30
        )
        RETURNING id
      `;
      testCampaignId = campaign.id;

      const period = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31')
      };

      const summary = await integrator.getCampaignUsageForBilling(testCampaignId, period);

      expect(summary).not.toBeNull();
      expect(summary!.campaignId).toBe(testCampaignId);
      expect(summary!.pricingModel).toBe('seats');
      expect(summary!.usage.seatsUsed).toBe(30);
      expect(summary!.billing.unitPrice).toBe(500);
    });

    it('should return campaign usage summary for credits model', async () => {
      const [campaign] = await sql`
        INSERT INTO campaigns (
          name, company_id, program_template_id, beneficiary_group_id,
          start_date, end_date, target_volunteers, target_beneficiaries,
          budget_allocated, pricing_model,
          credit_allocation, credit_consumption_rate, credits_remaining
        )
        VALUES (
          'TEST_CREDITS_SUMMARY', ${testCompanyId},
          (SELECT id FROM program_templates LIMIT 1),
          (SELECT id FROM beneficiary_groups LIMIT 1),
          '2025-01-01', '2025-12-31', 50, 100, 10000, 'credits',
          1000, 10, 900
        )
        RETURNING id
      `;
      testCampaignId = campaign.id;

      const period = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31')
      };

      const summary = await integrator.getCampaignUsageForBilling(testCampaignId, period);

      expect(summary).not.toBeNull();
      expect(summary!.pricingModel).toBe('credits');
      expect(summary!.billing.unitPrice).toBe(10);
    });

    it('should return null for non-existent campaign', async () => {
      const period = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31')
      };

      const summary = await integrator.getCampaignUsageForBilling(uuidv4(), period);

      expect(summary).toBeNull();
    });

    it('should calculate L2I allocation for bundle model', async () => {
      const [campaign] = await sql`
        INSERT INTO campaigns (
          name, company_id, program_template_id, beneficiary_group_id,
          start_date, end_date, target_volunteers, target_beneficiaries,
          budget_allocated, pricing_model, l2i_subscription_id,
          bundle_allocation_percentage
        )
        VALUES (
          'TEST_BUNDLE_SUMMARY', ${testCompanyId},
          (SELECT id FROM program_templates LIMIT 1),
          (SELECT id FROM beneficiary_groups LIMIT 1),
          '2025-01-01', '2025-12-31', 50, 100, 10000, 'bundle',
          ${testL2ISubscriptionId}, 0.25
        )
        RETURNING id
      `;
      testCampaignId = campaign.id;

      const period = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31')
      };

      const summary = await integrator.getCampaignUsageForBilling(testCampaignId, period);

      expect(summary).not.toBeNull();
      expect(summary!.pricingModel).toBe('bundle');
      expect(summary!.l2iAllocation).toBeDefined();
      expect(summary!.l2iAllocation!.allocationPercentage).toBe(0.25);
      expect(summary!.l2iAllocation!.allocatedAmount).toBe(2500);
    });
  });

  // ============================================================================
  // SPLIT BUNDLE ACROSS CAMPAIGNS TESTS
  // ============================================================================

  describe('splitBundleAcrossCampaigns', () => {
    it('should validate bundle allocation with 100% total', async () => {
      // Create campaigns totaling 100% allocation
      const [c1] = await sql`
        INSERT INTO campaigns (
          name, company_id, program_template_id, beneficiary_group_id,
          start_date, end_date, target_volunteers, target_beneficiaries,
          budget_allocated, pricing_model, l2i_subscription_id,
          bundle_allocation_percentage
        )
        VALUES (
          'TEST_BUNDLE_C1', ${testCompanyId},
          (SELECT id FROM program_templates LIMIT 1),
          (SELECT id FROM beneficiary_groups LIMIT 1),
          '2025-01-01', '2025-12-31', 50, 100, 5000, 'bundle',
          ${testL2ISubscriptionId}, 0.5
        )
        RETURNING id
      `;

      const [c2] = await sql`
        INSERT INTO campaigns (
          name, company_id, program_template_id, beneficiary_group_id,
          start_date, end_date, target_volunteers, target_beneficiaries,
          budget_allocated, pricing_model, l2i_subscription_id,
          bundle_allocation_percentage
        )
        VALUES (
          'TEST_BUNDLE_C2', ${testCompanyId},
          (SELECT id FROM program_templates LIMIT 1),
          (SELECT id FROM beneficiary_groups LIMIT 1),
          '2025-01-01', '2025-12-31', 50, 100, 5000, 'bundle',
          ${testL2ISubscriptionId}, 0.5
        )
        RETURNING id
      `;

      const result = await integrator.splitBundleAcrossCampaigns(testL2ISubscriptionId);

      expect(result.validation.isValid).toBe(true);
      expect(result.totalAllocationPercentage).toBeCloseTo(1.0, 2);
      expect(result.campaigns.length).toBe(2);
    });

    it('should detect over-allocation', async () => {
      // Create campaigns totaling > 100% allocation
      await sql`
        INSERT INTO campaigns (
          name, company_id, program_template_id, beneficiary_group_id,
          start_date, end_date, target_volunteers, target_beneficiaries,
          budget_allocated, pricing_model, l2i_subscription_id,
          bundle_allocation_percentage
        )
        VALUES (
          'TEST_OVER_C1', ${testCompanyId},
          (SELECT id FROM program_templates LIMIT 1),
          (SELECT id FROM beneficiary_groups LIMIT 1),
          '2025-01-01', '2025-12-31', 50, 100, 6000, 'bundle',
          ${testL2ISubscriptionId}, 0.6
        )
      `;

      await sql`
        INSERT INTO campaigns (
          name, company_id, program_template_id, beneficiary_group_id,
          start_date, end_date, target_volunteers, target_beneficiaries,
          budget_allocated, pricing_model, l2i_subscription_id,
          bundle_allocation_percentage
        )
        VALUES (
          'TEST_OVER_C2', ${testCompanyId},
          (SELECT id FROM program_templates LIMIT 1),
          (SELECT id FROM beneficiary_groups LIMIT 1),
          '2025-01-01', '2025-12-31', 50, 100, 6000, 'bundle',
          ${testL2ISubscriptionId}, 0.6
        )
      `;

      const result = await integrator.splitBundleAcrossCampaigns(testL2ISubscriptionId);

      expect(result.validation.isValid).toBe(false);
      expect(result.validation.errors.length).toBeGreaterThan(0);
      expect(result.validation.errors[0]).toContain('exceeds 100%');
    });

    it('should handle non-existent subscription', async () => {
      const result = await integrator.splitBundleAcrossCampaigns(uuidv4());

      expect(result.validation.isValid).toBe(false);
      expect(result.validation.errors[0]).toContain('not found');
    });
  });

  // ============================================================================
  // VALIDATE BUNDLE CAPACITY TESTS
  // ============================================================================

  describe('validateBundleCapacity', () => {
    it('should validate active bundle campaigns', async () => {
      const [campaign] = await sql`
        INSERT INTO campaigns (
          name, company_id, program_template_id, beneficiary_group_id,
          start_date, end_date, target_volunteers, target_beneficiaries,
          budget_allocated, pricing_model, l2i_subscription_id,
          bundle_allocation_percentage
        )
        VALUES (
          'TEST_VALID_BUNDLE', ${testCompanyId},
          (SELECT id FROM program_templates LIMIT 1),
          (SELECT id FROM beneficiary_groups LIMIT 1),
          '2025-01-01', '2025-12-31', 50, 100, 5000, 'bundle',
          ${testL2ISubscriptionId}, 0.5
        )
        RETURNING id
      `;

      const result = await integrator.validateBundleCapacity(campaign.id);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should skip validation for non-bundle campaigns', async () => {
      const [campaign] = await sql`
        INSERT INTO campaigns (
          name, company_id, program_template_id, beneficiary_group_id,
          start_date, end_date, target_volunteers, target_beneficiaries,
          budget_allocated, pricing_model, committed_seats, seat_price_per_month
        )
        VALUES (
          'TEST_SEATS_VALIDATE', ${testCompanyId},
          (SELECT id FROM program_templates LIMIT 1),
          (SELECT id FROM beneficiary_groups LIMIT 1),
          '2025-01-01', '2025-12-31', 50, 100, 25000, 'seats', 50, 500
        )
        RETURNING id
      `;

      const result = await integrator.validateBundleCapacity(campaign.id);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should detect invalid allocation percentages', async () => {
      const [campaign] = await sql`
        INSERT INTO campaigns (
          name, company_id, program_template_id, beneficiary_group_id,
          start_date, end_date, target_volunteers, target_beneficiaries,
          budget_allocated, pricing_model, l2i_subscription_id,
          bundle_allocation_percentage
        )
        VALUES (
          'TEST_INVALID_ALLOC', ${testCompanyId},
          (SELECT id FROM program_templates LIMIT 1),
          (SELECT id FROM beneficiary_groups LIMIT 1),
          '2025-01-01', '2025-12-31', 50, 100, 5000, 'bundle',
          ${testL2ISubscriptionId}, 1.5
        )
        RETURNING id
      `;

      const result = await integrator.validateBundleCapacity(campaign.id);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('allocation percentage'))).toBe(true);
    });
  });

  // ============================================================================
  // GET CAMPAIGNS BY L2I SUBSCRIPTION TESTS
  // ============================================================================

  describe('getCampaignsByL2ISubscription', () => {
    it('should return all campaigns for a subscription', async () => {
      await sql`
        INSERT INTO campaigns (
          name, company_id, program_template_id, beneficiary_group_id,
          start_date, end_date, target_volunteers, target_beneficiaries,
          budget_allocated, pricing_model, l2i_subscription_id,
          bundle_allocation_percentage
        )
        VALUES (
          'TEST_SUB_C1', ${testCompanyId},
          (SELECT id FROM program_templates LIMIT 1),
          (SELECT id FROM beneficiary_groups LIMIT 1),
          '2025-01-01', '2025-12-31', 50, 100, 5000, 'bundle',
          ${testL2ISubscriptionId}, 0.5
        )
      `;

      await sql`
        INSERT INTO campaigns (
          name, company_id, program_template_id, beneficiary_group_id,
          start_date, end_date, target_volunteers, target_beneficiaries,
          budget_allocated, pricing_model, l2i_subscription_id,
          bundle_allocation_percentage
        )
        VALUES (
          'TEST_SUB_C2', ${testCompanyId},
          (SELECT id FROM program_templates LIMIT 1),
          (SELECT id FROM beneficiary_groups LIMIT 1),
          '2025-01-01', '2025-12-31', 50, 100, 5000, 'bundle',
          ${testL2ISubscriptionId}, 0.5
        )
      `;

      const campaigns = await integrator.getCampaignsByL2ISubscription(testL2ISubscriptionId);

      expect(campaigns.length).toBe(2);
      expect(campaigns[0].l2i_subscription_id).toBe(testL2ISubscriptionId);
    });

    it('should return empty list for non-existent subscription', async () => {
      const campaigns = await integrator.getCampaignsByL2ISubscription(uuidv4());

      expect(campaigns.length).toBe(0);
    });
  });

  // ============================================================================
  // GET USAGE RECORDS FOR INVOICING TESTS
  // ============================================================================

  describe('getUsageRecordsForInvoicing', () => {
    it('should return usage records grouped by campaign', async () => {
      const [campaign] = await sql`
        INSERT INTO campaigns (
          name, company_id, program_template_id, beneficiary_group_id,
          start_date, end_date, target_volunteers, target_beneficiaries,
          budget_allocated, pricing_model
        )
        VALUES (
          'TEST_INVOICE_CAMPAIGN', ${testCompanyId},
          (SELECT id FROM program_templates LIMIT 1),
          (SELECT id FROM beneficiary_groups LIMIT 1),
          '2025-01-01', '2025-12-31', 50, 100, 25000, 'seats'
        )
        RETURNING id
      `;

      // Create usage records
      await integrator.trackCampaignUsage({
        campaignId: campaign.id,
        eventType: 'seat_usage',
        quantity: 10,
        timestamp: new Date()
      });

      const records = await integrator.getUsageRecordsForInvoicing(testCompanyId, {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      });

      expect(records.length).toBeGreaterThan(0);
      expect(records[0].events.length).toBeGreaterThan(0);
    });

    it('should return empty list for period with no records', async () => {
      const records = await integrator.getUsageRecordsForInvoicing(testCompanyId, {
        start: new Date('2020-01-01'),
        end: new Date('2020-01-31')
      });

      expect(records.length).toBe(0);
    });
  });
});
