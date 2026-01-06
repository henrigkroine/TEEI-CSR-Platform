/**
 * Boardroom Live View Component
 *
 * Main orchestrator for the boardroom live presentation interface.
 * Combines SSE updates, evidence overlay, presenter controls, and slide cycling.
 *
 * @module BoardroomLiveView
 */

import { useState, useEffect, useCallback } from 'react';
import { EvidenceOverlay, type EvidenceItem } from '../evidence/Overlay';
import { PresenterControls } from './PresenterControls';
import { createSSEResumeClient, type SSEConnectionState } from '../../lib/boardroom/sseResume';

export interface BoardroomLiveViewProps {
  companyId: string;
  lang: string;
  sseEndpoint: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

interface DashboardView {
  id: string;
  title: string;
  component: React.ReactNode;
}

export default function BoardroomLiveView({
  companyId,
  lang,
  sseEndpoint,
  user,
}: BoardroomLiveViewProps) {
  const [currentViewIndex, setCurrentViewIndex] = useState(0);
  const [autoCycleEnabled, setAutoCycleEnabled] = useState(false);
  const [evidenceEnabled, setEvidenceEnabled] = useState(false);
  const [sseState, setSseState] = useState<SSEConnectionState>('disconnected');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);

  // Define dashboard views
  const views: DashboardView[] = [
    {
      id: 'kpis',
      title: 'Key Performance Indicators',
      component: <KPIView companyId={companyId} />,
    },
    {
      id: 'impact',
      title: 'Impact Metrics',
      component: <ImpactView companyId={companyId} />,
    },
    {
      id: 'engagement',
      title: 'Engagement & Participation',
      component: <EngagementView companyId={companyId} />,
    },
    {
      id: 'trends',
      title: 'Trends & Analytics',
      component: <TrendsView companyId={companyId} />,
    },
  ];

  // Initialize SSE connection
  useEffect(() => {
    const sseClient = createSSEResumeClient({
      url: sseEndpoint,
      companyId,
      channel: 'boardroom-live',
      onMessage: (event) => {
        console.log('[BoardroomLive] SSE message received:', event.data);

        try {
          const data = JSON.parse(event.data);

          // Update evidence if included
          if (data.evidence) {
            setEvidence(data.evidence);
          }

          // Update last refresh time
          setLastUpdate(new Date());
        } catch (error) {
          console.error('[BoardroomLive] Failed to parse SSE message:', error);
        }
      },
      onError: (error) => {
        console.error('[BoardroomLive] SSE error:', error);
      },
      onConnectionChange: (state) => {
        console.log('[BoardroomLive] SSE state changed:', state);
        setSseState(state);
      },
    });

    sseClient.connect();

    return () => {
      sseClient.disconnect();
    };
  }, [companyId, sseEndpoint]);

  // Handle view change
  const handleViewChange = useCallback((index: number) => {
    const startTime = performance.now();
    setCurrentViewIndex(index);
    const duration = performance.now() - startTime;

    // Log performance (should be < 100ms per AC)
    console.log(`[BoardroomLive] View switch took ${duration.toFixed(2)}ms`);

    if (duration > 100) {
      console.warn('[BoardroomLive] View switch exceeded 100ms threshold');
    }
  }, []);

  // Handle exit
  const handleExit = useCallback(() => {
    // Navigate back to dashboard
    window.location.href = `/${lang}/cockpit/${companyId}`;
  }, [lang, companyId]);

