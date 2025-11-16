/**
 * Partner Apps Schema
 * Slack, Teams, and other third-party app integrations
 */

import { pgTable, uuid, varchar, timestamp, jsonb, pgEnum, text, index, boolean, integer } from 'drizzle-orm/pg-core';
import { companies, users } from './users.js';

// Enums
export const partnerAppTypeEnum = pgEnum('partner_app_type', ['slack', 'teams', 'discord', 'webhook']);
export const installStatusEnum = pgEnum('install_status', ['active', 'suspended', 'revoked', 'expired']);
export const alertChannelTypeEnum = pgEnum('alert_channel_type', [
  'delivery_failures',
  'dsar_updates',
  'budget_alerts',
  'report_approvals',
  'compliance_alerts'
]);

/**
 * Partner App Installations - OAuth installations per company
 */
export const partnerAppInstalls = pgTable('partner_app_installs', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),

  // App details
  appType: partnerAppTypeEnum('app_type').notNull(),
  appName: varchar('app_name', { length: 255 }),

  // Installation status
  status: installStatusEnum('status').notNull().default('active'),

  // OAuth tokens (encrypted at rest)
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  tokenType: varchar('token_type', { length: 50 }).default('Bearer'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),

  // Scopes granted
  scopes: jsonb('scopes').$type<string[]>(),

  // Workspace/Team details
  workspaceId: varchar('workspace_id', { length: 255 }),
  workspaceName: varchar('workspace_name', { length: 255 }),
  teamId: varchar('team_id', { length: 255 }),
  teamName: varchar('team_name', { length: 255 }),

  // Installer details
  installedBy: uuid('installed_by').references(() => users.id),
  installerUserId: varchar('installer_user_id', { length: 255 }), // External user ID (Slack/Teams)

  // Webhook verification
  webhookSecret: varchar('webhook_secret', { length: 255 }),

  // Revocation
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  revokedBy: uuid('revoked_by').references(() => users.id),
  revokeReason: text('revoke_reason'),

  // Metadata
  metadata: jsonb('metadata').default({}).$type<{
    botUserId?: string;
    botAccessToken?: string;
    incomingWebhook?: {
      url: string;
      channel: string;
      channelId: string;
      configurationUrl?: string;
    };
  }>(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyIdIdx: index('partner_app_installs_company_id_idx').on(table.companyId),
  appTypeIdx: index('partner_app_installs_app_type_idx').on(table.appType),
  statusIdx: index('partner_app_installs_status_idx').on(table.status),
  workspaceIdIdx: index('partner_app_installs_workspace_id_idx').on(table.workspaceId),
}));

/**
 * Alert Subscriptions - Configure which alerts go to which channels
 */
export const alertSubscriptions = pgTable('alert_subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  installId: uuid('install_id').notNull().references(() => partnerAppInstalls.id, { onDelete: 'cascade' }),

  // Alert configuration
  alertType: alertChannelTypeEnum('alert_type').notNull(),
  enabled: boolean('enabled').default(true),

  // Channel routing (Slack/Teams specific)
  channelId: varchar('channel_id', { length: 255 }),
  channelName: varchar('channel_name', { length: 255 }),
  threadId: varchar('thread_id', { length: 255 }),

  // Filters (optional conditions for when to send)
  filters: jsonb('filters').$type<{
    minSeverity?: 'info' | 'warning' | 'critical';
    tags?: string[];
    excludePatterns?: string[];
  }>(),

  // Rate limiting
  maxAlertsPerHour: integer('max_alerts_per_hour'),
  lastAlertSentAt: timestamp('last_alert_sent_at', { withTimezone: true }),

  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyAlertTypeIdx: index('alert_subscriptions_company_alert_type_idx')
    .on(table.companyId, table.alertType),
  installIdIdx: index('alert_subscriptions_install_id_idx').on(table.installId),
  enabledIdx: index('alert_subscriptions_enabled_idx').on(table.enabled),
}));

