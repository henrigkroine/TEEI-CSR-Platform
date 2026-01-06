/**
 * Sticky Session Routing for Collaboration
 *
 * Routes WebSocket and SSE connections to specific reporting service instances
 * using consistent hashing to ensure users on the same document connect to
 * the same backend instance.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createHash } from 'crypto';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('collab-routing');

interface ReportingServiceInstance {
  id: string;
  host: string;
  port: number;
  weight: number;
  healthy: boolean;
}

/**
 * Sticky routing middleware for collaboration endpoints
 */
export class StickySessionRouter {
  private instances: ReportingServiceInstance[] = [];
  private hashRing: Map<number, string> = new Map();
  private virtualNodes = 150; // Virtual nodes per instance for better distribution

  constructor() {
    this.loadInstances();
    this.buildHashRing();
  }

  /**
   * Load reporting service instances from environment or discovery
   */
  private loadInstances(): void {
    const instancesEnv = process.env.REPORTING_INSTANCES;

    if (instancesEnv) {
      // Parse from env: "host1:port1:weight1,host2:port2:weight2"
      const parsed = instancesEnv.split(',').map((inst, idx) => {
        const [host, port, weight] = inst.split(':');
        return {
          id: `reporting-${idx}`,
          host: host || 'localhost',
          port: parseInt(port || '3007', 10),
          weight: parseInt(weight || '1', 10),
          healthy: true
        };
      });

      this.instances = parsed;
    } else {
      // Default single instance
      this.instances = [
        {
          id: 'reporting-0',
          host: process.env.REPORTING_HOST || 'localhost',
          port: parseInt(process.env.REPORTING_PORT || '3007', 10),
          weight: 1,
          healthy: true
        }
      ];
    }

    logger.info({ instances: this.instances.length }, 'Loaded reporting instances');
  }

  /**
   * Build consistent hash ring
   */
  private buildHashRing(): void {
    this.hashRing.clear();

    for (const instance of this.instances) {
      // Create virtual nodes for each instance
      const vnodeCount = this.virtualNodes * instance.weight;

      for (let i = 0; i < vnodeCount; i++) {
        const vnodeKey = `${instance.id}:${i}`;
        const hash = this.hash(vnodeKey);
        this.hashRing.set(hash, instance.id);
      }
    }

    logger.info({
      instances: this.instances.length,
      vnodes: this.hashRing.size
    }, 'Hash ring built');
  }

  /**
   * Get instance for document ID (sticky routing)
   */
  getInstanceForDocument(docId: string): ReportingServiceInstance | null {
    if (this.instances.length === 0) return null;

    // Hash document ID
    const docHash = this.hash(docId);

    // Find next instance in hash ring (clockwise)
    const sortedHashes = Array.from(this.hashRing.keys()).sort((a, b) => a - b);

    let instanceId: string | undefined;

    for (const hash of sortedHashes) {
      if (hash >= docHash) {
        instanceId = this.hashRing.get(hash);
        break;
      }
    }

    // Wrap around to first instance if not found
    if (!instanceId) {
      instanceId = this.hashRing.get(sortedHashes[0]);
    }

    // Get instance details
    const instance = this.instances.find(i => i.id === instanceId && i.healthy);

    if (!instance) {
      logger.warn({ docId, instanceId }, 'Instance not found or unhealthy');
      // Fallback to first healthy instance
      return this.instances.find(i => i.healthy) || null;
    }

    return instance;
  }

  /**
   * Hash string to 32-bit integer
   */
  private hash(key: string): number {
    const hash = createHash('md5').update(key).digest();
    return hash.readUInt32BE(0);
  }

