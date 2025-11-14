# Notifications Integration Guide

## Overview

The TEEI platform notifications service provides multi-channel notification delivery with:
- **Email** (SendGrid)
- **SMS** (Twilio)
- **Push Notifications** (Firebase Cloud Messaging)

All notifications include:
- Per-tenant rate limiting
- Audit logging
- Delivery tracking via webhooks
- GDPR-compliant PII redaction
- Localization support (en/no/uk)

---

## Email Notifications (SendGrid)

### Setup

1. **Create SendGrid Account**
   - Sign up at https://sendgrid.com
   - Verify your sender domain
   - Generate an API key with "Mail Send" permissions

2. **Environment Variables**
   ```bash
   SENDGRID_API_KEY=SG.xxxxx
   SENDGRID_FROM_EMAIL=noreply@your-domain.com
   SENDGRID_FROM_NAME="TEEI Platform"
   ```

3. **Webhook Configuration** (optional but recommended)
   - In SendGrid dashboard, go to Settings > Mail Settings > Event Webhook
   - URL: `https://your-domain.com/notifications/webhooks/sendgrid`
   - Select events: Delivered, Opened, Clicked, Bounced, Dropped, Spam Report
   - Enable webhook

### Usage

```typescript
import { sendEmail } from './providers/sendgrid';

const result = await sendEmail({
  to: 'user@example.com',
  subject: 'Welcome to TEEI',
  html: '<h1>Welcome!</h1>',
  text: 'Welcome!',
  customArgs: {
    tenant_id: 'company-123',
    user_id: 'user-456',
  },
});

if (result.success) {
  console.log('Email sent:', result.messageId);
} else {
  console.error('Email failed:', result.error);
}
```

### Templates

Templates are stored in `/services/notifications/src/templates/` using MJML:

- `welcome.mjml` - Welcome email for new users
- `weekly-report.mjml` - Weekly metrics summary
- `alert-slo-breach.mjml` - SLO violation alerts
- `data-export-ready.mjml` - Export completion notification

To add a new template:

1. Create `your-template.mjml` file
2. Use `{{variable}}` syntax for dynamic content
3. Compile to HTML with the template compiler
4. Test with sample data

### Localization

Email templates support three languages (en/no/uk):

```typescript
import { compileTemplate } from './lib/template-compiler';

const html = await compileTemplate('welcome', {
  name: 'John Doe',
}, 'no'); // Norwegian version
```

---

## SMS Notifications (Twilio)

### Setup

1. **Create Twilio Account**
   - Sign up at https://www.twilio.com
   - Purchase a phone number
   - Get Account SID and Auth Token

2. **Environment Variables**
   ```bash
   TWILIO_ACCOUNT_SID=ACxxxxx
   TWILIO_AUTH_TOKEN=xxxxx
   TWILIO_PHONE_NUMBER=+12345678900
   TWILIO_STATUS_CALLBACK_URL=https://your-domain.com/notifications/webhooks/twilio
   ```

3. **Install SDK**
   ```bash
   npm install twilio
   ```

### Usage

```typescript
import { sendSms, validateE164PhoneNumber } from './providers/twilio';

// Validate phone number first
const validation = validateE164PhoneNumber('+12345678900');
if (!validation.valid) {
  console.error(validation.error);
  return;
}

// Send SMS
const result = await sendSms({
  to: '+12345678900',
  body: 'Your verification code is 123456',
  tenantId: 'company-123',
  userId: 'user-456',
  customArgs: {
    purpose: 'verification',
  },
});

if (result.success) {
  console.log('SMS sent:', result.messageId);
  console.log('Segments:', result.segments); // For billing
} else {
  console.error('SMS failed:', result.error);
}
```

### Phone Number Format

All phone numbers must be in **E.164 format**:
- International format with country code
- No spaces, dashes, or parentheses
- Prefix with `+`

Examples:
- ✅ `+12345678900` (US)
- ✅ `+4412345678900` (UK)
- ✅ `+4712345678` (Norway)
- ❌ `(123) 456-7890`
- ❌ `12345678900`

### SMS Length & Segments

SMS messages are billed per segment:
- **GSM-7 encoding**: 160 chars/segment (153 for concatenated)
- **UCS-2 encoding** (Unicode): 70 chars/segment (67 for concatenated)

Use the segment calculator:

```typescript
import { calculateSmsSegments } from './providers/twilio';

const { segments, encoding, characters } = calculateSmsSegments('Hello world!');
console.log(`${characters} chars, ${segments} segment(s), ${encoding} encoding`);
```

### Rate Limiting

