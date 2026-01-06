-- Migration: Add VIS (Volunteer Impact Score) scores table
-- Purpose: Store calculated impact scores for Buddy System participants
-- Dependencies: buddy_system_events table (from previous migration)
-- Phase: 2 - Impact Metrics Pipeline (TASK-A-07)

-- ============================================================================
-- VIS Scores Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS vis_scores (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User identifiers
  user_id VARCHAR(100) NOT NULL, -- Buddy System user_id (external)
  profile_id UUID REFERENCES users(id) ON DELETE SET NULL, -- CSR Platform unified profile

  -- VIS metrics
  current_vis DECIMAL(10,2) NOT NULL DEFAULT 0, -- Current VIS score (decay-adjusted)
  raw_points INTEGER NOT NULL DEFAULT 0, -- Total points without decay
  decay_adjusted_points DECIMAL(10,2) NOT NULL DEFAULT 0, -- Points with decay applied

  -- Rankings
  percentile DECIMAL(5,2), -- Percentile ranking (0-100)
  rank INTEGER, -- Absolute rank (1 = highest VIS)

  -- Activity breakdown (JSONB for flexibility)
  activity_breakdown JSONB NOT NULL DEFAULT '{
    "matches": 0,
    "events": 0,
    "skill_shares": 0,
    "feedback": 0,
    "milestones": 0,
    "checkins": 0
  }'::jsonb,

  -- Metadata
  last_activity_date TIMESTAMP, -- Most recent activity timestamp
  calculated_at TIMESTAMP DEFAULT NOW(), -- When this VIS was calculated

  -- Constraints
  CONSTRAINT vis_scores_user_id_unique UNIQUE(user_id),
  CONSTRAINT vis_scores_current_vis_positive CHECK (current_vis >= 0),
  CONSTRAINT vis_scores_raw_points_positive CHECK (raw_points >= 0),
  CONSTRAINT vis_scores_percentile_range CHECK (percentile IS NULL OR (percentile >= 0 AND percentile <= 100)),
  CONSTRAINT vis_scores_rank_positive CHECK (rank IS NULL OR rank > 0)
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Leaderboard queries (ORDER BY current_vis DESC)
CREATE INDEX IF NOT EXISTS idx_vis_scores_rank
ON vis_scores(current_vis DESC);

-- Profile lookup queries
CREATE INDEX IF NOT EXISTS idx_vis_scores_profile_id
ON vis_scores(profile_id)
WHERE profile_id IS NOT NULL;

-- Percentile range queries
CREATE INDEX IF NOT EXISTS idx_vis_scores_percentile
ON vis_scores(percentile DESC)
WHERE percentile IS NOT NULL;

-- Last activity date queries (find inactive users)
CREATE INDEX IF NOT EXISTS idx_vis_scores_last_activity
ON vis_scores(last_activity_date DESC)
WHERE last_activity_date IS NOT NULL;

-- User ID lookup (fast single-user queries)
CREATE INDEX IF NOT EXISTS idx_vis_scores_user_id
ON vis_scores(user_id);

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE vis_scores IS
'Volunteer Impact Scores (VIS) for Buddy System participants. Scores are calculated using a point-based system with exponential decay to weight recent activity higher. Updated via batch recalculation (nightly) or real-time approximation on new events.';

COMMENT ON COLUMN vis_scores.user_id IS
'External user ID from Buddy System. Primary identifier for VIS calculation.';

COMMENT ON COLUMN vis_scores.profile_id IS
'Link to CSR Platform unified profile. Null if user has not been mapped to a profile yet.';

COMMENT ON COLUMN vis_scores.current_vis IS
'Current VIS score with decay applied. This is the primary metric for rankings and leaderboards.';

COMMENT ON COLUMN vis_scores.raw_points IS
'Total points earned without any decay weighting. Useful for understanding absolute engagement.';

COMMENT ON COLUMN vis_scores.decay_adjusted_points IS
'Points with exponential decay applied. Should match current_vis (kept separate for audit trail).';

COMMENT ON COLUMN vis_scores.percentile IS
'Percentile ranking (0-100) calculated as (total_users - rank + 1) / total_users * 100. Null until batch recalculation runs.';

COMMENT ON COLUMN vis_scores.rank IS
'Absolute rank among all users (1 = highest VIS). Null until batch recalculation runs.';

COMMENT ON COLUMN vis_scores.activity_breakdown IS
'JSONB object with counts for each activity type: matches, events, skill_shares, feedback, milestones, checkins. Used for detailed analytics.';

COMMENT ON COLUMN vis_scores.last_activity_date IS
'Timestamp of most recent activity event for this user. Null if user has no events.';

COMMENT ON COLUMN vis_scores.calculated_at IS
'Timestamp when this VIS score was calculated. Updated on every recalculation (batch or real-time).';

-- ============================================================================
-- Sample Queries
-- ============================================================================

-- Get leaderboard (top 100 users)
-- SELECT user_id, current_vis, rank, percentile, activity_breakdown
-- FROM vis_scores
-- ORDER BY current_vis DESC
-- LIMIT 100;

-- Get VIS for specific user
-- SELECT * FROM vis_scores WHERE user_id = 'buddy_user_123';

-- Get users in top 10%
-- SELECT user_id, current_vis, percentile
-- FROM vis_scores
-- WHERE percentile >= 90
-- ORDER BY current_vis DESC;

-- Get users who haven't been active in 30+ days
-- SELECT user_id, current_vis, last_activity_date,
--        EXTRACT(DAY FROM NOW() - last_activity_date) as days_inactive
-- FROM vis_scores
-- WHERE last_activity_date < NOW() - INTERVAL '30 days'
-- ORDER BY last_activity_date ASC;

-- ============================================================================
-- Maintenance Notes
-- ============================================================================

-- Batch recalculation should be run nightly (recommended: 2 AM)
-- This updates all VIS scores with fresh decay calculations and re-ranks users

-- Real-time updates (on new events) can approximate VIS changes:
-- UPDATE vis_scores
-- SET raw_points = raw_points + <new_points>,
--     current_vis = current_vis + <new_points>,  -- Approximate (no decay update)
--     last_activity_date = NOW(),
--     calculated_at = NOW()
-- WHERE user_id = '<user_id>';

-- Full recalculation (via VISCalculator.recalculateAll()):
-- 1. Fetches all events from buddy_system_events
-- 2. Calculates VIS with proper decay for each user
-- 3. Ranks all users and calculates percentiles
-- 4. Upserts all VIS scores in batch transaction
