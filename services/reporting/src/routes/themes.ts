import type { FastifyPluginAsync } from 'fastify';
import { getTheme, updateTheme, removeLogo } from '../controllers/themes.js';

export const themeRoutes: FastifyPluginAsync = async (fastify) => {
  // GET theme for a company
  fastify.get('/companies/:id/theme', {
    schema: {
      description: 'Get theme configuration for a company',
      tags: ['themes'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            company_id: { type: 'string', format: 'uuid' },
            logo_url: { type: ['string', 'null'] },
            colors: {
              type: 'object',
              properties: {
                light: {
                  type: 'object',
                  properties: {
                    primary: { type: 'string', pattern: '^#[0-9A-F]{6}$' },
                    secondary: { type: 'string', pattern: '^#[0-9A-F]{6}$' },
                    accent: { type: 'string', pattern: '^#[0-9A-F]{6}$' },
                    textOnPrimary: { type: 'string', pattern: '^#[0-9A-F]{6}$' },
                    textOnSecondary: { type: 'string', pattern: '^#[0-9A-F]{6}$' },
                    textOnAccent: { type: 'string', pattern: '^#[0-9A-F]{6}$' },
                  },
                },
                dark: {
                  type: 'object',
                  properties: {
                    primary: { type: 'string', pattern: '^#[0-9A-F]{6}$' },
                    secondary: { type: 'string', pattern: '^#[0-9A-F]{6}$' },
                    accent: { type: 'string', pattern: '^#[0-9A-F]{6}$' },
                  },
                },
              },
            },
            contrast_validation: {
              type: 'object',
              properties: {
                is_compliant: { type: 'boolean' },
                ratios: { type: 'object' },
                warnings: { type: 'array', items: { type: 'string' } },
              },
            },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    handler: getTheme,
  });

  // PUT update theme
  fastify.put('/companies/:id/theme', {
    schema: {
      description: 'Update theme configuration for a company',
      tags: ['themes'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          logo: {
            type: 'object',
            properties: {
              data: { type: 'string', description: 'Base64 encoded image data' },
              mimeType: { type: 'string', enum: ['image/png', 'image/svg+xml'] },
            },
          },
          primary_color: { type: 'string', pattern: '^#[0-9A-F]{6}$' },
          secondary_color: { type: 'string', pattern: '^#[0-9A-F]{6}$' },
          accent_color: { type: 'string', pattern: '^#[0-9A-F]{6}$' },
          primary_color_dark: { type: 'string', pattern: '^#[0-9A-F]{6}$' },
          secondary_color_dark: { type: 'string', pattern: '^#[0-9A-F]{6}$' },
          accent_color_dark: { type: 'string', pattern: '^#[0-9A-F]{6}$' },
          text_on_primary: { type: 'string', pattern: '^#[0-9A-F]{6}$' },
          text_on_secondary: { type: 'string', pattern: '^#[0-9A-F]{6}$' },
          text_on_accent: { type: 'string', pattern: '^#[0-9A-F]{6}$' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            company_id: { type: 'string', format: 'uuid' },
            logo_url: { type: ['string', 'null'] },
            colors: { type: 'object' },
            contrast_validation: { type: 'object' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    handler: updateTheme,
  });

  // DELETE logo
  fastify.delete('/companies/:id/theme/logo', {
    schema: {
      description: 'Remove logo from company theme',
      tags: ['themes'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      response: {
        204: {
          type: 'null',
          description: 'Logo removed successfully',
        },
      },
    },
    handler: removeLogo,
  });
};
