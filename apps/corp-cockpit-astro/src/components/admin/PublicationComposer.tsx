/**
 * Publication Composer - Worker 19
 *
 * Admin UI for creating and managing public impact publications.
 * Allows composing publications with tiles, text, charts, evidence, and metrics.
 *
 * Features:
 * - Drag & drop block arrangement
 * - Live preview
 * - SEO metadata editor
 * - Token generation for private publications
 * - Publish/unpublish workflow
 * - Embed code generator
 *
 * @module PublicationComposer
 */

import { useState, useEffect } from 'react';
import type {
  Publication,
  PublicationBlock,
  PublicationWithBlocks,
  CreatePublicationRequest,
  UpdatePublicationRequest,
  AddBlockRequest,
  PublicationToken,
  TokenResponse
} from '@teei/shared-types';
import { createApiClient } from '../../lib/api';

export interface PublicationComposerProps {
  companyId: string;
  publicationId?: string; // For editing existing
  onClose?: () => void;
}

export default function PublicationComposer({ companyId, publicationId, onClose }: PublicationComposerProps) {
  const [loading, setLoading] = useState(!!publicationId);
  const [saving, setSaving] = useState(false);
  const [publication, setPublication] = useState<PublicationWithBlocks | null>(null);
  const [activeTab, setActiveTab] = useState<'compose' | 'seo' | 'tokens' | 'preview'>('compose');
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'TOKEN'>('PUBLIC');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [ogImageUrl, setOgImageUrl] = useState('');

  const api = createApiClient();

  useEffect(() => {
    if (publicationId) {
      loadPublication();
    }
  }, [publicationId]);

  const loadPublication = async () => {
    if (!publicationId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await api.get<PublicationWithBlocks>(`/publications/${publicationId}`);
      setPublication(data);
      setSlug(data.slug);
      setTitle(data.title);
      setDescription(data.description || '');
      setVisibility(data.visibility);
      setMetaTitle(data.meta_title || '');
      setMetaDescription(data.meta_description || '');
      setOgImageUrl(data.og_image_url || '');
    } catch (err: any) {
      console.error('[PublicationComposer] Load failed:', err);
      setError(err.message || 'Failed to load publication');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!slug || !title) {
      setError('Slug and title are required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const req: CreatePublicationRequest = {
        slug,
        title,
        description: description || undefined,
        visibility,
        meta_title: metaTitle || undefined,
        meta_description: metaDescription || undefined,
        og_image_url: ogImageUrl || undefined,
      };

      const created = await api.post<Publication>('/publications', req);
      setPublication({ ...created, blocks: [] });
      alert('Publication created! Add blocks to compose your page.');
    } catch (err: any) {
      console.error('[PublicationComposer] Create failed:', err);
      setError(err.message || 'Failed to create publication');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!publication) return;

    setSaving(true);
    setError(null);

    try {
      const req: UpdatePublicationRequest = {
        slug,
        title,
        description: description || undefined,
        visibility,
        meta_title: metaTitle || undefined,
        meta_description: metaDescription || undefined,
        og_image_url: ogImageUrl || undefined,
      };

      const updated = await api.patch<Publication>(`/publications/${publication.id}`, req);
      setPublication({ ...updated, blocks: publication.blocks });
      alert('Publication updated!');
    } catch (err: any) {
      console.error('[PublicationComposer] Update failed:', err);
      setError(err.message || 'Failed to update publication');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!publication) return;

    if (!confirm('Publish this page? It will be publicly accessible.')) return;

    setSaving(true);
    setError(null);

    try {
      await api.post(`/publications/${publication.id}/publish`, {});
      await loadPublication();
      alert('Publication is now LIVE!');
    } catch (err: any) {
      console.error('[PublicationComposer] Publish failed:', err);
      setError(err.message || 'Failed to publish');
    } finally {
      setSaving(false);
    }
  };

  const handleAddBlock = async (blockReq: AddBlockRequest) => {
    if (!publication) return;

    setSaving(true);
    setError(null);

    try {
      const block = await api.post<PublicationBlock>(
        `/publications/${publication.id}/blocks`,
        blockReq
      );
      setPublication({
        ...publication,
        blocks: [...publication.blocks, block].sort((a, b) => a.order - b.order),
      });
    } catch (err: any) {
      console.error('[PublicationComposer] Add block failed:', err);
      setError(err.message || 'Failed to add block');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!publication) return;

    if (!confirm('Delete this block?')) return;

    setSaving(true);
    setError(null);

    try {
      await api.delete(`/publications/${publication.id}/blocks/${blockId}`);
      setPublication({
        ...publication,
        blocks: publication.blocks.filter(b => b.id !== blockId),
      });
    } catch (err: any) {
      console.error('[PublicationComposer] Delete block failed:', err);
      setError(err.message || 'Failed to delete block');
    } finally {
      setSaving(false);
    }
  };

  const generateEmbedCode = () => {
    if (!publication) return '';
    return `<script src="https://cdn.teei.io/embed.js" data-slug="${publication.slug}" data-tenant="${companyId}"></script>`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading publication...</div>
      </div>
    );
  }

  return (
    <div className="publication-composer bg-white rounded-lg shadow-lg max-w-7xl mx-auto">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {publication ? 'Edit Publication' : 'Create Publication'}
            </h2>
            {publication && (
              <div className="mt-1 flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  publication.status === 'LIVE' ? 'bg-green-100 text-green-800' :
                  publication.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {publication.status}
                </span>
                <span className="text-sm text-gray-500">
                  {publication.visibility === 'PUBLIC' ? '🌐 Public' : '🔒 Token Required'}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {publication && publication.status === 'DRAFT' && (
              <button
                onClick={handlePublish}
                disabled={saving}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg
                         disabled:bg-gray-400 transition-colors"
              >
                Publish
              </button>
            )}
            <button
              onClick={publication ? handleUpdate : handleCreate}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                       disabled:bg-gray-400 transition-colors"
            >
              {saving ? 'Saving...' : publication ? 'Save' : 'Create'}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg
                         transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="text-red-800 text-sm">{error}</div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 px-6">
        <nav className="flex gap-4">
          {(['compose', 'seo', 'tokens', 'preview'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'compose' && (
          <ComposeTab
            publication={publication}
            slug={slug}
            title={title}
            description={description}
            visibility={visibility}
            onSlugChange={setSlug}
            onTitleChange={setTitle}
            onDescriptionChange={setDescription}
            onVisibilityChange={setVisibility}
            onAddBlock={handleAddBlock}
            onDeleteBlock={handleDeleteBlock}
          />
        )}

        {activeTab === 'seo' && (
          <SeoTab
            metaTitle={metaTitle}
            metaDescription={metaDescription}
            ogImageUrl={ogImageUrl}
            onMetaTitleChange={setMetaTitle}
            onMetaDescriptionChange={setMetaDescription}
            onOgImageUrlChange={setOgImageUrl}
          />
        )}

        {activeTab === 'tokens' && publication && (
          <TokensTab publicationId={publication.id} />
        )}

        {activeTab === 'preview' && publication && (
          <PreviewTab publication={publication} embedCode={generateEmbedCode()} />
        )}
      </div>
    </div>
  );
}

/**
 * Compose Tab
 */
function ComposeTab({
  publication,
  slug,
  title,
  description,
  visibility,
  onSlugChange,
  onTitleChange,
  onDescriptionChange,
  onVisibilityChange,
  onAddBlock,
  onDeleteBlock,
}: any) {
  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Slug (URL) *
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => onSlugChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
            placeholder="impact-2024-q1"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            URL: /impact/{slug || 'your-slug'}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Our Impact in 2024 Q1"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="A summary of our social impact achievements..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Visibility
          </label>
          <select
            value={visibility}
            onChange={(e) => onVisibilityChange(e.target.value as 'PUBLIC' | 'TOKEN')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="PUBLIC">Public (anyone with link)</option>
            <option value="TOKEN">Token Required (secure link)</option>
          </select>
        </div>
      </div>

      {/* Blocks */}
      {publication && (
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Content Blocks</h3>
            <button
              onClick={() => {
                const kind = prompt('Block type (TILE, TEXT, CHART, METRIC, HEADING, EVIDENCE):') as any;
                if (kind) {
                  onAddBlock({
                    kind,
                    order: publication.blocks.length,
                    payload_json: { type: kind },
                    width: 'full',
                  });
                }
              }}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
            >
              + Add Block
            </button>
          </div>

          {publication.blocks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No blocks yet. Add blocks to compose your publication.
            </div>
          ) : (
            <div className="space-y-3">
              {publication.blocks.map((block: PublicationBlock) => (
                <div key={block.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          {block.kind}
                        </span>
                        <span className="text-xs text-gray-500">Order: {block.order}</span>
                        <span className="text-xs text-gray-500">Width: {block.width}</span>
                      </div>
                      <pre className="text-xs text-gray-600 overflow-auto">
                        {JSON.stringify(block.payload_json, null, 2)}
                      </pre>
                    </div>
                    <button
                      onClick={() => onDeleteBlock(block.id)}
                      className="ml-4 px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * SEO Tab
 */
function SeoTab({
  metaTitle,
  metaDescription,
  ogImageUrl,
  onMetaTitleChange,
  onMetaDescriptionChange,
  onOgImageUrlChange,
}: any) {
  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Meta Title
        </label>
        <input
          type="text"
          value={metaTitle}
          onChange={(e) => onMetaTitleChange(e.target.value)}
          placeholder="Our Impact in 2024 Q1 | Acme Corp"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">Recommended: 50-60 characters</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Meta Description
        </label>
        <textarea
          value={metaDescription}
          onChange={(e) => onMetaDescriptionChange(e.target.value)}
          placeholder="Discover how Acme Corp made a difference in Q1 2024..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">Recommended: 150-160 characters</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Open Graph Image URL
        </label>
        <input
          type="url"
          value={ogImageUrl}
          onChange={(e) => onOgImageUrlChange(e.target.value)}
          placeholder="https://cdn.acme.com/og-image.jpg"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">Recommended: 1200x630px</p>
      </div>
    </div>
  );
}

/**
 * Tokens Tab
 */
function TokensTab({ publicationId }: { publicationId: string }) {
  const [tokens, setTokens] = useState<PublicationToken[]>([]);
  const [loading, setLoading] = useState(true);
  const api = createApiClient();

  useEffect(() => {
    loadTokens();
  }, [publicationId]);

  const loadTokens = async () => {
    setLoading(true);
    try {
      const data = await api.get<PublicationToken[]>(`/publications/${publicationId}/tokens`);
      setTokens(data);
    } catch (err) {
      console.error('[TokensTab] Load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    const label = prompt('Token label (optional):');
    try {
      const token = await api.post<TokenResponse>(`/publications/${publicationId}/tokens`, { label });
      alert(`Token created:\n\n${token.token}\n\nCopy this now, it won't be shown again!`);
      await loadTokens();
    } catch (err: any) {
      alert(`Failed to generate token: ${err.message}`);
    }
  };

  const handleRevoke = async (tokenId: string) => {
    if (!confirm('Revoke this token?')) return;
    try {
      await api.delete(`/publications/${publicationId}/tokens/${tokenId}`);
      await loadTokens();
    } catch (err: any) {
      alert(`Failed to revoke token: ${err.message}`);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading tokens...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Access Tokens</h3>
        <button
          onClick={handleGenerate}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          + Generate Token
        </button>
      </div>

      {tokens.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No tokens generated yet.
        </div>
      ) : (
        <div className="space-y-3">
          {tokens.map(token => (
            <div key={token.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-sm">{token.token_prefix}...</div>
                  {token.label && <div className="text-sm text-gray-600 mt-1">{token.label}</div>}
                  <div className="text-xs text-gray-500 mt-1">
                    Created: {new Date(token.created_at).toLocaleDateString()} | Uses: {token.use_count}
                  </div>
                </div>
                {!token.revoked_at && (
                  <button
                    onClick={() => handleRevoke(token.id)}
                    className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded text-sm"
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Preview Tab
 */
function PreviewTab({ publication, embedCode }: { publication: PublicationWithBlocks; embedCode: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Public URL</h3>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={`https://trust.teei.io/impact/${publication.slug}`}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
          />
          <button
            onClick={() => window.open(`https://trust.teei.io/impact/${publication.slug}`, '_blank')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Open
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Embed Code</h3>
        <div className="relative">
          <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-auto text-sm">
            {embedCode}
          </pre>
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-4">Preview</h3>
        <div className="border border-gray-200 rounded-lg p-6 bg-white">
          <h1 className="text-3xl font-bold mb-2">{publication.title}</h1>
          {publication.description && (
            <p className="text-gray-600 mb-6">{publication.description}</p>
          )}
          <div className="space-y-4">
            {publication.blocks.map(block => (
              <div key={block.id} className="p-4 bg-gray-50 border border-gray-200 rounded">
                <div className="text-xs text-gray-500 mb-2">{block.kind}</div>
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(block.payload_json, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
