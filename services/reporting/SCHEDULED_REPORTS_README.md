# Scheduled Reports System

Automated report generation and email delivery using cron-based scheduling.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

New dependencies added:
- `node-cron` - Cron job scheduling
- `nodemailer` - Email delivery
- `@types/node-cron` - TypeScript types
- `@types/nodemailer` - TypeScript types

### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

**Required SMTP Settings**:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM_NAME=TEEI CSR Platform
EMAIL_FROM_ADDRESS=your-email@gmail.com
```

**Note**: For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833), not your regular password.

### 3. Run Database Migration

```bash
npm run migrate
```

This creates:
- `report_schedules` table
- `schedule_executions` table
- `schedule_overview` view
- Indexes and constraints

### 4. Start Service

```bash
npm run dev
```

You should see:
```
[Scheduling] Initializing scheduled reports service...
[Scheduling] Found 0 active schedules
[Scheduling] Scheduled reports service initialized
[Email] SMTP connection verified
```

## Usage

### Creating a Schedule via API

```bash
curl -X POST http://localhost:3001/companies/company-123/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "schedule_name": "Monthly Executive Report",
    "template_id": "executive-summary",
    "cron_expression": "0 9 1 * *",
    "timezone": "UTC",
    "format": "pdf",
    "parameters": {
      "period": "Q4-2024",
      "sections": ["cover", "at-a-glance", "sroi"],
      "include_charts": true,
      "include_evidence": false,
      "include_lineage": false
    },
    "recipients": ["ceo@company.com"],
    "email_subject": "Monthly Executive Report",
    "include_attachment": true,
    "is_active": true
  }'
```

### Creating a Schedule via UI

1. Navigate to `/cockpit/:companyId/schedules`
2. Click "Create Schedule"
3. Fill in the form:
   - **Schedule Name**: e.g., "Monthly Executive Report"
   - **Frequency**: Select preset or custom cron
   - **Recipients**: Add email addresses
   - **Report Configuration**: Select template and format
   - **Email Settings**: Customize subject and body
4. Click "Create Schedule"

You'll receive a confirmation email at the recipient addresses.

### Monitoring Schedules

**List all schedules**:
```bash
GET /companies/:companyId/schedules
```

**View execution history**:
```bash
GET /companies/:companyId/schedules/:scheduleId/executions
```

**Trigger manual execution**:
```bash
POST /companies/:companyId/schedules/:scheduleId/execute
```

## Cron Expression Examples

```
0 9 * * *       # Daily at 9 AM
0 9 * * 1       # Weekly on Monday at 9 AM
0 9 1 * *       # Monthly on 1st at 9 AM
0 9 1 */3 *     # Quarterly on 1st at 9 AM
0 9 1 1 *       # Yearly on Jan 1st at 9 AM
0 */6 * * *     # Every 6 hours
```

## Email Templates

### 1. Scheduled Report Email

Sent when a report is successfully generated.

**Default Subject**: `Scheduled Report: {reportTitle} - {date}`

**Content**:
- Professional HTML template
- Report details (schedule, title, date)
- PDF attachment
- Unsubscribe link

### 2. Failure Notification

Sent after 3 failed attempts.

**Subject**: `Report Generation Failed: {scheduleName}`

**Content**:
- Error details
- Attempt number
- Retry information

### 3. Schedule Confirmation

Sent when a schedule is created.

**Subject**: `Schedule Created: {scheduleName}`

**Content**:
- Schedule details
- Next run time
- Management link

## Retry Logic

**Max Attempts**: 3

**Delay** (exponential backoff):
- Attempt 1: 5 minutes
- Attempt 2: 15 minutes
- Attempt 3: 30 minutes

**After Max Failures**:
- Schedule remains active
- Failure notification sent
- Will retry on next cron trigger

## Troubleshooting

### Schedules Not Running

1. Check `SCHEDULING_ENABLED=true` in `.env`
2. Verify schedule is active: `is_active=true`
3. Check next_run_at is in the future
4. Review service logs for errors

### Emails Not Sending

1. Verify SMTP credentials
2. Test connection: `emailService.verifyConnection()`
3. Check firewall/port blocking
4. Review email service logs

### Testing Email Configuration

```typescript
import { emailService } from './src/utils/emailService';

// Test connection
const connected = await emailService.verifyConnection();
console.log('SMTP connected:', connected);

// Send test email
await emailService.sendEmail({
  to: ['test@example.com'],
  subject: 'Test Email',
  text: 'This is a test email.',
  html: '<p>This is a test email.</p>'
});
```

## Development

### Running Tests

```bash
# All tests
npm test

# Specific test file
npm test emailService.test.ts

# With coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

### Manual Testing

1. **Create a test schedule** with next run in 1 minute
2. **Monitor logs** for execution
3. **Check email inbox** for delivery
4. **Review database** for execution records

```sql
-- Check recent executions
SELECT * FROM schedule_executions
ORDER BY created_at DESC
LIMIT 10;

-- Check schedule status
SELECT * FROM schedule_overview;
```

## Security Notes

### SMTP Credentials

- Never commit `.env` file
- Use app-specific passwords (not main password)
- Rotate credentials regularly
- Use environment variables in production

### Email Validation

- All recipient emails validated with regex
- Invalid emails rejected before creation
- Rate limiting prevents abuse

### Database Security

- Parameterized queries prevent SQL injection
- Row-level security (company_id scoping)
- Max 10 schedules per company
- Cascade delete on schedule removal

## Production Deployment

### Pre-Deployment Checklist

- [ ] SMTP credentials configured
- [ ] Database migration run
- [ ] Email templates tested
- [ ] Monitoring alerts set up
- [ ] Backup strategy in place
- [ ] Error logging configured

### Monitoring

**Key Metrics**:
- Email delivery success rate (target: >95%)
- Average execution duration (target: <5 minutes)
- Failed execution count (alert if >3 in 24h)
- SMTP connection health

**Logging**:
```typescript
[ScheduledReports] Executing schedule: Monthly Executive Report
[ScheduledReports] Successfully executed schedule: Monthly Executive Report
[Email] Email sent successfully: test-message-id
```

### Database Maintenance

**Archive old executions** (recommended: monthly):
```sql
DELETE FROM schedule_executions
WHERE created_at < NOW() - INTERVAL '90 days'
AND status IN ('completed', 'failed');
```

## API Reference

See full API documentation in: `reports/PHASE-C-D-02-scheduled-reports.md`

**Endpoints**:
- `GET /companies/:id/schedules` - List schedules
- `GET /companies/:id/schedules/:scheduleId` - Get schedule
- `POST /companies/:id/schedules` - Create schedule
- `PUT /companies/:id/schedules/:scheduleId` - Update schedule
- `DELETE /companies/:id/schedules/:scheduleId` - Delete schedule
- `GET /companies/:id/schedules/:scheduleId/executions` - Execution history
- `POST /companies/:id/schedules/:scheduleId/execute` - Manual trigger

## Support

For issues or questions:
1. Check logs: `npm run dev` and review console output
2. Review documentation: `reports/PHASE-C-D-02-scheduled-reports.md`
3. Test SMTP connection: Use the verification method above
4. Check database: Query `schedule_executions` for errors

## License

Private - TEEI CSR Platform
