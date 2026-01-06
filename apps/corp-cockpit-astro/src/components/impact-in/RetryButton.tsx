/**
 * RetryButton Component
 *
 * Single delivery retry action button
 * - Validates delivery status (must be 'failed')
 * - Shows loading state during retry
 * - Displays success/error feedback
 */

import React, { useState } from 'react';
import type { Delivery, ReplayResponse } from './types';

interface RetryButtonProps {
  delivery: Delivery;
  onSuccess?: (delivery: Delivery) => void;
  onError?: (error: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function RetryButton({
  delivery,
  onSuccess,
  onError,
  className = '',
  size = 'md',
}: RetryButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'success' | 'error'>('success');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const handleRetry = async () => {
    if (delivery.status !== 'failed') {
      setFeedbackType('error');
      setFeedbackMessage('Can only retry failed deliveries');
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 3000);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/v1/impact-in/deliveries/${delivery.id}/replay`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
      });

      const data: ReplayResponse = await response.json();

      if (response.ok && data.success) {
        setFeedbackType('success');
        setFeedbackMessage(data.message || 'Delivery replayed successfully');
        setShowFeedback(true);

        if (onSuccess) {
          onSuccess({
            ...delivery,
            status: data.newStatus || 'success',
            updatedAt: new Date().toISOString(),
          });
        }
      } else {
        throw new Error(data.message || data.error || 'Replay failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to retry delivery';
      setFeedbackType('error');
      setFeedbackMessage(errorMessage);
      setShowFeedback(true);

      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
      setTimeout(() => setShowFeedback(false), 3000);
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const isDisabled = delivery.status !== 'failed' || loading;

  return (
    <div className="relative inline-block">
      <button
        onClick={handleRetry}
        disabled={isDisabled}
        className={`
          inline-flex items-center space-x-2 rounded-md font-medium
          transition-all duration-200
          ${sizeClasses[size]}
          ${
            isDisabled
              ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          }
          ${className}
        `}
        aria-label="Retry delivery"
        title={delivery.status !== 'failed' ? 'Can only retry failed deliveries' : 'Retry delivery'}
      >
        {loading ? (
          <>
            <svg
              className={`animate-spin ${iconSizes[size]}`}
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Retrying...</span>
          </>
        ) : (
          <>
            <svg
              className={iconSizes[size]}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>Retry</span>
          </>
        )}
      </button>

      {/* Feedback Toast */}
      {showFeedback && (
        <div
          className={`
            absolute top-full mt-2 left-0 right-0 px-3 py-2 rounded-md shadow-lg text-xs font-medium whitespace-nowrap z-10
            ${
              feedbackType === 'success'
                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-700'
                : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-700'
            }
          `}
          role="alert"
        >
          {feedbackMessage}
        </div>
      )}
    </div>
  );
}
