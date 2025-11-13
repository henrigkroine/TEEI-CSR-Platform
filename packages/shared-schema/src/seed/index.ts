import { db, sql } from '../db.js';
import { users, companies, companyUsers, programEnrollments, externalIdMappings } from '../schema/users.js';
import { kintellSessions } from '../schema/kintell.js';
import { buddyMatches, buddyEvents, buddyCheckins, buddyFeedback } from '../schema/buddy.js';
import { learningProgress } from '../schema/upskilling.js';

async function seed() {
  console.log('Seeding database...');

  try {
    // Seed companies
    console.log('Creating companies...');
    const [acmeCorp, _techCo] = await db
      .insert(companies)
      .values([
        { name: 'Acme Corporation', industry: 'Technology', country: 'USA' },
        { name: 'TechCo Inc', industry: 'Software', country: 'UK' },
      ])
      .returning();

    // Seed users
    console.log('Creating users...');
    const [_adminUser, participant1, participant2, volunteer1, volunteer2, companyUser1] = await db
      .insert(users)
      .values([
        { email: 'admin@teei.org', role: 'admin', firstName: 'Admin', lastName: 'User' },
        { email: 'alice@example.com', role: 'participant', firstName: 'Alice', lastName: 'Johnson' },
        { email: 'bob@example.com', role: 'participant', firstName: 'Bob', lastName: 'Smith' },
        { email: 'charlie@volunteer.org', role: 'volunteer', firstName: 'Charlie', lastName: 'Brown' },
        { email: 'diana@volunteer.org', role: 'volunteer', firstName: 'Diana', lastName: 'Wilson' },
        { email: 'manager@acmecorp.com', role: 'company_user', firstName: 'Eva', lastName: 'Manager' },
      ])
      .returning();

    // Link company user
    console.log('Linking company users...');
    await db.insert(companyUsers).values([
      { companyId: acmeCorp.id, userId: companyUser1.id },
    ]);

    // Seed program enrollments
    console.log('Creating program enrollments...');
    await db.insert(programEnrollments).values([
      { userId: participant1.id, programType: 'buddy', status: 'active' },
      { userId: participant1.id, programType: 'language', status: 'active' },
      { userId: participant2.id, programType: 'buddy', status: 'active' },
      { userId: participant2.id, programType: 'upskilling', status: 'active' },
    ]);

    // Seed external ID mappings
    console.log('Creating external ID mappings...');
    await db.insert(externalIdMappings).values([
      { userId: participant1.id, externalSystem: 'kintell', externalId: 'KINTELL-12345' },
      { userId: participant1.id, externalSystem: 'discord', externalId: 'DISCORD-98765' },
      { userId: participant2.id, externalSystem: 'kintell', externalId: 'KINTELL-67890' },
    ]);

    // Seed buddy matches
    console.log('Creating buddy matches...');
    const [match1, match2] = await db
      .insert(buddyMatches)
      .values([
        { participantId: participant1.id, buddyId: volunteer1.id, status: 'active' },
        { participantId: participant2.id, buddyId: volunteer2.id, status: 'active' },
      ])
      .returning();

    // Seed buddy events
    console.log('Creating buddy events...');
    await db.insert(buddyEvents).values([
      {
        matchId: match1.id,
        eventType: 'hangout',
        eventDate: new Date('2025-11-01T14:00:00Z'),
        description: 'Coffee meetup at local cafe',
        location: 'Downtown Cafe',
      },
      {
        matchId: match1.id,
        eventType: 'activity',
        eventDate: new Date('2025-11-08T16:00:00Z'),
        description: 'Museum visit',
        location: 'City Museum',
      },
    ]);

    // Seed buddy checkins
    console.log('Creating buddy checkins...');
    await db.insert(buddyCheckins).values([
      {
        matchId: match1.id,
        checkinDate: new Date('2025-11-05T10:00:00Z'),
        mood: 'great',
        notes: 'Feeling confident and making good progress with language skills.',
      },
      {
        matchId: match2.id,
        checkinDate: new Date('2025-11-06T11:00:00Z'),
        mood: 'good',
        notes: 'Enjoying the conversations and learning a lot.',
      },
    ]);

    // Seed buddy feedback
    console.log('Creating buddy feedback...');
    await db.insert(buddyFeedback).values([
      {
        matchId: match1.id,
        fromRole: 'participant',
        rating: '0.95',
        feedbackText: 'Charlie is amazing! Very patient and helpful. I feel much more confident now.',
      },
      {
        matchId: match1.id,
        fromRole: 'buddy',
        rating: '0.90',
        feedbackText: 'Alice is doing great. Very motivated and eager to learn.',
      },
    ]);

    // Seed Kintell sessions
    console.log('Creating Kintell sessions...');
    await db.insert(kintellSessions).values([
      {
        externalSessionId: 'KINTELL-SESSION-001',
        sessionType: 'language',
        participantId: participant1.id,
        volunteerId: volunteer1.id,
        scheduledAt: new Date('2025-11-02T15:00:00Z'),
        completedAt: new Date('2025-11-02T16:00:00Z'),
        durationMinutes: 60,
        rating: '0.92',
        feedbackText: 'Great session, learned a lot about grammar.',
        languageLevel: 'B1',
        topics: ['grammar', 'conversation'],
      },
      {
        externalSessionId: 'KINTELL-SESSION-002',
        sessionType: 'mentorship',
        participantId: participant2.id,
        volunteerId: volunteer2.id,
        scheduledAt: new Date('2025-11-04T10:00:00Z'),
        completedAt: new Date('2025-11-04T11:00:00Z'),
        durationMinutes: 60,
        rating: '0.88',
        feedbackText: 'Helpful career advice and networking tips.',
        topics: ['career', 'networking'],
      },
    ]);

    // Seed learning progress
    console.log('Creating learning progress records...');
    await db.insert(learningProgress).values([
      {
        userId: participant2.id,
        provider: 'ecornell',
        courseId: 'CORNELL-BUS-101',
        courseName: 'Business Fundamentals',
        status: 'in_progress',
        progressPercent: 45,
        startedAt: new Date('2025-10-15T00:00:00Z'),
      },
      {
        userId: participant1.id,
        provider: 'itslearning',
        courseId: 'ITSLEARN-TECH-200',
        courseName: 'Introduction to Programming',
        status: 'completed',
        progressPercent: 100,
        startedAt: new Date('2025-09-01T00:00:00Z'),
        completedAt: new Date('2025-10-30T00:00:00Z'),
        credentialRef: 'CERT-2025-12345',
      },
    ]);

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

seed();
