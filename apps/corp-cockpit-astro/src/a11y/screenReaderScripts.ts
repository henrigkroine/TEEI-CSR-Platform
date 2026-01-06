/**
 * Screen Reader Support Scripts
 *
 * Provides comprehensive screen reader support with live regions,
 * chart announcements, and navigation announcements.
 *
 * WCAG 2.2 AAA Compliance
 */

/**
 * Live region manager for SSE updates and dynamic content
 */
export class LiveRegionManager {
  private politeRegion: HTMLDivElement | null = null;
  private assertiveRegion: HTMLDivElement | null = null;
  private statusRegion: HTMLDivElement | null = null;
  private announcementQueue: Array<{ message: string; priority: 'polite' | 'assertive' | 'status' }> = [];
  private isProcessing = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize live regions in the DOM
   */
  private initialize(): void {
    if (typeof document === 'undefined') return;

    // Create polite live region for non-critical updates
    this.politeRegion = this.createLiveRegion('sr-live-polite', 'polite');

    // Create assertive live region for critical alerts
    this.assertiveRegion = this.createLiveRegion('sr-live-assertive', 'assertive');

    // Create status region for status updates
    this.statusRegion = this.createLiveRegion('sr-live-status', 'polite', 'status');
  }

  /**
   * Create a live region element
   */
  private createLiveRegion(
    id: string,
    ariaLive: 'polite' | 'assertive' | 'off',
    role: string = 'log'
  ): HTMLDivElement {
    let region = document.getElementById(id) as HTMLDivElement;

    if (!region) {
      region = document.createElement('div');
      region.id = id;
      region.setAttribute('aria-live', ariaLive);
      region.setAttribute('aria-atomic', 'true');
      region.setAttribute('role', role);
      region.className = 'sr-only';
      region.style.cssText = `
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
      `;
      document.body.appendChild(region);
    }

    return region;
  }

  /**
   * Announce a message to screen readers
   */
  announce(message: string, priority: 'polite' | 'assertive' | 'status' = 'polite'): void {
    this.announcementQueue.push({ message, priority });
    this.processQueue();
  }

  /**
   * Process announcement queue with debouncing
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.announcementQueue.length === 0) return;

    this.isProcessing = true;

    while (this.announcementQueue.length > 0) {
      const announcement = this.announcementQueue.shift();
      if (!announcement) break;

      const region = this.getRegion(announcement.priority);
      if (region) {
        // Clear previous content
        region.textContent = '';

        // Wait for screen reader to register the clear
        await this.delay(100);

        // Set new content
        region.textContent = announcement.message;

        // Wait before processing next announcement
        await this.delay(announcement.priority === 'assertive' ? 1000 : 500);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Get the appropriate region for priority
   */
  private getRegion(priority: 'polite' | 'assertive' | 'status'): HTMLDivElement | null {
    switch (priority) {
      case 'assertive':
        return this.assertiveRegion;
      case 'status':
        return this.statusRegion;
      default:
        return this.politeRegion;
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Announce metric update
   */
  announceMetricUpdate(metricName: string, oldValue: number, newValue: number, unit: string = ''): void {
    const change = newValue - oldValue;
    const direction = change > 0 ? 'increased' : 'decreased';
    const message = `${metricName} ${direction} from ${oldValue}${unit} to ${newValue}${unit}`;
    this.announce(message, 'polite');
  }

  /**
   * Announce dashboard loaded
   */
  announceDashboardLoaded(widgetCount: number): void {
    const message = `Dashboard loaded with ${widgetCount} widget${widgetCount !== 1 ? 's' : ''}`;
    this.announce(message, 'polite');
  }

  /**
   * Announce navigation
   */
  announceNavigation(pageName: string): void {
    const message = `Navigated to ${pageName} page`;
    this.announce(message, 'polite');
  }

  /**
   * Announce critical alert
   */
  announceCriticalAlert(alertMessage: string): void {
    this.announce(`Critical alert: ${alertMessage}`, 'assertive');
  }

  /**
   * Announce data loading state
   */
  announceLoadingState(isLoading: boolean, context: string = 'content'): void {
    const message = isLoading ? `Loading ${context}` : `${context} loaded`;
    this.announce(message, 'status');
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.politeRegion?.remove();
    this.assertiveRegion?.remove();
    this.statusRegion?.remove();
    this.announcementQueue = [];
  }
}

/**
 * Chart announcement utilities
 */
export class ChartAnnouncer {
  private liveRegionManager: LiveRegionManager;

  constructor(liveRegionManager: LiveRegionManager) {
    this.liveRegionManager = liveRegionManager;
  }

  /**
   * Generate text alternative for chart data
   */
  generateChartDescription(chartData: {
    type: 'line' | 'bar' | 'pie' | 'scatter';
    title: string;
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      unit?: string;
    }>;
    summary?: string;
  }): string {
    const { type, title, labels, datasets, summary } = chartData;

    let description = `${type} chart titled "${title}". `;

    if (summary) {
      description += `${summary}. `;
    }

    // Describe datasets
    datasets.forEach((dataset, index) => {
      description += `Dataset ${index + 1}: ${dataset.label}. `;

      // For small datasets, describe all points
      if (dataset.data.length <= 5) {
        dataset.data.forEach((value, i) => {
          const unit = dataset.unit || '';
          description += `${labels[i]}: ${value}${unit}. `;
        });
      } else {
        // For larger datasets, provide summary statistics
        const min = Math.min(...dataset.data);
        const max = Math.max(...dataset.data);
        const avg = dataset.data.reduce((a, b) => a + b, 0) / dataset.data.length;
        const unit = dataset.unit || '';

        description += `Range: ${min}${unit} to ${max}${unit}. Average: ${avg.toFixed(2)}${unit}. `;
      }
    });

    return description.trim();
  }

  /**
   * Announce chart update
   */
  announceChartUpdate(chartId: string, _newData: any): void {
    const message = `Chart ${chartId} updated with new data`;
    this.liveRegionManager.announce(message, 'polite');
  }

  /**
   * Create ARIA label for chart
   */
  createChartAriaLabel(chartData: any): string {
    return this.generateChartDescription(chartData);
  }

  /**
   * Create table alternative for chart data
   */
  createTableAlternative(chartData: {
    title: string;
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      unit?: string;
    }>;
  }): string {
    let table = `<table class="sr-only">`;
    table += `<caption>${chartData.title}</caption>`;
    table += `<thead><tr><th>Category</th>`;

    chartData.datasets.forEach(dataset => {
      table += `<th>${dataset.label}</th>`;
    });

    table += `</tr></thead><tbody>`;

    chartData.labels.forEach((label, i) => {
      table += `<tr><th scope="row">${label}</th>`;
      chartData.datasets.forEach(dataset => {
        const unit = dataset.unit || '';
        table += `<td>${dataset.data[i]}${unit}</td>`;
      });
      table += `</tr>`;
    });

    table += `</tbody></table>`;
    return table;
  }
}

