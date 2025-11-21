/**
 * Evidence Ledger - Append-only tamper-proof audit log
 *
 * Purpose: Provides cryptographic integrity guarantees for evidence citations
 * Compliance: SOC2, ISO 27001, AI Act Article 13, CSRD assurance
 *
 * Security guarantees:
 * - Append-only: no updates or deletes
 * - SHA-256 content digests
 * - Chain integrity via previousDigest
 * - Tamper detection
 * - No PII in ledger entries
 *
 * @module evidence/ledger
 */

import { createHash } from 'crypto';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, desc } from 'drizzle-orm';
import { evidenceLedger, evidenceLedgerAudit } from '@teei/shared-schema';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('reporting:evidence-ledger');

export interface LedgerEntry {
  evidenceId: string;
  evidenceType: 'snippet' | 'citation' | 'metric' | 'calculation';
  companyId: string;
  content: string; // Content to hash (NOT stored, only digest stored)
  eventType: 'created' | 'cited' | 'edited' | 'verified' | 'redacted';
  editorId?: string;
  editorRole?: string;
  reportId?: string;
  lineageId?: string;
  operationContext?: string;
  effectiveAt?: Date;
}

export interface VerificationResult {
  valid: boolean;
  entryId: string;
  expectedDigest: string;
  actualDigest: string;
  chainValid: boolean;
  errors: string[];
}

/**
 * Evidence Ledger Service
 * Manages append-only audit log with cryptographic integrity
 */
export class EvidenceLedger {
  private db: ReturnType<typeof drizzle>;

  constructor(connectionString: string) {
    const client = postgres(connectionString);
    this.db = drizzle(client);
    logger.info('Evidence ledger initialized');
  }

  /**
   * Compute SHA-256 digest of content
   * Uses deterministic JSON serialization for objects
   */
  private computeDigest(content: string): string {
    return createHash('sha256').update(content, 'utf8').digest('hex');
  }

