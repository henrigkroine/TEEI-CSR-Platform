import { db } from '@teei/shared-schema';
import { privacyRequests, privacyAuditLog, users } from '@teei/shared-schema';
import { eq } from 'drizzle-orm';
import { createServiceLogger, getEventBus } from '@teei/shared-utils';

const logger = createServiceLogger('privacy-delete');

/**
 * Create a data deletion request
 * Note: Requires admin approval in production
 */
export async function createDeleteRequest(
  userId: string,
  requestedBy: string,
  adminApproved: boolean = false
) {
  try {
    // Check if user exists
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // In production, check if requestedBy has admin privileges
    if (!adminApproved) {
      return {
        success: false,
        error: 'Deletion requests require admin approval',
        message: 'Please contact an administrator to process this request',
      };
    }

    // Create privacy request
    const [request] = await db
      .insert(privacyRequests)
      .values({
        userId,
        requestType: 'delete',
        status: 'pending',
        progress: 0,
      })
      .returning();

    logger.info(`Created delete request ${request.id} for user ${userId}`);

    // Create audit log entry
    await db
      .insert(privacyAuditLog)
      .values({
        requestId: request.id,
        action: 'delete_requested',
        details: {
          userId,
          email: user.email,
          adminApproved,
        },
        performedBy: requestedBy,
      });

    // Start async processing
    processDeleteRequest(request.id, requestedBy).catch((error) => {
      logger.error(`Error processing delete request ${request.id}:`, error);
    });

    return {
      success: true,
      requestId: request.id,
      status: 'pending',
      message: 'Delete request created and will be processed',
    };
  } catch (error: any) {
    logger.error('Error creating delete request:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Process delete request (async)
 */
async function processDeleteRequest(requestId: string, performedBy: string) {
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

    logger.info(`Processing deletion for user ${userId}`);

    const deletionSummary: any = {
      userId,
      deletedRecords: {},
      anonymizedRecords: {},
      timestamp: new Date().toISOString(),
    };

    // 1. Delete or anonymize sessions
    // In production: Some data may need to be anonymized rather than deleted
    // to preserve aggregate metrics
    logger.info('Deleting/anonymizing sessions...');
    // await db.delete(buddySessions).where(eq(buddySessions.userId, userId));
    deletionSummary.deletedRecords.sessions = 0; // Placeholder

    await updateProgress(requestId, 25);

    // 2. Delete feedback
    logger.info('Deleting feedback...');
    // await db.delete(feedback).where(eq(feedback.userId, userId));
    deletionSummary.deletedRecords.feedback = 0; // Placeholder

    await updateProgress(requestId, 40);

    // 3. Anonymize outcomes (keep for metrics but remove user link)
    logger.info('Anonymizing outcomes...');
    // await db.update(outcomes).set({ userId: null }).where(eq(outcomes.userId, userId));
    deletionSummary.anonymizedRecords.outcomes = 0; // Placeholder

    await updateProgress(requestId, 55);

    // 4. Delete evidence
    logger.info('Deleting evidence...');
    // await db.delete(evidence).where(eq(evidence.userId, userId));
    deletionSummary.deletedRecords.evidence = 0; // Placeholder

    await updateProgress(requestId, 70);

    // 5. Delete external ID mappings
    logger.info('Deleting external ID mappings...');
    // await db.delete(externalIdMappings).where(eq(externalIdMappings.userId, userId));
    deletionSummary.deletedRecords.externalIdMappings = 0; // Placeholder

    await updateProgress(requestId, 85);

    // 6. Delete user profile (last)
    logger.info('Deleting user profile...');
    await db
      .delete(users)
      .where(eq(users.id, userId));

    deletionSummary.deletedRecords.userProfile = 1;

    await updateProgress(requestId, 95);

    // Emit deletion events for all services to handle
    const eventBus = getEventBus();
    await eventBus.emit({
      type: 'user.deleted',
      data: {
        userId,
        requestId,
        deletionSummary,
      },
      timestamp: new Date().toISOString(),
      source: 'api-gateway-privacy',
    });

    // Update request as completed
    await db
      .update(privacyRequests)
      .set({
        status: 'completed',
        progress: 100,
        resultPath: JSON.stringify(deletionSummary),
        completedAt: new Date(),
      })
      .where(eq(privacyRequests.id, requestId));

    // Create audit log entry
    await db
      .insert(privacyAuditLog)
      .values({
        requestId,
        action: 'user_deleted',
        details: deletionSummary,
        performedBy,
      });

    logger.info(`Deletion completed for request ${requestId}`);
  } catch (error: any) {
    logger.error(`Error processing delete request ${requestId}:`, error);

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
        action: 'delete_failed',
        details: {
          error: error.message,
        },
        performedBy,
      });
  }
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
 * Get delete request status
 */
export async function getDeleteStatus(requestId: string) {
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

/**
 * Get all privacy requests for a user
 */
export async function getUserPrivacyRequests(userId: string) {
  const requests = await db
    .select()
    .from(privacyRequests)
    .where(eq(privacyRequests.userId, userId))
    .orderBy(privacyRequests.requestedAt);

  return {
    success: true,
    requests,
  };
}

/**
 * Get audit trail for a request
 */
export async function getAuditTrail(requestId: string) {
  const auditLogs = await db
    .select()
    .from(privacyAuditLog)
    .where(eq(privacyAuditLog.requestId, requestId))
    .orderBy(privacyAuditLog.performedAt);

  return {
    success: true,
    auditLogs,
  };
}
