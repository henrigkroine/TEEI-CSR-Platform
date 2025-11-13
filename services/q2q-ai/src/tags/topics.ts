/**
 * Topic tagging for Q2Q text classification
 * Detects topics: CV, interview, PM (project management), dev (development), networking, mentorship
 */

export type Topic = 'CV' | 'interview' | 'PM' | 'dev' | 'networking' | 'mentorship';

/**
 * Keyword dictionary for each topic
 */
const TOPIC_KEYWORDS: Record<Topic, string[]> = {
  CV: [
    'resume', 'cv', 'curriculum vitae', 'application', 'portfolio',
    'experience', 'skills', 'qualifications', 'education',
    'work history', 'achievements', 'references', 'cover letter'
  ],
  interview: [
    'interview', 'job interview', 'phone screen', 'technical interview',
    'behavioral questions', 'interview prep', 'interview practice',
    'mock interview', 'interview questions', 'interviewing',
    'interview feedback', 'interview tips', 'panel interview'
  ],
  PM: [
    'project management', 'pm', 'project manager', 'agile', 'scrum',
    'sprint', 'backlog', 'kanban', 'jira', 'roadmap',
    'stakeholder', 'planning', 'milestone', 'deliverable',
    'project plan', 'project coordination', 'team lead'
  ],
  dev: [
    'development', 'coding', 'programming', 'software',
    'developer', 'engineer', 'debug', 'code', 'git',
    'repository', 'commit', 'pull request', 'api',
    'database', 'frontend', 'backend', 'fullstack',
    'javascript', 'python', 'react', 'node', 'algorithm',
    'data structure', 'testing', 'deployment'
  ],
  networking: [
    'networking', 'network', 'connection', 'connect',
    'linkedin', 'professional network', 'meetup',
    'conference', 'event', 'industry professional',
    'mentor meeting', 'informational interview',
    'coffee chat', 'industry event', 'career fair'
  ],
  mentorship: [
    'mentor', 'mentorship', 'mentoring', 'buddy',
    'guidance', 'advice', 'coaching', 'support',
    'learning', 'feedback', 'one-on-one', '1:1',
    'peer support', 'help', 'guidance session'
  ]
};

/**
 * Extract topics from text using keyword matching
 *
 * @param text - Input text to analyze
 * @returns Array of detected topics
 */
export function extractTopics(text: string): Topic[] {
  const lowerText = text.toLowerCase();
  const detectedTopics = new Set<Topic>();

  // Check each topic's keywords
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    for (const keyword of keywords) {
      // Use word boundary regex to avoid partial matches
      const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'i');
      if (regex.test(lowerText)) {
        detectedTopics.add(topic as Topic);
        break; // Found a match for this topic, move to next topic
      }
    }
  }

  return Array.from(detectedTopics);
}

/**
 * Extract topics with confidence scores
 *
 * @param text - Input text to analyze
 * @returns Array of topics with confidence scores
 */
export function extractTopicsWithConfidence(text: string): Array<{ topic: Topic; confidence: number; matchedKeywords: string[] }> {
  const lowerText = text.toLowerCase();
  const topicResults: Array<{ topic: Topic; confidence: number; matchedKeywords: string[] }> = [];

  // Check each topic's keywords
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    const matchedKeywords: string[] = [];
    let matchCount = 0;

    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) {
        matchCount += matches.length;
        if (!matchedKeywords.includes(keyword)) {
          matchedKeywords.push(keyword);
        }
      }
    }

    if (matchCount > 0) {
      // Confidence based on number of keyword matches
      // More matches = higher confidence
      const confidence = Math.min(0.5 + (matchCount * 0.1), 1.0);
      topicResults.push({
        topic: topic as Topic,
        confidence,
        matchedKeywords
      });
    }
  }

  // Sort by confidence (descending)
  return topicResults.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Get all available topics
 */
export function getAllTopics(): Topic[] {
  return ['CV', 'interview', 'PM', 'dev', 'networking', 'mentorship'];
}

/**
 * Check if a topic is valid
 */
export function isValidTopic(topic: string): topic is Topic {
  return getAllTopics().includes(topic as Topic);
}
