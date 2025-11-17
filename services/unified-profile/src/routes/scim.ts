/**
 * SCIM 2.0 REST API Routes (RFC 7644)
 * Implements Users and Groups endpoints with ETags, filtering, and pagination
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ScimService } from '../lib/scim-service.js';
import { ScimUser, ScimGroup, ScimPatchRequest, SCIM_SCHEMAS } from '../types/scim.js';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('scim-routes');
const scimService = new ScimService();

/**
 * Extract tenant ID from auth context
 * Production: Extract from JWT claims
 */
function getTenantId(request: FastifyRequest): string {
  // TODO: Extract from JWT
  return (request.headers['x-tenant-id'] as string) || 'default-tenant';
}

/**
 * Extract actor ID from auth context
 */
function getActorId(request: FastifyRequest): string {
  // TODO: Extract from JWT
  return (request.headers['x-actor-id'] as string) || 'admin';
}

/**
 * SCIM error response
 */
function scimError(reply: FastifyReply, status: number, scimType: string, detail: string) {
  return reply
    .code(status)
    .header('Content-Type', 'application/scim+json')
    .send({
      schemas: [SCIM_SCHEMAS.ERROR],
      scimType,
      detail,
      status,
    });
}

/**
 * Register SCIM routes
 */
export async function scimRoutes(app: FastifyInstance) {
  // ==================== User Endpoints ====================

  app.get('/scim/v2/Users', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tenantId = getTenantId(request);
      const actorId = getActorId(request);

      const query = request.query as any;
      const options = {
        filter: query.filter,
        startIndex: query.startIndex ? parseInt(query.startIndex) : 1,
        count: query.count ? parseInt(query.count) : 100,
        sortBy: query.sortBy || 'meta.created',
        sortOrder: query.sortOrder || 'ascending',
      };

      const response = await scimService.listUsers(tenantId, options, actorId);

      return reply
        .code(200)
        .header('Content-Type', 'application/scim+json')
        .send(response);
    } catch (error: any) {
      logger.error('List users error', { error });
      return scimError(reply, 400, 'invalidFilter', error.message);
    }
  });

  app.get('/scim/v2/Users/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const actorId = getActorId(request);

      const user = await scimService.getUser(id, actorId);
      if (!user) {
        return scimError(reply, 404, 'notFound', 'User not found');
      }

      const etag = user.meta?.version;
      const ifNoneMatch = request.headers['if-none-match'];

      if (ifNoneMatch && ifNoneMatch === etag) {
        return reply.code(304).send();
      }

      return reply
        .code(200)
        .header('Content-Type', 'application/scim+json')
        .header('ETag', etag || '')
        .send(user);
    } catch (error: any) {
      logger.error('Get user error', { error });
      return scimError(reply, 500, 'internalError', 'Internal server error');
    }
  });

  app.post('/scim/v2/Users', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tenantId = getTenantId(request);
      const actorId = getActorId(request);
      const scimUser = request.body as ScimUser;

      // Validate schema
      if (!scimUser.schemas || !scimUser.schemas.includes(SCIM_SCHEMAS.USER)) {
        return scimError(reply, 400, 'invalidSyntax', 'Missing or invalid schemas');
      }

      if (!scimUser.userName) {
        return scimError(reply, 400, 'invalidValue', 'userName is required');
      }

      const created = await scimService.createUser(scimUser, tenantId, actorId);
      const location = `/scim/v2/Users/${created.id}`;

      return reply
        .code(201)
        .header('Content-Type', 'application/scim+json')
        .header('Location', location)
        .header('ETag', created.meta?.version || '')
        .send(created);
    } catch (error: any) {
      logger.error('Create user error', { error });
      if (error.message.includes('already exists')) {
        return scimError(reply, 409, 'uniqueness', error.message);
      }
      return scimError(reply, 400, 'invalidValue', error.message);
    }
  });

  app.put('/scim/v2/Users/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const actorId = getActorId(request);
      const scimUser = request.body as ScimUser;

      const ifMatch = request.headers['if-match'];
      if (ifMatch) {
        const existing = await scimService.getUser(id, actorId);
        if (existing && existing.meta?.version !== ifMatch) {
          return scimError(reply, 412, 'preconditionFailed', 'Version mismatch');
        }
      }

      const updated = await scimService.replaceUser(id, scimUser, actorId);
      if (!updated) {
        return scimError(reply, 404, 'notFound', 'User not found');
      }

      return reply
        .code(200)
        .header('Content-Type', 'application/scim+json')
        .header('ETag', updated.meta?.version || '')
        .send(updated);
    } catch (error: any) {
      logger.error('Replace user error', { error });
      return scimError(reply, 400, 'invalidValue', error.message);
    }
  });

  app.patch('/scim/v2/Users/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const actorId = getActorId(request);
      const patch = request.body as ScimPatchRequest;

      // Validate patch schema
      if (!patch.schemas || !patch.schemas.includes(SCIM_SCHEMAS.PATCH_OP)) {
        return scimError(reply, 400, 'invalidSyntax', 'Missing or invalid PATCH schemas');
      }

      if (!patch.Operations || patch.Operations.length === 0) {
        return scimError(reply, 400, 'invalidValue', 'Operations required');
      }

      const updated = await scimService.patchUser(id, patch, actorId);
      if (!updated) {
        return scimError(reply, 404, 'notFound', 'User not found');
      }

      return reply
        .code(200)
        .header('Content-Type', 'application/scim+json')
        .header('ETag', updated.meta?.version || '')
        .send(updated);
    } catch (error: any) {
      logger.error('Patch user error', { error });
      return scimError(reply, 400, 'invalidValue', error.message);
    }
  });

  app.delete('/scim/v2/Users/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const actorId = getActorId(request);

      const deleted = await scimService.deleteUser(id, actorId);
      if (!deleted) {
        return scimError(reply, 404, 'notFound', 'User not found');
      }

      return reply.code(204).send();
    } catch (error: any) {
      logger.error('Delete user error', { error });
      return scimError(reply, 500, 'internalError', 'Internal server error');
    }
  });

  // ==================== Group Endpoints ====================

  app.get('/scim/v2/Groups', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tenantId = getTenantId(request);
      const actorId = getActorId(request);

      const query = request.query as any;
      const options = {
        filter: query.filter,
        startIndex: query.startIndex ? parseInt(query.startIndex) : 1,
        count: query.count ? parseInt(query.count) : 100,
      };

      const response = await scimService.listGroups(tenantId, options, actorId);

      return reply
        .code(200)
        .header('Content-Type', 'application/scim+json')
        .send(response);
    } catch (error: any) {
      logger.error('List groups error', { error });
      return scimError(reply, 400, 'invalidFilter', error.message);
    }
  });

  app.get('/scim/v2/Groups/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const actorId = getActorId(request);

      const group = await scimService.getGroup(id, actorId);
      if (!group) {
        return scimError(reply, 404, 'notFound', 'Group not found');
      }

      return reply
        .code(200)
        .header('Content-Type', 'application/scim+json')
        .header('ETag', group.meta?.version || '')
        .send(group);
    } catch (error: any) {
      logger.error('Get group error', { error });
      return scimError(reply, 500, 'internalError', 'Internal server error');
    }
  });

  app.post('/scim/v2/Groups', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tenantId = getTenantId(request);
      const actorId = getActorId(request);
      const scimGroup = request.body as ScimGroup;

      if (!scimGroup.schemas || !scimGroup.schemas.includes(SCIM_SCHEMAS.GROUP)) {
        return scimError(reply, 400, 'invalidSyntax', 'Missing or invalid schemas');
      }

      if (!scimGroup.displayName) {
        return scimError(reply, 400, 'invalidValue', 'displayName is required');
      }

      const created = await scimService.createGroup(scimGroup, tenantId, actorId);
      const location = `/scim/v2/Groups/${created.id}`;

      return reply
        .code(201)
        .header('Content-Type', 'application/scim+json')
        .header('Location', location)
        .header('ETag', created.meta?.version || '')
        .send(created);
    } catch (error: any) {
      logger.error('Create group error', { error });
      if (error.message.includes('already exists')) {
        return scimError(reply, 409, 'uniqueness', error.message);
      }
      return scimError(reply, 400, 'invalidValue', error.message);
    }
  });

  app.patch('/scim/v2/Groups/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const actorId = getActorId(request);
      const patch = request.body as ScimPatchRequest;

      if (!patch.schemas || !patch.schemas.includes(SCIM_SCHEMAS.PATCH_OP)) {
        return scimError(reply, 400, 'invalidSyntax', 'Missing or invalid PATCH schemas');
      }

      const updated = await scimService.patchGroup(id, patch, actorId);
      if (!updated) {
        return scimError(reply, 404, 'notFound', 'Group not found');
      }

      return reply
        .code(200)
        .header('Content-Type', 'application/scim+json')
        .header('ETag', updated.meta?.version || '')
        .send(updated);
    } catch (error: any) {
      logger.error('Patch group error', { error });
      return scimError(reply, 400, 'invalidValue', error.message);
    }
  });

  app.delete('/scim/v2/Groups/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const actorId = getActorId(request);

      const deleted = await scimService.deleteGroup(id, actorId);
      if (!deleted) {
        return scimError(reply, 404, 'notFound', 'Group not found');
      }

      return reply.code(204).send();
    } catch (error: any) {
      logger.error('Delete group error', { error });
      return scimError(reply, 500, 'internalError', 'Internal server error');
    }
  });

  // ==================== Health & Debug ====================

  app.get('/scim/v2/ServiceProviderConfig', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply
      .code(200)
      .header('Content-Type', 'application/scim+json')
      .send({
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
        documentationUri: 'https://docs.teei.io/admin/scim',
        patch: { supported: true },
        bulk: { supported: false },
        filter: { supported: true, maxResults: 1000 },
        changePassword: { supported: false },
        sort: { supported: true },
        etag: { supported: true },
        authenticationSchemes: [
          {
            type: 'oauthbearertoken',
            name: 'OAuth Bearer Token',
            description: 'Authentication via OAuth 2.0 Bearer Token',
            specUri: 'https://tools.ietf.org/html/rfc6750',
          },
        ],
      });
  });

  logger.info('SCIM 2.0 routes registered');
}
