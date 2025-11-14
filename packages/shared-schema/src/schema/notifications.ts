import { pgTable, uuid, varchar, jsonb, timestamp, index, text, integer } from 'drizzle-orm/pg-core';
import { companies, users } from './users.js';

/**
 * Notifications queue table
 * Stores all notifications to be sent (email, SMS, push)
 */
export const notificationsQueue = pgTable(
  'notifications_queue',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(), // 'email' | 'sms' | 'push'
    channel: varchar('channel', { length: 50 }).notNull(), // 'sendgrid' | 'twilio' | 'fcm'
    templateId: varchar('template_id', { length: 100 }).notNull(),
    recipient: varchar('recipient', { length: 255 }).notNull(), // email address, phone number, or device token
    subject: varchar('subject', { length: 255 }), // for emails
    payload: jsonb('payload').notNull(), // template variables
    status: varchar('status', { length: 20 }).notNull().default('queued'), // 'queued' | 'sending' | 'sent' | 'failed'
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    failureReason: text('failure_reason'),
    retryCount: integer('retry_count').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    statusIdx: index('notifications_queue_status_idx').on(table.status),
    scheduledAtIdx: index('notifications_queue_scheduled_at_idx').on(table.scheduledAt),
    companyIdIdx: index('notifications_queue_company_id_idx').on(table.companyId),
    userIdIdx: index('notifications_queue_user_id_idx').on(table.userId),
    typeIdx: index('notifications_queue_type_idx').on(table.type),
  })
);

/**
 * Notifications delivery receipts table
 * Tracks delivery events from providers (opened, clicked, bounced, etc.)
 */
export const notificationsDeliveryReceipts = pgTable(
  'notifications_delivery_receipts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    notificationId: uuid('notification_id')
      .references(() => notificationsQueue.id, { onDelete: 'cascade' })
      .notNull(),
    eventType: varchar('event_type', { length: 50 }).notNull(), // 'delivered' | 'opened' | 'clicked' | 'bounced' | 'spam'
    eventData: jsonb('event_data'), // Provider-specific event data
    receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    notificationIdIdx: index('notifications_delivery_receipts_notification_id_idx').on(
      table.notificationId
    ),
    eventTypeIdx: index('notifications_delivery_receipts_event_type_idx').on(table.eventType),
  })
);

/**
 * Notifications quota tracking table
 * Tracks per-tenant notification quotas and usage
 */
export const notificationsQuotas = pgTable(
  'notifications_quotas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .references(() => companies.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),
    emailDailyLimit: integer('email_daily_limit').notNull().default(1000),
    emailDailyUsed: integer('email_daily_used').notNull().default(0),
    smsDailyLimit: integer('sms_daily_limit').notNull().default(100),
    smsDailyUsed: integer('sms_daily_used').notNull().default(0),
    pushDailyLimit: integer('push_daily_limit').notNull().default(10000),
    pushDailyUsed: integer('push_daily_used').notNull().default(0),
    lastResetAt: timestamp('last_reset_at', { withTimezone: true }).defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    companyIdIdx: index('notifications_quotas_company_id_idx').on(table.companyId),
  })
);

/**
 * Notification templates table (optional - for storing templates in DB)
 * Can be used to override default MJML templates
 */
export const notificationTemplates = pgTable(
  'notification_templates',
  {
    id: varchar('id', { length: 100 }).primaryKey(), // 'weekly-report', 'alert-slo-breach', etc.
    companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }), // null for system templates
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    type: varchar('type', { length: 50 }).notNull(), // 'email' | 'sms' | 'push'
    subject: varchar('subject', { length: 255 }), // for emails (can use Handlebars variables)
    templateMjml: text('template_mjml'), // MJML template for emails
    templateHtml: text('template_html'), // Compiled HTML (cached)
    templateText: text('template_text'), // Plain text version
    variables: jsonb('variables'), // Required template variables schema
    active: varchar('active', { length: 10 }).notNull().default('true'), // 'true' | 'false'
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    companyIdIdx: index('notification_templates_company_id_idx').on(table.companyId),
    typeIdx: index('notification_templates_type_idx').on(table.type),
  })
);
