/**
 * Welcome Flow Component
 *
 * Multi-step onboarding wizard for first-time users.
 * Guides users through key features and initial setup.
 */

import React, { useState, useEffect } from 'react';
import { THEME_PRESETS, applyThemePreset, type ThemePreset } from '../../lib/themes/presets';

interface WelcomeFlowProps {
  companyId: string;
  companyName: string;
  userName: string;
  userRole: string;
  onComplete: () => void;
  onSkip: () => void;
}

type Step = 'welcome' | 'theme' | 'features' | 'checklist';

export const WelcomeFlow: React.FC<WelcomeFlowProps> = ({
  companyId,
  companyName,
  userName,
  userRole,
  onComplete,
  onSkip,
}) => {
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [selectedTheme, setSelectedTheme] = useState<ThemePreset | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const steps: Step[] = ['welcome', 'theme', 'features', 'checklist'];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const canEditTheme = ['company_admin', 'system_admin'].includes(userRole);

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  };

  const handleComplete = () => {
    if (dontShowAgain) {
      localStorage.setItem(`welcome-flow-completed-${companyId}`, 'true');
    }
    onComplete();
  };

  const handleSkipFlow = () => {
    if (dontShowAgain) {
      localStorage.setItem(`welcome-flow-completed-${companyId}`, 'true');
    }
    onSkip();
  };

  const handleThemeSelect = async (preset: ThemePreset) => {
    setSelectedTheme(preset);
    applyThemePreset(preset);

    if (canEditTheme) {
      try {
        await fetch(`/api/companies/${companyId}/settings`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            branding: {
              theme_preset: preset.id,
              primary_color: preset.colors.primary,
              secondary_color: preset.colors.secondary,
              accent_color: preset.colors.accent,
            },
          }),
        });
      } catch (error) {
        console.error('Failed to save theme:', error);
      }
    }
  };

  return (
    <div className="welcome-flow-overlay fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div
        className="welcome-flow-container bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        role="dialog"
        aria-labelledby="welcome-title"
        aria-modal="true"
      >
        {/* Progress Bar */}
        <div className="progress-bar-container bg-gray-100 h-2">
          <div
            className="progress-bar bg-blue-600 h-full transition-all duration-300"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>

        {/* Content */}
        <div className="welcome-content flex-1 overflow-y-auto p-8">
          {currentStep === 'welcome' && (
            <div className="step-welcome">
              <h1 id="welcome-title" className="text-3xl font-bold mb-4">
                Welcome to TEEI CSR Platform, {userName}!
              </h1>
              <p className="text-lg text-gray-700 mb-6">
                We're excited to have <strong>{companyName}</strong> on board.
              </p>
              <div className="welcome-info space-y-4 mb-6">
                <div className="info-card bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Track Your Impact</h3>
                  <p className="text-blue-800 text-sm">
                    Measure the social return on investment (SROI) of your CSR programs and
                    volunteer initiatives.
                  </p>
                </div>
                <div className="info-card bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-2">
                    Engage Your Volunteers
                  </h3>
                  <p className="text-green-800 text-sm">
                    Track volunteer impact scores (VIS) and recognize top contributors with
                    data-driven insights.
                  </p>
                </div>
                <div className="info-card bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 mb-2">
                    Evidence-Based Reporting
                  </h3>
                  <p className="text-purple-800 text-sm">
                    Collect qualitative feedback and transform it into quantitative evidence
                    (Q2Q) for compelling reports.
                  </p>
                </div>
              </div>
              <p className="text-gray-600 text-sm">
                This quick tour will help you get started in just a few minutes.
              </p>
            </div>
          )}

          {currentStep === 'theme' && (
            <div className="step-theme">
              <h2 className="text-2xl font-bold mb-4">Choose Your Theme</h2>
              <p className="text-gray-700 mb-6">
                Select a color scheme that matches your brand. All themes meet WCAG AA
                accessibility standards.
                {!canEditTheme && (
                  <span className="block mt-2 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2">
                    Note: You need admin permissions to save theme changes.
                  </span>
                )}
              </p>
              <div className="theme-grid grid grid-cols-1 md:grid-cols-2 gap-4">
                {THEME_PRESETS.slice(0, 4).map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleThemeSelect(preset)}
                    className={`theme-option text-left p-4 border-2 rounded-lg transition-all ${
                      selectedTheme?.id === preset.id
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow'
                    }`}
                    aria-pressed={selectedTheme?.id === preset.id}
                  >
                    <h3 className="font-semibold mb-2">{preset.name}</h3>
                    <p className="text-sm text-gray-600 mb-3">{preset.description}</p>
                    <div className="flex gap-2">
                      <div
                        className="w-8 h-8 rounded border"
                        style={{ backgroundColor: preset.colors.primary }}
                        aria-label={`Primary color: ${preset.colors.primary}`}
                      />
                      <div
                        className="w-8 h-8 rounded border"
                        style={{ backgroundColor: preset.colors.secondary }}
                        aria-label={`Secondary color: ${preset.colors.secondary}`}
                      />
                      <div
                        className="w-8 h-8 rounded border"
                        style={{ backgroundColor: preset.colors.accent }}
                        aria-label={`Accent color: ${preset.colors.accent}`}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 'features' && (
            <div className="step-features">
              <h2 className="text-2xl font-bold mb-4">Key Features Tour</h2>
              <p className="text-gray-700 mb-6">
                Here's a quick overview of what you can do with the Corporate Cockpit.
              </p>
              <div className="features-list space-y-4">
                <div className="feature-item flex gap-4">
                  <div className="feature-icon bg-blue-100 text-blue-600 rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Dashboard Widgets</h3>
                    <p className="text-sm text-gray-600">
                      Real-time KPI cards showing SROI, VIS scores, program participation, and
                      impact metrics.
                    </p>
                  </div>
                </div>
                <div className="feature-item flex gap-4">
                  <div className="feature-icon bg-green-100 text-green-600 rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Report Generation</h3>
                    <p className="text-sm text-gray-600">
                      Create professional PDF and PowerPoint reports with watermarks, evidence
                      IDs, and executive summaries.
                    </p>
                  </div>
                </div>
                <div className="feature-item flex gap-4">
                  <div className="feature-icon bg-purple-100 text-purple-600 rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Evidence Tracking</h3>
                    <p className="text-sm text-gray-600">
                      View Q2Q evidence with lineage trails, confidence scores, and sentiment
                      analysis for every metric.
                    </p>
                  </div>
                </div>
                <div className="feature-item flex gap-4">
                  <div className="feature-icon bg-orange-100 text-orange-600 rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Team Management</h3>
                    <p className="text-sm text-gray-600">
                      Invite team members, assign roles, and manage permissions with
                      tenant-scoped access control.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'checklist' && (
            <div className="step-checklist">
              <h2 className="text-2xl font-bold mb-4">Getting Started Checklist</h2>
              <p className="text-gray-700 mb-6">
                Here are some recommended next steps to get the most out of the platform:
              </p>
              <div className="checklist space-y-3">
                <div className="checklist-item bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      disabled
                    />
                    <div>
                      <strong className="block">Upload company logo</strong>
                      <span className="text-sm text-gray-600">
                        Add your branding to reports and dashboards
                      </span>
                    </div>
                  </label>
                </div>
                <div className="checklist-item bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      disabled
                    />
                    <div>
                      <strong className="block">Configure SSO</strong>
                      <span className="text-sm text-gray-600">
                        Set up single sign-on for your organization
                      </span>
                    </div>
                  </label>
                </div>
                <div className="checklist-item bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      disabled
                    />
                    <div>
                      <strong className="block">Invite team members</strong>
                      <span className="text-sm text-gray-600">
                        Add colleagues and assign roles
                      </span>
                    </div>
                  </label>
                </div>
                <div className="checklist-item bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      disabled
                    />
                    <div>
                      <strong className="block">Create first program</strong>
                      <span className="text-sm text-gray-600">
                        Set up a buddy, kintell, or upskilling program
                      </span>
                    </div>
                  </label>
                </div>
                <div className="checklist-item bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      disabled
                    />
                    <div>
                      <strong className="block">View first report</strong>
                      <span className="text-sm text-gray-600">
                        Explore SROI and VIS dashboards
                      </span>
                    </div>
                  </label>
                </div>
              </div>
              <p className="mt-6 text-sm text-gray-600">
                Don't worry - you can access this checklist anytime from your dashboard.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="welcome-footer border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span>Don't show this again</span>
            </label>
            <button
              onClick={handleSkipFlow}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Skip tour
            </button>
          </div>
          <div className="flex gap-3 justify-between">
            <button
              onClick={handleBack}
              disabled={currentStepIndex === 0}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              {currentStepIndex === steps.length - 1 ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>

      <style>
        {`
          .welcome-flow-overlay {
            animation: fadeIn 0.3s ease-in-out;
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          .welcome-flow-container {
            animation: slideUp 0.4s ease-out;
          }

          @keyframes slideUp {
            from {
              transform: translateY(20px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .welcome-flow-overlay,
            .welcome-flow-container {
              animation: none;
            }
          }
        `}
      </style>
    </div>
  );
};

export default WelcomeFlow;