/**
 * Shared Reports - Reports shared via partner apps
 */
export const sharedReports = pgTable('shared_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  installId: uuid('install_id').notNull().references(() => partnerAppInstalls.id, { onDelete: 'cascade' }),

  // Report details
  reportId: uuid('report_id').notNull(),
  reportTitle: varchar('report_title', { length: 500 }),
  reportType: varchar('report_type', { length: 100 }),

  // Share details
  sharedBy: uuid('shared_by').notNull().references(() => users.id),
  sharedTo: varchar('shared_to', { length: 255 }), // Channel ID or user ID

  // Platform-specific message IDs
  messageId: varchar('message_id', { length: 255 }),
  threadId: varchar('thread_id', { length: 255 }),
  permalink: text('permalink'),

  // Access control
  watermarked: boolean('watermarked').default(true),
  accessToken: varchar('access_token', { length: 100 }).unique(), // For authenticated viewing

  // Expiration
  expiresAt: timestamp('expires_at', { withTimezone: true }),

  // View tracking
  viewCount: integer('view_count').default(0),
  lastViewedAt: timestamp('last_viewed_at', { withTimezone: true }),

  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyIdIdx: index('shared_reports_company_id_idx').on(table.companyId),
  installIdIdx: index('shared_reports_install_id_idx').on(table.installId),
  reportIdIdx: index('shared_reports_report_id_idx').on(table.reportId),
  accessTokenIdx: index('shared_reports_access_token_idx').on(table.accessToken),
  expiresAtIdx: index('shared_reports_expires_at_idx').on(table.expiresAt),
}));

/**
 * Partner App Events - Audit log for partner app interactions
 */
export const partnerAppEvents = pgTable('partner_app_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  installId: uuid('install_id').references(() => partnerAppInstalls.id, { onDelete: 'cascade' }),

  // Event details
  eventType: varchar('event_type', { length: 100 }).notNull(),
  eventSource: varchar('event_source', { length: 50 }).notNull(), // 'slack', 'teams', 'internal'

  // User/actor
  userId: uuid('user_id').references(() => users.id),
  externalUserId: varchar('external_user_id', { length: 255 }),

  // Event payload
  payload: jsonb('payload').notNull(),

  // Request verification
  requestSignature: varchar('request_signature', { length: 255 }),
  requestTimestamp: timestamp('request_timestamp', { withTimezone: true }),
  verified: boolean('verified').default(false),

  // Response
  responseStatus: integer('response_status'),
  responseTime: integer('response_time'), // milliseconds
  error: text('error'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyIdIdx: index('partner_app_events_company_id_idx').on(table.companyId),
  installIdIdx: index('partner_app_events_install_id_idx').on(table.installId),
  eventTypeIdx: index('partner_app_events_event_type_idx').on(table.eventType),
  createdAtIdx: index('partner_app_events_created_at_idx').on(table.createdAt),
}));

/**
 * Slack Channels - Cached Slack channel metadata
 */
export const slackChannels = pgTable('slack_channels', {
  id: uuid('id').defaultRandom().primaryKey(),
  installId: uuid('install_id').notNull().references(() => partnerAppInstalls.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),

  // Channel details
  channelId: varchar('channel_id', { length: 255 }).notNull(),
  channelName: varchar('channel_name', { length: 255 }).notNull(),
  channelType: varchar('channel_type', { length: 50 }), // 'public', 'private', 'im', 'mpim'

  // Webhook URL (if configured)
  webhookUrl: text('webhook_url'),

  // Status
  isArchived: boolean('is_archived').default(false),
  isMember: boolean('is_member').default(false),
  enabled: boolean('enabled').default(true),

  // Sync
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),

  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  installChannelIdx: index('slack_channels_install_channel_idx').on(table.installId, table.channelId),
  companyIdIdx: index('slack_channels_company_id_idx').on(table.companyId),
}));