SMS rate limits are enforced per tenant:
- Default: 100 SMS/hour per tenant
- Configurable in tenant settings
- Queued when limit exceeded

---

## Push Notifications (FCM)

### Setup

1. **Create Firebase Project**
   - Go to https://console.firebase.google.com
   - Create a new project
   - Go to Project Settings > Service Accounts
   - Generate a new private key (JSON file)

2. **Environment Variables**

   Option A - File path:
   ```bash
   FIREBASE_SERVICE_ACCOUNT_JSON=/path/to/service-account.json
   ```

   Option B - Base64-encoded (for environment variables):
   ```bash
   FIREBASE_SERVICE_ACCOUNT_BASE64=eyJwcm9qZWN0X2lkIjogLi4ufQ==
   ```

   To encode:
   ```bash
   base64 -w 0 service-account.json
   ```

3. **Install SDK**
   ```bash
   npm install firebase-admin
   ```

### Usage - Single Device

```typescript
import { sendPush, validateFCMToken } from './providers/fcm';

const result = await sendPush({
  token: 'device-token-here',
  title: 'New Message',
  body: 'You have a new message from John',
  imageUrl: 'https://example.com/image.png',
  actionUrl: 'teei://messages/123',
  data: {
    messageId: '123',
    senderId: '456',
  },
  badge: 1,
  sound: 'default',
  priority: 'high',
  tenantId: 'company-123',
  userId: 'user-456',
});

if (result.success) {
  console.log('Push sent:', result.messageId);
}
```

### Usage - Batch (Multiple Devices)

```typescript
import { sendPushBatch } from './providers/fcm';

const tokens = ['token1', 'token2', 'token3'];

const result = await sendPushBatch(tokens, {
  title: 'Scheduled Maintenance',
  body: 'The platform will be offline from 2-3 AM',
  priority: 'normal',
  tenantId: 'company-123',
});

console.log(`Sent: ${result.successCount}, Failed: ${result.failureCount}`);
```

### Usage - Topic-Based

Subscribe users to topics for broadcast notifications:

```typescript
import { subscribeToTopic, sendPush } from './providers/fcm';

// Subscribe devices to "weekly-reports" topic
await subscribeToTopic(
  ['token1', 'token2'],
  'weekly-reports'
);

// Send notification to all subscribers
await sendPush({
  topic: 'weekly-reports',
  title: 'Weekly Report Ready',
  body: 'Your weekly impact report is now available',
  tenantId: 'company-123',
});
```

### Platform-Specific Options

FCM automatically adapts notifications for different platforms:

**Android:**
- Custom sounds, colors, LED patterns
- Action buttons
- Notification channels

**iOS (APNS):**
- Badge count updates
- Critical alerts (requires entitlement)
- Notification categories

**Web:**
- Browser push notifications
- Action buttons
- Images and icons

### Device Token Management

Device tokens must be collected from client apps:

**Web (JavaScript):**
```javascript
import { getToken } from 'firebase/messaging';

const token = await getToken(messaging, {
  vapidKey: 'YOUR_VAPID_KEY'
});
// Send token to backend
```

**Mobile (React Native):**
```javascript
import messaging from '@react-native-firebase/messaging';

const token = await messaging().getToken();
// Send token to backend
```

Store tokens in your database linked to users and tenants.

---

## Audit Logging

All notifications are automatically logged for compliance:

```typescript
import { getAuditLogs, getNotificationStats } from './lib/audit-logger';

// Get audit logs for a tenant
const logs = getAuditLogs('company-123', {
  channel: 'email',
  startDate: new Date('2025-01-01'),
  endDate: new Date(),
  status: 'delivered',
  limit: 100,
});

// Get notification statistics
const stats = getNotificationStats(
  'company-123',
  new Date('2025-01-01'),
  new Date()
);

console.log(`Delivery rate: ${stats.deliveryRate * 100}%`);
console.log(`Open rate: ${stats.openRate * 100}%`);
console.log(`Click rate: ${stats.clickRate * 100}%`);
```

### Export Audit Logs (CSV)

For compliance reporting:

```typescript
import { exportAuditLogsCSV } from './lib/audit-logger';

const csv = exportAuditLogsCSV(
  'company-123',
  new Date('2025-01-01'),
  new Date()
);

// Save or send CSV file
```

---

## Rate Limiting

Rate limits are enforced per tenant and channel:

**Default Limits:**
- Email: 1000/hour per tenant
- SMS: 100/hour per tenant
- Push: 10,000/hour per tenant

**Configuration:**

Rate limits are configured in `/services/notifications/src/lib/rate-limiter.ts`

To customize per tenant:

