/**
 * Semantic chunking for evidence documents
 * Splits text into meaningful chunks for embedding and retrieval
 */

export interface ChunkConfig {
  maxChunkSize: number; // Maximum characters per chunk
  minChunkSize: number; // Minimum characters per chunk
  overlapSize: number; // Overlap between chunks (for context continuity)
  splitStrategy: 'sentence' | 'paragraph' | 'semantic' | 'sliding';
}

export interface TextChunk {
  text: string;
  start: number; // Character position in original text
  end: number;
  chunkIndex: number;
  metadata: {
    sentences?: number;
    tokens?: number;
    language?: string;
  };
}

/**
 * Default chunking configuration
 * Optimized for feedback text and evidence snippets
 */
export const DEFAULT_CHUNK_CONFIG: ChunkConfig = {
  maxChunkSize: 512, // ~512 chars = ~128 tokens (rough estimate)
  minChunkSize: 100,
  overlapSize: 50,
  splitStrategy: 'sentence'
};

/**
 * Semantic text chunker
 */
export class TextChunker {
  private config: ChunkConfig;

  constructor(config: Partial<ChunkConfig> = {}) {
    this.config = { ...DEFAULT_CHUNK_CONFIG, ...config };
  }

  /**
   * Split text into chunks based on configured strategy
   */
  chunk(text: string, language = 'en'): TextChunk[] {
    switch (this.config.splitStrategy) {
      case 'sentence':
        return this.sentenceBasedChunking(text, language);
      case 'paragraph':
        return this.paragraphBasedChunking(text);
      case 'sliding':
        return this.slidingWindowChunking(text);
      case 'semantic':
        return this.semanticChunking(text, language);
      default:
        return this.sentenceBasedChunking(text, language);
    }
  }

  /**
   * Sentence-based chunking (most common for feedback text)
   * Groups sentences until maxChunkSize is reached
   */
  private sentenceBasedChunking(text: string, language: string): TextChunk[] {
    const sentences = this.splitIntoSentences(text, language);
    const chunks: TextChunk[] = [];
    let currentChunk = '';
    let chunkStart = 0;
    let chunkIndex = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];

