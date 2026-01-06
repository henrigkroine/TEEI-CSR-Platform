import { describe, it, expect } from 'vitest';
import {
  DeckTemplateSchema,
  SlideBlockTypeSchema,
  SlideBlockSchema,
  DeckThemeSchema,
  DeckMetadataSchema,
  DeckDefinitionSchema,
  GenerateDeckRequestSchema,
  ExportDeckRequestSchema,
  ExportDeckResponseSchema,
  validateDeckDefinition,
  safeParseDeckDefinition,
  isValidTemplate,
  isValidSlideBlockType,
  validateSlideBlock,
  validateDeckTheme,
  validateGenerateDeckRequest,
  validateExportDeckRequest,
  type DeckDefinition,
  type SlideBlock,
  type DeckTheme,
} from '../deck';

describe('DeckTemplateSchema', () => {
  it('should accept valid deck templates', () => {
    expect(DeckTemplateSchema.parse('quarterly')).toBe('quarterly');
    expect(DeckTemplateSchema.parse('annual')).toBe('annual');
    expect(DeckTemplateSchema.parse('investor')).toBe('investor');
    expect(DeckTemplateSchema.parse('impact-deep-dive')).toBe('impact-deep-dive');
  });

  it('should reject invalid templates', () => {
    expect(() => DeckTemplateSchema.parse('invalid')).toThrow();
    expect(() => DeckTemplateSchema.parse('')).toThrow();
    expect(() => DeckTemplateSchema.parse(null)).toThrow();
  });
});

describe('SlideBlockTypeSchema', () => {
  it('should accept valid slide block types', () => {
    const validTypes = ['title', 'content', 'chart', 'table', 'image', 'two-column'];
    validTypes.forEach((type) => {
      expect(SlideBlockTypeSchema.parse(type)).toBe(type);
    });
  });

  it('should reject invalid block types', () => {
    expect(() => SlideBlockTypeSchema.parse('invalid')).toThrow();
    expect(() => SlideBlockTypeSchema.parse('video')).toThrow();
  });
});

describe('SlideBlockSchema', () => {
  const validSlideBlock: SlideBlock = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    type: 'content',
    title: 'Key Metrics',
    content: 'Q1 2024 performance overview',
    citationIds: ['550e8400-e29b-41d4-a716-446655440001'],
    order: 1,
  };

  it('should accept valid slide block', () => {
    const result = SlideBlockSchema.parse(validSlideBlock);
    expect(result.id).toBe(validSlideBlock.id);
    expect(result.type).toBe('content');
    expect(result.citationIds).toHaveLength(1);
  });

  it('should default citationIds to empty array', () => {
    const block = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'title',
      order: 0,
    };
    const result = SlideBlockSchema.parse(block);
    expect(result.citationIds).toEqual([]);
  });

  it('should accept chart slide with chartConfig', () => {
    const chartSlide = {
      ...validSlideBlock,
      type: 'chart',
      chartConfig: {
        type: 'bar',
        data: { labels: ['Q1', 'Q2'], datasets: [] },
      },
    };
    const result = SlideBlockSchema.parse(chartSlide);
    expect(result.chartConfig).toBeDefined();
  });

  it('should accept table slide with tableData', () => {
    const tableSlide = {
      ...validSlideBlock,
      type: 'table',
      tableData: {
        headers: ['Metric', 'Value'],
        rows: [['SROI', '3.5'], ['VIS', '85']],
      },
    };
    const result = SlideBlockSchema.parse(tableSlide);
    expect(result.tableData?.headers).toHaveLength(2);
    expect(result.tableData?.rows).toHaveLength(2);
  });

  it('should accept two-column layout', () => {
    const twoColSlide = {
      ...validSlideBlock,
      type: 'two-column',
      leftColumn: 'Left content',
      rightColumn: 'Right content',
    };
    const result = SlideBlockSchema.parse(twoColSlide);
    expect(result.leftColumn).toBe('Left content');
    expect(result.rightColumn).toBe('Right content');
  });

  it('should accept speaker notes', () => {
    const slideWithNotes = {
      ...validSlideBlock,
      speakerNotes: 'Emphasize the growth trend',
    };
    const result = SlideBlockSchema.parse(slideWithNotes);
    expect(result.speakerNotes).toBe('Emphasize the growth trend');
  });

  it('should reject invalid UUID', () => {
    const invalidBlock = {
      ...validSlideBlock,
      id: 'not-a-uuid',
    };
    expect(() => SlideBlockSchema.parse(invalidBlock)).toThrow();
  });

  it('should reject negative order', () => {
    const invalidBlock = {
      ...validSlideBlock,
      order: -1,
    };
    expect(() => SlideBlockSchema.parse(invalidBlock)).toThrow();
  });

  it('should reject invalid citation UUID', () => {
    const invalidBlock = {
      ...validSlideBlock,
      citationIds: ['not-a-uuid'],
    };
    expect(() => SlideBlockSchema.parse(invalidBlock)).toThrow();
  });
});

