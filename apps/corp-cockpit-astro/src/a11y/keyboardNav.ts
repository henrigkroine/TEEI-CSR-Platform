/**
 * Keyboard Navigation Support
 *
 * Comprehensive keyboard shortcuts, focus management, and navigation
 * for the Corporate Cockpit dashboard.
 *
 * WCAG 2.2 AAA Compliance
 */

import React from 'react';

/**
 * Keyboard shortcut configuration
 */
export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  description: string;
  action: () => void;
  scope?: 'global' | 'dashboard' | 'modal';
}

/**
 * Keyboard shortcut registry
 */
export class KeyboardShortcutRegistry {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private isEnabled = true;
  private helpModalOpen = false;
  private activeScope: 'global' | 'dashboard' | 'modal' = 'global';

  constructor() {
    this.registerDefaultShortcuts();
    this.attachEventListener();
  }

  /**
   * Generate unique key for shortcut
   */
  private getShortcutKey(shortcut: Partial<KeyboardShortcut>): string {
    const modifiers = [
      shortcut.ctrl ? 'ctrl' : '',
      shortcut.shift ? 'shift' : '',
      shortcut.alt ? 'alt' : '',
      shortcut.meta ? 'meta' : '',
    ].filter(Boolean).join('+');

    return modifiers ? `${modifiers}+${shortcut.key}` : shortcut.key || '';
  }

  /**
   * Register a keyboard shortcut
   */
  register(shortcut: KeyboardShortcut): void {
    const key = this.getShortcutKey(shortcut);
    this.shortcuts.set(key, shortcut);
  }

  /**
   * Unregister a keyboard shortcut
   */
  unregister(shortcut: Partial<KeyboardShortcut>): void {
    const key = this.getShortcutKey(shortcut);
    this.shortcuts.delete(key);
  }

  /**
   * Register default shortcuts
   */
  private registerDefaultShortcuts(): void {
    // Search focus
    this.register({
      key: '/',
      description: 'Focus search',
      action: () => this.focusSearch(),
      scope: 'global',
    });

    this.register({
      key: 'k',
      ctrl: true,
      description: 'Focus search (Ctrl+K)',
      action: () => this.focusSearch(),
      scope: 'global',
    });

    // Navigation shortcuts
    this.register({
      key: 'd',
      description: 'Go to Dashboard (G+D)',
      action: () => this.navigateTo('/en/dashboard'),
      scope: 'global',
    });

    this.register({
      key: 'r',
      description: 'Go to Reports (G+R)',
      action: () => this.navigateTo('/en/reports'),
      scope: 'global',
    });

    this.register({
      key: 'b',
      description: 'Go to Benchmarks (G+B)',
      action: () => this.navigateTo('/en/benchmarks'),
      scope: 'global',
    });

    this.register({
      key: 's',
      description: 'Go to Settings (G+S)',
      action: () => this.navigateTo('/en/settings'),
      scope: 'global',
    });

    // Help modal
    this.register({
      key: '?',
      shift: true,
      description: 'Show keyboard shortcuts help',
      action: () => this.toggleHelpModal(),
      scope: 'global',
    });

    // Close modal/drawer
    this.register({
      key: 'Escape',
      description: 'Close modals/drawers',
      action: () => this.closeModalsAndDrawers(),
      scope: 'global',
    });

    // Dashboard-specific shortcuts
    this.register({
      key: 'f',
      description: 'Toggle filters panel',
      action: () => this.toggleFiltersPanel(),
      scope: 'dashboard',
    });

    this.register({
      key: 'e',
      description: 'Export current view',
      action: () => this.exportCurrentView(),
      scope: 'dashboard',
    });

    this.register({
      key: 'v',
      description: 'Save current view',
      action: () => this.saveCurrentView(),
      scope: 'dashboard',
    });

    // Widget navigation
    this.register({
      key: 'ArrowLeft',
      alt: true,
      description: 'Navigate to previous widget',
      action: () => this.navigateWidget('previous'),
      scope: 'dashboard',
    });

    this.register({
      key: 'ArrowRight',
      alt: true,
      description: 'Navigate to next widget',
      action: () => this.navigateWidget('next'),
      scope: 'dashboard',
    });
  }

