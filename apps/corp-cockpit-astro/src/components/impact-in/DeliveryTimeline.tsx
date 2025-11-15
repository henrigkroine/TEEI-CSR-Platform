/**
 * Delivery Timeline Component
 *
 * Displays a timeline of recent Impact-In deliveries with status indicators,
 * retry counts, and payload previews.
 *
 * Features:
 * - Visual timeline with status colors
 * - Expandable delivery details
 * - Payload preview (sanitized)
 * - Manual replay button (admin only)
 * - Latency display
 */

import { useState } from 'react';
import './DeliveryTimeline.css';

interface DeliveryTimelineProps {
  companyId: string;
  initialDeliveries: any[];
  canReplay: boolean;
}

interface Delivery {
  id: string;
  platform: string;
  status: string;
  attemptCount: number;
  createdAt: string;
  deliveredAt: string | null;
  lastError: string | null;
  payloadSample: any;
}

export default function DeliveryTimeline({
  companyId,
  initialDeliveries,
  canReplay,
}: DeliveryTimelineProps) {
  const [deliveries, setDeliveries] = useState<Delivery[]>(initialDeliveries);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replayingId, setReplayingId] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'var(--color-success)';
      case 'failed':
        return 'var(--color-error)';
      case 'pending':
        return 'var(--color-warning)';
      case 'retrying':
        return 'var(--color-info)';
      default:
        return 'var(--color-text-secondary)';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return '✅';
      case 'failed':
        return '❌';
      case 'pending':
        return '⏳';
      case 'retrying':
        return '🔄';
      default:
        return '❓';
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'benevity':
        return '🌟';
      case 'goodera':
        return '🌍';
      case 'workday':
        return '💼';
      default:
        return '📡';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateLatency = (createdAt: string, deliveredAt: string | null) => {
    if (!deliveredAt) return null;

    const created = new Date(createdAt);
    const delivered = new Date(deliveredAt);
    const latencyMs = delivered.getTime() - created.getTime();

    if (latencyMs < 1000) {
      return `${Math.round(latencyMs)}ms`;
    } else if (latencyMs < 60000) {
      return `${(latencyMs / 1000).toFixed(1)}s`;
    } else {
      return `${(latencyMs / 60000).toFixed(1)}m`;
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleReplay = async (deliveryId: string) => {
    if (!confirm('Retry this delivery?')) {
      return;
    }

    setReplayingId(deliveryId);

    try {
      const response = await fetch(`/v1/impact-in/deliveries/${deliveryId}/replay`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Replay ${result.success ? 'succeeded' : 'failed'}`);

        // Refresh deliveries
        const deliveriesResponse = await fetch(
          `/v1/impact-in/deliveries?companyId=${companyId}&limit=30`
        );
        if (deliveriesResponse.ok) {
          const data = await deliveriesResponse.json();
          setDeliveries(data.data || []);
        }
      } else {
        throw new Error('Replay request failed');
      }
    } catch (error) {
      alert('Failed to replay delivery. Please try again.');
      console.error(error);
    } finally {
      setReplayingId(null);
    }
  };

  if (deliveries.length === 0) {
    return (
      <div className="delivery-timeline empty">
        <p className="empty-message">No deliveries found.</p>
      </div>
    );
  }

  return (
    <div className="delivery-timeline">
      {deliveries.map((delivery) => {
        const isExpanded = expandedId === delivery.id;
        const latency = calculateLatency(delivery.createdAt, delivery.deliveredAt);

        return (
          <div key={delivery.id} className={`delivery-item ${isExpanded ? 'expanded' : ''}`}>
            {/* Timeline Marker */}
            <div className="timeline-marker">
              <div
                className="status-dot"
                style={{ backgroundColor: getStatusColor(delivery.status) }}
              ></div>
              <div className="timeline-line"></div>
            </div>

            {/* Delivery Card */}
            <div className="delivery-card" onClick={() => toggleExpanded(delivery.id)}>
              <div className="delivery-header">
                <div className="delivery-title">
                  <span className="platform-icon">{getPlatformIcon(delivery.platform)}</span>
                  <span className="platform-name">{delivery.platform}</span>
                  <span className="status-icon">{getStatusIcon(delivery.status)}</span>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(delivery.status) }}
                  >
                    {delivery.status}
                  </span>
                </div>

                <div className="delivery-meta">
                  <span className="timestamp">{formatDate(delivery.createdAt)}</span>
                  {delivery.attemptCount > 1 && (
                    <span className="retry-count">
                      🔄 {delivery.attemptCount} attempts
                    </span>
                  )}
                  {latency && <span className="latency">⏱️ {latency}</span>}
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="delivery-details" onClick={(e) => e.stopPropagation()}>
                  <div className="details-grid">
                    <div className="detail-item">
                      <span className="label">Delivery ID:</span>
                      <span className="value mono">{delivery.id}</span>
                    </div>

                    <div className="detail-item">
                      <span className="label">Created:</span>
                      <span className="value">{new Date(delivery.createdAt).toLocaleString()}</span>
                    </div>

                    {delivery.deliveredAt && (
                      <div className="detail-item">
                        <span className="label">Delivered:</span>
                        <span className="value">
                          {new Date(delivery.deliveredAt).toLocaleString()}
                        </span>
                      </div>
                    )}

                    <div className="detail-item">
                      <span className="label">Attempts:</span>
                      <span className="value">{delivery.attemptCount}</span>
                    </div>
                  </div>

                  {delivery.lastError && (
                    <div className="error-section">
                      <h4>Error Details</h4>
                      <pre className="error-message">{delivery.lastError}</pre>
                    </div>
                  )}

                  {delivery.payloadSample && (
                    <div className="payload-section">
                      <h4>Payload Preview (Sanitized)</h4>
                      <pre className="payload-preview">
                        {JSON.stringify(delivery.payloadSample, null, 2)}
                      </pre>
                    </div>
                  )}

                  {canReplay && delivery.status === 'failed' && (
                    <div className="actions-section">
                      <button
                        onClick={() => handleReplay(delivery.id)}
                        className="replay-btn"
                        disabled={replayingId === delivery.id}
                      >
                        {replayingId === delivery.id ? 'Retrying...' : '🔄 Retry Delivery'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
