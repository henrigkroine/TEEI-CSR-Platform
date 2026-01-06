/**
 * PWA Install Prompt Component
 *
 * Features:
 * - Detect PWA installability
 * - Show install banner with dismiss
 * - Handle install event
 * - Track installation status
 * - Platform-specific messaging (iOS vs Android/Desktop)
 */

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallPromptProps {
  className?: string;
  onInstall?: () => void;
  onDismiss?: () => void;
  autoShow?: boolean;
  showDelay?: number;
}

export default function InstallPrompt({
  className = '',
  onInstall,
  onDismiss,
  autoShow = true,
  showDelay = 3000,
}: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);

    if (standalone) {
      setIsInstalled(true);
      return;
    }

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if already dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < sevenDays) {
        return;
      }
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);

      if (autoShow) {
        setTimeout(() => {
          setIsVisible(true);
        }, showDelay);
      } else {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      setDeferredPrompt(null);
      console.log('[PWA] App installed');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // For iOS, show manual install instructions if not in standalone
    if (iOS && !standalone) {
      if (autoShow) {
        setTimeout(() => {
          setIsVisible(true);
        }, showDelay);
      } else {
        setIsVisible(true);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [autoShow, showDelay]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Show install prompt
    await deferredPrompt.prompt();

    // Wait for user choice
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('[PWA] User accepted install');
      setIsInstalled(true);
      if (onInstall) {
        onInstall();
      }
    } else {
      console.log('[PWA] User dismissed install');
    }

    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    if (onDismiss) {
      onDismiss();
    }
  };

  const handleNeverShow = () => {
    setIsVisible(false);
    // Set far future date (essentially permanent)
    localStorage.setItem('pwa-install-dismissed', (Date.now() + 365 * 24 * 60 * 60 * 1000).toString());
    if (onDismiss) {
      onDismiss();
    }
  };

  if (!isVisible || isInstalled || isStandalone) {
    return null;
  }

  return (
    <div className={`install-prompt ${className}`}>
      <div className="install-prompt-content">
        <div className="install-prompt-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m0 0l-4-4m4 4l4-4M3 16v2a2 2 0 002 2h14a2 2 0 002-2v-2"
            />
          </svg>
        </div>

        <div className="install-prompt-text">
          <h3>Install TEEI Cockpit</h3>
          {isIOS ? (
            <p>
              Tap the Share button{' '}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ display: 'inline', verticalAlign: 'middle' }}>
                <path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z"/>
              </svg>
              {' '}and choose "Add to Home Screen"
            </p>
          ) : (
            <p>
              Install the app for offline access, faster performance, and a native experience.
            </p>
          )}
        </div>

        <div className="install-prompt-actions">
          {!isIOS && deferredPrompt && (
            <button className="install-button" onClick={handleInstallClick}>
              Install
            </button>
          )}
          <button className="dismiss-button" onClick={handleDismiss}>
            Later
          </button>
          <button className="never-button" onClick={handleNeverShow} title="Don't show again">
            ✕
          </button>
        </div>
      </div>

      <style jsx>{`
        .install-prompt {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          max-width: 600px;
          width: calc(100% - 40px);
          z-index: 1000;
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from {
            transform: translateX(-50%) translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }

        .install-prompt-content {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }

        .install-prompt-icon {
          flex-shrink: 0;
          width: 48px;
          height: 48px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .install-prompt-text {
          flex: 1;
          min-width: 0;
        }

        .install-prompt-text h3 {
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 4px 0;
        }

        .install-prompt-text p {
          font-size: 14px;
          margin: 0;
          opacity: 0.95;
          line-height: 1.4;
        }

        .install-prompt-actions {
          flex-shrink: 0;
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .install-button {
          background: white;
          color: #667eea;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .install-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .dismiss-button {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .dismiss-button:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .never-button {
          background: transparent;
          color: white;
          border: none;
          padding: 8px;
          font-size: 18px;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .never-button:hover {
          opacity: 1;
        }

        @media (max-width: 768px) {
          .install-prompt {
            bottom: 10px;
            width: calc(100% - 20px);
          }

          .install-prompt-content {
            flex-direction: column;
            align-items: flex-start;
            padding: 16px;
          }

          .install-prompt-actions {
            width: 100%;
            justify-content: flex-end;
          }

          .install-prompt-text h3 {
            font-size: 16px;
          }

          .install-prompt-text p {
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Utility hook for programmatic install prompt control
 */
export function useInstallPrompt() {
  const [canInstall, setCanInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const promptInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    setDeferredPrompt(null);
    setCanInstall(false);

    return outcome === 'accepted';
  };

  return {
    canInstall,
    promptInstall,
  };
}
