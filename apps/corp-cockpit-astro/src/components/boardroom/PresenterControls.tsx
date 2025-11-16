/**
<<<<<<< HEAD
 * Presenter Controls for Boardroom Live
 *
 * Advanced control panel for presenters with keyboard and remote support.
 * Provides navigation, slide cycling, evidence toggle, snapshot export,
 * and presentation timer.
 *
 * Keyboard Shortcuts:
 * - Space / Right Arrow: Next slide
 * - Left Arrow: Previous slide
 * - F / F11: Toggle fullscreen
 * - E / Alt+E: Toggle evidence overlay
 * - P: Pause/Resume auto-cycle
 * - R: Reset timer
 * - S: Take snapshot
 * - H / ?: Show help overlay
 * - Esc: Exit boardroom mode
 *
 * Remote Control Support:
 * - Supports Logitech Spotlight, Kensington, and generic presenters
 * - Page Up/Down mapped to slide navigation
 * - B key for blackout (pause)
 *
 * @module PresenterControls
 */

import { useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { downloadSnapshot, type SnapshotOptions } from '../../lib/offline/snapshot';

export interface PresenterControlsProps {
  /** Total number of slides/views */
  slideCount: number;
  /** Current slide index (0-based) */
  currentSlide: number;
  /** Callback when slide changes */
  onSlideChange: (index: number) => void;
  /** Whether auto-cycle is enabled */
  autoCycle?: boolean;
  /** Auto-cycle interval in ms */
  cycleInterval?: number;
  /** Callback when auto-cycle is toggled */
  onAutoCycleToggle?: (enabled: boolean) => void;
  /** Whether evidence overlay is enabled */
  evidenceEnabled?: boolean;
  /** Callback when evidence is toggled */
  onEvidenceToggle?: (enabled: boolean) => void;
  /** Company ID for snapshot */
  companyId: string;
  /** Whether to show controls */
  visible?: boolean;
  /** Callback when visibility changes */
  onVisibilityChange?: (visible: boolean) => void;
  /** Callback when exit is requested */
  onExit?: () => void;
}

export function PresenterControls({
  slideCount,
  currentSlide,
  onSlideChange,
  autoCycle = false,
  cycleInterval = 30000,
  onAutoCycleToggle,
  evidenceEnabled = false,
  onEvidenceToggle,
  companyId,
  visible = true,
  onVisibilityChange,
  onExit,
}: PresenterControlsProps) {
  const [isPaused, setIsPaused] = useState(!autoCycle);
  const [showHelp, setShowHelp] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(visible);
  const [lastInteraction, setLastInteraction] = useState(Date.now());

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoCycleRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide controls after 5 seconds of inactivity
  useEffect(() => {
    const checkInactivity = setInterval(() => {
      const inactiveTime = Date.now() - lastInteraction;
      if (inactiveTime > 5000 && controlsVisible) {
        setControlsVisible(false);
        onVisibilityChange?.(false);
      }
    }, 1000);

    return () => clearInterval(checkInactivity);
  }, [lastInteraction, controlsVisible, onVisibilityChange]);

  // Show controls on mouse move
  useEffect(() => {
    const handleMouseMove = () => {
      setLastInteraction(Date.now());
      if (!controlsVisible) {
        setControlsVisible(true);
        onVisibilityChange?.(true);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [controlsVisible, onVisibilityChange]);

  // Timer for presentation duration
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Auto-cycle slides
  useEffect(() => {
    if (!isPaused && autoCycle) {
      autoCycleRef.current = setInterval(() => {
        onSlideChange((currentSlide + 1) % slideCount);
      }, cycleInterval);
    }

    return () => {
      if (autoCycleRef.current) {
        clearInterval(autoCycleRef.current);
      }
    };
  }, [isPaused, autoCycle, currentSlide, slideCount, cycleInterval, onSlideChange]);

  // Monitor fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Update last interaction
      setLastInteraction(Date.now());

      // Don't handle if user is typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key) {
        // Navigation
        case ' ':
        case 'ArrowRight':
        case 'PageDown':
          event.preventDefault();
          handleNext();
          break;

        case 'ArrowLeft':
        case 'PageUp':
          event.preventDefault();
          handlePrevious();
          break;

        case 'Home':
          event.preventDefault();
          onSlideChange(0);
          break;

        case 'End':
          event.preventDefault();
          onSlideChange(slideCount - 1);
          break;

        // Fullscreen
        case 'f':
        case 'F11':
          event.preventDefault();
          toggleFullscreen();
          break;

        // Evidence overlay
        case 'e':
          if (event.altKey) {
            event.preventDefault();
            handleEvidenceToggle();
          }
          break;

        // Pause/Resume
        case 'p':
        case 'b': // B for "blackout" (common on remotes)
          event.preventDefault();
          handlePauseToggle();
          break;

        // Reset timer
        case 'r':
          event.preventDefault();
          setElapsedTime(0);
          break;

        // Snapshot
        case 's':
          event.preventDefault();
          handleSnapshot();
          break;

        // Help
        case 'h':
        case '?':
          event.preventDefault();
          setShowHelp((prev) => !prev);
          break;

        // Exit
        case 'Escape':
          event.preventDefault();
          if (showHelp) {
            setShowHelp(false);
          } else {
            onExit?.();
          }
          break;

        // Number keys for direct navigation (1-9)
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          event.preventDefault();
          const slideIndex = parseInt(event.key) - 1;
          if (slideIndex < slideCount) {
            onSlideChange(slideIndex);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide, slideCount, showHelp, onSlideChange, onExit]);

  // Navigation handlers
  const handleNext = useCallback(() => {
    const nextSlide = (currentSlide + 1) % slideCount;
    onSlideChange(nextSlide);
  }, [currentSlide, slideCount, onSlideChange]);

  const handlePrevious = useCallback(() => {
    const prevSlide = currentSlide === 0 ? slideCount - 1 : currentSlide - 1;
    onSlideChange(prevSlide);
  }, [currentSlide, slideCount, onSlideChange]);

  const handlePauseToggle = useCallback(() => {
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    onAutoCycleToggle?.(!newPausedState);
  }, [isPaused, onAutoCycleToggle]);

  const handleEvidenceToggle = useCallback(() => {
    onEvidenceToggle?.(!evidenceEnabled);
  }, [evidenceEnabled, onEvidenceToggle]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('[PresenterControls] Fullscreen toggle failed:', err);
    }
  }, []);

  const handleSnapshot = useCallback(async () => {
    setSnapshotLoading(true);

    const options: SnapshotOptions = {
      companyId,
      includeEvidence: evidenceEnabled,
      includeTimestamp: true,
      watermark: `TEEI Corporate Cockpit • ${new Date().toLocaleString()}`,
    };

    try {
      const result = await downloadSnapshot(options);

      if (!result.success) {
        alert(`Snapshot failed: ${result.error}`);
      }
    } catch (error) {
      console.error('[PresenterControls] Snapshot failed:', error);
      alert('Failed to create snapshot');
    } finally {
      setSnapshotLoading(false);
    }
  }, [companyId, evidenceEnabled]);

  // Format elapsed time as HH:MM:SS
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return [hours, minutes, secs].map((n) => n.toString().padStart(2, '0')).join(':');
  };

  if (!controlsVisible && !showHelp) {
    // Show minimal indicator that controls can be shown
    return (
      <div
        className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40
                   bg-gray-800 bg-opacity-50 text-white px-3 py-1 rounded-full text-xs
                   opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
        onClick={() => {
          setControlsVisible(true);
          onVisibilityChange?.(true);
          setLastInteraction(Date.now());
        }}
        role="button"
        aria-label="Show presenter controls"
      >
        Press H for help
      </div>
    );
  }

  return (
    <>
      {/* Main Control Panel */}
      <div
        className={`
          fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50
          bg-gray-900 bg-opacity-95 backdrop-blur-sm
          text-white rounded-2xl shadow-2xl
          px-6 py-4 min-w-[600px]
          border border-gray-700
          transition-all duration-300
          ${controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        `}
        role="toolbar"
        aria-label="Presenter controls"
      >
        {/* Top Row: Status & Timer */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-700">
          <div className="flex items-center gap-4">
            {/* Slide counter */}
            <div className="text-sm font-medium">
              <span className="text-blue-400 text-lg font-bold">{currentSlide + 1}</span>
              <span className="text-gray-400 mx-1">/</span>
              <span className="text-gray-400">{slideCount}</span>
            </div>

            {/* Auto-cycle status */}
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-green-500'}`}
                aria-label={isPaused ? 'Paused' : 'Playing'}
              />
              <span className="text-xs text-gray-400">
                {isPaused ? 'Paused' : 'Auto-cycling'}
              </span>
            </div>
          </div>

          {/* Timer */}
          <div className="font-mono text-lg font-bold text-blue-400">{formatTime(elapsedTime)}</div>
        </div>

        {/* Middle Row: Navigation Buttons */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <button
            onClick={handlePrevious}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg
                     transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Previous slide"
            title="Previous (←)"
          >
            <span className="text-xl">←</span>
          </button>

          <button
            onClick={handlePauseToggle}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg
                     transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={isPaused ? 'Resume' : 'Pause'}
            title={isPaused ? 'Resume (P)' : 'Pause (P)'}
          >
            <span className="text-xl">{isPaused ? '▶' : '⏸'}</span>
          </button>

          <button
            onClick={handleNext}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg
                     transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Next slide"
            title="Next (→ or Space)"
          >
            <span className="text-xl">→</span>
          </button>
        </div>

        {/* Bottom Row: Action Buttons */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={toggleFullscreen}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs
                     transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            title="Fullscreen (F)"
          >
            {isFullscreen ? '⛶' : '⛶'}
          </button>

          <button
            onClick={handleEvidenceToggle}
            className={`px-3 py-1.5 rounded text-xs
                     transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
                     ${evidenceEnabled ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-800 hover:bg-gray-700'}`}
            aria-label={evidenceEnabled ? 'Hide evidence' : 'Show evidence'}
            title="Evidence Overlay (Alt+E)"
          >
            {evidenceEnabled ? '👁️' : '👁️‍🗨️'} Evidence
          </button>

          <button
            onClick={handleSnapshot}
            disabled={snapshotLoading}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50
                     rounded text-xs transition-colors
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Take snapshot"
            title="Snapshot (S)"
          >
            {snapshotLoading ? '⏳' : '📸'} Snapshot
          </button>

          <button
            onClick={() => setElapsedTime(0)}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs
                     transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Reset timer"
            title="Reset Timer (R)"
          >
            🔄 Reset
          </button>

          <button
            onClick={() => setShowHelp(true)}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs
                     transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Show help"
            title="Help (H)"
          >
            ❓ Help
          </button>

          <button
            onClick={onExit}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-xs
                     transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
            aria-label="Exit boardroom mode"
            title="Exit (Esc)"
          >
            ✕ Exit
          </button>
        </div>
      </div>

      {/* Help Overlay */}
      {showHelp && (
        <div
          className="fixed inset-0 z-[60] bg-black bg-opacity-80 flex items-center justify-center"
          onClick={() => setShowHelp(false)}
          role="dialog"
          aria-labelledby="help-title"
          aria-modal="true"
        >
          <div
            className="bg-gray-900 rounded-lg shadow-2xl p-8 max-w-2xl w-full mx-4 border border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="help-title" className="text-2xl font-bold mb-6 text-white">
              Keyboard Shortcuts
            </h2>

            <div className="grid grid-cols-2 gap-4 text-sm mb-6">
              <ShortcutRow keys={['Space', '→']} description="Next slide" />
              <ShortcutRow keys={['←']} description="Previous slide" />
              <ShortcutRow keys={['Home']} description="First slide" />
              <ShortcutRow keys={['End']} description="Last slide" />
              <ShortcutRow keys={['1-9']} description="Jump to slide" />
              <ShortcutRow keys={['P', 'B']} description="Pause/Resume" />
              <ShortcutRow keys={['F', 'F11']} description="Toggle fullscreen" />
              <ShortcutRow keys={['Alt+E']} description="Toggle evidence" />
              <ShortcutRow keys={['S']} description="Take snapshot" />
              <ShortcutRow keys={['R']} description="Reset timer" />
              <ShortcutRow keys={['H', '?']} description="Show this help" />
              <ShortcutRow keys={['Esc']} description="Exit" />
            </div>

            <div className="text-center">
              <button
                onClick={() => setShowHelp(false)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg
                         transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface ShortcutRowProps {
  keys: string[];
  description: string;
}

function ShortcutRow({ keys, description }: ShortcutRowProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1">
        {keys.map((key, index) => (
          <kbd
            key={index}
            className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs font-mono text-gray-300"
          >
            {key}
          </kbd>
        ))}
      </div>
      <span className="text-gray-400">{description}</span>
=======
 * Presenter Controls - Phase H3-A
 *
 * Control panel for boardroom presentation mode.
 * Provides navigation, evidence toggle, and export functions.
 */

import { useState } from 'react';

interface PresenterControlsProps {
  currentView: 'dashboard' | 'trends' | 'sroi' | 'vis';
  onViewChange: (view: 'dashboard' | 'trends' | 'sroi' | 'vis') => void;
  onToggleEvidence: () => void;
  showEvidence: boolean;
  canExport?: boolean;
  companyId: string;
}

export function PresenterControls({
  currentView,
  onViewChange,
  onToggleEvidence,
  showEvidence,
  canExport = false,
  companyId,
}: PresenterControlsProps) {
  const [isExporting, setIsExporting] = useState(false);

  const views = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: '📊' },
    { id: 'trends' as const, label: 'Trends', icon: '📈' },
    { id: 'sroi' as const, label: 'SROI', icon: '💰' },
    { id: 'vis' as const, label: 'VIS', icon: '⭐' },
  ];

  const handleExportPDF = async () => {
    setIsExporting(true);

    try {
      const response = await fetch(`/api/cockpit/${companyId}/export-boardroom-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          view: currentView,
          includeEvidence: showEvidence,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `boardroom-${currentView}-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        console.error('PDF export failed:', await response.text());
        alert('Failed to export PDF. Please try again.');
      }
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="presenter-controls">
      {/* View Navigation */}
      <div className="view-nav">
        {views.map((view) => (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className={`view-button ${currentView === view.id ? 'active' : ''}`}
            aria-label={`Switch to ${view.label} view`}
            aria-current={currentView === view.id ? 'page' : undefined}
          >
            <span className="view-icon" aria-hidden="true">{view.icon}</span>
            <span className="view-label">{view.label}</span>
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        {/* Evidence Overlay Toggle */}
        <button
          onClick={onToggleEvidence}
          className={`action-button ${showEvidence ? 'active' : ''}`}
          aria-label={showEvidence ? 'Hide Evidence' : 'Show Evidence'}
          aria-pressed={showEvidence}
          title="Toggle evidence overlay (E)"
        >
          <svg
            className="button-icon"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="button-label">Evidence</span>
        </button>

        {/* Export PDF */}
        {canExport && (
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="action-button export-button"
            aria-label="Export as PDF"
            title="Export current view as PDF"
          >
            {isExporting ? (
              <>
                <div className="button-spinner" />
                <span className="button-label">Exporting...</span>
              </>
            ) : (
              <>
                <svg
                  className="button-icon"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="button-label">Export PDF</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="shortcuts-hint">
        <span className="shortcut-item">← → Navigate</span>
        <span className="shortcut-divider">•</span>
        <span className="shortcut-item">E Evidence</span>
        <span className="shortcut-divider">•</span>
        <span className="shortcut-item">R Refresh</span>
        <span className="shortcut-divider">•</span>
        <span className="shortcut-item">Esc Exit</span>
      </div>

      <style>{`
        .presenter-controls {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 16px 24px;
          background: rgba(17, 24, 39, 0.95);
          backdrop-filter: blur(12px);
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          z-index: 50;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .view-nav {
          display: flex;
          gap: 8px;
        }

        .view-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid transparent;
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .view-button:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          transform: translateY(-2px);
        }

        .view-button:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
        }

        .view-button.active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .view-icon {
          font-size: 18px;
          line-height: 1;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
          padding-left: 24px;
          border-left: 1px solid rgba(255, 255, 255, 0.1);
        }

        .action-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid transparent;
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .action-button:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          transform: translateY(-2px);
        }

        .action-button:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
        }

        .action-button.active {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
          border-color: #10b981;
        }

        .action-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .button-icon {
          width: 18px;
          height: 18px;
        }

        .button-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .shortcuts-hint {
          display: flex;
          align-items: center;
          gap: 8px;
          padding-left: 24px;
          border-left: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
        }

        .shortcut-item {
          font-family: 'Courier New', monospace;
        }

        .shortcut-divider {
          color: rgba(255, 255, 255, 0.3);
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 1024px) {
          .presenter-controls {
            flex-direction: column;
            gap: 16px;
            bottom: 16px;
            padding: 12px 16px;
          }

          .action-buttons,
          .shortcuts-hint {
            padding-left: 0;
            border-left: none;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            padding-top: 12px;
          }

          .shortcuts-hint {
            font-size: 10px;
          }
        }
      `}</style>
>>>>>>> origin/claude/cockpit-ga-plus-phase-h3-01L3aeNnzMnE4UBTwbp9tJXq
    </div>
  );
}
