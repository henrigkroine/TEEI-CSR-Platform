import { db } from '@teei/shared-schema';
import { privacyRequests, privacyAuditLog, users } from '@teei/shared-schema';
import { eq } from 'drizzle-orm';
import { createServiceLogger } from '@teei/shared-utils';
import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

const logger = createServiceLogger('privacy-export');

/**
 * Create a data export request
 */
export async function createExportRequest(userId: string, requestedBy?: string) {
  try {
    // Check if user exists
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Create privacy request
    const [request] = await db
      .insert(privacyRequests)
      .values({
        userId,
        requestType: 'export',
        status: 'pending',
        progress: 0,
      })
      .returning();

    logger.info(`Created export request ${request.id} for user ${userId}`);

    // Create audit log entry
    await db
      .insert(privacyAuditLog)
      .values({
        requestId: request.id,
        action: 'export_requested',
        details: {
          userId,
          email: user.email,
        },
        performedBy: requestedBy || userId,
      });

    // Start async processing (in production, use queue like NATS)
    processExportRequest(request.id).catch((error) => {
      logger.error(`Error processing export request ${request.id}:`, error);
    });

    return {
      success: true,
      requestId: request.id,
      status: 'pending',
      message: 'Export request created. You will be notified when complete.',
    };
  } catch (error: any) {
    logger.error('Error creating export request:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Process export request (async)
 */
async function processExportRequest(requestId: string) {
  try {
    // Update status to processing
    await db
      .update(privacyRequests)
      .set({
        status: 'processing',
        progress: 10,
      })
      .where(eq(privacyRequests.id, requestId));

    const [request] = await db
      .select()
      .from(privacyRequests)
      .where(eq(privacyRequests.id, requestId));

    if (!request) {
      throw new Error(`Request not found: ${requestId}`);
    }

    const userId = request.userId;

    // Gather all user data
    logger.info(`Gathering data for user ${userId}`);

    // 1. User profile
    const [userProfile] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    await updateProgress(requestId, 30);

    // 2. Sessions (if table exists)
    // const sessions = await db.select().from(buddySessions).where(eq(buddySessions.userId, userId));
    const sessions: any[] = []; // Placeholder

    await updateProgress(requestId, 50);

    // 3. Feedback and outcomes
    // const feedback = await db.select().from(feedback).where(eq(feedback.userId, userId));
    const feedback: any[] = []; // Placeholder

    await updateProgress(requestId, 70);

    // 4. Evidence and metrics
    // const evidence = await db.select().from(evidence).where(eq(evidence.userId, userId));
    const evidence: any[] = []; // Placeholder

    await updateProgress(requestId, 90);

    // Redact PII in export (email, phone, etc.)
    const exportData = {
      user: redactPII(userProfile),
      sessions: sessions.map(redactPII),
      feedback: feedback.map(redactPII),
      evidence: evidence.map(redactPII),
      exportedAt: new Date().toISOString(),
      requestId,
    };

    // Generate export file
    const exportDir = process.env.EXPORT_DIR || '/tmp/exports';
    await fs.mkdir(exportDir, { recursive: true });

    const filename = `user-data-export-${userId}-${Date.now()}.json`;
    const filepath = path.join(exportDir, filename);

    await fs.writeFile(filepath, JSON.stringify(exportData, null, 2));

    // Update request as completed
    await db
      .update(privacyRequests)
      .set({
        status: 'completed',
        progress: 100,
        resultPath: filepath,
        completedAt: new Date(),
      })
      .where(eq(privacyRequests.id, requestId));

    // Create audit log entry
    await db
      .insert(privacyAuditLog)
      .values({
        requestId,
        action: 'data_exported',
        details: {
          userId,
          filepath,
          recordCounts: {
            sessions: sessions.length,
            feedback: feedback.length,
            evidence: evidence.length,
          },
        },
      });

    logger.info(`Export completed for request ${requestId}`);

    // In production: emit event or send email notification
  } catch (error: any) {
    logger.error(`Error processing export request ${requestId}:`, error);

    // Update request as failed
    await db
      .update(privacyRequests)
      .set({
        status: 'failed',
        errorMessage: error.message,
      })
      .where(eq(privacyRequests.id, requestId));

    // Create audit log entry
    await db
      .insert(privacyAuditLog)
      .values({
        requestId,
        action: 'export_failed',
        details: {
          error: error.message,
        },
      });
  }
}

/**
 * Redact PII from export data
 */
function redactPII(data: any): any {
  if (!data) return data;

  const redacted = { ...data };

  // Redact email
  if (redacted.email) {
    redacted.email = maskEmail(redacted.email);
  }

  // Redact phone numbers (if present)
  if (redacted.phone) {
    redacted.phone = '***-***-****';
  }

  // Redact full name (keep initials)
  if (redacted.firstName) {
    redacted.firstName = redacted.firstName.charAt(0) + '***';
  }
  if (redacted.lastName) {
    redacted.lastName = redacted.lastName.charAt(0) + '***';
  }

  return redacted;
}

/**
 * Mask email address
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  const maskedLocal = local.charAt(0) + '***' + local.charAt(local.length - 1);
  return `${maskedLocal}@${domain}`;
}

/**
 * Update progress
 */
async function updateProgress(requestId: string, progress: number) {
  await db
    .update(privacyRequests)
    .set({ progress })
    .where(eq(privacyRequests.id, requestId));
}

/**
 * Get export request status
 */
export async function getExportStatus(requestId: string) {
  const [request] = await db
    .select()
    .from(privacyRequests)
    .where(eq(privacyRequests.id, requestId));

  if (!request) {
    return {
      success: false,
      error: 'Request not found',
    };
  }

  return {
    success: true,
    request: {
      id: request.id,
      status: request.status,
      progress: request.progress,
      resultPath: request.resultPath,
      requestedAt: request.requestedAt,
      completedAt: request.completedAt,
      errorMessage: request.errorMessage,
    },
  };
}
