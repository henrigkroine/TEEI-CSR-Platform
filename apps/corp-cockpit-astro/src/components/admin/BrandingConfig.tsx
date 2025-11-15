/**
 * Branding Configuration Component
 *
 * Comprehensive tenant branding UI:
 * - Logo upload with validation
 * - Primary/secondary color pickers with WCAG AA contrast validation
 * - Custom subdomain configuration
 * - Email from-name and from-address
 * - Real-time preview panel
 * - SMTP domain setup integration
 */

import React, { useState, useEffect } from 'react';
import { applyTheme, type TenantTheme } from '../../styles/themes';

interface BrandingConfigProps {
  companyId: string;
  onSave?: (config: BrandingConfiguration) => void;
}

/**
 * Complete branding configuration
 */
interface BrandingConfiguration {
  // Visual branding
  logoUrl?: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    textOnPrimary: string;
    textOnSecondary: string;
    textOnAccent: string;
  };
  darkModeColors?: {
    primary: string;
    secondary: string;
    accent: string;
  };

  // Domain & subdomain
  customSubdomain?: string;
  customDomain?: string;

  // Email branding
  emailConfig: {
    fromName: string;
    fromEmail: string;
    replyToEmail?: string;
    replyToName?: string;
    supportEmail: string;
    websiteUrl: string;
  };

  // SMTP domain (if configured)
  smtpDomain?: {
    domain: string;
    verified: boolean;
    reputationScore: number;
  };
}

/**
 * Contrast validation result
 */
interface ContrastCheck {
  ratio: number;
  passes: boolean;
  level: 'AAA' | 'AA' | 'Fail';
}

