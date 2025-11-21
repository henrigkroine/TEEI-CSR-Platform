/**
 * Asset Uploader Component
 * Upload and manage branding assets (logo, favicon, watermark)
 */

import React, { useState, useRef } from 'react';
import type { BrandingAsset } from '@teei/shared-types';

interface AssetUploaderProps {
  themeId: string;
  assets: BrandingAsset[];
  onUpload: (asset: BrandingAsset) => void;
}

export function AssetUploader({ themeId, assets, onUpload }: AssetUploaderProps): JSX.Element {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File, kind: string) {
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('kind', kind);

      const response = await fetch(`/api/branding/themes/${themeId}/assets`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        onUpload(data.data);
      } else {
        console.error('Upload failed');
        alert('Failed to upload asset');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('An error occurred during upload');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground">Brand Assets</h3>

      {/* Logo Upload */}
      <div className="border border-border rounded-lg p-4">
        <label className="block text-sm font-medium mb-2">Logo</label>
        <input
          type="file"
          accept="image/png,image/svg+xml,image/jpeg"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file, 'logo');
          }}
          className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-primary file:text-white hover:file:bg-primary-hover"
        />
        <p className="text-xs text-muted-foreground mt-2">
          PNG, SVG, or JPEG. Max 5MB.
        </p>
      </div>

      {/* Favicon Upload */}
      <div className="border border-border rounded-lg p-4">
        <label className="block text-sm font-medium mb-2">Favicon</label>
        <input
          type="file"
          accept="image/x-icon,image/png"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file, 'favicon');
          }}
          className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-primary file:text-white hover:file:bg-primary-hover"
        />
        <p className="text-xs text-muted-foreground mt-2">
          ICO or PNG. Recommended: 32x32px.
        </p>
      </div>

      {/* Watermark Upload */}
      <div className="border border-border rounded-lg p-4">
        <label className="block text-sm font-medium mb-2">Watermark (for exports)</label>
        <input
          type="file"
          accept="image/png,image/svg+xml"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file, 'watermark');
          }}
          className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-primary file:text-white hover:file:bg-primary-hover"
        />
        <p className="text-xs text-muted-foreground mt-2">
          PNG or SVG with transparency.
        </p>
      </div>

      {uploading && (
        <div className="text-center text-sm text-muted-foreground">
          Uploading...
        </div>
      )}
    </div>
  );
}
