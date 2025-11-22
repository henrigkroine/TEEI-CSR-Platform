/**
 * Program Instantiator
 * Logic for creating programs from templates
 * Agent: template-instantiator (Agent 14)
 */

import { db } from '@teei/shared-schema';
import { programs, programTemplates } from '@teei/shared-schema/schema';
import { eq } from 'drizzle-orm';
import { templateRegistry } from './template-registry.js';
import { resolveConfig, validateConfig } from './config-resolver.js';

export interface CreateProgramInput {
  templateId: string;
  name: string;
  description?: string;
  beneficiaryGroupId?: string;
  configOverrides?: object;
  startDate?: string;
  endDate?: string;
  tags?: string[];
  sdgGoals?: number[];
  externalId?: string;
}

export class ProgramInstantiator {
  /**
   * Create a program from a template
   */
  async instantiateProgram(input: CreateProgramInput, createdBy: string) {
    // 1. Fetch template
    const template = await templateRegistry.getTemplate(input.templateId);

    if (template.status !== 'active') {
      throw new Error('Can only instantiate programs from active templates');
    }

    // 2. Validate config overrides against template schema
    const { effective: mergedConfig } = resolveConfig(
      template.defaultConfig as object,
      input.configOverrides || {}
    );

    const validation = validateConfig(mergedConfig, template.configSchema as object);
    if (!validation.valid) {
      throw new Error(`Config validation failed: ${JSON.stringify(validation.errors)}`);
    }

    // 3. Generate unique program key
    const programKey = this.generateProgramKey(input.name);

    // 4. Create program
    const [program] = await db
      .insert(programs)
      .values({
        programKey,
        templateId: input.templateId,
        name: input.name,
        description: input.description,
        programType: template.category,
        config: mergedConfig as any,
        configOverrides: input.configOverrides as any,
        beneficiaryGroupId: input.beneficiaryGroupId,
        status: 'draft',
        startDate: input.startDate,
        endDate: input.endDate,
        tags: input.tags,
        sdgGoals: input.sdgGoals,
        externalId: input.externalId,
        createdBy,
      })
      .returning();

    // 5. Emit event (in real impl)
    // await eventBus.publish('program.created', { programId: program.id, ... });

    return program;
  }

  /**
   * Get program by ID
   */
  async getProgram(id: string) {
    const program = await db.query.programs.findFirst({
      where: eq(programs.id, id),
      with: {
        template: true,
        beneficiaryGroup: true,
      },
    });

    if (!program) {
      throw new Error(`Program not found: ${id}`);
    }

    return program;
  }

  /**
   * Update program config
   */
  async updateProgramConfig(programId: string, configOverrides: object) {
    const program = await this.getProgram(programId);

    // Get template for validation
    const template = await templateRegistry.getTemplate(program.templateId);

    // Merge and validate new config
    const { effective: newConfig } = resolveConfig(
      template.defaultConfig as object,
      configOverrides
    );

    const validation = validateConfig(newConfig, template.configSchema as object);
    if (!validation.valid) {
      throw new Error(`Config validation failed: ${JSON.stringify(validation.errors)}`);
    }

    // Update program
    const [updated] = await db
      .update(programs)
      .set({
        config: newConfig as any,
        configOverrides: configOverrides as any,
        updatedAt: new Date(),
      })
      .where(eq(programs.id, programId))
      .returning();

    return updated;
  }

  /**
   * Update program status
   */
  async updateProgramStatus(
    programId: string,
    status: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
  ) {
    const [updated] = await db
      .update(programs)
      .set({ status, updatedAt: new Date() })
      .where(eq(programs.id, programId))
      .returning();

    // Emit event
    // await eventBus.publish(`program.${status}`, { programId, status });

    return updated;
  }

  /**
   * Generate unique program key
   */
  private generateProgramKey(name: string): string {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const timestamp = Date.now().toString(36);
    return `${slug}-${timestamp}`;
  }
}

export const programInstantiator = new ProgramInstantiator();
