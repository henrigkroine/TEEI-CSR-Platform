/**
 * Schedules List Component
 *
 * Displays and manages report schedules
 */

import { useState, useEffect } from 'react';
import { ScheduleModal } from './ScheduleModal';
import type { ReportSchedule } from '../../types/schedules';

interface SchedulesListProps {
  companyId: string;
}

export function SchedulesList({ companyId }: SchedulesListProps) {
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ReportSchedule | undefined>();
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);

  const fetchSchedules = async () => {
    setLoading(true);
    setError(null);

    try {
      const url = `/api/companies/${companyId}/schedules${
        filterActive !== undefined ? `?active=${filterActive}` : ''
      }`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch schedules');
      }

      const data = await response.json();
      setSchedules(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [companyId, filterActive]);

  const handleDelete = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) {
      return;
    }

    try {
      const response = await fetch(`/api/companies/${companyId}/schedules/${scheduleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete schedule');
      }

      fetchSchedules();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleTrigger = async (scheduleId: string) => {
    try {
      const response = await fetch(
        `/api/companies/${companyId}/schedules/${scheduleId}/execute`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to trigger execution');
      }

      alert('Report generation triggered successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Trigger failed');
    }
  };

  const handleEdit = (schedule: ReportSchedule) => {
    setEditingSchedule(schedule);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingSchedule(undefined);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingSchedule(undefined);
  };

  const handleModalSuccess = () => {
    fetchSchedules();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
        Error: {error}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Scheduled Reports</h2>
          <p className="text-gray-600">Automate report generation and delivery</p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          Create Schedule
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilterActive(undefined)}
          className={`px-3 py-1 rounded-md transition ${
            filterActive === undefined
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilterActive(true)}
          className={`px-3 py-1 rounded-md transition ${
            filterActive === true
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Active
        </button>
        <button
          onClick={() => setFilterActive(false)}
          className={`px-3 py-1 rounded-md transition ${
            filterActive === false
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Inactive
        </button>
      </div>

      {/* Schedules Table */}
      {schedules.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-gray-600 mb-4">No schedules found</p>
          <button
            onClick={handleCreate}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Create your first schedule
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Schedule
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Frequency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Next Run
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stats
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {schedules.map((schedule) => (
                <tr key={schedule.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{schedule.schedule_name}</div>
                      {schedule.description && (
                        <div className="text-sm text-gray-500">{schedule.description}</div>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        {schedule.recipients.length} recipient(s)
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div>{schedule.cron_expression}</div>
                    <div className="text-xs text-gray-500">{schedule.timezone}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {schedule.next_run_at
                      ? new Date(schedule.next_run_at).toLocaleString()
                      : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        schedule.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {schedule.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="text-gray-900">
                      {schedule.total_executions || 0} runs
                    </div>
                    <div className="text-xs text-gray-500">
                      {schedule.successful_executions || 0} success /{' '}
                      {schedule.failed_executions || 0} failed
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleTrigger(schedule.id)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Run now"
                      >
                        Run
                      </button>
                      <button
                        onClick={() => handleEdit(schedule)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(schedule.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <ScheduleModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        companyId={companyId}
        schedule={editingSchedule}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}