describe('DeckThemeSchema', () => {
  const validTheme: DeckTheme = {
    primaryColor: '#1A73E8',
    secondaryColor: '#34A853',
    accentColor: '#FBBC04',
  };

  it('should accept valid theme', () => {
    const result = DeckThemeSchema.parse(validTheme);
    expect(result.primaryColor).toBe('#1A73E8');
  });

  it('should accept lowercase hex colors', () => {
    const theme = {
      primaryColor: '#1a73e8',
      secondaryColor: '#34a853',
      accentColor: '#fbbc04',
    };
    const result = DeckThemeSchema.parse(theme);
    expect(result.primaryColor).toBe('#1a73e8');
  });

  it('should accept optional logoUrl', () => {
    const themeWithLogo = {
      ...validTheme,
      logoUrl: 'https://example.com/logo.png',
    };
    const result = DeckThemeSchema.parse(themeWithLogo);
    expect(result.logoUrl).toBe('https://example.com/logo.png');
  });

  it('should accept optional fontFamily', () => {
    const themeWithFont = {
      ...validTheme,
      fontFamily: 'Inter',
    };
    const result = DeckThemeSchema.parse(themeWithFont);
    expect(result.fontFamily).toBe('Inter');
  });

  it('should reject invalid hex color format', () => {
    const invalidTheme = {
      ...validTheme,
      primaryColor: '#ZZZ',
    };
    expect(() => DeckThemeSchema.parse(invalidTheme)).toThrow();
  });

  it('should reject non-hex color format', () => {
    const invalidTheme = {
      ...validTheme,
      primaryColor: 'rgb(255,0,0)',
    };
    expect(() => DeckThemeSchema.parse(invalidTheme)).toThrow();
  });

  it('should reject invalid URL', () => {
    const invalidTheme = {
      ...validTheme,
      logoUrl: 'not-a-url',
    };
    expect(() => DeckThemeSchema.parse(invalidTheme)).toThrow();
  });
});

describe('DeckMetadataSchema', () => {
  const validMetadata = {
    createdAt: '2024-03-15T10:00:00Z',
    createdBy: '550e8400-e29b-41d4-a716-446655440000',
    estimatedPages: 15,
    citationCount: 42,
  };

  it('should accept valid metadata', () => {
    const result = DeckMetadataSchema.parse(validMetadata);
    expect(result.version).toBe(1); // Default
    expect(result.status).toBe('draft'); // Default
  });

  it('should accept all status values', () => {
    const statuses = ['draft', 'review', 'approved', 'archived'];
    statuses.forEach((status) => {
      const meta = { ...validMetadata, status };
      const result = DeckMetadataSchema.parse(meta);
      expect(result.status).toBe(status);
    });
  });

  it('should accept optional approval fields', () => {
    const approvedMeta = {
      ...validMetadata,
      approvedAt: '2024-03-16T10:00:00Z',
      approvedBy: '550e8400-e29b-41d4-a716-446655440001',
    };
    const result = DeckMetadataSchema.parse(approvedMeta);
    expect(result.approvedAt).toBeDefined();
    expect(result.approvedBy).toBeDefined();
  });

  it('should accept export metadata', () => {
    const exportedMeta = {
      ...validMetadata,
      exportedAt: '2024-03-17T10:00:00Z',
      exportFormat: 'pptx',
    };
    const result = DeckMetadataSchema.parse(exportedMeta);
    expect(result.exportFormat).toBe('pptx');
  });

  it('should reject zero pages', () => {
    const invalidMeta = {
      ...validMetadata,
      estimatedPages: 0,
    };
    expect(() => DeckMetadataSchema.parse(invalidMeta)).toThrow();
  });

  it('should reject negative citation count', () => {
    const invalidMeta = {
      ...validMetadata,
      citationCount: -1,
    };
    expect(() => DeckMetadataSchema.parse(invalidMeta)).toThrow();
  });
});

