/**
 * Buddy System API Client for E2E Tests
 *
 * Provides typed interface to Buddy System API
 * Used for test setup, assertions, and cleanup
 */

export class BuddySystemAPI {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl: string = process.env.BUDDY_SYSTEM_URL || 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  /**
   * Authenticate with Buddy System
   */
  async authenticate(email: string, password: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.statusText}`);
    }

    const data = await response.json();
    this.authToken = data.token || data.accessToken;
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId: number): Promise<any> {
    const response = await this.request(`/api/users/${userId}`);
    return response.json();
  }

  /**
   * Get buddy matches for user
   */
  async getBuddyMatches(userId: number): Promise<any[]> {
    const response = await this.request(`/api/users/${userId}/matches`);
    return response.json();
  }

  /**
   * Get events attended by user
   */
  async getEventsAttended(userId: number): Promise<any[]> {
    const response = await this.request(`/api/users/${userId}/events`);
    return response.json();
  }

  /**
   * Get skill sessions for user
   */
  async getSkillSessions(userId: number): Promise<any[]> {
    const response = await this.request(`/api/users/${userId}/skill-sessions`);
    return response.json();
  }

  /**
   * Check health endpoint
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Make authenticated request
   */
  private async request(path: string, options: RequestInit = {}): Promise<Response> {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.statusText}`);
    }

    return response;
  }
}
