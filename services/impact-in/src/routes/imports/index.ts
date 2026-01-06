/**
 * Import Routes
 * Data Importer & Mapping Studio APIs (Worker 22)
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';
import {
  ImportSession,
  ImportSessionStatus,
  CreateImportSessionRequest,
  CreateImportSessionResponse,
  CreateImportSessionRequestSchema,
  UploadFileResponse,
  SaveMappingRequest,
  SaveMappingResponse,
  SaveMappingRequestSchema,
  GeneratePreviewRequest,
  GeneratePreviewResponse,
  GeneratePreviewRequestSchema,
  CommitImportRequest,
  CommitImportResponse,
  CommitImportRequestSchema,
  GetErrorsResponse,
  RetryImportRequest,
  RetryImportResponse,
  RetryImportRequestSchema,
  ListTemplatesResponse,
  ListImportSessionsResponse,
} from '@teei/shared-types';
import { sessionStore } from './session-store.js';
import { parseAndInferSchema } from '../../importers/parser.js';
import { validateMapping } from '../../importers/validator.js';
import { generatePreview } from '../../importers/preview.js';
import { commitIngestion } from '../../importers/loader.js';
import { templateStore } from './template-store.js';
import { createHash } from 'crypto';

/**
 * Register import routes
 */
export async function registerImportRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /v1/impact-in/imports/sessions - Create a new import session
  fastify.post<{
    Body: CreateImportSessionRequest;
    Reply: CreateImportSessionResponse;
  }>(
    '/v1/impact-in/imports/sessions',
    {
      schema: {
        description: 'Create a new import session for CSV/XLSX/JSON upload',
        tags: ['imports'],
        body: CreateImportSessionRequestSchema,
      },
    },
    async (request, reply) => {
      try {
        const { fileName, fileFormat, fileSize, templateId } = request.body;

        // Extract tenant and user from auth context (would come from middleware)
        const tenantId = (request as any).tenantId || randomUUID();
        const userId = (request as any).userId || randomUUID();

        // Validate file size (max 200MB)
        const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB
        if (fileSize > MAX_FILE_SIZE) {
          return reply.status(400).send({
            success: false,
            error: 'FileTooLarge',
            message: `File size ${fileSize} bytes exceeds maximum ${MAX_FILE_SIZE} bytes (200MB)`,
          });
        }

        // Load template if provided
        let mappingConfig;
        if (templateId) {
          const template = await templateStore.getTemplate(tenantId, templateId);
          if (template) {
            mappingConfig = template.config;
          }
        }

        // Create session
        const session: ImportSession = {
          id: randomUUID(),
          tenantId,
          userId,
          status: 'created' as ImportSessionStatus,
          fileName,
          fileFormat,
          fileSize,
          fileHash: '', // Will be computed on upload
          previewGenerated: false,
          templateId,
          mappingConfig,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        };

        // Save session
        await sessionStore.saveSession(session);

        request.log.info({ sessionId: session.id, tenantId, userId }, 'Import session created');

        return reply.status(201).send({
          session,
          // In production, this would be a pre-signed S3 URL
          uploadUrl: `/v1/impact-in/imports/sessions/${session.id}/upload`,
        });
      } catch (error: any) {
        request.log.error({ error }, 'Failed to create import session');
        return reply.status(500).send({
          success: false,
          error: 'InternalServerError',
          message: error.message,
        });
      }
    }
  );

  // POST /v1/impact-in/imports/sessions/:id/upload - Upload file and infer schema
  fastify.post<{
    Params: { id: string };
    Reply: UploadFileResponse;
  }>(
    '/v1/impact-in/imports/sessions/:id/upload',
    {
      schema: {
        description: 'Upload file for import session and infer schema',
        tags: ['imports'],
        consumes: ['multipart/form-data'],
      },
    },
    async (request, reply) => {
      try {
        const sessionId = request.params.id;
        const tenantId = (request as any).tenantId || randomUUID();

        // Load session
        const session = await sessionStore.getSession(tenantId, sessionId);
        if (!session) {
          return reply.status(404).send({
            success: false,
            error: 'NotFound',
            message: `Import session ${sessionId} not found`,
          });
        }

        // Check session status
        if (session.status !== 'created' && session.status !== 'failed') {
          return reply.status(400).send({
            success: false,
            error: 'InvalidStatus',
            message: `Cannot upload to session in status ${session.status}`,
          });
        }

        // Process multipart upload
        const data = await request.file();
        if (!data) {
          return reply.status(400).send({
            success: false,
            error: 'NoFile',
            message: 'No file uploaded',
          });
        }

        // Update session status
        session.status = 'uploading';
        await sessionStore.saveSession(session);

        // Read file buffer
        const buffer = await data.toBuffer();

        // Compute file hash for idempotency
        const hash = createHash('sha256').update(buffer).digest('hex');
        session.fileHash = hash;

        // Check for duplicate import (same hash + tenant)
        const existingSession = await sessionStore.findByHash(tenantId, hash);
        if (existingSession && existingSession.id !== sessionId) {
          request.log.info(
            { sessionId, existingSessionId: existingSession.id, hash },
            'Duplicate import detected'
          );
          // Optionally return existing session or warning
        }

        // Parse and infer schema
        session.status = 'inferring';
        await sessionStore.saveSession(session);

        const inferredSchema = await parseAndInferSchema({
          buffer,
          format: session.fileFormat,
          fileName: session.fileName,
        });

        // Update session
        session.inferredSchema = inferredSchema;
        session.status = 'uploaded';
        session.updatedAt = new Date().toISOString();
        await sessionStore.saveSession(session);

        request.log.info(
          {
            sessionId,
            rowCount: inferredSchema.rowCount,
            columnCount: inferredSchema.columns.length,
          },
          'File uploaded and schema inferred'
        );

        return reply.send({
          sessionId: session.id,
          status: session.status,
          inferredSchema,
          message: 'File uploaded successfully',
        });
      } catch (error: any) {
        request.log.error({ error }, 'Failed to upload file');

        // Update session to failed
        const sessionId = request.params.id;
        const tenantId = (request as any).tenantId || randomUUID();
        const session = await sessionStore.getSession(tenantId, sessionId);
        if (session) {
          session.status = 'failed';
          session.errorMessage = error.message;
          session.updatedAt = new Date().toISOString();
          await sessionStore.saveSession(session);
        }

        return reply.status(500).send({
          success: false,
          error: 'UploadFailed',
          message: error.message,
        });
      }
    }
  );

  // POST /v1/impact-in/imports/sessions/:id/mapping - Save mapping configuration
  fastify.post<{
    Params: { id: string };
    Body: SaveMappingRequest;
    Reply: SaveMappingResponse;
  }>(
    '/v1/impact-in/imports/sessions/:id/mapping',
    {
      schema: {
        description: 'Save mapping configuration for import session',
        tags: ['imports'],
        body: SaveMappingRequestSchema,
      },
    },
    async (request, reply) => {
      try {
        const sessionId = request.params.id;
        const tenantId = (request as any).tenantId || randomUUID();
        const userId = (request as any).userId || randomUUID();
        const { mappingConfig, saveAsTemplate, templateName, templateDescription } = request.body;

        // Load session
        const session = await sessionStore.getSession(tenantId, sessionId);
        if (!session) {
          return reply.status(404).send({
            success: false,
            error: 'NotFound',
            message: `Import session ${sessionId} not found`,
          });
        }

        // Save mapping config to session
        session.mappingConfig = mappingConfig;
        session.status = 'mapped';
        session.updatedAt = new Date().toISOString();
        await sessionStore.saveSession(session);

        let templateId: string | undefined;

        // Save as template if requested
        if (saveAsTemplate && templateName) {
          const template = await templateStore.createTemplate({
            tenantId,
            userId,
            name: templateName,
            description: templateDescription,
            targetContract: mappingConfig.targetContract,
            config: mappingConfig,
          });
          templateId = template.id;
          session.templateId = templateId;
          await sessionStore.saveSession(session);
        }

        request.log.info({ sessionId, templateId }, 'Mapping configuration saved');

        return reply.send({
          sessionId: session.id,
          status: session.status,
          templateId,
          message: 'Mapping saved successfully',
        });
      } catch (error: any) {
        request.log.error({ error }, 'Failed to save mapping');
        return reply.status(500).send({
          success: false,
          error: 'InternalServerError',
          message: error.message,
        });
      }
    }
  );

  // POST /v1/impact-in/imports/sessions/:id/preview - Generate preview with validation
  fastify.post<{
    Params: { id: string };
    Body: GeneratePreviewRequest;
    Reply: GeneratePreviewResponse;
  }>(
    '/v1/impact-in/imports/sessions/:id/preview',
    {
      schema: {
        description: 'Generate preview with validation for import session',
        tags: ['imports'],
        body: GeneratePreviewRequestSchema,
      },
    },
    async (request, reply) => {
      try {
        const sessionId = request.params.id;
        const tenantId = (request as any).tenantId || randomUUID();
        const { sampleSize = 100 } = request.body;

        // Load session
        const session = await sessionStore.getSession(tenantId, sessionId);
        if (!session) {
          return reply.status(404).send({
            success: false,
            error: 'NotFound',
            message: `Import session ${sessionId} not found`,
          });
        }

        // Validate session state
        if (!session.inferredSchema) {
          return reply.status(400).send({
            success: false,
            error: 'InvalidState',
            message: 'No inferred schema available. Please upload file first.',
          });
        }

        if (!session.mappingConfig) {
          return reply.status(400).send({
            success: false,
            error: 'InvalidState',
            message: 'No mapping configuration available. Please configure mapping first.',
          });
        }

        // Update status
        session.status = 'previewing';
        await sessionStore.saveSession(session);

        // Generate preview
        const preview = await generatePreview({
          session,
          sampleSize,
        });

        // Update session
        session.previewGenerated = true;
        session.validationResult = preview.validationSummary;
        session.status = 'previewing';
        session.updatedAt = new Date().toISOString();
        await sessionStore.saveSession(session);

        request.log.info(
          {
            sessionId,
            totalRows: preview.totalRows,
            validRows: preview.validationSummary.validRows,
            errorRows: preview.validationSummary.errorRows,
          },
          'Preview generated'
        );

        return reply.send({
          sessionId: session.id,
          preview,
        });
      } catch (error: any) {
        request.log.error({ error }, 'Failed to generate preview');
        return reply.status(500).send({
          success: false,
          error: 'InternalServerError',
          message: error.message,
        });
      }
    }
  );

  // POST /v1/impact-in/imports/sessions/:id/commit - Commit import (start ingestion)
  fastify.post<{
    Params: { id: string };
    Body: CommitImportRequest;
    Reply: CommitImportResponse;
  }>(
    '/v1/impact-in/imports/sessions/:id/commit',
    {
      schema: {
        description: 'Commit import session and start ingestion',
        tags: ['imports'],
        body: CommitImportRequestSchema,
      },
    },
    async (request, reply) => {
      try {
        const sessionId = request.params.id;
        const tenantId = (request as any).tenantId || randomUUID();
        const { skipRowsWithErrors = false } = request.body;

        // Load session
        const session = await sessionStore.getSession(tenantId, sessionId);
        if (!session) {
          return reply.status(404).send({
            success: false,
            error: 'NotFound',
            message: `Import session ${sessionId} not found`,
          });
        }

        // Validate session state
        if (!session.previewGenerated) {
          return reply.status(400).send({
            success: false,
            error: 'InvalidState',
            message: 'Preview must be generated before committing',
          });
        }

        if (session.status === 'completed') {
          return reply.status(400).send({
            success: false,
            error: 'AlreadyCompleted',
            message: 'Import session already completed',
          });
        }

        // Check validation errors
        if (session.validationResult && session.validationResult.errorRows > 0) {
          if (!skipRowsWithErrors) {
            return reply.status(400).send({
              success: false,
              error: 'ValidationErrors',
              message: `${session.validationResult.errorRows} rows have validation errors. Set skipRowsWithErrors=true to proceed.`,
            });
          }
        }

        // Update status
        session.status = 'committing';
        session.ingestionStartedAt = new Date().toISOString();
        await sessionStore.saveSession(session);

        // Start ingestion job (async)
        const jobId = randomUUID();
        commitIngestion({
          session,
          skipRowsWithErrors,
          jobId,
        }).catch((error) => {
          request.log.error({ error, sessionId }, 'Ingestion job failed');
        });

        request.log.info({ sessionId, jobId }, 'Import committed, ingestion started');

        return reply.send({
          sessionId: session.id,
          status: session.status,
          jobId,
          message: 'Import committed successfully. Ingestion in progress.',
        });
      } catch (error: any) {
        request.log.error({ error }, 'Failed to commit import');
        return reply.status(500).send({
          success: false,
          error: 'InternalServerError',
          message: error.message,
        });
      }
    }
  );

  // GET /v1/impact-in/imports/sessions/:id - Get import session
  fastify.get<{
    Params: { id: string };
    Reply: ImportSession;
  }>(
    '/v1/impact-in/imports/sessions/:id',
    {
      schema: {
        description: 'Get import session details',
        tags: ['imports'],
      },
    },
    async (request, reply) => {
      try {
        const sessionId = request.params.id;
        const tenantId = (request as any).tenantId || randomUUID();

        const session = await sessionStore.getSession(tenantId, sessionId);
        if (!session) {
          return reply.status(404).send({
            success: false,
            error: 'NotFound',
            message: `Import session ${sessionId} not found`,
          });
        }

        return reply.send(session);
      } catch (error: any) {
        request.log.error({ error }, 'Failed to get import session');
        return reply.status(500).send({
          success: false,
          error: 'InternalServerError',
          message: error.message,
        });
      }
    }
  );

  // GET /v1/impact-in/imports/sessions/:id/errors - Get validation errors
  fastify.get<{
    Params: { id: string };
    Reply: GetErrorsResponse;
  }>(
    '/v1/impact-in/imports/sessions/:id/errors',
    {
      schema: {
        description: 'Get validation errors for import session',
        tags: ['imports'],
      },
    },
    async (request, reply) => {
      try {
        const sessionId = request.params.id;
        const tenantId = (request as any).tenantId || randomUUID();

        const session = await sessionStore.getSession(tenantId, sessionId);
        if (!session) {
          return reply.status(404).send({
            success: false,
            error: 'NotFound',
            message: `Import session ${sessionId} not found`,
          });
        }

        const errors = session.validationResult?.errors || [];

        return reply.send({
          sessionId: session.id,
          errors,
          downloadUrl: session.rejectedRowsPath
            ? `/v1/impact-in/imports/sessions/${sessionId}/errors/download`
            : undefined,
        });
      } catch (error: any) {
        request.log.error({ error }, 'Failed to get errors');
        return reply.status(500).send({
          success: false,
          error: 'InternalServerError',
          message: error.message,
        });
      }
    }
  );

  // GET /v1/impact-in/imports/templates - List mapping templates
  fastify.get<{
    Reply: ListTemplatesResponse;
  }>(
    '/v1/impact-in/imports/templates',
    {
      schema: {
        description: 'List mapping templates for tenant',
        tags: ['imports'],
      },
    },
    async (request, reply) => {
      try {
        const tenantId = (request as any).tenantId || randomUUID();

        const templates = await templateStore.listTemplates(tenantId);

        return reply.send({
          templates,
          total: templates.length,
        });
      } catch (error: any) {
        request.log.error({ error }, 'Failed to list templates');
        return reply.status(500).send({
          success: false,
          error: 'InternalServerError',
          message: error.message,
        });
      }
    }
  );

  // GET /v1/impact-in/imports/sessions - List import sessions
  fastify.get<{
    Querystring: { page?: number; pageSize?: number };
    Reply: ListImportSessionsResponse;
  }>(
    '/v1/impact-in/imports/sessions',
    {
      schema: {
        description: 'List import sessions for tenant',
        tags: ['imports'],
      },
    },
    async (request, reply) => {
      try {
        const tenantId = (request as any).tenantId || randomUUID();
        const page = request.query.page || 1;
        const pageSize = request.query.pageSize || 20;

        const { sessions, total } = await sessionStore.listSessions(tenantId, page, pageSize);

        return reply.send({
          sessions,
          total,
          page,
          pageSize,
        });
      } catch (error: any) {
        request.log.error({ error }, 'Failed to list sessions');
        return reply.status(500).send({
          success: false,
          error: 'InternalServerError',
          message: error.message,
        });
      }
    }
  );

  fastify.log.info('Import routes registered');
}
