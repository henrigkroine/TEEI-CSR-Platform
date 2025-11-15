/**
 * DeliveryMonitor Component
 *
 * Main component for the Impact-In Delivery Monitor dashboard.
 * Combines stats, filters, and delivery table with optional real-time updates.
 */

import React, { useState, useEffect } from 'react';
import DeliveryStats from './DeliveryStats';
import DeliveryTable from './DeliveryTable';
import type { Delivery } from './types';

interface DeliveryMonitorProps {
  companyId: string;
  lang?: string;
}

export default function DeliveryMonitor({ companyId, lang = 'en' }: DeliveryMonitorProps) {
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dateRange, setDateRange] = useState<{
    startDate: string;
    endDate: string;
  } | undefined>(undefined);

  const [showDateRangePicker, setShowDateRangePicker] = useState(false);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleDeliverySelect = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
  };

  const handleSetDateRange = (range: 'today' | 'week' | 'month' | 'custom') => {
    const now = new Date();
    let startDate: Date;

    switch (range) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'custom':
        setShowDateRangePicker(true);
        return;
      default:
        startDate = new Date(now.setMonth(now.getMonth() - 1));
    }

    setDateRange({
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString(),
    });
  };

  const clearDateRange = () => {
    setDateRange(undefined);
  };

  return (
    <div className="delivery-monitor">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Impact-In Delivery Monitor
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Track and manage data deliveries to external platforms
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-3">
            {/* Date Range Selector */}
            <div className="relative inline-block text-left">
              <select
                onChange={(e) => handleSetDateRange(e.target.value as any)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Date Range</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
            </div>

            {dateRange && (
              <button
                onClick={clearDateRange}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Clear Date Range
              </button>
            )}
          </div>
        </div>

        {/* Date Range Display */}
        {dateRange && (
          <div className="mt-3 inline-flex items-center px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm text-blue-800 dark:text-blue-200">
              {new Date(dateRange.startDate).toLocaleDateString()} - {new Date(dateRange.endDate).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {/* Stats Dashboard */}
      <DeliveryStats companyId={companyId} dateRange={dateRange} key={`stats-${refreshKey}`} />

      {/* Delivery Table */}
      <DeliveryTable
        companyId={companyId}
        onDeliverySelect={handleDeliverySelect}
        onRefresh={handleRefresh}
        key={`table-${refreshKey}`}
      />

      {/* Info Banner */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">About Impact-In Deliveries</p>
            <p>
              Deliveries are automatically sent to configured providers (Benevity, Goodera, Workday) when CSR data changes.
              Failed deliveries can be retried manually or in bulk. The system will automatically retry failed deliveries
              up to 3 times with exponential backoff.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
