# VIS (Volunteer Impact Score) Calculator

Calculate engagement-based impact scores for Buddy System participants using a point-based system with exponential decay.

## Overview

The VIS Calculator transforms Buddy System events into quantifiable impact scores that:
- **Weight recent activity higher** via exponential decay
- **Track engagement breadth** across multiple activity types
- **Enable leaderboards and rankings** for recognition
- **Support corporate reporting** with percentile metrics

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  VIS Calculator Service                      │
└─────────────────────────────────────────────────────────────┘

[Buddy System Events]
         │
         ├──► Event Listener (Real-time)
         │    - Polls buddy_system_events table
         │    - Approximate VIS updates (no decay)
         │    - Fast feedback (<5s latency)
         │
         └──► Batch Job (Nightly)
              - Full recalculation with decay
              - Percentile rankings
              - Runs at 2 AM (configurable)

[VIS API]
- GET /api/impact/vis/:user_id
- GET /api/impact/vis/leaderboard
- GET /api/impact/vis/percentile/:percentile
- POST /api/impact/vis/recalculate
```

## VIS Formula

```typescript
VIS = Σ (Activity Points × Decay Weight)

Activity Points:
- Match Created: 10 points
- Event Attended: 5 points
- Skill Share Completed: 15 points  ⭐⭐⭐ high value
- Feedback Submitted: 8 points
- Milestone Reached: 20 points      ⭐⭐⭐ high value
- Check-in Completed: 3 points

Decay Function:
weight = exp(-lambda × days_ago)
lambda = 0.01 (configurable)

Examples:
- Activity today: weight = 1.0
- Activity 30 days ago: weight = 0.74
- Activity 90 days ago: weight = 0.41
- Activity 180 days ago: weight = 0.17
```

## Installation

```bash
cd services/impact-calculator
pnpm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/teei_csr

# Optional (defaults shown)
PORT=3012
VIS_LAMBDA=0.01
VIS_ENABLE_DECAY=true
VIS_CRON_SCHEDULE=0 2 * * *
```

## Usage

### Run API Server

```bash
pnpm dev              # Development mode (watch)
pnpm build && pnpm start:api  # Production mode
```

API will be available at `http://localhost:3012`

### Run Batch Job

```bash
pnpm start:batch
```

This starts a cron job that recalculates all VIS scores nightly at 2 AM.

### Run Event Listener

```bash
pnpm start:listener
```

This polls `buddy_system_events` table and updates VIS scores in real-time.

### Run All Services (Recommended)

```bash
# Terminal 1: API Server
pnpm start:api

# Terminal 2: Event Listener
pnpm start:listener

# Terminal 3: Batch Job
pnpm start:batch
```

## API Endpoints

### Get VIS for User

```bash
GET /api/impact/vis/:user_id

Response:
{
  "success": true,
  "data": {
    "user_id": "buddy_user_123",
    "profile_id": "uuid-here",
    "current_vis": 3537.42,
    "raw_points": 3930,
    "decay_adjusted_points": 3537.42,
    "percentile": 99.0,
    "rank": 5,
    "activity_breakdown": {
      "matches": 10,
      "events": 50,
      "skill_shares": 80,
      "feedback": 40,
      "milestones": 100,
      "checkins": 20
    },
    "last_activity_date": "2024-01-15T12:00:00Z",
    "calculated_at": "2024-01-15T14:30:00Z"
  }
}
```

### Get Leaderboard

```bash
GET /api/impact/vis/leaderboard?limit=100

Response:
{
  "success": true,
  "data": [
    { "user_id": "user1", "current_vis": 5000.0, "rank": 1 },
    { "user_id": "user2", "current_vis": 4500.0, "rank": 2 },
    ...
  ],
  "meta": { "count": 100 }
}
```

### Get Users Above Percentile

```bash
GET /api/impact/vis/percentile/90

Response:
{
  "success": true,
  "data": [
    { "user_id": "user1", "current_vis": 5000.0, "percentile": 99.0 },
    ...
  ],
  "meta": { "count": 50 }
}
```

