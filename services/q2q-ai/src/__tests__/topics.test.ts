import { describe, it, expect } from 'vitest';
import {
  extractTopics,
  extractTopicsWithConfidence,
  getAllTopics,
  isValidTopic,
  type Topic
} from '../tags/topics.js';

describe('Topic Tagging', () => {
  describe('extractTopics', () => {
    it('should extract CV topic', () => {
      const text = 'I updated my resume and added my latest work experience.';
      const topics = extractTopics(text);
      expect(topics).toContain('CV');
    });

    it('should extract interview topic', () => {
      const text = 'I have a job interview tomorrow and I am preparing answers to behavioral questions.';
      const topics = extractTopics(text);
      expect(topics).toContain('interview');
    });

    it('should extract PM topic', () => {
      const text = 'I am learning about agile project management and scrum methodologies.';
      const topics = extractTopics(text);
      expect(topics).toContain('PM');
    });

    it('should extract dev topic', () => {
      const text = 'I am coding a new feature in JavaScript and debugging some issues in my repository.';
      const topics = extractTopics(text);
      expect(topics).toContain('dev');
    });

    it('should extract networking topic', () => {
      const text = 'I attended a networking event and connected with professionals on LinkedIn.';
      const topics = extractTopics(text);
      expect(topics).toContain('networking');
    });

    it('should extract mentorship topic', () => {
      const text = 'My mentor gave me great feedback during our 1:1 session.';
      const topics = extractTopics(text);
      expect(topics).toContain('mentorship');
    });

    it('should extract multiple topics', () => {
      const text = 'I updated my CV, practiced interview questions with my mentor, and connected with developers on LinkedIn.';
      const topics = extractTopics(text);

      expect(topics).toContain('CV');
      expect(topics).toContain('interview');
      expect(topics).toContain('mentorship');
      expect(topics).toContain('networking');
      expect(topics.length).toBeGreaterThanOrEqual(4);
    });

    it('should return empty array for text without topics', () => {
      const text = 'I went to the store and bought some groceries.';
      const topics = extractTopics(text);
      expect(topics).toEqual([]);
    });

    it('should be case-insensitive', () => {
      const text1 = 'I updated my RESUME today.';
      const text2 = 'I updated my resume today.';

      const topics1 = extractTopics(text1);
      const topics2 = extractTopics(text2);

      expect(topics1).toEqual(topics2);
      expect(topics1).toContain('CV');
    });

    it('should use word boundaries', () => {
      const text = 'I am a developer not a developments person.';
      const topics = extractTopics(text);

      // Should match 'developer' but handle 'developments' appropriately
      expect(topics).toContain('dev');
    });

    it('should handle real learner feedback', () => {
      const text = `I've been applying to jobs every day this week.
                    My buddy helped me improve my resume and I feel much more confident
                    about my applications now. I even got a call back from two companies
                    and have interviews scheduled!`;

      const topics = extractTopics(text);

      expect(topics).toContain('CV');
      expect(topics).toContain('interview');
      expect(topics.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('extractTopicsWithConfidence', () => {
    it('should return topics with confidence scores', () => {
      const text = 'I updated my resume and CV multiple times. My application is ready.';
      const results = extractTopicsWithConfidence(text);

      expect(results.length).toBeGreaterThan(0);

      for (const result of results) {
        expect(result).toHaveProperty('topic');
        expect(result).toHaveProperty('confidence');
        expect(result).toHaveProperty('matchedKeywords');
        expect(result.confidence).toBeGreaterThan(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('should have higher confidence for multiple keyword matches', () => {
      const text1 = 'I am a developer.';
      const text2 = 'I am a developer working on coding and programming with JavaScript and Python.';

      const results1 = extractTopicsWithConfidence(text1);
      const results2 = extractTopicsWithConfidence(text2);

      const dev1 = results1.find(r => r.topic === 'dev');
      const dev2 = results2.find(r => r.topic === 'dev');

      if (dev1 && dev2) {
        expect(dev2.confidence).toBeGreaterThan(dev1.confidence);
        expect(dev2.matchedKeywords.length).toBeGreaterThan(dev1.matchedKeywords.length);
      }
    });

    it('should sort results by confidence descending', () => {
      const text = 'I am coding and programming every day. I also updated my resume once.';
      const results = extractTopicsWithConfidence(text);

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].confidence).toBeGreaterThanOrEqual(results[i].confidence);
      }
    });

    it('should include matched keywords', () => {
      const text = 'I updated my resume and curriculum vitae for my job application.';
      const results = extractTopicsWithConfidence(text);

      const cvTopic = results.find(r => r.topic === 'CV');
      expect(cvTopic).toBeDefined();
      expect(cvTopic?.matchedKeywords.length).toBeGreaterThan(0);
    });

    it('should handle text with no topics', () => {
      const text = 'I went shopping for groceries.';
      const results = extractTopicsWithConfidence(text);
      expect(results).toEqual([]);
    });
  });

  describe('getAllTopics', () => {
    it('should return all 6 topics', () => {
      const topics = getAllTopics();
      expect(topics).toHaveLength(6);
      expect(topics).toEqual(['CV', 'interview', 'PM', 'dev', 'networking', 'mentorship']);
    });

    it('should return consistent topics', () => {
      const topics1 = getAllTopics();
      const topics2 = getAllTopics();
      expect(topics1).toEqual(topics2);
    });
  });

  describe('isValidTopic', () => {
    it('should validate correct topics', () => {
      expect(isValidTopic('CV')).toBe(true);
      expect(isValidTopic('interview')).toBe(true);
      expect(isValidTopic('PM')).toBe(true);
      expect(isValidTopic('dev')).toBe(true);
      expect(isValidTopic('networking')).toBe(true);
      expect(isValidTopic('mentorship')).toBe(true);
    });

    it('should reject invalid topics', () => {
      expect(isValidTopic('invalid')).toBe(false);
      expect(isValidTopic('random')).toBe(false);
      expect(isValidTopic('')).toBe(false);
      expect(isValidTopic('cv')).toBe(false); // Case-sensitive
    });
  });

  describe('Real-world examples', () => {
    it('should handle mixed topic feedback', () => {
      const text = `Had a great mentorship session today where we reviewed my code.
                    My mentor helped me prepare for upcoming technical interviews and
                    gave feedback on my portfolio project. Planning to network at a
                    developer meetup next week.`;

      const topics = extractTopics(text);

      expect(topics).toContain('mentorship');
      expect(topics).toContain('dev');
      expect(topics).toContain('interview');
      expect(topics).toContain('networking');
      expect(topics.length).toBeGreaterThanOrEqual(4);
    });

    it('should handle job search feedback', () => {
      const text = `I applied to 5 companies this week and updated my resume with
                    my latest project. I have two phone screens scheduled and am
                    preparing answers to common interview questions.`;

      const topics = extractTopics(text);

      expect(topics).toContain('CV');
      expect(topics).toContain('interview');
    });

    it('should handle learning feedback', () => {
      const text = `Completed the JavaScript course and started learning React.
                    Working on a personal project to add to my portfolio.
                    My buddy has been helping me understand project management concepts.`;

      const topics = extractTopics(text);

      expect(topics).toContain('dev');
      expect(topics).toContain('mentorship');
      expect(topics).toContain('PM');
    });

    it('should handle Ukrainian text with Latin keywords', () => {
      const text = 'Я оновив своє resume та pracuюю над portfolio.';
      const topics = extractTopics(text);

      expect(topics).toContain('CV');
    });

    it('should handle Norwegian text', () => {
      const text = 'Jeg oppdaterte CV-en min og forberedte meg til intervju.';
      const topics = extractTopics(text);

      expect(topics).toContain('CV');
      expect(topics).toContain('interview');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string', () => {
      const topics = extractTopics('');
      expect(topics).toEqual([]);
    });

    it('should handle very short text', () => {
      const topics = extractTopics('code');
      expect(topics).toContain('dev');
    });

    it('should handle very long text', () => {
      const longText = 'I am learning development. '.repeat(100);
      const topics = extractTopics(longText);
      expect(topics).toContain('dev');
    });

    it('should handle special characters', () => {
      const text = 'My CV/resume is ready! Interview prep @#$ networking...';
      const topics = extractTopics(text);
      expect(topics).toContain('CV');
      expect(topics).toContain('interview');
      expect(topics).toContain('networking');
    });

    it('should handle URLs and code snippets', () => {
      const text = 'Check my portfolio at https://github.com/user/repo with JavaScript code.';
      const topics = extractTopics(text);
      expect(topics).toContain('dev');
    });
  });
});
