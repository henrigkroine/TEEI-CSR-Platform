/**
 * NLQ Keyboard Navigation Hook
 * Provides comprehensive keyboard navigation support for NLQ interface
 * WCAG 2.2 AA Compliance - Keyboard Accessible
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { registerKeyboardShortcut, announce } from '../utils/a11y';

/**
 * Keyboard shortcut configuration
 */
export interface KeyboardShortcut {
  /**
   * Key to trigger (e.g., '/', 'r', 'Enter')
   */
  key: string;

  /**
   * Modifier keys
   */
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;

  /**
   * Description for help menu
   */
  description: string;

  /**
   * Handler function
   */
  handler: (event: KeyboardEvent) => void;

  /**
   * Whether the shortcut is enabled
   */
  enabled?: boolean;
}

/**
 * Hook for managing keyboard navigation in NLQ interface
 */
export function useKeyboardNavigation(shortcuts: KeyboardShortcut[]) {
  const cleanupFnsRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    // Register all shortcuts
    cleanupFnsRef.current = shortcuts
      .filter((shortcut) => shortcut.enabled !== false)
      .map((shortcut) => {
        return registerKeyboardShortcut({
          key: shortcut.key,
          ctrl: shortcut.ctrl,
          alt: shortcut.alt,
          shift: shortcut.shift,
          meta: shortcut.meta,
          description: shortcut.description,
          handler: shortcut.handler,
        });
      });

    return () => {
      // Clean up all registered shortcuts
      cleanupFnsRef.current.forEach((cleanup) => cleanup());
      cleanupFnsRef.current = [];
    };
  }, [shortcuts]);

  return {
    shortcuts: shortcuts.filter((s) => s.enabled !== false),
  };
}

/**
 * Hook for managing arrow key navigation in lists
 */
export interface UseArrowNavigationOptions {
  /**
   * Number of items in the list
   */
  itemCount: number;

  /**
   * Initial selected index
   */
  initialIndex?: number;

  /**
   * Whether to loop from last to first
   */
  loop?: boolean;

  /**
   * Orientation of navigation
   */
  orientation?: 'horizontal' | 'vertical' | 'both';

  /**
   * Callback when selection changes
   */
  onSelectionChange?: (index: number) => void;

  /**
   * Callback when Enter is pressed
   */
  onEnter?: (index: number) => void;

  /**
   * Callback when Escape is pressed
   */
  onEscape?: () => void;

  /**
   * Whether navigation is enabled
   */
  enabled?: boolean;
}

export function useArrowNavigation({
  itemCount,
  initialIndex = 0,
  loop = true,
  orientation = 'vertical',
  onSelectionChange,
  onEnter,
  onEscape,
  enabled = true,
}: UseArrowNavigationOptions) {
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);

  const moveSelection = useCallback(
    (direction: 'next' | 'prev' | 'first' | 'last') => {
      let newIndex = selectedIndex;

      switch (direction) {
        case 'next':
          newIndex = selectedIndex + 1;
          if (newIndex >= itemCount) {
            newIndex = loop ? 0 : itemCount - 1;
          }
          break;

        case 'prev':
          newIndex = selectedIndex - 1;
          if (newIndex < 0) {
            newIndex = loop ? itemCount - 1 : 0;
          }
          break;

        case 'first':
          newIndex = 0;
          break;

        case 'last':
          newIndex = itemCount - 1;
          break;
      }

      setSelectedIndex(newIndex);
      onSelectionChange?.(newIndex);
    },
    [selectedIndex, itemCount, loop, onSelectionChange]
  );

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      let handled = false;

      if (orientation === 'vertical' || orientation === 'both') {
        if (event.key === 'ArrowDown') {
          moveSelection('next');
          handled = true;
        } else if (event.key === 'ArrowUp') {
          moveSelection('prev');
          handled = true;
        }
      }

      if (orientation === 'horizontal' || orientation === 'both') {
        if (event.key === 'ArrowRight') {
          moveSelection('next');
          handled = true;
        } else if (event.key === 'ArrowLeft') {
          moveSelection('prev');
          handled = true;
        }
      }

      if (event.key === 'Home') {
        moveSelection('first');
        handled = true;
      } else if (event.key === 'End') {
        moveSelection('last');
        handled = true;
      } else if (event.key === 'Enter' && onEnter) {
        onEnter(selectedIndex);
        handled = true;
      } else if (event.key === 'Escape' && onEscape) {
        onEscape();
        handled = true;
      }

      if (handled) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, orientation, moveSelection, selectedIndex, onEnter, onEscape]);

  return {
    selectedIndex,
    setSelectedIndex,
    moveSelection,
  };
}