describe('DeckDefinitionSchema', () => {
  const validDeck: DeckDefinition = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    companyId: '550e8400-e29b-41d4-a716-446655440001',
    template: 'quarterly',
    periodStart: '2024-01-01T00:00:00Z',
    periodEnd: '2024-03-31T23:59:59Z',
    locale: 'en',
    theme: {
      primaryColor: '#1A73E8',
      secondaryColor: '#34A853',
      accentColor: '#FBBC04',
    },
    slides: [
      {
        id: '550e8400-e29b-41d4-a716-446655440010',
        type: 'title',
        title: 'Q1 2024 Impact Report',
        order: 0,
        citationIds: [],
      },
    ],
    metadata: {
      createdAt: '2024-03-15T10:00:00Z',
      createdBy: '550e8400-e29b-41d4-a716-446655440002',
      estimatedPages: 15,
      citationCount: 42,
    },
  };

  it('should accept valid deck definition', () => {
    const result = DeckDefinitionSchema.parse(validDeck);
    expect(result.id).toBe(validDeck.id);
    expect(result.slides).toHaveLength(1);
  });

  it('should default locale to en', () => {
    const { locale, ...deckWithoutLocale } = validDeck;
    const result = DeckDefinitionSchema.parse(deckWithoutLocale);
    expect(result.locale).toBe('en');
  });

  it('should accept all supported locales', () => {
    const locales = ['en', 'es', 'fr', 'uk', 'no'];
    locales.forEach((locale) => {
      const deck = { ...validDeck, locale };
      const result = DeckDefinitionSchema.parse(deck);
      expect(result.locale).toBe(locale);
    });
  });

  it('should accept multiple slides', () => {
    const multiSlideDeck = {
      ...validDeck,
      slides: [
        ...validDeck.slides,
        {
          id: '550e8400-e29b-41d4-a716-446655440011',
          type: 'content' as const,
          title: 'Key Metrics',
          order: 1,
          citationIds: [],
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440012',
          type: 'chart' as const,
          title: 'Growth Trends',
          order: 2,
          citationIds: [],
        },
      ],
    };
    const result = DeckDefinitionSchema.parse(multiSlideDeck);
    expect(result.slides).toHaveLength(3);
  });

  it('should accept optional cover slide', () => {
    const deckWithCover = {
      ...validDeck,
      coverSlide: {
        title: 'Q1 2024 Impact Report',
        subtitle: 'Corporate Social Responsibility Review',
        date: 'March 2024',
        author: 'CSR Team',
      },
    };
    const result = DeckDefinitionSchema.parse(deckWithCover);
    expect(result.coverSlide?.title).toBe('Q1 2024 Impact Report');
  });

  it('should accept optional watermark', () => {
    const deckWithWatermark = {
      ...validDeck,
      watermark: {
        text: 'CONFIDENTIAL',
        opacity: 0.2,
        position: 'bottom-right' as const,
      },
    };
    const result = DeckDefinitionSchema.parse(deckWithWatermark);
    expect(result.watermark?.text).toBe('CONFIDENTIAL');
    expect(result.watermark?.opacity).toBe(0.2);
  });

  it('should accept footer text', () => {
    const deckWithFooter = {
      ...validDeck,
      footerText: '© 2024 TEEI Platform',
    };
    const result = DeckDefinitionSchema.parse(deckWithFooter);
    expect(result.footerText).toBe('© 2024 TEEI Platform');
  });

  it('should reject empty slides array', () => {
    const invalidDeck = {
      ...validDeck,
      slides: [],
    };
    expect(() => DeckDefinitionSchema.parse(invalidDeck)).toThrow();
  });

  it('should reject invalid watermark opacity', () => {
    const invalidDeck = {
      ...validDeck,
      watermark: {
        text: 'CONFIDENTIAL',
        opacity: 1.5,
        position: 'bottom-right',
      },
    };
    expect(() => DeckDefinitionSchema.parse(invalidDeck)).toThrow();
  });
});