  /**
   * Attach keyboard event listener
   */
  private attachEventListener(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('keydown', (event: KeyboardEvent) => {
      if (!this.isEnabled) return;

      // Don't intercept if user is typing in an input
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        // Allow Escape to work in inputs
        if (event.key !== 'Escape') return;
      }

      const key = this.getShortcutKey({
        key: event.key,
        ctrl: event.ctrlKey,
        shift: event.shiftKey,
        alt: event.altKey,
        meta: event.metaKey,
      });

      const shortcut = this.shortcuts.get(key);

      if (shortcut) {
        // Check scope
        if (shortcut.scope && shortcut.scope !== this.activeScope && shortcut.scope !== 'global') {
          return;
        }

        event.preventDefault();
        shortcut.action();
      }
    });
  }

  /**
   * Focus search input
   */
  private focusSearch(): void {
    const searchInput = document.querySelector<HTMLInputElement>(
      'input[type="search"], input[aria-label*="search" i], #global-search'
    );
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }

  /**
   * Navigate to a route
   */
  private navigateTo(path: string): void {
    if (typeof window !== 'undefined') {
      window.location.href = path;
    }
  }

  /**
   * Toggle help modal
   */
  private toggleHelpModal(): void {
    this.helpModalOpen = !this.helpModalOpen;
    const event = new CustomEvent('toggle-keyboard-help', {
      detail: { open: this.helpModalOpen },
    });
    window.dispatchEvent(event);
  }

  /**
   * Close modals and drawers
   */
  private closeModalsAndDrawers(): void {
    const event = new CustomEvent('close-all-overlays');
    window.dispatchEvent(event);
    this.helpModalOpen = false;
  }

  /**
   * Toggle filters panel
   */
  private toggleFiltersPanel(): void {
    const event = new CustomEvent('toggle-filters-panel');
    window.dispatchEvent(event);
  }

  /**
   * Export current view
   */
  private exportCurrentView(): void {
    const event = new CustomEvent('export-current-view');
    window.dispatchEvent(event);
  }

  /**
   * Save current view
   */
  private saveCurrentView(): void {
    const event = new CustomEvent('save-current-view');
    window.dispatchEvent(event);
  }

  /**
   * Navigate between widgets
   */
  private navigateWidget(direction: 'previous' | 'next'): void {
    const event = new CustomEvent('navigate-widget', {
      detail: { direction },
    });
    window.dispatchEvent(event);
  }

  /**
   * Set active scope
   */
  setScope(scope: 'global' | 'dashboard' | 'modal'): void {
    this.activeScope = scope;
  }

  /**
   * Enable/disable shortcuts
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Get all shortcuts for help display
   */
  getAllShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Get shortcuts grouped by category
   */
  getShortcutsByCategory(): Record<string, KeyboardShortcut[]> {
    const shortcuts = this.getAllShortcuts();
    const categories: Record<string, KeyboardShortcut[]> = {
      'Navigation': [],
      'Actions': [],
      'Dashboard': [],
      'Help': [],
    };

    shortcuts.forEach(shortcut => {
      if (shortcut.description.includes('Go to')) {
        categories['Navigation']!.push(shortcut);
      } else if (shortcut.description.includes('help')) {
        categories['Help']!.push(shortcut);
      } else if (shortcut.scope === 'dashboard') {
        categories['Dashboard']!.push(shortcut);
      } else {
        categories['Actions']!.push(shortcut);
      }
    });

    return categories;
  }

  /**
   * Format shortcut key for display
   */
  formatShortcutKey(shortcut: KeyboardShortcut): string {
    const parts: string[] = [];

    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.shift) parts.push('Shift');
    if (shortcut.alt) parts.push('Alt');
    if (shortcut.meta) parts.push('Cmd');

    parts.push(shortcut.key === '/' ? '/' : shortcut.key.toUpperCase());

    return parts.join(' + ');
  }
}

/**
 * Focus trap for modals
 */
