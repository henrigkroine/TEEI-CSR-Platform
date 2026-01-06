-- Kintell and Upskilling Tables Migration
-- Creates kintell_sessions and learning_progress tables

-- Kintell Sessions
CREATE TABLE IF NOT EXISTS kintell_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_session_id VARCHAR(255),
    session_type VARCHAR(50) NOT NULL, -- language | mentorship
    participant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    volunteer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    batch_id UUID, -- Will add FK after ingestion_batches table created
    program_instance_id UUID, -- Will add FK after program_instances table created
    scheduled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    rating DECIMAL(3, 2), -- 0.00 - 1.00
    feedback_text TEXT,
    language_level VARCHAR(10), -- CEFR: A1, A2, B1, B2, C1, C2
    topics JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS kintell_sessions_batch_id_idx ON kintell_sessions(batch_id);
CREATE INDEX IF NOT EXISTS kintell_sessions_program_instance_id_idx ON kintell_sessions(program_instance_id);
CREATE INDEX IF NOT EXISTS kintell_sessions_external_session_id_idx ON kintell_sessions(external_session_id);
CREATE INDEX IF NOT EXISTS kintell_sessions_participant_id_idx ON kintell_sessions(participant_id);
CREATE INDEX IF NOT EXISTS kintell_sessions_volunteer_id_idx ON kintell_sessions(volunteer_id);
CREATE INDEX IF NOT EXISTS kintell_sessions_completed_at_idx ON kintell_sessions(completed_at);

-- Learning Progress (Upskilling)
CREATE TABLE IF NOT EXISTS learning_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(100) NOT NULL, -- ecornell, itslearning, etc.
    course_id VARCHAR(255) NOT NULL,
    course_name VARCHAR(255),
    status VARCHAR(50), -- enrolled, in_progress, completed, dropped
    progress_percent INTEGER,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    credential_ref VARCHAR(255),
    metadata JSONB,
    program_instance_id UUID, -- Will add FK after program_instances table created
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_progress_user_id ON learning_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_provider ON learning_progress(provider);
CREATE INDEX IF NOT EXISTS idx_learning_progress_status ON learning_progress(status);
CREATE INDEX IF NOT EXISTS idx_learning_progress_program_instance_id ON learning_progress(program_instance_id);




