/**
 * Delivery Filters Component
 *
 * Provides filtering controls for delivery timeline.
 *
 * Features:
 * - Filter by platform (Benevity, Goodera, Workday, All)
 * - Filter by status (Success, Failed, Pending, All)
 * - Date range picker
 */

import { useState } from 'react';
import './DeliveryFilters.css';

export default function DeliveryFilters() {
  const [platform, setPlatform] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const handleApplyFilters = () => {
    const params = new URLSearchParams();

    if (platform !== 'all') {
      params.set('provider', platform);
    }

    if (status !== 'all') {
      params.set('status', status);
    }

    if (startDate) {
      params.set('startDate', new Date(startDate).toISOString());
    }

    if (endDate) {
      params.set('endDate', new Date(endDate).toISOString());
    }

    // Reload page with filters
    const url = new URL(window.location.href);
    url.search = params.toString();
    window.location.href = url.toString();
  };

  const handleClearFilters = () => {
    setPlatform('all');
    setStatus('all');
    setStartDate('');
    setEndDate('');

    // Reload page without filters
    const url = new URL(window.location.href);
    url.search = '';
    window.location.href = url.toString();
  };

  return (
    <div className="delivery-filters">
      <div className="filters-grid">
        <div className="filter-group">
          <label htmlFor="platform-filter">Platform</label>
          <select
            id="platform-filter"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          >
            <option value="all">All Platforms</option>
            <option value="benevity">🌟 Benevity</option>
            <option value="goodera">🌍 Goodera</option>
            <option value="workday">💼 Workday</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="status-filter">Status</label>
          <select
            id="status-filter"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="success">✅ Success</option>
            <option value="failed">❌ Failed</option>
            <option value="pending">⏳ Pending</option>
            <option value="retrying">🔄 Retrying</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="start-date">Start Date</label>
          <input
            type="date"
            id="start-date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label htmlFor="end-date">End Date</label>
          <input
            type="date"
            id="end-date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div className="filter-actions">
        <button onClick={handleApplyFilters} className="apply-btn">
          Apply Filters
        </button>
        <button onClick={handleClearFilters} className="clear-btn">
          Clear Filters
        </button>
      </div>
    </div>
  );
}
