/**
 * Mapping Template Store
 * In-memory store for mapping templates (would be PostgreSQL in production)
 */

import { MappingTemplate, MappingConfig, EventContractTarget } from '@teei/shared-types';
import { randomUUID } from 'crypto';

interface CreateTemplateInput {
  tenantId: string;
  userId: string;
  name: string;
  description?: string;
  targetContract: EventContractTarget;
  config: MappingConfig;
}

class TemplateStore {
  private templates: Map<string, MappingTemplate> = new Map();

  async createTemplate(input: CreateTemplateInput): Promise<MappingTemplate> {
    const template: MappingTemplate = {
      id: randomUUID(),
      tenantId: input.tenantId,
      name: input.name,
      description: input.description,
      targetContract: input.targetContract,
      config: input.config,
      createdBy: input.userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
    };

    this.templates.set(`${template.tenantId}:${template.id}`, template);
    return template;
  }

  async getTemplate(tenantId: string, templateId: string): Promise<MappingTemplate | null> {
    return this.templates.get(`${tenantId}:${templateId}`) || null;
  }

  async listTemplates(tenantId: string): Promise<MappingTemplate[]> {
    const templates = Array.from(this.templates.values()).filter(
      (t) => t.tenantId === tenantId
    );

    // Sort by usage count desc, then by updatedAt desc
    templates.sort((a, b) => {
      if (a.usageCount !== b.usageCount) {
        return b.usageCount - a.usageCount;
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return templates;
  }

  async incrementUsage(tenantId: string, templateId: string): Promise<void> {
    const template = this.templates.get(`${tenantId}:${templateId}`);
    if (template) {
      template.usageCount += 1;
      template.updatedAt = new Date().toISOString();
      this.templates.set(`${tenantId}:${templateId}`, template);
    }
  }

  async deleteTemplate(tenantId: string, templateId: string): Promise<void> {
    this.templates.delete(`${tenantId}:${templateId}`);
  }

  // For testing
  clear(): void {
    this.templates.clear();
  }
}

export const templateStore = new TemplateStore();
