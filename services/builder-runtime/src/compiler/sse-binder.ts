/**
 * SSE Stream Binder - builder-compiler
 * Binds query graph to Server-Sent Events streams for live updates
 */

import type { QueryGraph, QueryNode } from './query-graph.js';
import { createServiceLogger } from '@teei/shared-utils';
import { EventEmitter } from 'events';

const logger = createServiceLogger('sse-binder');

/**
 * SSE Event Types
 */
export interface SseEvent {
  type: 'block_start' | 'block_progress' | 'block_complete' | 'block_error' | 'dashboard_complete';
  blockId?: string;
  data?: any;
  error?: string;
  timestamp: string;
}

/**
 * SSE Stream for a dashboard execution
 */
export class SseStream extends EventEmitter {
  private dashboardId: string;
  private clients: Set<any> = new Set();

  constructor(dashboardId: string) {
    super();
    this.dashboardId = dashboardId;
  }

  /**
   * Add SSE client
   */
  addClient(reply: any) {
    this.clients.add(reply);
    logger.info({ dashboardId: this.dashboardId, clientCount: this.clients.size }, 'SSE client connected');
  }

  /**
   * Remove SSE client
   */
  removeClient(reply: any) {
    this.clients.delete(reply);
    logger.info({ dashboardId: this.dashboardId, clientCount: this.clients.size }, 'SSE client disconnected');
  }

  /**
   * Send event to all clients
   */
  sendEvent(event: SseEvent) {
    const data = JSON.stringify(event);

    for (const client of this.clients) {
      try {
        client.raw.write(`data: ${data}\n\n`);
      } catch (error) {
        logger.error({ error }, 'Failed to send SSE event');
        this.clients.delete(client);
      }
    }
  }

  /**
   * Close all connections
   */
  close() {
    for (const client of this.clients) {
      try {
        client.raw.end();
      } catch (error) {
        logger.error({ error }, 'Failed to close SSE client');
      }
    }
    this.clients.clear();
  }
}

/**
 * SSE Binder - manages streams for query graph execution
 */
export class SseBinder {
  private streams = new Map<string, SseStream>();

  /**
   * Create stream for dashboard
   */
  createStream(dashboardId: string): SseStream {
    if (this.streams.has(dashboardId)) {
      const existing = this.streams.get(dashboardId)!;
      existing.close();
    }

    const stream = new SseStream(dashboardId);
    this.streams.set(dashboardId, stream);

    logger.info({ dashboardId }, 'Created SSE stream');

    return stream;
  }

  /**
   * Get existing stream
   */
  getStream(dashboardId: string): SseStream | null {
    return this.streams.get(dashboardId) || null;
  }

  /**
   * Execute query graph with SSE updates
   */
  async executeWithSse(
    graph: QueryGraph,
    executor: (node: QueryNode) => Promise<any>
  ): Promise<Map<string, any>> {
    const stream = this.getStream(graph.dashboardId) || this.createStream(graph.dashboardId);
    const results = new Map<string, any>();

    try {
      // Execute in stages (parallel within stage)
      for (const stage of graph.executionOrder) {
        // Execute all nodes in this stage in parallel
        await Promise.all(
          stage.map(async (nodeId) => {
            const node = graph.nodes.find((n) => n.id === nodeId);
            if (!node) {
              logger.error({ nodeId }, 'Node not found in graph');
              return;
            }

            try {
              // Send start event
              stream.sendEvent({
                type: 'block_start',
                blockId: node.blockId,
                timestamp: new Date().toISOString(),
              });

              // Execute query
              const result = await executor(node);

              // Store result
              results.set(node.blockId, result);

              // Send complete event
              stream.sendEvent({
                type: 'block_complete',
                blockId: node.blockId,
                data: result,
                timestamp: new Date().toISOString(),
              });
            } catch (error) {
              logger.error({ error, nodeId }, 'Node execution failed');

              // Send error event
              stream.sendEvent({
                type: 'block_error',
                blockId: node.blockId,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
              });
            }
          })
        );
      }

      // Send dashboard complete event
      stream.sendEvent({
        type: 'dashboard_complete',
        data: { blockCount: results.size },
        timestamp: new Date().toISOString(),
      });

      return results;
    } catch (error) {
      logger.error({ error, dashboardId: graph.dashboardId }, 'Graph execution failed');
      throw error;
    }
  }

  /**
   * Close stream
   */
  closeStream(dashboardId: string) {
    const stream = this.streams.get(dashboardId);
    if (stream) {
      stream.close();
      this.streams.delete(dashboardId);
    }
  }

  /**
   * Close all streams
   */
  closeAll() {
    for (const stream of this.streams.values()) {
      stream.close();
    }
    this.streams.clear();
  }
}
