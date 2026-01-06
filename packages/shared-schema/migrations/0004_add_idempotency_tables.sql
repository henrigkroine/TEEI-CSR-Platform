-- Migration: Add idempotency deduplication tables
-- Purpose: Enable exactly-once event processing and API idempotency
-- Date: 2025-11-13

-- Event Deduplication Table
CREATE TABLE IF NOT EXISTS event_deduplication (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(255) NOT NULL,
  consumer_id VARCHAR(255) NOT NULL,
  processed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  metadata TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Unique constraint: each consumer processes each event exactly once
CREATE UNIQUE INDEX event_consumer_unique_idx ON event_deduplication(event_id, consumer_id);

-- Index for querying by event type and consumer
CREATE INDEX event_type_consumer_idx ON event_deduplication(event_type, consumer_id);

-- Index for querying failed events
CREATE INDEX failed_events_idx ON event_deduplication(success, processed_at);

-- Index for cleanup queries
CREATE INDEX processed_at_idx ON event_deduplication(processed_at);

-- Webhook Delivery Deduplication Table
CREATE TABLE IF NOT EXISTS webhook_deduplication (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id VARCHAR(255) NOT NULL,
  webhook_source VARCHAR(100) NOT NULL,
  webhook_type VARCHAR(255) NOT NULL,
  received_at TIMESTAMP NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP,
  success BOOLEAN NOT NULL DEFAULT true,
  status_code VARCHAR(10) NOT NULL DEFAULT '200',
  error_message TEXT,
  retry_count VARCHAR(10) NOT NULL DEFAULT '0',
  payload TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Unique constraint: each delivery is processed exactly once per source
CREATE UNIQUE INDEX delivery_source_unique_idx ON webhook_deduplication(delivery_id, webhook_source);

-- Index for querying by webhook source and type
CREATE INDEX webhook_source_type_idx ON webhook_deduplication(webhook_source, webhook_type);

-- Index for monitoring retry patterns
CREATE INDEX retry_count_idx ON webhook_deduplication(retry_count, received_at);

-- Index for cleanup queries
CREATE INDEX webhook_received_at_idx ON webhook_deduplication(received_at);

-- API Request Deduplication Table
CREATE TABLE IF NOT EXISTS api_request_deduplication (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key VARCHAR(255) NOT NULL,
  user_id UUID,
  endpoint VARCHAR(500) NOT NULL,
  method VARCHAR(10) NOT NULL,
  requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  status_code VARCHAR(10) NOT NULL,
  response_body TEXT,
  error_message TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Unique constraint on idempotency key
CREATE UNIQUE INDEX idempotency_key_unique_idx ON api_request_deduplication(idempotency_key);

-- Index for user-scoped queries
CREATE INDEX user_idempotency_idx ON api_request_deduplication(user_id, idempotency_key);

-- Index for cleanup of expired keys
CREATE INDEX expires_at_idx ON api_request_deduplication(expires_at);

-- Index for monitoring by endpoint
CREATE INDEX endpoint_idx ON api_request_deduplication(endpoint, requested_at);

-- Comments
COMMENT ON TABLE event_deduplication IS 'Tracks processed NATS events to prevent duplicate processing';
COMMENT ON TABLE webhook_deduplication IS 'Tracks webhook deliveries to handle retries idempotently';
COMMENT ON TABLE api_request_deduplication IS 'Tracks idempotency keys for API requests';

COMMENT ON COLUMN event_deduplication.event_id IS 'Unique event identifier from NATS message';
COMMENT ON COLUMN event_deduplication.consumer_id IS 'Service or subscriber identifier';
COMMENT ON COLUMN webhook_deduplication.delivery_id IS 'Delivery ID from webhook provider';
COMMENT ON COLUMN webhook_deduplication.webhook_source IS 'Source system: kintell, upskilling, etc.';
COMMENT ON COLUMN api_request_deduplication.idempotency_key IS 'Client-provided idempotency key from header';
COMMENT ON COLUMN api_request_deduplication.expires_at IS 'TTL for cleanup (typically 24 hours)';
