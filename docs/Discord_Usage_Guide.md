# Discord Bot Usage Guide

## Overview

The TEEI Discord Bot enhances volunteer engagement and impact tracking by integrating Discord communities with the TEEI platform. Features include:

- **Feedback Collection**: Volunteers submit feedback that feeds into Q2Q AI for qualitative insights
- **Volunteer Recognition**: Admins recognize volunteers, assign roles, and update VIS scores
- **Impact Tracking**: All interactions contribute to impact metrics and reporting

---

## Commands

### `/feedback` - Submit Feedback (Everyone)

Allows volunteers to share their experience, which is processed by the Q2Q AI engine to generate qualitative-to-quantitative insights.

**Usage:**
```
/feedback message:"Your feedback here" sentiment:positive
```

**Parameters:**
- `message` (required): Your feedback (10-500 characters)
- `sentiment` (optional): Overall sentiment
  - `positive` 😊
  - `neutral` 😐
  - `negative` 😞

**Example:**
```
/feedback message:"The volunteering event was well-organized and impactful. I felt my contribution made a difference." sentiment:positive
```

**What happens:**
1. Your feedback is submitted to the Q2Q AI service
2. Natural language processing extracts key themes and sentiments
3. Data is converted to quantitative metrics (confidence, belonging, impact)
4. Evidence snippets are stored with provenance tracking
5. You receive a confirmation DM with a tracking ID

**Privacy:**
- Feedback is anonymized before processing
- No personally identifiable information (PII) is stored without consent
- You can request deletion at any time (GDPR right to erasure)

---

### `/recognize` - Recognize a Volunteer (Admins Only)

Recognize volunteers for their contributions, assign achievement roles, and update their Volunteer Impact Score (VIS).

**Usage:**
```
/recognize volunteer:@username achievement:"What they did" badge:high_impact
```

**Parameters:**
- `volunteer` (required): The volunteer to recognize (@mention)
- `achievement` (required): Description of what they accomplished (10-200 characters)
- `badge` (optional): Recognition level (default: contributing)
  - ⭐ `emerging` - New volunteers showing promise
  - 🌟 `contributing` - Consistent contributors
  - ✨ `high_impact` - Volunteers making significant difference
  - 🏆 `exceptional` - Top-tier volunteers with exceptional dedication

**Example:**
```
/recognize volunteer:@JohnDoe achievement:"Led 5 volunteer events this month, coordinating 50+ volunteers with exceptional organization" badge:high_impact
```

**What happens:**
1. **Role Assignment**: Volunteer receives the corresponding Discord role
   - Previous recognition roles are automatically removed
   - Role is displayed separately in the member list (hoisted)
   - Role hierarchy prevents demotions (can only promote)
2. **VIS Score Update**: Volunteer's VIS score is increased
   - Emerging: +5 points
   - Contributing: +10 points
   - High Impact: +20 points
   - Exceptional: +50 points
3. **Public Recognition**: Posted in the channel where command was used
4. **Private DM**: Volunteer receives a congratulatory DM with details
5. **Impact Reporting**: Recognition is logged for impact metrics

**Admin Requirements:**
- Must have "Manage Roles" permission
- Command is only visible to admins

---

### `/help` - Get Help (Everyone)

Display available commands and usage instructions.

**Usage:**
```
/help
```

Shows:
- Command list with descriptions
- Role-specific features (different for volunteers vs admins)
- Links to documentation and support

---

## VIS (Volunteer Impact Score)

### What is VIS?

VIS measures volunteer engagement, consistency, and impact. It's used in:
- Impact reporting and metrics
- Recognition and leaderboards
- Demonstrating volunteer contributions to stakeholders

### How to Increase Your VIS

**Through Recognition:**
- Emerging: +5 points
- Contributing: +10 points
- High Impact: +20 points
- Exceptional: +50 points

**Through Feedback:**
- Submitting feedback: +1 point per submission
- High-quality feedback (detailed, actionable): +2 points

### VIS Milestones

| Score | Milestone | Emoji |
|-------|-----------|-------|
| 10 | First Steps | 👣 |
| 25 | Getting Started | 🌱 |
| 50 | Committed Volunteer | 💪 |
| 100 | Impact Maker | ⭐ |
| 200 | Community Champion | 🏆 |
| 500 | Legend | 👑 |

### Viewing Your VIS

