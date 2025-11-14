import { Router, type Request, type Response } from 'express';
import { db } from '@teei/shared-schema';
import {
  userConsents,
  consentTextVersions,
  dataProcessingRecords,
} from '@teei/shared-schema/schema/gdpr';
import { eq, and, desc } from 'drizzle-orm';

const router = Router();

/**
 * POST /api/gdpr/consent/give
 *
 * Record user consent for a specific purpose
 * GDPR Article 7
 */
router.post('/give', async (req: Request, res: Response) => {
  try {
    const {
      userId,
      purpose,
      consentGiven,
      consentVersion,
      consentMethod = 'explicit_opt_in',
    } = req.body;

    if (!userId || !purpose || consentGiven === undefined) {
      return res.status(400).json({
        error: 'userId, purpose, and consentGiven are required'
      });
    }

    // Validate purpose
    const validPurposes = ['marketing', 'analytics', 'buddy_program', 'data_sharing'];
    if (!validPurposes.includes(purpose)) {
      return res.status(400).json({
        error: `Invalid purpose. Must be one of: ${validPurposes.join(', ')}`
      });
    }

    // Get consent text version
    const consentText = await db.query.consentTextVersions.findFirst({
      where: and(
        eq(consentTextVersions.purpose, purpose),
        eq(consentTextVersions.version, consentVersion || 'v1')
      ),
    });

    if (!consentText) {
      return res.status(404).json({
        error: `Consent text not found for ${purpose} version ${consentVersion}`
      });
    }

    // Check if consent already exists
    const existingConsent = await db.query.userConsents.findFirst({
      where: and(
        eq(userConsents.userId, userId),
        eq(userConsents.purpose, purpose)
      ),
      orderBy: [desc(userConsents.consentDate)],
    });

    // Create new consent record
    const [consent] = await db.insert(userConsents).values({
      userId,
      purpose,
      consentGiven,
      consentText: consentText.body,
      consentVersion: consentText.version,
      consentDate: new Date(),
      consentMethod,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    }).returning();

    // If withdrawing consent, mark old record
    if (!consentGiven && existingConsent && existingConsent.consentGiven) {
      await db.update(userConsents)
        .set({
          withdrawnAt: new Date(),
        })
        .where(eq(userConsents.id, existingConsent.id));
    }

    // Log the consent change
    await db.insert(dataProcessingRecords).values({
      userId,
      activity: consentGiven ? 'consent_given' : 'consent_withdrawn',
      purpose,
      legalBasis: 'consent',
      dataCategories: [purpose],
      processedBy: userId,
      systemComponent: 'gdpr_service',
      metadata: {
        consentVersion: consentText.version,
        previousConsent: existingConsent?.consentGiven,
      },
    });

    res.status(201).json({
      message: consentGiven ? 'Consent recorded successfully' : 'Consent withdrawn successfully',
      consent: {
        id: consent.id,
        purpose: consent.purpose,
        consentGiven: consent.consentGiven,
        consentDate: consent.consentDate,
        consentVersion: consent.consentVersion,
      },
    });
  } catch (error) {
    console.error('Error recording consent:', error);
    res.status(500).json({ error: 'Failed to record consent' });
  }
});

/**
 * POST /api/gdpr/consent/withdraw
 *
 * Withdraw consent for a specific purpose
 */
