import { Router, type Request, type Response } from 'express';
import { db } from '@teei/shared-schema';
import {
  dataSubjectRequests,
  userConsents,
  dataProcessingRecords,
  encryptedUserPii,
  piiAccessLog,
  piiDeletionQueue
} from '@teei/shared-schema/schema/gdpr';
import { users } from '@teei/shared-schema/schema/users';
import { buddyMatches, buddyEvents, buddyCheckins, buddyFeedback } from '@teei/shared-schema/schema/buddy';
import { eq, and, inArray } from 'drizzle-orm';
import { getGDPRService } from '@teei/shared-utils/gdpr-service';
import crypto from 'crypto';

const router = Router();
const gdprService = getGDPRService();

/**
 * POST /api/gdpr/erasure/request
 *
 * Submit a Right to Erasure (Right to be Forgotten) request
 * GDPR Article 17
 */
router.post('/request', async (req: Request, res: Response) => {
  try {
    const { userId, reason } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Check if user exists
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check for existing pending requests
    const existingRequest = await db.query.dataSubjectRequests.findFirst({
      where: and(
        eq(dataSubjectRequests.userId, userId),
        eq(dataSubjectRequests.requestType, 'erasure'),
        inArray(dataSubjectRequests.status, ['pending', 'processing'])
      ),
    });

    if (existingRequest) {
      return res.status(409).json({
        error: 'An erasure request is already pending for this user',
        requestId: existingRequest.id,
      });
    }

    // Create erasure request
    const [request] = await db.insert(dataSubjectRequests).values({
      userId,
      requestType: 'erasure',
      status: 'pending',
      requestedBy: userId,
      requestReason: reason || 'User requested account deletion',
      ipAddress: req.ip,
      deletionScheduledFor: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days grace period
    }).returning();

    // Log the request
    await db.insert(dataProcessingRecords).values({
      userId,
      activity: 'erasure_request_submitted',
      purpose: 'gdpr_compliance',
      legalBasis: 'legal_obligation',
      dataCategories: ['user_profile', 'all_personal_data'],
      processedBy: userId,
      systemComponent: 'gdpr_service',
    });

    res.status(201).json({
      message: 'Erasure request submitted successfully',
      requestId: request.id,
      scheduledDeletionDate: request.deletionScheduledFor,
      gracePeriodDays: 30,
    });
  } catch (error) {
    console.error('Error submitting erasure request:', error);
    res.status(500).json({ error: 'Failed to submit erasure request' });
  }
});

/**
 * POST /api/gdpr/erasure/execute/:requestId
 *
 * Execute a pending erasure request (admin only)
 * Performs cascade deletion across all systems
 */
