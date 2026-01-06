-- Buddy System Tables Migration
-- Creates buddy_matches, buddy_events, buddy_checkins, buddy_feedback, and buddy_system_events tables

-- Buddy Matches
CREATE TABLE IF NOT EXISTS buddy_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    buddy_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    matched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, inactive, ended
    ended_at TIMESTAMPTZ,
    program_instance_id UUID -- Will add FK after program_instances table created
);

CREATE INDEX IF NOT EXISTS idx_buddy_matches_participant_id ON buddy_matches(participant_id);
CREATE INDEX IF NOT EXISTS idx_buddy_matches_buddy_id ON buddy_matches(buddy_id);
CREATE INDEX IF NOT EXISTS idx_buddy_matches_status ON buddy_matches(status);
CREATE INDEX IF NOT EXISTS idx_buddy_matches_participants ON buddy_matches(participant_id, status);

-- Buddy Events
CREATE TABLE IF NOT EXISTS buddy_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES buddy_matches(id) ON DELETE CASCADE,
    event_type VARCHAR(100), -- hangout, activity, workshop, etc.
    event_date TIMESTAMPTZ,
    description TEXT,
    location VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buddy_events_match_id ON buddy_events(match_id);
CREATE INDEX IF NOT EXISTS idx_buddy_events_event_date ON buddy_events(event_date);

-- Buddy Checkins
CREATE TABLE IF NOT EXISTS buddy_checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES buddy_matches(id) ON DELETE CASCADE,
    checkin_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    mood VARCHAR(50), -- great, good, okay, struggling, difficult
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_buddy_checkins_match_id ON buddy_checkins(match_id);
CREATE INDEX IF NOT EXISTS idx_buddy_checkins_checkin_date ON buddy_checkins(checkin_date);

-- Buddy Feedback
CREATE TABLE IF NOT EXISTS buddy_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES buddy_matches(id) ON DELETE CASCADE,
    from_role VARCHAR(50) NOT NULL, -- participant | buddy
    rating DECIMAL(3, 2) NOT NULL, -- 0.00 - 1.00
    feedback_text TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buddy_feedback_match_id ON buddy_feedback(match_id);
CREATE INDEX IF NOT EXISTS idx_buddy_feedback_from_role ON buddy_feedback(from_role);

-- Buddy System Events (for webhook event storage)
CREATE TABLE IF NOT EXISTS buddy_system_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL UNIQUE, -- From event payload (BaseEvent.id)
    event_type VARCHAR(100) NOT NULL, -- buddy.match.created, etc.
    user_id VARCHAR(100), -- Primary user ID (participantId, volunteerId, etc.)
    timestamp TIMESTAMPTZ NOT NULL, -- Event timestamp
    payload JSONB NOT NULL, -- Full event payload
    correlation_id UUID, -- For event tracing
    processed_at TIMESTAMPTZ, -- When processed to domain tables
    derived_metrics JSONB DEFAULT '[]', -- Tracks which metrics have been derived from this event
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS buddy_events_user_timestamp_idx ON buddy_system_events(user_id, timestamp);
CREATE INDEX IF NOT EXISTS buddy_events_event_type_idx ON buddy_system_events(event_type);
CREATE INDEX IF NOT EXISTS buddy_events_event_id_idx ON buddy_system_events(event_id);




