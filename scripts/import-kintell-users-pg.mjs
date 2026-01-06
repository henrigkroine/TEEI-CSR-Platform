#!/usr/bin/env node
/**
 * Kintell User Import Script (Direct PostgreSQL)
 * Imports users from Kintell CSV export (LFU/MFU)
 */

import pg from 'pg';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';

const { Pool } = pg;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://teei:teei_dev_password@localhost:5434/teei_platform',
});

// Map Kintell role to platform role
function mapKintellRole(roleWhenJoined) {
  if (!roleWhenJoined) return 'participant';
  const role = roleWhenJoined.toLowerCase().replace(/"/g, '');
  if (role.includes('advisor') || role.includes('mentor') || role.includes('tutor')) {
    return 'volunteer';
  }
  if (role.includes('learner') || role.includes('mentee') || role.includes('student')) {
    return 'participant';
  }
  return 'participant';
}

// Parse name into first and last name
function parseName(fullName) {
  if (!fullName) return { firstName: null, lastName: null };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: null };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

// Parse date from Kintell format (e.g., "Dec 14, 2025")
function parseKintellDate(dateStr) {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

async function importUsers(csvPath) {
  console.log(`\n📂 Reading CSV file: ${csvPath}\n`);

  const csvContent = readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  console.log(`📊 Found ${records.length} records to process\n`);

  const results = {
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  const client = await pool.connect();

  try {
    for (let i = 0; i < records.length; i++) {
      const row = records[i];

      try {
        // Extract email
        const email = (row.Email || row.email || row.EMAIL || '').trim().toLowerCase();

        if (!email || !email.includes('@')) {
          results.errors.push({
            row: i + 1,
            email: email || '(empty)',
            error: 'Invalid or missing email address',
          });
          results.skipped++;
          continue;
        }

        // Parse name
        const fullName = row.Name || row.name || row.NAME || '';
        const { firstName, lastName } = parseName(fullName);

        // Determine role
        const roleWhenJoined = row['Role when joined'] || row.role_when_joined || null;
        const role = mapKintellRole(roleWhenJoined);

        // Build journey flags
        const journeyFlags = {
          kintell_source: true,
          verification_status: row.Verification_status || row.verification_status || null,
          linkedin_url: row.Linkedin_URL || row.linkedin_url || null,
          grant_access: row.grant_access === 'true',
          role_when_joined: roleWhenJoined,
          imported_at: new Date().toISOString(),
        };

        // Parse join date
        const joinedAt = parseKintellDate(row.Joined_kg_at || row.joined_kg_at || null);

        // Check if user exists
        const existingResult = await client.query(
          'SELECT id, first_name, last_name, journey_flags FROM users WHERE email = $1 LIMIT 1',
          [email]
        );

        if (existingResult.rows.length > 0) {
          // Update existing user
          const existingUser = existingResult.rows[0];
          const mergedFlags = {
            ...(existingUser.journey_flags || {}),
            ...journeyFlags,
          };

          await client.query(
            `UPDATE users SET
              first_name = COALESCE($1, first_name),
              last_name = COALESCE($2, last_name),
              journey_flags = $3,
              updated_at = NOW()
            WHERE id = $4`,
            [firstName, lastName, JSON.stringify(mergedFlags), existingUser.id]
          );

          // Check if external ID mapping exists
          const mappingResult = await client.query(
            'SELECT id FROM user_external_ids WHERE profile_id = $1 AND provider = $2 LIMIT 1',
            [existingUser.id, 'kintell']
          );

          if (mappingResult.rows.length === 0) {
            await client.query(
              `INSERT INTO user_external_ids (id, profile_id, provider, external_id, metadata, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
              [randomUUID(), existingUser.id, 'kintell', email, JSON.stringify(journeyFlags)]
            );
          }

          results.updated++;
        } else {
          // Create new user
          const userId = randomUUID();
          const createdAt = joinedAt || new Date();

          await client.query(
            `INSERT INTO users (id, email, first_name, last_name, role, journey_flags, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
            [userId, email, firstName, lastName, role, JSON.stringify(journeyFlags), createdAt]
          );

          // Create external ID mapping
          await client.query(
            `INSERT INTO user_external_ids (id, profile_id, provider, external_id, metadata, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
            [randomUUID(), userId, 'kintell', email, JSON.stringify(journeyFlags)]
          );

          results.created++;
        }

        // Progress indicator
        if ((i + 1) % 500 === 0) {
          console.log(`  ⏳ Processed ${i + 1}/${records.length} records...`);
        }
      } catch (error) {
        results.errors.push({
          row: i + 1,
          email: row.Email || row.email || '(unknown)',
          error: error.message,
        });
      } finally {
        results.processed++;
      }
    }
  } finally {
    client.release();
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 IMPORT RESULTS');
  console.log('='.repeat(50));
  console.log(`✅ Total Processed: ${results.processed}`);
  console.log(`🆕 Created: ${results.created}`);
  console.log(`🔄 Updated: ${results.updated}`);
  console.log(`⏭️  Skipped: ${results.skipped}`);
  console.log(`❌ Errors: ${results.errors.length}`);

  if (results.errors.length > 0) {
    console.log('\n⚠️  First 10 errors:');
    results.errors.slice(0, 10).forEach((err) => {
      console.log(`  Row ${err.row} (${err.email}): ${err.error}`);
    });
  }

  console.log('\n✨ Import complete!\n');

  await pool.end();
  process.exit(0);
}

// Get CSV path from command line
const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: node scripts/import-kintell-users-pg.mjs <csv-file-path>');
  process.exit(1);
}

importUsers(csvPath).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
