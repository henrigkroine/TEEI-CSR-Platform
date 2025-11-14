/**
 * Accessibility Utilities
 * WCAG 2.2 AA/AAA compliance helpers for focus management, ARIA live regions, and keyboard navigation
 */

/**
 * Focus Management Utilities
 */

// Store for focus restoration
let previousFocusElement: HTMLElement | null = null;

/**
 * Saves the currently focused element for later restoration
 */
export function saveFocus(): void {
  previousFocusElement = document.activeElement as HTMLElement;
}

/**
 * Restores focus to the previously saved element
 */
export function restoreFocus(): void {
  if (previousFocusElement && typeof previousFocusElement.focus === 'function') {
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      previousFocusElement?.focus();
      previousFocusElement = null;
    });
  }
}

/**
 * Gets all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    'audio[controls]',
    'video[controls]',
    '[contenteditable]:not([contenteditable="false"])',
  ];

  const elements = container.querySelectorAll<HTMLElement>(
    focusableSelectors.join(', ')
  );

  return Array.from(elements).filter(
    (el) => !el.hasAttribute('disabled') && el.offsetParent !== null
  );
}

/**
 * Traps focus within a container (for modals, dialogs)
 */
export function trapFocus(container: HTMLElement, event: KeyboardEvent): void {
  if (event.key !== 'Tab') return;

  const focusableElements = getFocusableElements(container);
  if (focusableElements.length === 0) return;

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (event.shiftKey) {
    // Shift + Tab: moving backwards
    if (document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    }
  } else {
    // Tab: moving forwards
    if (document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }
}

/**
 * Prevents focus from leaving a container
 */
export function createFocusTrap(container: HTMLElement): () => void {
  const handleKeyDown = (event: KeyboardEvent) => {
    trapFocus(container, event);
  };

  container.addEventListener('keydown', handleKeyDown);

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * ARIA Live Region Utilities
 */

export type AnnouncementPoliteness = 'polite' | 'assertive';

interface LiveRegion {
  polite: HTMLElement;
  assertive: HTMLElement;
}

let liveRegions: LiveRegion | null = null;

/**
 * Initializes ARIA live regions for screen reader announcements
 */
export function initializeLiveRegions(): LiveRegion {
  if (liveRegions) {
    return liveRegions;
  }

  // Create polite live region
  const polite = document.createElement('div');
  polite.setAttribute('role', 'status');
  polite.setAttribute('aria-live', 'polite');
  polite.setAttribute('aria-atomic', 'true');
  polite.className = 'sr-only';
  polite.id = 'polite-announcer';

  // Create assertive live region
  const assertive = document.createElement('div');
  assertive.setAttribute('role', 'alert');
  assertive.setAttribute('aria-live', 'assertive');
  assertive.setAttribute('aria-atomic', 'true');
  assertive.className = 'sr-only';
  assertive.id = 'assertive-announcer';

  document.body.appendChild(polite);
  document.body.appendChild(assertive);

  liveRegions = { polite, assertive };
  return liveRegions;
}

/**
 * Announces a message to screen readers
 */
export function announce(
  message: string,
  politeness: AnnouncementPoliteness = 'polite',
  timeout: number = 5000
): void {
  const regions = initializeLiveRegions();
  const region = politeness === 'assertive' ? regions.assertive : regions.polite;

  // Clear previous content
  region.textContent = '';

  // Trigger reflow to ensure screen readers pick up the change
  void region.offsetHeight;

  // Set new message
  region.textContent = message;

  // Clear after timeout to avoid clutter
  if (timeout > 0) {
    setTimeout(() => {
      if (region.textContent === message) {
        region.textContent = '';
      }
    }, timeout);
  }
}

/**
 * Keyboard Navigation Utilities
 */

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  handler: (event: KeyboardEvent) => void;
  description: string;
}

const registeredShortcuts = new Map<string, KeyboardShortcut>();

/**
 * Creates a unique key for a keyboard shortcut
 */
function getShortcutKey(shortcut: Omit<KeyboardShortcut, 'handler' | 'description'>): string {
  const modifiers = [
    shortcut.ctrl ? 'ctrl' : '',
    shortcut.alt ? 'alt' : '',
    shortcut.shift ? 'shift' : '',
    shortcut.meta ? 'meta' : '',
  ].filter(Boolean);

  return [...modifiers, shortcut.key.toLowerCase()].join('+');
}

/**
 * Registers a keyboard shortcut
 */
export function registerKeyboardShortcut(shortcut: KeyboardShortcut): () => void {
  const key = getShortcutKey(shortcut);
  registeredShortcuts.set(key, shortcut);

  const handler = (event: KeyboardEvent) => {
    const eventKey = getShortcutKey({
      key: event.key,
      ctrl: event.ctrlKey,
      alt: event.altKey,
      shift: event.shiftKey,
      meta: event.metaKey,
    });

    const shortcut = registeredShortcuts.get(eventKey);
    if (shortcut) {
      event.preventDefault();
      shortcut.handler(event);
    }
  };

  document.addEventListener('keydown', handler);

  // Return cleanup function
  return () => {
    registeredShortcuts.delete(key);
    document.removeEventListener('keydown', handler);
  };
}

/**
 * Gets all registered keyboard shortcuts (for help dialog)
 */
export function getKeyboardShortcuts(): KeyboardShortcut[] {
  return Array.from(registeredShortcuts.values());
}

/**
 * Skip Link Utilities
 */

/**
 * Creates a skip link for keyboard navigation
 */
export function createSkipLink(
  text: string,
  targetId: string,
  insertBefore?: HTMLElement
): HTMLAnchorElement {
  const skipLink = document.createElement('a');
  skipLink.href = `#${targetId}`;
  skipLink.textContent = text;
  skipLink.className = 'skip-link';
  skipLink.addEventListener('click', (event) => {
    event.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.setAttribute('tabindex', '-1');
      target.focus();
      // Remove tabindex after blur to restore natural tab order
      target.addEventListener('blur', () => {
        target.removeAttribute('tabindex');
      }, { once: true });
    }
  });

  if (insertBefore) {
    document.body.insertBefore(skipLink, insertBefore);
  } else {
    document.body.insertBefore(skipLink, document.body.firstChild);
  }

  return skipLink;
}