/**
 * Dashboard state announcer
 */
export class DashboardStateAnnouncer {
  private liveRegionManager: LiveRegionManager;
  private previousState: Record<string, any> = {};

  constructor(liveRegionManager: LiveRegionManager) {
    this.liveRegionManager = liveRegionManager;
  }

  /**
   * Announce dashboard state change
   */
  announceStateChange(newState: {
    widgetCount?: number;
    activeFilters?: string[];
    dateRange?: { start: string; end: string };
    viewMode?: string;
  }): void {
    const messages: string[] = [];

    if (newState.widgetCount !== undefined && newState.widgetCount !== this.previousState.widgetCount) {
      messages.push(`Dashboard now showing ${newState.widgetCount} widgets`);
    }

    if (newState.activeFilters && JSON.stringify(newState.activeFilters) !== JSON.stringify(this.previousState.activeFilters)) {
      if (newState.activeFilters.length === 0) {
        messages.push('All filters cleared');
      } else {
        messages.push(`${newState.activeFilters.length} filter${newState.activeFilters.length !== 1 ? 's' : ''} applied`);
      }
    }

    if (newState.dateRange && JSON.stringify(newState.dateRange) !== JSON.stringify(this.previousState.dateRange)) {
      messages.push(`Date range updated: ${newState.dateRange.start} to ${newState.dateRange.end}`);
    }

    if (newState.viewMode && newState.viewMode !== this.previousState.viewMode) {
      messages.push(`View mode changed to ${newState.viewMode}`);
    }

    this.previousState = { ...newState };

    if (messages.length > 0) {
      this.liveRegionManager.announce(messages.join('. '), 'polite');
    }
  }

  /**
   * Announce widget interaction
   */
  announceWidgetInteraction(widgetName: string, action: string, result?: string): void {
    let message = `${widgetName}: ${action}`;
    if (result) {
      message += `. ${result}`;
    }
    this.liveRegionManager.announce(message, 'polite');
  }

  /**
   * Announce filter application
   */
  announceFilterApplication(filterName: string, value: string, resultCount?: number): void {
    let message = `Filter "${filterName}" set to "${value}"`;
    if (resultCount !== undefined) {
      message += `. Showing ${resultCount} result${resultCount !== 1 ? 's' : ''}`;
    }
    this.liveRegionManager.announce(message, 'polite');
  }
}

/**
 * SSE update announcer for real-time data
 */
export class SSEUpdateAnnouncer {
  private liveRegionManager: LiveRegionManager;
  private updateDebounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly DEBOUNCE_MS = 2000; // Don't announce same metric more than once per 2 seconds

  constructor(liveRegionManager: LiveRegionManager) {
    this.liveRegionManager = liveRegionManager;
  }

