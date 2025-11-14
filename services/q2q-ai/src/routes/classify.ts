import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getDb } from '@teei/shared-utils';
import { classifyText, extractEvidenceSnippets } from '../classifier.js';
import { getRealClassifier, isRealClassifierEnabled } from '../classifier-real.js';
import { OutcomeDimension, getAllDimensionDefinitions } from '../taxonomy.js';

// Request validation schema
const ClassifyTextSchema = z.object({
  text: z.string().min(1).max(10000),
  userId: z.string().uuid(),
  contextId: z.string().uuid().optional(),
  contextType: z.enum(['conversation', 'survey', 'assessment', 'other']).optional().default('other')
});

type ClassifyTextRequest = z.infer<typeof ClassifyTextSchema>;

export const classifyRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /classify/text
   *
   * Classifies text and stores results in outcome_scores and evidence_snippets tables
   */
  app.post<{ Body: ClassifyTextRequest }>('/classify/text', async (request, reply) => {
    try {
      // Validate request body
      const { text, userId, contextId, contextType } = ClassifyTextSchema.parse(request.body);

      // Run classification - use real classifier if enabled, otherwise use stub
      let classification;
      let evidenceMap: Record<OutcomeDimension, string> = {} as any;

      if (isRealClassifierEnabled()) {
        app.log.info('Using real LLM-based classifier');
        const realClassifier = getRealClassifier();
        const result = await realClassifier.classifyText(text);

        // Convert to expected format
        classification = {
          scores: result.scores,
          metadata: {
            textLength: result.metadata.textLength,
            wordCount: result.metadata.wordCount,
            timestamp: result.metadata.timestamp,
          }
        };

        // Store evidence snippets for later use
        evidenceMap = result.evidenceSnippets;
      } else {
        app.log.info('Using stub classifier');
        classification = await classifyText(text);
      }

      // Get database connection
      const db = getDb();

      // Store outcome scores and evidence snippets
      const scoreIds: Record<OutcomeDimension, string> = {} as any;

      for (const [dimension, score] of Object.entries(classification.scores)) {
        // Insert outcome score
        const [scoreRecord] = await db('outcome_scores')
          .insert({
            user_id: userId,
            dimension: dimension,
            score: score,
            context_id: contextId,
            context_type: contextType,
            recorded_at: new Date()
          })
          .returning('id');

        scoreIds[dimension as OutcomeDimension] = scoreRecord.id;

        // Extract and store evidence snippets
        let snippets;
        if (isRealClassifierEnabled() && evidenceMap[dimension as OutcomeDimension]) {
          // Use evidence from real classifier
          snippets = [evidenceMap[dimension as OutcomeDimension]];
        } else {
          // Use stub extraction
          snippets = extractEvidenceSnippets(text, dimension as OutcomeDimension, score);
        }

        for (const snippet of snippets) {
          await db('evidence_snippets').insert({
            outcome_score_id: scoreRecord.id,
            snippet_text: snippet,
            confidence: score, // Using classification score as confidence for stub
            position_start: 0, // Stub values
            position_end: snippet.length
          });
        }
      }

      // Return classification results
      return {
        success: true,
        classification: {
          scores: classification.scores,
          metadata: classification.metadata,
          scoreIds: scoreIds
        },
        message: 'Text classified successfully'
      };

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
      }

      app.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /taxonomy
   *
   * Returns outcome dimension definitions
   */
  app.get('/taxonomy', async (request, reply) => {
    try {
      const definitions = getAllDimensionDefinitions();

      return {
        success: true,
        dimensions: definitions,
        count: definitions.length
      };

    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
};
