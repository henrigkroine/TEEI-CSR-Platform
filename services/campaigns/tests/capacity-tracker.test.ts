/**
 * Capacity Tracker Tests
 *
 * SWARM 6: Agent 3.3 - capacity-tracker
 *
 * Test Coverage:
 * - All pricing models (seats, credits, IAAS, bundle, custom)
 * - Capacity enforcement (reject at 110%)
 * - Alert thresholds (80%, 90%, 100%, 110%)
 * - Overage handling
 * - Bundle quota sharing
 *
 * Target: e90% coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CapacityTracker } from '../src/lib/capacity-tracker.js';
import postgres from 'postgres';

// ============================================================================
// TEST SETUP
// ============================================================================

const TEST_DB_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/teei_test';

describe('CapacityTracker', () => {
  let sql: postgres.Sql;
  let tracker: CapacityTracker;
  let testCampaignId: string;

  beforeEach(async () => {
    // Initialize database connection
    sql = postgres(TEST_DB_URL, { max: 1 });

    // Create tracker instance
    tracker = new CapacityTracker(sql);

    // Clean up test data
    await sql`DELETE FROM campaigns WHERE name LIKE 'TEST_%'`;
  });

  afterEach(async () => {
    // Clean up test data
    if (testCampaignId) {
      await sql`DELETE FROM campaigns WHERE id = ${testCampaignId}`;
    }
    await sql.end();
  });

  // ============================================================================
  // SEATS MODEL TESTS
  // ============================================================================

  describe('Seats Model', () => {
    beforeEach(async () => {
      // Create test campaign with seats pricing
      const [campaign] = await sql`
        INSERT INTO campaigns (
          name,
          company_id,
          program_template_id,
          beneficiary_group_id,
          start_date,
          end_date,
          target_volunteers,
          current_volunteers,
          target_beneficiaries,
          budget_allocated,
          pricing_model,
          committed_seats,
          seat_price_per_month
        ) VALUES (
          'TEST_SEATS_CAMPAIGN',
          (SELECT id FROM companies LIMIT 1),
          (SELECT id FROM program_templates LIMIT 1),
          (SELECT id FROM beneficiary_groups LIMIT 1),
          '2025-01-01',
          '2025-12-31',
          50,
          0,
          100,
          25000,
          'seats',
          50,
          500
        ) RETURNING id
      `;
      testCampaignId = campaign.id;
    });

    it('should allow seat consumption under capacity', async () => {
      const result = await tracker.consumeSeat(testCampaignId, 'volunteer-1');

      expect(result.success).toBe(true);
      expect(result.allowed).toBe(true);
      expect(result.newUtilization).toBeLessThan(0.1); // 1/50 = 2%
    });

    it('should allow seat consumption up to 100%', async () => {
      // Consume 49 seats
      for (let i = 0; i < 49; i++) {
        await tracker.consumeSeat(testCampaignId, `volunteer-${i}`);
      }

      // Consume 50th seat (100%)
      const result = await tracker.consumeSeat(testCampaignId, 'volunteer-50');

      expect(result.success).toBe(true);
      expect(result.allowed).toBe(true);
      expect(result.newUtilization).toBe(1.0); // 100%
      expect(result.alerts).toBeDefined();
      expect(result.alerts![0].threshold).toBe('100%');
    });

    it('should allow overage up to 110%', async () => {
      // Set current to 50 (100%)
      await sql`UPDATE campaigns SET current_volunteers = 50 WHERE id = ${testCampaignId}`;

      // Consume additional seats (101-105, should allow up to 110%)
      for (let i = 51; i <= 55; i++) {
        const result = await tracker.consumeSeat(testCampaignId, `volunteer-${i}`);
        expect(result.success).toBe(true);
        expect(result.allowed).toBe(true);
      }

      // Verify 110% (55/50)
      const status = await tracker.getCapacityUtilization(testCampaignId);
      expect(status?.overallUtilization).toBe(1.1);
    });

    it('should block seat consumption over 110%', async () => {
      // Set current to 55 (110%)
      await sql`UPDATE campaigns SET current_volunteers = 55 WHERE id = ${testCampaignId}`;

      const result = await tracker.consumeSeat(testCampaignId, 'volunteer-56');

      expect(result.success).toBe(false);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('110%');
      expect(result.alerts).toBeDefined();
    });

    it('should trigger alert at 80% threshold', async () => {
      // Set current to 39 (78%)
      await sql`UPDATE campaigns SET current_volunteers = 39 WHERE id = ${testCampaignId}`;

      // Consume to reach 80% (40/50)
      const result = await tracker.consumeSeat(testCampaignId, 'volunteer-40');

      expect(result.alerts).toBeDefined();
      expect(result.alerts!.length).toBeGreaterThan(0);
      expect(result.alerts![0].threshold).toBe('80%');
      expect(result.alerts![0].severity).toBe('info');
      expect(result.alerts![0].recipients).toContain('sales');
    });

    it('should trigger alert at 90% threshold', async () => {
      // Set current to 44 (88%)
      await sql`UPDATE campaigns SET current_volunteers = 44 WHERE id = ${testCampaignId}`;

      // Consume to reach 90% (45/50)
      const result = await tracker.consumeSeat(testCampaignId, 'volunteer-45');

      expect(result.alerts).toBeDefined();
      expect(result.alerts![0].threshold).toBe('90%');
      expect(result.alerts![0].severity).toBe('warning');
      expect(result.alerts![0].recipients).toContain('company_admin');
    });
  });

  // ============================================================================
  // CREDITS MODEL TESTS
  // ============================================================================

  describe('Credits Model', () => {
    beforeEach(async () => {
      // Create test campaign with credits pricing
      const [campaign] = await sql`
        INSERT INTO campaigns (
          name,
          company_id,
          program_template_id,
          beneficiary_group_id,
          start_date,
          end_date,
          target_volunteers,
          target_beneficiaries,
          budget_allocated,
          pricing_model,
          credit_allocation,
          credit_consumption_rate,
          credits_remaining
        ) VALUES (
          'TEST_CREDITS_CAMPAIGN',
          (SELECT id FROM companies LIMIT 1),
          (SELECT id FROM program_templates LIMIT 1),
          (SELECT id FROM beneficiary_groups LIMIT 1),
          '2025-01-01',
          '2025-12-31',
          50,
          100,
          10000,
          'credits',
          10000,
          10,
          10000
        ) RETURNING id
      `;
      testCampaignId = campaign.id;
    });

    it('should allow credit consumption under allocation', async () => {
      const result = await tracker.consumeCredits(testCampaignId, 100);

      expect(result.success).toBe(true);
      expect(result.allowed).toBe(true);
      expect(result.newUtilization).toBe(0.01); // 100/10000 = 1%
    });

    it('should allow credit consumption up to 100%', async () => {
      const result = await tracker.consumeCredits(testCampaignId, 10000);

      expect(result.success).toBe(true);
      expect(result.allowed).toBe(true);
      expect(result.newUtilization).toBe(1.0); // 100%
      expect(result.alerts![0].threshold).toBe('100%');
    });

    it('should allow credit overage up to 110%', async () => {
      // Consume 10000 credits (100%)
      await tracker.consumeCredits(testCampaignId, 10000);

      // Consume additional credits up to 110%
      const result = await tracker.consumeCredits(testCampaignId, 1000);

      expect(result.success).toBe(true);
      expect(result.allowed).toBe(true);
      expect(result.newUtilization).toBe(1.1);
    });

    it('should block credit consumption over 110%', async () => {
      // Set credits remaining to -1000 (110% consumed)
      await sql`UPDATE campaigns SET credits_remaining = -1000 WHERE id = ${testCampaignId}`;

      const result = await tracker.consumeCredits(testCampaignId, 100);

      expect(result.success).toBe(false);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Insufficient credits');
    });

    it('should reject credits for non-credits pricing model', async () => {
      // Change pricing model to seats
      await sql`UPDATE campaigns SET pricing_model = 'seats' WHERE id = ${testCampaignId}`;

      const result = await tracker.consumeCredits(testCampaignId, 100);

      expect(result.success).toBe(false);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('does not use credits pricing model');
    });
  });

  // ============================================================================
  // IAAS MODEL TESTS
  // ============================================================================

  describe('IAAS Model', () => {
    beforeEach(async () => {
      // Create test campaign with IAAS pricing
      const [campaign] = await sql`
        INSERT INTO campaigns (
          name,
          company_id,
          program_template_id,
          beneficiary_group_id,
          start_date,
          end_date,
          target_volunteers,
          current_volunteers,
          target_beneficiaries,
          current_beneficiaries,
          budget_allocated,
          pricing_model,
          iaas_metrics
        ) VALUES (
          'TEST_IAAS_CAMPAIGN',
          (SELECT id FROM companies LIMIT 1),
          (SELECT id FROM program_templates LIMIT 1),
          (SELECT id FROM beneficiary_groups LIMIT 1),
          '2025-01-01',
          '2025-12-31',
          30,
          0,
          100,
          0,
          50000,
          'iaas',
          '{"learnersCommitted": 100, "pricePerLearner": 500, "outcomesGuaranteed": ["job_readiness > 0.7"]}'::jsonb
        ) RETURNING id
      `;
      testCampaignId = campaign.id;
    });

    it('should allow learner consumption under commitment', async () => {
      const result = await tracker.consumeLearner(testCampaignId, 'learner-1');

      expect(result.success).toBe(true);
      expect(result.allowed).toBe(true);
      expect(result.newUtilization).toBe(0.01); // 1/100 = 1%
    });

    it('should allow learner consumption up to 100%', async () => {
      // Set current to 99
      await sql`UPDATE campaigns SET current_beneficiaries = 99 WHERE id = ${testCampaignId}`;

      const result = await tracker.consumeLearner(testCampaignId, 'learner-100');

      expect(result.success).toBe(true);
      expect(result.allowed).toBe(true);
      expect(result.newUtilization).toBe(1.0);
      expect(result.alerts![0].threshold).toBe('100%');
    });

    it('should allow learner overage up to 110%', async () => {
      // Set current to 100 (100%)
      await sql`UPDATE campaigns SET current_beneficiaries = 100 WHERE id = ${testCampaignId}`;

      // Consume up to 110 learners
      for (let i = 101; i <= 110; i++) {
        const result = await tracker.consumeLearner(testCampaignId, `learner-${i}`);
        expect(result.success).toBe(true);
        expect(result.allowed).toBe(true);
      }

      const status = await tracker.getCapacityUtilization(testCampaignId);
      expect(status?.overallUtilization).toBe(1.1);
    });

    it('should block learner consumption over 110%', async () => {
      // Set current to 110 (110%)
      await sql`UPDATE campaigns SET current_beneficiaries = 110 WHERE id = ${testCampaignId}`;

      const result = await tracker.consumeLearner(testCampaignId, 'learner-111');

      expect(result.success).toBe(false);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('110%');
    });

    it('should reject learner for non-IAAS pricing model', async () => {
      // Change pricing model
      await sql`UPDATE campaigns SET pricing_model = 'seats' WHERE id = ${testCampaignId}`;

      const result = await tracker.consumeLearner(testCampaignId, 'learner-1');

      expect(result.success).toBe(false);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('does not use IAAS pricing model');
    });
  });

  // ============================================================================
  // CAPACITY UTILIZATION TESTS
  // ============================================================================

  describe('getCapacityUtilization', () => {
    beforeEach(async () => {
      // Create test campaign
      const [campaign] = await sql`
        INSERT INTO campaigns (
          name,
          company_id,
          program_template_id,
          beneficiary_group_id,
          start_date,
          end_date,
          target_volunteers,
          current_volunteers,
          target_beneficiaries,
          current_beneficiaries,
          budget_allocated,
          pricing_model,
          committed_seats
        ) VALUES (
          'TEST_UTILIZATION_CAMPAIGN',
          (SELECT id FROM companies LIMIT 1),
          (SELECT id FROM program_templates LIMIT 1),
          (SELECT id FROM beneficiary_groups LIMIT 1),
          '2025-01-01',
          '2025-12-31',
          50,
          40,
          100,
          75,
          25000,
          'seats',
          50
        ) RETURNING id
      `;
      testCampaignId = campaign.id;
    });

    it('should return comprehensive capacity status', async () => {
      const status = await tracker.getCapacityUtilization(testCampaignId);

      expect(status).toBeDefined();
      expect(status!.campaignId).toBe(testCampaignId);
      expect(status!.pricingModel).toBe('seats');

      // Volunteer capacity
      expect(status!.volunteers.target).toBe(50);
      expect(status!.volunteers.current).toBe(40);
      expect(status!.volunteers.available).toBe(10);
      expect(status!.volunteers.utilizationPercent).toBe(80);

      // Beneficiary capacity
      expect(status!.beneficiaries.target).toBe(100);
      expect(status!.beneficiaries.current).toBe(75);
      expect(status!.beneficiaries.utilizationPercent).toBe(75);

      // Seats specific
      expect(status!.seats).toBeDefined();
      expect(status!.seats!.committed).toBe(50);
      expect(status!.seats!.used).toBe(40);
      expect(status!.seats!.available).toBe(10);
      expect(status!.seats!.utilizationPercent).toBe(80);
    });

    it('should set capacity flags correctly', async () => {
      const status = await tracker.getCapacityUtilization(testCampaignId);

      expect(status!.isNearCapacity).toBe(true); // 80%
      expect(status!.isAtCapacity).toBe(false);
      expect(status!.isOverCapacity).toBe(false);
      expect(status!.allowsOverage).toBe(true);
    });

    it('should return null for non-existent campaign', async () => {
      const status = await tracker.getCapacityUtilization('00000000-0000-0000-0000-000000000000');

      expect(status).toBeNull();
    });
  });

  // ============================================================================
  // ALERT THRESHOLD TESTS
  // ============================================================================

  describe('checkCapacityThreshold', () => {
    it('should return 80% alert', async () => {
      const alerts = await tracker.checkCapacityThreshold('test-id', 0.85);

      expect(alerts.length).toBe(1);
      expect(alerts[0].threshold).toBe('80%');
      expect(alerts[0].severity).toBe('info');
      expect(alerts[0].recipients).toContain('sales');
      expect(alerts[0].metadata?.action).toBe('upsell_opportunity');
    });

    it('should return 90% alert', async () => {
      const alerts = await tracker.checkCapacityThreshold('test-id', 0.95);

      expect(alerts.length).toBe(1);
      expect(alerts[0].threshold).toBe('90%');
      expect(alerts[0].severity).toBe('warning');
      expect(alerts[0].recipients).toContain('company_admin');
    });

    it('should return 100% alert', async () => {
      const alerts = await tracker.checkCapacityThreshold('test-id', 1.05);

      expect(alerts.length).toBe(1);
      expect(alerts[0].threshold).toBe('100%');
      expect(alerts[0].severity).toBe('error');
      expect(alerts[0].recipients).toContain('company_admin');
      expect(alerts[0].recipients).toContain('cs');
    });

    it('should return 110% alert', async () => {
      const alerts = await tracker.checkCapacityThreshold('test-id', 1.15);

      expect(alerts.length).toBe(1);
      expect(alerts[0].threshold).toBe('110%');
      expect(alerts[0].severity).toBe('critical');
      expect(alerts[0].recipients).toContain('company_admin');
      expect(alerts[0].recipients).toContain('cs');
      expect(alerts[0].metadata?.escalation).toBe(true);
    });

    it('should return no alerts under 80%', async () => {
      const alerts = await tracker.checkCapacityThreshold('test-id', 0.75);

      expect(alerts.length).toBe(0);
    });
  });

  // ============================================================================
  // BUNDLE MODEL TESTS
  // ============================================================================

  describe('Bundle Model - getBundleCapacityUtilization', () => {
    let subscriptionId: string;

    beforeEach(async () => {
      // Create test L2I subscription
      const [subscription] = await sql`
        INSERT INTO l2i_subscriptions (
          company_id,
          sku,
          status,
          total_learners
        ) VALUES (
          (SELECT id FROM companies LIMIT 1),
          'L2I-500',
          'active',
          500
        ) RETURNING id
      `;
      subscriptionId = subscription.id;

      // Create multiple campaigns in bundle
      for (let i = 1; i <= 3; i++) {
        await sql`
          INSERT INTO campaigns (
            name,
            company_id,
            program_template_id,
            beneficiary_group_id,
            start_date,
            end_date,
            target_volunteers,
            current_volunteers,
            target_beneficiaries,
            budget_allocated,
            pricing_model,
            l2i_subscription_id,
            bundle_allocation_percentage
          ) VALUES (
            ${`TEST_BUNDLE_CAMPAIGN_${i}`},
            (SELECT id FROM companies LIMIT 1),
            (SELECT id FROM program_templates LIMIT 1),
            (SELECT id FROM beneficiary_groups LIMIT 1),
            '2025-01-01',
            '2025-12-31',
            ${50 * i},
            ${10 * i},
            100,
            10000,
            'bundle',
            ${subscriptionId},
            ${0.33}
          )
        `;
      }
    });

    it('should calculate bundle-wide capacity utilization', async () => {
      const bundleStatus = await tracker.getBundleCapacityUtilization(subscriptionId);

      expect(bundleStatus).toBeDefined();
      expect(bundleStatus!.campaigns.length).toBe(3);
      expect(bundleStatus!.totalConsumed).toBe(60); // 10 + 20 + 30
      expect(bundleStatus!.totalAllocated).toBe(300); // 50 + 100 + 150
      expect(bundleStatus!.utilizationPercent).toBeCloseTo(20, 0); // 60/300 = 20%
    });

    it('should return null for non-existent subscription', async () => {
      const bundleStatus = await tracker.getBundleCapacityUtilization(
        '00000000-0000-0000-0000-000000000000'
      );

      expect(bundleStatus).toBeNull();
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle campaign not found', async () => {
      const result = await tracker.consumeSeat('00000000-0000-0000-0000-000000000000', 'volunteer-1');

      expect(result.success).toBe(false);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Campaign not found');
    });

    it('should handle zero capacity', async () => {
      const [campaign] = await sql`
        INSERT INTO campaigns (
          name,
          company_id,
          program_template_id,
          beneficiary_group_id,
          start_date,
          end_date,
          target_volunteers,
          target_beneficiaries,
          budget_allocated,
          pricing_model,
          committed_seats
        ) VALUES (
          'TEST_ZERO_CAPACITY',
          (SELECT id FROM companies LIMIT 1),
          (SELECT id FROM program_templates LIMIT 1),
          (SELECT id FROM beneficiary_groups LIMIT 1),
          '2025-01-01',
          '2025-12-31',
          0,
          0,
          0,
          'seats',
          0
        ) RETURNING id
      `;

      const result = await tracker.consumeSeat(campaign.id, 'volunteer-1');

      // With zero capacity, any consumption is infinite utilization
      // Should be blocked
      expect(result.success).toBe(false);
      expect(result.allowed).toBe(false);
    });
  });
});
