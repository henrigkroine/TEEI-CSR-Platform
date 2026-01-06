import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getDb } from '@teei/shared-utils';
import { classifyText, extractEvidenceSnippets } from '../classifier.js';
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

      // Generate correlation ID for tracking
      const correlationId = `classify-${userId}-${Date.now()}`;

      // Run classification using AI inference
      const classification = await classifyText(text, {
        correlationId,
        userId
      });

      // Get database connection
      const db = getDb();

      // Store outcome scores and evidence snippets
      const scoreIds: Record<OutcomeDimension, string> = {} as any;

      for (const [dimension, score] of Object.entries(classification.scores)) {
        // Insert outcome score with AI metadata
        const [scoreRecord] = await db('outcome_scores')
          .insert({
            text_id: contextId || userId, // Use contextId if provided, otherwise userId
            text_type: contextType,
            dimension: dimension,
            score: score,
            confidence: score, // For now, use score as confidence
            model_version: classification.metadata.modelName || 'unknown',
            method: 'ai_classifier',
            provider_used: classification.metadata.provider || 'unknown',
            created_at: new Date()
          })
          .returning('id');

        scoreIds[dimension as OutcomeDimension] = scoreRecord.id;
      }

      // Extract and store evidence snippets from raw classification
      if (classification.rawClassification) {
        const { extractEvidenceSnippets: extractSnippets } = await import('../classifier.js');
        const snippets = extractSnippets(text, classification.rawClassification);

        for (const snippet of snippets) {
          // Insert evidence snippet with all metadata
          await db('evidence_snippets').insert({
            outcome_score_id: scoreIds[OutcomeDimension.CONFIDENCE], // Link to first score
            snippet_text: snippet.snippet,
            snippet_hash: snippet.hash,
            source_ref: snippet.labelType,
            embedding: null, // TODO: Add embedding generation
            created_at: new Date()
          }).onConflict('snippet_hash').ignore(); // Avoid duplicate snippets
        }
      }

      // Return classification results
      return {
        success: true,
        classification: {
          scores: classification.scores,
          metadata: classification.metadata,
          scoreIds: scoreIds,
          rawLabels: classification.rawClassification ? {
            confidence_increase: classification.rawClassification.confidence_increase,
            confidence_decrease: classification.rawClassification.confidence_decrease,
            belonging_increase: classification.rawClassification.belonging_increase,
            belonging_decrease: classification.rawClassification.belonging_decrease,
            language_comfort: classification.rawClassification.language_comfort,
            employability_signals: classification.rawClassification.employability_signals,
            risk_cues: classification.rawClassification.risk_cues
          } : undefined
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
