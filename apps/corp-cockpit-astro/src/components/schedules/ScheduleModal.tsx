/**
 * Schedule Modal Component
 *
 * Modal for creating and editing scheduled report deliveries
 */

import { useState, useEffect } from 'react';
import type {
  ReportSchedule,
  CreateScheduleRequest,
  UpdateScheduleRequest,
} from '../../types/schedules';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  schedule?: ReportSchedule;
  onSuccess?: () => void;
}

const CRON_PRESETS = [
  { label: 'Daily at 9 AM', value: '0 9 * * *' },
  { label: 'Weekly on Monday at 9 AM', value: '0 9 * * 1' },
  { label: 'Monthly on 1st at 9 AM', value: '0 9 1 * *' },
  { label: 'Quarterly on 1st at 9 AM', value: '0 9 1 */3 *' },
  { label: 'Yearly on Jan 1st at 9 AM', value: '0 9 1 1 *' },
  { label: 'Custom', value: 'custom' },
];

const REPORT_TEMPLATES = [
  { id: 'executive-summary', name: 'Executive Summary', estimated_pages: 8 },
  { id: 'detailed-impact', name: 'Detailed Impact Report', estimated_pages: 35 },
  { id: 'stakeholder-briefing', name: 'Stakeholder Briefing', estimated_pages: 12 },
  { id: 'csrd-compliance', name: 'CSRD Compliance Report', estimated_pages: 45 },
];

const REPORT_FORMATS = [
  { value: 'pdf', label: 'PDF (Recommended)' },
  { value: 'html', label: 'HTML' },
  { value: 'csv', label: 'CSV (Data Only)' },
  { value: 'xlsx', label: 'Excel' },
];

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time' },
  { value: 'America/Chicago', label: 'Central Time' },
  { value: 'America/Denver', label: 'Mountain Time' },
  { value: 'America/Los_Angeles', label: 'Pacific Time' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Europe/Berlin', label: 'Berlin' },
  { value: 'Europe/Oslo', label: 'Oslo' },
];

