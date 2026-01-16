-- CSR Cockpit - Core Database Schema
-- Database: D1 (SQLite)
-- Created: 2026-01-16

-- ============================================
-- COMPANIES (Tenant Organizations)
-- ============================================
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  industry TEXT,
  employee_count INTEGER,
  settings TEXT DEFAULT '{}', -- JSON config
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);

-- ============================================
-- USERS (Platform Users)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  password_hash TEXT, -- NULL for SSO users
  role TEXT DEFAULT 'viewer', -- admin, manager, viewer
  avatar_url TEXT,
  last_login TEXT,
  email_verified INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- COMPANY_USERS (User-Company Relationships)
-- ============================================
CREATE TABLE IF NOT EXISTS company_users (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'viewer', -- admin, manager, viewer
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_company_users_user ON company_users(user_id);
CREATE INDEX IF NOT EXISTS idx_company_users_company ON company_users(company_id);

-- ============================================
-- SESSIONS (Auth Sessions)
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ============================================
-- PROGRAMS (TEEI Programs)
-- ============================================
CREATE TABLE IF NOT EXISTS programs (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL, -- 'mfu', 'lc', 'wbp', 'skills'
  name TEXT NOT NULL,
  description TEXT,
  hourly_value REAL DEFAULT 220, -- Taproot standard for skilled volunteering
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Seed default programs
INSERT OR IGNORE INTO programs (id, code, name, description, hourly_value) VALUES
  ('prog_mfu', 'mfu', 'Mentors for Ukraine', 'Professional career mentorship for Ukrainian professionals', 220),
  ('prog_lc', 'lc', 'Language Connect', 'Language conversation practice and cultural exchange', 220),
  ('prog_wbp', 'wbp', 'Women Buddy Program', 'Peer support and mentorship for refugee women', 150),
  ('prog_skills', 'skills', 'Skills Academy', 'Technical skills training and professional development', 220);

-- ============================================
-- VOLUNTEERS (Corporate Employee Volunteers)
-- ============================================
CREATE TABLE IF NOT EXISTS volunteers (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  department TEXT,
  job_title TEXT,
  total_hours REAL DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  vis_score REAL DEFAULT 0, -- Volunteer Impact Score
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, email)
);

CREATE INDEX IF NOT EXISTS idx_volunteers_company ON volunteers(company_id);
CREATE INDEX IF NOT EXISTS idx_volunteers_email ON volunteers(email);

-- ============================================
-- VOLUNTEER_SESSIONS (Activity Records)
-- ============================================
CREATE TABLE IF NOT EXISTS volunteer_sessions (
  id TEXT PRIMARY KEY,
  volunteer_id TEXT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  program_id TEXT NOT NULL REFERENCES programs(id),
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  session_date TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  description TEXT,
  feedback TEXT,
  outcome_score REAL, -- 0-100
  beneficiary_count INTEGER DEFAULT 1,
  evidence_url TEXT,
  status TEXT DEFAULT 'completed', -- scheduled, completed, cancelled
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_volunteer_sessions_volunteer ON volunteer_sessions(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_sessions_company ON volunteer_sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_sessions_date ON volunteer_sessions(session_date);

-- ============================================
-- SROI_SNAPSHOTS (Calculated Metrics)
-- ============================================
CREATE TABLE IF NOT EXISTS sroi_snapshots (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period TEXT NOT NULL, -- '2024-Q1', '2024-01', 'ytd-2024'
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  total_hours REAL NOT NULL DEFAULT 0,
  total_value REAL NOT NULL DEFAULT 0,
  total_volunteers INTEGER NOT NULL DEFAULT 0,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  total_beneficiaries INTEGER NOT NULL DEFAULT 0,
  sroi_ratio REAL NOT NULL DEFAULT 0,
  avg_vis_score REAL DEFAULT 0,
  program_breakdown TEXT, -- JSON
  calculated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, period)
);

CREATE INDEX IF NOT EXISTS idx_sroi_snapshots_company ON sroi_snapshots(company_id);
CREATE INDEX IF NOT EXISTS idx_sroi_snapshots_period ON sroi_snapshots(period);

-- ============================================
-- REPORTS (Generated Reports)
-- ============================================
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- 'quarterly', 'annual', 'csrd', 'custom'
  period_start TEXT,
  period_end TEXT,
  content TEXT, -- JSON or markdown
  pdf_url TEXT,
  status TEXT DEFAULT 'draft', -- draft, published, archived
  created_by TEXT REFERENCES users(id),
  published_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reports_company ON reports(company_id);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);

-- ============================================
-- CAMPAIGNS (VTO Campaigns)
-- ============================================
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  goal_hours REAL,
  goal_volunteers INTEGER,
  start_date TEXT NOT NULL,
  end_date TEXT,
  status TEXT DEFAULT 'active', -- draft, active, completed, cancelled
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_campaigns_company ON campaigns(company_id);

-- ============================================
-- PASSWORD_RESET_TOKENS
-- ============================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);

-- ============================================
-- AUDIT_LOG (Activity Tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  company_id TEXT REFERENCES companies(id),
  action TEXT NOT NULL, -- 'login', 'logout', 'report.create', etc.
  resource_type TEXT,
  resource_id TEXT,
  details TEXT, -- JSON
  ip_address TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_company ON audit_log(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);
