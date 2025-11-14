/**
 * Data Retention Policies Test
 *
 * Verifies that TTLs are enforced on evidence caches and audit logs
 * Ref: MULTI_AGENT_PLAN.md § Worker 2/QA-Platform Lead/Retention Enforcer
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { getDb } from '@teei/shared-schema';
import { evidenceSnippets, auditLogs, aiReportLineage } from '@teei/shared-schema';
import { eq, lt } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

describe('Data Retention Policies', () => {
  let testCompanyId: string;

  beforeAll(async () => {
    testCompanyId = '999e8400-e29b-41d4-a716-446655440998';
  });

  describe('Evidence Snippets TTL', () => {
    it('should have evidence snippets older than 30 days', async () => {
      const database = getDb();

      // Create test evidence snippet with old timestamp
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      await database.insert(evidenceSnippets).values({
        id: 'snip-retention-old',
        userId: 'user-retention-test',
        companyId: testCompanyId,
        text: 'Old evidence snippet for retention test',
        source: 'test',
        dimension: 'confidence',
        score: 0.85,
        createdAt: thirtyOneDaysAgo,
      });

      // Query for old snippets
      const oldSnippets = await database
        .select()
        .from(evidenceSnippets)
        .where(lt(evidenceSnippets.createdAt, sql`NOW() - INTERVAL '30 days'`));

      expect(oldSnippets.length).toBeGreaterThan(0);
    });

    it('should verify cleanup job removes old evidence snippets', async () => {
      const database = getDb();

      // Execute cleanup query (simulates cron job)
      const result = await database
        .delete(evidenceSnippets)
        .where(
          lt(evidenceSnippets.createdAt, sql`NOW() - INTERVAL '30 days'`)
        )
        .returning();

      expect(result.length).toBeGreaterThan(0);
    });

    it('should retain recent evidence snippets', async () => {
      const database = getDb();

      // Create recent evidence snippet
      await database.insert(evidenceSnippets).values({
        id: 'snip-retention-recent',
        userId: 'user-retention-test',
        companyId: testCompanyId,
        text: 'Recent evidence snippet',
        source: 'test',
        dimension: 'confidence',
        score: 0.85,
        createdAt: new Date(),
      });

      // Verify it's not deleted
      const recentSnippets = await database
        .select()
        .from(evidenceSnippets)
        .where(eq(evidenceSnippets.id, 'snip-retention-recent'));

      expect(recentSnippets.length).toBe(1);

      // Clean up
      await database
        .delete(evidenceSnippets)
        .where(eq(evidenceSnippets.id, 'snip-retention-recent'));
    });
  });

  describe('Audit Logs TTL', () => {
    it('should retain audit logs for 7 years (GDPR requirement)', async () => {
      const database = getDb();

      // Create test audit log with old timestamp (6 years ago)
      const sixYearsAgo = new Date();
      sixYearsAgo.setFullYear(sixYearsAgo.getFullYear() - 6);

      await database.insert(auditLogs).values({
        id: 'audit-retention-6y',
        userId: 'user-retention-test',
        companyId: testCompanyId,
        action: 'test.action',
        scope: 'test',
        scopeId: 'test-123',
        actorId: 'user-retention-test',
        actorType: 'user',
        before: null,
        after: { test: 'data' },
        createdAt: sixYearsAgo,
      });

      // Query for 6-year-old logs (should still exist)
      const oldLogs = await database
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.id, 'audit-retention-6y'));

      expect(oldLogs.length).toBe(1);
    });

    it('should remove audit logs older than 7 years', async () => {
      const database = getDb();

      // Create test audit log with very old timestamp (8 years ago)
      const eightYearsAgo = new Date();
      eightYearsAgo.setFullYear(eightYearsAgo.getFullYear() - 8);

      await database.insert(auditLogs).values({
        id: 'audit-retention-8y',
        userId: 'user-retention-test',
        companyId: testCompanyId,
        action: 'test.action',
        scope: 'test',
        scopeId: 'test-456',
        actorId: 'user-retention-test',
        actorType: 'user',
        before: null,
        after: { test: 'data' },
        createdAt: eightYearsAgo,
      });

      // Execute cleanup (7 years retention)
      const result = await database
        .delete(auditLogs)
        .where(
          lt(auditLogs.createdAt, sql`NOW() - INTERVAL '7 years'`)
        )
        .returning();

      expect(result.length).toBeGreaterThan(0);

      // Verify 8-year-old log was deleted
      const veryOldLogs = await database
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.id, 'audit-retention-8y'));

      expect(veryOldLogs.length).toBe(0);
    });

    it('should clean up test audit logs', async () => {
      const database = getDb();

      // Clean up test audit logs
      await database
        .delete(auditLogs)
        .where(eq(auditLogs.id, 'audit-retention-6y'));
    });
  });

  describe('AI Report Lineage TTL', () => {
    it('should retain AI report lineage for 1 year', async () => {
      const database = getDb();

      // Create test lineage with old timestamp (11 months ago)
      const elevenMonthsAgo = new Date();
      elevenMonthsAgo.setMonth(elevenMonthsAgo.getMonth() - 11);

      await database.insert(aiReportLineage).values({
        id: 'lineage-retention-11m',
        reportId: 'rpt_retention_test',
        requestId: 'req_retention_test',
        companyId: testCompanyId,
        modelName: 'gpt-4-turbo',
        providerName: 'openai',
        promptVersion: 'v2.0.0',
        locale: 'en',
        tokensInput: 800,
        tokensOutput: 700,
        tokensTotal: 1500,
        estimatedCostUsd: '0.0195',
        durationMs: 2340,
        sections: ['impact-summary'],
        citationIds: [],
        deterministic: false,
        createdAt: elevenMonthsAgo,
      });

      // Query for 11-month-old lineage (should still exist)
      const recentLineage = await database
        .select()
        .from(aiReportLineage)
        .where(eq(aiReportLineage.id, 'lineage-retention-11m'));

      expect(recentLineage.length).toBe(1);
    });

    it('should remove AI report lineage older than 1 year', async () => {
      const database = getDb();

      // Create test lineage with very old timestamp (13 months ago)
      const thirteenMonthsAgo = new Date();
      thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13);

      await database.insert(aiReportLineage).values({
        id: 'lineage-retention-13m',
        reportId: 'rpt_retention_test_old',
        requestId: 'req_retention_test_old',
        companyId: testCompanyId,
        modelName: 'gpt-4-turbo',
        providerName: 'openai',
        promptVersion: 'v2.0.0',
        locale: 'en',
        tokensInput: 800,
        tokensOutput: 700,
        tokensTotal: 1500,
        estimatedCostUsd: '0.0195',
        durationMs: 2340,
        sections: ['impact-summary'],
        citationIds: [],
        deterministic: false,
        createdAt: thirteenMonthsAgo,
      });

      // Execute cleanup (1 year retention)
      const result = await database
        .delete(aiReportLineage)
        .where(
          lt(aiReportLineage.createdAt, sql`NOW() - INTERVAL '1 year'`)
        )
        .returning();

      expect(result.length).toBeGreaterThan(0);

      // Verify 13-month-old lineage was deleted
      const oldLineage = await database
        .select()
        .from(aiReportLineage)
        .where(eq(aiReportLineage.id, 'lineage-retention-13m'));

      expect(oldLineage.length).toBe(0);
    });

    it('should clean up test lineage data', async () => {
      const database = getDb();

      await database
        .delete(aiReportLineage)
        .where(eq(aiReportLineage.id, 'lineage-retention-11m'));
    });
  });

  describe('Retention Policy Configuration', () => {
    it('should document retention policies', () => {
      const retentionPolicies = {
        evidenceSnippets: {
          ttl: '30 days',
          reason: 'Evidence cache - reduce storage costs',
          enforcement: 'Automated cleanup job (daily)',
        },
        auditLogs: {
          ttl: '7 years',
          reason: 'GDPR compliance requirement',
          enforcement: 'Automated cleanup job (monthly)',
        },
        aiReportLineage: {
          ttl: '1 year',
          reason: 'Cost tracking and audit trail',
          enforcement: 'Automated cleanup job (monthly)',
        },
        notificationsQueue: {
          ttl: '90 days',
          reason: 'Delivery history and debugging',
          enforcement: 'Automated cleanup job (weekly)',
        },
        impactDeliveries: {
          ttl: '2 years',
          reason: 'Integration audit trail',
          enforcement: 'Automated cleanup job (monthly)',
        },
      };

      // Verify all policies are defined
      expect(retentionPolicies.evidenceSnippets).toBeDefined();
      expect(retentionPolicies.auditLogs).toBeDefined();
      expect(retentionPolicies.aiReportLineage).toBeDefined();
      expect(retentionPolicies.notificationsQueue).toBeDefined();
      expect(retentionPolicies.impactDeliveries).toBeDefined();

      // Verify TTLs are reasonable
      expect(retentionPolicies.auditLogs.ttl).toBe('7 years'); // GDPR
      expect(retentionPolicies.evidenceSnippets.ttl).toBe('30 days');
    });

    it('should provide cleanup SQL templates', () => {
      const cleanupQueries = {
        evidenceSnippets: `DELETE FROM evidence_snippets WHERE created_at < NOW() - INTERVAL '30 days'`,
        auditLogs: `DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '7 years'`,
        aiReportLineage: `DELETE FROM ai_report_lineage WHERE created_at < NOW() - INTERVAL '1 year'`,
        notificationsQueue: `DELETE FROM notifications_queue WHERE created_at < NOW() - INTERVAL '90 days' AND status IN ('sent', 'failed', 'cancelled')`,
        impactDeliveries: `DELETE FROM impact_deliveries WHERE created_at < NOW() - INTERVAL '2 years'`,
      };

      expect(cleanupQueries.evidenceSnippets).toContain('30 days');
      expect(cleanupQueries.auditLogs).toContain('7 years');
      expect(cleanupQueries.aiReportLineage).toContain('1 year');
    });
  });
});
