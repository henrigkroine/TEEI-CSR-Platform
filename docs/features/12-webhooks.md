---
id: 12
key: webhooks
name: Webhooks
category: Integration
status: production
lastReviewed: 2025-01-27
---

# Webhooks

## 1. Summary

- Outbound webhook notification system for event-driven integrations with external systems.
- Features webhook delivery with retry logic, event publishing, delivery tracking, and signature verification.
- Includes webhook endpoint for inbound updates from external platforms with HMAC signature validation.
- Used by external systems to receive real-time updates about platform events and by internal services for event-driven workflows.

## 2. Current Status

- Overall status: `production`

- Fully implemented webhook functionality in Notifications service (port 3009) with 86% completion and ~7,400 lines of code. Core features include multi-channel notifications (email, SMS, Discord, in-app), template management (Handlebars), delivery tracking & retry logic, user preferences & opt-out management, batching & throttling, and webhook handlers for SendGrid and Twilio. Impact-In service includes webhook routes (256 lines) for inbound webhook ingestion with HMAC signature verification.

- Webhook test fixtures exist in `tests/fixtures/webhooks/`. Documentation includes `docs/Notifications_Integration.md` and `docs/Notifications_Runbook.md` (453 lines). Service includes delivery status tracking, rate limiting (per-user, per-channel), and unsubscribe management.

## 3. What's Next

- Add webhook signature verification for all outbound webhooks.
- Implement webhook replay functionality for failed deliveries.
- Add webhook subscription management UI in Corporate Cockpit.
- Enhance webhook delivery monitoring with alerting for failures.

## 4. Code & Files

Backend / services:
- `services/notifications/` - Notifications service (28 files)
- `services/notifications/src/templates/` - Email templates (4 *.mjml)
- `services/impact-in/src/routes/webhooks.ts` - Webhook routes (256 lines)
- `tests/fixtures/webhooks/` - Webhook test fixtures

Frontend / UI:
- `apps/corp-cockpit-astro/src/components/notifications/` - Notification UI (if exists)

Shared / schema / docs:
- `docs/Notifications_Integration.md` - Webhook documentation
- `docs/Notifications_Service.md` - Notification service docs
- `docs/Notifications_Runbook.md` - Operations runbook (453 lines)

## 5. Dependencies

Consumes:
- NATS for event publishing
- Redis for queue management
- SendGrid for email delivery
- Twilio for SMS delivery
- External webhook endpoints for outbound delivery

Provides:
- Webhook events consumed by external systems
- Inbound webhook data for Impact-In service
- Event notifications for Notifications service

## 6. Notes

- Webhook delivery includes retry logic with exponential backoff.
- HMAC signature verification ensures webhook authenticity.
- Delivery tracking provides audit trail for compliance.
- Rate limiting prevents webhook spam and ensures fair usage.
- Webhook test fixtures enable reliable testing of webhook integrations.



