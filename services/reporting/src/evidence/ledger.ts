/**
 * Evidence Ledger - Append-only tamper-evident ledger for evidence/citation tracking
 *
 * Features:
 * - Append-only ledger with hash chaining
 * - HMAC signatures for authentication
 * - Tamper detection via integrity verification
 * - NO PII stored (only IDs and hashes)
 *
 * Security Model:
 * - Each entry contains SHA-256 hash of citation text
 * - Hash chain: each entry links to previous via previousHash
 * - HMAC-SHA256 signature over entry data
 * - Immutability enforced at database level
 *
 * Usage:
 * ```typescript
 * const ledger = new EvidenceLedger(db, process.env.LEDGER_SECRET_KEY);
 * await ledger.append({
 *   reportId: '...',
 *   citationId: '...',
 *   action: 'ADDED',
 *   citationText: 'Evidence snippet...',
 *   editor: userId,
 *   metadata: { ip: '...', userAgent: '...', reason: 'Initial report generation' }
 * });
 * ```
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, desc, asc } from 'drizzle-orm';
import { evidenceLedger } from '@teei/shared-schema';
import { createServiceLogger } from '@teei/shared-utils';
import { createHash, createHmac } from 'crypto';
import { getAuditIntegration } from '../lib/audit-integration.js';

const logger = createServiceLogger('reporting:evidence-ledger');

/**
 * Ledger entry action types
 */
export type LedgerAction = 'ADDED' | 'MODIFIED' | 'REMOVED';

/**
 * Metadata attached to each ledger entry
 * NO PII - only technical data
 */
export interface LedgerMetadata {
  ip?: string;
  userAgent?: string;
  reason?: string;
  requestId?: string;
  [key: string]: any; // Allow additional non-PII technical metadata
}

/**
 * Input for appending a new ledger entry
 */
export interface AppendLedgerEntryInput {
  reportId: string;
  citationId: string;
  action: LedgerAction;
  citationText: string; // Used for hashing only, NOT stored
  editor: string; // userId or 'system'
  metadata?: LedgerMetadata;
}

/**
 * Ledger entry returned from database
 */
export interface LedgerEntry {
  id: string;
  reportId: string;
  citationId: string;
  action: LedgerAction;
  contentHash: string;
  previousHash: string | null;
  signature: string;
  editor: string;
  metadata: LedgerMetadata | null;
  timestamp: Date;
}

/**
 * Result of integrity verification
 */
export interface VerificationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  totalEntries: number;
  verifiedEntries: number;
  firstEntry?: LedgerEntry;
  lastEntry?: LedgerEntry;
}

/**
 * Tampering detection log
 */
export interface TamperLog {
  entryId: string;
  entryIndex: number;
  timestamp: Date;
  tamperType: 'HASH_CHAIN_BROKEN' | 'INVALID_SIGNATURE' | 'MISSING_ENTRY' | 'REORDERED';
  details: string;
  affectedEntry: LedgerEntry;
  previousEntry?: LedgerEntry;
}

/**
 * Evidence Ledger Class
 * Manages append-only ledger with tamper detection
 */
export class EvidenceLedger {
  private db: ReturnType<typeof drizzle>;
  private secretKey: string;

  /**
   * @param connectionString - PostgreSQL connection string
   * @param secretKey - Secret key for HMAC signatures (must be kept secure)
   */
  constructor(connectionString: string, secretKey: string) {
    if (!secretKey || secretKey.length < 32) {
      throw new Error('Secret key must be at least 32 characters for security');
    }

    const client = postgres(connectionString);
    this.db = drizzle(client);
    this.secretKey = secretKey;

    logger.info('Evidence ledger initialized');
  }

