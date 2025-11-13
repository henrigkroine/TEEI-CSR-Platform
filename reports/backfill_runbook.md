# Backfill Pipeline Runbook

## Overview

This runbook provides step-by-step instructions for backfilling historical Kintell session data using the enhanced backfill pipeline with checkpoint/resume capability.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [CSV Format Requirements](#csv-format-requirements)
3. [Backfill Workflow](#backfill-workflow)
4. [API Reference](#api-reference)
5. [Error Handling](#error-handling)
6. [Performance Optimization](#performance-optimization)
7. [Monitoring and Troubleshooting](#monitoring-and-troubleshooting)
8. [Recovery Procedures](#recovery-procedures)

## Prerequisites

### System Requirements

- Kintell Connector service running and accessible
- Database connection active (PostgreSQL)
- NATS event bus running
- Sufficient disk space for error files (estimate 10% of input file size)

### User Requirements

- All participant and volunteer emails must exist in the `users` table
- If users are missing, create them first using the User Management API

### Check Prerequisites

```bash
# 1. Check service health
curl http://localhost:3002/health

# Expected response:
# {
#   "status": "ok",
#   "service": "kintell-connector",
#   "timestamp": "2024-01-15T10:00:00.000Z"
# }

# 2. Check database connection
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"

# 3. Check NATS connection
nats server list
```

## CSV Format Requirements

### Required Columns

| Column Name | Type | Description | Example |
|-------------|------|-------------|---------|
| `session_id` | String | Unique external session ID | `kintell-session-12345` |
| `session_type` | String | "Language Connect" or "Mentorship" | `Language Connect` |
| `participant_email` | Email | Participant's email (must exist in DB) | `participant@example.com` |
| `volunteer_email` | Email | Volunteer's email (must exist in DB) | `volunteer@example.com` |
| `date` | ISO 8601 | Session date/time | `2024-01-15T10:00:00Z` |
| `duration_min` | Integer | Duration in minutes | `60` |
| `rating` | Float (optional) | Rating 1-5 scale | `4.5` |
| `feedback_text` | String (optional) | Feedback text | `Great session!` |
| `language_level` | String (optional) | CEFR level (A1-C2) | `B1` |

### Sample CSV

```csv
session_id,session_type,participant_email,volunteer_email,date,duration_min,rating,feedback_text,language_level
kintell-session-001,Language Connect,john@example.com,sarah@example.com,2024-01-15T10:00:00Z,60,5,Excellent session!,B1
kintell-session-002,Mentorship,alice@example.com,bob@example.com,2024-01-15T14:00:00Z,45,4,Very helpful,B2
kintell-session-003,Language Connect,charlie@example.com,diana@example.com,2024-01-16T09:00:00Z,60,,No feedback,A2
```

### Validation Rules

1. **Email Format**: Must be valid email addresses
2. **Session Type**: Must be "Language Connect" or "Mentorship" (case-insensitive)
3. **Date Format**: Must be valid ISO 8601 datetime
4. **Duration**: Must be positive integer
5. **Rating**: If provided, must be 1-5
6. **Language Level**: If provided, must be valid CEFR level

## Backfill Workflow

### Step-by-Step Process

#### Step 1: Prepare CSV File

1. Export data from Kintell in the required format
2. Validate CSV format and data quality
3. Remove any duplicate session IDs
4. Ensure all users exist in the database

```bash
# Validate CSV format
head -n 5 kintell_sessions.csv

# Check for duplicates
awk -F',' 'NR>1 {print $1}' kintell_sessions.csv | sort | uniq -d

# Count rows
wc -l kintell_sessions.csv
```

#### Step 2: Create Users (if needed)

```bash
# Extract unique emails
awk -F',' 'NR>1 {print $3"\n"$4}' kintell_sessions.csv | sort -u > users.txt

# Check which users are missing
while read email; do
  psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM users WHERE email='$email';"
done < users.txt

# Create missing users via API
# (Use User Management API endpoints)
```

#### Step 3: Start Backfill Job

```bash
# Upload CSV and create backfill job
curl -X POST http://localhost:3002/import/backfill/start \
  -F "file=@kintell_sessions.csv" \
  | jq '.'

# Response:
# {
#   "jobId": "550e8400-e29b-41d4-a716-446655440000",
#   "fileName": "kintell_sessions.csv",
#   "totalRows": 1000,
#   "status": "pending",
#   "message": "Backfill job created. Call resume endpoint to start processing."
# }

# Save jobId for next steps
export JOB_ID="550e8400-e29b-41d4-a716-446655440000"
```

#### Step 4: Start Processing

```bash
# Resume (start) the backfill job
curl -X POST http://localhost:3002/import/backfill/$JOB_ID/resume \
  -F "file=@kintell_sessions.csv" \
  | jq '.'

# Response:
# {
#   "jobId": "550e8400-e29b-41d4-a716-446655440000",
#   "fileName": "kintell_sessions.csv",
#   "totalRows": 1000,
#   "processedRows": 1000,
#   "successfulRows": 980,
#   "failedRows": 20,
#   "status": "completed",
#   "percentComplete": 100,
#   "errorFilePath": "/tmp/backfill_errors_550e8400-e29b-41d4-a716-446655440000.csv"
# }
```

#### Step 5: Monitor Progress

```bash
# Check job status (poll every 30 seconds)
while true; do
  curl -s http://localhost:3002/import/backfill/$JOB_ID/status | jq '.percentComplete, .status'
  sleep 30
done

# Or one-time check
curl http://localhost:3002/import/backfill/$JOB_ID/status | jq '.'
```

#### Step 6: Handle Errors

```bash
# Download error file
curl -o errors.csv http://localhost:3002/import/backfill/$JOB_ID/errors

# Review errors
head -n 10 errors.csv

# Common error patterns
grep "not found" errors.csv | wc -l
grep "Invalid email" errors.csv | wc -l
```

#### Step 7: Fix Errors and Re-import

```bash
# Fix issues (create missing users, correct data)

# Extract failed rows (excluding error columns)
awk -F',' 'NR>1 {print $1,$2,$3,$4,$5,$6,$7,$8,$9}' OFS=',' errors.csv > failed_rows.csv

# Add header
head -n 1 kintell_sessions.csv > failed_rows_fixed.csv
tail -n +2 failed_rows.csv >> failed_rows_fixed.csv

# Re-import failed rows
curl -X POST http://localhost:3002/import/backfill/start \
  -F "file=@failed_rows_fixed.csv" \
  | jq '.'

# Start processing
export RETRY_JOB_ID="<new-job-id>"
curl -X POST http://localhost:3002/import/backfill/$RETRY_JOB_ID/resume \
  -F "file=@failed_rows_fixed.csv" \
  | jq '.'
```

## API Reference

### 1. Create Backfill Job

**Endpoint**: `POST /import/backfill/start`

**Request**:
```bash
curl -X POST http://localhost:3002/import/backfill/start \
  -F "file=@sessions.csv"
```

**Response**:
```json
{
  "jobId": "uuid",
  "fileName": "sessions.csv",
  "totalRows": 1000,
  "status": "pending",
  "message": "Backfill job created. Call resume endpoint to start processing."
}
```

### 2. Get Job Status

**Endpoint**: `GET /import/backfill/:jobId/status`

**Request**:
```bash
curl http://localhost:3002/import/backfill/{jobId}/status
```

**Response**:
```json
{
  "jobId": "uuid",
  "fileName": "sessions.csv",
  "totalRows": 1000,
  "processedRows": 500,
  "successfulRows": 480,
  "failedRows": 20,
  "status": "running",
  "percentComplete": 50,
  "errorFilePath": "/tmp/backfill_errors_uuid.csv"
}
```

### 3. Download Error File

**Endpoint**: `GET /import/backfill/:jobId/errors`

**Request**:
```bash
curl -o errors.csv http://localhost:3002/import/backfill/{jobId}/errors
```

**Response**: CSV file with failed rows and error messages

### 4. Resume/Start Processing

**Endpoint**: `POST /import/backfill/:jobId/resume`

**Request**:
```bash
curl -X POST http://localhost:3002/import/backfill/{jobId}/resume \
  -F "file=@sessions.csv"
```

**Response**: Same as Get Job Status

## Error Handling

### Common Errors and Solutions

#### 1. User Not Found

**Error**: `Participant not found: user@example.com`

**Solution**:
```bash
# Create missing user
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "name": "User Name",
    "role": "participant"
  }'
```

#### 2. Invalid Email Format

**Error**: `Invalid email format`

**Solution**:
- Fix email in CSV file
- Remove invalid rows if data is corrupt

#### 3. Duplicate Session ID

**Error**: `Duplicate key value violates unique constraint`

**Solution**:
- Session already exists in database
- Skip or update existing session

#### 4. Invalid Session Type

**Error**: `Unknown session type: invalid-type`

**Solution**:
- Fix session type in CSV (must be "Language Connect" or "Mentorship")

#### 5. Invalid Date Format

**Error**: `Invalid date format`

**Solution**:
- Ensure dates are in ISO 8601 format: `YYYY-MM-DDTHH:MM:SSZ`

### Error File Format

The error CSV includes all original columns plus:
- `_error_row`: Row number in original file
- `_error_message`: Error description

**Example**:
```csv
session_id,session_type,participant_email,volunteer_email,date,duration_min,rating,feedback_text,language_level,_error_row,_error_message
session-123,Language Connect,missing@example.com,volunteer@example.com,2024-01-01T10:00:00Z,60,5,Good,B1,42,Participant not found: missing@example.com
```

## Performance Optimization

### Recommended Batch Sizes

- **Small files (< 1K rows)**: Process all at once
- **Medium files (1K - 10K rows)**: Process in one job
- **Large files (> 10K rows)**: Split into multiple 10K row batches

### Splitting Large Files

```bash
# Split CSV into 10K row chunks (preserving header)
tail -n +2 large_file.csv | split -l 10000 -d - chunk_
for file in chunk_*; do
  head -n 1 large_file.csv > "sessions_$file.csv"
  cat "$file" >> "sessions_$file.csv"
  rm "$file"
done
```

### Performance Tips

1. **Off-Peak Hours**: Run large backfills during off-peak hours
2. **Database Indexing**: Ensure indexes exist on `users.email` and `kintell_sessions.external_session_id`
3. **Connection Pooling**: Database pool size should be sufficient (recommended: 20 connections)
4. **Monitor Memory**: Large files may require increased memory allocation
5. **Parallel Jobs**: Can run multiple small jobs in parallel (max 3-5 concurrent)

### Expected Performance

| Rows | Expected Time | Throughput |
|------|--------------|------------|
| 1K | 30-60 seconds | ~20-30 rows/sec |
| 10K | 5-10 minutes | ~15-30 rows/sec |
| 100K | 50-100 minutes | ~15-30 rows/sec |

**Note**: Actual performance depends on database, network, and system load.

## Monitoring and Troubleshooting

### Health Checks

```bash
# Service health
curl http://localhost:3002/health

# Database connection
psql $DATABASE_URL -c "SELECT NOW();"

# Check active backfill jobs
psql $DATABASE_URL -c "
SELECT id, file_name, status, processed_rows, total_rows,
       ROUND((processed_rows::float / total_rows * 100), 2) as percent_complete
FROM backfill_jobs
WHERE status IN ('pending', 'running')
ORDER BY created_at DESC;"
```

### Log Monitoring

```bash
# Follow service logs
docker logs -f kintell-connector

# Search for errors
docker logs kintell-connector 2>&1 | grep ERROR

# Search for specific job
docker logs kintell-connector 2>&1 | grep "jobId: uuid"
```

### Database Queries

```bash
# Check backfill job history
psql $DATABASE_URL -c "
SELECT
  id,
  file_name,
  status,
  total_rows,
  successful_rows,
  failed_rows,
  created_at,
  completed_at
FROM backfill_jobs
ORDER BY created_at DESC
LIMIT 10;"

# Check recent sessions
psql $DATABASE_URL -c "
SELECT
  id,
  external_session_id,
  session_type,
  created_at
FROM kintell_sessions
ORDER BY created_at DESC
LIMIT 10;"

# Count sessions by date
psql $DATABASE_URL -c "
SELECT
  DATE(created_at) as date,
  COUNT(*) as sessions
FROM kintell_sessions
GROUP BY DATE(created_at)
ORDER BY date DESC;"
```

## Recovery Procedures

### Scenario 1: Job Stuck in Running State

**Symptoms**: Job status is "running" but not progressing

**Diagnosis**:
```bash
# Check job status
curl http://localhost:3002/import/backfill/$JOB_ID/status

# Check service logs
docker logs kintell-connector | tail -100
```

**Solution**:
```sql
-- Manually set job to failed state
UPDATE backfill_jobs
SET status = 'failed'
WHERE id = 'job-uuid';

-- Then restart the job
```

### Scenario 2: Service Crash During Backfill

**Symptoms**: Service stopped, job incomplete

**Diagnosis**:
```bash
# Check service status
docker ps | grep kintell-connector

# Check job status
psql $DATABASE_URL -c "
SELECT id, status, last_processed_row, total_rows
FROM backfill_jobs
WHERE id = 'job-uuid';"
```

**Solution**:
```bash
# 1. Restart service
docker restart kintell-connector

# 2. Check last processed row
curl http://localhost:3002/import/backfill/$JOB_ID/status

# 3. Resume from checkpoint
curl -X POST http://localhost:3002/import/backfill/$JOB_ID/resume \
  -F "file=@original_file.csv"

# The system will automatically resume from last_processed_row
```

### Scenario 3: Database Connection Lost

**Symptoms**: Many "database connection" errors

**Diagnosis**:
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check connection pool
docker logs kintell-connector | grep "connection"
```

**Solution**:
```bash
# 1. Fix database connection issues
# 2. Restart service
docker restart kintell-connector

# 3. Resume backfill job (will retry from checkpoint)
curl -X POST http://localhost:3002/import/backfill/$JOB_ID/resume \
  -F "file=@original_file.csv"
```

### Scenario 4: High Error Rate (> 50%)

**Symptoms**: More than half of rows failing

**Diagnosis**:
```bash
# Download and analyze errors
curl -o errors.csv http://localhost:3002/import/backfill/$JOB_ID/errors

# Count error types
awk -F',' 'NR>1 {print $NF}' errors.csv | sort | uniq -c | sort -rn
```

**Solution**:
```bash
# 1. Identify root cause (common error pattern)
# 2. Pause/stop current job
# 3. Fix data source or create missing records
# 4. Re-import entire file or failed rows only
```

## Best Practices

1. **Test with Sample Data**: Always test with 100-1000 rows first
2. **Validate Before Import**: Check CSV format and user existence
3. **Monitor Progress**: Don't leave large imports unmonitored
4. **Keep Original Files**: Store original CSV files for re-import if needed
5. **Document Issues**: Log any issues encountered for future reference
6. **Backup Database**: Take database backup before large imports
7. **Schedule Wisely**: Run large imports during off-peak hours
8. **Checkpoint Strategy**: For files > 10K rows, monitor checkpoint progress

## Rollback Procedure

If you need to rollback a backfill:

```sql
-- 1. Identify sessions created by backfill (by date range or external_session_id pattern)
SELECT COUNT(*) FROM kintell_sessions
WHERE created_at >= '2024-01-15 00:00:00'
AND created_at <= '2024-01-15 23:59:59';

-- 2. Delete sessions (with caution!)
DELETE FROM kintell_sessions
WHERE created_at >= '2024-01-15 00:00:00'
AND created_at <= '2024-01-15 23:59:59'
AND external_session_id LIKE 'kintell-%';

-- 3. Mark backfill job as failed
UPDATE backfill_jobs
SET status = 'failed'
WHERE id = 'job-uuid';
```

**Warning**: Rollback will not undo NATS events that were published. Consider impact on downstream systems.

## Support and Escalation

### L1 Support (Operations Team)
- Monitor backfill jobs
- Download and review error files
- Retry failed imports after fixing data

### L2 Support (Engineering Team)
- Debug complex errors
- Database performance issues
- Service crashes or timeouts

### L3 Support (Platform Team)
- Schema changes
- Performance optimization
- Infrastructure issues

## Appendix

### A. CSV Template

Download: [kintell_sessions_template.csv](./templates/kintell_sessions_template.csv)

### B. SQL Queries for User Validation

```sql
-- Find missing participants
SELECT DISTINCT participant_email
FROM staging_csv_table
WHERE participant_email NOT IN (SELECT email FROM users);

-- Find missing volunteers
SELECT DISTINCT volunteer_email
FROM staging_csv_table
WHERE volunteer_email NOT IN (SELECT email FROM users);

-- Bulk create users (example)
INSERT INTO users (email, name, role)
SELECT email, SPLIT_PART(email, '@', 1), 'participant'
FROM (VALUES
  ('user1@example.com'),
  ('user2@example.com')
) AS emails(email)
ON CONFLICT (email) DO NOTHING;
```

### C. Monitoring Dashboard Query

```sql
-- Daily backfill summary
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_jobs,
  SUM(successful_rows) as total_success,
  SUM(failed_rows) as total_failures,
  ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - started_at))), 2) as avg_duration_seconds
FROM backfill_jobs
WHERE status = 'completed'
AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01-15 | Initial backfill runbook |
