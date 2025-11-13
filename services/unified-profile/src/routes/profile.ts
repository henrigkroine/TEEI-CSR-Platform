import type { FastifyInstance } from 'fastify';
import { db, users, externalIdMappings, programEnrollments } from '@teei/shared-schema';
import { eq, and } from 'drizzle-orm';
import { NotFoundError, ValidationError } from '@teei/shared-utils';
import { z } from 'zod';

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
}
