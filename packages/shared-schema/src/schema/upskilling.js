import { pgTable, uuid, varchar, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { programInstances } from './program-instances.js';
export const learningProgress = pgTable('learning_progress', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id),
    provider: varchar('provider', { length: 100 }).notNull(), // ecornell, itslearning, etc.
    courseId: varchar('course_id', { length: 255 }).notNull(),
    courseName: varchar('course_name', { length: 255 }),
    status: varchar('status', { length: 50 }), // enrolled, in_progress, completed, dropped
    progressPercent: integer('progress_percent'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    credentialRef: varchar('credential_ref', { length: 255 }),
    metadata: jsonb('metadata'),
    // SWARM 6: Link to campaign via program instance
    programInstanceId: uuid('program_instance_id').references(() => programInstances.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
//# sourceMappingURL=upskilling.js.map