/**
 * Hook for managing typeahead search in lists
 */
export interface UseTypeaheadOptions {
  /**
   * List of searchable items
   */
  items: string[];

  /**
   * Callback when item is matched
   */
  onMatch?: (index: number) => void;

  /**
   * Timeout for typeahead buffer (ms)
   */
  timeout?: number;

  /**
   * Whether typeahead is enabled
   */
  enabled?: boolean;
}

export function useTypeahead({
  items,
  onMatch,
  timeout = 1000,
  enabled = true,
}: UseTypeaheadOptions) {
  const bufferRef = useRef('');
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle single character keys
      if (event.key.length !== 1 || event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      // Clear previous timeout
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }

      // Add to buffer
      bufferRef.current += event.key.toLowerCase();

      // Find matching item
      const matchIndex = items.findIndex((item) =>
        item.toLowerCase().startsWith(bufferRef.current)
      );

      if (matchIndex !== -1) {
        onMatch?.(matchIndex);
        announce(`Jumped to ${items[matchIndex]}`, 'polite');
      }

      // Clear buffer after timeout
      timeoutRef.current = window.setTimeout(() => {
        bufferRef.current = '';
      }, timeout);
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, items, onMatch, timeout]);

  return {
    clearBuffer: () => {
      bufferRef.current = '';
    },
  };
}

/**
 * Hook for managing NLQ-specific keyboard shortcuts
 */
export interface UseNLQShortcutsOptions {
  /**
   * Callback to focus search input
   */
  onFocusSearch?: () => void;

  /**
   * Callback to jump to results
   */
  onJumpToResults?: () => void;

  /**
   * Callback to show history
   */
  onShowHistory?: () => void;

  /**
   * Callback to toggle filters
   */
  onToggleFilters?: () => void;

  /**
   * Callback to show keyboard shortcuts help
   */
  onShowHelp?: () => void;

  /**
   * Callback to execute query
   */
  onExecuteQuery?: () => void;

  /**
   * Callback to clear query
   */
  onClearQuery?: () => void;

  /**
   * Whether shortcuts are enabled
   */
  enabled?: boolean;
}

export function useNLQShortcuts({
  onFocusSearch,
  onJumpToResults,
  onShowHistory,
  onToggleFilters,
  onShowHelp,
  onExecuteQuery,
  onClearQuery,
  enabled = true,
}: UseNLQShortcutsOptions) {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: '/',
      description: 'Focus search input',
      handler: (event) => {
        event.preventDefault();
        onFocusSearch?.();
        announce('Search input focused', 'polite');
      },
      enabled: enabled && !!onFocusSearch,
    },
    {
      key: 'r',
      description: 'Jump to results',
      handler: (event) => {
        event.preventDefault();
        onJumpToResults?.();
        announce('Jumped to results', 'polite');
      },
      enabled: enabled && !!onJumpToResults,
    },
    {
      key: 'h',
      description: 'Show query history',
      handler: (event) => {
        event.preventDefault();
        onShowHistory?.();
        announce('Query history shown', 'polite');
      },
      enabled: enabled && !!onShowHistory,
    },
    {
      key: 'f',
      ctrl: true,
      description: 'Toggle filters',
      handler: (event) => {
        event.preventDefault();
        onToggleFilters?.();
      },
      enabled: enabled && !!onToggleFilters,
    },
    {
      key: '?',
      shift: true,
      description: 'Show keyboard shortcuts',
      handler: (event) => {
        event.preventDefault();
        onShowHelp?.();
      },
      enabled: enabled && !!onShowHelp,
    },
    {
      key: 'Enter',
      ctrl: true,
      description: 'Execute query',
      handler: (event) => {
        event.preventDefault();
        onExecuteQuery?.();
      },
      enabled: enabled && !!onExecuteQuery,
    },
    {
      key: 'Escape',
      description: 'Clear query',
      handler: (event) => {
        event.preventDefault();
        onClearQuery?.();
        announce('Query cleared', 'polite');
      },
      enabled: enabled && !!onClearQuery,
    },
  ];

  useKeyboardNavigation(shortcuts);

  return {
    shortcuts: shortcuts.filter((s) => s.enabled !== false),
  };
}

