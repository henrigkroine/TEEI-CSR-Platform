import React from 'react';
import type { Publication } from '@teei/shared-types';

interface PublicationListProps {
  publications: Publication[];
  onEdit: (publication: Publication) => void;
  onPublish: (publicationId: string) => void;
  onDelete: (publicationId: string) => void;
  onViewAnalytics: (publication: Publication) => void;
}

export function PublicationList({
  publications,
  onEdit,
  onPublish,
  onDelete,
  onViewAnalytics,
}: PublicationListProps) {
  if (publications.length === 0) {
    return (
      <div className="empty-state">
        <p>No publications yet. Create your first impact page to get started.</p>
      </div>
    );
  }

  return (
    <div className="publication-list">
      {publications.map((pub) => (
        <div key={pub.id} className="publication-card">
          <div className="publication-header">
            <div>
              <h3>{pub.title}</h3>
              <p className="slug">/impact/{pub.slug}</p>
            </div>
            <div className="badges">
              <span className={`badge badge-${pub.status.toLowerCase()}`}>
                {pub.status}
              </span>
              <span className={`badge badge-${pub.visibility.toLowerCase()}`}>
                {pub.visibility}
              </span>
            </div>
          </div>

          {pub.description && (
            <p className="description">{pub.description}</p>
          )}

          <div className="publication-meta">
            <span>Updated: {new Date(pub.updatedAt).toLocaleDateString()}</span>
            {pub.publishedAt && (
              <span>Published: {new Date(pub.publishedAt).toLocaleDateString()}</span>
            )}
          </div>

          <div className="publication-actions">
            {pub.status === 'DRAFT' && (
              <>
                <button onClick={() => onEdit(pub)} className="btn btn-sm btn-secondary">
                  Edit
                </button>
                <button onClick={() => onPublish(pub.id)} className="btn btn-sm btn-primary">
                  Publish
                </button>
              </>
            )}

            {pub.status === 'LIVE' && (
              <button onClick={() => onViewAnalytics(pub)} className="btn btn-sm btn-secondary">
                View Analytics
              </button>
            )}

            <button onClick={() => onDelete(pub.id)} className="btn btn-sm btn-danger">
              Delete
            </button>

            {pub.status === 'LIVE' && (
              <a
                href={`/impact/${pub.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-link"
              >
                Preview →
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