export function BrandingConfig({ companyId, onSave }: BrandingConfigProps) {
  const [config, setConfig] = useState<BrandingConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'visual' | 'domain' | 'email'>('visual');

  // Visual branding state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [colors, setColors] = useState({
    primary: '#0066CC',
    secondary: '#1E40AF',
    accent: '#10B981',
    textOnPrimary: '#FFFFFF',
    textOnSecondary: '#FFFFFF',
    textOnAccent: '#FFFFFF',
    primaryDark: '#3B82F6',
    secondaryDark: '#60A5FA',
    accentDark: '#34D399',
  });

  // Domain state
  const [customSubdomain, setCustomSubdomain] = useState('');
  const [customDomain, setCustomDomain] = useState('');

  // Email state
  const [emailConfig, setEmailConfig] = useState({
    fromName: '',
    fromEmail: '',
    replyToEmail: '',
    replyToName: '',
    supportEmail: '',
    websiteUrl: '',
  });

  // SMTP domain state
  const [smtpDomain, setSmtpDomain] = useState<BrandingConfiguration['smtpDomain']>();
  const [showSmtpSetup, setShowSmtpSetup] = useState(false);

  // Contrast validation
  const [contrastWarnings, setContrastWarnings] = useState<string[]>([]);

  // Load configuration on mount
  useEffect(() => {
    fetchConfig();
  }, [companyId]);

  // Update logo preview when file changes
  useEffect(() => {
    if (logoFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(logoFile);
    }
  }, [logoFile]);

  // Validate contrast when colors change
  useEffect(() => {
    validateContrast();
  }, [colors]);

  /**
   * Fetch current branding configuration
   */
  async function fetchConfig() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/companies/${companyId}/branding`);
      if (!response.ok) {
        throw new Error('Failed to fetch branding configuration');
      }

      const data = await response.json();

      setConfig(data);
      setLogoPreview(data.logoUrl);
      setColors({
        primary: data.colors.primary,
        secondary: data.colors.secondary,
        accent: data.colors.accent,
        textOnPrimary: data.colors.textOnPrimary,
        textOnSecondary: data.colors.textOnSecondary,
        textOnAccent: data.colors.textOnAccent,
        primaryDark: data.darkModeColors?.primary || data.colors.primary,
        secondaryDark: data.darkModeColors?.secondary || data.colors.secondary,
        accentDark: data.darkModeColors?.accent || data.colors.accent,
      });
      setCustomSubdomain(data.customSubdomain || '');
      setCustomDomain(data.customDomain || '');
      setEmailConfig(data.emailConfig);
      setSmtpDomain(data.smtpDomain);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Save branding configuration
   */
  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const payload: any = {
        colors: {
          primary: colors.primary,
          secondary: colors.secondary,
          accent: colors.accent,
          textOnPrimary: colors.textOnPrimary,
          textOnSecondary: colors.textOnSecondary,
          textOnAccent: colors.textOnAccent,
        },
        darkModeColors: {
          primary: colors.primaryDark,
          secondary: colors.secondaryDark,
          accent: colors.accentDark,
        },
        customSubdomain,
        customDomain,
        emailConfig,
      };

      // Add logo if uploaded
      if (logoFile) {
        const base64 = await fileToBase64(logoFile);
        payload.logo = {
          data: base64,
          mimeType: logoFile.type,
          filename: logoFile.name,
        };
      }

      const response = await fetch(`/api/companies/${companyId}/branding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save branding');
      }

      const data = await response.json();

      const savedConfig: BrandingConfiguration = {
        logoUrl: data.logoUrl,
        colors: data.colors,
        darkModeColors: data.darkModeColors,
        customSubdomain: data.customSubdomain,
        customDomain: data.customDomain,
        emailConfig: data.emailConfig,
        smtpDomain: data.smtpDomain,
      };

      setConfig(savedConfig);
      onSave?.(savedConfig);

      alert('Branding configuration saved successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save branding');
    } finally {
      setSaving(false);
    }
  }

  /**
   * Handle logo upload
   */
  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setError('Logo must be PNG, JPG, or SVG format');
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo must be less than 2MB');
      return;
    }

    // Validate dimensions
    if (file.type !== 'image/svg+xml') {
      const img = new Image();
      img.onload = () => {
        if (img.width > 800 || img.height > 200) {
          setError('Logo dimensions should not exceed 800x200 pixels');
          return;
        }
        setLogoFile(file);
        setError(null);
      };
      img.src = URL.createObjectURL(file);
    } else {
      setLogoFile(file);
      setError(null);
    }
  }

  /**
   * Validate WCAG AA contrast
   */
  function validateContrast() {
    const warnings: string[] = [];

    // Check primary color contrast
    const primaryContrast = checkContrast(colors.primary, colors.textOnPrimary);
    if (!primaryContrast.passes) {
      warnings.push(
        `Primary color contrast ratio ${primaryContrast.ratio.toFixed(2)}:1 fails WCAG AA (needs 4.5:1)`
      );
    }

    // Check secondary color contrast
    const secondaryContrast = checkContrast(colors.secondary, colors.textOnSecondary);
    if (!secondaryContrast.passes) {
      warnings.push(
        `Secondary color contrast ratio ${secondaryContrast.ratio.toFixed(2)}:1 fails WCAG AA (needs 4.5:1)`
      );
    }

    // Check accent color contrast
    const accentContrast = checkContrast(colors.accent, colors.textOnAccent);
    if (!accentContrast.passes) {
      warnings.push(
        `Accent color contrast ratio ${accentContrast.ratio.toFixed(2)}:1 fails WCAG AA (needs 4.5:1)`
      );
    }

    setContrastWarnings(warnings);
  }

  /**
   * Check contrast between two colors
   */
  function checkContrast(bg: string, fg: string): ContrastCheck {
    const bgLum = getLuminance(bg);
    const fgLum = getLuminance(fg);

    const ratio =
      (Math.max(bgLum, fgLum) + 0.05) / (Math.min(bgLum, fgLum) + 0.05);

    return {
      ratio,
      passes: ratio >= 4.5,
      level: ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : 'Fail',
    };
  }

  /**
   * Calculate relative luminance
   */
  function getLuminance(color: string): number {
    const rgb = hexToRgb(color);
    const [r, g, b] = rgb.map((val) => {
      const s = val / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Convert hex to RGB
   */
  function hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16),
        ]
      : [0, 0, 0];
  }

  /**
   * Convert file to base64
   */
  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Validate subdomain format
   */
  function validateSubdomain(subdomain: string): boolean {
    const regex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
    return regex.test(subdomain);
  }

  /**
   * Handle subdomain change
   */
  function handleSubdomainChange(value: string) {
    setCustomSubdomain(value.toLowerCase());
    if (value && !validateSubdomain(value)) {
      setError('Invalid subdomain format. Use lowercase letters, numbers, and hyphens only.');
    } else {
      setError(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-lg">Loading branding configuration...</div>
      </div>
    );
  }

  return (
    <div className="branding-config mx-auto max-w-6xl p-6">
      <h2 className="mb-6 text-3xl font-bold">Branding Configuration</h2>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800">
          <strong>Error:</strong> {error}
        </div>
      )}

      {contrastWarnings.length > 0 && (
        <div className="mb-4 rounded-md bg-yellow-50 p-4">
          <strong className="text-yellow-800">WCAG AA Contrast Warnings:</strong>
          <ul className="mt-2 list-inside list-disc text-sm text-yellow-700">
            {contrastWarnings.map((warning, idx) => (
              <li key={idx}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('visual')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'visual'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Visual Branding
        </button>
        <button
          onClick={() => setActiveTab('domain')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'domain'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Domain & Subdomain
        </button>
        <button
          onClick={() => setActiveTab('email')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'email'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Email Configuration
        </button>
      </div>

      {/* Visual Branding Tab */}
      {activeTab === 'visual' && (
        <div className="space-y-8">
          {/* Logo Upload */}
          <section className="rounded-lg border border-border bg-background p-6">
            <h3 className="mb-4 text-xl font-semibold">Company Logo</h3>
            <div className="flex items-start gap-6">
              <div className="flex-1">
                <label htmlFor="logo-upload" className="btn-secondary cursor-pointer">
                  {logoFile ? 'Change Logo' : 'Upload Logo'}
                </label>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <p className="mt-2 text-sm text-muted-foreground">
                  PNG, JPG, or SVG. Max 2MB. Recommended: 400x120 pixels
                </p>
              </div>
              {logoPreview && (
                <div className="h-32 w-64 rounded border border-border bg-muted p-4">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="h-full w-full object-contain"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Color Pickers */}
          <section className="rounded-lg border border-border bg-background p-6">
            <h3 className="mb-4 text-xl font-semibold">Brand Colors</h3>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {/* Light Mode Colors */}
              <div>
                <h4 className="mb-4 text-lg font-medium">Light Mode</h4>
                <div className="space-y-4">
                  <ColorInput
                    label="Primary Color"
                    value={colors.primary}
                    onChange={(v) => setColors({ ...colors, primary: v })}
                  />
                  <ColorInput
                    label="Secondary Color"
                    value={colors.secondary}
                    onChange={(v) => setColors({ ...colors, secondary: v })}
                  />
                  <ColorInput
                    label="Accent Color"
                    value={colors.accent}
                    onChange={(v) => setColors({ ...colors, accent: v })}
                  />
                </div>
              </div>

              {/* Dark Mode Colors */}
              <div>
                <h4 className="mb-4 text-lg font-medium">Dark Mode (Optional)</h4>
                <div className="space-y-4">
                  <ColorInput
                    label="Primary Color (Dark)"
                    value={colors.primaryDark}
                    onChange={(v) => setColors({ ...colors, primaryDark: v })}
                  />
                  <ColorInput
                    label="Secondary Color (Dark)"
                    value={colors.secondaryDark}
                    onChange={(v) => setColors({ ...colors, secondaryDark: v })}
                  />
                  <ColorInput
                    label="Accent Color (Dark)"
                    value={colors.accentDark}
                    onChange={(v) => setColors({ ...colors, accentDark: v })}
                  />
                </div>
              </div>
            </div>

            {/* Text Colors */}
            <div className="mt-8 border-t border-border pt-6">
              <h4 className="mb-4 text-lg font-medium">Text Colors (for contrast)</h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <ColorInput
                  label="Text on Primary"
                  value={colors.textOnPrimary}
                  onChange={(v) => setColors({ ...colors, textOnPrimary: v })}
                />
                <ColorInput
                  label="Text on Secondary"
                  value={colors.textOnSecondary}
                  onChange={(v) => setColors({ ...colors, textOnSecondary: v })}
                />
                <ColorInput
                  label="Text on Accent"
                  value={colors.textOnAccent}
                  onChange={(v) => setColors({ ...colors, textOnAccent: v })}
                />
              </div>
            </div>
          </section>

          {/* Preview Panel */}
          <section className="rounded-lg border border-border bg-background p-6">
            <h3 className="mb-4 text-xl font-semibold">Preview</h3>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <button
                  style={{
                    backgroundColor: colors.primary,
                    color: colors.textOnPrimary,
                  }}
                  className="rounded px-6 py-3 font-medium"
                >
                  Primary Button
                </button>
                <button
                  style={{
                    backgroundColor: colors.secondary,
                    color: colors.textOnSecondary,
                  }}
                  className="rounded px-6 py-3 font-medium"
                >
                  Secondary Button
                </button>
                <button
                  style={{
                    backgroundColor: colors.accent,
                    color: colors.textOnAccent,
                  }}
                  className="rounded px-6 py-3 font-medium"
                >
                  Accent Button
                </button>
              </div>

              {logoPreview && (
                <div className="mt-6 rounded border border-border p-4">
                  <img
                    src={logoPreview}
                    alt="Logo in context"
                    className="h-16 object-contain"
                  />
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Domain & Subdomain Tab */}
      {activeTab === 'domain' && (
        <div className="space-y-8">
          <section className="rounded-lg border border-border bg-background p-6">
            <h3 className="mb-4 text-xl font-semibold">Custom Subdomain</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Configure a custom subdomain for your branded portal (e.g., yourcompany.teei-platform.com)
            </p>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Subdomain</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customSubdomain}
                    onChange={(e) => handleSubdomainChange(e.target.value)}
                    placeholder="yourcompany"
                    className="flex-1 rounded border border-border px-3 py-2"
                  />
                  <span className="text-muted-foreground">.teei-platform.com</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Lowercase letters, numbers, and hyphens only. Cannot start or end with hyphen.
                </p>
              </div>

              {customSubdomain && validateSubdomain(customSubdomain) && (
                <div className="rounded bg-green-50 p-4 text-sm text-green-800">
                  Your portal will be accessible at:{' '}
                  <strong>https://{customSubdomain}.teei-platform.com</strong>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-background p-6">
            <h3 className="mb-4 text-xl font-semibold">Custom Domain (Enterprise)</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Use your own domain (e.g., csr.yourcompany.com). Requires DNS configuration.
            </p>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Custom Domain</label>
                <input
                  type="text"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="csr.yourcompany.com"
                  className="w-full rounded border border-border px-3 py-2"
                />
              </div>

              {customDomain && (
                <div className="rounded bg-blue-50 p-4 text-sm">
                  <p className="font-medium text-blue-900">DNS Configuration Required</p>
                  <p className="mt-2 text-blue-800">
                    Add the following CNAME record to your DNS:
                  </p>
                  <pre className="mt-2 rounded bg-blue-100 p-2 text-xs">
                    {customDomain} CNAME custom.teei-platform.com
                  </pre>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Email Configuration Tab */}
      {activeTab === 'email' && (
        <div className="space-y-8">
          <section className="rounded-lg border border-border bg-background p-6">
            <h3 className="mb-4 text-xl font-semibold">Email Sender Configuration</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">From Name</label>
                  <input
                    type="text"
                    value={emailConfig.fromName}
                    onChange={(e) =>
                      setEmailConfig({ ...emailConfig, fromName: e.target.value })
                    }
                    placeholder="Your Company"
                    className="w-full rounded border border-border px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">From Email</label>
                  <input
                    type="email"
                    value={emailConfig.fromEmail}
                    onChange={(e) =>
                      setEmailConfig({ ...emailConfig, fromEmail: e.target.value })
                    }
                    placeholder="noreply@yourcompany.com"
                    className="w-full rounded border border-border px-3 py-2"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Must use a verified SMTP domain
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Reply-To Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={emailConfig.replyToName}
                    onChange={(e) =>
                      setEmailConfig({ ...emailConfig, replyToName: e.target.value })
                    }
                    placeholder="Support Team"
                    className="w-full rounded border border-border px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Reply-To Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={emailConfig.replyToEmail}
                    onChange={(e) =>
                      setEmailConfig({ ...emailConfig, replyToEmail: e.target.value })
                    }
                    placeholder="support@yourcompany.com"
                    className="w-full rounded border border-border px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Support Email</label>
                  <input
                    type="email"
                    value={emailConfig.supportEmail}
                    onChange={(e) =>
                      setEmailConfig({ ...emailConfig, supportEmail: e.target.value })
                    }
                    placeholder="support@yourcompany.com"
                    className="w-full rounded border border-border px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Website URL</label>
                  <input
                    type="url"
                    value={emailConfig.websiteUrl}
                    onChange={(e) =>
                      setEmailConfig({ ...emailConfig, websiteUrl: e.target.value })
                    }
                    placeholder="https://www.yourcompany.com"
                    className="w-full rounded border border-border px-3 py-2"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* SMTP Domain Status */}
          <section className="rounded-lg border border-border bg-background p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">SMTP Domain</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Configure custom email domain for authentication and branding
                </p>
              </div>
              {!smtpDomain && (
                <button
                  onClick={() => setShowSmtpSetup(true)}
                  className="btn-primary"
                >
                  Setup SMTP Domain
                </button>
              )}
            </div>

            {smtpDomain && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded bg-muted p-3">
                  <div>
                    <div className="font-medium">{smtpDomain.domain}</div>
                    <div className="text-sm text-muted-foreground">
                      {smtpDomain.verified ? (
                        <span className="text-green-600">✓ Verified</span>
                      ) : (
                        <span className="text-yellow-600">⚠ Pending Verification</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Reputation Score</div>
                    <div className="text-lg font-bold">
                      {smtpDomain.reputationScore}/100
                    </div>
                  </div>
                </div>

                <a
                  href={`/admin/smtp-domain/${smtpDomain.domain}`}
                  className="btn-secondary block text-center"
                >
                  Manage SMTP Domain
                </a>
              </div>
            )}

            {showSmtpSetup && !smtpDomain && (
              <div className="mt-4 rounded bg-blue-50 p-4">
                <p className="text-sm text-blue-900">
                  Setting up an SMTP domain requires DNS configuration. Visit the{' '}
                  <a href="/docs/smtp-setup" className="underline">
                    SMTP Setup Guide
                  </a>{' '}
                  for detailed instructions.
                </p>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 flex justify-end gap-4 border-t border-border pt-6">
        <button
          onClick={() => window.location.reload()}
          className="btn-secondary"
          disabled={saving}
        >
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}

/**
 * Color Input Component
 */
function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="min-w-[140px] text-sm font-medium">{label}</label>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-16 cursor-pointer rounded border border-border"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        pattern="^#[0-9A-Fa-f]{6}$"
        className="w-28 rounded border border-border px-3 py-2 font-mono text-sm"
      />
    </div>
  );
}
