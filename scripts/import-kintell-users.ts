#!/usr/bin/env tsx
/**
 * Kintell User Import Script
 * Imports users from Kintell CSV export (LFU/MFU)
 *
 * Usage: tsx scripts/import-kintell-users.ts <csv-file-path>
 */

import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { db, users, userExternalIds } from '@teei/shared-schema';
import { eq, and } from 'drizzle-orm';

// Map Kintell role to platform role
function mapKintellRole(roleWhenJoined: string | null): string {
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
function parseName(fullName: string): { firstName: string; lastName: string } {
  if (!fullName) return { firstName: '', lastName: '' };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

// Parse date from Kintell format (e.g., "Dec 14, 2025")
function parseKintellDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

async function importUsers(csvPath: string) {
  console.log(`\n📂 Reading CSV file: ${csvPath}\n`);

  const csvContent = readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Record<string, string>[];

  console.log(`📊 Found ${records.length} records to process\n`);

  const results = {
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [] as Array<{ row: number; email: string; error: string }>,
  };

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
      const journeyFlags: Record<string, any> = {
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
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser) {
        // Update existing user
        await db
          .update(users)
          .set({
            firstName: firstName || existingUser.firstName,
            lastName: lastName || existingUser.lastName,
            journeyFlags: {
              ...(existingUser.journeyFlags as Record<string, any> || {}),
              ...journeyFlags,
            },
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id));

        // Ensure external ID mapping exists
        const [existingMapping] = await db
          .select()
          .from(userExternalIds)
          .where(
            and(
              eq(userExternalIds.profileId, existingUser.id),
              eq(userExternalIds.provider, 'kintell')
            )
          )
          .limit(1);

        if (!existingMapping) {
          await db.insert(userExternalIds).values({
            profileId: existingUser.id,
            provider: 'kintell',
            externalId: email,
            metadata: journeyFlags,
          });
        }

        results.updated++;
      } else {
        // Create new user
        const [newUser] = await db
          .insert(users)
          .values({
            email,
            firstName,
            lastName,
            role,
            journeyFlags,
            createdAt: joinedAt || new Date(),
            updatedAt: new Date(),
          })
          .returning();

        // Create external ID mapping
        await db.insert(userExternalIds).values({
          profileId: newUser.id,
          provider: 'kintell',
          externalId: email,
          metadata: journeyFlags,
        });

        results.created++;
      }

      // Progress indicator
      if ((i + 1) % 100 === 0) {
        console.log(`  ⏳ Processed ${i + 1}/${records.length} records...`);
      }
    } catch (error: any) {
      results.errors.push({
        row: i + 1,
        email: row.Email || row.email || '(unknown)',
        error: error.message,
      });
    } finally {
      results.processed++;
    }
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

  process.exit(0);
}

// Get CSV path from command line
const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: tsx scripts/import-kintell-users.ts <csv-file-path>');
  process.exit(1);
}

importUsers(csvPath).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
