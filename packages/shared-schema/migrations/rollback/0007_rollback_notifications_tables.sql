-- Rollback Migration: Remove Notifications Tables
-- Description: Drop all notifications-related tables
-- Date: 2025-11-14

-- Drop tables in reverse order (due to foreign key constraints)
DROP TABLE IF EXISTS "notification_templates";
DROP TABLE IF EXISTS "notifications_quotas";
DROP TABLE IF EXISTS "notifications_delivery_receipts";
DROP TABLE IF EXISTS "notifications_queue";
