import React, { useState, useEffect } from 'react';

/**
 * Board Pack Schedule
 */
interface BoardPackSchedule {
  id: string;
  name: string;
  description?: string;
  schedule: string; // cron expression
  timezone: string;
  recipients: string[];
  includeReports: string[];
  includeICS: boolean;
  includeWatermark: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Execution History Entry
 */
interface ExecutionHistory {
  id: string;
  scheduleId: string;
  executionTime: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  recipientCount: number;
  deliveredCount: number;
  failedCount: number;
  errorMessage?: string;
  duration?: number;
  createdAt: string;
}

/**
 * Scheduler Manager Component
 */
export default function SchedulerManager({ companyId }: { companyId: string }) {
  const [schedules, setSchedules] = useState<BoardPackSchedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<BoardPackSchedule | null>(null);
  const [executionHistory, setExecutionHistory] = useState<ExecutionHistory[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load schedules
  useEffect(() => {
    loadSchedules();
  }, [companyId]);

  // Load execution history when schedule is selected
  useEffect(() => {
    if (selectedSchedule) {
      loadExecutionHistory(selectedSchedule.id);
    }
  }, [selectedSchedule]);

  async function loadSchedules() {
    setLoading(true);
    try {
      // Mock data for now - would call API
      const mockSchedules: BoardPackSchedule[] = [
        {
          id: 'sched-001',
          name: 'Quarterly Board Pack',
          description: 'Automated quarterly board pack delivery',
          schedule: '0 9 1 */3 *',
          timezone: 'America/New_York',
          recipients: ['board@example.com', 'ceo@example.com'],
          includeReports: ['quarterly', 'investor', 'impact'],
          includeICS: true,
          includeWatermark: true,
          enabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      setSchedules(mockSchedules);
    } catch (error) {
      console.error('Failed to load schedules:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadExecutionHistory(scheduleId: string) {
    try {
      // Mock data for now - would call API
      const mockHistory: ExecutionHistory[] = [
        {
          id: 'exec-001',
          scheduleId,
          executionTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'completed',
          recipientCount: 2,
          deliveredCount: 2,
          failedCount: 0,
          duration: 3450,
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'exec-002',
          scheduleId,
          executionTime: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'completed',
          recipientCount: 2,
          deliveredCount: 2,
          failedCount: 0,
          duration: 2890,
          createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];
      setExecutionHistory(mockHistory);
    } catch (error) {
      console.error('Failed to load execution history:', error);
    }
  }

  function formatCronExpression(cron: string): string {
    // Simple cron description (would use cronstrue library in production)
    if (cron === '0 9 1 */3 *') return 'Quarterly on the 1st at 9:00 AM';
    if (cron === '0 9 1 * *') return 'Monthly on the 1st at 9:00 AM';
    if (cron === '0 9 * * 1') return 'Weekly on Mondays at 9:00 AM';
    return cron;
  }

  function getStatusBadge(status: ExecutionHistory['status']) {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${badges[status]}`}>
        {status.toUpperCase()}
      </span>
    );
  }

  if (loading) {
    return <div className="text-center py-8">Loading schedules...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Board Pack Scheduler</h2>
          <p className="mt-1 text-sm text-gray-600">
            Manage automated board pack delivery schedules
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          + New Schedule
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Schedules List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Active Schedules</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {schedules.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No schedules configured. Create your first schedule to get started.
              </div>
            ) : (
              schedules.map(schedule => (
                <div
                  key={schedule.id}
                  className={`px-6 py-4 cursor-pointer hover:bg-gray-50 transition ${
                    selectedSchedule?.id === schedule.id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedSchedule(schedule)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{schedule.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{schedule.description}</p>
                      <div className="mt-2 space-y-1">
                        <div className="text-xs text-gray-500">
                          📅 {formatCronExpression(schedule.schedule)}
                        </div>
                        <div className="text-xs text-gray-500">
                          🌍 {schedule.timezone}
                        </div>
                        <div className="text-xs text-gray-500">
                          📧 {schedule.recipients.length} recipient(s)
                        </div>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          schedule.enabled ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                        title={schedule.enabled ? 'Enabled' : 'Disabled'}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Execution History */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Execution History</h3>
            {selectedSchedule && (
              <p className="text-sm text-gray-600 mt-1">{selectedSchedule.name}</p>
            )}
          </div>
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {!selectedSchedule ? (
              <div className="px-6 py-8 text-center text-gray-500">
                Select a schedule to view execution history
              </div>
            ) : executionHistory.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No executions yet
              </div>
            ) : (
              executionHistory.map(execution => (
                <div key={execution.id} className="px-6 py-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-sm font-medium text-gray-900">
                      {new Date(execution.executionTime).toLocaleString()}
                    </div>
                    {getStatusBadge(execution.status)}
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-3">
                    <div>
                      <div className="text-xs text-gray-500">Recipients</div>
                      <div className="text-sm font-semibold">{execution.recipientCount}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Delivered</div>
                      <div className="text-sm font-semibold text-green-600">
                        {execution.deliveredCount}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Failed</div>
                      <div className="text-sm font-semibold text-red-600">
                        {execution.failedCount}
                      </div>
                    </div>
                  </div>
                  {execution.duration && (
                    <div className="text-xs text-gray-500 mt-2">
                      Duration: {(execution.duration / 1000).toFixed(2)}s
                    </div>
                  )}
                  {execution.errorMessage && (
                    <div className="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded">
                      {execution.errorMessage}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Metrics Summary */}
      {selectedSchedule && executionHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {executionHistory.length}
              </div>
              <div className="text-sm text-gray-600">Total Executions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {executionHistory.filter(e => e.status === 'completed').length}
              </div>
              <div className="text-sm text-gray-600">Successful</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {executionHistory.filter(e => e.status === 'failed').length}
              </div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {executionHistory
                  .reduce((sum, e) => sum + e.deliveredCount, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Delivered</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
