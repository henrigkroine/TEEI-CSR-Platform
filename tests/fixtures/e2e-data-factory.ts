/**
 * E2E Test Data Factory
 *
 * Creates and manages test data for Buddy System → CSR Platform integration tests
 * Features:
 * - Generates realistic test data
 * - Tracks created entities for cleanup
 * - Provides helper methods for common test scenarios
 * - Maintains referential integrity
 */

import { v4 as uuidv4 } from 'uuid';

export interface TestUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'participant' | 'buddy' | 'admin';
  primaryLanguage: string;
  interests: string[];
  location: string;
  createdAt: Date;
}

export interface TestEvent {
  id: number;
  title: string;
  description: string;
  category: string;
  date: Date;
  location: string;
  capacity: number;
  createdBy: number;
}

export interface TestSkill {
  id: number;
  name: string;
  category: string;
  description: string;
}

export interface TestMatch {
  id: number;
  requesterId: number;
  requesteeId: number;
  status: 'pending' | 'accepted' | 'rejected' | 'ended';
  createdAt: Date;
}

export class E2ETestDataFactory {
  private buddySystemUrl: string;
  private csrPlatformUrl: string;
  private createdUsers: TestUser[] = [];
  private createdEvents: TestEvent[] = [];
  private createdMatches: TestMatch[] = [];
  private createdSkills: TestSkill[] = [];
  private authToken: string | null = null;

  constructor(
    buddySystemUrl: string = process.env.BUDDY_SYSTEM_URL || 'http://localhost:3001',
    csrPlatformUrl: string = process.env.CSR_PLATFORM_URL || 'http://localhost:4321'
  ) {
    this.buddySystemUrl = buddySystemUrl;
    this.csrPlatformUrl = csrPlatformUrl;
  }

  /**
   * Create a test user in Buddy System
   */
  async createTestUser(userData: Partial<TestUser>): Promise<TestUser> {
    const defaultUser = {
      email: `test-${uuidv4()}@teei-e2e.com`,
      firstName: 'Test',
      lastName: 'User',
      role: 'participant' as const,
      primaryLanguage: 'en',
      interests: ['general'],
      location: 'Test City',
      password: 'Test123!@#',
      ...userData
    };

    const response = await fetch(`${this.buddySystemUrl}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(defaultUser)
    });

    if (!response.ok) {
      throw new Error(`Failed to create test user: ${response.statusText}`);
    }

    const user = await response.json();
    const testUser: TestUser = {
      ...defaultUser,
      id: user.id,
      createdAt: new Date()
    };

    this.createdUsers.push(testUser);
    return testUser;
  }

  /**
   * Create a buddy match between two users
   */
  async createBuddyMatch(requesterId: number, requesteeId: number): Promise<number> {
    // Authenticate as requester
    await this.authenticate(requesterId);

    // Send buddy request
    const requestResponse = await fetch(`${this.buddySystemUrl}/api/buddy-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify({
        requesteeId,
        message: 'E2E test buddy request'
      })
    });

    if (!requestResponse.ok) {
      throw new Error(`Failed to create buddy request: ${requestResponse.statusText}`);
    }

    const request = await requestResponse.json();
    const requestId = request.id;

    // Authenticate as requestee and accept
    await this.authenticate(requesteeId);

