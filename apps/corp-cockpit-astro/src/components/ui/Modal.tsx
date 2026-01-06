/**
 * Modal — Premium Dialog Component
 * 
 * Accessible, animated modal with focus trap and backdrop.
 * Inspired by Radix UI Dialog patterns.
 */

import React, { 
  useEffect, 
  useRef, 
  useCallback, 
  useState,
  createContext,
  useContext,
} from 'react';
import { createPortal } from 'react-dom';

// =============================================================================
// TYPES
// =============================================================================

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

export interface ModalContextValue {
  onClose: () => void;
}

// =============================================================================
// CONTEXT
// =============================================================================

const ModalContext = createContext<ModalContextValue | null>(null);

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a Modal');
  }
  return context;
}

// =============================================================================
// SIZE CONFIGURATIONS
// =============================================================================

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  full: 'max-w-[90vw] max-h-[90vh]',
};

// =============================================================================
// FOCUS TRAP HOOK
// =============================================================================

function useFocusTrap(isOpen: boolean, ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!isOpen || !ref.current) return;

    const element = ref.current;
    const focusableElements = element.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    // Focus first element
    firstFocusable?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    element.addEventListener('keydown', handleKeyDown);
    return () => element.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, ref]);
}

// =============================================================================
// MODAL COMPONENT
// =============================================================================

export default function Modal({
  isOpen,
  onClose,
  children,
  title,
  description,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  className = '',
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [animating, setAnimating] = useState(false);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Handle mount for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Handle animation states
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      setAnimating(true);
      // Lock body scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Restore focus
      previousFocusRef.current?.focus();
      // Unlock body scroll
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Focus trap
  useFocusTrap(isOpen, modalRef);

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  // Handle overlay click
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  }, [closeOnOverlayClick, onClose]);

  // Don't render if not mounted or not open
  if (!mounted || !isOpen) return null;

  const modalContent = (
    <ModalContext.Provider value={{ onClose }}>
      <div 
        className="modal-overlay"
        onClick={handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-description' : undefined}
      >
        <div 
          ref={modalRef}
          className={`modal-content ${sizeClasses[size]} ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="modal-header">
              <div className="modal-header-content">
                {title && (
                  <h2 id="modal-title" className="modal-title">
                    {title}
                  </h2>
                )}
                {description && (
                  <p id="modal-description" className="modal-description">
                    {description}
                  </p>
                )}
              </div>
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className="modal-close-btn"
                  aria-label="Close modal"
                >
                  <svg 
                    width="20" 
                    height="20" 
                    viewBox="0 0 20 20" 
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M5 5l10 10M15 5L5 15" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Body */}
          <div className="modal-body">
            {children}
          </div>
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: rgba(12, 36, 48, 0.6);
          backdrop-filter: blur(4px);
          animation: modalOverlayIn 200ms ease-out forwards;
        }

        @keyframes modalOverlayIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .modal-content {
          position: relative;
          width: 100%;
          max-height: calc(100vh - 48px);
          overflow: auto;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--card-radius);
          box-shadow: 
            0 0 0 1px rgba(0, 57, 63, 0.05),
            0 8px 32px rgba(0, 57, 63, 0.15),
            0 24px 64px rgba(0, 57, 63, 0.1);
          animation: modalContentIn 300ms var(--ease-out) forwards;
        }

        @keyframes modalContentIn {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding: 24px 24px 0;
        }

        .modal-header-content {
          flex: 1;
        }

        .modal-title {
          font-size: var(--text-xl);
          font-weight: var(--font-weight-semibold);
          color: var(--color-text-primary);
          margin: 0;
          line-height: var(--leading-tight);
        }

        .modal-description {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          margin: 8px 0 0;
          line-height: var(--leading-relaxed);
        }

        .modal-close-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          padding: 0;
          margin: -4px -4px 0 0;
          border: none;
          background: transparent;
          color: var(--color-text-tertiary);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--duration-fast) var(--ease-out);
        }

        .modal-close-btn:hover {
          background: var(--color-muted);
          color: var(--color-text-primary);
        }

        .modal-close-btn:focus-visible {
          outline: 2px solid var(--color-primary);
          outline-offset: 2px;
        }

        .modal-body {
          padding: 24px;
        }

        /* Size overrides */
        .max-w-sm { max-width: 384px; }
        .max-w-md { max-width: 448px; }
        .max-w-lg { max-width: 512px; }
        .max-w-2xl { max-width: 672px; }

        /* Dark mode adjustments */
        [data-theme="dark"] .modal-overlay,
        html.dark .modal-overlay {
          background: rgba(0, 0, 0, 0.7);
        }

        [data-theme="dark"] .modal-content,
        html.dark .modal-content {
          box-shadow: 
            0 0 0 1px rgba(255, 255, 255, 0.1),
            0 8px 32px rgba(0, 0, 0, 0.4),
            0 24px 64px rgba(0, 0, 0, 0.3);
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .modal-overlay,
          .modal-content {
            animation: none;
          }
        }
      `}</style>
    </ModalContext.Provider>
  );

  return createPortal(modalContent, document.body);
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

export function ModalFooter({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <div className={`modal-footer ${className}`}>
      {children}
      <style>{`
        .modal-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px 24px;
          margin-top: -8px;
        }
      `}</style>
    </div>
  );
}

export function ModalActions({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <div className={`modal-actions ${className}`}>
      {children}
      <style>{`
        .modal-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid var(--color-border-subtle);
        }
      `}</style>
    </div>
  );
}

// =============================================================================
// CONFIRM DIALOG
// =============================================================================

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
    >
      <p className="confirm-message">{message}</p>
      
      <ModalActions>
        <button
          type="button"
          onClick={onClose}
          className="btn btn-secondary"
          disabled={loading}
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`btn ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
          disabled={loading}
        >
          {loading ? (
            <span className="btn-loading">
              <svg className="btn-spinner" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {confirmText}
            </span>
          ) : (
            confirmText
          )}
        </button>
      </ModalActions>

      <style>{`
        .confirm-message {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          line-height: var(--leading-relaxed);
          margin: 0;
        }

        .btn-danger {
          background: var(--color-error);
          color: white;
        }

        .btn-danger:hover:not(:disabled) {
          background: #b91c1c;
        }

        .btn-loading {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-spinner {
          width: 16px;
          height: 16px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Modal>
  );
}



