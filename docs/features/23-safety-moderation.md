---
id: 23
key: safety-moderation
name: Safety Moderation
category: Platform
status: production
lastReviewed: 2025-01-27
---

# Safety Moderation

## 1. Summary

- Content safety and moderation service for screening user-generated content and ensuring platform safety.
- Features content screening using OpenAI Moderation API, flagging system with auto-flag threshold (0.8), and integration with Q2Q AI for safety checks.
- Provides moderation workflows, safety checks, and content filtering.
- Used by Q2Q AI service and all content ingestion points for safety compliance.

## 2. Current Status

- Overall status: `production`

- Fully implemented Safety Moderation service (port 3006) with 7 TypeScript files. Core features include content moderation using OpenAI Moderation API, flagging system with auto-flag threshold (0.8), and integration with Q2Q AI for safety checks. Q2Q AI includes safety checks in `services/q2q-ai/src/safety/` with prompt shielding and anomaly signal detection. Service is operational with comprehensive safety workflows.

- Documentation includes `services/q2q-ai/SAFETY_IMPLEMENTATION_REPORT.md` and `docs/SWARM6_TYPE_SAFETY.md` for type safety documentation.

## 3. What's Next

- Add manual review queue for flagged content requiring human review.
- Implement appeal process for users to contest moderation decisions.
- Enhance safety checks with more granular content categories.
- Add safety metrics and reporting dashboard.

## 4. Code & Files

Backend / services:
- `services/safety-moderation/` - Safety service (7 *.ts files)
- `services/safety-moderation/src/routes/` - Moderation routes
- `services/safety-moderation/src/lib/` - Moderation logic
- `services/q2q-ai/src/safety/` - Q2Q safety checks
- `services/q2q-ai/src/safety/prompt_shield.ts` - Prompt shielding
- `services/q2q-ai/src/safety/anomaly_signals.ts` - Anomaly detection

Frontend / UI:
- No separate UI (moderation is backend service)

Shared / schema / docs:
- `services/q2q-ai/SAFETY_IMPLEMENTATION_REPORT.md` - Safety implementation report
- `docs/SWARM6_TYPE_SAFETY.md` - Type safety documentation

## 5. Dependencies

Consumes:
- OpenAI Moderation API for content screening
- Q2Q AI for feedback analysis
- Database for flag storage

Provides:
- Safety checks for Q2Q AI Engine
- Content screening for all user-generated content
- Moderation workflows for platform safety

## 6. Notes

- Content moderation uses OpenAI Moderation API for automated screening.
- Auto-flag threshold (0.8) automatically flags potentially unsafe content.
- Integration with Q2Q AI ensures feedback is screened before processing.
- Prompt shielding protects against prompt injection attacks.
- Anomaly signal detection identifies unusual content patterns.



