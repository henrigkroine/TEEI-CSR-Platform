/**
 * NLQ Skip Links Component
 * Provides keyboard navigation shortcuts for NLQ interface
 * WCAG 2.2 AA Compliance - Skip Navigation
 */

import { useState, type CSSProperties } from 'react';

/**
 * Skip link configuration
 */
interface SkipLinkConfig {
  /**
   * Display text for the link
   */
  text: string;

  /**
   * Target element ID
   */
  targetId: string;

  /**
   * Optional keyboard shortcut (for documentation)
   */
  shortcut?: string;
}

/**
 * NLQ Skip Links Component
 * Provides skip navigation links for the NLQ interface
 *
 * Usage:
 * ```tsx
 * <NLQSkipLinks />
 * ```
 */
interface NLQSkipLinksProps {
  /**
   * Custom skip links (optional, uses defaults if not provided)
   */
  links?: SkipLinkConfig[];

  /**
   * CSS class name
   */
  className?: string;
}

const DEFAULT_NLQ_SKIP_LINKS: SkipLinkConfig[] = [
  {
    text: 'Skip to search input',
    targetId: 'nlq-search-input',
    shortcut: '/',
  },
  {
    text: 'Skip to results',
    targetId: 'nlq-results',
    shortcut: 'r',
  },
  {
    text: 'Skip to query history',
    targetId: 'nlq-history',
    shortcut: 'h',
  },
  {
    text: 'Skip to filters',
    targetId: 'nlq-filters',
  },
];

export function NLQSkipLinks({
  links = DEFAULT_NLQ_SKIP_LINKS,
  className = '',
}: NLQSkipLinksProps) {
  const handleSkipClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    targetId: string
  ) => {
    event.preventDefault();

    const target = document.getElementById(targetId);
    if (target) {
      // Make element focusable
      target.setAttribute('tabindex', '-1');
      target.focus();

      // Scroll into view with smooth behavior
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });

      // Remove tabindex after blur to restore natural tab order
      target.addEventListener(
        'blur',
        () => {
          target.removeAttribute('tabindex');
        },
        { once: true }
      );
    } else {
      console.warn(`Skip link target not found: #${targetId}`);
    }
  };

  const skipLinkStyle: CSSProperties = {
    position: 'absolute',
    left: '-9999px',
    top: 'auto',
    width: '1px',
    height: '1px',
    overflow: 'hidden',
  };

  const skipLinkFocusStyle: CSSProperties = {
    position: 'fixed',
    top: '0',
    left: '0',
    width: 'auto',
    height: 'auto',
    overflow: 'visible',
    padding: '0.75rem 1.5rem',
    background: '#000',
    color: '#fff',
    textDecoration: 'none',
    borderRadius: '0 0 0.5rem 0',
    zIndex: 9999,
    fontSize: '1rem',
    fontWeight: 600,
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
  };

  return (
    <nav
      aria-label="Skip navigation links"
      className={`nlq-skip-links ${className}`.trim()}
    >
      {links.map((link) => (
        <a
          key={link.targetId}
          href={`#${link.targetId}`}
          onClick={(e) => handleSkipClick(e, link.targetId)}
          style={skipLinkStyle}
          onFocus={(e) => {
            Object.assign(e.currentTarget.style, skipLinkFocusStyle);
          }}
          onBlur={(e) => {
            Object.assign(e.currentTarget.style, skipLinkStyle);
          }}
        >
          {link.text}
          {link.shortcut && (
            <span style={{ marginLeft: '0.5rem', opacity: 0.8 }}>
              ({link.shortcut})
            </span>
          )}
        </a>
      ))}
    </nav>
  );
}

/**
 * Focus trap regions for NLQ modals
 * Defines focusable regions within the NLQ interface
 */
export interface FocusRegion {
  id: string;
  label: string;
  description?: string;
}

export const NLQ_FOCUS_REGIONS: FocusRegion[] = [
  {
    id: 'nlq-search-input',
    label: 'Search input',
    description: 'Natural language query input field',
  },
  {
    id: 'nlq-suggestions',
    label: 'Suggestions',
    description: 'Autocomplete suggestions dropdown',
  },
  {
    id: 'nlq-results',
    label: 'Results',
    description: 'Query results and answer cards',
  },
  {
    id: 'nlq-history',
    label: 'Query history',
    description: 'Previously executed queries',
  },
  {
    id: 'nlq-filters',
    label: 'Filters',
    description: 'Result filtering controls',
  },
  {
    id: 'nlq-lineage',
    label: 'Data lineage',
    description: 'Evidence and data source information',
  },
];

/**
 * Breadcrumb navigation for NLQ context
 */
interface NLQBreadcrumbsProps {
  /**
   * Current context path
   */
  path: Array<{
    label: string;
    targetId?: string;
  }>;

  /**
   * Callback when breadcrumb is clicked
   */
  onNavigate?: (index: number) => void;

  /**
   * CSS class name
   */
  className?: string;
}

