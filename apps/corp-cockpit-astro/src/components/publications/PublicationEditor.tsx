import { useState, useEffect } from 'react';
import type {
  Publication,
  PublicationWithBlocks,
  PublicationBlock,
  BlockPayload,
} from '@teei/shared-types';

interface PublicationEditorProps {
  publicationId?: string;
}

export function PublicationEditor({ publicationId }: PublicationEditorProps) {
  const [publication, setPublication] = useState<PublicationWithBlocks | null>(null);
  const [loading, setLoading] = useState(!!publicationId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'TOKEN'>('PUBLIC');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [ogImage, setOgImage] = useState('');

  useEffect(() => {
    if (publicationId) {
      fetchPublication();
    }
  }, [publicationId]);

  const fetchPublication = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/publications/${publicationId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch publication');
      }

      const data = await response.json();
      const pub = data.data as PublicationWithBlocks;

      setPublication(pub);
      setTitle(pub.title);
      setSlug(pub.slug);
      setDescription(pub.description || '');
      setVisibility(pub.visibility);
      setMetaTitle(pub.metaTitle || '');
      setMetaDescription(pub.metaDescription || '');
      setOgImage(pub.ogImage || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const payload = {
        title,
        slug,
        description,
        visibility,
        metaTitle,
        metaDescription,
        ogImage,
      };

      const url = publicationId
        ? `/api/v1/publications/${publicationId}`
        : '/api/v1/publications';

      const method = publicationId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save publication');
      }

      const data = await response.json();

      if (!publicationId) {
        // Redirect to editor for new publication
        window.location.href = `/admin/publications/${data.data.id}`;
      } else {
        // Reload current publication
        await fetchPublication();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!publicationId) {
      alert('Please save the publication first');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/v1/publications/${publicationId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          metaTitle,
          metaDescription,
          ogImage,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to publish publication');
      }

      await fetchPublication();
      alert('Publication published successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setSaving(false);
    }
  };

  const handleRotateToken = async () => {
    if (!publicationId) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/publications/${publicationId}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ expiresInDays: 30 }),
      });

      if (!response.ok) {
        throw new Error('Failed to rotate token');
      }

      const data = await response.json();
      alert(`New token generated!\n\nEmbed URL:\n${data.data.embedUrl}`);
      await fetchPublication();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rotate token');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Basic Info */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Basic Information
        </h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Title *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
              Slug * (URL path)
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                /impact/
              </span>
              <input
                type="text"
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                className="flex-1 min-w-0 block w-full rounded-none rounded-r-md border-gray-300 focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="visibility" className="block text-sm font-medium text-gray-700">
              Visibility
            </label>
            <select
              id="visibility"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as 'PUBLIC' | 'TOKEN')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            >
              <option value="PUBLIC">Public (Anyone can view)</option>
              <option value="TOKEN">Token-Protected (Requires access token)</option>
            </select>
          </div>
        </div>
      </div>

      {/* SEO Settings */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          SEO & Social Sharing
        </h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="metaTitle" className="block text-sm font-medium text-gray-700">
              Meta Title
            </label>
            <input
              type="text"
              id="metaTitle"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="metaDescription" className="block text-sm font-medium text-gray-700">
              Meta Description
            </label>
            <textarea
              id="metaDescription"
              rows={2}
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="ogImage" className="block text-sm font-medium text-gray-700">
              Open Graph Image URL
            </label>
            <input
              type="url"
              id="ogImage"
              value={ogImage}
              onChange={(e) => setOgImage(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Blocks */}
      {publication && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Content Blocks
          </h2>

          <div className="mb-4">
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg
                className="mr-2 h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Block
            </button>
          </div>

          {publication.blocks.length === 0 ? (
            <p className="text-sm text-gray-500">
              No blocks added yet. Add your first block to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {publication.blocks.map((block) => (
                <div
                  key={block.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-md"
                >
                  <div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {block.kind}
                    </span>
                    <span className="ml-2 text-sm text-gray-600">
                      Order: {block.order}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <button className="text-primary-600 hover:text-primary-900 text-sm">
                      Edit
                    </button>
                    <button className="text-red-600 hover:text-red-900 text-sm">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between bg-white shadow rounded-lg p-6">
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !title || !slug}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </button>

          {publication && publication.status !== 'LIVE' && (
            <button
              type="button"
              onClick={handlePublish}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              Publish
            </button>
          )}

          {publication && visibility === 'TOKEN' && (
            <button
              type="button"
              onClick={handleRotateToken}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Rotate Token
            </button>
          )}
        </div>

        {publication && (
          <a
            href={`/impact/${publication.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:text-primary-900 text-sm font-medium"
          >
            Preview →
          </a>
        )}
      </div>
    </div>
  );
}