describe('GenerateDeckRequestSchema', () => {
  const validRequest = {
    companyId: '550e8400-e29b-41d4-a716-446655440000',
    template: 'quarterly',
    period: {
      start: '2024-01-01',
      end: '2024-03-31',
    },
  };

  it('should accept valid generation request', () => {
    const result = GenerateDeckRequestSchema.parse(validRequest);
    expect(result.companyId).toBe(validRequest.companyId);
    expect(result.locale).toBe('en'); // Default
  });

  it('should accept optional theme', () => {
    const requestWithTheme = {
      ...validRequest,
      theme: {
        primaryColor: '#1A73E8',
        secondaryColor: '#34A853',
        accentColor: '#FBBC04',
      },
    };
    const result = GenerateDeckRequestSchema.parse(requestWithTheme);
    expect(result.theme?.primaryColor).toBe('#1A73E8');
  });

  it('should accept generation options', () => {
    const requestWithOptions = {
      ...validRequest,
      options: {
        includeCharts: true,
        includeEvidence: false,
        includeSpeakerNotes: true,
        maxSlides: 25,
        tone: 'formal',
      },
    };
    const result = GenerateDeckRequestSchema.parse(requestWithOptions);
    expect(result.options?.maxSlides).toBe(25);
    expect(result.options?.tone).toBe('formal');
  });

  it('should apply default options', () => {
    const requestWithOptions = {
      ...validRequest,
      options: {},
    };
    const result = GenerateDeckRequestSchema.parse(requestWithOptions);
    expect(result.options?.includeCharts).toBe(true);
    expect(result.options?.includeEvidence).toBe(true);
    expect(result.options?.includeSpeakerNotes).toBe(false);
    expect(result.options?.maxSlides).toBe(20);
    expect(result.options?.tone).toBe('formal');
  });

  it('should reject maxSlides below minimum', () => {
    const invalidRequest = {
      ...validRequest,
      options: {
        maxSlides: 3,
      },
    };
    expect(() => GenerateDeckRequestSchema.parse(invalidRequest)).toThrow();
  });

  it('should reject maxSlides above maximum', () => {
    const invalidRequest = {
      ...validRequest,
      options: {
        maxSlides: 100,
      },
    };
    expect(() => GenerateDeckRequestSchema.parse(invalidRequest)).toThrow();
  });
});

describe('ExportDeckRequestSchema', () => {
  const validExportRequest = {
    deckId: '550e8400-e29b-41d4-a716-446655440000',
    format: 'pptx',
  };

  it('should accept valid export request', () => {
    const result = ExportDeckRequestSchema.parse(validExportRequest);
    expect(result.deckId).toBe(validExportRequest.deckId);
    expect(result.format).toBe('pptx');
  });

  it('should accept PDF format', () => {
    const pdfRequest = {
      ...validExportRequest,
      format: 'pdf',
    };
    const result = ExportDeckRequestSchema.parse(pdfRequest);
    expect(result.format).toBe('pdf');
  });

  it('should accept export options', () => {
    const requestWithOptions = {
      ...validExportRequest,
      options: {
        includeWatermark: false,
        includeEvidence: true,
        includeSpeakerNotes: true,
        quality: 'high',
      },
    };
    const result = ExportDeckRequestSchema.parse(requestWithOptions);
    expect(result.options?.quality).toBe('high');
    expect(result.options?.includeWatermark).toBe(false);
  });

  it('should apply default options', () => {
    const requestWithOptions = {
      ...validExportRequest,
      options: {},
    };
    const result = ExportDeckRequestSchema.parse(requestWithOptions);
    expect(result.options?.includeWatermark).toBe(true);
    expect(result.options?.quality).toBe('standard');
  });
});

