/**
 * Seat Tracker Tests
 *
 * SWARM 6: Agent 5.2 - seat-credit-tracker
 *
 * Test Coverage:
 * - Seat allocation and tracking
 * - Seat deallocation
 * - Seat usage calculation
 * - Seat usage reports for billing
 * - Capacity threshold checking
 *
 * Target: ≥85% coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SeatTracker } from '../src/lib/seat-tracker.js';
import postgres from 'postgres';

// ============================================================================
// TEST SETUP
// ============================================================================

const TEST_DB_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/teei_test';

describe('SeatTracker', () => {
  let sql: postgres.Sql;
  let tracker: SeatTracker;
  let testCampaignId: string;
  let testCompanyId: string;
  let testTemplateId: string;
  let testGroupId: string;

  beforeEach(async () => {
    // Initialize database connection
    sql = postgres(TEST_DB_URL, { max: 1 });

    // Create tracker instance
    tracker = new SeatTracker(sql);

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
    await sql`DELETE FROM campaigns WHERE name LIKE 'TEST_SEAT_%'`;
  });

  afterEach(async () => {
    // Clean up test data
    if (testCampaignId) {
      await sql`DELETE FROM campaigns WHERE id = ${testCampaignId}`;
    }
    await sql.end();
  });

  // ============================================================================
  // SEAT ALLOCATION TESTS
  // ============================================================================

  describe('Seat Allocation', () => {
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
          'TEST_SEAT_ALLOCATION',
          ${testCompanyId},
          ${testTemplateId},
          ${testGroupId},
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

    it('should track a new seat allocation', async () => {
      const allocation = await tracker.trackSeatUsage(testCampaignId, 'volunteer-1');

      expect(allocation).toBeDefined();
      expect(allocation.campaignId).toBe(testCampaignId);
      expect(allocation.volunteerId).toBe('volunteer-1');
      expect(allocation.isActive).toBe(true);
      expect(allocation.status).toBe('allocated');
    });

    it('should not create duplicate allocations for same volunteer', async () => {
      const allocation1 = await tracker.trackSeatUsage(testCampaignId, 'volunteer-1');
      const allocation2 = await tracker.trackSeatUsage(testCampaignId, 'volunteer-1');

      expect(allocation1.volunteerId).toBe(allocation2.volunteerId);
      expect(allocation1.allocationDate.getTime()).toBe(allocation2.allocationDate.getTime());
    });

    it('should track allocation with instance ID', async () => {
      // Create a test program instance
      const [instance] = await sql`
        INSERT INTO program_instances (
          name,
          campaign_id,
          program_template_id,
          company_id,
          beneficiary_group_id,
          start_date,
          end_date,
          status
        ) VALUES (
          'TEST_INSTANCE',
          ${testCampaignId},
          ${testTemplateId},
          ${testCompanyId},
          ${testGroupId},
          '2025-01-01',
          '2025-12-31',
          'active'
        ) RETURNING id
      `;

      const allocation = await tracker.trackSeatUsage(
        testCampaignId,
        'volunteer-1',
        instance.id
      );

      expect(allocation.instanceId).toBe(instance.id);

      // Clean up
      await sql`DELETE FROM program_instances WHERE id = ${instance.id}`;
    });
  });

  // ============================================================================
  // SEAT USAGE TESTS
  // ============================================================================

  describe('Seat Usage', () => {
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
          current_volunteers,
          target_beneficiaries,
          budget_allocated,
          pricing_model,
          committed_seats,
          seat_price_per_month
        ) VALUES (
          'TEST_SEAT_USAGE',
          ${testCompanyId},
          ${testTemplateId},
          ${testGroupId},
          '2025-01-01',
          '2025-12-31',
          50,
          25,
          100,
          25000,
          'seats',
          50,
          500
        ) RETURNING id
      `;
      testCampaignId = campaign.id;
    });

    it('should calculate seat usage correctly', async () => {
      const usage = await tracker.getSeatUsage(testCampaignId);

      expect(usage).toBeDefined();
      expect(usage?.committedSeats).toBe(50);
      expect(usage?.allocatedSeats).toBe(25);
      expect(usage?.availableSeats).toBe(25);
      expect(usage?.utilizationPercent).toBe(50);
      expect(usage?.isNearCapacity).toBe(false);
      expect(usage?.isAtCapacity).toBe(false);
      expect(usage?.isOverCapacity).toBe(false);
    });

    it('should detect near capacity (80%)', async () => {
      // Update campaign to 80% capacity (40 of 50 seats)
      await sql`
        UPDATE campaigns
        SET current_volunteers = 40
        WHERE id = ${testCampaignId}
      `;

      const usage = await tracker.getSeatUsage(testCampaignId);

      expect(usage?.utilizationPercent).toBe(80);
      expect(usage?.isNearCapacity).toBe(true);
      expect(usage?.isAtCapacity).toBe(false);
    });

    it('should detect at capacity (100%)', async () => {
      // Update campaign to 100% capacity
      await sql`
        UPDATE campaigns
        SET current_volunteers = 50
        WHERE id = ${testCampaignId}
      `;

      const usage = await tracker.getSeatUsage(testCampaignId);

      expect(usage?.utilizationPercent).toBe(100);
      expect(usage?.isAtCapacity).toBe(true);
      expect(usage?.isOverCapacity).toBe(false);
    });

    it('should detect over capacity (>100%)', async () => {
      // Update campaign to 110% capacity (55 of 50 seats)
      await sql`
        UPDATE campaigns
        SET current_volunteers = 55
        WHERE id = ${testCampaignId}
      `;

      const usage = await tracker.getSeatUsage(testCampaignId);

      expect(usage?.utilizationPercent).toBe(110);
      expect(usage?.isOverCapacity).toBe(true);
    });

    it('should return null for non-existent campaign', async () => {
      const usage = await tracker.getSeatUsage('nonexistent-id');
      expect(usage).toBeNull();
    });
  });

  // ============================================================================
  // AVAILABLE SEATS TESTS
  // ============================================================================

  describe('Available Seats', () => {
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
          current_volunteers,
          target_beneficiaries,
          budget_allocated,
          pricing_model,
          committed_seats,
          seat_price_per_month
        ) VALUES (
          'TEST_AVAILABLE_SEATS',
          ${testCompanyId},
          ${testTemplateId},
          ${testGroupId},
          '2025-01-01',
          '2025-12-31',
          50,
          15,
          100,
          25000,
          'seats',
          50,
          500
        ) RETURNING id
      `;
      testCampaignId = campaign.id;
    });

    it('should calculate available seats', async () => {
      const available = await tracker.getAvailableSeats(testCampaignId);
      expect(available).toBe(35); // 50 committed - 15 allocated
    });

    it('should return zero when at capacity', async () => {
      await sql`
        UPDATE campaigns
        SET current_volunteers = 50
        WHERE id = ${testCampaignId}
      `;

      const available = await tracker.getAvailableSeats(testCampaignId);
      expect(available).toBe(0);
    });
  });

  // ============================================================================
  // SEAT DEALLOCATION TESTS
  // ============================================================================

  describe('Seat Deallocation', () => {
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
          current_volunteers,
          target_beneficiaries,
          budget_allocated,
          pricing_model,
          committed_seats,
          seat_price_per_month
        ) VALUES (
          'TEST_DEALLOCATION',
          ${testCompanyId},
          ${testTemplateId},
          ${testGroupId},
          '2025-01-01',
          '2025-12-31',
          50,
          1,
          100,
          25000,
          'seats',
          50,
          500
        ) RETURNING id
      `;
      testCampaignId = campaign.id;

      // Allocate a seat
      await tracker.trackSeatUsage(testCampaignId, 'volunteer-1');
    });

    it('should deallocate a volunteer seat', async () => {
      const result = await tracker.deallocateSeat(testCampaignId, 'volunteer-1');

      expect(result).toBe(true);

      // Verify campaign seat count decreased
      const [campaign] = await sql`
        SELECT current_volunteers FROM campaigns WHERE id = ${testCampaignId}
      `;
      expect(campaign.current_volunteers).toBe(0);
    });

    it('should return false for non-existent allocation', async () => {
      const result = await tracker.deallocateSeat(testCampaignId, 'nonexistent-volunteer');
      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // CAPACITY THRESHOLD TESTS
  // ============================================================================

  describe('Capacity Threshold', () => {
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
          current_volunteers,
          target_beneficiaries,
          budget_allocated,
          pricing_model,
          committed_seats,
          seat_price_per_month
        ) VALUES (
          'TEST_THRESHOLD',
          ${testCompanyId},
          ${testTemplateId},
          ${testGroupId},
          '2025-01-01',
          '2025-12-31',
          50,
          30,
          100,
          25000,
          'seats',
          50,
          500
        ) RETURNING id
      `;
      testCampaignId = campaign.id;
    });

    it('should identify under_80 threshold', async () => {
      // 30 of 50 = 60%
      const threshold = await tracker.checkSeatCapacityThreshold(testCampaignId);

      expect(threshold.threshold).toBe('under_80');
      expect(threshold.requiresAction).toBe(false);
    });

    it('should identify at_80 threshold', async () => {
      // Update to 80%
      await sql`
        UPDATE campaigns
        SET current_volunteers = 40
        WHERE id = ${testCampaignId}
      `;

      const threshold = await tracker.checkSeatCapacityThreshold(testCampaignId);

      expect(threshold.threshold).toBe('at_80');
      expect(threshold.requiresAction).toBe(true);
    });

    it('should identify at_90 threshold', async () => {
      // Update to 90%
      await sql`
        UPDATE campaigns
        SET current_volunteers = 45
        WHERE id = ${testCampaignId}
      `;

      const threshold = await tracker.checkSeatCapacityThreshold(testCampaignId);

      expect(threshold.threshold).toBe('at_90');
      expect(threshold.requiresAction).toBe(true);
    });

    it('should identify at_100 threshold', async () => {
      // Update to 100%
      await sql`
        UPDATE campaigns
        SET current_volunteers = 50
        WHERE id = ${testCampaignId}
      `;

      const threshold = await tracker.checkSeatCapacityThreshold(testCampaignId);

      expect(threshold.threshold).toBe('at_100');
      expect(threshold.requiresAction).toBe(true);
    });

    it('should identify over_100 threshold', async () => {
      // Update to 110%
      await sql`
        UPDATE campaigns
        SET current_volunteers = 55
        WHERE id = ${testCampaignId}
      `;

      const threshold = await tracker.checkSeatCapacityThreshold(testCampaignId);

      expect(threshold.threshold).toBe('over_100');
      expect(threshold.requiresAction).toBe(true);
    });
  });

  // ============================================================================
  // REPORT GENERATION TESTS
  // ============================================================================

  describe('Seat Usage Report', () => {
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
          current_volunteers,
          target_beneficiaries,
          budget_allocated,
          pricing_model,
          committed_seats,
          seat_price_per_month
        ) VALUES (
          'TEST_SEAT_REPORT',
          ${testCompanyId},
          ${testTemplateId},
          ${testGroupId},
          '2025-01-01',
          '2025-01-31',
          50,
          25,
          100,
          25000,
          'seats',
          50,
          500
        ) RETURNING id
      `;
      testCampaignId = campaign.id;
    });

    it('should generate seat usage report', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const report = await tracker.generateSeatUsageReport(
        testCampaignId,
        startDate,
        endDate
      );

      expect(report).toBeDefined();
      expect(report.campaignId).toBe(testCampaignId);
      expect(report.period.startDate).toEqual(startDate);
      expect(report.period.endDate).toEqual(endDate);
      expect(report.committedSeats).toBe(50);
    });

    it('should throw error for non-existent campaign', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      await expect(
        tracker.generateSeatUsageReport('nonexistent-id', startDate, endDate)
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
          current_volunteers,
          target_beneficiaries,
          budget_allocated,
          pricing_model,
          committed_seats,
          seat_price_per_month
        ) VALUES (
          'TEST_INTEGRATION',
          ${testCompanyId},
          ${testTemplateId},
          ${testGroupId},
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

    it('should handle complete allocation lifecycle', async () => {
      // Check initial state
      let usage = await tracker.getSeatUsage(testCampaignId);
      expect(usage?.allocatedSeats).toBe(0);
      expect(usage?.availableSeats).toBe(50);

      // Allocate a seat
      await tracker.trackSeatUsage(testCampaignId, 'volunteer-1');
      usage = await tracker.getSeatUsage(testCampaignId);
      expect(usage?.allocatedSeats).toBe(1);
      expect(usage?.availableSeats).toBe(49);

      // Deallocate the seat
      await tracker.deallocateSeat(testCampaignId, 'volunteer-1');
      usage = await tracker.getSeatUsage(testCampaignId);
      expect(usage?.allocatedSeats).toBe(0);
      expect(usage?.availableSeats).toBe(50);
    });

    it('should track multiple volunteers', async () => {
      // Allocate multiple seats
      for (let i = 1; i <= 10; i++) {
        await tracker.trackSeatUsage(testCampaignId, `volunteer-${i}`);
      }

      const usage = await tracker.getSeatUsage(testCampaignId);
      expect(usage?.allocatedSeats).toBe(10);
      expect(usage?.utilizationPercent).toBe(20);
    });
  });
});
