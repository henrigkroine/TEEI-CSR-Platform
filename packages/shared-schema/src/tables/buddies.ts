import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

export const buddies = pgTable(
  'buddies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    displayName: text('display_name').notNull(),
    role: text('role', { enum: ['mentor', 'mentee'] }).notNull(),
    corporateId: uuid('corporate_id'),
    profileData: jsonb('profile_data'),
    status: text('status', { enum: ['active', 'inactive', 'pending'] })
      .notNull()
      .default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index('buddies_email_idx').on(table.email),
    corporateIdIdx: index('buddies_corporate_id_idx').on(table.corporateId),
    statusIdx: index('buddies_status_idx').on(table.status),
  })
);

export type Buddy = typeof buddies.$inferSelect;
export type InsertBuddy = typeof buddies.$inferInsert;
