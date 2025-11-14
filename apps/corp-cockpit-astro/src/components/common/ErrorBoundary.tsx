/**
 * Error Boundary Component
 *
 * Catches React errors and displays fallback UI to prevent entire app from crashing.
 * Logs errors to Worker 1 observability (Sentry/OTel) for monitoring.
 *
 * @module components/common/ErrorBoundary
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  widgetName?: string;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Generate unique error ID for support
    const errorId = this.generateErrorId();

    // Log error details
    console.error('ErrorBoundary caught an error:', {
      error,
      errorInfo,
      errorId,
      widgetName: this.props.widgetName,
    });

    // Update state with error details
    this.setState({
      errorInfo,
      errorId,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Send to observability service (Sentry/OTel)
    this.logToObservability(error, errorInfo, errorId);
  }

  generateErrorId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `ERR-${timestamp}-${random}`;
  }

  logToObservability(error: Error, errorInfo: ErrorInfo, errorId: string) {
    try {
      // TODO: Replace with actual Worker 1 observability endpoint
      // Send to Sentry, OpenTelemetry, or custom error tracking service

      const errorPayload = {
        errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        widgetName: this.props.widgetName,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      // Example: Send to Worker 1 observability endpoint
      // fetch('/api/observability/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorPayload),
      // });

      console.log('Error logged to observability:', errorPayload);
    } catch (loggingError) {
      console.error('Failed to log error to observability:', loggingError);
    }
  }

  handleRetry = () => {
    // Reset error state to retry rendering
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  handleReportIssue = () => {
    const { errorId, error } = this.state;
    const subject = `Error Report: ${errorId}`;
    const body = `Error ID: ${errorId}\nWidget: ${this.props.widgetName || 'Unknown'}\nError: ${error?.message}\n\nPlease describe what you were doing when this error occurred:`;

    // Open email client or support form
    const mailtoLink = `mailto:support@example.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="error-boundary-fallback">
          <div className="error-content">
            <div className="error-icon" aria-hidden="true">
              ⚠
            </div>

            <div className="error-message">
              <h3 className="error-title">
                {this.props.widgetName || 'Component'} Error
              </h3>
              <p className="error-description">
                Something went wrong while rendering this {this.props.widgetName ? 'widget' : 'component'}.
              </p>
            </div>

            <div className="error-actions">
              <button onClick={this.handleRetry} className="retry-btn">
                Retry
              </button>
              <button onClick={this.handleReportIssue} className="report-btn">
                Report Issue
              </button>
            </div>

            {this.state.errorId && (
              <div className="error-id">
                <span className="error-id-label">Error ID:</span>
                <code className="error-id-value">{this.state.errorId}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(this.state.errorId || '')}
                  className="copy-btn"
                  title="Copy Error ID"
                >
                  Copy
                </button>
              </div>
            )}

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>Error Details (Development Only)</summary>
                <pre className="error-stack">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                  {this.state.errorInfo?.componentStack && (
                    <>
                      {'\n\nComponent Stack:'}
                      {this.state.errorInfo.componentStack}
                    </>
                  )}
                </pre>
              </details>
            )}
          </div>

          <style jsx>{`
            .error-boundary-fallback {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 200px;
              padding: 24px;
              background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
              border: 2px solid #ef4444;
              border-radius: 8px;
            }

            .error-content {
              max-width: 500px;
              width: 100%;
              text-align: center;
            }

            .error-icon {
              font-size: 3rem;
              line-height: 1;
              margin-bottom: 16px;
              color: #dc2626;
            }

            .error-message {
              margin-bottom: 24px;
            }

            .error-title {
              margin: 0 0 8px 0;
              font-size: 1.25rem;
              font-weight: 700;
              color: #991b1b;
            }

            .error-description {
              margin: 0;
              font-size: 0.9375rem;
              color: #7f1d1d;
              line-height: 1.5;
            }

            .error-actions {
              display: flex;
              gap: 12px;
              justify-content: center;
              margin-bottom: 16px;
            }

            .retry-btn,
            .report-btn {
              padding: 10px 20px;
              border: 2px solid;
              border-radius: 6px;
              font-size: 0.9375rem;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
            }

            .retry-btn {
              background: #dc2626;
              border-color: #dc2626;
              color: white;
            }

            .retry-btn:hover {
              background: #b91c1c;
              border-color: #b91c1c;
            }

            .report-btn {
              background: white;
              border-color: #dc2626;
              color: #dc2626;
            }

            .report-btn:hover {
              background: #fef2f2;
            }

            .retry-btn:active,
            .report-btn:active {
              transform: scale(0.95);
            }

            .error-id {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              padding: 12px;
              background: rgba(255, 255, 255, 0.7);
              border-radius: 6px;
              font-size: 0.8125rem;
              margin-bottom: 16px;
            }

            .error-id-label {
              font-weight: 600;
              color: #7f1d1d;
            }

            .error-id-value {
              font-family: 'Courier New', monospace;
              background: #fee2e2;
              padding: 4px 8px;
              border-radius: 4px;
              color: #991b1b;
            }

            .copy-btn {
              padding: 4px 8px;
              background: white;
              border: 1px solid #dc2626;
              border-radius: 4px;
              font-size: 0.75rem;
              font-weight: 600;
              color: #dc2626;
              cursor: pointer;
              transition: all 0.2s;
            }

            .copy-btn:hover {
              background: #fef2f2;
            }

            .error-details {
              margin-top: 16px;
              text-align: left;
              background: rgba(0, 0, 0, 0.05);
              border-radius: 6px;
              padding: 12px;
            }

            summary {
              cursor: pointer;
              font-weight: 600;
              color: #7f1d1d;
              padding: 4px 0;
            }

            summary:hover {
              color: #991b1b;
            }

            .error-stack {
              margin: 12px 0 0 0;
              padding: 12px;
              background: white;
              border: 1px solid #fecaca;
              border-radius: 4px;
              font-size: 0.75rem;
              color: #374151;
              overflow-x: auto;
              white-space: pre-wrap;
              word-break: break-word;
            }

            @media (max-width: 768px) {
              .error-boundary-fallback {
                min-height: 150px;
                padding: 16px;
              }

              .error-icon {
                font-size: 2rem;
              }

              .error-title {
                font-size: 1.125rem;
              }

              .error-actions {
                flex-direction: column;
                width: 100%;
              }

              .retry-btn,
              .report-btn {
                width: 100%;
              }

              .error-id {
                flex-direction: column;
              }
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Functional wrapper for hooks-based usage
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  widgetName?: string
) {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <ErrorBoundary widgetName={widgetName}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}