export function ScheduleModal({
  isOpen,
  onClose,
  companyId,
  schedule,
  onSuccess,
}: ScheduleModalProps) {
  const isEditMode = !!schedule;

  // Form state
  const [scheduleName, setScheduleName] = useState('');
  const [description, setDescription] = useState('');
  const [templateId, setTemplateId] = useState('executive-summary');
  const [cronPreset, setCronPreset] = useState('0 9 1 * *'); // Monthly default
  const [cronExpression, setCronExpression] = useState('0 9 1 * *');
  const [timezone, setTimezone] = useState('UTC');
  const [format, setFormat] = useState<'pdf' | 'html' | 'csv' | 'xlsx'>('pdf');
  const [recipients, setRecipients] = useState<string[]>(['']);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [includeAttachment, setIncludeAttachment] = useState(true);
  const [isActive, setIsActive] = useState(true);

  // Report parameters
  const [reportPeriod, setReportPeriod] = useState('Q4-2024');
  const [includeSections] = useState(['cover', 'at-a-glance', 'sroi']);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeEvidence, setIncludeEvidence] = useState(false);
  const [includeLineage, setIncludeLineage] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCustomCron, setShowCustomCron] = useState(false);

  // Initialize form with schedule data when editing
  useEffect(() => {
    if (schedule) {
      setScheduleName(schedule.schedule_name);
      setDescription(schedule.description || '');
      setTemplateId(schedule.template_id);
      setCronExpression(schedule.cron_expression);
      setTimezone(schedule.timezone);
      setFormat(schedule.format);
      setRecipients(schedule.recipients);
      setEmailSubject(schedule.email_subject);
      setEmailBody(schedule.email_body || '');
      setIncludeAttachment(schedule.include_attachment);
      setIsActive(schedule.is_active);

      // Set cron preset or custom
      const preset = CRON_PRESETS.find((p) => p.value === schedule.cron_expression);
      if (preset) {
        setCronPreset(preset.value);
        setShowCustomCron(false);
      } else {
        setCronPreset('custom');
        setShowCustomCron(true);
      }

      // Set parameters
      if (schedule.parameters) {
        setReportPeriod(schedule.parameters.period);
        setIncludeCharts(schedule.parameters.include_charts);
        setIncludeEvidence(schedule.parameters.include_evidence);
        setIncludeLineage(schedule.parameters.include_lineage);
      }
    }
  }, [schedule]);

  const handleCronPresetChange = (value: string) => {
    setCronPreset(value);
    if (value === 'custom') {
      setShowCustomCron(true);
    } else {
      setShowCustomCron(false);
      setCronExpression(value);
    }
  };

  const handleAddRecipient = () => {
    setRecipients([...recipients, '']);
  };

  const handleRemoveRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  const handleRecipientChange = (index: number, value: string) => {
    const updated = [...recipients];
    updated[index] = value;
    setRecipients(updated);
  };

  const validateForm = (): boolean => {
    if (!scheduleName.trim()) {
      setError('Schedule name is required');
      return false;
    }

    if (!cronExpression.trim()) {
      setError('Schedule frequency is required');
      return false;
    }

    const validRecipients = recipients.filter((email) => email.trim() !== '');
    if (validRecipients.length === 0) {
      setError('At least one recipient email is required');
      return false;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = validRecipients.filter((email) => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      setError(`Invalid email addresses: ${invalidEmails.join(', ')}`);
      return false;
    }

    if (!emailSubject.trim()) {
      setError('Email subject is required');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const validRecipients = recipients.filter((email) => email.trim() !== '');

      const requestData = {
        schedule_name: scheduleName,
        description: description || undefined,
        template_id: templateId,
        cron_expression: cronExpression,
        timezone,
        format,
        parameters: {
          period: reportPeriod,
          sections: includeSections,
          include_charts: includeCharts,
          include_evidence: includeEvidence,
          include_lineage: includeLineage,
        },
        recipients: validRecipients,
        email_subject: emailSubject,
        email_body: emailBody || undefined,
        include_attachment: includeAttachment,
        is_active: isActive,
      };

      const url = isEditMode
        ? `/api/companies/${companyId}/schedules/${schedule!.id}`
        : `/api/companies/${companyId}/schedules`;

      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save schedule');
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-2xl font-bold">
            {isEditMode ? 'Edit Schedule' : 'Create Schedule'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4 mb-6">
            <h3 className="text-lg font-semibold">Basic Information</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Schedule Name *
              </label>
              <input
                type="text"
                value={scheduleName}
                onChange={(e) => setScheduleName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Monthly Executive Report"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Optional description..."
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>
            </div>
          </div>

          {/* Report Configuration */}
          <div className="space-y-4 mb-6">
            <h3 className="text-lg font-semibold">Report Configuration</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Report Template *
                </label>
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {REPORT_TEMPLATES.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} (~{template.estimated_pages} pages)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Format *
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {REPORT_FORMATS.map((fmt) => (
                    <option key={fmt.value} value={fmt.value}>
                      {fmt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Report Period
              </label>
              <input
                type="text"
                value={reportPeriod}
                onChange={(e) => setReportPeriod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Q4-2024 or 2024"
              />
            </div>

            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeCharts}
                  onChange={(e) => setIncludeCharts(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Include Charts</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeEvidence}
                  onChange={(e) => setIncludeEvidence(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Include Evidence</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeLineage}
                  onChange={(e) => setIncludeLineage(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Include Lineage</span>
              </label>
            </div>
          </div>

          {/* Schedule Settings */}
          <div className="space-y-4 mb-6">
            <h3 className="text-lg font-semibold">Schedule Settings</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency *
                </label>
                <select
                  value={cronPreset}
                  onChange={(e) => handleCronPresetChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CRON_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {showCustomCron && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Cron Expression *
                </label>
                <input
                  type="text"
                  value={cronExpression}
                  onChange={(e) => setCronExpression(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0 9 * * * (minute hour day month weekday)"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Format: minute hour day month weekday. Example: "0 9 1 * *" = 9am on 1st of
                  every month
                </p>
              </div>
            )}
          </div>

          {/* Email Settings */}
          <div className="space-y-4 mb-6">
            <h3 className="text-lg font-semibold">Email Delivery</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recipients *
              </label>
              {recipients.map((recipient, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="email"
                    value={recipient}
                    onChange={(e) => handleRecipientChange(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="email@example.com"
                  />
                  {recipients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRecipient(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddRecipient}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                + Add Recipient
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Subject *
              </label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Scheduled Report: {reportTitle}"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Body (Optional)
              </label>
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Custom message to include in the email..."
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave empty to use the default email template
              </p>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeAttachment}
                  onChange={(e) => setIncludeAttachment(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  Attach report to email
                </span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-md transition disabled:bg-blue-300 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Saving...' : isEditMode ? 'Update Schedule' : 'Create Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
