import React, { useState, useEffect } from 'react';
import type { Publication, CreatePublicationRequest } from '@teei/shared-types';

interface PublicationEditorProps {
  companyId: string;
  userId: string;
  publication: Publication | null;
  onSave: () => void;
  onCancel: () => void;
}

export function PublicationEditor({
  companyId,
  userId,
  publication,
  onSave,
  onCancel,
}: PublicationEditorProps) {
  const [formData, setFormData] = useState({
    slug: publication?.slug || '',
    title: publication?.title || '',
    description: publication?.description || '',
    metaTitle: publication?.metaTitle || '',
    ogImage: publication?.ogImage || '',
    visibility: publication?.visibility || 'PUBLIC',
    blocks: publication ? [] : [], // Simplified for now
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const url = publication
        ? `/api/publications/${publication.id}`
        : '/api/publications';

      const method = publication ? 'PATCH' : 'POST';

      const body: any = {
        ...formData,
        tenantId: companyId,
      };

      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to save publication');
      }

      alert('Publication saved successfully!');
      onSave();
    } catch (err: any) {
      setError(err.message || 'Failed to save publication');
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="publication-editor">
      <div className="editor-header">
        <h2>{publication ? 'Edit Publication' : 'Create New Publication'}</h2>
        <button onClick={onCancel} className="btn btn-secondary">
          Cancel
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="editor-form">
        <div className="form-group">
          <label htmlFor="title">Title *</label>
          <input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            maxLength={255}
            placeholder="e.g., Q4 2024 Impact Report"
          />
        </div>

        <div className="form-group">
          <label htmlFor="slug">URL Slug *</label>
          <div className="input-group">
            <span className="input-prefix">/impact/</span>
            <input
              id="slug"
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({
                ...formData,
                slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
              })}
              required
              maxLength={255}
              pattern="^[a-z0-9-]+$"
              placeholder="q4-2024-impact"
            />
          </div>
          <small>Only lowercase letters, numbers, and hyphens</small>
        </div>

        <div className="form-group">
          <label htmlFor="description">Description (SEO)</label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            maxLength={160}
            rows={3}
            placeholder="A brief description for search engines (160 chars max)"
          />
          <small>{formData.description.length}/160 characters</small>
        </div>

        <div className="form-group">
          <label htmlFor="metaTitle">Meta Title (SEO)</label>
          <input
            id="metaTitle"
            type="text"
            value={formData.metaTitle}
            onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
            maxLength={60}
            placeholder="e.g., Q4 Impact Report - ACME Corp"
          />
          <small>{formData.metaTitle.length}/60 characters</small>
        </div>

        <div className="form-group">
          <label htmlFor="ogImage">OG Image URL</label>
          <input
            id="ogImage"
            type="url"
            value={formData.ogImage}
            onChange={(e) => setFormData({ ...formData, ogImage: e.target.value })}
            placeholder="https://example.com/og-image.png"
          />
          <small>Recommended: 1200x630px</small>
        </div>

        <div className="form-group">
          <label htmlFor="visibility">Visibility *</label>
          <select
            id="visibility"
            value={formData.visibility}
            onChange={(e) => setFormData({ ...formData, visibility: e.target.value as any })}
            required
          >
            <option value="PUBLIC">Public (anyone can view)</option>
            <option value="TOKEN">Token-gated (requires access token)</option>
          </select>
        </div>

        <div className="form-actions">
          <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : publication ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}
