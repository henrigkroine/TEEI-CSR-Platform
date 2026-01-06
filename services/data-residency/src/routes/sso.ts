/**
 * SSO Configuration Routes
 * REST API for managing SAML/OIDC identity provider configurations
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SsoService } from '../lib/sso-service.js';
import { SsoConfigCreate, SsoConfigUpdate } from '../types/sso.js';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('sso-routes');
const ssoService = new SsoService();

function getActorId(request: FastifyRequest): string {
  return (request.headers['x-actor-id'] as string) || 'admin';
}

export async function ssoRoutes(app: FastifyInstance) {
  // List SSO configurations for tenant
  app.get('/v1/sso/configs', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tenantId } = request.query as { tenantId: string };

      if (!tenantId) {
        return reply.code(400).send({ error: 'tenantId required' });
      }

      const configs = await ssoService.listConfigs(tenantId);
      return reply.code(200).send(configs);
    } catch (error: any) {
      logger.error('List SSO configs error', { error });
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get SSO configuration by ID
  app.get('/v1/sso/configs/:configId', async (request: FastifyRequest<{ Params: { configId: string } }>, reply: FastifyReply) => {
    try {
      const { configId } = request.params;

      const config = await ssoService.getConfig(configId);
      if (!config) {
        return reply.code(404).send({ error: 'Config not found' });
      }

      return reply.code(200).send(config);
    } catch (error: any) {
      logger.error('Get SSO config error', { error });
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Create SSO configuration
  app.post('/v1/sso/configs', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const actorId = getActorId(request);
      const data = request.body as SsoConfigCreate;

      // Validation
      if (!data.tenantId || !data.name || !data.type) {
        return reply.code(400).send({ error: 'tenantId, name, and type required' });
      }

      if (data.type === 'saml' && !data.samlConfig) {
        return reply.code(400).send({ error: 'samlConfig required for SAML type' });
      }

      if (data.type === 'oidc' && !data.oidcConfig) {
        return reply.code(400).send({ error: 'oidcConfig required for OIDC type' });
      }

      const config = await ssoService.createConfig(data, actorId);
      return reply.code(201).send(config);
    } catch (error: any) {
      logger.error('Create SSO config error', { error });
      return reply.code(500).send({ error: error.message });
    }
  });

  // Update SSO configuration
  app.put('/v1/sso/configs/:configId', async (request: FastifyRequest<{ Params: { configId: string } }>, reply: FastifyReply) => {
    try {
      const { configId } = request.params;
      const actorId = getActorId(request);
      const data = request.body as SsoConfigUpdate;

      const config = await ssoService.updateConfig(configId, data, actorId);
      if (!config) {
        return reply.code(404).send({ error: 'Config not found' });
      }

      return reply.code(200).send(config);
    } catch (error: any) {
      logger.error('Update SSO config error', { error });
      return reply.code(500).send({ error: error.message });
    }
  });

  // Delete SSO configuration
  app.delete('/v1/sso/configs/:configId', async (request: FastifyRequest<{ Params: { configId: string } }>, reply: FastifyReply) => {
    try {
      const { configId } = request.params;

      const deleted = await ssoService.deleteConfig(configId);
      if (!deleted) {
        return reply.code(404).send({ error: 'Config not found' });
      }

      return reply.code(204).send();
    } catch (error: any) {
      logger.error('Delete SSO config error', { error });
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Test SSO configuration
  app.post('/v1/sso/configs/:configId/test', async (request: FastifyRequest<{ Params: { configId: string } }>, reply: FastifyReply) => {
    try {
      const { configId } = request.params;

      const result = await ssoService.testConfig(configId);
      return reply.code(200).send(result);
    } catch (error: any) {
      logger.error('Test SSO config error', { error });
      return reply.code(500).send({ error: error.message });
    }
  });

  // Get SP metadata XML
  app.get('/v1/sso/metadata/:tenantId', async (request: FastifyRequest<{ Params: { tenantId: string } }>, reply: FastifyReply) => {
    try {
      const { tenantId } = request.params;

      const metadata = await ssoService.getSpMetadata(tenantId);

      // Generate SAML metadata XML
      const xml = `<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
                  entityID="${metadata.entityId}">
  <SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <KeyDescriptor use="signing">
      <KeyInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
        <X509Data>
          <X509Certificate>${metadata.certificate.replace(/-----BEGIN CERTIFICATE-----|\n|-----END CERTIFICATE-----/g, '')}</X509Certificate>
        </X509Data>
      </KeyInfo>
    </KeyDescriptor>
    <AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                              Location="${metadata.acsUrl}"
                              index="1" />
    <SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                         Location="${metadata.sloUrl}" />
  </SPSSODescriptor>
</EntityDescriptor>`;

      return reply.code(200).header('Content-Type', 'application/xml').send(xml);
    } catch (error: any) {
      logger.error('Get SP metadata error', { error });
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  logger.info('SSO routes registered');
}