    const acceptResponse = await fetch(
      `${this.buddySystemUrl}/api/buddy-requests/${requestId}/accept`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        }
      }
    );

    if (!acceptResponse.ok) {
      throw new Error(`Failed to accept buddy request: ${acceptResponse.statusText}`);
    }

    const match: TestMatch = {
      id: requestId,
      requesterId,
      requesteeId,
      status: 'accepted',
      createdAt: new Date()
    };

    this.createdMatches.push(match);
    return requestId;
  }

  /**
   * Create an event in Buddy System
   */
  async createEvent(eventData: Partial<TestEvent>, creatorId: number): Promise<TestEvent> {
    await this.authenticate(creatorId);

    const defaultEvent = {
      title: `Test Event ${uuidv4()}`,
      description: 'E2E test event',
      category: 'social',
      date: new Date(Date.now() + 86400000), // Tomorrow
      location: 'Test Location',
      capacity: 50,
      ...eventData
    };

    const response = await fetch(`${this.buddySystemUrl}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify(defaultEvent)
    });

    if (!response.ok) {
      throw new Error(`Failed to create event: ${response.statusText}`);
    }

    const event = await response.json();
    const testEvent: TestEvent = {
      ...defaultEvent,
      id: event.id,
      createdBy: creatorId
    };

    this.createdEvents.push(testEvent);
    return testEvent;
  }

  /**
   * Mark event as attended
   */
  async markEventAsAttended(eventId: number, userId: number): Promise<void> {
    await this.authenticate(userId);

    const response = await fetch(
      `${this.buddySystemUrl}/api/events/${eventId}/attend`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to mark event as attended: ${response.statusText}`);
    }
  }

  /**
   * Create event and mark user as attended (convenience method)
   */
  async createAndAttendEvent(options: {
    userId: number;
    category: string;
    title: string;
  }): Promise<number> {
    const event = await this.createEvent(
      {
        title: options.title,
        category: options.category
      },
      options.userId
    );

    await this.markEventAsAttended(event.id, options.userId);
    return event.id;
  }

  /**
   * Create a skill
   */
  async createSkill(skillData: Partial<TestSkill>): Promise<TestSkill> {
    const defaultSkill = {
      name: `Test Skill ${uuidv4()}`,
      category: 'General',
      description: 'E2E test skill',
      ...skillData
    };

    const response = await fetch(`${this.buddySystemUrl}/api/admin/skills`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify(defaultSkill)
    });

    if (!response.ok) {
      throw new Error(`Failed to create skill: ${response.statusText}`);
    }

    const skill = await response.json();
    const testSkill: TestSkill = {
      ...defaultSkill,
      id: skill.id
    };

    this.createdSkills.push(testSkill);
    return testSkill;
  }

  /**
   * Complete a skill sharing session
   */
  async completeSkillSession(options: {
    skillId: number;
    teacherId: number;
    learnerId: number;
    teacherRating?: number;
    learnerRating?: number;
    teacherFeedback?: string;
    learnerFeedback?: string;
  }): Promise<number> {
    // Create session request
    await this.authenticate(options.learnerId);

    const requestResponse = await fetch(`${this.buddySystemUrl}/api/skill-sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify({
        skillId: options.skillId,
        teacherId: options.teacherId
      })
    });

    if (!requestResponse.ok) {
      throw new Error(`Failed to create skill session: ${requestResponse.statusText}`);
    }

    const session = await requestResponse.json();
    const sessionId = session.id;

    // Accept as teacher
    await this.authenticate(options.teacherId);

    await fetch(`${this.buddySystemUrl}/api/skill-sessions/${sessionId}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      }
    });

    // Mark as completed
    await fetch(`${this.buddySystemUrl}/api/skill-sessions/${sessionId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      }
    });

    // Submit feedback from teacher
    if (options.teacherRating || options.teacherFeedback) {
      await fetch(`${this.buddySystemUrl}/api/skill-sessions/${sessionId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          rating: options.teacherRating,
          feedback: options.teacherFeedback
        })
      });
    }

    // Submit feedback from learner
    if (options.learnerRating || options.learnerFeedback) {
      await this.authenticate(options.learnerId);

      await fetch(`${this.buddySystemUrl}/api/skill-sessions/${sessionId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          rating: options.learnerRating,
          feedback: options.learnerFeedback
        })
      });
    }

    return sessionId;
  }

  /**
   * Trigger a milestone achievement
   */
  async triggerMilestone(
    userId: number,
    milestone: {
      milestoneId: number;
      title: string;
      category: string;
      points: number;
    }
  ): Promise<void> {
    await this.authenticate(userId);

    // Milestone achievements are typically triggered automatically
    // This method simulates the conditions or directly creates the achievement

    const response = await fetch(`${this.buddySystemUrl}/api/milestones/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify(milestone)
    });

    if (!response.ok) {
      throw new Error(`Failed to trigger milestone: ${response.statusText}`);
    }
  }

  /**
   * Create complete user journey with all event types
   */
  async createCompleteUserJourney(userId: number): Promise<{
    eventCount: number;
    matchId: number;
    eventIds: number[];
    skillSessionId: number;
  }> {
    // Create a buddy match
    const buddy = await this.createTestUser({ role: 'buddy' });
    const matchId = await this.createBuddyMatch(userId, buddy.id);

    // Attend 3 events
    const eventIds: number[] = [];
    for (let i = 0; i < 3; i++) {
      const eventId = await this.createAndAttendEvent({
        userId,
        category: ['social', 'workshop', 'cultural-exchange'][i],
        title: `Journey Event ${i + 1}`
      });
      eventIds.push(eventId);
    }

    // Complete skill session
    const skill = await this.createSkill({ name: 'Journey Skill' });
    const skillSessionId = await this.completeSkillSession({
      skillId: skill.id,
      teacherId: buddy.id,
      learnerId: userId,
      teacherRating: 5,
      learnerRating: 5
    });

    // Trigger milestone
    await this.triggerMilestone(userId, {
      milestoneId: 1,
      title: 'Active Participant',
      category: 'community-engagement',
      points: 500
    });

    return {
      eventCount: 6, // 1 match + 3 events + 1 skill + 1 milestone
      matchId,
      eventIds,
      skillSessionId
    };
  }

  /**
   * Authenticate as a specific user
   */
  private async authenticate(userIdOrEmail: number | string): Promise<void> {
    let email: string;

    if (typeof userIdOrEmail === 'number') {
      const user = this.createdUsers.find(u => u.id === userIdOrEmail);
      if (!user) {
        throw new Error(`User with ID ${userIdOrEmail} not found`);
      }
      email = user.email;
    } else {
      email = userIdOrEmail;
    }

    const response = await fetch(`${this.buddySystemUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'Test123!@#'
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to authenticate: ${response.statusText}`);
    }

    const data = await response.json();
    this.authToken = data.token || data.accessToken;
  }

  /**
   * Cleanup all created test data
   */
  async cleanup(): Promise<void> {
    // Delete in reverse order of dependencies
    console.log('Cleaning up test data...');

    // Delete matches
    for (const match of this.createdMatches) {
      try {
        await this.deleteMatch(match.id);
      } catch (error) {
        console.warn(`Failed to delete match ${match.id}:`, error);
      }
    }

    // Delete events
    for (const event of this.createdEvents) {
      try {
        await this.deleteEvent(event.id);
      } catch (error) {
        console.warn(`Failed to delete event ${event.id}:`, error);
      }
    }

    // Delete skills
    for (const skill of this.createdSkills) {
      try {
        await this.deleteSkill(skill.id);
      } catch (error) {
        console.warn(`Failed to delete skill ${skill.id}:`, error);
      }
    }

    // Delete users
    for (const user of this.createdUsers) {
      try {
        await this.deleteUser(user.id);
      } catch (error) {
        console.warn(`Failed to delete user ${user.id}:`, error);
      }
    }

    // Clear arrays
    this.createdUsers = [];
    this.createdEvents = [];
    this.createdMatches = [];
    this.createdSkills = [];

    console.log('Test data cleanup complete');
  }

  private async deleteMatch(matchId: number): Promise<void> {
    // Implementation depends on Buddy System API
    await fetch(`${this.buddySystemUrl}/api/buddy-requests/${matchId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${this.authToken}` }
    });
  }

  private async deleteEvent(eventId: number): Promise<void> {
    await fetch(`${this.buddySystemUrl}/api/events/${eventId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${this.authToken}` }
    });
  }

  private async deleteSkill(skillId: number): Promise<void> {
    await fetch(`${this.buddySystemUrl}/api/admin/skills/${skillId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${this.authToken}` }
    });
  }

  private async deleteUser(userId: number): Promise<void> {
    await fetch(`${this.buddySystemUrl}/api/users/${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${this.authToken}` }
    });
  }
}