  /**
   * Append a new entry to the ledger
   * Automatically handles hash chaining and signature generation
   */
  async append(input: AppendLedgerEntryInput): Promise<LedgerEntry> {
    try {
      logger.info(`Appending ledger entry: ${input.action} for citation ${input.citationId}`);

      // Calculate content hash (SHA-256 of citation text)
      const contentHash = this.hashContent(input.citationText);

      // Get previous entry for hash chaining
      const previousEntry = await this.getLastEntry(input.reportId);
      const previousHash = previousEntry ? this.hashEntry(previousEntry) : null;

      // Generate entry ID (will be set by database, but we need it for signature)
      // We'll use a temporary value and recalculate after insert
      const timestamp = new Date();

      // Create signature
      const signatureData = {
        reportId: input.reportId,
        citationId: input.citationId,
        action: input.action,
        contentHash,
        previousHash,
        editor: input.editor,
        timestamp: timestamp.toISOString(),
      };
      const signature = this.generateSignature(signatureData);

      // Insert entry
      const [entry] = await this.db
        .insert(evidenceLedger)
        .values({
          reportId: input.reportId,
          citationId: input.citationId,
          action: input.action,
          contentHash,
          previousHash,
          signature,
          editor: input.editor,
          metadata: input.metadata || null,
          timestamp,
        })
        .returning();

      logger.info(`Ledger entry created: ${entry.id}`);

      // Emit audit event for citation edit
      try {
        const auditIntegration = getAuditIntegration();
        await auditIntegration.emitCitationEdited({
          reportId: input.reportId,
          citationId: input.citationId,
          action: input.action,
          editor: input.editor,
          previousHash: previousHash || undefined,
          newHash: contentHash,
          metadata: {
            ...input.metadata,
            requestId: input.metadata?.requestId,
          },
        });
      } catch (error: any) {
        // Log but don't fail the operation if audit event emission fails
        logger.warn(`Failed to emit audit event for ledger entry ${entry.id}: ${error.message}`);
      }

      return this.mapToLedgerEntry(entry);
    } catch (error: any) {
      logger.error(`Failed to append ledger entry: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Get all ledger entries for a report in chronological order
   */
  async getEntries(reportId: string): Promise<LedgerEntry[]> {
    try {
      const entries = await this.db
        .select()
        .from(evidenceLedger)
        .where(eq(evidenceLedger.reportId, reportId))
        .orderBy(asc(evidenceLedger.timestamp));

      return entries.map(e => this.mapToLedgerEntry(e));
    } catch (error: any) {
      logger.error(`Failed to get ledger entries: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Verify integrity of all ledger entries for a report
   * Checks hash chain and signatures
   */
  async verifyIntegrity(reportId: string): Promise<VerificationResult> {
    try {
      logger.info(`Verifying ledger integrity for report ${reportId}`);

      const entries = await this.getEntries(reportId);
      const errors: string[] = [];
      const warnings: string[] = [];
      let verifiedEntries = 0;

      if (entries.length === 0) {
        warnings.push('No ledger entries found for this report');
        return {
          valid: true,
          errors,
          warnings,
          totalEntries: 0,
          verifiedEntries: 0,
        };
      }

      // Verify first entry has no previous hash
      if (entries[0].previousHash !== null) {
        errors.push(`First entry ${entries[0].id} has non-null previousHash (expected null)`);
      } else {
        verifiedEntries++;
      }

      // Verify signatures for all entries
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const isSignatureValid = this.verifySignature(entry);

        if (!isSignatureValid) {
          errors.push(`Entry ${entry.id} (index ${i}) has invalid signature`);
        }
      }

      // Verify hash chain
      for (let i = 1; i < entries.length; i++) {
        const current = entries[i];
        const previous = entries[i - 1];

        const expectedPreviousHash = this.hashEntry(previous);

        if (current.previousHash !== expectedPreviousHash) {
          errors.push(
            `Hash chain broken at entry ${current.id} (index ${i}): ` +
            `expected previousHash ${expectedPreviousHash}, got ${current.previousHash}`
          );
        } else {
          verifiedEntries++;
        }
      }

      const result: VerificationResult = {
        valid: errors.length === 0,
        errors,
        warnings,
        totalEntries: entries.length,
        verifiedEntries,
        firstEntry: entries[0],
        lastEntry: entries[entries.length - 1],
      };

      logger.info('Integrity verification complete', {
        reportId,
        valid: result.valid,
        totalEntries: result.totalEntries,
        verifiedEntries: result.verifiedEntries,
        errorCount: errors.length,
      });

      return result;
    } catch (error: any) {
      logger.error(`Failed to verify integrity: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Detect tampering in ledger entries
   * Returns detailed logs of any detected tampering
   */
  async detectTampering(reportId: string): Promise<TamperLog[]> {
    try {
      logger.info(`Detecting tampering for report ${reportId}`);

      const verification = await this.verifyIntegrity(reportId);
      const entries = await this.getEntries(reportId);
      const tamperLogs: TamperLog[] = [];

      if (verification.valid) {
        logger.info('No tampering detected');
        return tamperLogs;
      }

      // Parse errors to create tamper logs
      for (const error of verification.errors) {
        // Extract entry ID from error message
        const entryIdMatch = error.match(/entry ([a-f0-9-]+)/i);
        const indexMatch = error.match(/index (\d+)/);

        if (!entryIdMatch) continue;

        const entryId = entryIdMatch[1];
        const entryIndex = indexMatch ? parseInt(indexMatch[1], 10) : -1;
        const entry = entries.find(e => e.id === entryId);

        if (!entry) continue;

        let tamperType: TamperLog['tamperType'];
        if (error.includes('Hash chain broken')) {
          tamperType = 'HASH_CHAIN_BROKEN';
        } else if (error.includes('invalid signature')) {
          tamperType = 'INVALID_SIGNATURE';
        } else if (error.includes('previousHash')) {
          tamperType = 'HASH_CHAIN_BROKEN';
        } else {
          tamperType = 'MISSING_ENTRY';
        }

        tamperLogs.push({
          entryId: entry.id,
          entryIndex,
          timestamp: entry.timestamp,
          tamperType,
          details: error,
          affectedEntry: entry,
          previousEntry: entryIndex > 0 ? entries[entryIndex - 1] : undefined,
        });
      }

      logger.warn(`Tampering detected: ${tamperLogs.length} issues found`, {
        reportId,
        tamperCount: tamperLogs.length,
      });

      return tamperLogs;
    } catch (error: any) {
      logger.error(`Failed to detect tampering: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Get the last entry for a report (for hash chaining)
   */
  private async getLastEntry(reportId: string): Promise<LedgerEntry | null> {
    const [entry] = await this.db
      .select()
      .from(evidenceLedger)
      .where(eq(evidenceLedger.reportId, reportId))
      .orderBy(desc(evidenceLedger.timestamp))
      .limit(1);

    return entry ? this.mapToLedgerEntry(entry) : null;
  }

  /**
   * Hash citation content (SHA-256)
   */
  private hashContent(text: string): string {
    return createHash('sha256').update(text).digest('hex');
  }

  /**
   * Hash a ledger entry for hash chaining
   * Uses all immutable fields to create a unique hash
   */
  private hashEntry(entry: LedgerEntry): string {
    const data = `${entry.id}|${entry.reportId}|${entry.citationId}|${entry.action}|${entry.contentHash}|${entry.timestamp.toISOString()}`;
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate HMAC signature for an entry
   */
  private generateSignature(data: any): string {
    const payload = JSON.stringify(data);
    return createHmac('sha256', this.secretKey).update(payload).digest('hex');
  }

  /**
   * Verify HMAC signature of an entry
   */
  private verifySignature(entry: LedgerEntry): boolean {
    const signatureData = {
      reportId: entry.reportId,
      citationId: entry.citationId,
      action: entry.action,
      contentHash: entry.contentHash,
      previousHash: entry.previousHash,
      editor: entry.editor,
      timestamp: entry.timestamp.toISOString(),
    };

    const expectedSignature = this.generateSignature(signatureData);
    return entry.signature === expectedSignature;
  }

  /**
   * Map database result to LedgerEntry
   */
  private mapToLedgerEntry(row: any): LedgerEntry {
    return {
      id: row.id,
      reportId: row.reportId,
      citationId: row.citationId,
      action: row.action as LedgerAction,
      contentHash: row.contentHash,
      previousHash: row.previousHash,
      signature: row.signature,
      editor: row.editor,
      metadata: row.metadata,
      timestamp: row.timestamp,
    };
  }
}

/**
 * Create Evidence Ledger from environment variables
 */
export function createEvidenceLedger(): EvidenceLedger {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable not set');
  }

  const secretKey = process.env.LEDGER_SECRET_KEY;
  if (!secretKey) {
    throw new Error('LEDGER_SECRET_KEY environment variable not set');
  }

  return new EvidenceLedger(connectionString, secretKey);
}