Your current VIS score is displayed:
- In recognition notifications
- In your Discord profile (via bot commands)
- In the TEEI platform dashboard

---

## Q2Q (Qualitative-to-Quantitative) Integration

### How Feedback is Processed

1. **Submission**: Feedback submitted via `/feedback`
2. **Preprocessing**: Text is cleaned, tokenized, and anonymized
3. **NLP Analysis**: Natural language processing extracts:
   - Sentiment (positive, neutral, negative)
   - Key themes (confidence, belonging, impact, skills)
   - Actionable insights
4. **Quantification**: Qualitative feedback is converted to metrics:
   - Confidence score (0-100)
   - Belonging score (0-100)
   - Impact perception score (0-100)
   - Language proficiency proxy (for language learning programs)
   - Job readiness proxy (for upskilling programs)
5. **Evidence Lineage**: Original feedback is stored as evidence
   - Hashed for integrity verification
   - Linked to derived metrics (provenance tracking)
   - Available in evidence explorer in cockpit

### What Makes Good Feedback?

**Good feedback is:**
- **Specific**: "The mentor helped me improve my resume" vs. "It was good"
- **Actionable**: "More sessions on interview skills would be helpful"
- **Honest**: Share both positive experiences and areas for improvement
- **Contextual**: Mention the program, event, or activity

**Examples:**

✅ Good:
> "The buddy program matched me with someone who really understood my career goals. Our weekly check-ins helped me gain confidence in networking. I'd love more resources on LinkedIn optimization."

❌ Too vague:
> "It was okay"

---

## Admin Features

### Recognition Best Practices

**When to recognize:**
- After significant contributions or milestones
- Consistently, not just for exceptional cases
- Promptly, while the achievement is recent

**How to write achievements:**
- Be specific about what they did
- Mention impact (e.g., "coordinated 50+ volunteers")
- Acknowledge effort and dedication
- Keep it positive and encouraging

**Badge level guidelines:**
- **Emerging** (⭐): First meaningful contribution, showing promise
- **Contributing** (🌟): Regular participation, reliable volunteer
- **High Impact** (✨): Leading initiatives, significant measurable impact
- **Exceptional** (🏆): Extraordinary dedication, transformative contributions

### Role Management