  /**
   * Get the latest ledger entry for an evidence item
   * Used to chain entries via previousDigest
   */
  private async getLatestEntry(evidenceId: string): Promise<any | null> {
    try {
      const entries = await this.db
        .select()
        .from(evidenceLedger)
        .where(eq(evidenceLedger.evidenceId, evidenceId))
        .orderBy(desc(evidenceLedger.version))
        .limit(1);

      return entries.length > 0 ? entries[0] : null;
    } catch (error: any) {
      logger.error(`Failed to get latest entry for ${evidenceId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Append an entry to the ledger
   * This is the ONLY way to add records (no updates or deletes allowed)
   *
   * Security:
   * - Computes SHA-256 digest of content
   * - Chains to previous entry via previousDigest
   * - Increments version number
   * - Records attribution (editorId, not PII)
   *
   * @throws Error if append fails
   */
  async append(entry: LedgerEntry): Promise<string> {
    try {
      logger.info(`Appending ledger entry for evidence ${entry.evidenceId}`, {
        evidenceType: entry.evidenceType,
        eventType: entry.eventType,
        companyId: entry.companyId,
      });

      // Compute content digest (content NOT stored, only digest)
      const contentDigest = this.computeDigest(entry.content);

      // Get previous entry to chain
      const previousEntry = await this.getLatestEntry(entry.evidenceId);
      const previousDigest = previousEntry?.contentDigest || null;
      const version = previousEntry ? previousEntry.version + 1 : 1;

      // Validate chain integrity if previous entry exists
      if (previousEntry && previousEntry.tamperDetected) {
        logger.error(`Cannot append to tampered evidence chain: ${entry.evidenceId}`);
        throw new Error(`Evidence ${entry.evidenceId} has detected tampering. Cannot append.`);
      }

      // Create ledger entry (no PII!)
      const ledgerRecord = {
        evidenceId: entry.evidenceId,
        evidenceType: entry.evidenceType,
        companyId: entry.companyId,
        contentDigest,
        previousDigest,
        version,
        eventType: entry.eventType,
        editorId: entry.editorId || null,
        editorRole: entry.editorRole || null,
        signerIdentity: entry.editorId ? this.computeDigest(entry.editorId) : 'system',
        reportId: entry.reportId || null,
        lineageId: entry.lineageId || null,
        operationContext: entry.operationContext || null,
        tamperDetected: false,
        tamperDetails: null,
        effectiveAt: entry.effectiveAt || new Date(),
        retentionUntil: null, // Set based on GDPR policy
        ipAddress: null, // Anonymize if needed
        userAgent: null, // Truncate if needed
      };

      // Insert (append-only, no updates!)
      const result = await this.db
        .insert(evidenceLedger)
        .values(ledgerRecord as any)
        .returning({ id: evidenceLedger.id });

      const insertedId = result[0].id;

      // Audit the append operation
      await this.auditOperation({
        operationType: 'append',
        ledgerEntryId: insertedId,
        actorId: entry.editorId,
        actorType: entry.editorId ? 'user' : 'system',
        success: true,
      });

      logger.info(`Ledger entry appended successfully`, {
        id: insertedId,
        evidenceId: entry.evidenceId,
        version,
        contentDigest: contentDigest.substring(0, 16) + '...',
      });

      return insertedId;
    } catch (error: any) {
      logger.error(`Failed to append ledger entry: ${error.message}`, { error });

      // Audit the failed operation
      await this.auditOperation({
        operationType: 'append',
        actorId: entry.editorId,
        actorType: entry.editorId ? 'user' : 'system',
        success: false,
        errorMessage: error.message,
      });

      throw error;
    }
  }

  /**
   * Verify the integrity of an evidence chain
   * Checks:
   * - Content digest matches recomputed hash
   * - Chain integrity (previousDigest links)
   * - No gaps in version sequence
   *
   * @param evidenceId The evidence to verify
   * @param expectedContent Expected content for latest version (optional)
   */
  async verify(evidenceId: string, expectedContent?: string): Promise<VerificationResult> {
    try {
      logger.info(`Verifying evidence chain for ${evidenceId}`);

      // Get all entries for this evidence (ordered by version)
      const entries = await this.db
        .select()
        .from(evidenceLedger)
        .where(eq(evidenceLedger.evidenceId, evidenceId))
        .orderBy(evidenceLedger.version);

      if (entries.length === 0) {
        return {
          valid: false,
          entryId: '',
          expectedDigest: '',
          actualDigest: '',
          chainValid: false,
          errors: ['No ledger entries found for this evidence'],
        };
      }

      const errors: string[] = [];
      let chainValid = true;

      // Verify chain integrity
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];

        // Check version sequence
        if (entry.version !== i + 1) {
          errors.push(`Version sequence broken: expected ${i + 1}, got ${entry.version}`);
          chainValid = false;
        }

        // Check previous digest chain
        if (i > 0) {
          const previousEntry = entries[i - 1];
          if (entry.previousDigest !== previousEntry.contentDigest) {
            errors.push(
              `Chain broken at version ${entry.version}: previousDigest mismatch`
            );
            chainValid = false;
          }
        } else {
          // First entry should have no previous digest
          if (entry.previousDigest !== null) {
            errors.push(`First entry should not have previousDigest`);
            chainValid = false;
          }
        }
      }

      // Verify content digest if expectedContent provided
      const latestEntry = entries[entries.length - 1];
      let expectedDigest = latestEntry.contentDigest;
      let actualDigest = latestEntry.contentDigest;
      let digestValid = true;

      if (expectedContent) {
        actualDigest = this.computeDigest(expectedContent);
        digestValid = actualDigest === expectedDigest;

        if (!digestValid) {
          errors.push(
            `Content digest mismatch: expected ${expectedDigest}, got ${actualDigest}`
          );
        }
      }

      const valid = chainValid && digestValid && errors.length === 0;

      // If tampering detected, flag it in the database
      if (!valid && !latestEntry.tamperDetected) {
        logger.error(`TAMPER DETECTED for evidence ${evidenceId}`, { errors });

        // Flag as tampered (this is the ONLY update operation allowed!)
        await this.db
          .update(evidenceLedger)
          .set({
            tamperDetected: true,
            tamperDetails: errors.join('; '),
          })
          .where(eq(evidenceLedger.id, latestEntry.id));
      }

      // Audit the verification
      await this.auditOperation({
        operationType: 'verify',
        ledgerEntryId: latestEntry.id,
        actorType: 'system',
        success: valid,
        errorMessage: valid ? null : errors.join('; '),
      });

      logger.info(`Evidence verification complete`, {
        evidenceId,
        valid,
        chainValid,
        entryCount: entries.length,
      });

      return {
        valid,
        entryId: latestEntry.id,
        expectedDigest,
        actualDigest,
        chainValid,
        errors,
      };
    } catch (error: any) {
      logger.error(`Failed to verify evidence chain: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Get ledger history for an evidence item
   * Returns all versions with metadata (no content, only digests)
   */
  async getHistory(evidenceId: string): Promise<any[]> {
    try {
      const entries = await this.db
        .select()
        .from(evidenceLedger)
        .where(eq(evidenceLedger.evidenceId, evidenceId))
        .orderBy(evidenceLedger.version);

      logger.info(`Retrieved ${entries.length} ledger entries for ${evidenceId}`);

      return entries;
    } catch (error: any) {
      logger.error(`Failed to get ledger history: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Get ledger entries for a report
   * Returns all evidence used in report generation
   */
  async getReportEvidence(reportId: string): Promise<any[]> {
    try {
      const entries = await this.db
        .select()
        .from(evidenceLedger)
        .where(eq(evidenceLedger.reportId, reportId))
        .orderBy(evidenceLedger.recordedAt);

      logger.info(`Retrieved ${entries.length} evidence entries for report ${reportId}`);

      return entries;
    } catch (error: any) {
      logger.error(`Failed to get report evidence: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Get tampered evidence items
   * Returns all evidence that failed verification
   */
  async getTamperedEvidence(companyId?: string): Promise<any[]> {
    try {
      const conditions = [eq(evidenceLedger.tamperDetected, true)];
      if (companyId) {
        conditions.push(eq(evidenceLedger.companyId, companyId));
      }

      const entries = await this.db
        .select()
        .from(evidenceLedger)
        .where(and(...conditions))
        .orderBy(desc(evidenceLedger.recordedAt));

      logger.warn(`Found ${entries.length} tampered evidence items`);

      return entries;
    } catch (error: any) {
      logger.error(`Failed to get tampered evidence: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Audit an operation on the ledger
   * Creates audit trail for all ledger operations
   */
  private async auditOperation(params: {
    operationType: string;
    ledgerEntryId?: string;
    actorId?: string;
    actorType: string;
    success: boolean;
    errorCode?: string;
    errorMessage?: string | null;
  }): Promise<void> {
    try {
      await this.db.insert(evidenceLedgerAudit).values({
        operationType: params.operationType,
        ledgerEntryId: params.ledgerEntryId || null,
        actorId: params.actorId || null,
        actorType: params.actorType,
        success: params.success,
        errorCode: params.errorCode || null,
        errorMessage: params.errorMessage || null,
        requestId: null, // Set from request context if available
        ipAddress: null, // Anonymize if needed
      } as any);
    } catch (error: any) {
      // Don't throw on audit failure, but log it
      logger.error(`Failed to audit ledger operation: ${error.message}`);
    }
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

  return new EvidenceLedger(connectionString);
}
