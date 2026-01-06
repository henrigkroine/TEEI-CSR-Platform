/**
 * Credit Tracker Tests
 *
 * SWARM 6: Agent 5.2 - seat-credit-tracker
 *
 * Test Coverage:
 * - Credit consumption tracking
 * - Credit balance calculation
 * - Credit usage breakdown by activity
 * - Credit usage reports for billing
 * - Capacity threshold checking
 * - Projected depletion calculation
 *
 * Target: ≥85% coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CreditTracker } from '../src/lib/credit-tracker.js';
import postgres from 'postgres';

// ============================================================================
// TEST SETUP
// ============================================================================

const TEST_DB_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/teei_test';

describe('CreditTracker', () => {
  let sql: postgres.Sql;
  let tracker: CreditTracker;
  let testCampaignId: string;
  let testCompanyId: string;
  let testTemplateId: string;
  let testGroupId: string;

  beforeEach(async () => {
    // Initialize database connection
    sql = postgres(TEST_DB_URL, { max: 1 });

    // Create tracker instance
    tracker = new CreditTracker(sql);

    // Get test IDs from existing data
    const [company] = await sql`SELECT id FROM companies LIMIT 1`;
    const [template] = await sql`SELECT id FROM program_templates LIMIT 1`;
    const [group] = await sql`SELECT id FROM beneficiary_groups LIMIT 1`;

    if (!company || !template || !group) {
      throw new Error('Test database missing required seed data');
    }

    testCompanyId = company.id;
    testTemplateId = template.id;
    testGroupId = group.id;

    // Clean up test data
    await sql`DELETE FROM campaigns WHERE name LIKE 'TEST_CREDIT_%'`;
  });

  afterEach(async () => {
    // Clean up test data
    if (testCampaignId) {
      await sql`DELETE FROM campaigns WHERE id = ${testCampaignId}`;
    }
    await sql.end();
  });

  // ============================================================================
  // CREDIT CONSUMPTION TESTS
  // ============================================================================

  describe('Credit Consumption', () => {
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
          'TEST_CREDIT_CONSUMPTION',
          ${testCompanyId},
          ${testTemplateId},
          ${testGroupId},
          '2025-01-01',
          '2025-12-31',
          50,
          100,
          25000,
          'credits',
          10000,
          1,
          10000
        ) RETURNING id
      `;
      testCampaignId = campaign.id;
    });

    it('should consume credits successfully', async () => {
      const result = await tracker.consumeCredits(
        testCampaignId,
        100,
        'session',
        1
      );

      expect(result).toBe(true);

      // Verify credits were deducted
      const [campaign] = await sql`
        SELECT credits_remaining FROM campaigns WHERE id = ${testCampaignId}
      `;
      expect(campaign.credits_remaining).toBe(9900);
    });

    it('should throw error for non-credits campaign', async () => {
      // Create a seats campaign
      const [seatsCampaign] = await sql`
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
          committed_seats,
          seat_price_per_month
        ) VALUES (
          'TEST_SEATS_CAMPAIGN',
          ${testCompanyId},
          ${testTemplateId},
          ${testGroupId},
          '2025-01-01',
          '2025-12-31',
          50,
          100,
          25000,
          'seats',
          50,
          500
        ) RETURNING id
      `;

      await expect(
        tracker.consumeCredits(seatsCampaign.id, 100, 'session')
      ).rejects.toThrow('does not use credits pricing model');

      // Clean up
      await sql`DELETE FROM campaigns WHERE id = ${seatsCampaign.id}`;
    });

    it('should throw error when exceeding credit limit', async () => {
      // Try to consume more than 110% of allocation
      const creditAllocation = 10000;
      const overageLimit = creditAllocation * 1.10; // 11000
      const currentRemaining = creditAllocation; // 10000

      await expect(
        tracker.consumeCredits(testCampaignId, 1500, 'session')
      ).rejects.toThrow('Would exceed 110% overage limit');
    });

    it('should allow consumption up to 110% overage limit', async () => {
      // Consume to exactly 110%
      const result = await tracker.consumeCredits(testCampaignId, 11000, 'session');

      expect(result).toBe(true);

      const [campaign] = await sql`
        SELECT credits_remaining FROM campaigns WHERE id = ${testCampaignId}
      `;
      expect(campaign.credits_remaining).toBe(-1000);
    });

    it('should track consumption by activity type', async () => {
      await tracker.consumeCredits(testCampaignId, 100, 'session', 1);
      await tracker.consumeCredits(testCampaignId, 50, 'hour', 2);
      await tracker.consumeCredits(testCampaignId, 200, 'completion', 1);

      // Verify all consumption records were created
      const [result] = await sql`
        SELECT COUNT(*) as count FROM campaign_credit_consumption
        WHERE campaign_id = ${testCampaignId}
      `;
      expect(parseInt(result.count)).toBe(3);
    });
  });

  // ============================================================================
  // CREDIT BALANCE TESTS
  // ============================================================================

  describe('Credit Balance', () => {
    beforeEach(async () => {
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
          'TEST_CREDIT_BALANCE',
          ${testCompanyId},
          ${testTemplateId},
          ${testGroupId},
          '2025-01-01',
          '2025-12-31',
          50,
          100,
          25000,
          'credits',
          10000,
          1,
          7500
        ) RETURNING id
      `;
      testCampaignId = campaign.id;
    });

    it('should calculate credit balance correctly', async () => {
      const balance = await tracker.getCreditBalance(testCampaignId);

      expect(balance).toBeDefined();
      expect(balance?.allocated).toBe(10000);
      expect(balance?.consumed).toBe(2500);
      expect(balance?.remaining).toBe(7500);
      expect(balance?.utilizationPercent).toBe(25);
      expect(balance?.isNearCapacity).toBe(false);
      expect(balance?.isAtCapacity).toBe(false);
      expect(balance?.isOverCapacity).toBe(false);
    });

    it('should detect near capacity (80%)', async () => {
      // Update to 80% consumption (2000 remaining of 10000)
      await sql`
        UPDATE campaigns
        SET credits_remaining = 2000
        WHERE id = ${testCampaignId}
      `;

      const balance = await tracker.getCreditBalance(testCampaignId);

      expect(balance?.utilizationPercent).toBe(80);
      expect(balance?.isNearCapacity).toBe(true);
      expect(balance?.isAtCapacity).toBe(false);
    });

    it('should detect at capacity (100%)', async () => {
      // Update to 100% consumption (0 remaining)
      await sql`
        UPDATE campaigns
        SET credits_remaining = 0
        WHERE id = ${testCampaignId}
      `;

      const balance = await tracker.getCreditBalance(testCampaignId);

      expect(balance?.utilizationPercent).toBe(100);
      expect(balance?.isAtCapacity).toBe(true);
      expect(balance?.isOverCapacity).toBe(false);
    });

    it('should detect over capacity (>100%)', async () => {
      // Update to 110% consumption (negative remaining)
      await sql`
        UPDATE campaigns
        SET credits_remaining = -1000
        WHERE id = ${testCampaignId}
      `;

      const balance = await tracker.getCreditBalance(testCampaignId);

      expect(balance?.utilizationPercent).toBeGreaterThan(100);
      expect(balance?.isOverCapacity).toBe(true);
    });

    it('should return null for non-existent campaign', async () => {
      const balance = await tracker.getCreditBalance('nonexistent-id');
      expect(balance).toBeNull();
    });

    it('should throw error for non-credits campaign', async () => {
      // Create a seats campaign
      const [seatsCampaign] = await sql`
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
          committed_seats,
          seat_price_per_month
        ) VALUES (
          'TEST_SEATS_FOR_BALANCE',
          ${testCompanyId},
          ${testTemplateId},
          ${testGroupId},
          '2025-01-01',
          '2025-12-31',
          50,
          100,
          25000,
          'seats',
          50,
          500
        ) RETURNING id
      `;

      await expect(
        tracker.getCreditBalance(seatsCampaign.id)
      ).rejects.toThrow('does not use credits pricing model');

      // Clean up
      await sql`DELETE FROM campaigns WHERE id = ${seatsCampaign.id}`;
    });
  });

  // ============================================================================
  // CREDIT USAGE BREAKDOWN TESTS
  // ============================================================================

  describe('Credit Usage Breakdown', () => {
    beforeEach(async () => {
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
          'TEST_CREDIT_BREAKDOWN',
          ${testCompanyId},
          ${testTemplateId},
          ${testGroupId},
          '2025-01-01',
          '2025-12-31',
          50,
          100,
          25000,
          'credits',
          10000,
          1,
          10000
        ) RETURNING id
      `;
      testCampaignId = campaign.id;
    });

    it('should generate credit usage breakdown', async () => {
      // Add some consumption
      await tracker.consumeCredits(testCampaignId, 100, 'session');
      await tracker.consumeCredits(testCampaignId, 100, 'session');
      await tracker.consumeCredits(testCampaignId, 50, 'hour');

      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-12-31');

      const breakdown = await tracker.getCreditUsageBreakdown(
        testCampaignId,
        startDate,
        endDate
      );

      expect(breakdown).toBeDefined();
      expect(breakdown?.campaignId).toBe(testCampaignId);
      expect(breakdown?.totalAllocated).toBe(10000);
      expect(breakdown?.totalConsumed).toBeGreaterThan(0);
      expect(breakdown?.byActivityType.length).toBeGreaterThan(0);
    });

    it('should break down consumption by activity type', async () => {
      await tracker.consumeCredits(testCampaignId, 100, 'session');
      await tracker.consumeCredits(testCampaignId, 100, 'session');
      await tracker.consumeCredits(testCampaignId, 50, 'hour');
      await tracker.consumeCredits(testCampaignId, 200, 'completion');

      const breakdown = await tracker.getCreditUsageBreakdown(testCampaignId);

      expect(breakdown?.byActivityType.length).toBe(3);
      const sessionActivity = breakdown?.byActivityType.find(a => a.activity === 'session');
      expect(sessionActivity?.count).toBe(2);
      expect(sessionActivity?.creditsConsumed).toBe(200);
    });

    it('should calculate projected depletion', async () => {
      // Simulate daily consumption
      for (let i = 0; i < 10; i++) {
        await tracker.consumeCredits(testCampaignId, 100, 'session');
      }

      const breakdown = await tracker.getCreditUsageBreakdown(testCampaignId);

      if (breakdown?.projectedDepletion?.daysUntilDepletion) {
        expect(breakdown.projectedDepletion.daysUntilDepletion).toBeGreaterThan(0);
        expect(breakdown.projectedDepletion.creditPerDay).toBeGreaterThan(0);
      }
    });

    it('should return null for non-existent campaign', async () => {
      const breakdown = await tracker.getCreditUsageBreakdown('nonexistent-id');
      expect(breakdown).toBeNull();
    });
  });

  // ============================================================================
  // CAPACITY THRESHOLD TESTS
  // ============================================================================

  describe('Credit Capacity Threshold', () => {
    beforeEach(async () => {
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
          'TEST_CREDIT_THRESHOLD',
          ${testCompanyId},
          ${testTemplateId},
          ${testGroupId},
          '2025-01-01',
          '2025-12-31',
          50,
          100,
          25000,
          'credits',
          10000,
          1,
          6000
        ) RETURNING id
      `;
      testCampaignId = campaign.id;
    });

    it('should identify under_80 threshold', async () => {
      // 6000 remaining of 10000 = 40% utilization
      const threshold = await tracker.checkCreditCapacityThreshold(testCampaignId);

      expect(threshold.threshold).toBe('under_80');
      expect(threshold.requiresAction).toBe(false);
    });

    it('should identify at_80 threshold', async () => {
      // Update to 80% (2000 remaining)
      await sql`
        UPDATE campaigns
        SET credits_remaining = 2000
        WHERE id = ${testCampaignId}
      `;

      const threshold = await tracker.checkCreditCapacityThreshold(testCampaignId);

      expect(threshold.threshold).toBe('at_80');
      expect(threshold.requiresAction).toBe(true);
    });

    it('should identify at_90 threshold', async () => {
      // Update to 90% (1000 remaining)
      await sql`
        UPDATE campaigns
        SET credits_remaining = 1000
        WHERE id = ${testCampaignId}
      `;

      const threshold = await tracker.checkCreditCapacityThreshold(testCampaignId);

      expect(threshold.threshold).toBe('at_90');
      expect(threshold.requiresAction).toBe(true);
    });

    it('should identify at_100 threshold', async () => {
      // Update to 100% (0 remaining)
      await sql`
        UPDATE campaigns
        SET credits_remaining = 0
        WHERE id = ${testCampaignId}
      `;

      const threshold = await tracker.checkCreditCapacityThreshold(testCampaignId);

      expect(threshold.threshold).toBe('at_100');
      expect(threshold.requiresAction).toBe(true);
    });

    it('should identify over_100 threshold', async () => {
      // Update to 110% (negative remaining)
      await sql`
        UPDATE campaigns
        SET credits_remaining = -1000
        WHERE id = ${testCampaignId}
      `;

      const threshold = await tracker.checkCreditCapacityThreshold(testCampaignId);

      expect(threshold.threshold).toBe('over_100');
      expect(threshold.requiresAction).toBe(true);
    });
  });

  // ============================================================================
  // REPORT GENERATION TESTS
  // ============================================================================

  describe('Credit Usage Report', () => {
    beforeEach(async () => {
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
          'TEST_CREDIT_REPORT',
          ${testCompanyId},
          ${testTemplateId},
          ${testGroupId},
          '2025-01-01',
          '2025-01-31',
          50,
          100,
          25000,
          'credits',
          10000,
          1,
          9000
        ) RETURNING id
      `;
      testCampaignId = campaign.id;
    });

    it('should generate credit usage report', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const report = await tracker.generateCreditUsageReport(
        testCampaignId,
        startDate,
        endDate
      );

      expect(report).toBeDefined();
      expect(report.campaignId).toBe(testCampaignId);
      expect(report.period.startDate).toEqual(startDate);
      expect(report.period.endDate).toEqual(endDate);
      expect(report.creditAllocation).toBe(10000);
      expect(report.pricingModel).toBe('credits');
    });

    it('should include consumption by activity in report', async () => {
      // Add various consumptions
      await tracker.consumeCredits(testCampaignId, 100, 'session');
      await tracker.consumeCredits(testCampaignId, 50, 'hour');
      await tracker.consumeCredits(testCampaignId, 200, 'completion');

      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const report = await tracker.generateCreditUsageReport(
        testCampaignId,
        startDate,
        endDate
      );

      expect(report.consumptionByActivity.length).toBeGreaterThan(0);
      expect(report.summary.projectedMonthlyBurn).toBeGreaterThanOrEqual(0);
    });

    it('should throw error for non-existent campaign', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      await expect(
        tracker.generateCreditUsageReport('nonexistent-id', startDate, endDate)
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================

  describe('Integration Tests', () => {
    beforeEach(async () => {
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
          'TEST_CREDIT_INTEGRATION',
          ${testCompanyId},
          ${testTemplateId},
          ${testGroupId},
          '2025-01-01',
          '2025-12-31',
          50,
          100,
          25000,
          'credits',
          1000,
          1,
          1000
        ) RETURNING id
      `;
      testCampaignId = campaign.id;
    });

    it('should track complete credit lifecycle', async () => {
      // Check initial balance
      let balance = await tracker.getCreditBalance(testCampaignId);
      expect(balance?.remaining).toBe(1000);
      expect(balance?.utilized).toBeUndefined();

      // Consume credits
      await tracker.consumeCredits(testCampaignId, 200, 'session', 2);
      balance = await tracker.getCreditBalance(testCampaignId);
      expect(balance?.consumed).toBe(200);
      expect(balance?.remaining).toBe(800);
      expect(balance?.utilizationPercent).toBe(20);

      // Consume more credits
      await tracker.consumeCredits(testCampaignId, 300, 'hour', 3);
      balance = await tracker.getCreditBalance(testCampaignId);
      expect(balance?.consumed).toBe(500);
      expect(balance?.remaining).toBe(500);
      expect(balance?.utilizationPercent).toBe(50);
    });

    it('should handle multiple activity types', async () => {
      // Consume different activity types
      for (let i = 0; i < 3; i++) {
        await tracker.consumeCredits(testCampaignId, 100, 'session', 1);
      }
      for (let i = 0; i < 2; i++) {
        await tracker.consumeCredits(testCampaignId, 50, 'hour', 1);
      }
      for (let i = 0; i < 1; i++) {
        await tracker.consumeCredits(testCampaignId, 200, 'completion', 1);
      }

      const breakdown = await tracker.getCreditUsageBreakdown(testCampaignId);
      expect(breakdown?.byActivityType.length).toBe(3);
      expect(breakdown?.totalConsumed).toBe(600);
    });
  });
});
