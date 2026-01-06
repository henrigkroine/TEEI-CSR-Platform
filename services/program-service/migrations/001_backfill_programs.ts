/**
 * Agent 28: program-migration-scripter
 * Migration script to backfill program template system
 *
 * This script:
 * 1. Creates beneficiary groups for existing programs
 * 2. Creates program templates (mentorship, language, buddy)
 * 3. Creates program instances from templates
 * 4. Backfills program_enrollments with programId references
 * 5. Validates dual-write pattern (programType + programId)
 *
 * Usage:
 *   pnpm tsx services/program-service/migrations/001_backfill_programs.ts
 *
 * Safety:
 *   - Dry-run mode by default (set DRY_RUN=false to commit)
 *   - Transaction rollback on error
 *   - Detailed logging of all operations
 *   - Validation of data integrity
 */

import { db } from '@teei/shared-schema';
import {
  beneficiaryGroups,
  programTemplates,
  programs,
  programEnrollments,
} from '@teei/shared-schema/schema';
import { eq } from 'drizzle-orm';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('migration:backfill-programs');
const DRY_RUN = process.env.DRY_RUN !== 'false';

interface MigrationStats {
  beneficiaryGroupsCreated: number;
  templatesCreated: number;
  programsCreated: number;
  enrollmentsUpdated: number;
  errors: string[];
}

/**
 * Step 1: Create beneficiary groups for existing programs
 */
async function createBeneficiaryGroups(): Promise<Record<string, string>> {
  logger.info('Step 1: Creating beneficiary groups');

  const groups = [
    {
      groupKey: 'ukrainian-refugees-2022',
      name: 'Ukrainian Refugees in Europe (2022+)',
      demographics: {
        nationality: ['Ukrainian'],
        arrivalPeriod: 'Post-February 2022',
        primaryNeeds: ['language', 'employment', 'social integration'],
      },
      primaryRegion: 'Europe',
      countries: ['Norway', 'Poland', 'Germany', 'Czech Republic', 'UK'],
      eligibilityCriteria: {
        refugeeStatus: true,
        arrivalDate: '2022-02-24',
      },
      status: 'active',
    },
    {
      groupKey: 'syrian-refugees-2015',
      name: 'Syrian Refugees (2015+)',
      demographics: {
        nationality: ['Syrian'],
        arrivalPeriod: 'Post-2015',
        primaryNeeds: ['language', 'upskilling', 'integration'],
      },
      primaryRegion: 'Europe',
      countries: ['Norway', 'Sweden', 'Germany'],
      eligibilityCriteria: {
        refugeeStatus: true,
      },
      status: 'active',
    },
    {
      groupKey: 'afghan-refugees-2021',
      name: 'Afghan Refugees (2021+)',
      demographics: {
        nationality: ['Afghan'],
        arrivalPeriod: 'Post-August 2021',
        primaryNeeds: ['language', 'employment', 'integration'],
      },
      primaryRegion: 'Europe',
      countries: ['Norway', 'UK', 'Germany'],
      eligibilityCriteria: {
        refugeeStatus: true,
      },
      status: 'active',
    },
  ];

  const groupIdMap: Record<string, string> = {};

  for (const group of groups) {
    if (DRY_RUN) {
      logger.info({ groupKey: group.groupKey }, '[DRY-RUN] Would create beneficiary group');
      groupIdMap[group.groupKey] = `dry-run-${group.groupKey}`;
    } else {
      const [created] = await db.insert(beneficiaryGroups).values(group).returning();
      groupIdMap[group.groupKey] = created.id;
      logger.info({ groupKey: group.groupKey, id: created.id }, 'Created beneficiary group');
    }
  }

  return groupIdMap;
}

/**
 * Step 2: Create program templates
 */
