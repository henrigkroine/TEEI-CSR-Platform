import type { FastifyInstance } from 'fastify';
import { db, users, externalIdMappings, programEnrollments, userExternalIds } from '@teei/shared-schema';
import { eq, and } from 'drizzle-orm';
import { NotFoundError, ValidationError } from '@teei/shared-utils';
import { z } from 'zod';
import {
  linkExternalId,
  getExternalIds,
  updateJourneyFlag,
  incrementJourneyCounter,
  getJourneyFlags,
  updateJourneyFlags,
  type IdentityProvider,
  type JourneyFlagKey,
} from '../utils/profile-linking.js';

const CreateMappingSchema = z.object({
  userId: z.string().uuid(),
  externalSystem: z.string(),
  externalId: z.string(),
});

const UpdateProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
});

// New schemas for TASK-A-05
const LinkExternalIdSchema = z.object({
  profileId: z.string().uuid(),
  provider: z.enum(['buddy', 'discord', 'kintell', 'upskilling']),
  externalId: z.string().min(1),
  metadata: z.record(z.any()).optional(),
});

const UpdateJourneyFlagsSchema = z.object({
  flags: z.record(z.any()),
});

const IncrementCounterSchema = z.object({
  counterKey: z.string(),
  increment: z.number().int().default(1),
});

export async function profileRoutes(app: FastifyInstance) {
  // GET /profile/:id - Get aggregated profile
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;

    // Fetch user
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    if (!user) {
      throw new NotFoundError(`User with id ${id} not found`);
    }

    // Fetch external mappings
    const mappings = await db
      .select()
      .from(externalIdMappings)
      .where(eq(externalIdMappings.userId, id));

    // Fetch program enrollments
    const enrollments = await db
      .select()
      .from(programEnrollments)
      .where(eq(programEnrollments.userId, id));

    // Build journey flags
    const journeyFlags = {
      isBuddyMatched: enrollments.some((e) => e.programType === 'buddy' && e.status === 'active'),
      hasCompletedLanguage: enrollments.some(
        (e) => e.programType === 'language' && e.status === 'completed'
      ),
      hasCompletedMentorship: enrollments.some(
        (e) => e.programType === 'mentorship' && e.status === 'completed'
      ),
      hasCompletedCourse: enrollments.some(
        (e) => e.programType === 'upskilling' && e.status === 'completed'
      ),
    };

    return {
      ...user,
      externalMappings: mappings.reduce(
        (acc, m) => {
          acc[m.externalSystem] = m.externalId;
          return acc;
        },
        {} as Record<string, string>
      ),
      enrollments,
      journeyFlags,
    };
  });

  // PUT /profile/:id - Update profile
  app.put<{ Params: { id: string }; Body: unknown }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const parsed = UpdateProfileSchema.safeParse(request.body);

    if (!parsed.success) {
      throw new ValidationError('Invalid request body', { errors: parsed.error.errors });
    }

    const updates = parsed.data;

    const [updated] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundError(`User with id ${id} not found`);
    }

    return updated;
  });

  // POST /profile/mapping - Link external ID
  app.post<{ Body: unknown }>('/mapping', async (request, reply) => {
    const parsed = CreateMappingSchema.safeParse(request.body);

    if (!parsed.success) {
      throw new ValidationError('Invalid request body', { errors: parsed.error.errors });
    }

    const { userId, externalSystem, externalId } = parsed.data;

    // Check if mapping already exists
    const [existing] = await db
      .select()
      .from(externalIdMappings)
      .where(
        and(
          eq(externalIdMappings.userId, userId),
          eq(externalIdMappings.externalSystem, externalSystem)
        )
      )
      .limit(1);

    if (existing) {
      // Update existing
      const [updated] = await db
        .update(externalIdMappings)
        .set({ externalId })
        .where(eq(externalIdMappings.id, existing.id))
        .returning();
      return updated;
    }

    // Create new mapping
    const [mapping] = await db
      .insert(externalIdMappings)
      .values({
        userId,
        externalSystem,
        externalId,
      })
      .returning();

    return mapping;
  });

  // ======================================
  // NEW ENDPOINTS - TASK-A-05
  // ======================================

  // POST /profile/link-external - Link external ID to profile
  app.post<{ Body: unknown }>('/link-external', async (request, reply) => {
    const parsed = LinkExternalIdSchema.safeParse(request.body);

    if (!parsed.success) {
      throw new ValidationError('Invalid request body', { errors: parsed.error.errors });
    }

    const { profileId, provider, externalId, metadata } = parsed.data;

    // Verify profile exists
    const [profile] = await db.select().from(users).where(eq(users.id, profileId)).limit(1);

    if (!profile) {
      throw new NotFoundError(`Profile with id ${profileId} not found`);
    }

    const result = await linkExternalId(
      profileId,
      provider as IdentityProvider,
      externalId,
      metadata,
      'api-request'
    );

    return {
      success: true,
      mappingId: result.id,
      isNew: result.isNew,
      profileId,
      provider,
    };
  });

  // GET /profile/:id/external-ids - Get all external IDs for a profile
  app.get<{ Params: { id: string } }>('/:id/external-ids', async (request, reply) => {
    const { id } = request.params;

    // Verify profile exists
    const [profile] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    if (!profile) {
      throw new NotFoundError(`Profile with id ${id} not found`);
    }

    const externalIds = await getExternalIds(id);

    return {
      profileId: id,
      externalIds,
    };
  });

  // PUT /profile/:id/flags - Update journey flags
  app.put<{ Params: { id: string }; Body: unknown }>('/:id/flags', async (request, reply) => {
    const { id } = request.params;
    const parsed = UpdateJourneyFlagsSchema.safeParse(request.body);

    if (!parsed.success) {
      throw new ValidationError('Invalid request body', { errors: parsed.error.errors });
    }

    const { flags } = parsed.data;

    // Verify profile exists
    const [profile] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    if (!profile) {
      throw new NotFoundError(`Profile with id ${id} not found`);
    }

    await updateJourneyFlags(id, flags);

    const updatedFlags = await getJourneyFlags(id);

    return {
      success: true,
      profileId: id,
      journeyFlags: updatedFlags,
    };
  });

  // GET /profile/:id/flags - Get journey flags
  app.get<{ Params: { id: string } }>('/:id/flags', async (request, reply) => {
    const { id } = request.params;

    // Verify profile exists
    const [profile] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    if (!profile) {
      throw new NotFoundError(`Profile with id ${id} not found`);
    }

    const flags = await getJourneyFlags(id);

    return {
      profileId: id,
      journeyFlags: flags,
    };
  });

  // POST /profile/:id/increment-counter - Increment a journey counter
  app.post<{ Params: { id: string }; Body: unknown }>(
    '/:id/increment-counter',
    async (request, reply) => {
      const { id } = request.params;
      const parsed = IncrementCounterSchema.safeParse(request.body);

      if (!parsed.success) {
        throw new ValidationError('Invalid request body', { errors: parsed.error.errors });
      }

      const { counterKey, increment } = parsed.data;

      // Verify profile exists
      const [profile] = await db.select().from(users).where(eq(users.id, id)).limit(1);

      if (!profile) {
        throw new NotFoundError(`Profile with id ${id} not found`);
      }

      const newValue = await incrementJourneyCounter(id, counterKey as JourneyFlagKey, increment);

      return {
        success: true,
        profileId: id,
        counterKey,
        newValue,
      };
    }
  );
}