export class FocusTrap {
  private container: HTMLElement;
  private focusableElements: HTMLElement[] = [];
  private firstFocusableElement: HTMLElement | null = null;
  private lastFocusableElement: HTMLElement | null = null;
  private previousActiveElement: HTMLElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.updateFocusableElements();
  }

  /**
   * Update list of focusable elements
   */
  private updateFocusableElements(): void {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    this.focusableElements = Array.from(
      this.container.querySelectorAll<HTMLElement>(focusableSelectors)
    );

    this.firstFocusableElement = this.focusableElements[0] || null;
    this.lastFocusableElement = this.focusableElements[this.focusableElements.length - 1] || null;
  }

  /**
   * Activate focus trap
   */
  activate(): void {
    this.previousActiveElement = document.activeElement as HTMLElement;
    this.updateFocusableElements();

    // Focus first element
    if (this.firstFocusableElement) {
      this.firstFocusableElement.focus();
    }

    // Add event listener for Tab key
    this.container.addEventListener('keydown', this.handleTabKey);
  }

  /**
   * Handle Tab key for focus trap
   */
  private handleTabKey = (event: KeyboardEvent): void => {
    if (event.key !== 'Tab') return;

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === this.firstFocusableElement) {
        event.preventDefault();
        this.lastFocusableElement?.focus();
      }
    } else {
      // Tab
      if (document.activeElement === this.lastFocusableElement) {
        event.preventDefault();
        this.firstFocusableElement?.focus();
      }
    }
  };

  /**
   * Deactivate focus trap
   */
  deactivate(): void {
    this.container.removeEventListener('keydown', this.handleTabKey);

    // Restore previous focus
    if (this.previousActiveElement) {
      this.previousActiveElement.focus();
    }
  }
}

/**
 * Roving tabindex manager for widget grids
 */
export class RovingTabIndexManager {
  private container: HTMLElement;
  private items: HTMLElement[] = [];
  private currentIndex = 0;

  constructor(container: HTMLElement, itemSelector: string = '[role="gridcell"]') {
    this.container = container;
    this.updateItems(itemSelector);
    this.attachEventListeners();
  }

  /**
   * Update list of items
   */
  updateItems(itemSelector: string): void {
    this.items = Array.from(this.container.querySelectorAll<HTMLElement>(itemSelector));
    this.updateTabIndex();
  }

  /**
   * Update tabindex attributes
   */
  private updateTabIndex(): void {
    this.items.forEach((item, index) => {
      item.setAttribute('tabindex', index === this.currentIndex ? '0' : '-1');
    });
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    this.container.addEventListener('keydown', this.handleKeyDown);
    this.items.forEach((item, index) => {
      item.addEventListener('focus', () => {
        this.currentIndex = index;
        this.updateTabIndex();
      });
    });
  }

  /**
   * Handle keyboard navigation
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    let newIndex = this.currentIndex;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        newIndex = (this.currentIndex + 1) % this.items.length;
        break;

      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        newIndex = (this.currentIndex - 1 + this.items.length) % this.items.length;
        break;

      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;

      case 'End':
        event.preventDefault();
        newIndex = this.items.length - 1;
        break;

      default:
        return;
    }

    this.currentIndex = newIndex;
    this.updateTabIndex();
    this.items[newIndex]?.focus();
  };

  /**
   * Destroy manager
   */
  destroy(): void {
    this.container.removeEventListener('keydown', this.handleKeyDown);
  }
}

/**
 * Skip links manager
 */
export class SkipLinksManager {
  private skipLinks: Array<{ id: string; label: string; targetId: string }> = [];

  constructor() {
    this.registerDefaultSkipLinks();
    this.renderSkipLinks();
  }

  /**
   * Register default skip links
   */
  private registerDefaultSkipLinks(): void {
    this.skipLinks = [
      { id: 'skip-to-main', label: 'Skip to main content', targetId: 'main-content' },
      { id: 'skip-to-nav', label: 'Skip to navigation', targetId: 'main-navigation' },
      { id: 'skip-to-search', label: 'Skip to search', targetId: 'global-search' },
      { id: 'skip-to-footer', label: 'Skip to footer', targetId: 'page-footer' },
    ];
  }

