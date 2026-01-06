---
id: 11
key: discord-integration
name: Discord Integration
category: Integration
status: production
lastReviewed: 2025-01-27
---

# Discord Integration

## 1. Summary

- Discord bot service for community engagement, feedback collection, and volunteer recognition.
- Features slash commands (/feedback, /recognize, /milestones, /stats), role-based permissions, emoji reactions, and embedded rich cards.
- Integrates with Q2Q AI engine for feedback analysis and Corporate Cockpit for milestone celebrations.
- Used by volunteers and admins for community engagement and feedback submission.

## 2. Current Status

- Overall status: `production`

- Fully implemented Discord bot service (port 3013) with ~3,200 lines of code and 79% completion. Core features include Discord.js v14 integration, slash commands (/feedback, /milestones, /stats), role-based permissions, emoji reactions for quick feedback, embedded rich cards for milestones and reports, feedback collection via Discord, buddy match notifications, milestone celebrations, and admin alerts (errors, SLA breaches). Service includes integration with Q2Q processing endpoint for feedback analysis.

- Documentation includes `docs/Discord_Integration.md` (161 lines) and `docs/Discord_Usage_Guide.md` with setup instructions, bot permissions, and integration flow. Service is production-ready with comprehensive error handling.

## 3. What's Next

- Add interactive buttons for approve/reject actions in feedback workflow.
- Implement scheduled digest messages for weekly summaries.
- Add multi-server support (currently single server only).
- Enhance integration with Q2Q AI for real-time feedback analysis.

## 4. Code & Files

Backend / services:
- `services/discord-bot/` - Discord bot service (9 TypeScript files)
- `services/discord-bot/src/commands/feedback.ts` - Feedback command handler
- `services/discord-bot/src/commands/recognize.ts` - Recognition command handler
- `services/discord-bot/src/webhooks/milestones.ts` - Milestone webhook handler

Frontend / UI:
- Discord bot interface (no separate UI, uses Discord client)

Shared / schema / docs:
- `docs/Discord_Integration.md` - Discord integration documentation (161 lines)
- `docs/Discord_Usage_Guide.md` - Usage guide

## 5. Dependencies

Consumes:
- Discord API via Discord.js library
- Q2Q AI service for feedback analysis
- Reporting Service for milestone data
- Corporate Cockpit for volunteer recognition

Provides:
- Feedback data consumed by Q2Q AI engine
- Milestone notifications for community engagement
- Volunteer recognition events for Corporate Cockpit

## 6. Notes

- Discord bot enables volunteers to submit feedback directly from Discord.
- Feedback is processed by Q2Q AI engine and converted into quantitative insights.
- Recognition levels are based on VIS scores (Emerging 0-25, Contributing 26-50, High Impact 51-75, Exceptional 76-100).
- Milestone webhooks support hours (every 100), SROI (each integer ratio), and volunteers (every 10).
- Future: Automatic role assignment based on VIS scores.