```typescript
import { setTenantRateLimit } from './lib/rate-limiter';

setTenantRateLimit('company-123', {
  email: 2000, // Custom limit
  sms: 200,
  push: 20000,
});
```

**Behavior when exceeded:**
- Requests are queued
- Processed when limit resets
- Audit log records rate limit hits

---

## GDPR Compliance

### PII Redaction

Recipient information (email, phone, device tokens) is automatically masked in audit logs:

- **Email**: `example@domain.com` → `ex***@domain.com`
- **Phone**: `+12345678900` → `+123***8900`
- **Device Token**: `eyJhbGciOiJSUzI1N...` → `eyJhbGci...`

### Opt-Out Management

Users can opt out of notification channels:

```typescript
import { setChannelPreferences } from './routes/preferences';

await setChannelPreferences('user-456', {
  email: true,
  sms: false,   // User opted out
  push: true,
});
```

### Data Retention

Audit logs are retained for:
- **Production**: 90 days (configurable per tenant)
- **Compliance**: 7 years (for regulatory requirements)

Logs are automatically archived and anonymized after retention period.

---

## Webhooks & Status Tracking

Notification delivery status is tracked via provider webhooks.

### SendGrid Webhook

Endpoint: `POST /notifications/webhooks/sendgrid`

Events:
- `delivered` - Email delivered to recipient
- `opened` - Recipient opened email
- `clicked` - Recipient clicked link
- `bounced` - Email bounced (hard or soft)
- `dropped` - SendGrid dropped email
- `spamreport` - Marked as spam

### Twilio Webhook

Endpoint: `POST /notifications/webhooks/twilio`

Events:
- `queued` - SMS queued for delivery
- `sent` - SMS sent to carrier
- `delivered` - SMS delivered to recipient
- `undelivered` - Delivery failed
- `failed` - Permanent failure

### Webhook Security

Both providers sign webhooks for verification:

- **SendGrid**: ECDSA signature in `X-Twilio-Email-Event-Webhook-Signature`
- **Twilio**: SHA256 signature in `X-Twilio-Signature`

Signatures are automatically validated by webhook handlers.

---

## Testing

### Development Mode

In development (`NODE_ENV=development`), notifications return mock responses without actually sending:

```typescript
// Returns success immediately without calling API
const result = await sendEmail({...});
// result.success = true
// result.messageId = 'mock-email-1234567890'
```

### Test Utilities

```typescript
import { verifySendGridConfig } from './providers/sendgrid';
import { verifyTwilioConfig } from './providers/twilio';
import { verifyFCMConfig } from './providers/fcm';

// Verify provider configurations
const sendgridStatus = await verifySendGridConfig();
const twilioStatus = await verifyTwilioConfig();
const fcmStatus = await verifyFCMConfig();

console.log('SendGrid:', sendgridStatus.configured ? '✅' : '❌');
console.log('Twilio:', twilioStatus.configured ? '✅' : '❌');
console.log('FCM:', fcmStatus.configured ? '✅' : '❌');
```

---

## Troubleshooting

### Email not received

1. Check SendGrid API key is valid
2. Verify sender email is verified in SendGrid
3. Check recipient email is not bouncing
4. Review audit logs for error messages
5. Check spam folder

### SMS not delivered

1. Verify phone number is in E.164 format
2. Check Twilio account balance
3. Ensure phone number is not on blocklist
4. Review audit logs for error codes
5. Check recipient carrier supports SMS

### Push not received

1. Verify device token is valid and not expired
2. Check Firebase service account JSON is correct
3. Ensure device has granted notification permissions
4. Test with FCM testing tools in Firebase console
5. Review FCM error codes in audit logs

### Rate limiting

1. Check tenant rate limit configuration
2. Review audit logs for rate limit hits
3. Increase limits if needed for legitimate traffic
4. Implement exponential backoff in retry logic

---

## API Reference

See OpenAPI documentation at `/docs/api/notifications.yml` for complete API reference.

**Key Endpoints:**

- `POST /notifications/send` - Send notification (any channel)
- `POST /notifications/send/email` - Send email
- `POST /notifications/send/sms` - Send SMS
- `POST /notifications/send/push` - Send push notification
- `GET /notifications/audit` - Get audit logs
- `POST /notifications/preferences` - Update channel preferences
- `GET /notifications/stats` - Get delivery statistics

---

## Support

For additional help:
- Platform documentation: https://docs.teei-platform.com
- SendGrid docs: https://docs.sendgrid.com
- Twilio docs: https://www.twilio.com/docs
- Firebase docs: https://firebase.google.com/docs/cloud-messaging

Report issues: https://github.com/teei-platform/issues