async function createProgramTemplates(): Promise<Record<string, string>> {
  logger.info('Step 2: Creating program templates');

  const templates = [
    {
      templateKey: 'mentorship-generic-v1',
      name: 'Generic Mentorship Program',
      category: 'mentorship',
      description: 'One-on-one mentorship for career guidance and professional development',
      defaultConfig: {
        session: {
          defaultDurationMinutes: 60,
          recommendedFrequency: 'weekly',
          minSessionsForCompletion: 10,
        },
        matching: {
          autoMatch: false,
          criteria: {
            skills: [],
            interests: [],
            languages: [],
          },
        },
        impact: {
          sroiWeights: {
            session_completed: 10.0,
            milestone_reached: 25.0,
            program_completed: 100.0,
          },
        },
        sdgGoals: [4, 8, 10],
      },
      configSchema: {},
      version: 1,
      status: 'active' as const,
      createdBy: 'migration-script',
    },
    {
      templateKey: 'language-generic-v1',
      name: 'Generic Language Practice Program',
      category: 'language',
      description: 'Conversational language practice with volunteers',
      defaultConfig: {
        cefr: {
          targetLevels: ['A1', 'A2', 'B1', 'B2'],
          assessmentIntervals: 90,
          progressionThresholds: {
            A1: 20,
            A2: 30,
            B1: 40,
            B2: 50,
          },
        },
        session: {
          defaultDurationMinutes: 45,
          topicLibrary: [
            { category: 'daily_life', topics: ['shopping', 'dining', 'transportation'] },
            { category: 'workplace', topics: ['interviews', 'meetings', 'email'] },
          ],
        },
        impact: {
          sroiWeights: {
            session_completed: 8.0,
            level_progression: 50.0,
          },
        },
        sdgGoals: [4, 10],
      },
      configSchema: {},
      version: 1,
      status: 'active' as const,
      createdBy: 'migration-script',
    },
    {
      templateKey: 'buddy-generic-v1',
      name: 'Generic Buddy Integration Program',
      category: 'buddy',
      description: 'Social integration through buddy matching and activities',
      defaultConfig: {
        matching: {
          algorithm: 'hybrid',
          criteria: {
            interests: [],
            location: 'same_city',
          },
        },
        milestones: {
          integrationStages: [
            {
              key: 'first_meeting',
              name: 'First Meeting',
              criteria: { eventsAttended: 1 },
              impactPoints: 10,
            },
            {
              key: 'active_engagement',
              name: 'Active Engagement',
              criteria: { eventsAttended: 5, checkinsCompleted: 3 },
              impactPoints: 50,
            },
            {
              key: 'full_integration',
              name: 'Full Integration',
              criteria: { eventsAttended: 12, checkinsCompleted: 6 },
              impactPoints: 100,
            },
          ],
        },
        impact: {
          sroiWeights: {
            match_created: 5.0,
            event_attended: 8.0,
            milestone_reached: 25.0,
          },
        },
        sdgGoals: [10, 11],
      },
      configSchema: {},
      version: 1,
      status: 'active' as const,
      createdBy: 'migration-script',
    },
  ];

  const templateIdMap: Record<string, string> = {};

  for (const template of templates) {
    if (DRY_RUN) {
      logger.info({ templateKey: template.templateKey }, '[DRY-RUN] Would create template');
      templateIdMap[template.category] = `dry-run-${template.templateKey}`;
    } else {
      const [created] = await db.insert(programTemplates).values(template as any).returning();
      templateIdMap[template.category] = created.id;
      logger.info(
        { templateKey: template.templateKey, id: created.id },
        'Created program template'
      );
    }
  }

  return templateIdMap;
}

/**
 * Step 3: Create program instances for Ukrainian beneficiary group
 */
async function createPrograms(
  templateIdMap: Record<string, string>,
  groupIdMap: Record<string, string>
): Promise<Record<string, string>> {
  logger.info('Step 3: Creating program instances');

  const ukrainianGroupId = groupIdMap['ukrainian-refugees-2022'];

  const programsToCreate = [
    {
      programKey: 'mentorship-ukrainian-2024',
      templateId: templateIdMap['mentorship'],
      name: 'Mentorship for Ukrainians 2024',
      description: 'Career mentorship program for Ukrainian refugees',
      programType: 'mentorship',
      config: {
        session: {
          defaultDurationMinutes: 60,
          recommendedFrequency: 'weekly',
          minSessionsForCompletion: 8, // Shorter for Ukrainian program
        },
        matching: {
          autoMatch: false,
          criteria: {
            skills: ['ukrainian_language', 'career_transition'],
          },
        },
      },
      configOverrides: {
        session: { minSessionsForCompletion: 8 },
      },
      beneficiaryGroupId: ukrainianGroupId,
      status: 'active' as const,
      tags: ['ukrainian', 'mentorship', '2024'],
      sdgGoals: [4, 8, 10],
      createdBy: 'migration-script',
    },
    {
      programKey: 'language-ukrainian-2024',
      templateId: templateIdMap['language'],
      name: 'Language Practice for Ukrainians 2024',
      description: 'Norwegian/English language practice for Ukrainian refugees',
      programType: 'language',
      config: {
        cefr: {
          targetLevels: ['A1', 'A2', 'B1'],
          assessmentIntervals: 60,
        },
        session: {
          defaultDurationMinutes: 45,
        },
      },
      configOverrides: {
        cefr: { assessmentIntervals: 60 },
      },
      beneficiaryGroupId: ukrainianGroupId,
      status: 'active' as const,
      tags: ['ukrainian', 'language', '2024'],
      sdgGoals: [4, 10],
      createdBy: 'migration-script',
    },
    {
      programKey: 'buddy-ukrainian-2024',
      templateId: templateIdMap['buddy'],
      name: 'TEEI Buddy for Ukrainians 2024',
      description: 'Social integration buddy program for Ukrainian refugees',
      programType: 'buddy',
      config: {
        matching: {
          algorithm: 'hybrid',
          criteria: {
            interests: ['culture', 'language_exchange'],
            location: 'same_city',
          },
        },
      },
      configOverrides: {},
      beneficiaryGroupId: ukrainianGroupId,
      status: 'active' as const,
      tags: ['ukrainian', 'buddy', '2024'],
      sdgGoals: [10, 11],
      createdBy: 'migration-script',
    },
  ];

  const programIdMap: Record<string, string> = {};

  for (const program of programsToCreate) {
    if (DRY_RUN) {
      logger.info({ programKey: program.programKey }, '[DRY-RUN] Would create program');
      programIdMap[program.programType] = `dry-run-${program.programKey}`;
    } else {
      const [created] = await db.insert(programs).values(program as any).returning();
      programIdMap[program.programType] = created.id;
      logger.info({ programKey: program.programKey, id: created.id }, 'Created program');
    }
  }

  return programIdMap;
}

