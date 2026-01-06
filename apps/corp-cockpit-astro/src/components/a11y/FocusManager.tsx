/**
 * FocusManager Component
 * Manages focus traps, skip links, and focus restoration for WCAG 2.2 compliance
 * Ensures keyboard navigation is smooth and intuitive
 */

import { useEffect, useRef, type ReactNode } from 'react';
import {
  saveFocus,
  restoreFocus,
  getFocusableElements,
  trapFocus,
} from '../../utils/a11y';

/**
 * FocusTrap Component
 * Traps focus within a container for modals and dialogs
 *
 * Usage:
 * ```tsx
 * <FocusTrap active={isModalOpen}>
 *   <div role="dialog" aria-modal="true">
 *     <h2>Modal Title</h2>
 *     <button>Close</button>
 *   </div>
 * </FocusTrap>
 * ```
 */
interface FocusTrapProps {
  /**
   * Whether the focus trap is active
   */
  active: boolean;

  /**
   * Children to render inside the trap
   */
  children: ReactNode;

  /**
   * Whether to restore focus when trap is deactivated
   */
  restoreFocusOnDeactivate?: boolean;

  /**
   * Whether to focus first element when trap is activated
   */
  focusFirstOnActivate?: boolean;

  /**
   * CSS class name
   */
  className?: string;
}

export function FocusTrap({
  active,
  children,
  restoreFocusOnDeactivate = true,
  focusFirstOnActivate = true,
  className = '',
}: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (active) {
      // Save current focus
      if (restoreFocusOnDeactivate) {
        saveFocus();
      }

      // Focus first element if requested
      if (focusFirstOnActivate) {
        const focusableElements = getFocusableElements(containerRef.current);
        if (focusableElements.length > 0) {
          requestAnimationFrame(() => {
            focusableElements[0]?.focus();
          });
        }
      }

      // Set up focus trap
      const handleKeyDown = (event: KeyboardEvent) => {
        if (containerRef.current) {
          trapFocus(containerRef.current, event);
        }
      };

      containerRef.current.addEventListener('keydown', handleKeyDown);
      cleanupRef.current = () => {
        containerRef.current?.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      // Clean up trap
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }

      // Restore focus
      if (restoreFocusOnDeactivate) {
        restoreFocus();
      }
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [active, restoreFocusOnDeactivate, focusFirstOnActivate]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}

/**
 * SkipLinks Component
 * Provides keyboard navigation skip links for WCAG 2.2 compliance
 *
 * Usage:
 * ```tsx
 * <SkipLinks
 *   links={[
 *     { text: 'Skip to main content', targetId: 'main-content' },
 *     { text: 'Skip to navigation', targetId: 'navigation' },
 *   ]}
 * />
 * ```
 */
interface SkipLink {
  text: string;
  targetId: string;
}

interface SkipLinksProps {
  links: SkipLink[];
  className?: string;
}

export function SkipLinks({ links, className = '' }: SkipLinksProps) {
  const handleSkipClick = (event: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    event.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.setAttribute('tabindex', '-1');
      target.focus();
      // Remove tabindex after blur to restore natural tab order
      target.addEventListener(
        'blur',
        () => {
          target.removeAttribute('tabindex');
        },
        { once: true }
      );
    }
  };

  return (
    <nav
      aria-label="Skip links"
      className={`skip-links ${className}`.trim()}
      style={{
        position: 'absolute',
        top: '-9999px',
        left: '-9999px',
        zIndex: 9999,
      }}
    >
      {links.map((link) => (
        <a
          key={link.targetId}
          href={`#${link.targetId}`}
          onClick={(e) => handleSkipClick(e, link.targetId)}
          style={{
            position: 'absolute',
            left: '-9999px',
            top: 'auto',
            width: '1px',
            height: '1px',
            overflow: 'hidden',
          }}
          onFocus={(e) => {
            e.currentTarget.style.position = 'fixed';
            e.currentTarget.style.top = '0';
            e.currentTarget.style.left = '0';
            e.currentTarget.style.width = 'auto';
            e.currentTarget.style.height = 'auto';
            e.currentTarget.style.overflow = 'visible';
            e.currentTarget.style.padding = '0.5rem 1rem';
            e.currentTarget.style.background = '#000';
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.textDecoration = 'none';
            e.currentTarget.style.borderRadius = '0 0 0.25rem 0';
            e.currentTarget.style.zIndex = '9999';
          }}
          onBlur={(e) => {
            e.currentTarget.style.position = 'absolute';
            e.currentTarget.style.left = '-9999px';
            e.currentTarget.style.top = 'auto';
            e.currentTarget.style.width = '1px';
            e.currentTarget.style.height = '1px';
            e.currentTarget.style.overflow = 'hidden';
          }}
        >
          {link.text}
        </a>
      ))}
    </nav>
  );
}

