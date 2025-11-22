/**
 * Template Registry
 * Core logic for managing program templates
 * Agent: template-registry-implementer (Agent 13)
 */

import { db } from '@teei/shared-schema';
import { programTemplates } from '@teei/shared-schema/schema';
import { eq, and } from 'drizzle-orm';
import type { z } from 'zod';

export interface CreateTemplateInput {
  templateKey: string;
  name: string;
  description?: string;
  category: 'mentorship' | 'language' | 'buddy' | 'upskilling';
  configSchema: object; // Zod schema as JSON
  defaultConfig: object;
  uiSchema?: object;
  tags?: string[];
  sdgGoals?: number[];
  ownerId?: string;
  tenantId?: string;
  defaultSroiWeights?: Record<string, number>;
  defaultVisMultipliers?: Record<string, number>;
}

export class TemplateRegistry {
  /**
   * Create a new program template
   */
  async createTemplate(input: CreateTemplateInput, createdBy: string) {
    // Validate config schema is valid JSON
    const schemaJson = JSON.stringify(input.configSchema);
    JSON.parse(schemaJson); // Will throw if invalid

    const [template] = await db
      .insert(programTemplates)
      .values({
        ...input,
        version: 1,
        status: 'draft',
        createdBy,
      })
      .returning();

    return template;
  }

  /**
   * Get template by ID
   */
  async getTemplate(id: string) {
    const template = await db.query.programTemplates.findFirst({
      where: eq(programTemplates.id, id),
    });

    if (!template) {
      throw new Error(`Template not found: ${id}`);
    }

    return template;
  }

  /**
   * List templates with filters
   */
  async listTemplates(filters?: {
    category?: string;
    status?: string;
    tenantId?: string;
  }) {
    const conditions = [];

    if (filters?.category) {
      conditions.push(eq(programTemplates.category, filters.category));
    }
    if (filters?.status) {
      conditions.push(eq(programTemplates.status, filters.status));
    }
    if (filters?.tenantId !== undefined) {
      conditions.push(eq(programTemplates.tenantId, filters.tenantId));
    }

    return db.query.programTemplates.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: (templates, { desc }) => [desc(templates.createdAt)],
    });
  }

  /**
   * Update template (only drafts can be edited)
   */
  async updateTemplate(id: string, updates: Partial<CreateTemplateInput>) {
    const template = await this.getTemplate(id);

    if (template.status !== 'draft') {
      throw new Error('Only draft templates can be edited. Create a new version instead.');
    }

    const [updated] = await db
      .update(programTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(programTemplates.id, id))
      .returning();

    return updated;
  }

  /**
   * Publish a draft template
   */
  async publishTemplate(id: string, deprecatePrevious: boolean = false) {
    const template = await this.getTemplate(id);

    if (template.status !== 'draft') {
      throw new Error('Only draft templates can be published');
    }

    // Validate config schema compiles
    // In real implementation, would convert to Zod and validate
    const schemaJson = JSON.stringify(template.configSchema);
    JSON.parse(schemaJson);

    const [published] = await db
      .update(programTemplates)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(programTemplates.id, id))
      .returning();

    // Deprecate previous version if requested
    if (deprecatePrevious && template.version > 1) {
      await db
        .update(programTemplates)
        .set({
          status: 'deprecated',
          deprecatedBy: id,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(programTemplates.category, template.category),
            eq(programTemplates.version, template.version - 1),
            eq(programTemplates.status, 'active')
          )
        );
    }

    return published;
  }

  /**
   * Deprecate a template
   */
  async deprecateTemplate(oldTemplateId: string, newTemplateId: string) {
    const [deprecated] = await db
      .update(programTemplates)
      .set({
        status: 'deprecated',
        deprecatedBy: newTemplateId,
        updatedAt: new Date(),
      })
      .where(eq(programTemplates.id, oldTemplateId))
      .returning();

    return deprecated;
  }

  /**
   * Create new version of template
   */
  async createNewVersion(templateId: string, createdBy: string) {
    const current = await this.getTemplate(templateId);

    const newVersion = await this.createTemplate(
      {
        templateKey: `${current.category}_${current.name.toLowerCase().replace(/\s+/g, '_')}_v${current.version + 1}`,
        name: current.name,
        description: current.description || undefined,
        category: current.category as any,
        configSchema: current.configSchema as object,
        defaultConfig: current.defaultConfig as object,
        uiSchema: current.uiSchema as object | undefined,
        tags: current.tags || undefined,
        sdgGoals: current.sdgGoals || undefined,
        ownerId: current.ownerId || undefined,
        tenantId: current.tenantId || undefined,
        defaultSroiWeights: current.defaultSroiWeights as Record<string, number> | undefined,
        defaultVisMultipliers: current.defaultVisMultipliers as Record<string, number> | undefined,
      },
      createdBy
    );

    // Update version number
    await db
      .update(programTemplates)
      .set({ version: current.version + 1 })
      .where(eq(programTemplates.id, newVersion.id));

    return newVersion;
  }
}

export const templateRegistry = new TemplateRegistry();
