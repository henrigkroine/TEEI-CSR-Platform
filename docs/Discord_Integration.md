# Discord Integration Documentation

**Version**: 1.0.0
**Last Updated**: 2025-11-13

## Overview

The TEEI Discord bot enables volunteers to submit feedback directly from Discord and allows admins to recognize outstanding volunteers. Feedback is processed by the Q2Q AI engine and converted into quantitative insights.

## Features

### 1. `/feedback` Command

Volunteers can submit feedback about their volunteering experience.

**Usage**:
```
/feedback message:"The language session was great!" sentiment:positive
```

**Parameters**:
- `message` (required): Feedback text (10-500 characters)
- `sentiment` (optional): positive, neutral, or negative

**Flow**:
1. Volunteer submits feedback via Discord
2. Bot sends confirmation DM with embed
3. Feedback posted to Q2Q processing endpoint
4. Q2Q AI converts qualitative feedback to quantitative scores
5. Results appear in Corporate Cockpit Q2Q feed

### 2. `/recognize` Command

Admins can recognize volunteers for outstanding contributions.

**Usage**:
```
/recognize volunteer:@JohnDoe achievement:"Completed 50 hours of language mentoring" badge:high_impact
```

**Parameters**:
- `volunteer` (required): Discord user to recognize
- `achievement` (required): Description of accomplishment (10-200 characters)
- `badge` (optional): Recognition level (emerging, contributing, high_impact, exceptional)

**Recognition Levels**:
- ⭐ **Emerging**: 0-25 VIS score
- 🌟 **Contributing**: 26-50 VIS score
- ✨ **High Impact**: 51-75 VIS score
- 🏆 **Exceptional**: 76-100 VIS score

**Permissions**: Requires `Manage Roles` permission

### 3. Milestone Webhooks

Automated notifications when companies reach milestones.

**Supported Milestones**:
- **Hours**: Every 100 hours (100, 200, 300, etc.)
- **SROI**: Each integer ratio (2:1, 3:1, 4:1, etc.)
- **Volunteers**: Every 10 volunteers (10, 20, 30, etc.)

**Configuration**:
```typescript
const webhook = new MilestoneWebhook(process.env.DISCORD_WEBHOOK_URL);

// Trigger milestone
await webhook.sendHoursMilestone('ACME Corp', 500);
await webhook.sendSROIMilestone('ACME Corp', 3.42);
```

## Setup

### Prerequisites

1. Discord bot application (create at https://discord.com/developers/applications)
2. Bot token
3. Client ID
4. Guild (server) ID

### Bot Permissions

Required permissions:
- Send Messages
- Embed Links
- Use Slash Commands
- Read Message History
- Manage Roles (for `/recognize`)

### Environment Variables

```bash
# .env
DISCORD_BOT_TOKEN=your-bot-token-here
DISCORD_CLIENT_ID=your-client-id-here
DISCORD_GUILD_ID=your-server-id-here
REPORTING_SERVICE_URL=http://localhost:3018
ENABLE_DISCORD_WEBHOOKS=true
```

### Running the Bot

```bash
# Development
pnpm --filter @teei/discord-bot dev

# Production
pnpm --filter @teei/discord-bot build
pnpm --filter @teei/discord-bot start
```

## Integration with Q2Q Pipeline

```
Discord /feedback
       ↓
Q2Q Processing Endpoint
       ↓
NLP Analysis (sentiment, dimensions)
       ↓
Store in q2q_insights table
       ↓
Display in Corporate Cockpit
```

**Q2Q Endpoint** (stub):
```typescript
POST /q2q/feedback
{
  "userId": "discord-user-id",
  "username": "JohnDoe",
  "feedbackText": "The session was amazing!",
  "sentiment": "positive"
}
```

**Processing**:
1. Extract key phrases (e.g., "session", "amazing")
2. Analyze sentiment (positive/neutral/negative)
3. Map to outcome dimensions (integration, language, job_readiness)
4. Generate confidence score (0-1)
5. Create evidence lineage link to original feedback

## Role Assignment (Future)

Automatically assign Discord roles based on VIS scores:

```typescript
if (visScore >= 76) {
  member.roles.add(exceptionalRole);
} else if (visScore >= 51) {
  member.roles.add(highImpactRole);
} else if (visScore >= 26) {
  member.roles.add(contributingRole);
} else {
  member.roles.add(emergingRole);
}
```

## Error Handling

- Invalid commands → Ephemeral error message
- Missing permissions → Permission denied message
- Q2Q endpoint down → Fallback to local logging
- Webhook failure → Log and continue

## Rate Limiting

- Discord API: 50 requests per second (global)
- Slash commands: No rate limit (user-initiated)
- Webhooks: 5 per second per webhook

## Security

- Bot token stored as environment variable
- Never committed to git
- Ephemeral replies for sensitive info
- Permission checks for admin commands

## Future Enhancements

- [ ] Scheduled feedback prompts (weekly DMs)
- [ ] Volunteer leaderboard embed (real-time)
- [ ] Integration with voice channels (session tracking)
- [ ] Reaction-based feedback (👍👎)
- [ ] Multi-language support (i18n)

## Troubleshooting

### Bot not responding
- Check bot token is valid
- Ensure bot has correct permissions
- Verify bot is online in Discord

### Commands not appearing
- Re-run command deployment: `pnpm --filter @teei/discord-bot deploy-commands`
- Check client ID and guild ID are correct

### Feedback not reaching Q2Q
- Verify `REPORTING_SERVICE_URL` is correct
- Check Q2Q endpoint is running
- Review bot logs for errors

## Contact

For Discord integration support:
- **Technical**: Integration Team Lead (Worker 3)
- **Community**: Discord Server Admins

---

**Last Review**: 2025-11-13
**Next Review**: After first production deployment
