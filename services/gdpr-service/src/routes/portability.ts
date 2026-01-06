import { Router, type Request, type Response } from 'express';
import { db } from '@teei/shared-schema';
import {
  dataSubjectRequests,
  userConsents,
  dataProcessingRecords,
  encryptedUserPii,
} from '@teei/shared-schema/schema/gdpr';
import { users } from '@teei/shared-schema/schema/users';
import { buddyMatches, buddyEvents, buddyCheckins, buddyFeedback } from '@teei/shared-schema/schema/buddy';
import { eq, and } from 'drizzle-orm';
import { getGDPRService, getEncryptionService } from '@teei/shared-utils';
import type { DataExportOptions } from '@teei/shared-utils/gdpr-service';

const router = Router();
const gdprService = getGDPRService();
const encryptionService = getEncryptionService();

/**
 * POST /api/gdpr/portability/request
 *
 * Submit a Data Portability request
 * GDPR Article 20
 */
router.post('/request', async (req: Request, res: Response) => {
  try {
    const { userId, format, includeSystems } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!format || !['json', 'csv'].includes(format)) {
      return res.status(400).json({ error: 'format must be json or csv' });
    }

    // Check if user exists
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create portability request
    const [request] = await db.insert(dataSubjectRequests).values({
      userId,
      requestType: 'portability',
      status: 'pending',
      requestedBy: userId,
      ipAddress: req.ip,
      responseData: {
        format,
        includeSystems: includeSystems || ['all'],
      },
    }).returning();

    // Log the request
    await db.insert(dataProcessingRecords).values({
      userId,
      activity: 'data_portability_request',
      purpose: 'gdpr_compliance',
      legalBasis: 'legal_obligation',
      dataCategories: ['user_profile', 'personal_data'],
      processedBy: userId,
      systemComponent: 'gdpr_service',
    });

    res.status(201).json({
      message: 'Data portability request submitted successfully',
      requestId: request.id,
      estimatedCompletionTime: '24 hours',
    });
  } catch (error) {
    console.error('Error submitting portability request:', error);
    res.status(500).json({ error: 'Failed to submit portability request' });
  }
});

/**
 * POST /api/gdpr/portability/execute/:requestId
 *
 * Execute a portability request and generate export
 */