  return (
    <div className="boardroom-live-view min-h-screen bg-gray-900 text-white">
      {/* SSE Connection Status Banner */}
      {sseState !== 'connected' && (
        <div
          className={`
            fixed top-0 left-0 right-0 z-50 text-center py-2 text-sm font-medium
            ${sseState === 'connecting' ? 'bg-yellow-600' : ''}
            ${sseState === 'reconnecting' ? 'bg-orange-600' : ''}
            ${sseState === 'disconnected' ? 'bg-red-600' : ''}
            ${sseState === 'failed' ? 'bg-red-700' : ''}
          `}
          role="alert"
          aria-live="polite"
        >
          {sseState === 'connecting' && '🔄 Connecting to live updates...'}
          {sseState === 'reconnecting' && '🔄 Reconnecting to live updates...'}
          {sseState === 'disconnected' && '⚠️ Disconnected from live updates'}
          {sseState === 'failed' && '❌ Failed to connect to live updates'}
        </div>
      )}

      {/* Evidence Overlay */}
      <EvidenceOverlay
        enabled={evidenceEnabled}
        evidence={evidence}
        onToggle={setEvidenceEnabled}
        togglePosition="top-right"
      >
        {/* Main Content Area */}
        <div className="boardroom-content p-8 pt-16">
          {/* View Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">{views[currentViewIndex].title}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>Company: {companyId}</span>
              <span>•</span>
              <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span
                  className={`w-2 h-2 rounded-full ${sseState === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}
                />
                {sseState === 'connected' ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>

          {/* Current View */}
          <div className="view-container">{views[currentViewIndex].component}</div>
        </div>
      </EvidenceOverlay>

      {/* Presenter Controls */}
      <PresenterControls
        slideCount={views.length}
        currentSlide={currentViewIndex}
        onSlideChange={handleViewChange}
        autoCycle={autoCycleEnabled}
        cycleInterval={30000}
        onAutoCycleToggle={setAutoCycleEnabled}
        evidenceEnabled={evidenceEnabled}
        onEvidenceToggle={setEvidenceEnabled}
        companyId={companyId}
        onExit={handleExit}
      />
    </div>
  );
}

/**
 * Placeholder views (to be replaced with actual dashboard components)
 */

function KPIView({ companyId }: { companyId: string }) {
  return (
    <div className="grid grid-cols-4 gap-6">
      <MetricCard
        title="Total Impact Hours"
        value="125,438"
        change="+12%"
        changeType="positive"
        evidenceId="EV-001"
      />
      <MetricCard
        title="Volunteers Active"
        value="2,847"
        change="+8%"
        changeType="positive"
        evidenceId="EV-002"
      />
      <MetricCard
        title="Programs Running"
        value="42"
        change="+3"
        changeType="positive"
        evidenceId="EV-003"
      />
      <MetricCard
        title="SROI Score"
        value="3.2x"
        change="+0.4"
        changeType="positive"
        evidenceId="EV-004"
      />
    </div>
  );
}

function ImpactView({ companyId }: { companyId: string }) {
  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-2xl font-semibold mb-4">Social Return on Investment</h3>
        <div className="text-6xl font-bold text-blue-400">3.2x</div>
        <p className="text-gray-400 mt-2">For every $1 invested, $3.20 in social value created</p>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <MetricCard
          title="Environmental Impact"
          value="45 tons CO₂"
          change="+15%"
          changeType="positive"
          evidenceId="EV-005"
        />
        <MetricCard
          title="Community Reach"
          value="12,450 people"
          change="+22%"
          changeType="positive"
          evidenceId="EV-006"
        />
      </div>
    </div>
  );
}

function EngagementView({ companyId }: { companyId: string }) {
  return (
    <div className="grid grid-cols-3 gap-6">
      <MetricCard
        title="Participation Rate"
        value="68%"
        change="+5%"
        changeType="positive"
        evidenceId="EV-007"
      />
      <MetricCard
        title="Avg. Hours per Volunteer"
        value="44"
        change="+2"
        changeType="positive"
        evidenceId="EV-008"
      />
      <MetricCard
        title="Program Satisfaction"
        value="4.7/5"
        change="+0.3"
        changeType="positive"
        evidenceId="EV-009"
      />
    </div>
  );
}

function TrendsView({ companyId }: { companyId: string }) {
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-2xl font-semibold mb-4">Impact Trends (Last 12 Months)</h3>
      <div className="h-96 flex items-center justify-center text-gray-500">
        [Chart: Monthly impact hours trend - Canvas element would render here]
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  evidenceId?: string;
}

function MetricCard({ title, value, change, changeType = 'neutral', evidenceId }: MetricCardProps) {
  const changeColors = {
    positive: 'text-green-400',
    negative: 'text-red-400',
    neutral: 'text-gray-400',
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6" data-metric>
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm text-gray-400 font-medium">{title}</h3>
        {evidenceId && (
          <span className="text-xs px-2 py-1 bg-blue-600 rounded-full text-white font-mono">
            {evidenceId}
          </span>
        )}
      </div>
      <div className="text-3xl font-bold mb-1 metric-value">{value}</div>
      {change && (
        <div className={`text-sm font-medium ${changeColors[changeType]}`}>
          {changeType === 'positive' && '↑ '}
          {changeType === 'negative' && '↓ '}
          {change}
        </div>
      )}
    </div>
  );
}