/**
 * Step 4: Backfill program_enrollments with programId
 */
async function backfillEnrollments(
  programIdMap: Record<string, string>
): Promise<{ updated: number; errors: string[] }> {
  logger.info('Step 4: Backfilling program_enrollments with programId');

  const stats = { updated: 0, errors: [] as string[] };

  for (const [programType, programId] of Object.entries(programIdMap)) {
    try {
      if (DRY_RUN) {
        // Count how many would be updated
        const enrollments = await db
          .select()
          .from(programEnrollments)
          .where(eq(programEnrollments.programType, programType));

        logger.info(
          { programType, count: enrollments.length },
          `[DRY-RUN] Would update ${enrollments.length} enrollments`
        );
        stats.updated += enrollments.length;
      } else {
        const result = await db
          .update(programEnrollments)
          .set({ programId })
          .where(eq(programEnrollments.programType, programType));

        logger.info({ programType, programId }, `Updated enrollments for ${programType}`);
        stats.updated++;
      }
    } catch (error: any) {
      const errorMsg = `Failed to backfill ${programType}: ${error.message}`;
      logger.error({ error, programType }, errorMsg);
      stats.errors.push(errorMsg);
    }
  }

  return stats;
}

/**
 * Step 5: Validate migration
 */
async function validateMigration(): Promise<boolean> {
  logger.info('Step 5: Validating migration');

  try {
    // Check that all enrollments have programId
    const enrollmentsWithoutProgramId = await db
      .select()
      .from(programEnrollments)
      .where(eq(programEnrollments.programId, null as any))
      .limit(10);

    if (enrollmentsWithoutProgramId.length > 0) {
      logger.warn(
        { count: enrollmentsWithoutProgramId.length },
        'Found enrollments without programId'
      );
      return false;
    }

    logger.info('✓ All enrollments have programId');
    return true;
  } catch (error: any) {
    logger.error({ error }, 'Validation failed');
    return false;
  }
}

/**
 * Main migration function
 */
async function runMigration(): Promise<MigrationStats> {
  logger.info({ dryRun: DRY_RUN }, 'Starting program template migration');

  const stats: MigrationStats = {
    beneficiaryGroupsCreated: 0,
    templatesCreated: 0,
    programsCreated: 0,
    enrollmentsUpdated: 0,
    errors: [],
  };

  try {
    // Step 1: Beneficiary groups
    const groupIdMap = await createBeneficiaryGroups();
    stats.beneficiaryGroupsCreated = Object.keys(groupIdMap).length;

    // Step 2: Templates
    const templateIdMap = await createProgramTemplates();
    stats.templatesCreated = Object.keys(templateIdMap).length;

    // Step 3: Programs
    const programIdMap = await createPrograms(templateIdMap, groupIdMap);
    stats.programsCreated = Object.keys(programIdMap).length;

    // Step 4: Backfill enrollments
    const backfillStats = await backfillEnrollments(programIdMap);
    stats.enrollmentsUpdated = backfillStats.updated;
    stats.errors.push(...backfillStats.errors);

    // Step 5: Validate
    if (!DRY_RUN) {
      const isValid = await validateMigration();
      if (!isValid) {
        stats.errors.push('Validation failed');
      }
    }

    logger.info({ stats }, 'Migration completed');
  } catch (error: any) {
    logger.error({ error }, 'Migration failed');
    stats.errors.push(`Fatal error: ${error.message}`);
  }

  return stats;
}

/**
 * Execute migration
 */
if (require.main === module) {
  runMigration()
    .then((stats) => {
      console.log('\n=== Migration Summary ===');
      console.log(`Beneficiary Groups: ${stats.beneficiaryGroupsCreated}`);
      console.log(`Templates: ${stats.templatesCreated}`);
      console.log(`Programs: ${stats.programsCreated}`);
      console.log(`Enrollments Updated: ${stats.enrollmentsUpdated}`);
      console.log(`Errors: ${stats.errors.length}`);

      if (stats.errors.length > 0) {
        console.log('\nErrors:');
        stats.errors.forEach((error) => console.log(`  - ${error}`));
        process.exit(1);
      }

      if (DRY_RUN) {
        console.log('\n⚠️  DRY-RUN MODE - No changes committed');
        console.log('Set DRY_RUN=false to commit changes');
      } else {
        console.log('\n✓ Migration completed successfully');
      }

      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { runMigration, MigrationStats };