  /**
   * Announce SSE update with debouncing
   */
  announceUpdate(metric: string, value: any, priority: 'low' | 'medium' | 'high' = 'low'): void {
    // Clear existing timer
    const existingTimer = this.updateDebounceTimers.get(metric);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      const message = this.formatUpdateMessage(metric, value);
      const ariaLive = priority === 'high' ? 'assertive' : 'polite';
      this.liveRegionManager.announce(message, ariaLive);
      this.updateDebounceTimers.delete(metric);
    }, this.DEBOUNCE_MS);

    this.updateDebounceTimers.set(metric, timer);
  }

  /**
   * Format update message
   */
  private formatUpdateMessage(metric: string, value: any): string {
    if (typeof value === 'number') {
      return `${metric} updated to ${value.toLocaleString()}`;
    }
    return `${metric} updated to ${value}`;
  }

  /**
   * Announce batch update
   */
  announceBatchUpdate(updateCount: number, context: string = 'metrics'): void {
    const message = `${updateCount} ${context} updated`;
    this.liveRegionManager.announce(message, 'polite');
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.updateDebounceTimers.forEach(timer => clearTimeout(timer));
    this.updateDebounceTimers.clear();
  }
}

/**
 * Global instance (singleton pattern)
 */
let globalLiveRegionManager: LiveRegionManager | null = null;
let globalChartAnnouncer: ChartAnnouncer | null = null;
let globalDashboardStateAnnouncer: DashboardStateAnnouncer | null = null;
let globalSSEUpdateAnnouncer: SSEUpdateAnnouncer | null = null;

/**
 * Initialize screen reader support
 */
export function initializeScreenReaderSupport(): {
  liveRegionManager: LiveRegionManager;
  chartAnnouncer: ChartAnnouncer;
  dashboardStateAnnouncer: DashboardStateAnnouncer;
  sseUpdateAnnouncer: SSEUpdateAnnouncer;
} {
  if (!globalLiveRegionManager) {
    globalLiveRegionManager = new LiveRegionManager();
  }

  if (!globalChartAnnouncer) {
    globalChartAnnouncer = new ChartAnnouncer(globalLiveRegionManager);
  }

  if (!globalDashboardStateAnnouncer) {
    globalDashboardStateAnnouncer = new DashboardStateAnnouncer(globalLiveRegionManager);
  }

  if (!globalSSEUpdateAnnouncer) {
    globalSSEUpdateAnnouncer = new SSEUpdateAnnouncer(globalLiveRegionManager);
  }

  return {
    liveRegionManager: globalLiveRegionManager,
    chartAnnouncer: globalChartAnnouncer,
    dashboardStateAnnouncer: globalDashboardStateAnnouncer,
    sseUpdateAnnouncer: globalSSEUpdateAnnouncer,
  };
}

/**
 * Cleanup screen reader support
 */
export function cleanupScreenReaderSupport(): void {
  globalLiveRegionManager?.destroy();
  globalSSEUpdateAnnouncer?.destroy();
  globalLiveRegionManager = null;
  globalChartAnnouncer = null;
  globalDashboardStateAnnouncer = null;
  globalSSEUpdateAnnouncer = null;
}

/**
 * React hook for screen reader announcements
 */
export function useScreenReaderAnnouncements() {
  const { liveRegionManager, chartAnnouncer, dashboardStateAnnouncer, sseUpdateAnnouncer } =
    initializeScreenReaderSupport();

  return {
    announce: (message: string, priority?: 'polite' | 'assertive' | 'status') =>
      liveRegionManager.announce(message, priority),
    announceMetricUpdate: (metricName: string, oldValue: number, newValue: number, unit?: string) =>
      liveRegionManager.announceMetricUpdate(metricName, oldValue, newValue, unit),
    announceNavigation: (pageName: string) => liveRegionManager.announceNavigation(pageName),
    announceCriticalAlert: (alertMessage: string) => liveRegionManager.announceCriticalAlert(alertMessage),
    announceLoadingState: (isLoading: boolean, context?: string) =>
      liveRegionManager.announceLoadingState(isLoading, context),
    announceChartUpdate: (chartId: string, newData: any) =>
      chartAnnouncer.announceChartUpdate(chartId, newData),
    generateChartDescription: (chartData: any) => chartAnnouncer.generateChartDescription(chartData),
    announceDashboardState: (state: any) => dashboardStateAnnouncer.announceStateChange(state),
    announceWidgetInteraction: (widgetName: string, action: string, result?: string) =>
      dashboardStateAnnouncer.announceWidgetInteraction(widgetName, action, result),
    announceSSEUpdate: (metric: string, value: any, priority?: 'low' | 'medium' | 'high') =>
      sseUpdateAnnouncer.announceUpdate(metric, value, priority),
  };
}

/**
 * Utility: Add skip link to page
 */
export function addSkipLink(targetId: string = 'main-content', label: string = 'Skip to main content'): void {
  if (typeof document === 'undefined') return;

  const skipLink = document.createElement('a');
  skipLink.href = `#${targetId}`;
  skipLink.className = 'skip-link';
  skipLink.textContent = label;
  skipLink.style.cssText = `
    position: absolute;
    top: -40px;
    left: 0;
    background: #000;
    color: #fff;
    padding: 8px;
    text-decoration: none;
    z-index: 100;
  `;

  skipLink.addEventListener('focus', () => {
    skipLink.style.top = '0';
  });

  skipLink.addEventListener('blur', () => {
    skipLink.style.top = '-40px';
  });

  document.body.insertBefore(skipLink, document.body.firstChild);
}
