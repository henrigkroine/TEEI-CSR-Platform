---
id: 22
key: notifications
name: Notifications
category: Platform
status: production
lastReviewed: 2025-01-27
---

# Notifications

## 1. Summary

- Multi-channel notification service for email, SMS, push, and in-app notifications with template management and delivery tracking.
- Features email (SendGrid/Resend or SMTP), SMS (Twilio), Discord webhooks, in-app notifications (SSE), template versioning, locale-aware templates (EN, UK, NO), unsubscribe management, delivery status tracking, and rate limiting (per-user, per-channel).
- Provides queue-based processing with BullMQ, retry logic, and comprehensive delivery tracking.
- Used by all services for user notifications, alerts, and communications.

## 2. Current Status

- Overall status: `production`

- Fully implemented Notifications service (port 3009) with 86% completion and ~7,400 lines of code. Core features include multi-channel notifications (email, SMS, Discord, in-app), template management (Handlebars), delivery tracking & retry logic, user preferences & opt-out management, batching & throttling, webhook handlers for SendGrid and Twilio, template versioning, locale-aware templates (EN, UK, NO), unsubscribe management, and rate limiting (per-user, per-channel). Database tables include `notification_templates`, `notification_queue`, `notification_deliveries`, and `notification_preferences`.

- Service includes 28 files (24 TypeScript, 4 MJML templates). Documentation includes `docs/Notifications_Service.md`, `docs/Notifications_Integration.md`, and `docs/Notifications_Runbook.md` (453 lines).

## 3. What's Next

- Add push notifications (web push, mobile) for real-time alerts.
- Implement Slack integration for team notifications.
- Enhance template library with more notification types.
- Add notification scheduling and recurring notifications.

## 4. Code & Files

Backend / services:
- `services/notifications/` - Notifications service (28 files: 24 *.ts, 4 *.mjml)
- `services/notifications/src/templates/` - Email templates (4 *.mjml)
- `services/notifications/src/routes/` - Notification routes
- `services/notifications/src/lib/` - Notification logic

Frontend / UI:
- `apps/corp-cockpit-astro/src/components/notifications/` - Notification UI (if exists)

Shared / schema / docs:
- `docs/Notifications_Service.md` - Notification service documentation
- `docs/Notifications_Integration.md` - Integration guide
- `docs/Notifications_Runbook.md` - Operations runbook (453 lines)

## 5. Dependencies

Consumes:
- SendGrid for email delivery
- Twilio for SMS delivery
- Firebase Cloud Messaging for push notifications
- Redis for queue management
- NATS for event-driven notifications

Provides:
- Notification delivery for all services
- Template rendering for email/SMS
- Delivery tracking for audit purposes

## 6. Notes

- Multi-channel support enables flexible notification delivery.
- Template versioning allows A/B testing and gradual rollouts.
- Locale-aware templates support multiple languages (EN, UK, NO).
- Rate limiting prevents notification spam and ensures fair usage.
- Delivery tracking provides audit trail for compliance.



