/**
 * DSAR (Data Subject Access Request) Exercise Test
 *
 * Tests GDPR deletion flow end-to-end to verify data removal across all tables
 * Ref: MULTI_AGENT_PLAN.md § Worker 2/QA-Platform Lead/Security Validator
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { db, getDb } from '@teei/shared-schema';
import {
  users,
  outcomeScores,
  evidenceSnippets,
  auditLogs,
  notificationsQueue,
  impactDeliveries,
  aiReportLineage,
} from '@teei/shared-schema';
import { eq, and } from 'drizzle-orm';
import axios from 'axios';

describe('GDPR DSAR Deletion Exercise', () => {
  let testUserId: string;
  let testCompanyId: string;
  const testUserEmail = 'dsar-test-user@example.com';

  beforeAll(async () => {
    // Create test user with data across all tables
    testCompanyId = '999e8400-e29b-41d4-a716-446655440999';
    testUserId = '888e8400-e29b-41d4-a716-446655440888';

    const database = getDb();

    // Create test user
    await database.insert(users).values({
      id: testUserId,
      email: testUserEmail,
      firstName: 'DSAR',
      lastName: 'Test',
      tenantId: testCompanyId,
      role: 'apprentice',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create outcome scores
    await database.insert(outcomeScores).values({
      id: 'score-dsar-1',
      userId: testUserId,
      companyId: testCompanyId,
      dimension: 'confidence',
      score: 0.85,
      confidence: 0.92,
      evidenceCount: 3,
      createdAt: new Date(),
    });

    // Create evidence snippets
    await database.insert(evidenceSnippets).values({
      id: 'snip-dsar-1',
      userId: testUserId,
      companyId: testCompanyId,
      text: 'Test evidence snippet for DSAR user',
      source: 'test',
      dimension: 'confidence',
      score: 0.85,
      createdAt: new Date(),
    });

    // Create audit logs
    await database.insert(auditLogs).values({
      id: 'audit-dsar-1',
      userId: testUserId,
      companyId: testCompanyId,
      action: 'user.created',
      scope: 'user',
      scopeId: testUserId,
      actorId: testUserId,
      actorType: 'user',
      before: null,
      after: { email: testUserEmail },
      createdAt: new Date(),
    });

    // Create notification
    await database.insert(notificationsQueue).values({
      id: 'notif-dsar-1',
      companyId: testCompanyId,
      userId: testUserId,
      type: 'email',
      channel: 'sendgrid',
      templateId: 'test',
      recipient: testUserEmail,
      status: 'sent',
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create impact delivery (if user was involved)
    await database.insert(impactDeliveries).values({
      id: 'dlv-dsar-1',
      deliveryId: 'dlv_test_dsar',
      companyId: testCompanyId,
      provider: 'benevity',
      status: 'success',
      attemptCount: 1,
      payload: { userId: testUserId, event: 'test' },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterAll(async () => {
    // Clean up any remaining data
    const database = getDb();

    await database.delete(users).where(eq(users.id, testUserId));
    await database.delete(outcomeScores).where(eq(outcomeScores.userId, testUserId));
    await database.delete(evidenceSnippets).where(eq(evidenceSnippets.userId, testUserId));
    await database.delete(notificationsQueue).where(eq(notificationsQueue.userId, testUserId));
    await database
      .delete(impactDeliveries)
      .where(eq(impactDeliveries.id, 'dlv-dsar-1'));
  });

  it('should verify test data exists before deletion', async () => {
    const database = getDb();

    const user = await database.select().from(users).where(eq(users.id, testUserId));
    expect(user.length).toBe(1);
    expect(user[0].email).toBe(testUserEmail);

    const scores = await database
      .select()
      .from(outcomeScores)
      .where(eq(outcomeScores.userId, testUserId));
    expect(scores.length).toBeGreaterThan(0);

    const snippets = await database
      .select()
      .from(evidenceSnippets)
      .where(eq(evidenceSnippets.userId, testUserId));
    expect(snippets.length).toBeGreaterThan(0);

    const notifications = await database
      .select()
      .from(notificationsQueue)
      .where(eq(notificationsQueue.userId, testUserId));
    expect(notifications.length).toBeGreaterThan(0);
  });

  it('should execute GDPR deletion via privacy endpoint', async () => {
    const API_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';
    const JWT_TOKEN = process.env.TEST_JWT_TOKEN || 'test-token';

    // Call GDPR deletion endpoint
    const response = await axios.post(
      `${API_URL}/v1/privacy/delete`,
      {
        userId: testUserId,
        reason: 'user_request',
        requestedBy: testUserId,
      },
      {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.deletedRecords).toBeGreaterThan(0);
  });

  it('should verify user data removed from users table', async () => {
    const database = getDb();

    const user = await database.select().from(users).where(eq(users.id, testUserId));

    // User should be either deleted or anonymized
    if (user.length > 0) {
      // If soft-deleted, check that PII is removed
      expect(user[0].email).not.toBe(testUserEmail);
      expect(user[0].email).toMatch(/^deleted-/);
      expect(user[0].firstName).toBe('Deleted');
      expect(user[0].lastName).toBe('User');
    } else {
      // Hard delete is also acceptable
      expect(user.length).toBe(0);
    }
  });

  it('should verify outcome_scores removed', async () => {
    const database = getDb();

    const scores = await database
      .select()
      .from(outcomeScores)
      .where(eq(outcomeScores.userId, testUserId));

    expect(scores.length).toBe(0);
  });

  it('should verify evidence_snippets removed', async () => {
    const database = getDb();

    const snippets = await database
      .select()
      .from(evidenceSnippets)
      .where(eq(evidenceSnippets.userId, testUserId));

    expect(snippets.length).toBe(0);
  });

  it('should verify notifications removed', async () => {
    const database = getDb();

    const notifications = await database
      .select()
      .from(notificationsQueue)
      .where(eq(notificationsQueue.userId, testUserId));

    expect(notifications.length).toBe(0);
  });

  it('should verify audit logs are soft-deleted (retained for compliance)', async () => {
    const database = getDb();

    // Audit logs should be retained for 7 years per GDPR
    // But user PII should be redacted
    const audits = await database
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, testUserId));

    if (audits.length > 0) {
      // Verify PII is redacted in audit log after field
      const userCreatedAudit = audits.find((a) => a.action === 'user.created');
      if (userCreatedAudit && userCreatedAudit.after) {
        expect((userCreatedAudit.after as any).email).not.toBe(testUserEmail);
      }
    }
  });

  it('should verify impact deliveries have user reference removed', async () => {
    const database = getDb();

    const deliveries = await database
      .select()
      .from(impactDeliveries)
      .where(eq(impactDeliveries.id, 'dlv-dsar-1'));

    if (deliveries.length > 0) {
      // Payload should have userId redacted
      expect((deliveries[0].payload as any).userId).toBeUndefined();
    }
  });

  it('should verify deletion is idempotent', async () => {
    const API_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';
    const JWT_TOKEN = process.env.TEST_JWT_TOKEN || 'test-token';

    // Call deletion endpoint again
    const response = await axios.post(
      `${API_URL}/v1/privacy/delete`,
      {
        userId: testUserId,
        reason: 'user_request',
        requestedBy: testUserId,
      },
      {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Should still succeed (idempotent)
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
  });

  it('should generate deletion audit trail', async () => {
    const database = getDb();

    // Check that deletion action was logged
    const deletionAudits = await database
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.scopeId, testUserId),
          eq(auditLogs.action, 'privacy.delete')
        )
      );

    expect(deletionAudits.length).toBeGreaterThan(0);
    expect(deletionAudits[0].before).toBeDefined();
    expect(deletionAudits[0].actorId).toBe(testUserId);
  });
});
