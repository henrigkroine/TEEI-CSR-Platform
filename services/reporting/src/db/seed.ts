import { pool } from './connection.js';

export async function seedDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Seed sample company
    const companyResult = await client.query(`
      INSERT INTO companies (id, name, industry, size, country_code, settings)
      VALUES (
        '00000000-0000-0000-0000-000000000001'::uuid,
        'ACME Corp',
        'Technology',
        'large',
        'USA',
        '{"impact_in_enabled": true, "discord_webhooks": true}'::jsonb
      )
      ON CONFLICT (id) DO NOTHING
      RETURNING id;
    `);

    const companyId = companyResult.rows[0]?.id || '00000000-0000-0000-0000-000000000001';

    // Seed sample volunteers
    const volunteers = [
      { first_name: 'Alice', last_name: 'Johnson', role: 'Software Engineer', department: 'Engineering' },
      { first_name: 'Bob', last_name: 'Smith', role: 'Product Manager', department: 'Product' },
      { first_name: 'Carol', last_name: 'Williams', role: 'Designer', department: 'Design' },
      { first_name: 'David', last_name: 'Brown', role: 'Data Scientist', department: 'Engineering' },
      { first_name: 'Eve', last_name: 'Davis', role: 'Marketing Manager', department: 'Marketing' },
    ];

    for (const [idx, vol] of volunteers.entries()) {
      await client.query(`
        INSERT INTO volunteers (id, company_id, first_name, last_name, role, department, external_id)
        VALUES (
          $1::uuid,
          $2::uuid,
          $3,
          $4,
          $5,
          $6,
          $7
        )
        ON CONFLICT (id) DO NOTHING;
      `, [
        `00000000-0000-0000-0000-00000000000${idx + 2}`,
        companyId,
        vol.first_name,
        vol.last_name,
        vol.role,
        vol.department,
        `EMP-${1000 + idx}`,
      ]);
    }

    // Seed sample sessions and outcomes
    const participantIds = Array.from({ length: 10 }, (_, i) =>
      `10000000-0000-0000-0000-00000000000${i + 1}`
    );

    // Create sample sessions over the past 6 months
    const now = new Date();
    for (let month = 0; month < 6; month++) {
      const sessionDate = new Date(now);
      sessionDate.setMonth(sessionDate.getMonth() - month);

      for (let i = 0; i < 5; i++) {
        const volunteerId = `00000000-0000-0000-0000-00000000000${(i % 5) + 2}`;
        const participantId = participantIds[i * 2];

        await client.query(`
          INSERT INTO sessions (volunteer_id, participant_id, session_type, session_date, duration_minutes, platform)
          VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6);
        `, [volunteerId, participantId, 'buddy', sessionDate, 60, 'discord']);

        // Add volunteer hours
        await client.query(`
          INSERT INTO volunteer_hours (volunteer_id, session_date, hours, activity_type)
          VALUES ($1::uuid, $2::date, $3, $4);
        `, [volunteerId, sessionDate.toISOString().split('T')[0], 1.0, 'buddy']);
      }
    }

    // Seed sample outcome scores
    for (const participantId of participantIds.slice(0, 5)) {
      const quarter = '2025-Q1';
      const dimensions = ['integration', 'language', 'job_readiness'];

      for (const dimension of dimensions) {
        const score = 0.5 + Math.random() * 0.4; // 0.5-0.9
        await client.query(`
          INSERT INTO outcome_scores (participant_id, company_id, dimension, score, measured_at, quarter, source, confidence)
          VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8);
        `, [participantId, companyId, dimension, score.toFixed(2), now, quarter, 'q2q', 0.85]);
      }
    }

    await client.query('COMMIT');
    console.log('✅ Database seeded successfully');
    console.log(`   - Company: ACME Corp (${companyId})`);
    console.log(`   - Volunteers: ${volunteers.length}`);
    console.log(`   - Sessions: ~30 over 6 months`);
    console.log(`   - Outcome scores: ${participantIds.slice(0, 5).length * 3} data points`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run seed if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