/**
 * Contrast Ratio Utilities (AAA compliance)
 */

/**
 * Calculates relative luminance of a color
 */
function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const val = c / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculates contrast ratio between two colors
 */
export function getContrastRatio(
  foreground: { r: number; g: number; b: number },
  background: { r: number; g: number; b: number }
): number {
  const l1 = getRelativeLuminance(foreground.r, foreground.g, foreground.b);
  const l2 = getRelativeLuminance(background.r, background.g, background.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Checks if contrast ratio meets WCAG standards
 */
export function meetsWCAGContrast(
  ratio: number,
  level: 'AA' | 'AAA',
  isLargeText: boolean = false
): boolean {
  if (level === 'AAA') {
    return isLargeText ? ratio >= 4.5 : ratio >= 7;
  }
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Focus Visible Utilities
 */

/**
 * Adds focus-visible polyfill behavior
 */
export function initializeFocusVisible(): void {
  let hadKeyboardEvent = false;
  let hadFocusVisibleRecently = false;
  let hadFocusVisibleRecentlyTimeout: number | null = null;

  const inputTypesAllowlist = new Set([
    'text',
    'search',
    'url',
    'tel',
    'email',
    'password',
    'number',
    'date',
    'month',
    'week',
    'time',
    'datetime',
    'datetime-local',
  ]);

  function onKeyDown(event: KeyboardEvent) {
    if (event.metaKey || event.altKey || event.ctrlKey) {
      return;
    }
    hadKeyboardEvent = true;
  }

  function onPointerDown() {
    hadKeyboardEvent = false;
  }

  function onFocus(event: FocusEvent) {
    const target = event.target as HTMLElement;

    if (
      hadKeyboardEvent ||
      target.matches('input, textarea') ||
      (target instanceof HTMLInputElement &&
        inputTypesAllowlist.has(target.type))
    ) {
      target.setAttribute('data-focus-visible-added', '');
      hadFocusVisibleRecently = true;

      if (hadFocusVisibleRecentlyTimeout !== null) {
        clearTimeout(hadFocusVisibleRecentlyTimeout);
      }

      hadFocusVisibleRecentlyTimeout = window.setTimeout(() => {
        hadFocusVisibleRecently = false;
      }, 100);
    }
  }

  function onBlur(event: FocusEvent) {
    const target = event.target as HTMLElement;
    if (target.hasAttribute('data-focus-visible-added')) {
      target.removeAttribute('data-focus-visible-added');
    }
  }

  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('mousedown', onPointerDown, true);
  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('touchstart', onPointerDown, true);
  document.addEventListener('focus', onFocus, true);
  document.addEventListener('blur', onBlur, true);
}

/**
 * Screen Reader Only Text
 */

/**
 * Creates a screen reader only element
 */
export function createSROnlyText(text: string): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = 'sr-only';
  span.textContent = text;
  return span;
}

/**
 * Cleanup function for all a11y utilities
 */
export function cleanup(): void {
  // Remove live regions
  if (liveRegions) {
    liveRegions.polite.remove();
    liveRegions.assertive.remove();
    liveRegions = null;
  }

  // Clear registered shortcuts
  registeredShortcuts.clear();

  // Clear focus restoration
  previousFocusElement = null;
}
