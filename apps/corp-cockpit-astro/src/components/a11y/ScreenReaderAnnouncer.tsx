/**
 * ScreenReaderAnnouncer Component
 * Provides ARIA live regions for announcing dynamic content changes to screen readers
 * Supports both polite and assertive announcements for WCAG 2.2 compliance
 */

import { useEffect, useRef, useState } from 'react';
import type { AnnouncementPoliteness } from '../../utils/a11y';

interface ScreenReaderAnnouncerProps {
  /**
   * Message to announce to screen readers
   */
  message?: string;

  /**
   * Politeness level for the announcement
   * - 'polite': Waits for screen reader to finish current announcement
   * - 'assertive': Interrupts current announcement (use sparingly)
   */
  politeness?: AnnouncementPoliteness;

  /**
   * Time in milliseconds before clearing the announcement
   * Set to 0 to never clear
   */
  clearAfter?: number;

  /**
   * CSS class for custom styling (should maintain sr-only behavior)
   */
  className?: string;
}

/**
 * ScreenReaderAnnouncer Component
 *
 * Usage Examples:
 *
 * 1. Polite announcement (default):
 *    <ScreenReaderAnnouncer message="Data has been updated" />
 *
 * 2. Assertive announcement (for urgent messages):
 *    <ScreenReaderAnnouncer
 *      message="Error: Connection lost"
 *      politeness="assertive"
 *    />
 *
 * 3. Persistent announcement:
 *    <ScreenReaderAnnouncer
 *      message="Loading..."
 *      clearAfter={0}
 *    />
 */
export function ScreenReaderAnnouncer({
  message = '',
  politeness = 'polite',
  clearAfter = 5000,
  className = '',
}: ScreenReaderAnnouncerProps) {
  const [announcement, setAnnouncement] = useState(message);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (message) {
      // Clear previous timeout
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }

      // Set new announcement
      setAnnouncement(message);

      // Clear announcement after timeout
      if (clearAfter > 0) {
        timeoutRef.current = window.setTimeout(() => {
          setAnnouncement('');
        }, clearAfter);
      }
    }

    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [message, clearAfter]);

  const role = politeness === 'assertive' ? 'alert' : 'status';
  const ariaLive = politeness;

  return (
    <div
      role={role}
      aria-live={ariaLive}
      aria-atomic="true"
      className={`sr-only ${className}`.trim()}
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: '0',
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: '0',
      }}
    >
      {announcement}
    </div>
  );
}

/**
 * Hook for programmatic announcements
 *
 * Usage:
 * ```tsx
 * const announce = useAnnounce();
 *
 * function handleSubmit() {
 *   // ... submit logic
 *   announce('Form submitted successfully', 'polite');
 * }
 * ```
 */
export function useAnnounce() {
  const [announcements, setAnnouncements] = useState<
    Array<{ id: string; message: string; politeness: AnnouncementPoliteness }>
  >([]);

  const announce = (message: string, politeness: AnnouncementPoliteness = 'polite') => {
    const id = `announcement-${Date.now()}-${Math.random()}`;
    setAnnouncements((prev) => [...prev, { id, message, politeness }]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    }, 5000);
  };

  return {
    announce,
    announcements,
  };
}

/**
 * AnnouncementContainer Component
 * Renders all active announcements
 *
 * Usage:
 * ```tsx
 * const { announce, announcements } = useAnnounce();
 *
 * return (
 *   <>
 *     <button onClick={() => announce('Button clicked', 'polite')}>
 *       Click me
 *     </button>
 *     <AnnouncementContainer announcements={announcements} />
 *   </>
 * );
 * ```
 */
interface AnnouncementContainerProps {
  announcements: Array<{
    id: string;
    message: string;
    politeness: AnnouncementPoliteness;
  }>;
}

export function AnnouncementContainer({ announcements }: AnnouncementContainerProps) {
  return (
    <>
      {announcements.map((announcement) => (
        <ScreenReaderAnnouncer
          key={announcement.id}
          message={announcement.message}
          politeness={announcement.politeness}
        />
      ))}
    </>
  );
}

/**
 * SSE Update Announcer
 * Specialized component for announcing SSE (Server-Sent Events) updates
 * Integrates with Phase C SSE infrastructure
 */
interface SSEUpdateAnnouncerProps {
  /**
   * The type of update (e.g., 'report', 'dashboard', 'evidence')
   */
  updateType: string;

  /**
   * Description of the update
   */
  updateDescription: string;

  /**
   * Whether the update is critical (uses assertive announcement)
   */
  isCritical?: boolean;
}

export function SSEUpdateAnnouncer({
  updateType,
  updateDescription,
  isCritical = false,
}: SSEUpdateAnnouncerProps) {
  const message = `${updateType} updated: ${updateDescription}`;
  const politeness = isCritical ? 'assertive' : 'polite';

  return (
    <ScreenReaderAnnouncer
      message={message}
      politeness={politeness}
      clearAfter={3000}
    />
  );
}

/**
 * Loading State Announcer
 * Announces loading states with appropriate politeness
 */
interface LoadingStateAnnouncerProps {
  isLoading: boolean;
  loadingMessage?: string;
  completeMessage?: string;
}

export function LoadingStateAnnouncer({
  isLoading,
  loadingMessage = 'Loading...',
  completeMessage = 'Loading complete',
}: LoadingStateAnnouncerProps) {
  const message = isLoading ? loadingMessage : completeMessage;

  return (
    <ScreenReaderAnnouncer
      message={message}
      politeness="polite"
      clearAfter={isLoading ? 0 : 2000}
    />
  );
}

/**
 * Error Announcer
 * Announces errors with assertive politeness
 */
interface ErrorAnnouncerProps {
  error: string | null;
  prefix?: string;
}

export function ErrorAnnouncer({
  error,
  prefix = 'Error:',
}: ErrorAnnouncerProps) {
  if (!error) return null;

  return (
    <ScreenReaderAnnouncer
      message={`${prefix} ${error}`}
      politeness="assertive"
      clearAfter={10000}
    />
  );
}

/**
 * Form Validation Announcer
 * Announces form validation errors
 */
interface FormValidationAnnouncerProps {
  errors: Record<string, string>;
}

export function FormValidationAnnouncer({
  errors,
}: FormValidationAnnouncerProps) {
  const errorCount = Object.keys(errors).length;

  if (errorCount === 0) return null;

  const message = errorCount === 1
    ? `Form has 1 error: ${Object.values(errors)[0]}`
    : `Form has ${errorCount} errors. Please review and correct them.`;

  return (
    <ScreenReaderAnnouncer
      message={message}
      politeness="assertive"
      clearAfter={8000}
    />
  );
}

export default ScreenReaderAnnouncer;
