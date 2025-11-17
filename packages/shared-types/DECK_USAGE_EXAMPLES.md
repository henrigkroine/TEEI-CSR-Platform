# Deck Types Usage Examples

This document provides practical examples of using the deck types for PPTX/PDF generation in the TEEI CSR Platform.

## Table of Contents

- [Basic Deck Creation](#basic-deck-creation)
- [Validation](#validation)
- [Slide Types](#slide-types)
- [Generation Requests](#generation-requests)
- [Export Requests](#export-requests)
- [Advanced Examples](#advanced-examples)

## Basic Deck Creation

### Creating a Simple Quarterly Deck

```typescript
import {
  DeckDefinition,
  DeckTemplate,
  SlideBlock,
  validateDeckDefinition,
} from '@teei/shared-types';

const quarterlyDeck: DeckDefinition = {
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
    logoUrl: 'https://example.com/logo.png',
  },
  slides: [
    {
      id: '550e8400-e29b-41d4-a716-446655440010',
      type: 'title',
      title: 'Q1 2024 Impact Report',
      content: 'Corporate Social Responsibility Overview',
      order: 0,
      citationIds: [],
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440011',
      type: 'content',
      title: 'Key Metrics',
      content: 'In Q1 2024, we achieved significant milestones across all CSR programs.',
      citationIds: ['550e8400-e29b-41d4-a716-446655440100'],
      order: 1,
    },
  ],
  metadata: {
    createdAt: '2024-03-15T10:00:00Z',
    createdBy: '550e8400-e29b-41d4-a716-446655440002',
    estimatedPages: 15,
    citationCount: 42,
  },
};

// Validate the deck
try {
  const validDeck = validateDeckDefinition(quarterlyDeck);
  console.log('Deck is valid!', validDeck);
} catch (error) {
  console.error('Validation failed:', error);
}
```

### Creating an Investor Update Deck

```typescript
const investorDeck: DeckDefinition = {
  id: '550e8400-e29b-41d4-a716-446655440003',
  companyId: '550e8400-e29b-41d4-a716-446655440001',
  template: 'investor',
  periodStart: '2024-01-01T00:00:00Z',
  periodEnd: '2024-12-31T23:59:59Z',
  locale: 'en',
  theme: {
    primaryColor: '#000000',
    secondaryColor: '#424242',
    accentColor: '#FFC107',
    logoUrl: 'https://example.com/investor-logo.png',
    fontFamily: 'Inter',
  },
  coverSlide: {
    title: '2024 ESG Performance Review',
    subtitle: 'Investor Update',
    date: 'December 2024',
    author: 'CSR Leadership Team',
  },
  watermark: {
    text: 'CONFIDENTIAL - INVESTORS ONLY',
    opacity: 0.2,
    position: 'bottom-right',
  },
  footerText: '© 2024 TEEI Platform | Confidential',
  slides: [
    // Slides here
  ],
  metadata: {
    createdAt: '2024-12-01T10:00:00Z',
    createdBy: '550e8400-e29b-41d4-a716-446655440002',
    estimatedPages: 25,
    citationCount: 78,
    status: 'approved',
    approvedAt: '2024-12-05T14:00:00Z',
    approvedBy: '550e8400-e29b-41d4-a716-446655440005',
  },
};
```

## Validation

### Safe Validation (No Exceptions)

```typescript
import { safeParseDeckDefinition, isValidTemplate } from '@teei/shared-types';

// Check if a template string is valid
const template = 'quarterly';
if (isValidTemplate(template)) {
  console.log('Valid template:', template);
}

// Safely parse deck data
const deckData = {
  // ... deck data from API or user input
};

const result = safeParseDeckDefinition(deckData);

if (result.success) {
  // Type-safe access to validated data
  console.log('Valid deck:', result.data);
  console.log('Number of slides:', result.data.slides.length);
} else {
  // Handle validation errors
  console.error('Validation errors:', result.error.issues);
}
```

### Validating Individual Components

```typescript
import {
  validateSlideBlock,
  validateDeckTheme,
  isValidSlideBlockType,
} from '@teei/shared-types';

// Validate a slide block
const slide = {
  id: '550e8400-e29b-41d4-a716-446655440010',
  type: 'chart',
  title: 'SROI Growth',
  order: 2,
  chartConfig: {
    type: 'line',
    data: { labels: ['Q1', 'Q2', 'Q3', 'Q4'], datasets: [] },
  },
};

try {
  const validSlide = validateSlideBlock(slide);
  console.log('Slide is valid:', validSlide);
} catch (error) {
  console.error('Invalid slide:', error);
}

// Check slide type
if (isValidSlideBlockType('chart')) {
  console.log('chart is a valid slide type');
}

// Validate theme
const theme = {
  primaryColor: '#1A73E8',
  secondaryColor: '#34A853',
  accentColor: '#FBBC04',
};

const validTheme = validateDeckTheme(theme);
console.log('Valid theme:', validTheme);
```

## Slide Types

### Title Slide

```typescript
const titleSlide: SlideBlock = {
  id: '550e8400-e29b-41d4-a716-446655440010',
  type: 'title',
  title: 'Q1 2024 Impact Report',
  content: 'Corporate Social Responsibility Overview',
  order: 0,
  citationIds: [],
  speakerNotes: 'Welcome the audience and introduce the report purpose.',
};
```

### Content Slide

```typescript
const contentSlide: SlideBlock = {
  id: '550e8400-e29b-41d4-a716-446655440011',
  type: 'content',
  title: 'Key Achievements',
  content: `
# Q1 Highlights

- **1,250 participants** engaged across all programs
- **4.2 SROI** achieved (up 15% from Q4 2023)
- **92% retention rate** in buddy program
- **85% job readiness improvement** in upskilling program
  `.trim(),
  citationIds: [
    '550e8400-e29b-41d4-a716-446655440100',
    '550e8400-e29b-41d4-a716-446655440101',
  ],
  order: 1,
  speakerNotes: 'Emphasize the 15% SROI growth and highlight retention rate.',
};
```

### Chart Slide

```typescript
const chartSlide: SlideBlock = {
  id: '550e8400-e29b-41d4-a716-446655440012',
  type: 'chart',
  title: 'SROI Trend Analysis',
  chartConfig: {
    type: 'line',
    data: {
      labels: ['Q1 2023', 'Q2 2023', 'Q3 2023', 'Q4 2023', 'Q1 2024'],
      datasets: [
        {
          label: 'SROI',
          data: [3.2, 3.5, 3.7, 3.6, 4.2],
          borderColor: '#1A73E8',
          backgroundColor: 'rgba(26, 115, 232, 0.1)',
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'SROI Growth Over Time',
        },
      },
    },
  },
  citationIds: ['550e8400-e29b-41d4-a716-446655440102'],
  order: 2,
  speakerNotes: 'Point out the steady growth trend and Q1 2024 peak.',
};
```

### Table Slide

```typescript
const tableSlide: SlideBlock = {
  id: '550e8400-e29b-41d4-a716-446655440013',
  type: 'table',
  title: 'Program Performance Summary',
  tableData: {
    headers: ['Program', 'Participants', 'SROI', 'VIS', 'Retention'],
    rows: [
      ['Buddy Program', '450', '3.8', '82', '92%'],
      ['Language Learning', '320', '4.5', '88', '87%'],
      ['Mentorship', '280', '4.2', '85', '90%'],
      ['Upskilling', '200', '5.1', '91', '85%'],
    ],
  },
  citationIds: ['550e8400-e29b-41d4-a716-446655440103'],
  order: 3,
  speakerNotes: 'Highlight upskilling program's highest SROI and VIS scores.',
};
```

### Image Slide

```typescript
const imageSlide: SlideBlock = {
  id: '550e8400-e29b-41d4-a716-446655440014',
  type: 'image',
  title: 'Community Impact',
  content: 'Volunteers participating in our environmental sustainability program',
  imageUrl: 'https://example.com/community-impact.jpg',
  citationIds: ['550e8400-e29b-41d4-a716-446655440104'],
  order: 4,
};
```

### Two-Column Layout

```typescript
const twoColumnSlide: SlideBlock = {
  id: '550e8400-e29b-41d4-a716-446655440015',
  type: 'two-column',
  title: 'Challenges & Solutions',
  leftColumn: `
## Challenges
- Participant engagement drop in winter months
- Limited mentor availability for upskilling
- Budget constraints for program expansion
  `.trim(),
  rightColumn: `
## Solutions
- Launched virtual engagement activities
- Recruited 25 new mentors from partner companies
- Secured additional funding through grants
  `.trim(),
  citationIds: ['550e8400-e29b-41d4-a716-446655440105'],
  order: 5,
  speakerNotes: 'Discuss how we turned challenges into opportunities.',
};
```

## Generation Requests

### Requesting a Quarterly Deck Generation

```typescript
import {
  GenerateDeckRequest,
  validateGenerateDeckRequest,
} from '@teei/shared-types';

const generateRequest: GenerateDeckRequest = {
  companyId: '550e8400-e29b-41d4-a716-446655440001',
  template: 'quarterly',
  period: {
    start: '2024-01-01',
    end: '2024-03-31',
  },
  locale: 'en',
  theme: {
    primaryColor: '#1A73E8',
    secondaryColor: '#34A853',
    accentColor: '#FBBC04',
  },
  options: {
    includeCharts: true,
    includeEvidence: true,
    includeSpeakerNotes: false,
    maxSlides: 20,
    tone: 'formal',
  },
};

// Validate the request
const validRequest = validateGenerateDeckRequest(generateRequest);

// Send to API
async function generateDeck(request: GenerateDeckRequest) {
  const response = await fetch('/api/decks/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  const result = await response.json();
  return result;
}

const deck = await generateDeck(validRequest);
console.log('Generated deck:', deck.deckId);
```

### Multi-locale Deck Generation

```typescript
// Generate decks for different locales
const locales = ['en', 'es', 'fr', 'uk', 'no'] as const;

for (const locale of locales) {
  const request: GenerateDeckRequest = {
    companyId: '550e8400-e29b-41d4-a716-446655440001',
    template: 'annual',
    period: {
      start: '2024-01-01',
      end: '2024-12-31',
    },
    locale,
    options: {
      tone: locale === 'en' ? 'formal' : 'conversational',
      maxSlides: 25,
    },
  };

  const deck = await generateDeck(request);
  console.log(`Generated ${locale} deck:`, deck.deckId);
}
```

## Export Requests

### Exporting to PPTX

```typescript
import {
  ExportDeckRequest,
  validateExportDeckRequest,
} from '@teei/shared-types';

const exportRequest: ExportDeckRequest = {
  deckId: '550e8400-e29b-41d4-a716-446655440000',
  format: 'pptx',
  options: {
    includeWatermark: true,
    includeEvidence: true,
    includeSpeakerNotes: true,
    quality: 'high',
  },
};

const validExportRequest = validateExportDeckRequest(exportRequest);

async function exportDeck(request: ExportDeckRequest) {
  const response = await fetch('/api/decks/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  const result = await response.json();
  return result;
}

const exportResult = await exportDeck(validExportRequest);
console.log('Download URL:', exportResult.downloadUrl);
console.log('File size:', exportResult.fileSize, 'bytes');
console.log('Checksum:', exportResult.checksum);
console.log('Expires at:', exportResult.expiresAt);
```

### Exporting to PDF for Print

```typescript
const pdfExportRequest: ExportDeckRequest = {
  deckId: '550e8400-e29b-41d4-a716-446655440000',
  format: 'pdf',
  options: {
    includeWatermark: false, // Clean for printing
    includeEvidence: true,
    includeSpeakerNotes: false, // No speaker notes in print version
    quality: 'print', // Highest quality for printing
  },
};

const pdfResult = await exportDeck(pdfExportRequest);

// Download the file
async function downloadFile(url: string, filename: string) {
  const response = await fetch(url);
  const blob = await response.blob();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

await downloadFile(pdfResult.downloadUrl, 'Q1-2024-Impact-Report.pdf');
```

## Advanced Examples

### Complete Workflow: Generate, Review, Export

```typescript
import {
  GenerateDeckRequest,
  DeckDefinition,
  ExportDeckRequest,
  ExportDeckResponse,
} from '@teei/shared-types';

async function createImpactDeck(companyId: string, year: number, quarter: number) {
  // 1. Generate the deck
  const generateRequest: GenerateDeckRequest = {
    companyId,
    template: 'quarterly',
    period: {
      start: `${year}-${(quarter - 1) * 3 + 1:02d}-01`,
      end: `${year}-${quarter * 3:02d}-31`,
    },
    locale: 'en',
    options: {
      includeCharts: true,
      includeEvidence: true,
      includeSpeakerNotes: true,
      maxSlides: 20,
      tone: 'formal',
    },
  };

  const generated = await generateDeck(generateRequest);
  console.log('✓ Deck generated:', generated.deckId);

  // 2. Review the deck (allow for manual review/edits)
  console.log('Please review the deck at:', `/decks/${generated.deckId}`);
  await waitForApproval(generated.deckId);

  // 3. Export to PPTX
  const pptxExport: ExportDeckRequest = {
    deckId: generated.deckId,
    format: 'pptx',
    options: {
      includeWatermark: true,
      includeEvidence: true,
      includeSpeakerNotes: true,
      quality: 'high',
    },
  };

  const pptxResult = await exportDeck(pptxExport);
  console.log('✓ PPTX exported:', pptxResult.downloadUrl);

  // 4. Export to PDF for archival
  const pdfExport: ExportDeckRequest = {
    deckId: generated.deckId,
    format: 'pdf',
    options: {
      includeWatermark: true,
      includeEvidence: true,
      includeSpeakerNotes: false,
      quality: 'print',
    },
  };

  const pdfResult = await exportDeck(pdfExport);
  console.log('✓ PDF exported:', pdfResult.downloadUrl);

  return {
    deckId: generated.deckId,
    pptx: pptxResult,
    pdf: pdfResult,
  };
}

// Usage
const result = await createImpactDeck(
  '550e8400-e29b-41d4-a716-446655440001',
  2024,
  1
);
console.log('Complete! Deck ID:', result.deckId);
```

### Batch Processing: Generate Decks for All Companies

```typescript
async function generateQuarterlyDecksForAllCompanies(
  companyIds: string[],
  year: number,
  quarter: number
) {
  const results = await Promise.allSettled(
    companyIds.map(async (companyId) => {
      const request: GenerateDeckRequest = {
        companyId,
        template: 'quarterly',
        period: {
          start: `${year}-${(quarter - 1) * 3 + 1:02d}-01`,
          end: `${year}-${quarter * 3:02d}-31`,
        },
        locale: 'en',
      };

      try {
        const deck = await generateDeck(request);
        return { companyId, success: true, deckId: deck.deckId };
      } catch (error) {
        return {
          companyId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    })
  );

  // Report results
  const successful = results.filter(
    (r) => r.status === 'fulfilled' && r.value.success
  );
  const failed = results.filter(
    (r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
  );

  console.log(`✓ Generated ${successful.length} decks`);
  console.log(`✗ Failed ${failed.length} decks`);

  return results;
}

// Generate Q1 2024 decks for 100 companies
const companyIds = [
  /* ... array of 100 company IDs ... */
];
const batchResults = await generateQuarterlyDecksForAllCompanies(
  companyIds,
  2024,
  1
);
```

### Custom Theme Application

```typescript
import { DeckTheme, DeckDefinition } from '@teei/shared-types';

// Company-specific themes
const companyThemes: Record<string, DeckTheme> = {
  'tech-startup': {
    primaryColor: '#4A90E2',
    secondaryColor: '#50E3C2',
    accentColor: '#F5A623',
    fontFamily: 'Roboto',
  },
  'enterprise': {
    primaryColor: '#1A1A1A',
    secondaryColor: '#4A4A4A',
    accentColor: '#0078D4',
    fontFamily: 'Segoe UI',
  },
  'nonprofit': {
    primaryColor: '#E74C3C',
    secondaryColor: '#3498DB',
    accentColor: '#F39C12',
    fontFamily: 'Open Sans',
  },
};

function applyBrandTheme(
  deck: DeckDefinition,
  companyType: keyof typeof companyThemes
): DeckDefinition {
  return {
    ...deck,
    theme: {
      ...deck.theme,
      ...companyThemes[companyType],
    },
  };
}

// Apply theme
let deck = createBasicDeck();
deck = applyBrandTheme(deck, 'tech-startup');
```

## TypeScript Integration

### Type Guards and Narrowing

```typescript
import {
  SlideBlock,
  DeckDefinition,
  isValidTemplate,
  isValidSlideBlockType,
} from '@teei/shared-types';

function processSlide(slide: SlideBlock) {
  // Type narrowing based on slide type
  switch (slide.type) {
    case 'chart':
      if (slide.chartConfig) {
        console.log('Processing chart:', slide.chartConfig);
      }
      break;
    case 'table':
      if (slide.tableData) {
        console.log('Processing table:', slide.tableData.headers);
      }
      break;
    case 'image':
      if (slide.imageUrl) {
        console.log('Processing image:', slide.imageUrl);
      }
      break;
    case 'two-column':
      if (slide.leftColumn && slide.rightColumn) {
        console.log('Processing two-column layout');
      }
      break;
  }
}

// Type-safe template checking
function getDeckColor(template: string): string {
  if (isValidTemplate(template)) {
    // TypeScript knows template is a valid DeckTemplate here
    switch (template) {
      case 'quarterly':
        return '#1A73E8';
      case 'annual':
        return '#34A853';
      case 'investor':
        return '#000000';
      case 'impact-deep-dive':
        return '#EA4335';
    }
  }
  return '#CCCCCC'; // Default color
}
```

---

## API Integration Examples

These schemas are designed to work seamlessly with the TEEI platform's REST APIs.

### Frontend Component Integration

```typescript
// React component example
import { useState } from 'react';
import {
  GenerateDeckRequest,
  ExportDeckRequest,
  DeckDefinition,
} from '@teei/shared-types';

function DeckGeneratorComponent({ companyId }: { companyId: string }) {
  const [deck, setDeck] = useState<DeckDefinition | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    const request: GenerateDeckRequest = {
      companyId,
      template: 'quarterly',
      period: {
        start: '2024-01-01',
        end: '2024-03-31',
      },
      locale: 'en',
    };

    try {
      const response = await fetch('/api/decks/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      const result = await response.json();
      setDeck(result.deck);
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleGenerate} disabled={loading}>
        {loading ? 'Generating...' : 'Generate Deck'}
      </button>
      {deck && <p>Generated deck with {deck.slides.length} slides</p>}
    </div>
  );
}
```

---

For more information, see the [TEEI Platform Documentation](/docs) and [Deck Generation API Reference](/docs/api/decks).