/**
 * FocusRestorer Component
 * Automatically saves and restores focus when mounting/unmounting
 *
 * Usage:
 * ```tsx
 * {showModal && (
 *   <FocusRestorer>
 *     <Modal />
 *   </FocusRestorer>
 * )}
 * ```
 */
interface FocusRestorerProps {
  children: ReactNode;
}

export function FocusRestorer({ children }: FocusRestorerProps) {
  useEffect(() => {
    saveFocus();
    return () => {
      restoreFocus();
    };
  }, []);

  return <>{children}</>;
}

/**
 * ModalFocusManager Component
 * Complete focus management for modal dialogs
 * Combines focus trap and restoration
 *
 * Usage:
 * ```tsx
 * <ModalFocusManager
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   titleId="modal-title"
 * >
 *   <div role="dialog" aria-labelledby="modal-title" aria-modal="true">
 *     <h2 id="modal-title">Modal Title</h2>
 *     <p>Modal content...</p>
 *     <button onClick={handleClose}>Close</button>
 *   </div>
 * </ModalFocusManager>
 * ```
 */
interface ModalFocusManagerProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;

  /**
   * Close handler (called on Escape key)
   */
  onClose: () => void;

  /**
   * ID of the modal title element (for aria-labelledby)
   */
  titleId?: string;

  /**
   * Children to render inside the modal
   */
  children: ReactNode;

  /**
   * CSS class name
   */
  className?: string;
}

export function ModalFocusManager({
  isOpen,
  onClose,
  titleId,
  children,
  className = '',
}: ModalFocusManagerProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);

    // Prevent body scroll when modal is open
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <FocusRestorer>
      <FocusTrap active={isOpen} className={className}>
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          style={{
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }}
          onClick={(e) => {
            // Close on backdrop click
            if (e.target === modalRef.current) {
              onClose();
            }
          }}
        >
          {children}
        </div>
      </FocusTrap>
    </FocusRestorer>
  );
}

/**
 * KeyboardShortcutHelper Component
 * Displays keyboard shortcuts in a help dialog
 *
 * Usage:
 * ```tsx
 * <KeyboardShortcutHelper
 *   isOpen={showHelp}
 *   onClose={() => setShowHelp(false)}
 *   shortcuts={[
 *     { keys: ['Ctrl', 'S'], description: 'Save document' },
 *     { keys: ['Ctrl', 'P'], description: 'Print document' },
 *   ]}
 * />
 * ```
 */
interface KeyboardShortcut {
  keys: string[];
  description: string;
}

interface KeyboardShortcutHelperProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
}

export function KeyboardShortcutHelper({
  isOpen,
  onClose,
  shortcuts,
}: KeyboardShortcutHelperProps) {
  if (!isOpen) return null;

  return (
    <ModalFocusManager
      isOpen={isOpen}
      onClose={onClose}
      titleId="keyboard-shortcuts-title"
    >
      <div
        style={{
          backgroundColor: '#fff',
          padding: '2rem',
          borderRadius: '0.5rem',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 id="keyboard-shortcuts-title" style={{ margin: 0, fontSize: '1.5rem' }}>
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            aria-label="Close shortcuts dialog"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0.25rem',
            }}
          >
            ×
          </button>
        </div>
        <dl style={{ margin: 0 }}>
          {shortcuts.map((shortcut, index) => (
            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #e5e7eb' }}>
              <dt style={{ fontWeight: 600 }}>
                {shortcut.keys.map((key, i) => (
                  <span key={i}>
                    {i > 0 && <span style={{ margin: '0 0.25rem' }}>+</span>}
                    <kbd
                      style={{
                        padding: '0.125rem 0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.25rem',
                        backgroundColor: '#f3f4f6',
                        fontFamily: 'monospace',
                      }}
                    >
                      {key}
                    </kbd>
                  </span>
                ))}
              </dt>
              <dd style={{ margin: 0, color: '#6b7280' }}>{shortcut.description}</dd>
            </div>
          ))}
        </dl>
        <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </ModalFocusManager>
  );
}

export default FocusTrap;
