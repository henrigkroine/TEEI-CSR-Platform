/**
 * SSE Connection Registry
 * Tracks active SSE connections per company
 */

import type { FastifyReply } from 'fastify';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('sse-registry');

export interface SSEConnection {
  id: string;
  companyId: string;
  reply: FastifyReply;
  connectedAt: Date;
  lastActivity: Date;
  buffer: Array<{ eventId: string; data: any }>;
}

class ConnectionRegistry {
  private connections: Map<string, SSEConnection>;
  private companyIndex: Map<string, Set<string>>;

  constructor() {
    this.connections = new Map();
    this.companyIndex = new Map();
  }

  /**
   * Add a new connection
   */
  addConnection(connection: SSEConnection): void {
    this.connections.set(connection.id, connection);

    // Add to company index
    if (!this.companyIndex.has(connection.companyId)) {
      this.companyIndex.set(connection.companyId, new Set());
    }
    this.companyIndex.get(connection.companyId)!.add(connection.id);

    logger.info(
      {
        connectionId: connection.id,
        companyId: connection.companyId,
        totalConnections: this.connections.size,
      },
      'Connection added to registry'
    );
  }

  /**
   * Remove a connection
   */
  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    // Remove from company index
    const companyConnections = this.companyIndex.get(connection.companyId);
    if (companyConnections) {
      companyConnections.delete(connectionId);
      if (companyConnections.size === 0) {
        this.companyIndex.delete(connection.companyId);
      }
    }

    // Remove from main registry
    this.connections.delete(connectionId);

    logger.info(
      {
        connectionId,
        companyId: connection.companyId,
        totalConnections: this.connections.size,
      },
      'Connection removed from registry'
    );
  }

  /**
   * Get a specific connection
   */
  getConnection(connectionId: string): SSEConnection | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * Get all connections for a company
   */
  getConnectionsForCompany(companyId: string): SSEConnection[] {
    const connectionIds = this.companyIndex.get(companyId);
    if (!connectionIds) {
      return [];
    }

    const connections: SSEConnection[] = [];
    for (const id of connectionIds) {
      const connection = this.connections.get(id);
      if (connection) {
        connections.push(connection);
      }
    }

    return connections;
  }

  /**
   * Get total number of active connections
   */
  getTotalConnections(): number {
    return this.connections.size;
  }

  /**
   * Get number of companies with active connections
   */
  getActiveCompanies(): number {
    return this.companyIndex.size;
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalConnections: number;
    activeCompanies: number;
    connectionsByCompany: Record<string, number>;
  } {
    const connectionsByCompany: Record<string, number> = {};

    for (const [companyId, connections] of this.companyIndex.entries()) {
      connectionsByCompany[companyId] = connections.size;
    }

    return {
      totalConnections: this.connections.size,
      activeCompanies: this.companyIndex.size,
      connectionsByCompany,
    };
  }

  /**
   * Clean up stale connections
   */
  cleanup(maxIdleMs: number = 15 * 60 * 1000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, connection] of this.connections.entries()) {
      const idleTime = now - connection.lastActivity.getTime();
      if (idleTime > maxIdleMs) {
        logger.info(
          { connectionId: id, companyId: connection.companyId, idleTime },
          'Cleaning up stale connection'
        );
        this.removeConnection(id);
        cleaned++;
      }
    }

    return cleaned;
  }
}

// Singleton instance
export const connectionRegistry = new ConnectionRegistry();

// Periodic cleanup task (run every 5 minutes)
setInterval(() => {
  const cleaned = connectionRegistry.cleanup();
  if (cleaned > 0) {
    logger.info({ cleaned }, 'Cleaned up stale connections');
  }
}, 5 * 60 * 1000);