  /**
   * Render skip links
   */
  private renderSkipLinks(): void {
    if (typeof document === 'undefined') return;

    const container = document.createElement('div');
    container.className = 'skip-links';
    container.setAttribute('role', 'navigation');
    container.setAttribute('aria-label', 'Skip links');

    this.skipLinks.forEach(link => {
      const anchor = document.createElement('a');
      anchor.id = link.id;
      anchor.href = `#${link.targetId}`;
      anchor.className = 'skip-link';
      anchor.textContent = link.label;
      anchor.style.cssText = `
        position: absolute;
        top: -40px;
        left: 0;
        background: #000;
        color: #fff;
        padding: 8px 16px;
        text-decoration: none;
        z-index: 1000;
        font-size: 14px;
        font-weight: 500;
      `;

      anchor.addEventListener('focus', () => {
        anchor.style.top = '0';
      });

      anchor.addEventListener('blur', () => {
        anchor.style.top = '-40px';
      });

      anchor.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.getElementById(link.targetId);
        if (target) {
          target.focus();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });

      container.appendChild(anchor);
    });

    document.body.insertBefore(container, document.body.firstChild);
  }

  /**
   * Add custom skip link
   */
  addSkipLink(label: string, targetId: string): void {
    const id = `skip-to-${targetId}`;
    this.skipLinks.push({ id, label, targetId });
    this.renderSkipLinks();
  }
}

/**
 * Global instances
 */
let globalKeyboardShortcutRegistry: KeyboardShortcutRegistry | null = null;
let globalSkipLinksManager: SkipLinksManager | null = null;

/**
 * Initialize keyboard navigation
 */
export function initializeKeyboardNavigation(): {
  shortcutRegistry: KeyboardShortcutRegistry;
  skipLinksManager: SkipLinksManager;
} {
  if (!globalKeyboardShortcutRegistry) {
    globalKeyboardShortcutRegistry = new KeyboardShortcutRegistry();
  }

  if (!globalSkipLinksManager) {
    globalSkipLinksManager = new SkipLinksManager();
  }

  return {
    shortcutRegistry: globalKeyboardShortcutRegistry,
    skipLinksManager: globalSkipLinksManager,
  };
}

/**
 * React hook for keyboard shortcuts
 */
export function useKeyboardShortcuts() {
  const { shortcutRegistry } = initializeKeyboardNavigation();

  return {
    register: (shortcut: KeyboardShortcut) => shortcutRegistry.register(shortcut),
    unregister: (shortcut: Partial<KeyboardShortcut>) => shortcutRegistry.unregister(shortcut),
    setScope: (scope: 'global' | 'dashboard' | 'modal') => shortcutRegistry.setScope(scope),
    setEnabled: (enabled: boolean) => shortcutRegistry.setEnabled(enabled),
    getAllShortcuts: () => shortcutRegistry.getAllShortcuts(),
    getShortcutsByCategory: () => shortcutRegistry.getShortcutsByCategory(),
    formatShortcutKey: (shortcut: KeyboardShortcut) => shortcutRegistry.formatShortcutKey(shortcut),
  };
}

/**
 * React hook for focus trap
 */
export function useFocusTrap(containerRef: React.RefObject<HTMLElement>, isActive: boolean) {
  const focusTrapRef = React.useRef<FocusTrap | null>(null);

  React.useEffect(() => {
    if (!containerRef.current) return;

    if (isActive) {
      focusTrapRef.current = new FocusTrap(containerRef.current);
      focusTrapRef.current.activate();
    }

    return () => {
      if (focusTrapRef.current) {
        focusTrapRef.current.deactivate();
        focusTrapRef.current = null;
      }
    };
  }, [containerRef, isActive]);

  return focusTrapRef;
}

/**
 * React hook for roving tabindex
 */
export function useRovingTabIndex(
  containerRef: React.RefObject<HTMLElement>,
  itemSelector: string = '[role="gridcell"]'
) {
  const managerRef = React.useRef<RovingTabIndexManager | null>(null);

  React.useEffect(() => {
    if (!containerRef.current) return;

    managerRef.current = new RovingTabIndexManager(containerRef.current, itemSelector);

    return () => {
      if (managerRef.current) {
        managerRef.current.destroy();
        managerRef.current = null;
      }
    };
  }, [containerRef, itemSelector]);

  return {
    updateItems: (selector?: string) => {
      if (managerRef.current) {
        managerRef.current.updateItems(selector || itemSelector);
      }
    },
  };
}