router.post('/execute/:requestId', async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;

    // Get the request
    const request = await db.query.dataSubjectRequests.findFirst({
      where: eq(dataSubjectRequests.id, requestId),
    });

    if (!request) {
      return res.status(404).json({ error: 'Portability request not found' });
    }

    if (request.requestType !== 'portability') {
      return res.status(400).json({ error: 'Not a portability request' });
    }

    if (request.status === 'completed') {
      return res.status(400).json({ error: 'Request already completed' });
    }

    const userId = request.userId;
    const exportOptions: DataExportOptions = {
      format: (request.responseData as any)?.format || 'json',
      includeSystems: (request.responseData as any)?.includeSystems || ['all'],
    };

    // Update status to processing
    await db.update(dataSubjectRequests)
      .set({
        status: 'processing',
        processingStartedAt: new Date(),
      })
      .where(eq(dataSubjectRequests.id, requestId));

    // Gather all user data
    const userData: any = {};

    // 1. User Profile
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    userData.profile = {
      id: user?.id,
      email: user?.email,
      displayName: user?.displayName,
      role: user?.role,
      createdAt: user?.createdAt,
    };

    // 2. Encrypted PII (decrypt for export)
    const piiData = await db.query.encryptedUserPii.findFirst({
      where: eq(encryptedUserPii.userId, userId),
    });

    if (piiData) {
      userData.personalInformation = {
        email: piiData.encryptedEmail ? encryptionService.decryptFromString(
          piiData.encryptedEmail,
          `user:${userId}:email`
        ) : null,
        phone: piiData.encryptedPhone ? encryptionService.decryptFromString(
          piiData.encryptedPhone,
          `user:${userId}:phone`
        ) : null,
        consentGiven: piiData.consentGiven,
        consentDate: piiData.consentDate,
      };
    }

    // 3. Consent Records
    const consents = await db.query.userConsents.findMany({
      where: eq(userConsents.userId, userId),
    });
    userData.consents = consents.map(c => ({
      purpose: c.purpose,
      consentGiven: c.consentGiven,
      consentDate: c.consentDate,
      withdrawnAt: c.withdrawnAt,
    }));

    // 4. Buddy System Data
    const matches = await db.query.buddyMatches.findMany({
      where: eq(buddyMatches.participantId, userId),
    });
    userData.buddyMatches = matches.map(m => ({
      matchedAt: m.matchedAt,
      status: m.status,
      endedAt: m.endedAt,
    }));

    // Get buddy events
    const matchIds = matches.map(m => m.id);
    if (matchIds.length > 0) {
      const events = await db.query.buddyEvents.findMany({
        where: (buddyEvents, { inArray }) => inArray(buddyEvents.matchId, matchIds),
      });
      userData.buddyEvents = events.map(e => ({
        eventType: e.eventType,
        eventDate: e.eventDate,
        description: e.description,
        location: e.location,
      }));

      const checkins = await db.query.buddyCheckins.findMany({
        where: (buddyCheckins, { inArray }) => inArray(buddyCheckins.matchId, matchIds),
      });
      userData.buddyCheckins = checkins.map(c => ({
        checkinDate: c.checkinDate,
        mood: c.mood,
        notes: c.notes,
      }));

      const feedback = await db.query.buddyFeedback.findMany({
        where: (buddyFeedback, { inArray }) => inArray(buddyFeedback.matchId, matchIds),
      });
      userData.buddyFeedback = feedback.map(f => ({
        fromRole: f.fromRole,
        rating: f.rating,
        feedbackText: f.feedbackText,
        submittedAt: f.submittedAt,
      }));
    }

    // 5. Processing Records (what we've done with their data)
    const processingRecords = await db.query.dataProcessingRecords.findMany({
      where: eq(dataProcessingRecords.userId, userId),
      orderBy: (dataProcessingRecords, { desc }) => [desc(dataProcessingRecords.processedAt)],
      limit: 100, // Last 100 processing activities
    });
    userData.processingHistory = processingRecords.map(r => ({
      activity: r.activity,
      purpose: r.purpose,
      legalBasis: r.legalBasis,
      processedAt: r.processedAt,
    }));

    // Export data using GDPR service
    const exportData = await gdprService.exportUserData(
      userId,
      userData,
      exportOptions
    );

    // Convert to requested format
    let exportContent: string;
    let contentType: string;

    if (exportOptions.format === 'csv') {
      exportContent = gdprService.exportToCSV(exportData);
      contentType = 'text/csv';
    } else {
      exportContent = JSON.stringify(exportData, null, 2);
      contentType = 'application/json';
    }

    // In production, you'd save this to secure storage and provide a download link
    // For now, we'll return it inline
    const fileUrl = `data:${contentType};base64,${Buffer.from(exportContent).toString('base64')}`;

    // Update request as completed
    await db.update(dataSubjectRequests)
      .set({
        status: 'completed',
        completedAt: new Date(),
        responseFileUrl: fileUrl,
        responseData: exportData,
      })
      .where(eq(dataSubjectRequests.id, requestId));

    // Log export
    await db.insert(dataProcessingRecords).values({
      userId,
      activity: 'data_export_completed',
      purpose: 'gdpr_compliance',
      legalBasis: 'legal_obligation',
      dataCategories: ['all_personal_data'],
      processedBy: userId,
      systemComponent: 'gdpr_service',
    });

    res.json({
      message: 'Data export completed successfully',
      requestId,
      downloadUrl: fileUrl,
      format: exportOptions.format,
      recordCount: {
        profile: 1,
        consents: consents.length,
        buddyMatches: matches.length,
        processingRecords: processingRecords.length,
      },
    });
  } catch (error) {
    console.error('Error executing portability request:', error);
    res.status(500).json({ error: 'Failed to execute portability request' });
  }
});

/**
 * GET /api/gdpr/portability/download/:requestId
 *
 * Download completed data export
 */
router.get('/download/:requestId', async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const { userId } = req.query;

    const request = await db.query.dataSubjectRequests.findFirst({
      where: eq(dataSubjectRequests.id, requestId),
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to download this export' });
    }

    if (request.status !== 'completed') {
      return res.status(400).json({
        error: `Export not ready. Status: ${request.status}`
      });
    }

    const format = (request.responseData as any)?.format || 'json';
    const filename = `user-data-export-${userId}.${format}`;

    // In production, serve from secure storage
    // For now, return the stored data
    if (format === 'csv') {
      const csvData = gdprService.exportToCSV(request.responseData as any);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvData);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json(request.responseData);
    }

    // Log download
    await db.insert(dataProcessingRecords).values({
      userId: request.userId,
      activity: 'data_export_downloaded',
      purpose: 'gdpr_compliance',
      legalBasis: 'legal_obligation',
      dataCategories: ['all_personal_data'],
      processedBy: userId as string,
      systemComponent: 'gdpr_service',
    });
  } catch (error) {
    console.error('Error downloading export:', error);
    res.status(500).json({ error: 'Failed to download export' });
  }
});

/**
 * GET /api/gdpr/portability/status/:userId
 *
 * Check portability request status
 */
router.get('/status/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const requests = await db.query.dataSubjectRequests.findMany({
      where: and(
        eq(dataSubjectRequests.userId, userId),
        eq(dataSubjectRequests.requestType, 'portability')
      ),
      orderBy: (dataSubjectRequests, { desc }) => [desc(dataSubjectRequests.requestedAt)],
    });

    res.json({
      userId,
      requests: requests.map(r => ({
        id: r.id,
        status: r.status,
        requestedAt: r.requestedAt,
        completedAt: r.completedAt,
        format: (r.responseData as any)?.format,
        downloadUrl: r.status === 'completed' ? r.responseFileUrl : null,
      })),
    });
  } catch (error) {
    console.error('Error checking portability status:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

export default router;
