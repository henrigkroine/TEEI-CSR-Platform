/**
 * Import Session Store
 * In-memory store for import sessions (would be PostgreSQL in production)
 */

import { ImportSession } from '@teei/shared-types';

class SessionStore {
  private sessions: Map<string, ImportSession> = new Map();

  async saveSession(session: ImportSession): Promise<void> {
    this.sessions.set(`${session.tenantId}:${session.id}`, session);
  }

  async getSession(tenantId: string, sessionId: string): Promise<ImportSession | null> {
    return this.sessions.get(`${tenantId}:${sessionId}`) || null;
  }

  async findByHash(tenantId: string, fileHash: string): Promise<ImportSession | null> {
    for (const [key, session] of this.sessions.entries()) {
      if (session.tenantId === tenantId && session.fileHash === fileHash) {
        return session;
      }
    }
    return null;
  }

  async listSessions(
    tenantId: string,
    page: number,
    pageSize: number
  ): Promise<{ sessions: ImportSession[]; total: number }> {
    const allSessions = Array.from(this.sessions.values()).filter(
      (s) => s.tenantId === tenantId
    );

    // Sort by createdAt desc
    allSessions.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const start = (page - 1) * pageSize;
    const sessions = allSessions.slice(start, start + pageSize);

    return {
      sessions,
      total: allSessions.length,
    };
  }

  async deleteSession(tenantId: string, sessionId: string): Promise<void> {
    this.sessions.delete(`${tenantId}:${sessionId}`);
  }

  // For testing
  clear(): void {
    this.sessions.clear();
  }
}

export const sessionStore = new SessionStore();