export function NLQBreadcrumbs({
  path,
  onNavigate,
  className = '',
}: NLQBreadcrumbsProps) {
  const handleClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    index: number,
    targetId?: string
  ) => {
    event.preventDefault();

    if (targetId) {
      const target = document.getElementById(targetId);
      if (target) {
        target.setAttribute('tabindex', '-1');
        target.focus();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        target.addEventListener(
          'blur',
          () => {
            target.removeAttribute('tabindex');
          },
          { once: true }
        );
      }
    }

    onNavigate?.(index);
  };

  return (
    <nav
      aria-label="Breadcrumb navigation"
      className={`nlq-breadcrumbs ${className}`.trim()}
    >
      <ol
        style={{
          display: 'flex',
          listStyle: 'none',
          padding: 0,
          margin: 0,
          gap: '0.5rem',
        }}
      >
        {path.map((item, index) => (
          <li
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {index < path.length - 1 ? (
              <>
                <a
                  href={item.targetId ? `#${item.targetId}` : '#'}
                  onClick={(e) => handleClick(e, index, item.targetId)}
                  style={{
                    color: '#0066cc',
                    textDecoration: 'none',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.textDecoration = 'underline';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.textDecoration = 'none';
                  }}
                >
                  {item.label}
                </a>
                <span aria-hidden="true" style={{ color: '#666' }}>
                  /
                </span>
              </>
            ) : (
              <span
                aria-current="page"
                style={{
                  color: '#333',
                  fontWeight: 600,
                }}
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Landmark markers for NLQ sections
 * Helps screen readers navigate the interface
 */
interface LandmarkWrapperProps {
  /**
   * Landmark type
   */
  type: 'search' | 'main' | 'complementary' | 'region';

  /**
   * Accessible label
   */
  label: string;

  /**
   * Element ID (for skip links)
   */
  id: string;

  /**
   * Children content
   */
  children: React.ReactNode;

  /**
   * CSS class name
   */
  className?: string;
}

export function LandmarkWrapper({
  type,
  label,
  id,
  children,
  className = '',
}: LandmarkWrapperProps) {
  const getRole = () => {
    switch (type) {
      case 'search':
        return 'search';
      case 'main':
        return 'main';
      case 'complementary':
        return 'complementary';
      case 'region':
        return 'region';
    }
  };

  const getElement = () => {
    switch (type) {
      case 'search':
        return 'div';
      case 'main':
        return 'main';
      case 'complementary':
        return 'aside';
      default:
        return 'section';
    }
  };

  const Element = getElement();

  return (
    <Element
      id={id}
      role={getRole()}
      aria-label={label}
      className={className}
    >
      {children}
    </Element>
  );
}

/**
 * Quick navigation menu for NLQ
 * Provides keyboard shortcuts to jump between sections
 */
interface QuickNavProps {
  /**
   * Whether the menu is visible
   */
  isVisible: boolean;

  /**
   * Callback when menu should close
   */
  onClose: () => void;

  /**
   * CSS class name
   */
  className?: string;
}

export function QuickNav({
  isVisible,
  onClose,
  className = '',
}: QuickNavProps) {
  if (!isVisible) return null;

  const shortcuts = [
    { key: '/', description: 'Focus search input', targetId: 'nlq-search-input' },
    { key: 'r', description: 'Jump to results', targetId: 'nlq-results' },
    { key: 'h', description: 'View history', targetId: 'nlq-history' },
    { key: 'f', description: 'Open filters', targetId: 'nlq-filters' },
    { key: 'Esc', description: 'Close this menu', targetId: null },
  ];

  const handleNavigate = (targetId: string | null) => {
    if (targetId) {
      const target = document.getElementById(targetId);
      if (target) {
        target.setAttribute('tabindex', '-1');
        target.focus();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        target.addEventListener(
          'blur',
          () => {
            target.removeAttribute('tabindex');
          },
          { once: true }
        );
      }
    }
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-label="Keyboard shortcuts"
      className={`nlq-quick-nav ${className}`.trim()}
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: '#fff',
        padding: '2rem',
        borderRadius: '0.5rem',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
        zIndex: 10000,
        maxWidth: '400px',
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.25rem' }}>
        Keyboard Shortcuts
      </h2>
      <dl style={{ margin: 0 }}>
        {shortcuts.map((shortcut) => (
          <div
            key={shortcut.key}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.5rem 0',
              borderBottom: '1px solid #e5e7eb',
            }}
          >
            <dt style={{ fontWeight: 600 }}>
              <kbd
                style={{
                  padding: '0.125rem 0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.25rem',
                  backgroundColor: '#f3f4f6',
                  fontFamily: 'monospace',
                }}
              >
                {shortcut.key}
              </kbd>
            </dt>
            <dd style={{ margin: 0, color: '#6b7280' }}>
              {shortcut.description}
            </dd>
          </div>
        ))}
      </dl>
      <button
        onClick={() => onClose()}
        style={{
          marginTop: '1.5rem',
          padding: '0.5rem 1rem',
          backgroundColor: '#3b82f6',
          color: '#fff',
          border: 'none',
          borderRadius: '0.25rem',
          cursor: 'pointer',
          width: '100%',
        }}
      >
        Close
      </button>
    </div>
  );
}

export default NLQSkipLinks;
