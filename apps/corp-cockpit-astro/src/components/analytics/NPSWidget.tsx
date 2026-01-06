import React, { useState, useEffect } from 'react';
import { getAnalytics } from '../../../packages/clients/usage-analytics/client';

/**
 * NPS Widget Component
 *
 * Displays NPS micro-survey to gather user feedback
 */
export default function NPSWidget() {
  const [isVisible, setIsVisible] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user should see NPS survey
    const shouldShow = checkShouldShowNPS();
    if (shouldShow) {
      // Show after 30 seconds on page
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 30000);

      return () => clearTimeout(timer);
    }
  }, []);

  function checkShouldShowNPS(): boolean {
    // Don't show if dismissed in last 30 days
    const lastDismissed = localStorage.getItem('nps_last_dismissed');
    if (lastDismissed) {
      const daysSinceDismissed = (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 30) {
        return false;
      }
    }

    // Don't show if submitted in last 90 days
    const lastSubmitted = localStorage.getItem('nps_last_submitted');
    if (lastSubmitted) {
      const daysSinceSubmitted = (Date.now() - parseInt(lastSubmitted)) / (1000 * 60 * 60 * 24);
      if (daysSinceSubmitted < 90) {
        return false;
      }
    }

    // Show to active users (visited at least 3 times)
    const visitCount = parseInt(localStorage.getItem('visit_count') || '0');
    return visitCount >= 3;
  }

  function handleSubmit() {
    if (score === null) {
      alert('Please select a score');
      return;
    }

    // Track NPS response
    const analytics = getAnalytics();
    if (analytics) {
      analytics.trackNPS(score, comment);
    }

    // Store submission timestamp
    localStorage.setItem('nps_last_submitted', Date.now().toString());

    setSubmitted(true);

    // Auto-hide after 3 seconds
    setTimeout(() => {
      setIsVisible(false);
    }, 3000);
  }

  function handleDismiss() {
    localStorage.setItem('nps_last_dismissed', Date.now().toString());
    setDismissed(true);
    setIsVisible(false);
  }

  if (!isVisible || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 animate-slide-up">
      {!submitted ? (
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                How likely are you to recommend Corporate Cockpit?
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Your feedback helps us improve
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 transition"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Score Selection */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-600 mb-2">
              <span>Not likely</span>
              <span>Very likely</span>
            </div>
            <div className="grid grid-cols-11 gap-1">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                <button
                  key={num}
                  onClick={() => setScore(num)}
                  className={`h-10 rounded-lg font-semibold transition ${
                    score === num
                      ? num <= 6
                        ? 'bg-red-500 text-white'
                        : num <= 8
                        ? 'bg-yellow-500 text-white'
                        : 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Comment (optional) */}
          {score !== null && (
            <div className="mb-4 animate-fade-in">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What's the main reason for your score? (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your thoughts..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                maxLength={500}
              />
              <div className="text-xs text-gray-500 mt-1">
                {comment.length} / 500 characters
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-2">
            <button
              onClick={handleDismiss}
              className="flex-1 px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              Maybe Later
            </button>
            <button
              onClick={handleSubmit}
              disabled={score === null}
              className="flex-1 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Feedback
            </button>
          </div>
        </div>
      ) : (
        <div className="p-6 text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Thank you for your feedback!
          </h3>
          <p className="text-sm text-gray-600">
            We appreciate you taking the time to help us improve.
          </p>
        </div>
      )}
    </div>
  );
}