  /**
   * Register sticky routing middleware
   */
  registerMiddleware(fastify: FastifyInstance): void {
    fastify.addHook('preHandler', async (request, reply) => {
      // Only apply to /collab/* routes
      if (!request.url.startsWith('/collab/')) {
        return;
      }

      // Extract docId from query or body
      const docId = this.extractDocId(request);

      if (!docId) {
        // No sticky routing needed
        return;
      }

      // Get target instance
      const instance = this.getInstanceForDocument(docId);

      if (!instance) {
        return reply.status(503).send({
          error: 'Service Unavailable',
          message: 'No healthy reporting instances available'
        });
      }

      // Store instance in request context for proxy
      (request as any).targetInstance = instance;

      logger.debug({
        docId,
        instanceId: instance.id,
        url: request.url
      }, 'Routed to instance');
    });

    logger.info('Sticky routing middleware registered');
  }

  /**
   * Extract docId from request
   */
  private extractDocId(request: FastifyRequest): string | null {
    // Check query params
    if (request.query && typeof request.query === 'object') {
      const query = request.query as any;
      if (query.docId) return query.docId;
    }

    // Check body
    if (request.body && typeof request.body === 'object') {
      const body = request.body as any;
      if (body.docId) return body.docId;
    }

    return null;
  }

  /**
   * Mark instance as unhealthy
   */
  markUnhealthy(instanceId: string): void {
    const instance = this.instances.find(i => i.id === instanceId);
    if (instance) {
      instance.healthy = false;
      logger.warn({ instanceId }, 'Instance marked unhealthy');
    }
  }

  /**
   * Mark instance as healthy
   */
  markHealthy(instanceId: string): void {
    const instance = this.instances.find(i => i.id === instanceId);
    if (instance) {
      instance.healthy = true;
      logger.info({ instanceId }, 'Instance marked healthy');
    }
  }

  /**
   * Get all instances
   */
  getInstances(): ReportingServiceInstance[] {
    return [...this.instances];
  }

  /**
   * Health check (periodic)
   */
  async healthCheck(): Promise<void> {
    for (const instance of this.instances) {
      try {
        const url = `http://${instance.host}:${instance.port}/health`;
        const response = await fetch(url, { signal: AbortSignal.timeout(5000) });

        if (response.ok) {
          if (!instance.healthy) {
            this.markHealthy(instance.id);
          }
        } else {
          this.markUnhealthy(instance.id);
        }
      } catch (err) {
        logger.error({ err, instanceId: instance.id }, 'Health check failed');
        this.markUnhealthy(instance.id);
      }
    }
  }
}

/**
 * Register collab proxy routes
 */
export async function registerCollabProxy(
  fastify: FastifyInstance,
  router: StickySessionRouter
): Promise<void> {
  // Proxy WebSocket connections
  fastify.all('/collab/ws', async (request, reply) => {
    const instance = (request as any).targetInstance as ReportingServiceInstance;

    if (!instance) {
      return reply.status(503).send({ error: 'No instance available' });
    }

    // Upgrade to WebSocket and proxy
    const wsUrl = `ws://${instance.host}:${instance.port}/collab/ws`;

    // Use fastify-http-proxy or similar
    // For now, return instance info for client-side connection
    return reply.send({
      wsUrl,
      instanceId: instance.id
    });
  });

  // Proxy SSE connections
  fastify.all('/collab/sse/*', async (request, reply) => {
    const instance = (request as any).targetInstance as ReportingServiceInstance;

    if (!instance) {
      return reply.status(503).send({ error: 'No instance available' });
    }

    const path = request.url.replace('/collab', '');
    const proxyUrl = `http://${instance.host}:${instance.port}${path}`;

    // Proxy request (simplified - use fastify-http-proxy in production)
    return reply.redirect(307, proxyUrl);
  });

  // Proxy REST API
  fastify.all('/collab/*', async (request, reply) => {
    const instance = (request as any).targetInstance as ReportingServiceInstance;

    if (!instance) {
      return reply.status(503).send({ error: 'No instance available' });
    }

    const path = request.url.replace('/collab', '');
    const proxyUrl = `http://${instance.host}:${instance.port}/collab${path}`;

    // Proxy request (simplified)
    return reply.redirect(307, proxyUrl);
  });

  logger.info('Collab proxy routes registered');
}
