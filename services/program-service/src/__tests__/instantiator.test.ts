/**
 * Agent 23: template-instantiation-tester
 * Unit tests for program instantiation from templates
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProgramInstantiator } from '../lib/instantiator.js';
import { db } from '@teei/shared-schema';
import { programs, programTemplates, beneficiaryGroups } from '@teei/shared-schema/schema';

// Mock database
vi.mock('@teei/shared-schema', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(),
        })),
      })),
    })),
    query: {
      programs: {
        findFirst: vi.fn(),
      },
      programTemplates: {
        findFirst: vi.fn(),
      },
    },
  },
  programs: {},
  programTemplates: {},
  beneficiaryGroups: {},
}));

// Mock template registry
vi.mock('../lib/template-registry.js', () => ({
  templateRegistry: {
    getTemplate: vi.fn(),
  },
}));

// Mock config resolver
vi.mock('../lib/config-resolver.js', () => ({
  resolveConfig: vi.fn((base, ...overrides) => ({
    effective: { ...base, ...overrides[0] },
    overridden: Object.keys(overrides[0] || {}),
  })),
  validateConfig: vi.fn(() => ({ valid: true, errors: [] })),
}));

describe('ProgramInstantiator', () => {
  let instantiator: ProgramInstantiator;
  let mockTemplateRegistry: any;

  beforeEach(() => {
    vi.clearAllMocks();
    instantiator = new ProgramInstantiator();
    mockTemplateRegistry = require('../lib/template-registry.js').templateRegistry;
  });

  describe('instantiateProgram', () => {
    it('should create a program from an active template', async () => {
      // Arrange
      const mockTemplate = {
        id: 'template-123',
        templateKey: 'mentorship-ukrainian',
        name: 'Mentorship for Ukrainians',
        category: 'mentorship',
        status: 'active',
        defaultConfig: {
          session: { defaultDurationMinutes: 60 },
          matching: { autoMatch: false },
        },
        configSchema: {},
      };

      const mockProgram = {
        id: 'program-456',
        programKey: 'mentorship-ukrainians-2024-abc123',
        templateId: 'template-123',
        name: 'Mentorship for Ukrainians 2024',
        programType: 'mentorship',
        config: {
          session: { defaultDurationMinutes: 90 },
          matching: { autoMatch: false },
        },
      };

      mockTemplateRegistry.getTemplate.mockResolvedValue(mockTemplate);
      (db.insert as any).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockProgram]),
        }),
      });

      // Act
      const result = await instantiator.instantiateProgram(
        {
          templateId: 'template-123',
          name: 'Mentorship for Ukrainians 2024',
          configOverrides: {
            session: { defaultDurationMinutes: 90 },
          },
        },
        'admin-user-123'
      );

      // Assert
      expect(mockTemplateRegistry.getTemplate).toHaveBeenCalledWith('template-123');
      expect(db.insert).toHaveBeenCalled();
      expect(result).toEqual(mockProgram);
    });

    it('should reject instantiation from non-active templates', async () => {
      // Arrange
      const mockTemplate = {
        id: 'template-123',
        status: 'draft',
      };

      mockTemplateRegistry.getTemplate.mockResolvedValue(mockTemplate);

      // Act & Assert
      await expect(
        instantiator.instantiateProgram(
          {
            templateId: 'template-123',
            name: 'Test Program',
          },
          'admin-user-123'
        )
      ).rejects.toThrow('Can only instantiate programs from active templates');
    });

    it('should validate config overrides against template schema', async () => {
      // Arrange
      const mockTemplate = {
        id: 'template-123',
        status: 'active',
        category: 'mentorship',
        defaultConfig: { session: { defaultDurationMinutes: 60 } },
        configSchema: {},
      };

      mockTemplateRegistry.getTemplate.mockResolvedValue(mockTemplate);

      const { validateConfig } = require('../lib/config-resolver.js');
      validateConfig.mockReturnValue({
        valid: false,
        errors: ['Invalid field: session.defaultDurationMinutes must be <= 180'],
      });

      // Act & Assert
      await expect(
        instantiator.instantiateProgram(
          {
            templateId: 'template-123',
            name: 'Test Program',
            configOverrides: {
              session: { defaultDurationMinutes: 999 },
            },
          },
          'admin-user-123'
        )
      ).rejects.toThrow(/Config validation failed/);
    });

    it('should generate unique program keys', async () => {
      // Arrange
      const mockTemplate = {
        id: 'template-123',
        status: 'active',
        category: 'mentorship',
        defaultConfig: {},
        configSchema: {},
      };

      mockTemplateRegistry.getTemplate.mockResolvedValue(mockTemplate);

      const mockProgram1 = { id: 'program-1', programKey: 'test-program-abc123' };
      const mockProgram2 = { id: 'program-2', programKey: 'test-program-def456' };

      (db.insert as any)
        .mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockProgram1]),
          }),
        })
        .mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockProgram2]),
          }),
        });

      // Act
      const result1 = await instantiator.instantiateProgram(
        { templateId: 'template-123', name: 'Test Program' },
        'admin-user-123'
      );

      const result2 = await instantiator.instantiateProgram(
        { templateId: 'template-123', name: 'Test Program' },
        'admin-user-123'
      );

      // Assert
      expect(result1.programKey).not.toEqual(result2.programKey);
    });

    it('should include beneficiaryGroupId and metadata in program', async () => {
      // Arrange
      const mockTemplate = {
        id: 'template-123',
        status: 'active',
        category: 'language',
        defaultConfig: {},
        configSchema: {},
      };

      const mockProgram = {
        id: 'program-456',
        beneficiaryGroupId: 'group-789',
        sdgGoals: [4, 8, 10],
        tags: ['ukrainian', 'language', 'integration'],
      };

      mockTemplateRegistry.getTemplate.mockResolvedValue(mockTemplate);
      (db.insert as any).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockProgram]),
        }),
      });

      // Act
      const result = await instantiator.instantiateProgram(
        {
          templateId: 'template-123',
          name: 'Language for Ukrainians',
          beneficiaryGroupId: 'group-789',
          sdgGoals: [4, 8, 10],
          tags: ['ukrainian', 'language', 'integration'],
        },
        'admin-user-123'
      );

      // Assert
      expect(result.beneficiaryGroupId).toBe('group-789');
      expect(result.sdgGoals).toEqual([4, 8, 10]);
      expect(result.tags).toEqual(['ukrainian', 'language', 'integration']);
    });
  });

  describe('updateProgramConfig', () => {
    it('should update program config with validation', async () => {
      // Arrange
      const mockProgram = {
        id: 'program-456',
        templateId: 'template-123',
        config: { session: { defaultDurationMinutes: 60 } },
      };

      const mockTemplate = {
        id: 'template-123',
        defaultConfig: { session: { defaultDurationMinutes: 60 } },
        configSchema: {},
      };

      (db.query.programs.findFirst as any).mockResolvedValue({
        ...mockProgram,
        template: mockTemplate,
        beneficiaryGroup: null,
      });

      mockTemplateRegistry.getTemplate.mockResolvedValue(mockTemplate);

      const updatedProgram = {
        ...mockProgram,
        config: { session: { defaultDurationMinutes: 90 } },
      };

      (db.update as any).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedProgram]),
          }),
        }),
      });

      // Act
      const result = await instantiator.updateProgramConfig('program-456', {
        session: { defaultDurationMinutes: 90 },
      });

      // Assert
      expect(result.config).toEqual({ session: { defaultDurationMinutes: 90 } });
    });

    it('should reject invalid config updates', async () => {
      // Arrange
      const mockProgram = {
        id: 'program-456',
        templateId: 'template-123',
      };

      const mockTemplate = {
        id: 'template-123',
        defaultConfig: {},
        configSchema: {},
      };

      (db.query.programs.findFirst as any).mockResolvedValue({
        ...mockProgram,
        template: mockTemplate,
      });

      mockTemplateRegistry.getTemplate.mockResolvedValue(mockTemplate);

      const { validateConfig } = require('../lib/config-resolver.js');
      validateConfig.mockReturnValue({
        valid: false,
        errors: ['Invalid config'],
      });

      // Act & Assert
      await expect(
        instantiator.updateProgramConfig('program-456', { invalid: 'config' })
      ).rejects.toThrow(/Config validation failed/);
    });
  });

  describe('updateProgramStatus', () => {
    it('should update program status', async () => {
      // Arrange
      const updatedProgram = {
        id: 'program-456',
        status: 'active',
      };

      (db.update as any).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedProgram]),
          }),
        }),
      });

      // Act
      const result = await instantiator.updateProgramStatus('program-456', 'active');

      // Assert
      expect(result.status).toBe('active');
    });
  });

  describe('getProgram', () => {
    it('should retrieve program with relations', async () => {
      // Arrange
      const mockProgram = {
        id: 'program-456',
        name: 'Test Program',
        template: {
          id: 'template-123',
          name: 'Test Template',
        },
        beneficiaryGroup: {
          id: 'group-789',
          name: 'Test Group',
        },
      };

      (db.query.programs.findFirst as any).mockResolvedValue(mockProgram);

      // Act
      const result = await instantiator.getProgram('program-456');

      // Assert
      expect(result).toEqual(mockProgram);
      expect(result.template).toBeDefined();
      expect(result.beneficiaryGroup).toBeDefined();
    });

    it('should throw error if program not found', async () => {
      // Arrange
      (db.query.programs.findFirst as any).mockResolvedValue(null);

      // Act & Assert
      await expect(instantiator.getProgram('nonexistent-id')).rejects.toThrow(
        /Program not found/
      );
    });
  });
});
