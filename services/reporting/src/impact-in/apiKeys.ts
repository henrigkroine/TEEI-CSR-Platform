import { pool } from '../db/connection.js';
import crypto from 'crypto';

/**
 * Generate a new API key for a company
 */
export async function generateApiKey(
  companyId: string,
  name: string,
  scopes: string[] = ['read', 'write'],
  rateLimitPerHour: number = 1000
): Promise<{ key: string; id: string }> {
  const apiKey = `teei_${crypto.randomBytes(32).toString('hex')}`;
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO company_api_keys (company_id, key_hash, name, scopes, rate_limit_per_hour)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [companyId, keyHash, name, scopes, rateLimitPerHour]
    );

    return { key: apiKey, id: result.rows[0].id };
  } finally {
    client.release();
  }
}

/**
 * Verify an API key and return company ID
 */
export async function verifyApiKey(apiKey: string): Promise<{ companyId: string; scopes: string[] } | null> {
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT company_id, scopes FROM company_api_keys
       WHERE key_hash = $1 AND is_active = true
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [keyHash]
    );

    if (result.rows.length === 0) {
      return null;
    }

    // Update last_used_at
    await client.query(
      `UPDATE company_api_keys SET last_used_at = NOW() WHERE key_hash = $1`,
      [keyHash]
    );

    return {
      companyId: result.rows[0].company_id,
      scopes: result.rows[0].scopes,
    };
  } finally {
    client.release();
  }
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(keyId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE company_api_keys SET is_active = false WHERE id = $1`,
      [keyId]
    );
  } finally {
    client.release();
  }
}