### Recalculate VIS

```bash
# Recalculate all users (batch)
POST /api/impact/vis/recalculate
Body: {}

# Recalculate single user
POST /api/impact/vis/recalculate
Body: { "user_id": "buddy_user_123" }

Response:
{
  "success": true,
  "data": { "message": "VIS recalculated for all users", "processed": 5000 },
  "meta": { "count": 5000, "duration": 12345 }
}
```

### Get Stats

```bash
GET /api/impact/vis/stats

Response:
{
  "success": true,
  "data": {
    "total_users": 5000,
    "average_vis": 250.5,
    "max_vis": 5000.0,
    "min_vis": 0.0,
    "median_vis": 180.0,
    "last_calculation": "2024-01-15T02:00:00Z",
    "active_last_7_days": 1200,
    "active_last_30_days": 3500
  }
}
```

## Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage
```

### Test Results (Expected)

- ✅ 40+ unit tests covering:
  - Decay function accuracy
  - Point calculations
  - Activity breakdown
  - User VIS aggregation
  - Scenario testing (active/declining users)
- ✅ Test coverage >90%

## Database Schema

The service requires the `vis_scores` table (migration `0010_add_vis_scores_table.sql`):

```sql
CREATE TABLE vis_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(100) NOT NULL UNIQUE,
  profile_id UUID REFERENCES users(id),
  current_vis DECIMAL(10,2) NOT NULL,
  raw_points INTEGER NOT NULL,
  decay_adjusted_points DECIMAL(10,2) NOT NULL,
  percentile DECIMAL(5,2),
  rank INTEGER,
  activity_breakdown JSONB NOT NULL,
  last_activity_date TIMESTAMP,
  calculated_at TIMESTAMP DEFAULT NOW()
);
```

Run migration:

```bash
cd packages/shared-schema
pnpm db:migrate
```

## Performance

### Targets

- **Single user query**: <200ms
- **Leaderboard (100 users)**: <1s
- **Batch recalculation (10K users)**: <2 minutes
- **Event listener latency**: <5s

### Optimization

- Indexed queries on `current_vis DESC` for leaderboards
- Batch upserts for recalculation (transaction-based)
- Real-time updates use approximate calculation (no decay)
- Nightly batch applies full decay calculations

## Deployment

### Railway

1. Add environment variables in Railway dashboard
2. Deploy service:
   ```bash
   railway up
   ```

3. Start processes:
   - API: `pnpm start:api`
   - Batch: `pnpm start:batch`
   - Listener: `pnpm start:listener`

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN pnpm install --production
COPY dist ./dist
CMD ["node", "dist/api.js"]
```

## Monitoring

### Key Metrics

- VIS calculation duration (batch job)
- API response times (p50, p95, p99)
- Event processing lag (listener)
- User count by percentile (top 10%, 25%, etc.)

### Health Checks

```bash
curl http://localhost:3012/health

Response:
{
  "status": "healthy",
  "timestamp": "2024-01-15T14:30:00Z",
  "service": "vis-api",
  "version": "1.0.0"
}
```

## Troubleshooting

### Issue: VIS not updating after new event

**Cause**: Event listener not running or polling too slowly

**Solution**:
1. Check event listener is running: `ps aux | grep event-listener`
2. Reduce poll interval: `VIS_POLL_INTERVAL=1000`
3. Manually trigger recalculation: `POST /api/impact/vis/recalculate`

### Issue: Batch job not running

**Cause**: Cron schedule misconfigured or job crashed

**Solution**:
1. Check cron schedule: `VIS_CRON_SCHEDULE=0 2 * * *` (valid cron syntax)
2. Run manually: `pnpm start:batch`
3. Check logs for errors

### Issue: Percentiles are null

**Cause**: Batch recalculation hasn't run yet

**Solution**:
- Wait for nightly batch job (2 AM)
- Or trigger manually: `POST /api/impact/vis/recalculate`

## Contributing

See main repository [CONTRIBUTING.md](../../CONTRIBUTING.md)

## License

MIT