router.post('/withdraw', async (req: Request, res: Response) => {
  try {
    const { userId, purpose, reason } = req.body;

    if (!userId || !purpose) {
      return res.status(400).json({ error: 'userId and purpose are required' });
    }

    // Find active consent
    const activeConsent = await db.query.userConsents.findFirst({
      where: and(
        eq(userConsents.userId, userId),
        eq(userConsents.purpose, purpose),
        eq(userConsents.consentGiven, true)
      ),
      orderBy: [desc(userConsents.consentDate)],
    });

    if (!activeConsent) {
      return res.status(404).json({ error: 'No active consent found for this purpose' });
    }

    // Mark as withdrawn
    await db.update(userConsents)
      .set({
        consentGiven: false,
        withdrawnAt: new Date(),
        withdrawalReason: reason,
      })
      .where(eq(userConsents.id, activeConsent.id));

    // Create new record for withdrawal
    await db.insert(userConsents).values({
      userId,
      purpose,
      consentGiven: false,
      consentText: activeConsent.consentText,
      consentVersion: activeConsent.consentVersion,
      consentDate: new Date(),
      consentMethod: 'explicit_withdrawal',
      withdrawnAt: new Date(),
      withdrawalReason: reason,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Log withdrawal
    await db.insert(dataProcessingRecords).values({
      userId,
      activity: 'consent_withdrawn',
      purpose,
      legalBasis: 'consent',
      dataCategories: [purpose],
      processedBy: userId,
      systemComponent: 'gdpr_service',
      metadata: { reason },
    });

    res.json({
      message: 'Consent withdrawn successfully',
      purpose,
      withdrawnAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error withdrawing consent:', error);
    res.status(500).json({ error: 'Failed to withdraw consent' });
  }
});

/**
 * GET /api/gdpr/consent/:userId
 *
 * Get all consents for a user
 */
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const consents = await db.query.userConsents.findMany({
      where: eq(userConsents.userId, userId),
      orderBy: [desc(userConsents.consentDate)],
    });

    // Group by purpose, showing only the latest consent
    const latestConsents = new Map();

    for (const consent of consents) {
      if (!latestConsents.has(consent.purpose)) {
        latestConsents.set(consent.purpose, consent);
      }
    }

    const summary = {
      userId,
      consents: Array.from(latestConsents.values()).map(c => ({
        purpose: c.purpose,
        consentGiven: c.consentGiven,
        consentDate: c.consentDate,
        consentVersion: c.consentVersion,
        withdrawnAt: c.withdrawnAt,
        method: c.consentMethod,
      })),
      history: consents.map(c => ({
        id: c.id,
        purpose: c.purpose,
        consentGiven: c.consentGiven,
        consentDate: c.consentDate,
        withdrawnAt: c.withdrawnAt,
      })),
    };

    res.json(summary);
  } catch (error) {
    console.error('Error fetching consents:', error);
    res.status(500).json({ error: 'Failed to fetch consents' });
  }
});

/**
 * GET /api/gdpr/consent/check/:userId/:purpose
 *
 * Check if user has given consent for a specific purpose
 */
router.get('/check/:userId/:purpose', async (req: Request, res: Response) => {
  try {
    const { userId, purpose } = req.params;

    const activeConsent = await db.query.userConsents.findFirst({
      where: and(
        eq(userConsents.userId, userId),
        eq(userConsents.purpose, purpose),
        eq(userConsents.consentGiven, true)
      ),
      orderBy: [desc(userConsents.consentDate)],
    });

    res.json({
      userId,
      purpose,
      hasConsent: !!activeConsent,
      consentDate: activeConsent?.consentDate,
      consentVersion: activeConsent?.consentVersion,
      expiresAt: activeConsent?.expiresAt,
    });
  } catch (error) {
    console.error('Error checking consent:', error);
    res.status(500).json({ error: 'Failed to check consent' });
  }
});

/**
 * POST /api/gdpr/consent/text
 *
 * Create a new consent text version (admin only)
 */
router.post('/text', async (req: Request, res: Response) => {
  try {
    const {
      purpose,
      version,
      language = 'en',
      title,
      body,
      summary,
      effectiveFrom,
      createdBy,
    } = req.body;

    if (!purpose || !version || !title || !body || !createdBy) {
      return res.status(400).json({
        error: 'purpose, version, title, body, and createdBy are required'
      });
    }

    // Check if version already exists
    const existing = await db.query.consentTextVersions.findFirst({
      where: and(
        eq(consentTextVersions.purpose, purpose),
        eq(consentTextVersions.version, version),
        eq(consentTextVersions.language, language)
      ),
    });

    if (existing) {
      return res.status(409).json({ error: 'This consent version already exists' });
    }

    const [consentText] = await db.insert(consentTextVersions).values({
      purpose,
      version,
      language,
      title,
      body,
      summary,
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
      createdBy,
    }).returning();

    res.status(201).json({
      message: 'Consent text version created successfully',
      consentText: {
        id: consentText.id,
        purpose: consentText.purpose,
        version: consentText.version,
        language: consentText.language,
        effectiveFrom: consentText.effectiveFrom,
      },
    });
  } catch (error) {
    console.error('Error creating consent text:', error);
    res.status(500).json({ error: 'Failed to create consent text' });
  }
});

/**
 * GET /api/gdpr/consent/text/:purpose
 *
 * Get current consent text for a purpose
 */
router.get('/text/:purpose', async (req: Request, res: Response) => {
  try {
    const { purpose } = req.params;
    const { language = 'en' } = req.query;

    const consentText = await db.query.consentTextVersions.findFirst({
      where: and(
        eq(consentTextVersions.purpose, purpose),
        eq(consentTextVersions.language, language as string)
      ),
      orderBy: [desc(consentTextVersions.effectiveFrom)],
    });

    if (!consentText) {
      return res.status(404).json({ error: 'Consent text not found for this purpose' });
    }

    res.json(consentText);
  } catch (error) {
    console.error('Error fetching consent text:', error);
    res.status(500).json({ error: 'Failed to fetch consent text' });
  }
});

export default router;
