import { pgTable, uuid, varchar, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  role: varchar('role', { length: 50 }).notNull(), // admin, company_user, participant, volunteer
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  industry: varchar('industry', { length: 100 }),
  country: varchar('country', { length: 100 }),
  features: jsonb('features'), // Feature flags: { impactIn: { benevity: true, goodera: false, workday: true } }
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const companyUsers = pgTable('company_users', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
});

export const programEnrollments = pgTable('program_enrollments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  programType: varchar('program_type', { length: 50 }).notNull(), // buddy, language, mentorship, upskilling
  enrolledAt: timestamp('enrolled_at', { withTimezone: true }).defaultNow().notNull(),
  status: varchar('status', { length: 50 }).notNull().default('active'), // active, completed, dropped
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

// External ID mapping for surrogate keys
export const externalIdMappings = pgTable('external_id_mappings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  externalSystem: varchar('external_system', { length: 50 }).notNull(), // kintell, discord, buddy, etc.
  externalId: varchar('external_id', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