      // If adding this sentence exceeds max size and we have content
      if (currentChunk.length + sentence.text.length > this.config.maxChunkSize && currentChunk.length > 0) {
        // Create chunk from accumulated sentences
        chunks.push({
          text: currentChunk.trim(),
          start: chunkStart,
          end: chunkStart + currentChunk.length,
          chunkIndex: chunkIndex++,
          metadata: {
            sentences: currentChunk.split(/[.!?]+/).filter(s => s.trim()).length,
            language
          }
        });

        // Start new chunk with overlap
        const overlapText = this.getOverlapText(currentChunk, this.config.overlapSize);
        currentChunk = overlapText + ' ' + sentence.text;
        chunkStart = sentence.start - overlapText.length - 1;
      } else {
        // Add sentence to current chunk
        currentChunk += (currentChunk ? ' ' : '') + sentence.text;
        if (!currentChunk.length) chunkStart = sentence.start;
      }
    }

    // Add final chunk if it meets minimum size
    if (currentChunk.length >= this.config.minChunkSize) {
      chunks.push({
        text: currentChunk.trim(),
        start: chunkStart,
        end: chunkStart + currentChunk.length,
        chunkIndex: chunkIndex,
        metadata: {
          sentences: currentChunk.split(/[.!?]+/).filter(s => s.trim()).length,
          language
        }
      });
    } else if (chunks.length > 0) {
      // Merge small final chunk with last chunk
      chunks[chunks.length - 1].text += ' ' + currentChunk.trim();
      chunks[chunks.length - 1].end += currentChunk.length + 1;
    }

    return chunks;
  }

  /**
   * Paragraph-based chunking
   * Splits on paragraph boundaries (double newlines)
   */
  private paragraphBasedChunking(text: string): TextChunk[] {
    const paragraphs = text.split(/\n\s*\n/);
    const chunks: TextChunk[] = [];
    let position = 0;
    let chunkIndex = 0;

    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (trimmed.length >= this.config.minChunkSize) {
        chunks.push({
          text: trimmed,
          start: position,
          end: position + trimmed.length,
          chunkIndex: chunkIndex++,
          metadata: {
            sentences: trimmed.split(/[.!?]+/).filter(s => s.trim()).length
          }
        });
      }
      position += para.length + 2; // +2 for \n\n
    }

    return chunks;
  }

  /**
   * Sliding window chunking
   * Fixed-size windows with overlap
   */
  private slidingWindowChunking(text: string): TextChunk[] {
    const chunks: TextChunk[] = [];
    const stride = this.config.maxChunkSize - this.config.overlapSize;
    let chunkIndex = 0;

    for (let i = 0; i < text.length; i += stride) {
      const chunkText = text.slice(i, i + this.config.maxChunkSize);

      if (chunkText.length >= this.config.minChunkSize) {
        chunks.push({
          text: chunkText,
          start: i,
          end: i + chunkText.length,
          chunkIndex: chunkIndex++,
          metadata: {}
        });
      }
    }

    return chunks;
  }

  /**
   * Semantic chunking using topic/theme boundaries
   * (Simplified version - production would use embeddings for similarity)
   */
  private semanticChunking(text: string, language: string): TextChunk[] {
    // For now, fall back to sentence-based with larger chunks
    // Real semantic chunking would:
    // 1. Split into sentences
    // 2. Embed each sentence
    // 3. Group by embedding similarity
    // 4. Create chunks at similarity discontinuities

    return this.sentenceBasedChunking(text, language);
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string, language: string): Array<{ text: string; start: number }> {
    // Simple sentence splitter
    // Production would use libraries like 'sentence-splitter' or language-specific rules
    const sentenceRegex = /[^.!?]+[.!?]+/g;
    const sentences: Array<{ text: string; start: number }> = [];
    let match;
    let lastIndex = 0;

    while ((match = sentenceRegex.exec(text)) !== null) {
      sentences.push({
        text: match[0].trim(),
        start: match.index
      });
      lastIndex = sentenceRegex.lastIndex;
    }

    // Add remaining text if any
    if (lastIndex < text.length) {
      const remaining = text.slice(lastIndex).trim();
      if (remaining) {
        sentences.push({
          text: remaining,
          start: lastIndex
        });
      }
    }

    return sentences;
  }

  /**
   * Get last N characters for overlap
   */
  private getOverlapText(text: string, overlapSize: number): string {
    if (text.length <= overlapSize) return text;

    // Try to find last sentence boundary within overlap
    const overlapText = text.slice(-overlapSize);
    const sentenceEnd = overlapText.lastIndexOf('. ');

    if (sentenceEnd > 0) {
      return overlapText.slice(sentenceEnd + 2);
    }

    return overlapText;
  }

  /**
   * Estimate token count (rough approximation)
   * Average: 1 token ≈ 4 characters for English
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

/**
 * Specialized chunker for feedback evidence
 * Optimized for short-form user feedback and check-in notes
 */
export class FeedbackChunker extends TextChunker {
  constructor() {
    super({
      maxChunkSize: 384, // Smaller chunks for short feedback
      minChunkSize: 50,
      overlapSize: 30,
      splitStrategy: 'sentence'
    });
  }

  /**
   * Special handling for very short feedback
   */
  chunk(text: string, language = 'en'): TextChunk[] {
    // If feedback is already short enough, return as single chunk
    if (text.length <= this.config.maxChunkSize) {
      return [{
        text: text.trim(),
        start: 0,
        end: text.length,
        chunkIndex: 0,
        metadata: {
          sentences: text.split(/[.!?]+/).filter(s => s.trim()).length,
          language,
          tokens: this.estimateTokens(text)
        }
      }];
    }

    return super.chunk(text, language);
  }
}

/**
 * Batch process multiple documents
 */
export function chunkDocuments(
  documents: Array<{ id: string; text: string; language?: string }>,
  config?: Partial<ChunkConfig>
): Array<TextChunk & { documentId: string }> {
  const chunker = new TextChunker(config);
  const allChunks: Array<TextChunk & { documentId: string }> = [];

  for (const doc of documents) {
    const chunks = chunker.chunk(doc.text, doc.language || 'en');
    allChunks.push(...chunks.map(chunk => ({
      ...chunk,
      documentId: doc.id
    })));
  }

  return allChunks;
}
