/**
 * ThemeToggle Component
 *
 * 3-state toggle button for theme selection:
 * - Light mode (☀️)
 * - Auto mode (💻 system preference)
 * - Dark mode (🌙)
 *
 * Features:
 * - Keyboard accessible (Tab, Enter, Space)
 * - Screen reader announcements
 * - Respects prefers-reduced-motion
 * - Smooth transitions
 * - Tooltip showing current mode
 */

import { useState, useRef, useEffect } from 'react';
import { useTheme } from './ThemeProvider';
import type { Theme } from './ThemeProvider';

const THEME_CYCLE_ORDER: Theme[] = ['light', 'auto', 'dark'];

const THEME_CONFIG = {
  light: {
    icon: '☀️',
    label: 'Light mode',
    ariaLabel: 'Switch to automatic theme',
    tooltip: 'Light'
  },
  auto: {
    icon: '💻',
    label: 'Automatic (system)',
    ariaLabel: 'Switch to dark mode',
    tooltip: 'Auto'
  },
  dark: {
    icon: '🌙',
    label: 'Dark mode',
    ariaLabel: 'Switch to light mode',
    tooltip: 'Dark'
  }
};

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  showTooltip?: boolean;
  onThemeChange?: (theme: Theme) => void;
}

export function ThemeToggle({
  className = '',
  showLabel = false,
  showTooltip = true,
  onThemeChange
}: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [showTooltipText, setShowTooltipText] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check for prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    setPrefersReducedMotion(motionQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    motionQuery.addEventListener('change', handleMotionChange);
    return () => motionQuery.removeEventListener('change', handleMotionChange);
  }, []);

  const handleClick = () => {
    const currentIndex = THEME_CYCLE_ORDER.indexOf(theme);
    const nextIndex = (currentIndex + 1) % THEME_CYCLE_ORDER.length;
    const nextTheme = THEME_CYCLE_ORDER[nextIndex];

    setTheme(nextTheme);
    onThemeChange?.(nextTheme);

    // Announce change to screen readers
    announceThemeChange(nextTheme);
  };

  const handleKeyDown = (e: any) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const config = THEME_CONFIG[theme];

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setShowTooltipText(true)}
        onMouseLeave={() => setShowTooltipText(false)}
        onFocus={() => setShowTooltipText(true)}
        onBlur={() => setShowTooltipText(false)}
        aria-label={config.ariaLabel}
        title={showTooltip ? config.label : undefined}
        className={`
          relative inline-flex items-center justify-center
          h-10 w-10 rounded-lg
          bg-gray-100 dark:bg-gray-700
          hover:bg-gray-200 dark:hover:bg-gray-600
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500
          dark:focus-visible:outline-blue-400
          transition-colors
          ${prefersReducedMotion ? '' : 'transition-transform'}
          active:scale-95
          cursor-pointer
          p-2
        `}
      >
        <span className={`
          text-xl leading-none
          ${prefersReducedMotion ? '' : 'transition-transform duration-200'}
          inline-block
        `}>
          {config.icon}
        </span>
      </button>

      {/* Tooltip */}
      {showTooltip && showTooltipText && (
        <div
          role="tooltip"
          className={`
            absolute bottom-full left-1/2 -translate-x-1/2 mb-2
            px-3 py-1 rounded-md
            bg-gray-900 dark:bg-gray-100
            text-white dark:text-gray-900
            text-sm font-medium
            whitespace-nowrap
            pointer-events-none
            z-50
            ${prefersReducedMotion ? '' : 'animate-fade-in'}
          `}
          style={{
            animation: prefersReducedMotion
              ? 'none'
              : 'fadeIn 0.2s ease-in-out'
          }}
        >
          {config.tooltip}
          {/* Tooltip arrow */}
          <div
            className={`
              absolute top-full left-1/2 -translate-x-1/2
              border-4 border-transparent
              border-t-gray-900 dark:border-t-gray-100
            `}
          />
        </div>
      )}

      {/* Label (optional) */}
      {showLabel && (
        <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          {config.tooltip}
        </span>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translate(-50%, -0.5rem);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Announce theme change to screen readers
 */
function announceThemeChange(theme: Theme) {
  const config = THEME_CONFIG[theme];

  // Create a live region if it doesn't exist
  let liveRegion = document.getElementById('theme-announce');
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'theme-announce';
    liveRegion.className = 'sr-only';
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    document.body.appendChild(liveRegion);
  }

  // Update the announcement
  liveRegion.textContent = `Theme switched to ${config.label}`;

  // Clear after 1 second to avoid repetition if button is focused again
  setTimeout(() => {
    if (liveRegion) {
      liveRegion.textContent = '';
    }
  }, 1000);
}
