/**
 * Type definitions for Impact-In Delivery Monitor
 * Based on OpenAPI spec: /packages/openapi/v1-final/impact-in.yaml
 */

export type DeliveryProvider = 'benevity' | 'goodera' | 'workday';
export type DeliveryStatus = 'pending' | 'success' | 'failed' | 'retrying';

export interface Delivery {
  id: string;
  deliveryId: string;
  companyId: string;
  provider: DeliveryProvider;
  status: DeliveryStatus;
  attemptCount: number;
  payload?: Record<string, any>;
  lastError?: string | null;
  providerResponse?: Record<string, any> | null;
  deliveredAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface DeliveryListResponse {
  data: Delivery[];
  pagination: DeliveryPagination;
}

export interface DeliveryDetailResponse {
  data: Delivery;
}

export interface ReplayResponse {
  success: boolean;
  message: string;
  newStatus?: 'success' | 'failed';
  error?: string;
}

export interface BulkReplayRequest {
  ids: string[];
}

export interface BulkReplayResult {
  id: string;
  success: boolean;
  newStatus?: 'success' | 'failed';
  error?: string;
}

export interface BulkReplayResponse {
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
  results: BulkReplayResult[];
}

export interface RetryAllFailedRequest {
  companyId: string;
  provider?: DeliveryProvider;
}

export interface DeliveryStats {
  overall: {
    total: number;
    successful: number;
    failed: number;
    pending: number;
    retrying: number;
  };
  byProvider: Array<{
    provider: DeliveryProvider;
    status: DeliveryStatus;
    count: number;
    avgAttempts: number;
  }>;
}

export interface StatsResponse {
  data: DeliveryStats;
}

export interface DeliveryFilters {
  companyId?: string;
  provider?: DeliveryProvider;
  status?: DeliveryStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface DeliveryTableProps {
  companyId: string;
  onDeliverySelect: (delivery: Delivery) => void;
  onRefresh?: () => void;
}

export interface DeliveryStatsProps {
  companyId: string;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}
