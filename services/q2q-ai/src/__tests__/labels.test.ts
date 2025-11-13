import { describe, it, expect } from 'vitest';
import {
  ClassificationOutputSchema,
  classificationToLegacyScores,
  LanguageComfort,
  EmployabilitySignal,
  RiskCue
} from '../labels';

describe('labels', () => {
  describe('ClassificationOutputSchema', () => {
    it('should validate a valid classification output', () => {
      const validOutput = {
        confidence_increase: true,
        confidence_decrease: false,
        belonging_increase: true,
        belonging_decrease: false,
        language_comfort: LanguageComfort.HIGH,
        employability_signals: [EmployabilitySignal.JOB_SEARCH],
        risk_cues: [],
        evidence: [
          {
            snippet: 'I feel more confident',
            label_type: 'confidence_increase',
            reasoning: 'Expresses increased confidence'
          }
        ]
      };

      const result = ClassificationOutputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid classification output', () => {
      const invalidOutput = {
        confidence_increase: 'not a boolean',
        confidence_decrease: false,
        belonging_increase: true,
        belonging_decrease: false,
        language_comfort: 'invalid',
        employability_signals: [],
        risk_cues: [],
        evidence: []
      };

      const result = ClassificationOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });
  });

  describe('classificationToLegacyScores', () => {
    it('should convert confidence increase to high score', () => {
      const classification = {
        confidence_increase: true,
        confidence_decrease: false,
        belonging_increase: false,
        belonging_decrease: false,
        language_comfort: LanguageComfort.MEDIUM,
        employability_signals: [],
        risk_cues: [],
        evidence: []
      };

      const scores = classificationToLegacyScores(classification);
      expect(scores.confidence).toBe(0.8);
    });

    it('should convert confidence decrease to low score', () => {
      const classification = {
        confidence_increase: false,
        confidence_decrease: true,
        belonging_increase: false,
        belonging_decrease: false,
        language_comfort: LanguageComfort.MEDIUM,
        employability_signals: [],
        risk_cues: [],
        evidence: []
      };

      const scores = classificationToLegacyScores(classification);
      expect(scores.confidence).toBe(0.2);
    });

    it('should map language comfort levels correctly', () => {
      const classificationLow = {
        confidence_increase: false,
        confidence_decrease: false,
        belonging_increase: false,
        belonging_decrease: false,
        language_comfort: LanguageComfort.LOW,
        employability_signals: [],
        risk_cues: [],
        evidence: []
      };

      const classificationHigh = {
        ...classificationLow,
        language_comfort: LanguageComfort.HIGH
      };

      const scoresLow = classificationToLegacyScores(classificationLow);
      const scoresHigh = classificationToLegacyScores(classificationHigh);

      expect(scoresLow.lang_level_proxy).toBe(0.3);
      expect(scoresHigh.lang_level_proxy).toBe(0.9);
    });

    it('should calculate job readiness from employability signals', () => {
      const classification = {
        confidence_increase: false,
        confidence_decrease: false,
        belonging_increase: false,
        belonging_decrease: false,
        language_comfort: LanguageComfort.MEDIUM,
        employability_signals: [
          EmployabilitySignal.JOB_SEARCH,
          EmployabilitySignal.RESUME_IMPROVEMENT,
          EmployabilitySignal.NETWORKING
        ],
        risk_cues: [],
        evidence: []
      };

      const scores = classificationToLegacyScores(classification);
      expect(scores.job_readiness).toBeGreaterThan(0.5);
      expect(scores.job_readiness).toBeLessThanOrEqual(1.0);
    });

    it('should calculate well-being inversely from risk cues', () => {
      const classificationNoRisk = {
        confidence_increase: false,
        confidence_decrease: false,
        belonging_increase: false,
        belonging_decrease: false,
        language_comfort: LanguageComfort.MEDIUM,
        employability_signals: [],
        risk_cues: [],
        evidence: []
      };

      const classificationHighRisk = {
        ...classificationNoRisk,
        risk_cues: [
          RiskCue.ISOLATION,
          RiskCue.FRUSTRATION,
          RiskCue.ANXIETY
        ]
      };

      const scoresNoRisk = classificationToLegacyScores(classificationNoRisk);
      const scoresHighRisk = classificationToLegacyScores(classificationHighRisk);

      expect(scoresNoRisk.well_being).toBeGreaterThan(scoresHighRisk.well_being);
      expect(scoresHighRisk.well_being).toBeGreaterThanOrEqual(0.1);
    });
  });
});