**Automatic role creation:**
- Recognition roles are auto-created if they don't exist
- Roles are color-coded:
  - Emerging: Yellow (#fbbf24)
  - Contributing: Blue (#3b82f6)
  - High Impact: Purple (#8b5cf6)
  - Exceptional: Red (#ef4444)
- Roles are hoisted (displayed separately in member list)

**Manual setup** (optional):
- Roles can be pre-created with custom colors
- Bot will use existing roles if names match exactly
- Role names must match: "Emerging Volunteer", "Contributing Volunteer", etc.

### Viewing Recognition Stats

Use the TEEI platform Corporate Cockpit to view:
- Recognition history per volunteer
- VIS leaderboard
- Engagement trends
- Impact metrics derived from Discord activity

---

## Setup & Configuration

### Bot Installation

1. **Invite Bot to Server**
   - Use invite link provided by platform admin
   - Grant required permissions:
     - Read Messages/View Channels
     - Send Messages
     - Embed Links
     - Manage Roles
     - Use Slash Commands

2. **Environment Variables** (Admin)
   ```bash
   DISCORD_BOT_TOKEN=your-bot-token
   DISCORD_APPLICATION_ID=your-app-id
   REPORTING_SERVICE_URL=http://localhost:3019
   REPORTING_SERVICE_API_KEY=your-api-key
   ```

3. **Deploy Commands**
   ```bash
   cd services/discord-bot
   npm run deploy-commands
   ```

### Permissions Setup

**Required bot permissions:**
- `Send Messages`: Post recognition announcements
- `Embed Links`: Rich embeds for feedback/recognition
- `Manage Roles`: Assign recognition roles
- `Use Slash Commands`: Register and use slash commands

**Required admin permissions:**
- `Manage Roles`: Use `/recognize` command
- Users without this permission won't see admin commands

---

## Integration with Platform

### Data Flow

**Feedback → Q2Q:**
```
Discord /feedback → Q2Q AI Service → Evidence DB → Corporate Cockpit
```

**Recognition → VIS:**
```
Discord /recognize → Reporting Service → VIS Update → Corporate Cockpit
```

**Webhooks:**
- Milestone achievements trigger Discord announcements
- Weekly report summaries posted to designated channel
- SLO breaches alert admin channels

### API Endpoints

The bot communicates with:

**Q2Q AI Service:**
- `POST /q2q/feedback` - Submit volunteer feedback
- Payload:
  ```json
  {
    "userId": "discord-user-id",
    "username": "discord-username",
    "feedbackText": "feedback content",
    "sentiment": "positive",
    "source": "discord"
  }
  ```

**Reporting Service:**
- `POST /api/vis-update` - Update VIS score
- Payload:
  ```json
  {
    "userId": "discord-user-id",
    "discordUsername": "username",
    "badgeLevel": "high_impact",
    "achievement": "achievement description",
    "recognizedBy": "admin-username",
    "visIncrement": 20,
    "timestamp": "2025-11-14T12:00:00Z",
    "source": "discord_recognition"
  }
  ```

---

## Troubleshooting

### Bot not responding

1. Check bot is online (green status)
2. Verify bot has required permissions
3. Check bot token is valid
4. Review bot logs for errors

### Slash commands not showing

1. Wait 5-10 minutes after bot invite (Discord sync delay)
2. Check bot has "Use Slash Commands" permission
3. Redeploy commands: `npm run deploy-commands`
4. Try in a different channel
5. Kick and re-invite bot

### Recognition role not assigned

1. Verify bot has "Manage Roles" permission
2. Check bot role is higher than recognition roles in hierarchy
3. Ensure role names match exactly (case-sensitive)
4. Review bot logs for error messages

### VIS score not updating

1. Check Reporting Service URL is correct
2. Verify API key is set and valid
3. Check Reporting Service is running
4. Review bot logs and Reporting Service logs

### Feedback not reaching Q2Q

1. Verify Q2Q AI Service is running
2. Check Q2Q service URL is correct
3. Review Q2Q service logs
4. Test API endpoint manually

---

## Privacy & Security

### Data Collected

**Feedback:**
- Discord user ID (hashed for anonymization)
- Discord username (optional, can be pseudonymized)
- Feedback text
- Sentiment
- Timestamp
- Source (Discord)

**Recognition:**
- Volunteer Discord user ID
- Volunteer username
- Achievement description
- Badge level
- Recognized by (admin username)
- Timestamp

### GDPR Compliance

- **Right to Access**: Users can request their data via platform
- **Right to Erasure**: Users can request deletion
- **Right to Portability**: Data exported as JSON
- **Consent**: Users opt-in via Discord interaction
- **Anonymization**: PII is pseudonymized in analytics

### Security Measures

- Discord bot token stored securely (environment variables)
- API keys never committed to code
- All API calls use HTTPS
- Rate limiting prevents abuse
- Admin commands require role verification
- Webhook signatures validated

---

## FAQ

**Q: Can I delete my feedback after submitting?**
A: Yes, contact your program coordinator or use the platform's data deletion feature. Under GDPR, you have the right to erasure.

**Q: Does feedback need to be positive?**
A: No! Honest feedback (both positive and constructive) is valuable for improving programs. Negative feedback is welcomed and helps us improve.

**Q: How is my feedback anonymized?**
A: Your Discord user ID is hashed, and personally identifiable information is removed before analysis. Aggregated insights are used, not individual quotes (unless you explicitly consent).

**Q: Can I see my VIS score?**
A: Yes, log in to the TEEI platform Corporate Cockpit or ask your program coordinator.

**Q: What if I disagree with a recognition level?**
A: Recognition levels can be adjusted. Contact your program coordinator if you believe there's an error.

**Q: Can volunteers recognize each other?**
A: Currently, only admins with "Manage Roles" permission can use `/recognize`. Peer recognition is planned for a future update.

**Q: What happens if I leave the Discord server?**
A: Your recognition data and VIS score are preserved in the platform database. If you rejoin, your roles and scores can be restored by an admin.

---

## Support

**Documentation:** https://docs.teei-platform.com

**Discord Server:** Join the support server for help

**Email Support:** support@teei-platform.com

**Report Issues:** https://github.com/teei-platform/issues

---

## Changelog

**v1.0.0** (2025-11-14)
- Initial release
- `/feedback` command with Q2Q integration
- `/recognize` command with role assignment and VIS updates
- `/help` command
- Audit logging and GDPR compliance
- Multi-tenant support

---

*Built with ❤️ for social impact*
