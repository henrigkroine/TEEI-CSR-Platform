/**
 * DeliveryDetailDrawer Component
 *
 * Side drawer showing detailed delivery information:
 * - Full payload and provider response
 * - Delivery timeline and attempt history
 * - Error logs
 * - Retry action
 */

import React, { useEffect, useState, useRef } from 'react';
import type { Delivery, DeliveryDetailResponse } from './types';
import RetryButton from './RetryButton';

interface DeliveryDetailDrawerProps {
  deliveryId: string;
  onClose: () => void;
  onDeliveryUpdate?: (delivery: Delivery) => void;
}

export default function DeliveryDetailDrawer({
  deliveryId,
  onClose,
  onDeliveryUpdate,
}: DeliveryDetailDrawerProps) {
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'payload' | 'response' | 'errors'>('overview');
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDelivery();
  }, [deliveryId]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Focus trap
  useEffect(() => {
    const drawer = drawerRef.current;
    if (!drawer) return;

    const focusableElements = drawer.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    drawer.addEventListener('keydown', handleTab as any);
    firstElement?.focus();

    return () => drawer.removeEventListener('keydown', handleTab as any);
  }, [delivery]);

  const fetchDelivery = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/v1/impact-in/deliveries/${deliveryId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch delivery details');
      }

      const data: DeliveryDetailResponse = await response.json();
      setDelivery(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load delivery details');
    } finally {
      setLoading(false);
    }
  };

  const handleRetrySuccess = (updatedDelivery: Delivery) => {
    setDelivery(updatedDelivery);
    if (onDeliveryUpdate) {
      onDeliveryUpdate(updatedDelivery);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      success: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700',
      failed: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700',
      pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700',
      retrying: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-700',
    };

    return badges[status as keyof typeof badges] || badges.pending;
  };

  const getProviderIcon = (provider: string) => {
    const colors = {
      benevity: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
      goodera: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
      workday: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    };

    return colors[provider as keyof typeof colors] || colors.benevity;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDuration = (start: string, end?: string) => {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 60) return `${diffSec}s`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ${diffSec % 60}s`;
    return `${Math.floor(diffSec / 3600)}h ${Math.floor((diffSec % 3600) / 60)}m`;
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      aria-labelledby="drawer-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div
          ref={drawerRef}
          className="w-screen max-w-2xl transform transition-transform"
        >
          <div className="flex h-full flex-col bg-white dark:bg-gray-800 shadow-xl">
            {/* Header */}
            <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2
                  id="drawer-title"
                  className="text-lg font-semibold text-gray-900 dark:text-white"
                >
                  Delivery Details
                </h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
                  aria-label="Close drawer"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {delivery && (
                <div className="mt-3 flex items-center space-x-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(delivery.status)}`}>
                    {delivery.status.toUpperCase()}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                    {delivery.deliveryId}
                  </span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : error ? (
                <div className="m-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
                  <p className="text-red-800 dark:text-red-200">{error}</p>
                </div>
              ) : delivery ? (
                <div className="p-6 space-y-6">
                  {/* Overview Section */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                      Overview
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Provider
                        </label>
                        <div className={`inline-flex items-center px-3 py-1.5 rounded-md ${getProviderIcon(delivery.provider)}`}>
                          <span className="font-medium capitalize">{delivery.provider}</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Attempts
                        </label>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {delivery.attemptCount}
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Created At
                        </label>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {formatDate(delivery.createdAt)}
                        </p>
                      </div>

                      {delivery.deliveredAt && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Delivered At
                          </label>
                          <p className="text-sm text-gray-900 dark:text-white">
                            {formatDate(delivery.deliveredAt)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Duration: {formatDuration(delivery.createdAt, delivery.deliveredAt)}
                          </p>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Last Updated
                        </label>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {formatDate(delivery.updatedAt)}
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Company ID
                        </label>
                        <p className="text-sm font-mono text-gray-900 dark:text-white">
                          {delivery.companyId.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Error Section */}
                  {delivery.lastError && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                        Last Error
                      </h3>
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
                        <p className="text-sm text-red-800 dark:text-red-200 font-mono">
                          {delivery.lastError}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Tabs */}
                  <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                      {['payload', 'response'].map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab as typeof activeTab)}
                          className={`
                            py-2 px-1 border-b-2 font-medium text-sm capitalize
                            ${
                              activeTab === tab
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                            }
                          `}
                        >
                          {tab}
                        </button>
                      ))}
                    </nav>
                  </div>

                  {/* Tab Content */}
                  <div className="space-y-2">
                    {activeTab === 'payload' && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                          Request Payload
                        </h3>
                        <pre className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md p-4 overflow-x-auto text-xs font-mono text-gray-900 dark:text-gray-100">
                          {delivery.payload
                            ? JSON.stringify(delivery.payload, null, 2)
                            : 'No payload data'}
                        </pre>
                      </div>
                    )}

                    {activeTab === 'response' && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                          Provider Response
                        </h3>
                        <pre className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md p-4 overflow-x-auto text-xs font-mono text-gray-900 dark:text-gray-100">
                          {delivery.providerResponse
                            ? JSON.stringify(delivery.providerResponse, null, 2)
                            : 'No response data'}
                        </pre>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {delivery.status === 'failed' && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <RetryButton
                        delivery={delivery}
                        onSuccess={handleRetrySuccess}
                        size="lg"
                        className="w-full justify-center"
                      />
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
