/**
 * Publications Manager Component
 *
 * Manages creation, editing, and publishing of impact pages.
 * Features:
 * - List all publications (DRAFT/LIVE)
 * - Create new publication
 * - Edit existing publication (DRAFT only)
 * - Publish (DRAFT → LIVE)
 * - View analytics
 * - Token management for TOKEN visibility
 *
 * Ref: Worker 19 § Publisher UI
 */

import React, { useState, useEffect } from 'react';
import { PublicationEditor } from './PublicationEditor';
import { PublicationList } from './PublicationList';
import { PublicationAnalytics } from './PublicationAnalytics';
import type { Publication } from '@teei/shared-types';
import './PublicationsManager.css';

interface PublicationsManagerProps {
  companyId: string;
  userId: string;
}

type View = 'list' | 'create' | 'edit' | 'analytics';

export default function PublicationsManager({ companyId, userId }: PublicationsManagerProps) {
  const [view, setView] = useState<View>('list');
  const [publications, setPublications] = useState<Publication[]>([]);
  const [selectedPublication, setSelectedPublication] = useState<Publication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch publications
  useEffect(() => {
    fetchPublications();
  }, [companyId]);

  async function fetchPublications() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/publications?tenantId=${companyId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch publications');
      }

      const data = await response.json();
      setPublications(data.data.publications || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load publications');
      console.error('Failed to fetch publications:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleCreateNew() {
    setSelectedPublication(null);
    setView('create');
  }

  function handleEdit(publication: Publication) {
    if (publication.status !== 'DRAFT') {
      alert('Only DRAFT publications can be edited. Create a new version instead.');
      return;
    }

    setSelectedPublication(publication);
    setView('edit');
  }

  function handleViewAnalytics(publication: Publication) {
    setSelectedPublication(publication);
    setView('analytics');
  }

  function handleBack() {
    setView('list');
    setSelectedPublication(null);
    fetchPublications(); // Refresh list
  }

  async function handlePublish(publicationId: string) {
    if (!confirm('Are you sure you want to publish this publication? It will become publicly visible.')) {
      return;
    }

    try {
      const response = await fetch(`/api/publications/${publicationId}/live`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to publish');
      }

      const data = await response.json();

      // Show access token if TOKEN visibility
      if (data.data.accessToken) {
        alert(
          `Publication published!\n\nAccess Token: ${data.data.accessToken}\n\nSave this token securely - it will not be shown again.`
        );
      } else {
        alert('Publication published successfully!');
      }

      fetchPublications();
      setView('list');
    } catch (err: any) {
      alert(`Failed to publish: ${err.message}`);
      console.error('Failed to publish:', err);
    }
  }

  async function handleDelete(publicationId: string) {
    if (!confirm('Are you sure you want to delete this publication? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/publications/${publicationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete');
      }

      alert('Publication deleted successfully');
      fetchPublications();
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
      console.error('Failed to delete:', err);
    }
  }

  return (
    <div className="publications-manager">
      {loading && view === 'list' && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading publications...</p>
        </div>
      )}

      {error && view === 'list' && (
        <div className="error-state">
          <p>⚠️ {error}</p>
          <button onClick={fetchPublications} className="btn btn-primary">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && view === 'list' && (
        <>
          <div className="actions-bar">
            <button onClick={handleCreateNew} className="btn btn-primary">
              + Create New Publication
            </button>
          </div>

          <PublicationList
            publications={publications}
            onEdit={handleEdit}
            onPublish={handlePublish}
            onDelete={handleDelete}
            onViewAnalytics={handleViewAnalytics}
          />
        </>
      )}

      {(view === 'create' || view === 'edit') && (
        <PublicationEditor
          companyId={companyId}
          userId={userId}
          publication={selectedPublication}
          onSave={handleBack}
          onCancel={handleBack}
        />
      )}

      {view === 'analytics' && selectedPublication && (
        <PublicationAnalytics
          publication={selectedPublication}
          onBack={handleBack}
        />
      )}
    </div>
  );
}
