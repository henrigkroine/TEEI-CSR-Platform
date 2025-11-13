import fetch from 'node-fetch';
import { config } from '../config.js';

export interface FeedbackSubmission {
  userId: string;
  username: string;
  feedbackText: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
}

export async function submitFeedbackToQ2Q(feedback: FeedbackSubmission): Promise<boolean> {
  try {
    // In production, this would POST to the Q2Q processing endpoint
    // For now, we'll log it and return success
    console.log('[Q2Q] Feedback submitted:', {
      user: feedback.username,
      text: feedback.feedbackText.substring(0, 50) + '...',
      sentiment: feedback.sentiment,
    });

    // Simulate API call
    // const response = await fetch(`${config.reporting.apiUrl}/q2q/feedback`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(feedback),
    // });

    // return response.ok;
    return true;
  } catch (error) {
    console.error('[Q2Q] Failed to submit feedback:', error);
    return false;
  }
}
