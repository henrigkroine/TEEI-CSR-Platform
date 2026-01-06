/**
 * Dropdown — Premium dropdown menu component
 * 
 * Accessible dropdown menus with keyboard navigation, click-outside-to-close,
 * and smooth animations.
 */

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from 'react';
import { createPortal } from 'react-dom';

// =============================================================================
// TYPES
// =============================================================================

export interface DropdownItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  divider?: boolean;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  position?: 'bottom' | 'top';
  className?: string;
  disabled?: boolean;
}

export interface DropdownContextValue {
  close: () => void;
}

// =============================================================================
// CONTEXT
// =============================================================================

const DropdownContext = createContext<DropdownContextValue | null>(null);

function useDropdownContext() {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error('Dropdown components must be used within Dropdown');
  }
  return context;
}

// =============================================================================
// DROPDOWN COMPONENT
// =============================================================================

export default function Dropdown({
  trigger,
  items,
  align = 'right',
  position = 'bottom',
  className = '',
  disabled = false,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate menu position
  useEffect(() => {
    if (isOpen && triggerRef.current && menuRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const menuRect = menuRef.current.getBoundingClientRect();
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;

      let top = 0;
      let left = 0;

      if (position === 'bottom') {
        top = triggerRect.bottom + scrollY + 8;
      } else {
        top = triggerRect.top + scrollY - menuRect.height - 8;
      }

      if (align === 'right') {
        left = triggerRect.right + scrollX - menuRect.width;
      } else {
        left = triggerRect.left + scrollX;
      }

      // Ensure menu stays within viewport
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (left + menuRect.width > viewportWidth) {
        left = viewportWidth - menuRect.width - 16;
      }
      if (left < 16) {
        left = 16;
      }

      if (top + menuRect.height > viewportHeight + scrollY) {
        top = triggerRect.top + scrollY - menuRect.height - 8;
      }
      if (top < scrollY + 16) {
        top = scrollY + 16;
      }

      setMenuPosition({ top, left });
    }
  }, [isOpen, align, position]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        menuRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setIsOpen(false);
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Focus management
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const firstItem = menuRef.current.querySelector<HTMLElement>(
        '.dropdown-item:not(.dropdown-item-disabled)'
      );
      firstItem?.focus();
    }
  }, [isOpen]);

  const handleToggle = useCallback(() => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  }, [disabled]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.querySelector('button, a')?.focus();
  }, []);

  const handleItemClick = useCallback(
    (item: DropdownItem) => {
      if (item.disabled || item.divider) return;
      item.onClick();
      handleClose();
    },
    [handleClose]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      const enabledItems = items.filter((item) => !item.disabled && !item.divider);
      const currentIndex = enabledItems.findIndex((_, i) => i === index);

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          const nextIndex = (currentIndex + 1) % enabledItems.length;
          const nextItem = menuRef.current?.querySelectorAll<HTMLElement>(
            '.dropdown-item:not(.dropdown-item-disabled)'
          )[nextIndex];
          nextItem?.focus();
          break;

        case 'ArrowUp':
          e.preventDefault();
          const prevIndex = currentIndex === 0 ? enabledItems.length - 1 : currentIndex - 1;
          const prevItem = menuRef.current?.querySelectorAll<HTMLElement>(
            '.dropdown-item:not(.dropdown-item-disabled)'
          )[prevIndex];
          prevItem?.focus();
          break;

        case 'Enter':
        case ' ':
          e.preventDefault();
          handleItemClick(items[index]);
          break;

        case 'Escape':
          e.preventDefault();
          handleClose();
          break;
      }
    },
    [items, handleItemClick, handleClose]
  );

  return (
    <DropdownContext.Provider value={{ close: handleClose }}>
      <div className={`dropdown ${className}`}>
        <div
          ref={triggerRef}
          onClick={handleToggle}
          className={`dropdown-trigger ${disabled ? 'dropdown-trigger-disabled' : ''}`}
        >
          {trigger}
        </div>

        {mounted &&
          isOpen &&
          createPortal(
            <div
              ref={menuRef}
              className="dropdown-menu"
              role="menu"
              style={{
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
              }}
            >
              {items.map((item, index) => {
                if (item.divider) {
                  return <div key={`divider-${index}`} className="dropdown-divider" />;
                }

                return (
                  <button
                    key={index}
                    type="button"
                    role="menuitem"
                    className={`dropdown-item ${
                      item.disabled ? 'dropdown-item-disabled' : ''
                    } ${item.destructive ? 'dropdown-item-destructive' : ''}`}
                    onClick={() => handleItemClick(item)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    disabled={item.disabled}
                    tabIndex={item.disabled ? -1 : 0}
                  >
                    {item.icon && <span className="dropdown-item-icon">{item.icon}</span>}
                    <span className="dropdown-item-label">{item.label}</span>
                  </button>
                );
              })}

              <style>{`
                .dropdown-menu {
                  position: absolute;
                  z-index: 1000;
                  min-width: 200px;
                  background: var(--color-surface);
                  border: 1px solid var(--color-border);
                  border-radius: var(--radius-lg);
                  box-shadow: var(--shadow-dropdown);
                  padding: 8px;
                  margin: 0;
                  list-style: none;
                  opacity: 0;
                  transform: translateY(-8px) scale(0.95);
                  animation: dropdownIn 200ms var(--ease-out) forwards;
                  pointer-events: auto;
                }

                @keyframes dropdownIn {
                  to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                  }
                }

                .dropdown-item {
                  display: flex;
                  align-items: center;
                  gap: 12px;
                  width: 100%;
                  padding: 10px 12px;
                  border: none;
                  background: transparent;
                  border-radius: var(--radius-md);
                  font-size: var(--text-sm);
                  font-weight: var(--font-weight-medium);
                  color: var(--color-text-primary);
                  text-align: left;
                  cursor: pointer;
                  transition: all var(--duration-fast) var(--ease-out);
                }

                .dropdown-item:hover:not(.dropdown-item-disabled) {
                  background: var(--color-muted);
                }

                .dropdown-item:focus-visible {
                  outline: 2px solid var(--color-primary);
                  outline-offset: -2px;
                }

                .dropdown-item-disabled {
                  opacity: 0.5;
                  cursor: not-allowed;
                }

                .dropdown-item-destructive {
                  color: var(--color-error);
                }

                .dropdown-item-destructive:hover:not(.dropdown-item-disabled) {
                  background: var(--color-error-light);
                }

                .dropdown-item-icon {
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  width: 16px;
                  height: 16px;
                  flex-shrink: 0;
                }

                .dropdown-item-label {
                  flex: 1;
                }

                .dropdown-divider {
                  height: 1px;
                  background: var(--color-border);
                  margin: 8px 0;
                }

                .dropdown-trigger {
                  display: inline-block;
                }

                .dropdown-trigger-disabled {
                  opacity: 0.5;
                  cursor: not-allowed;
                  pointer-events: none;
                }

                /* Dark mode */
                [data-theme="dark"] .dropdown-menu,
                html.dark .dropdown-menu {
                  background: var(--color-surface);
                  border-color: var(--color-border-strong);
                  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                }

                /* Reduced motion */
                @media (prefers-reduced-motion: reduce) {
                  .dropdown-menu {
                    animation: none;
                    opacity: 1;
                    transform: none;
                  }
                }
              `}</style>
            </div>,
            document.body
          )}
      </div>
    </DropdownContext.Provider>
  );
}