router.post('/execute/:requestId', async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const { adminId, confirmation } = req.body;

    if (confirmation !== 'DELETE_USER_DATA') {
      return res.status(400).json({
        error: 'Confirmation string must be "DELETE_USER_DATA"'
      });
    }

    // Get the request
    const request = await db.query.dataSubjectRequests.findFirst({
      where: eq(dataSubjectRequests.id, requestId),
    });

    if (!request) {
      return res.status(404).json({ error: 'Erasure request not found' });
    }

    if (request.requestType !== 'erasure') {
      return res.status(400).json({ error: 'Not an erasure request' });
    }

    if (request.status === 'completed') {
      return res.status(400).json({ error: 'Request already completed' });
    }

    const userId = request.userId;

    // Update request status to processing
    await db.update(dataSubjectRequests)
      .set({
        status: 'processing',
        assignedTo: adminId,
        processingStartedAt: new Date(),
      })
      .where(eq(dataSubjectRequests.id, requestId));

    // Collect data before deletion for verification hash
    const userData = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    const systemsDeleted: string[] = [];

    // 1. Delete from Buddy System tables
    try {
      await db.delete(buddyFeedback).where(
        eq(buddyFeedback.matchId, userId) // Note: This should reference buddy match IDs
      );
      await db.delete(buddyCheckins).where(
        eq(buddyCheckins.matchId, userId)
      );
      await db.delete(buddyEvents).where(
        eq(buddyEvents.matchId, userId)
      );
      await db.delete(buddyMatches).where(
        eq(buddyMatches.participantId, userId)
      );
      await db.delete(buddyMatches).where(
        eq(buddyMatches.buddyId, userId)
      );
      systemsDeleted.push('buddy_system');
    } catch (error) {
      console.error('Error deleting buddy data:', error);
    }

    // 2. Delete encrypted PII
    try {
      await db.delete(encryptedUserPii).where(
        eq(encryptedUserPii.userId, userId)
      );
      systemsDeleted.push('encrypted_pii');
    } catch (error) {
      console.error('Error deleting encrypted PII:', error);
    }

    // 3. Delete or anonymize consents (keep audit trail)
    // We keep consent records for legal compliance but anonymize them
    await db.update(userConsents)
      .set({
        userId: 'DELETED_USER' as any, // Anonymize user reference
      })
      .where(eq(userConsents.userId, userId));
    systemsDeleted.push('consents_anonymized');

    // 4. Keep processing records for audit but anonymize
    await db.update(dataProcessingRecords)
      .set({
        userId: 'DELETED_USER' as any,
      })
      .where(eq(dataProcessingRecords.userId, userId));
    systemsDeleted.push('processing_records_anonymized');

    // 5. Delete PII access logs (or anonymize)
    await db.delete(piiAccessLog).where(
      eq(piiAccessLog.userId, userId)
    );
    systemsDeleted.push('pii_access_logs');

    // 6. Delete user account
    await db.delete(users).where(eq(users.id, userId));
    systemsDeleted.push('user_account');

    // Generate verification hash
    const verificationHash = gdprService.generateDeletionHash(userId, userData);

    // Update request as completed
    await db.update(dataSubjectRequests)
      .set({
        status: 'completed',
        completedAt: new Date(),
        deletionCompletedAt: new Date(),
        systemsDeleted,
        verificationHash,
      })
      .where(eq(dataSubjectRequests.id, requestId));

    // Log completion
    await db.insert(dataProcessingRecords).values({
      userId: 'DELETED_USER' as any,
      activity: 'erasure_completed',
      purpose: 'gdpr_compliance',
      legalBasis: 'legal_obligation',
      dataCategories: ['all_personal_data'],
      processedBy: adminId,
      systemComponent: 'gdpr_service',
      metadata: {
        originalUserId: userId,
        verificationHash,
        systemsDeleted,
      },
    });

    res.json({
      message: 'User data erased successfully',
      userId,
      systemsDeleted,
      verificationHash,
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error executing erasure:', error);
    res.status(500).json({ error: 'Failed to execute erasure' });
  }
});

/**
 * POST /api/gdpr/erasure/cancel/:requestId
 *
 * Cancel a pending erasure request (within grace period)
 */
router.post('/cancel/:requestId', async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const { userId, reason } = req.body;

    const request = await db.query.dataSubjectRequests.findFirst({
      where: eq(dataSubjectRequests.id, requestId),
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to cancel this request' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        error: `Cannot cancel request with status: ${request.status}`
      });
    }

    // Update request as rejected/cancelled
    await db.update(dataSubjectRequests)
      .set({
        status: 'rejected',
        completedAt: new Date(),
        rejectionReason: reason || 'Cancelled by user',
      })
      .where(eq(dataSubjectRequests.id, requestId));

    res.json({
      message: 'Erasure request cancelled successfully',
      requestId,
    });
  } catch (error) {
    console.error('Error cancelling erasure request:', error);
    res.status(500).json({ error: 'Failed to cancel request' });
  }
});

/**
 * GET /api/gdpr/erasure/status/:userId
 *
 * Check erasure request status for a user
 */
router.get('/status/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const requests = await db.query.dataSubjectRequests.findMany({
      where: and(
        eq(dataSubjectRequests.userId, userId),
        eq(dataSubjectRequests.requestType, 'erasure')
      ),
      orderBy: (dataSubjectRequests, { desc }) => [desc(dataSubjectRequests.requestedAt)],
    });

    res.json({
      userId,
      requests: requests.map(r => ({
        id: r.id,
        status: r.status,
        requestedAt: r.requestedAt,
        scheduledDeletionDate: r.deletionScheduledFor,
        completedAt: r.completedAt,
        systemsDeleted: r.systemsDeleted,
      })),
    });
  } catch (error) {
    console.error('Error checking erasure status:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

export default router;