describe('ExportDeckResponseSchema', () => {
  const validResponse = {
    deckId: '550e8400-e29b-41d4-a716-446655440000',
    format: 'pptx',
    downloadUrl: 'https://example.com/download/deck.pptx',
    fileSize: 2048000,
    expiresAt: '2024-03-20T10:00:00Z',
    checksum: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
    metadata: {
      exportedAt: '2024-03-15T10:00:00Z',
      exportedBy: '550e8400-e29b-41d4-a716-446655440001',
      pageCount: 15,
    },
  };

  it('should accept valid export response', () => {
    const result = ExportDeckResponseSchema.parse(validResponse);
    expect(result.fileSize).toBe(2048000);
    expect(result.metadata.pageCount).toBe(15);
  });
});

describe('Validation Helper Functions', () => {
  const validDeck: DeckDefinition = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    companyId: '550e8400-e29b-41d4-a716-446655440001',
    template: 'quarterly',
    periodStart: '2024-01-01T00:00:00Z',
    periodEnd: '2024-03-31T23:59:59Z',
    locale: 'en',
    theme: {
      primaryColor: '#1A73E8',
      secondaryColor: '#34A853',
      accentColor: '#FBBC04',
    },
    slides: [
      {
        id: '550e8400-e29b-41d4-a716-446655440010',
        type: 'title',
        title: 'Q1 2024 Impact Report',
        order: 0,
        citationIds: [],
      },
    ],
    metadata: {
      createdAt: '2024-03-15T10:00:00Z',
      createdBy: '550e8400-e29b-41d4-a716-446655440002',
      estimatedPages: 15,
      citationCount: 42,
    },
  };

  describe('validateDeckDefinition', () => {
    it('should validate correct deck definition', () => {
      const result = validateDeckDefinition(validDeck);
      expect(result.id).toBe(validDeck.id);
    });

    it('should throw on invalid deck definition', () => {
      const invalidDeck = { ...validDeck, slides: [] };
      expect(() => validateDeckDefinition(invalidDeck)).toThrow();
    });
  });

  describe('safeParseDeckDefinition', () => {
    it('should return success for valid deck', () => {
      const result = safeParseDeckDefinition(validDeck);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(validDeck.id);
      }
    });

    it('should return error for invalid deck', () => {
      const invalidDeck = { ...validDeck, slides: [] };
      const result = safeParseDeckDefinition(invalidDeck);
      expect(result.success).toBe(false);
    });
  });

  describe('isValidTemplate', () => {
    it('should return true for valid templates', () => {
      expect(isValidTemplate('quarterly')).toBe(true);
      expect(isValidTemplate('annual')).toBe(true);
      expect(isValidTemplate('investor')).toBe(true);
      expect(isValidTemplate('impact-deep-dive')).toBe(true);
    });

    it('should return false for invalid templates', () => {
      expect(isValidTemplate('invalid')).toBe(false);
      expect(isValidTemplate('')).toBe(false);
      expect(isValidTemplate('monthly')).toBe(false);
    });
  });

  describe('isValidSlideBlockType', () => {
    it('should return true for valid slide types', () => {
      expect(isValidSlideBlockType('title')).toBe(true);
      expect(isValidSlideBlockType('content')).toBe(true);
      expect(isValidSlideBlockType('chart')).toBe(true);
      expect(isValidSlideBlockType('table')).toBe(true);
      expect(isValidSlideBlockType('image')).toBe(true);
      expect(isValidSlideBlockType('two-column')).toBe(true);
    });

    it('should return false for invalid slide types', () => {
      expect(isValidSlideBlockType('video')).toBe(false);
      expect(isValidSlideBlockType('')).toBe(false);
      expect(isValidSlideBlockType('invalid')).toBe(false);
    });
  });

  describe('validateSlideBlock', () => {
    it('should validate correct slide block', () => {
      const slide = validDeck.slides[0];
      const result = validateSlideBlock(slide);
      expect(result.id).toBe(slide.id);
    });

    it('should throw on invalid slide block', () => {
      const invalidSlide = { type: 'title', order: 0 }; // Missing required id
      expect(() => validateSlideBlock(invalidSlide)).toThrow();
    });
  });

  describe('validateDeckTheme', () => {
    it('should validate correct theme', () => {
      const result = validateDeckTheme(validDeck.theme);
      expect(result.primaryColor).toBe('#1A73E8');
    });

    it('should throw on invalid theme', () => {
      const invalidTheme = {
        primaryColor: 'red',
        secondaryColor: '#34A853',
        accentColor: '#FBBC04',
      };
      expect(() => validateDeckTheme(invalidTheme)).toThrow();
    });
  });

  describe('validateGenerateDeckRequest', () => {
    it('should validate correct generation request', () => {
      const request = {
        companyId: '550e8400-e29b-41d4-a716-446655440000',
        template: 'quarterly',
        period: {
          start: '2024-01-01',
          end: '2024-03-31',
        },
      };
      const result = validateGenerateDeckRequest(request);
      expect(result.companyId).toBe(request.companyId);
    });

    it('should throw on invalid request', () => {
      const invalidRequest = {
        template: 'quarterly',
        period: {
          start: '2024-01-01',
          end: '2024-03-31',
        },
      };
      expect(() => validateGenerateDeckRequest(invalidRequest)).toThrow();
    });
  });

  describe('validateExportDeckRequest', () => {
    it('should validate correct export request', () => {
      const request = {
        deckId: '550e8400-e29b-41d4-a716-446655440000',
        format: 'pptx',
      };
      const result = validateExportDeckRequest(request);
      expect(result.deckId).toBe(request.deckId);
    });

    it('should throw on invalid request', () => {
      const invalidRequest = {
        format: 'pptx',
      };
      expect(() => validateExportDeckRequest(invalidRequest)).toThrow();
    });
  });
});

