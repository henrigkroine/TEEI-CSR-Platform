/**
 * NLQ Focus Manager Component
 * Manages focus for NLQ search interface with roving tabindex support
 * WCAG 2.2 AA Compliance - Keyboard Navigation
 */

import { useEffect, useRef, useCallback, type ReactNode } from 'react';
import {
  saveFocus,
  restoreFocus,
  getFocusableElements,
} from '../../../utils/a11y';

/**
 * Roving Tabindex Manager for NLQ Results
 * Implements ARIA best practices for keyboard navigation in lists
 *
 * Usage:
 * ```tsx
 * <RovingTabindexManager>
 *   <button>Result 1</button>
 *   <button>Result 2</button>
 *   <button>Result 3</button>
 * </RovingTabindexManager>
 * ```
 */
interface RovingTabindexManagerProps {
  /**
   * Children elements (should be focusable)
   */
  children: ReactNode;

  /**
   * Initial focused index
   */
  initialFocusIndex?: number;

  /**
   * Whether to loop focus from last to first item
   */
  loop?: boolean;

  /**
   * Orientation for arrow key navigation
   */
  orientation?: 'horizontal' | 'vertical' | 'both';

  /**
   * Callback when focus changes
   */
  onFocusChange?: (index: number) => void;

  /**
   * CSS class name
   */
  className?: string;

  /**
   * ARIA role for the container
   */
  role?: string;

  /**
   * ARIA label for the container
   */
  ariaLabel?: string;
}

export function RovingTabindexManager({
  children,
  initialFocusIndex = 0,
  loop = true,
  orientation = 'vertical',
  onFocusChange,
  className = '',
  role = 'list',
  ariaLabel,
}: RovingTabindexManagerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentIndexRef = useRef(initialFocusIndex);

  const updateFocus = useCallback((newIndex: number) => {
    if (!containerRef.current) return;

    const focusableElements = getFocusableElements(containerRef.current);
    if (focusableElements.length === 0) return;

    // Remove tabindex from all items
    focusableElements.forEach((el) => {
      el.setAttribute('tabindex', '-1');
    });

    // Set tabindex on new focused item
    const targetIndex = loop
      ? (newIndex + focusableElements.length) % focusableElements.length
      : Math.max(0, Math.min(newIndex, focusableElements.length - 1));

    const targetElement = focusableElements[targetIndex];
    if (targetElement) {
      targetElement.setAttribute('tabindex', '0');
      targetElement.focus();
      currentIndexRef.current = targetIndex;
      onFocusChange?.(targetIndex);
    }
  }, [loop, onFocusChange]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const { key } = event;
    let handled = false;

    if (orientation === 'vertical' || orientation === 'both') {
      if (key === 'ArrowDown') {
        updateFocus(currentIndexRef.current + 1);
        handled = true;
      } else if (key === 'ArrowUp') {
        updateFocus(currentIndexRef.current - 1);
        handled = true;
      }
    }

    if (orientation === 'horizontal' || orientation === 'both') {
      if (key === 'ArrowRight') {
        updateFocus(currentIndexRef.current + 1);
        handled = true;
      } else if (key === 'ArrowLeft') {
        updateFocus(currentIndexRef.current - 1);
        handled = true;
      }
    }

    // Home/End keys
    if (key === 'Home') {
      updateFocus(0);
      handled = true;
    } else if (key === 'End') {
      const focusableElements = getFocusableElements(containerRef.current!);
      updateFocus(focusableElements.length - 1);
      handled = true;
    }

    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, [orientation, updateFocus]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize tabindex on mount
    const focusableElements = getFocusableElements(containerRef.current);
    focusableElements.forEach((el, index) => {
      el.setAttribute('tabindex', index === initialFocusIndex ? '0' : '-1');
    });

    // Add event listener
    containerRef.current.addEventListener('keydown', handleKeyDown);

    return () => {
      containerRef.current?.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, initialFocusIndex]);

  return (
    <div
      ref={containerRef}
      className={className}
      role={role}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}

/**
 * NLQ Query History Focus Manager
 * Manages focus within query history list
 */
interface QueryHistoryFocusProps {
  /**
   * Number of history items
   */
  itemCount: number;

  /**
   * Callback when an item is selected
   */
  onItemSelect?: (index: number) => void;

  /**
   * Children (history items)
   */
  children: ReactNode;

  /**
   * CSS class name
   */
  className?: string;
}

export function QueryHistoryFocus({
  itemCount,
  onItemSelect,
  children,
  className = '',
}: QueryHistoryFocusProps) {
  return (
    <RovingTabindexManager
      orientation="vertical"
      loop={true}
      onFocusChange={onItemSelect}
      className={className}
      role="listbox"
      ariaLabel="Query history"
    >
      {children}
    </RovingTabindexManager>
  );
}

/**
 * NLQ Suggestions Focus Manager
 * Manages focus within autocomplete suggestions
 */
interface SuggestionsFocusProps {
  /**
   * Whether suggestions are visible
   */
  isOpen: boolean;

  /**
   * Callback when a suggestion is selected (Enter key)
   */
  onSelect?: (index: number) => void;

  /**
   * Callback when suggestions should close (Escape key)
   */
  onClose?: () => void;

  /**
   * Children (suggestion items)
   */
  children: ReactNode;

  /**
   * CSS class name
   */
  className?: string;

  /**
   * ID for ARIA references
   */
  id?: string;
}

export function SuggestionsFocus({
  isOpen,
  onSelect,
  onClose,
  children,
  className = '',
  id = 'nlq-suggestions',
}: SuggestionsFocusProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        // Get current focused element index
        const focusableElements = getFocusableElements(containerRef.current!);
        const focusedIndex = focusableElements.findIndex(
          (el) => el === document.activeElement
        );

        if (focusedIndex !== -1) {
          event.preventDefault();
          onSelect?.(focusedIndex);
        }
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
      }
    };

    containerRef.current.addEventListener('keydown', handleKeyDown);

    return () => {
      containerRef.current?.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onSelect, onClose]);

  if (!isOpen) return null;

  return (
    <div ref={containerRef}>
      <RovingTabindexManager
        orientation="vertical"
        loop={true}
        className={className}
        role="listbox"
        ariaLabel="Query suggestions"
      >
        {children}
      </RovingTabindexManager>
    </div>
  );
}

