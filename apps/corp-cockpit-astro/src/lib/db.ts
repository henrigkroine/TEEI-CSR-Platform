/**
 * D1 Database Helper for CSR Cockpit
 *
 * Provides type-safe database access for Cloudflare D1.
 *
 * Usage in Astro API routes:
 * ```ts
 * import { getDb, query } from '@lib/db';
 *
 * export const GET: APIRoute = async ({ locals }) => {
 *   const db = getDb(locals.runtime.env);
 *   const users = await query(db, 'SELECT * FROM users WHERE company_id = ?', [companyId]);
 *   return new Response(JSON.stringify(users));
 * };
 * ```
 */

export interface D1Env {
  DB: D1Database;
}

/**
 * Get D1 database instance from runtime environment
 */
export function getDb(env: D1Env): D1Database {
  if (!env.DB) {
    throw new Error('D1 database binding not found. Check wrangler.toml configuration.');
  }
  return env.DB;
}

/**
 * Execute a raw SQL query with parameters
 */
export async function query<T = Record<string, unknown>>(
  db: D1Database,
  sql: string,
  params: (string | number | null)[] = []
): Promise<T[]> {
  const stmt = db.prepare(sql);
  const result = params.length > 0
    ? await stmt.bind(...params).all<T>()
    : await stmt.all<T>();
  return result.results;
}

/**
 * Execute a query and return the first result
 */
export async function queryFirst<T = Record<string, unknown>>(
  db: D1Database,
  sql: string,
  params: (string | number | null)[] = []
): Promise<T | null> {
  const stmt = db.prepare(sql);
  const result = params.length > 0
    ? await stmt.bind(...params).first<T>()
    : await stmt.first<T>();
  return result;
}

/**
 * Execute an INSERT/UPDATE/DELETE query
 */
export async function execute(
  db: D1Database,
  sql: string,
  params: (string | number | null)[] = []
): Promise<D1Result> {
  const stmt = db.prepare(sql);
  return params.length > 0
    ? await stmt.bind(...params).run()
    : await stmt.run();
}

/**
 * Execute multiple queries in a batch
 */
export async function batch(
  db: D1Database,
  queries: Array<{ sql: string; params?: (string | number | null)[] }>
): Promise<D1Result[]> {
  const statements = queries.map(({ sql, params = [] }) => {
    const stmt = db.prepare(sql);
    return params.length > 0 ? stmt.bind(...params) : stmt;
  });
  return db.batch(statements);
}

// ============================================
// Type-safe query builders
// ============================================

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  password_hash: string | null;
  role: 'admin' | 'manager' | 'viewer';
  avatar_url: string | null;
  last_login: string | null;
  email_verified: number;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  industry: string | null;
  employee_count: number | null;
  settings: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  expires_at: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface Volunteer {
  id: string;
  company_id: string;
  email: string;
  first_name: string;
  last_name: string;
  department: string | null;
  job_title: string | null;
  total_hours: number;
  total_sessions: number;
  vis_score: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface VolunteerSession {
  id: string;
  volunteer_id: string;
  program_id: string;
  company_id: string;
  session_date: string;
  duration_minutes: number;
  description: string | null;
  feedback: string | null;
  outcome_score: number | null;
  beneficiary_count: number;
  evidence_url: string | null;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
}

export interface Program {
  id: string;
  code: string;
  name: string;
  description: string | null;
  hourly_value: number;
  is_active: number;
  created_at: string;
}

export interface SroiSnapshot {
  id: string;
  company_id: string;
  period: string;
  period_start: string;
  period_end: string;
  total_hours: number;
  total_value: number;
  total_volunteers: number;
  total_sessions: number;
  total_beneficiaries: number;
  sroi_ratio: number;
  avg_vis_score: number;
  program_breakdown: string | null;
  calculated_at: string;
}

// ============================================
// Helper functions for common queries
// ============================================

/**
 * Find user by email
 */
export async function findUserByEmail(db: D1Database, email: string): Promise<User | null> {
  return queryFirst<User>(db, 'SELECT * FROM users WHERE email = ?', [email]);
}

/**
 * Find user by ID
 */
export async function findUserById(db: D1Database, id: string): Promise<User | null> {
  return queryFirst<User>(db, 'SELECT * FROM users WHERE id = ?', [id]);
}

/**
 * Get user's companies
 */
export async function getUserCompanies(db: D1Database, userId: string): Promise<Company[]> {
  return query<Company>(db, `
    SELECT c.* FROM companies c
    JOIN company_users cu ON c.id = cu.company_id
    WHERE cu.user_id = ?
  `, [userId]);
}

/**
 * Find session by ID (with user data)
 */
export async function findSessionWithUser(
  db: D1Database,
  sessionId: string
): Promise<(Session & User) | null> {
  return queryFirst<Session & User>(db, `
    SELECT s.*, u.email, u.first_name, u.last_name, u.role as user_role
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ? AND s.expires_at > datetime('now')
  `, [sessionId]);
}

/**
 * Create a new session
 */
export async function createSession(
  db: D1Database,
  userId: string,
  sessionId: string,
  expiresAt: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await execute(db, `
    INSERT INTO sessions (id, user_id, expires_at, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?)
  `, [sessionId, userId, expiresAt, ipAddress || null, userAgent || null]);
}

/**
 * Delete a session
 */
export async function deleteSession(db: D1Database, sessionId: string): Promise<void> {
  await execute(db, 'DELETE FROM sessions WHERE id = ?', [sessionId]);
}

/**
 * Get company SROI summary
 */
export async function getCompanySroiSummary(
  db: D1Database,
  companyId: string
): Promise<{
  total_hours: number;
  total_value: number;
  volunteer_count: number;
  session_count: number;
  sroi_ratio: number;
}> {
  const result = await queryFirst<{
    total_hours: number;
    total_value: number;
    volunteer_count: number;
    session_count: number;
  }>(db, `
    SELECT
      COALESCE(SUM(vs.duration_minutes) / 60.0, 0) as total_hours,
      COALESCE(SUM(vs.duration_minutes / 60.0 * p.hourly_value), 0) as total_value,
      COUNT(DISTINCT vs.volunteer_id) as volunteer_count,
      COUNT(vs.id) as session_count
    FROM volunteer_sessions vs
    JOIN programs p ON vs.program_id = p.id
    WHERE vs.company_id = ? AND vs.status = 'completed'
  `, [companyId]);

  const totalValue = result?.total_value || 0;
  const volunteerCount = result?.volunteer_count || 0;

  // Simplified SROI: value / (volunteers * average cost per volunteer)
  const estimatedCost = volunteerCount * 500; // Placeholder cost
  const sroiRatio = estimatedCost > 0 ? totalValue / estimatedCost : 0;

  return {
    total_hours: result?.total_hours || 0,
    total_value: totalValue,
    volunteer_count: volunteerCount,
    session_count: result?.session_count || 0,
    sroi_ratio: Math.round(sroiRatio * 100) / 100,
  };
}

/**
 * Generate a unique ID (nanoid-style)
 */
export function generateId(prefix: string = ''): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = prefix ? `${prefix}_` : '';
  for (let i = 0; i < 21; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
