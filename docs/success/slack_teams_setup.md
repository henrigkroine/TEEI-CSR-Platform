# Slack & Microsoft Teams Integration Setup Guide

## Overview

The TEEI CSR Platform supports rich notifications to Slack and Microsoft Teams channels for:
- SLA breach alerts
- Approval workflow notifications
- Delivery failures
- Synthetic monitor failures and recoveries
- Report generation and export completion

## Table of Contents

1. [Slack Setup](#slack-setup)
2. [Microsoft Teams Setup](#microsoft-teams-setup)
3. [Channel Recommendations](#channel-recommendations)
4. [Testing Procedures](#testing-procedures)
5. [Troubleshooting](#troubleshooting)

---

## Slack Setup

### Prerequisites

- Slack workspace admin access
- Appropriate channels created for different alert types

### Step 1: Create Incoming Webhook

1. **Navigate to Slack App Directory**
   - Go to https://api.slack.com/apps
   - Click **"Create New App"**
   - Select **"From scratch"**

2. **Configure App**
   - **App Name**: `TEEI Platform Notifications`
   - **Workspace**: Select your workspace
   - Click **"Create App"**

3. **Enable Incoming Webhooks**
   - In the left sidebar, click **"Incoming Webhooks"**
   - Toggle **"Activate Incoming Webhooks"** to **On**

4. **Add Webhook to Workspace**
   - Scroll down to **"Webhook URLs for Your Workspace"**
   - Click **"Add New Webhook to Workspace"**
   - Select the channel (e.g., `#teei-alerts`)
   - Click **"Allow"**

5. **Copy Webhook URL**
   - Copy the webhook URL (starts with `https://hooks.slack.com/services/...`)
   - **Keep this URL secret!** It provides access to post to your channel.

### Step 2: Configure in TEEI Platform

1. **Navigate to Admin Settings**
   - Log in to TEEI Corporate Cockpit
   - Go to **Settings** → **Integrations** → **Slack**

2. **Add Channel Configuration**
   - Click **"Add Slack Channel"**
   - Fill in the form:
     - **Channel Type**: Select from dropdown (alerts, approvals, monitoring, reports)
     - **Webhook URL**: Paste the URL from Step 1.5
     - **Channel Name**: e.g., `#teei-alerts` (for reference only)
     - **Enabled**: Check to activate
   - Click **"Save"**

3. **Repeat for Additional Channels**
   - Create separate webhooks for each channel type
   - Best practice: Use different Slack channels for different severities

### Step 3: Test Integration

1. **Send Test Message**
   - In the Slack channel configuration, click **"Send Test Message"**
   - You should see a formatted message appear in your Slack channel
   - Verify that the message formatting and actions (buttons) work correctly

2. **Verify Message Delivery**
   - Check that the message appears in the correct channel
   - Click action buttons to verify they link to the correct URLs
   - Check timestamp formatting

---

## Microsoft Teams Setup

### Prerequisites

- Microsoft Teams admin access or channel owner permissions
- Appropriate Teams channels created

### Step 1: Create Incoming Webhook in Teams

1. **Open Teams Channel**
   - Navigate to the channel where you want to receive notifications
   - Example: `Alerts` channel in `TEEI Platform` team

2. **Configure Connectors**
   - Click the **•••** (three dots) next to the channel name
   - Select **"Connectors"** or **"Manage channel"** → **"Connectors"**

3. **Add Incoming Webhook**
   - Search for **"Incoming Webhook"**
   - Click **"Add"** or **"Configure"**

4. **Configure Webhook**
   - **Name**: `TEEI Platform Notifications`
   - **Upload Image**: (Optional) Upload TEEI logo
   - Click **"Create"**

5. **Copy Webhook URL**
   - Copy the webhook URL provided
   - Click **"Done"**
   - **Keep this URL secret!**

### Step 2: Configure in TEEI Platform

1. **Navigate to Admin Settings**
   - Log in to TEEI Corporate Cockpit
   - Go to **Settings** → **Integrations** → **Microsoft Teams**

2. **Add Channel Configuration**
   - Click **"Add Teams Channel"**
   - Fill in the form:
     - **Channel Type**: Select from dropdown (alerts, approvals, monitoring, reports)
     - **Webhook URL**: Paste the URL from Step 1.5
     - **Channel Name**: e.g., `Alerts` (for reference only)
     - **Enabled**: Check to activate
   - Click **"Save"**

3. **Repeat for Additional Channels**
   - Create separate webhooks for each channel type
   - Best practice: Use different Teams channels for different alert types

### Step 3: Test Integration

1. **Send Test Message**
   - In the Teams channel configuration, click **"Send Test Message"**
   - You should see an adaptive card appear in your Teams channel
   - Verify that the card formatting and actions work correctly

2. **Verify Message Delivery**
   - Check that the adaptive card appears in the correct channel
   - Click action buttons to verify they open correct URLs
   - Verify fact formatting and visual hierarchy

---

## Channel Recommendations

### Recommended Channel Structure

For optimal alert management, we recommend the following channel structure:

| Channel Type | Purpose | Recommended Slack Channel | Recommended Teams Channel | Severity Levels |
|--------------|---------|---------------------------|---------------------------|-----------------|
| **Alerts** | Critical system alerts, SLA breaches, delivery failures | `#teei-alerts` | `Alerts` | Critical, Warning |
| **Approvals** | Report approval workflows | `#teei-approvals` | `Approvals` | Warning, Info, Success |
| **Monitoring** | Synthetic monitor status | `#teei-monitoring` | `Monitoring` | Critical, Success |
| **Reports** | Report generation, export completion | `#teei-reports` | `Reports` | Info, Success |

### Channel Configuration Best Practices

1. **Separate by Severity**
   - Create different channels for critical vs. informational alerts
   - Example: `#teei-critical` and `#teei-info`

2. **Team-Specific Channels**
   - Configure channels for different teams
   - Example: `#finance-approvals`, `#exec-reports`

3. **Enable Thread Replies**
   - Configure channels to use threads for follow-up discussion
   - Keeps main channel clean

4. **Set Notification Preferences**
   - Configure @mentions for critical alerts
   - Mute low-priority channels outside business hours

5. **Archive Strategy**
   - Set retention policies for old messages
   - Archive channels quarterly for compliance

---

## Testing Procedures

### Test Plan Checklist

#### Slack Testing

- [ ] **Test Message Delivery**
  - Send test message to each configured channel
  - Verify message appears within 5 seconds

- [ ] **Test Message Formatting**
  - Check that title, message body, and fields display correctly
  - Verify emoji icons appear for severity levels
  - Confirm color coding matches severity

- [ ] **Test Action Buttons**
  - Click each button in test message
  - Verify URLs open correctly
  - Check button styling (primary vs. default)

- [ ] **Test Timestamps**
  - Verify timestamps show correct timezone
  - Check date/time format matches Slack locale

- [ ] **Test Rate Limiting**
  - Send multiple messages rapidly
  - Verify messages are queued and delivered
  - Check for no duplicate messages

#### Microsoft Teams Testing

- [ ] **Test Adaptive Card Delivery**
  - Send test adaptive card to each configured channel
  - Verify card appears within 5 seconds

- [ ] **Test Card Formatting**
  - Check header, icon, and title formatting
  - Verify fact pairs display correctly
  - Confirm color accent matches severity

- [ ] **Test Action Buttons**
  - Click each button in test card
  - Verify URLs open correctly
  - Check button styling (positive vs. default)

- [ ] **Test Timestamps**
  - Verify timestamps show correct format
  - Check date/time matches user locale

- [ ] **Test Card Responsiveness**
  - View card on desktop Teams client
  - View card on mobile Teams app
  - Verify card adapts to screen size

### Automated Testing

Run the automated test suite to verify all integrations:

```bash
# From repository root
cd services/notifications

# Run integration tests
pnpm test:integration -- slack teams

# Expected output:
# ✓ Slack webhook connectivity
# ✓ Slack message formatting
# ✓ Slack rate limiting
# ✓ Teams webhook connectivity
# ✓ Teams adaptive card formatting
# ✓ Teams rate limiting
```

### Manual Testing Scenarios

#### Scenario 1: SLA Breach Alert

1. Trigger an SLA breach in test environment
2. Verify alert appears in configured `alerts` channel
3. Check severity is `critical`
4. Verify "View Dashboard" button links to correct dashboard

#### Scenario 2: Approval Required

1. Submit a report for approval in test environment
2. Verify notification appears in `approvals` channel
3. Check severity is `warning`
4. Click "Review & Approve" button
5. Verify it opens approval page with correct report

#### Scenario 3: Synthetic Monitor Failure

1. Trigger synthetic monitor failure in test environment
2. Verify alert appears in `monitoring` channel
3. Check severity is `critical`
4. Verify error message displays correctly

#### Scenario 4: Report Generation Complete

1. Generate a report in test environment
2. Verify notification appears in `reports` channel
3. Check severity is `success`
4. Verify "View Report" button links to correct report

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: Webhook Returns 404 Not Found

**Symptoms:**
- Messages fail to send
- Error logs show `404` status code

**Causes:**
- Webhook URL was deleted or expired
- Incorrect webhook URL entered

**Solutions:**
1. Verify webhook URL in Slack/Teams admin
2. Regenerate webhook if necessary
3. Update webhook URL in TEEI platform configuration
4. Send test message to verify

#### Issue: Messages Not Appearing in Channel

**Symptoms:**
- No error in logs
- Messages appear to send successfully
- Channel shows no new messages

**Causes:**
- Webhook configured for wrong channel
- Channel was archived or deleted
- App removed from workspace

**Solutions:**
1. Check webhook configuration in Slack/Teams
2. Verify channel still exists and is active
3. Regenerate webhook and reconfigure
4. Check workspace app permissions

#### Issue: Message Formatting Broken

**Symptoms:**
- Messages appear as plain text
- Buttons/actions don't work
- Color/styling missing

**Causes:**
- Outdated webhook format
- Slack/Teams API changes
- JSON payload syntax error

**Solutions:**
1. Check TEEI platform version for updates
2. Review error logs for JSON parsing errors
3. Verify Block Kit/Adaptive Card schema version
4. Update to latest integration code

#### Issue: Rate Limiting Errors

**Symptoms:**
- Messages delayed significantly
- Error logs show `429 Too Many Requests`
- Some messages dropped

**Causes:**
- Too many messages sent in short time
- Webhook rate limit exceeded (1 message/second)

**Solutions:**
1. Review alert configuration to reduce frequency
2. Consolidate multiple alerts into digest
3. Increase deduplication window
4. Distribute alerts across multiple channels

#### Issue: Deduplication Too Aggressive

**Symptoms:**
- Important alerts not delivered
- Duplicate issues shown as resolved
- Missing notifications

**Causes:**
- Deduplication window too long
- Deduplication key too broad

**Solutions:**
1. Review deduplication configuration
2. Reduce deduplication window (default: 5 minutes)
3. Make deduplication keys more specific
4. Disable deduplication for critical alerts

#### Issue: Action Buttons Don't Work

**Symptoms:**
- Clicking buttons does nothing
- URLs don't open
- Error on button click

**Causes:**
- Invalid URL in action configuration
- CORS/authentication issues
- Deep linking not configured

**Solutions:**
1. Verify action URLs are valid and accessible
2. Test URLs in browser manually
3. Check authentication requirements
4. Update URLs to use public-accessible endpoints

### Debug Mode

Enable debug logging for detailed troubleshooting:

```bash
# Set environment variable
export DEBUG=notifications:slack,notifications:teams

# Restart notification service
pnpm -w dev

# View logs
tail -f logs/notifications.log
```

### Support Channels

If issues persist:

1. **Check Status Page**: https://status.teei-platform.com
2. **Review Documentation**: https://docs.teei-platform.com/integrations
3. **Contact Support**: support@teei-platform.com
4. **Slack Community**: #teei-support (for customers)

---

## Advanced Configuration

### Custom Alert Routing

Configure custom routing rules to send different alerts to different channels based on conditions:

```json
{
  "routing_rules": [
    {
      "condition": "severity == 'critical'",
      "channel_type": "alerts",
      "channel_override": "#critical-alerts"
    },
    {
      "condition": "alertType == 'approval_required' AND requester == 'exec'",
      "channel_type": "approvals",
      "channel_override": "#exec-approvals"
    }
  ]
}
```

### Message Templates

Customize message templates for your organization:

1. Navigate to **Settings** → **Integrations** → **Message Templates**
2. Select alert type to customize
3. Edit title, message, and field templates
4. Use variables: `{{companyName}}`, `{{alertName}}`, `{{severity}}`
5. Preview and save

### Webhook Rotation

For security, rotate webhook URLs periodically:

1. Create new webhook in Slack/Teams
2. Add new webhook to TEEI platform (don't delete old one yet)
3. Test new webhook
4. Once verified, disable old webhook in TEEI
5. Delete old webhook in Slack/Teams after 24 hours

### Multi-Tenant Configuration

For partners managing multiple tenants:

- Each tenant can have separate webhook configurations
- Configure per-tenant channels: `#tenant-{name}-alerts`
- Use tenant-specific Teams (separate from main workspace)
- Enable tenant isolation in webhook configuration

---

## Appendix

### Slack Block Kit Reference

- **Block Kit Builder**: https://api.slack.com/block-kit
- **Message Formatting**: https://api.slack.com/reference/surfaces/formatting
- **Webhook Limits**: 1 message/second, 30KB payload limit

### Microsoft Teams Adaptive Cards Reference

- **Adaptive Card Designer**: https://adaptivecards.io/designer/
- **Card Schema**: https://adaptivecards.io/explorer/
- **Teams Card Formatting**: https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/connectors-using

### Rate Limits

| Platform | Rate Limit | Burst Limit | Payload Limit |
|----------|------------|-------------|---------------|
| Slack    | 1/second   | 30/minute   | 30 KB         |
| Teams    | 4/second   | 15/minute   | 28 KB         |

### Security Best Practices

1. **Never commit webhook URLs to version control**
2. **Use environment variables** for webhook configuration
3. **Rotate webhooks** every 90 days
4. **Monitor webhook access logs** for suspicious activity
5. **Implement IP allowlisting** if supported
6. **Use HTTPS only** for action URLs
7. **Validate webhook signatures** if available

---

**Last Updated**: 2025-11-15
**Version**: 1.0
**Maintained by**: TEEI Platform Team