/**
 * NLQ Search Input Focus Manager
 * Manages focus for the search input and related controls
 */
interface SearchInputFocusProps {
  /**
   * Whether search has focus
   */
  hasFocus: boolean;

  /**
   * Callback when focus changes
   */
  onFocusChange?: (hasFocus: boolean) => void;

  /**
   * Input element
   */
  children: ReactNode;

  /**
   * CSS class name
   */
  className?: string;
}

export function SearchInputFocus({
  hasFocus,
  onFocusChange,
  children,
  className = '',
}: SearchInputFocusProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const handleFocusIn = () => {
      onFocusChange?.(true);
    };

    const handleFocusOut = (event: FocusEvent) => {
      // Only trigger if focus is leaving the container entirely
      if (
        containerRef.current &&
        !containerRef.current.contains(event.relatedTarget as Node)
      ) {
        onFocusChange?.(false);
      }
    };

    containerRef.current.addEventListener('focusin', handleFocusIn);
    containerRef.current.addEventListener('focusout', handleFocusOut);

    return () => {
      containerRef.current?.removeEventListener('focusin', handleFocusIn);
      containerRef.current?.removeEventListener('focusout', handleFocusOut);
    };
  }, [onFocusChange]);

  return (
    <div
      ref={containerRef}
      className={className}
      role="search"
    >
      {children}
    </div>
  );
}

/**
 * Focus restoration utility for NLQ modal dialogs
 */
export function useNLQFocusRestore() {
  useEffect(() => {
    saveFocus();
    return () => {
      restoreFocus();
    };
  }, []);
}

/**
 * NLQ Answer Card Focus Manager
 * Manages focus within an answer card's interactive elements
 */
interface AnswerCardFocusProps {
  /**
   * Answer card ID
   */
  cardId: string;

  /**
   * Whether the card is expanded
   */
  isExpanded: boolean;

  /**
   * Children (card content)
   */
  children: ReactNode;

  /**
   * CSS class name
   */
  className?: string;
}

export function AnswerCardFocus({
  cardId,
  isExpanded,
  children,
  className = '',
}: AnswerCardFocusProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // When card expands, focus first interactive element
  useEffect(() => {
    if (isExpanded && containerRef.current) {
      const focusableElements = getFocusableElements(containerRef.current);
      if (focusableElements.length > 0) {
        requestAnimationFrame(() => {
          focusableElements[0]?.focus();
        });
      }
    }
  }, [isExpanded]);

  return (
    <article
      ref={containerRef}
      className={className}
      aria-labelledby={`${cardId}-title`}
      tabIndex={0}
    >
      {children}
    </article>
  );
}

export default RovingTabindexManager;