describe('Type Inference', () => {
  it('should correctly infer DeckDefinition type', () => {
    const deck: DeckDefinition = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      companyId: '550e8400-e29b-41d4-a716-446655440001',
      template: 'quarterly',
      periodStart: '2024-01-01T00:00:00Z',
      periodEnd: '2024-03-31T23:59:59Z',
      locale: 'en',
      theme: {
        primaryColor: '#1A73E8',
        secondaryColor: '#34A853',
        accentColor: '#FBBC04',
      },
      slides: [
        {
          id: '550e8400-e29b-41d4-a716-446655440010',
          type: 'title',
          order: 0,
          citationIds: [],
        },
      ],
      metadata: {
        createdAt: '2024-03-15T10:00:00Z',
        createdBy: '550e8400-e29b-41d4-a716-446655440002',
        estimatedPages: 15,
        citationCount: 42,
      },
    };

    // TypeScript should accept this without errors
    expect(deck.template).toBe('quarterly');
  });

  it('should correctly infer SlideBlock type', () => {
    const slide: SlideBlock = {
      id: '550e8400-e29b-41d4-a716-446655440010',
      type: 'chart',
      title: 'Growth Chart',
      order: 1,
      citationIds: [],
      chartConfig: {
        type: 'line',
        data: {},
      },
    };

    // TypeScript should accept this without errors
    expect(slide.type).toBe('chart');
  });

  it('should correctly infer DeckTheme type', () => {
    const theme: DeckTheme = {
      primaryColor: '#1A73E8',
      secondaryColor: '#34A853',
      accentColor: '#FBBC04',
      logoUrl: 'https://example.com/logo.png',
      fontFamily: 'Inter',
    };

    // TypeScript should accept this without errors
    expect(theme.fontFamily).toBe('Inter');
  });
});
