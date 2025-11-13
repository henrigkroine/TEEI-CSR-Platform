-- Rollback Migration: Remove idempotency deduplication tables
-- Purpose: Rollback the idempotency tables created in 0004_add_idempotency_tables.sql
-- Date: 2025-11-13
-- WARNING: This will permanently delete all idempotency tracking data

-- Drop API Request Deduplication Table
DROP INDEX IF EXISTS endpoint_idx;
DROP INDEX IF EXISTS expires_at_idx;
DROP INDEX IF EXISTS user_idempotency_idx;
DROP INDEX IF EXISTS idempotency_key_unique_idx;
DROP TABLE IF EXISTS api_request_deduplication;

-- Drop Webhook Delivery Deduplication Table
DROP INDEX IF EXISTS webhook_received_at_idx;
DROP INDEX IF EXISTS retry_count_idx;
DROP INDEX IF EXISTS webhook_source_type_idx;
DROP INDEX IF EXISTS delivery_source_unique_idx;
DROP TABLE IF EXISTS webhook_deduplication;

-- Drop Event Deduplication Table
DROP INDEX IF EXISTS processed_at_idx;
DROP INDEX IF EXISTS failed_events_idx;
DROP INDEX IF EXISTS event_type_consumer_idx;
DROP INDEX IF EXISTS event_consumer_unique_idx;
DROP TABLE IF EXISTS event_deduplication;

-- Verification Query (run after rollback to confirm tables are dropped)
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('event_deduplication', 'webhook_deduplication', 'api_request_deduplication');
-- Expected result: 0 rows
