/**
 * Toast — Premium notification system
 *
 * Toast notifications with auto-dismiss, stacking, and smooth animations.
 * Position: top-right (default)
 * Types: success, error, warning, info
 */

import React, {
  useState,
  useEffect,
  useRef,
  createContext,
  useContext,
  useCallback,
} from 'react';
import { createPortal } from 'react-dom';

// =============================================================================
// TYPES
// =============================================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // Auto-dismiss after ms (0 = no auto-dismiss)
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastContextValue {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
  dismissToast: (id: string) => void;
}

// =============================================================================
// CONTEXT
// =============================================================================

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

// =============================================================================
// TOAST PROVIDER
// =============================================================================

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = {
      id,
      duration: 5000,
      ...toast,
    };

    setToasts((prev) => [...prev, newToast]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showSuccess = useCallback((title: string, message?: string) => {
    showToast({ type: 'success', title, message });
  }, [showToast]);

  const showError = useCallback((title: string, message?: string) => {
    showToast({ type: 'error', title, message });
  }, [showToast]);

  const showWarning = useCallback((title: string, message?: string) => {
    showToast({ type: 'warning', title, message });
  }, [showToast]);

  const showInfo = useCallback((title: string, message?: string) => {
    showToast({ type: 'info', title, message });
  }, [showToast]);

  return (
    <ToastContext.Provider
      value={{
        showToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        dismissToast,
      }}
    >
      {children}
      {mounted && <ToastContainer toasts={toasts} onDismiss={dismissToast} />}
    </ToastContext.Provider>
  );
}

// =============================================================================
// TOAST CONTAINER
// =============================================================================

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return createPortal(
    <div className="toast-container" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
      <style>{`
        .toast-container {
          position: fixed;
          top: 24px;
          right: 24px;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-width: 420px;
          pointer-events: none;
        }

        @media (max-width: 768px) {
          .toast-container {
            top: 16px;
            right: 16px;
            left: 16px;
            max-width: none;
          }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .toast-container * {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>,
    document.body
  );
}

// =============================================================================
// TOAST ITEM
// =============================================================================

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    // Auto-dismiss
    if (toast.duration && toast.duration > 0) {
      // Start progress bar
      if (progressRef.current) {
        progressRef.current.style.transition = `width ${toast.duration}ms linear`;
        requestAnimationFrame(() => {
          if (progressRef.current) {
            progressRef.current.style.width = '0%';
          }
        });
      }

      timeoutRef.current = setTimeout(() => {
        handleDismiss();
      }, toast.duration);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (progressTimeoutRef.current) clearTimeout(progressTimeoutRef.current);
    };
  }, [toast.duration]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 200);
  };

  const typeConfig = {
    success: {
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M16.667 5L7.5 14.167 3.333 10"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      bg: 'var(--color-success)',
      bgLight: 'var(--color-success-light)',
    },
    error: {
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M15 5L5 15M5 5l10 10"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      bg: 'var(--color-error)',
      bgLight: 'var(--color-error-light)',
    },
    warning: {
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M10 6v4M10 14h.01"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
      bg: 'var(--color-warning)',
      bgLight: 'var(--color-warning-light)',
    },
    info: {
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" />
          <path
            d="M10 6v4M10 14h.01"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      bg: 'var(--color-info)',
      bgLight: 'var(--color-info-light)',
    },
  };

  const config = typeConfig[toast.type];

  return (
    <div
      className={`toast ${isVisible ? 'toast-visible' : ''} ${isExiting ? 'toast-exiting' : ''} toast-${toast.type}`}
      role="alert"
      style={{ '--toast-bg': config.bg, '--toast-bg-light': config.bgLight } as React.CSSProperties}
    >
      <div className="toast-content">
        <div className="toast-icon">{config.icon}</div>
        <div className="toast-text">
          <div className="toast-title">{toast.title}</div>
          {toast.message && <div className="toast-message">{toast.message}</div>}
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="toast-close"
          aria-label="Dismiss notification"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M12 4L4 12M4 4l8 8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {toast.duration && toast.duration > 0 && (
        <div className="toast-progress">
          <div ref={progressRef} className="toast-progress-bar" />
        </div>
      )}

      {toast.action && (
        <div className="toast-action">
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick();
              handleDismiss();
            }}
            className="toast-action-btn"
          >
            {toast.action.label}
          </button>
        </div>
      )}

      <style>{`
        .toast {
          position: relative;
          width: 100%;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          pointer-events: auto;
          overflow: hidden;
          opacity: 0;
          transform: translateX(100%);
          transition: opacity 200ms var(--ease-out), transform 300ms var(--ease-out);
        }

        .toast-visible {
          opacity: 1;
          transform: translateX(0);
        }

        .toast-exiting {
          opacity: 0;
          transform: translateX(100%);
        }

        .toast-content {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
        }

        .toast-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: var(--radius-md);
          flex-shrink: 0;
          color: white;
          background: var(--toast-bg);
        }

        .toast-text {
          flex: 1;
          min-width: 0;
        }

        .toast-title {
          font-size: var(--text-sm);
          font-weight: var(--font-weight-semibold);
          color: var(--color-text-primary);
          line-height: var(--leading-snug);
        }

        .toast-message {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          margin-top: 4px;
          line-height: var(--leading-relaxed);
        }

        .toast-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          padding: 0;
          border: none;
          background: transparent;
          color: var(--color-text-tertiary);
          border-radius: var(--radius-sm);
          cursor: pointer;
          flex-shrink: 0;
          transition: all var(--duration-fast) var(--ease-out);
        }

        .toast-close:hover {
          background: var(--color-muted);
          color: var(--color-text-primary);
        }

        .toast-close:focus-visible {
          outline: 2px solid var(--color-primary);
          outline-offset: 2px;
        }

        .toast-progress {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--color-border-subtle);
        }

        .toast-progress-bar {
          height: 100%;
          width: 100%;
          background: var(--toast-bg);
          transition: width linear;
        }

        .toast-action {
          padding: 0 16px 16px;
          margin-top: -8px;
        }

        .toast-action-btn {
          font-size: var(--text-sm);
          font-weight: var(--font-weight-medium);
          color: var(--toast-bg);
          background: transparent;
          border: none;
          padding: 0;
          cursor: pointer;
          transition: opacity var(--duration-fast) var(--ease-out);
        }

        .toast-action-btn:hover {
          opacity: 0.8;
        }

        /* Dark mode */
        [data-theme="dark"] .toast,
        html.dark .toast {
          background: var(--color-surface);
          border-color: var(--color-border-strong);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .toast {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}



