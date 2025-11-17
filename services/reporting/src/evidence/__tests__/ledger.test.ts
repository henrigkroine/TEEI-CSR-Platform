/**
 * Evidence Ledger Test Suite
 *
 * Tests:
 * - Append operations (single and multiple entries)
 * - Hash chain validation
 * - HMAC signature verification
 * - Tampering detection
 * - Integrity verification
 * - Edge cases (empty ledger, first entry, etc.)
 *
 * Target: ≥90% coverage
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EvidenceLedger, LedgerEntry, LedgerAction } from '../ledger';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { evidenceLedger } from '@teei/shared-schema';
import { sql } from 'drizzle-orm';

// Test configuration
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/teei_test';
const TEST_SECRET_KEY = 'test-secret-key-minimum-32-characters-long-for-security';

describe('EvidenceLedger', () => {
  let ledger: EvidenceLedger;
  let db: ReturnType<typeof drizzle>;
  let client: postgres.Sql;

  beforeEach(async () => {
    // Initialize ledger
    ledger = new EvidenceLedger(TEST_DATABASE_URL, TEST_SECRET_KEY);

    // Initialize database client for cleanup
    client = postgres(TEST_DATABASE_URL);
    db = drizzle(client);

    // Clean up test data
    await db.execute(sql`DELETE FROM evidence_ledger WHERE report_id LIKE 'test-%'`);
  });

  afterEach(async () => {
    // Clean up test data
    await db.execute(sql`DELETE FROM evidence_ledger WHERE report_id LIKE 'test-%'`);
    await client.end();
  });

  describe('Constructor', () => {
    it('should throw error if secret key is too short', () => {
      expect(() => {
        new EvidenceLedger(TEST_DATABASE_URL, 'short');
      }).toThrow('Secret key must be at least 32 characters');
    });

    it('should create instance with valid secret key', () => {
      const instance = new EvidenceLedger(TEST_DATABASE_URL, TEST_SECRET_KEY);
      expect(instance).toBeInstanceOf(EvidenceLedger);
    });
  });

  describe('append()', () => {
    it('should append first entry with null previousHash', async () => {
      const entry = await ledger.append({
        reportId: 'test-report-1',
        citationId: 'citation-1',
        action: 'ADDED',
        citationText: 'Sample evidence snippet for testing',
        editor: 'user-123',
        metadata: { reason: 'Initial report generation' },
      });

      expect(entry).toBeDefined();
      expect(entry.id).toBeDefined();
      expect(entry.reportId).toBe('test-report-1');
      expect(entry.citationId).toBe('citation-1');
      expect(entry.action).toBe('ADDED');
      expect(entry.previousHash).toBeNull();
      expect(entry.contentHash).toBeDefined();
      expect(entry.signature).toBeDefined();
      expect(entry.editor).toBe('user-123');
      expect(entry.timestamp).toBeInstanceOf(Date);
    });

    it('should append subsequent entry with previousHash linking to previous', async () => {
      // Add first entry
      const entry1 = await ledger.append({
        reportId: 'test-report-2',
        citationId: 'citation-1',
        action: 'ADDED',
        citationText: 'First evidence',
        editor: 'user-123',
      });

      // Add second entry
      const entry2 = await ledger.append({
        reportId: 'test-report-2',
        citationId: 'citation-2',
        action: 'ADDED',
        citationText: 'Second evidence',
        editor: 'user-123',
      });

      expect(entry2.previousHash).not.toBeNull();
      expect(entry2.previousHash).toBeDefined();
      expect(entry1.previousHash).toBeNull();
    });

    it('should support all action types', async () => {
      const actions: LedgerAction[] = ['ADDED', 'MODIFIED', 'REMOVED'];

      for (const action of actions) {
        const entry = await ledger.append({
          reportId: 'test-report-3',
          citationId: `citation-${action}`,
          action,
          citationText: `Evidence for ${action}`,
          editor: 'user-123',
        });

        expect(entry.action).toBe(action);
      }
    });

    it('should hash citation text but not store it', async () => {
      const citationText = 'Sensitive evidence that should not be stored';

      const entry = await ledger.append({
        reportId: 'test-report-4',
        citationId: 'citation-1',
        action: 'ADDED',
        citationText,
        editor: 'user-123',
      });

      expect(entry.contentHash).toBeDefined();
      expect(entry.contentHash.length).toBe(64); // SHA-256 hex string

      // Verify hash is deterministic
      const entry2 = await ledger.append({
        reportId: 'test-report-4',
        citationId: 'citation-2',
        action: 'ADDED',
        citationText, // Same text
        editor: 'user-123',
      });

      expect(entry2.contentHash).toBe(entry.contentHash);
    });

    it('should support system as editor', async () => {
      const entry = await ledger.append({
        reportId: 'test-report-5',
        citationId: 'citation-1',
        action: 'ADDED',
        citationText: 'System-generated evidence',
        editor: 'system',
      });

      expect(entry.editor).toBe('system');
    });

    it('should store metadata without PII', async () => {
      const metadata = {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        reason: 'Manual edit',
        requestId: 'req-123',
      };

      const entry = await ledger.append({
        reportId: 'test-report-6',
        citationId: 'citation-1',
        action: 'MODIFIED',
        citationText: 'Evidence',
        editor: 'user-123',
        metadata,
      });

      expect(entry.metadata).toEqual(metadata);
    });
  });

  describe('getEntries()', () => {
    it('should return empty array for report with no entries', async () => {
      const entries = await ledger.getEntries('test-report-nonexistent');
      expect(entries).toEqual([]);
    });

    it('should return entries in chronological order', async () => {
      const reportId = 'test-report-7';

      // Add 3 entries
      await ledger.append({
        reportId,
        citationId: 'citation-1',
        action: 'ADDED',
        citationText: 'First',
        editor: 'user-123',
      });

      await ledger.append({
        reportId,
        citationId: 'citation-2',
        action: 'ADDED',
        citationText: 'Second',
        editor: 'user-123',
      });

      await ledger.append({
        reportId,
        citationId: 'citation-3',
        action: 'ADDED',
        citationText: 'Third',
        editor: 'user-123',
      });

      const entries = await ledger.getEntries(reportId);

      expect(entries).toHaveLength(3);
      expect(entries[0].citationId).toBe('citation-1');
      expect(entries[1].citationId).toBe('citation-2');
      expect(entries[2].citationId).toBe('citation-3');

      // Verify chronological order
      expect(entries[0].timestamp.getTime()).toBeLessThanOrEqual(entries[1].timestamp.getTime());
      expect(entries[1].timestamp.getTime()).toBeLessThanOrEqual(entries[2].timestamp.getTime());
    });
  });

  describe('verifyIntegrity()', () => {
    it('should return valid result for empty ledger', async () => {
      const result = await ledger.verifyIntegrity('test-report-empty');

      expect(result.valid).toBe(true);
      expect(result.totalEntries).toBe(0);
      expect(result.verifiedEntries).toBe(0);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('No ledger entries');
    });

    it('should verify single entry with null previousHash', async () => {
      const reportId = 'test-report-8';

      await ledger.append({
        reportId,
        citationId: 'citation-1',
        action: 'ADDED',
        citationText: 'Evidence',
        editor: 'user-123',
      });

      const result = await ledger.verifyIntegrity(reportId);

      expect(result.valid).toBe(true);
      expect(result.totalEntries).toBe(1);
      expect(result.verifiedEntries).toBe(1);
      expect(result.errors).toEqual([]);
      expect(result.firstEntry).toBeDefined();
      expect(result.firstEntry?.previousHash).toBeNull();
    });

    it('should verify hash chain for multiple entries', async () => {
      const reportId = 'test-report-9';

      // Add 5 entries
      for (let i = 1; i <= 5; i++) {
        await ledger.append({
          reportId,
          citationId: `citation-${i}`,
          action: 'ADDED',
          citationText: `Evidence ${i}`,
          editor: 'user-123',
        });
      }

      const result = await ledger.verifyIntegrity(reportId);

      expect(result.valid).toBe(true);
      expect(result.totalEntries).toBe(5);
      expect(result.verifiedEntries).toBe(5); // 1 for first entry + 4 for hash chain
      expect(result.errors).toEqual([]);
    });

    it('should detect invalid signature', async () => {
      const reportId = 'test-report-10';

      // Add entry
      await ledger.append({
        reportId,
        citationId: 'citation-1',
        action: 'ADDED',
        citationText: 'Evidence',
        editor: 'user-123',
      });

      // Manually corrupt signature in database
      await db.execute(
        sql`UPDATE evidence_ledger SET signature = 'invalid-signature' WHERE report_id = ${reportId}`
      );

      const result = await ledger.verifyIntegrity(reportId);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('invalid signature');
    });

    it('should detect broken hash chain', async () => {
      const reportId = 'test-report-11';

      // Add 2 entries
      await ledger.append({
        reportId,
        citationId: 'citation-1',
        action: 'ADDED',
        citationText: 'First',
        editor: 'user-123',
      });

      await ledger.append({
        reportId,
        citationId: 'citation-2',
        action: 'ADDED',
        citationText: 'Second',
        editor: 'user-123',
      });

      // Corrupt hash chain by changing previousHash of second entry
      await db.execute(
        sql`UPDATE evidence_ledger
            SET previous_hash = 'corrupted-hash'
            WHERE report_id = ${reportId}
            AND citation_id = 'citation-2'`
      );

      const result = await ledger.verifyIntegrity(reportId);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('Hash chain broken'))).toBe(true);
    });
  });

  describe('detectTampering()', () => {
    it('should return empty array for valid ledger', async () => {
      const reportId = 'test-report-12';

      // Add entries
      await ledger.append({
        reportId,
        citationId: 'citation-1',
        action: 'ADDED',
        citationText: 'Evidence',
        editor: 'user-123',
      });

      const tamperLogs = await ledger.detectTampering(reportId);

      expect(tamperLogs).toEqual([]);
    });

    it('should detect and log hash chain tampering', async () => {
      const reportId = 'test-report-13';

      // Add 2 entries
      await ledger.append({
        reportId,
        citationId: 'citation-1',
        action: 'ADDED',
        citationText: 'First',
        editor: 'user-123',
      });

      await ledger.append({
        reportId,
        citationId: 'citation-2',
        action: 'ADDED',
        citationText: 'Second',
        editor: 'user-123',
      });

      // Corrupt hash chain
      await db.execute(
        sql`UPDATE evidence_ledger
            SET previous_hash = 'corrupted-hash'
            WHERE report_id = ${reportId}
            AND citation_id = 'citation-2'`
      );

      const tamperLogs = await ledger.detectTampering(reportId);

      expect(tamperLogs.length).toBeGreaterThan(0);
      expect(tamperLogs[0].tamperType).toBe('HASH_CHAIN_BROKEN');
      expect(tamperLogs[0].entryId).toBeDefined();
      expect(tamperLogs[0].details).toBeDefined();
      expect(tamperLogs[0].affectedEntry).toBeDefined();
    });

    it('should detect and log signature tampering', async () => {
      const reportId = 'test-report-14';

      // Add entry
      await ledger.append({
        reportId,
        citationId: 'citation-1',
        action: 'ADDED',
        citationText: 'Evidence',
        editor: 'user-123',
      });

      // Corrupt signature
      await db.execute(
        sql`UPDATE evidence_ledger SET signature = 'invalid' WHERE report_id = ${reportId}`
      );

      const tamperLogs = await ledger.detectTampering(reportId);

      expect(tamperLogs.length).toBeGreaterThan(0);
      expect(tamperLogs[0].tamperType).toBe('INVALID_SIGNATURE');
    });

    it('should provide detailed information in tamper logs', async () => {
      const reportId = 'test-report-15';

      // Add entry
      await ledger.append({
        reportId,
        citationId: 'citation-1',
        action: 'ADDED',
        citationText: 'Evidence',
        editor: 'user-123',
      });

      // Corrupt
      await db.execute(
        sql`UPDATE evidence_ledger SET signature = 'invalid' WHERE report_id = ${reportId}`
      );

      const tamperLogs = await ledger.detectTampering(reportId);
      const log = tamperLogs[0];

      expect(log.entryId).toBeDefined();
      expect(log.entryIndex).toBeGreaterThanOrEqual(0);
      expect(log.timestamp).toBeInstanceOf(Date);
      expect(log.tamperType).toBeDefined();
      expect(log.details).toBeDefined();
      expect(log.affectedEntry).toBeDefined();
      expect(log.affectedEntry.reportId).toBe(reportId);
    });
  });

  describe('Hash Chain Integrity', () => {
    it('should create valid hash chain across multiple entries', async () => {
      const reportId = 'test-report-16';
      const entryCount = 10;

      // Add multiple entries
      for (let i = 1; i <= entryCount; i++) {
        await ledger.append({
          reportId,
          citationId: `citation-${i}`,
          action: 'ADDED',
          citationText: `Evidence ${i}`,
          editor: 'user-123',
        });
      }

      // Verify all entries
      const entries = await ledger.getEntries(reportId);
      expect(entries).toHaveLength(entryCount);

      // First entry should have null previousHash
      expect(entries[0].previousHash).toBeNull();

      // All subsequent entries should have non-null previousHash
      for (let i = 1; i < entryCount; i++) {
        expect(entries[i].previousHash).not.toBeNull();
        expect(entries[i].previousHash).toBeDefined();
      }

      // Verify integrity
      const result = await ledger.verifyIntegrity(reportId);
      expect(result.valid).toBe(true);
      expect(result.totalEntries).toBe(entryCount);
      expect(result.verifiedEntries).toBe(entryCount);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent appends to different reports', async () => {
      const promises = [];

      for (let i = 1; i <= 5; i++) {
        promises.push(
          ledger.append({
            reportId: `test-report-concurrent-${i}`,
            citationId: 'citation-1',
            action: 'ADDED',
            citationText: `Evidence for report ${i}`,
            editor: 'user-123',
          })
        );
      }

      const entries = await Promise.all(promises);

      expect(entries).toHaveLength(5);
      entries.forEach(entry => {
        expect(entry.id).toBeDefined();
        expect(entry.previousHash).toBeNull(); // First entry in each report
      });
    });

    it('should handle very long citation text for hashing', async () => {
      const longText = 'A'.repeat(10000); // 10KB of text

      const entry = await ledger.append({
        reportId: 'test-report-17',
        citationId: 'citation-1',
        action: 'ADDED',
        citationText: longText,
        editor: 'user-123',
      });

      expect(entry.contentHash).toBeDefined();
      expect(entry.contentHash.length).toBe(64); // SHA-256 always 64 chars
    });

    it('should handle empty metadata', async () => {
      const entry = await ledger.append({
        reportId: 'test-report-18',
        citationId: 'citation-1',
        action: 'ADDED',
        citationText: 'Evidence',
        editor: 'user-123',
        metadata: {},
      });

      expect(entry.metadata).toEqual({});
    });

    it('should handle no metadata provided', async () => {
      const entry = await ledger.append({
        reportId: 'test-report-19',
        citationId: 'citation-1',
        action: 'ADDED',
        citationText: 'Evidence',
        editor: 'user-123',
      });

      expect(entry.metadata).toBeNull();
    });
  });

  describe('createEvidenceLedger()', () => {
    it('should throw error if DATABASE_URL not set', () => {
      const originalUrl = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;

      // Dynamic import to test factory function
      expect(() => {
        const { createEvidenceLedger } = require('../ledger');
        createEvidenceLedger();
      }).toThrow('DATABASE_URL environment variable not set');

      process.env.DATABASE_URL = originalUrl;
    });

    it('should throw error if LEDGER_SECRET_KEY not set', () => {
      const originalKey = process.env.LEDGER_SECRET_KEY;
      delete process.env.LEDGER_SECRET_KEY;

      expect(() => {
        const { createEvidenceLedger } = require('../ledger');
        createEvidenceLedger();
      }).toThrow('LEDGER_SECRET_KEY environment variable not set');

      process.env.LEDGER_SECRET_KEY = originalKey;
    });
  });
});