/**
 * Hook for managing focus within a modal/dialog
 */
export interface UseModalFocusOptions {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;

  /**
   * Callback to close modal
   */
  onClose: () => void;

  /**
   * Initial element to focus (selector)
   */
  initialFocus?: string;

  /**
   * Whether to trap focus within modal
   */
  trapFocus?: boolean;
}

export function useModalFocus({
  isOpen,
  onClose,
  initialFocus,
  trapFocus = true,
}: UseModalFocusOptions) {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Save current focus
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus initial element
    if (initialFocus) {
      const element = document.querySelector(initialFocus) as HTMLElement;
      if (element) {
        requestAnimationFrame(() => {
          element.focus();
        });
      }
    }

    // Handle Escape key
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);

    // Restore focus on close
    return () => {
      document.removeEventListener('keydown', handleEscape);

      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        requestAnimationFrame(() => {
          previousFocusRef.current?.focus();
        });
      }
    };
  }, [isOpen, onClose, initialFocus]);

  return {
    restoreFocus: () => {
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    },
  };
}

/**
 * Hook for managing grid navigation (2D navigation)
 */
export interface UseGridNavigationOptions {
  /**
   * Number of columns
   */
  columns: number;

  /**
   * Total number of items
   */
  itemCount: number;

  /**
   * Initial selected index
   */
  initialIndex?: number;

  /**
   * Callback when selection changes
   */
  onSelectionChange?: (index: number) => void;

  /**
   * Callback when Enter is pressed
   */
  onActivate?: (index: number) => void;

  /**
   * Whether navigation is enabled
   */
  enabled?: boolean;
}

export function useGridNavigation({
  columns,
  itemCount,
  initialIndex = 0,
  onSelectionChange,
  onActivate,
  enabled = true,
}: UseGridNavigationOptions) {
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);

  const rows = Math.ceil(itemCount / columns);

  const moveSelection = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      let newIndex = selectedIndex;

      switch (direction) {
        case 'up':
          newIndex = selectedIndex - columns;
          if (newIndex < 0) {
            // Stay on current item
            newIndex = selectedIndex;
          }
          break;

        case 'down':
          newIndex = selectedIndex + columns;
          if (newIndex >= itemCount) {
            // Stay on current item
            newIndex = selectedIndex;
          }
          break;

        case 'left':
          if (selectedIndex % columns !== 0) {
            newIndex = selectedIndex - 1;
          }
          break;

        case 'right':
          if ((selectedIndex + 1) % columns !== 0 && selectedIndex + 1 < itemCount) {
            newIndex = selectedIndex + 1;
          }
          break;
      }

      setSelectedIndex(newIndex);
      onSelectionChange?.(newIndex);
    },
    [selectedIndex, columns, itemCount, onSelectionChange]
  );

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      let handled = false;

      if (event.key === 'ArrowUp') {
        moveSelection('up');
        handled = true;
      } else if (event.key === 'ArrowDown') {
        moveSelection('down');
        handled = true;
      } else if (event.key === 'ArrowLeft') {
        moveSelection('left');
        handled = true;
      } else if (event.key === 'ArrowRight') {
        moveSelection('right');
        handled = true;
      } else if (event.key === 'Enter' && onActivate) {
        onActivate(selectedIndex);
        handled = true;
      }

      if (handled) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, moveSelection, selectedIndex, onActivate]);

  return {
    selectedIndex,
    setSelectedIndex,
    selectedRow: Math.floor(selectedIndex / columns),
    selectedColumn: selectedIndex % columns,
  };
}

export default useKeyboardNavigation;
