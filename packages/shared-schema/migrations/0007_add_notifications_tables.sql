-- Migration: Add Notifications Tables
-- Description: Create tables for notifications queue, delivery receipts, quotas, and templates
-- Date: 2025-11-14

-- Notifications Queue Table
CREATE TABLE IF NOT EXISTS "notifications_queue" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" UUID REFERENCES "companies"("id") ON DELETE CASCADE,
  "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
  "type" VARCHAR(50) NOT NULL,
  "channel" VARCHAR(50) NOT NULL,
  "template_id" VARCHAR(100) NOT NULL,
  "recipient" VARCHAR(255) NOT NULL,
  "subject" VARCHAR(255),
  "payload" JSONB NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'queued',
  "scheduled_at" TIMESTAMPTZ,
  "sent_at" TIMESTAMPTZ,
  "failure_reason" TEXT,
  "retry_count" INTEGER DEFAULT 0,
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for notifications_queue
CREATE INDEX IF NOT EXISTS "notifications_queue_status_idx" ON "notifications_queue"("status");
CREATE INDEX IF NOT EXISTS "notifications_queue_scheduled_at_idx" ON "notifications_queue"("scheduled_at");
CREATE INDEX IF NOT EXISTS "notifications_queue_company_id_idx" ON "notifications_queue"("company_id");
CREATE INDEX IF NOT EXISTS "notifications_queue_user_id_idx" ON "notifications_queue"("user_id");
CREATE INDEX IF NOT EXISTS "notifications_queue_type_idx" ON "notifications_queue"("type");

-- Notifications Delivery Receipts Table
CREATE TABLE IF NOT EXISTS "notifications_delivery_receipts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "notification_id" UUID NOT NULL REFERENCES "notifications_queue"("id") ON DELETE CASCADE,
  "event_type" VARCHAR(50) NOT NULL,
  "event_data" JSONB,
  "received_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for notifications_delivery_receipts
CREATE INDEX IF NOT EXISTS "notifications_delivery_receipts_notification_id_idx" ON "notifications_delivery_receipts"("notification_id");
CREATE INDEX IF NOT EXISTS "notifications_delivery_receipts_event_type_idx" ON "notifications_delivery_receipts"("event_type");

-- Notifications Quotas Table
CREATE TABLE IF NOT EXISTS "notifications_quotas" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE UNIQUE,
  "email_daily_limit" INTEGER NOT NULL DEFAULT 1000,
  "email_daily_used" INTEGER NOT NULL DEFAULT 0,
  "sms_daily_limit" INTEGER NOT NULL DEFAULT 100,
  "sms_daily_used" INTEGER NOT NULL DEFAULT 0,
  "push_daily_limit" INTEGER NOT NULL DEFAULT 10000,
  "push_daily_used" INTEGER NOT NULL DEFAULT 0,
  "last_reset_at" TIMESTAMPTZ DEFAULT NOW(),
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for notifications_quotas
CREATE INDEX IF NOT EXISTS "notifications_quotas_company_id_idx" ON "notifications_quotas"("company_id");

-- Notification Templates Table
CREATE TABLE IF NOT EXISTS "notification_templates" (
  "id" VARCHAR(100) PRIMARY KEY,
  "company_id" UUID REFERENCES "companies"("id") ON DELETE CASCADE,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "type" VARCHAR(50) NOT NULL,
  "subject" VARCHAR(255),
  "template_mjml" TEXT,
  "template_html" TEXT,
  "template_text" TEXT,
  "variables" JSONB,
  "active" VARCHAR(10) NOT NULL DEFAULT 'true',
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for notification_templates
CREATE INDEX IF NOT EXISTS "notification_templates_company_id_idx" ON "notification_templates"("company_id");
CREATE INDEX IF NOT EXISTS "notification_templates_type_idx" ON "notification_templates"("type");

-- Comments for documentation
COMMENT ON TABLE "notifications_queue" IS 'Queue for all notifications (email, SMS, push) to be sent';
COMMENT ON TABLE "notifications_delivery_receipts" IS 'Delivery events from notification providers (delivered, opened, clicked, bounced)';
COMMENT ON TABLE "notifications_quotas" IS 'Per-tenant notification quotas and usage tracking';
COMMENT ON TABLE "notification_templates" IS 'Custom notification templates (can override default MJML templates)';

COMMENT ON COLUMN "notifications_queue"."type" IS 'Notification type: email, sms, push';
COMMENT ON COLUMN "notifications_queue"."channel" IS 'Delivery channel: sendgrid, twilio, fcm';
COMMENT ON COLUMN "notifications_queue"."status" IS 'Queue status: queued, sending, sent, failed';
COMMENT ON COLUMN "notifications_delivery_receipts"."event_type" IS 'Event type: delivered, opened, clicked, bounced, spam';
