import { useEffect, useState, memo } from 'react';

interface Q2QInsight {
  id: string;
  insight_text: string;
  confidence: number;
  created_at: string;
  dimensions: Record<string, number>;
  evidence_lineage: Array<{ type: string; id: string; timestamp: string }>;
}

interface Props {
  companyId: string;
  limit?: number;
}

function Q2QFeed({ companyId, limit = 10 }: Props) {
  const [insights, setInsights] = useState<Q2QInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [companyId, limit]);

  async function fetchData() {
    // Validate companyId before making API call
    if (!companyId || companyId === 'undefined') {
      setLoading(false);
      return;
    }

    try {
      // Use proper API base URL from environment or fallback to window origin
      const API_BASE_URL = import.meta.env.PUBLIC_REPORTING_API_URL ||
        (typeof window !== 'undefined' ? window.location.origin : '');
      const url = `${API_BASE_URL}/companies/${companyId}/q2q-feed?limit=${limit}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setInsights(data.feed || []);
      }
    } catch (err) {
      console.error('Q2Q fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  function getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) return '#10b981';
    if (confidence >= 0.6) return '#f59e0b';
    return '#ef4444';
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  if (loading) return <div className="widget loading">Loading insights...</div>;

  return (
    <div className="widget q2q-feed">
      <h2>💡 Q2Q Insights</h2>
      <p className="subtitle">Latest AI-Generated Insights</p>

      {insights.length === 0 ? (
        <p className="no-data">No insights available yet. Start collecting feedback!</p>
      ) : (
        <div className="insights">
          {insights.map((insight) => (
            <div key={insight.id} className="insight-card">
              <div className="insight-header">
                <span
                  className="confidence-badge"
                  style={{ backgroundColor: getConfidenceColor(insight.confidence) }}
                >
                  {(insight.confidence * 100).toFixed(0)}% confidence
                </span>
                <span className="date">{formatDate(insight.created_at)}</span>
              </div>

              <p className="insight-text">{insight.insight_text}</p>

              <div className="dimensions">
                {Object.entries(insight.dimensions).map(([dim, score]) => (
                  <div key={dim} className="dimension">
                    <span className="dim-label">{dim}</span>
                    <span className="dim-score">{(score * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>

              {insight.evidence_lineage.length > 0 && (
                <div className="evidence">
                  <span className="evidence-label">Evidence:</span>
                  {insight.evidence_lineage.map((evidence, idx) => (
                    <span key={idx} className="evidence-tag">
                      {evidence.type}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <style>{`
        .q2q-feed {
          background: white;
          padding: 24px;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .q2q-feed h2 {
          font-size: 1.25rem;
          margin-bottom: 4px;
        }

        .subtitle {
          color: #6b7280;
          font-size: 0.875rem;
          margin-bottom: 20px;
        }

        .no-data {
          text-align: center;
          color: #6b7280;
          padding: 40px;
          font-style: italic;
        }

        .insights {
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-height: 600px;
          overflow-y: auto;
        }

        .insight-card {
          padding: 16px;
          background: #f9fafb;
          border-radius: 8px;
          border-left: 4px solid #0066cc;
        }

        .insight-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .confidence-badge {
          padding: 4px 12px;
          border-radius: 12px;
          color: white;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .date {
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .insight-text {
          color: #374151;
          line-height: 1.6;
          margin-bottom: 12px;
        }

        .dimensions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }

        .dimension {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          background: white;
          border-radius: 6px;
          font-size: 0.75rem;
        }

        .dim-label {
          color: #6b7280;
          text-transform: capitalize;
        }

        .dim-score {
          color: #0066cc;
          font-weight: 600;
        }

        .evidence {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #e5e7eb;
        }

        .evidence-label {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .evidence-tag {
          padding: 2px 8px;
          background: #e0e7ff;
          color: #4338ca;
          border-radius: 4px;
          font-size: 0.75rem;
        }
      `}</style>
    </div>
  );
}

export default memo(Q2QFeed, (prev, next) => {
  return prev.companyId === next.companyId && prev.limit === next.limit;
});
