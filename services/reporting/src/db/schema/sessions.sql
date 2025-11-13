-- Sessions table (buddy, language, mentorship)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id UUID NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  participant_id UUID, -- anonymized participant reference
  session_type VARCHAR(50) NOT NULL, -- 'buddy', 'language', 'mentorship'
  session_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  platform VARCHAR(50), -- 'kintell', 'discord', 'zoom', etc.
  external_session_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_volunteer ON sessions(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_type ON sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_sessions_participant ON sessions(participant_id);

-- Session feedback (qualitative)
CREATE TABLE IF NOT EXISTS session_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  feedback_text TEXT NOT NULL,
  sentiment VARCHAR(20), -- 'positive', 'neutral', 'negative'
  language_code VARCHAR(5), -- ISO 639-1
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_feedback_session ON session_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_session_feedback_sentiment ON session_feedback(sentiment);
