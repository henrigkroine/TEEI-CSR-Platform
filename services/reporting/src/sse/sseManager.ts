/**
 * SSE Connection Manager
 *
 * Manages Server-Sent Events connections with:
 * - Company-scoped channels for tenant isolation
 * - Event ID tracking for resume support
 * - Connection lifecycle management
 * - Broadcast capabilities
 *
 * @module sseManager
 */

import type { FastifyReply } from 'fastify';

export interface SSEConnection {
  id: string;
  companyId: string;
  channel: string;
  reply: FastifyReply;
  lastEventId: string | null;
  connectedAt: Date;
}

export interface SSEEvent {
  id: string;
  type: string;
  data: unknown;
  companyId: string;
  channel: string;
}

/**
 * SSE Connection Manager
 */
class SSEManager {
  private connections: Map<string, SSEConnection> = new Map();
  private eventHistory: Map<string, SSEEvent[]> = new Map();
  private readonly maxHistorySize = 100;
  private readonly heartbeatInterval = 30000; // 30 seconds
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  /**
   * Add new SSE connection
   */
  public addConnection(
    connectionId: string,
    companyId: string,
    channel: string,
    reply: FastifyReply,
    lastEventId: string | null = null
  ): void {
    const connection: SSEConnection = {
      id: connectionId,
      companyId,
      channel,
      reply,
      lastEventId,
      connectedAt: new Date(),
    };

    this.connections.set(connectionId, connection);

    console.log(
      `[SSEManager] Client connected: ${connectionId} (company: ${companyId}, channel: ${channel})`
    );

    // If client provided last event ID, send missed events
    if (lastEventId) {
      this.sendMissedEvents(connection, lastEventId);
    }

    // Send initial connection event
    this.sendToConnection(connection, {
      id: this.generateEventId(),
      type: 'connected',
      data: {
        message: 'Connected to real-time updates',
        connectionId,
        timestamp: new Date().toISOString(),
      },
      companyId,
      channel,
    });
  }

  /**
   * Remove SSE connection
   */
  public removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      this.connections.delete(connectionId);
      console.log(`[SSEManager] Client disconnected: ${connectionId}`);
    }
  }

  /**
   * Broadcast event to all connections in a channel
   */
  public broadcast(
    companyId: string,
    channel: string,
    type: string,
    data: unknown
  ): void {
    const event: SSEEvent = {
      id: this.generateEventId(),
      type,
      data,
      companyId,
      channel,
    };

    // Store in history for resume support
    this.addToHistory(companyId, channel, event);

    // Send to all matching connections
    const connections = this.getConnectionsByChannel(companyId, channel);
    connections.forEach((connection) => {
      this.sendToConnection(connection, event);
    });

    console.log(
      `[SSEManager] Broadcast ${type} to ${connections.length} client(s) in ${companyId}/${channel}`
    );
  }

  /**
   * Send event to specific connection
   */
  private sendToConnection(connection: SSEConnection, event: SSEEvent): void {
    try {
      const message = this.formatSSEMessage(event);
      connection.reply.raw.write(message);
      connection.lastEventId = event.id;
    } catch (error) {
      console.error(`[SSEManager] Failed to send to ${connection.id}:`, error);
      this.removeConnection(connection.id);
    }
  }

  /**
   * Format SSE message according to SSE spec
   */
  private formatSSEMessage(event: SSEEvent): string {
    const lines: string[] = [];

    // Event ID (for resume support)
    lines.push(`id: ${event.id}`);

    // Event type
    lines.push(`event: ${event.type}`);

    // Data (JSON-encoded)
    const dataStr = JSON.stringify(event.data);
    lines.push(`data: ${dataStr}`);

    // End with double newline
    lines.push('', '');

    return lines.join('\n');
  }

  /**
   * Get connections for specific channel
   */
  private getConnectionsByChannel(
    companyId: string,
    channel: string
  ): SSEConnection[] {
    return Array.from(this.connections.values()).filter(
      (conn) => conn.companyId === companyId && conn.channel === channel
    );
  }

  /**
   * Send missed events to reconnecting client
   */
  private sendMissedEvents(connection: SSEConnection, lastEventId: string): void {
    const historyKey = this.getHistoryKey(connection.companyId, connection.channel);
    const events = this.eventHistory.get(historyKey) || [];

    // Find index of last received event
    const lastIndex = events.findIndex((e) => e.id === lastEventId);

    if (lastIndex === -1) {
      console.log(`[SSEManager] Last event ID not found, sending all recent events`);
      // Send last 10 events
      events.slice(-10).forEach((event) => {
        this.sendToConnection(connection, event);
      });
    } else {
      // Send events after last received
      const missedEvents = events.slice(lastIndex + 1);
      console.log(`[SSEManager] Sending ${missedEvents.length} missed events`);
      missedEvents.forEach((event) => {
        this.sendToConnection(connection, event);
      });
    }
  }

  /**
   * Add event to history for resume support
   */
  private addToHistory(companyId: string, channel: string, event: SSEEvent): void {
    const key = this.getHistoryKey(companyId, channel);
    const history = this.eventHistory.get(key) || [];

    history.push(event);

    // Limit history size
    if (history.length > this.maxHistorySize) {
      history.shift();
    }

    this.eventHistory.set(key, history);
  }

  /**
   * Get history key for company/channel
   */
  private getHistoryKey(companyId: string, channel: string): string {
    return `${companyId}:${channel}`;
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start heartbeat to keep connections alive
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.connections.forEach((connection) => {
        try {
          // Send comment as heartbeat (doesn't trigger onmessage)
          connection.reply.raw.write(': heartbeat\n\n');
        } catch (error) {
          console.error(`[SSEManager] Heartbeat failed for ${connection.id}:`, error);
          this.removeConnection(connection.id);
        }
      });
    }, this.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  public destroy(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    // Close all connections
    this.connections.forEach((connection) => {
      try {
        connection.reply.raw.end();
      } catch (error) {
        console.error(`[SSEManager] Error closing connection ${connection.id}:`, error);
      }
    });

    this.connections.clear();
    this.eventHistory.clear();
  }

  /**
   * Get connection statistics
   */
  public getStats() {
    const connectionsByCompany = new Map<string, number>();
    const connectionsByChannel = new Map<string, number>();

    this.connections.forEach((conn) => {
      // Count by company
      connectionsByCompany.set(
        conn.companyId,
        (connectionsByCompany.get(conn.companyId) || 0) + 1
      );

      // Count by channel
      const channelKey = `${conn.companyId}:${conn.channel}`;
      connectionsByChannel.set(
        channelKey,
        (connectionsByChannel.get(channelKey) || 0) + 1
      );
    });

    return {
      totalConnections: this.connections.size,
      connectionsByCompany: Object.fromEntries(connectionsByCompany),
      connectionsByChannel: Object.fromEntries(connectionsByChannel),
      historySize: this.eventHistory.size,
    };
  }
}

// Singleton instance
export const sseManager = new SSEManager();

// Cleanup on process exit
process.on('SIGTERM', () => {
  console.log('[SSEManager] Shutting down...');
  sseManager.destroy();
});

process.on('SIGINT', () => {
  console.log('[SSEManager] Shutting down...');
  sseManager.destroy();
});
