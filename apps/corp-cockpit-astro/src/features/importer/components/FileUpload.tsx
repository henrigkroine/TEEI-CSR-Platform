import React, { useState, useRef } from 'react';
import type { FileFormat } from '@teei/shared-types';

interface FileUploadProps {
  onUpload: (file: File, format: FileFormat) => void;
  loading: boolean;
}

export function FileUpload({ onUpload, loading }: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<FileFormat>('csv');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-detect format from extension
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'csv' || ext === 'xlsx' || ext === 'json') {
        setSelectedFormat(ext as FileFormat);
      }
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      onUpload(selectedFile, selectedFormat);
    }
  };

  return (
    <div className="file-upload">
      <div className="upload-card">
        <div className="upload-icon">📁</div>
        <h2>Upload Your Data File</h2>
        <p>Support for CSV, XLSX, and JSON formats (max 200MB)</p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.json"
          onChange={handleFileChange}
          className="file-input"
        />

        {selectedFile && (
          <div className="selected-file">
            <div className="file-info">
              <span className="file-name">{selectedFile.name}</span>
              <span className="file-size">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>

            <div className="format-select">
              <label>File Format:</label>
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value as FileFormat)}
              >
                <option value="csv">CSV</option>
                <option value="xlsx">Excel (XLSX)</option>
                <option value="json">JSON</option>
              </select>
            </div>
          </div>
        )}

        <div className="upload-actions">
          <button onClick={() => fileInputRef.current?.click()} disabled={loading}>
            {selectedFile ? 'Change File' : 'Select File'}
          </button>
          {selectedFile && (
            <button onClick={handleUpload} disabled={loading} className="primary">
              {loading ? 'Uploading...' : 'Upload & Continue'}
            </button>
          )}
        </div>
      </div>

      <style>{`
        .file-upload {
          display: flex;
          justify-content: center;
          padding: 2rem;
        }

        .upload-card {
          background: white;
          border: 2px dashed #d1d5db;
          border-radius: 0.5rem;
          padding: 3rem;
          text-align: center;
          max-width: 600px;
          width: 100%;
        }

        .upload-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .upload-card h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .upload-card p {
          color: #6b7280;
          margin-bottom: 2rem;
        }

        .file-input {
          display: none;
        }

        .selected-file {
          background: #f3f4f6;
          padding: 1rem;
          border-radius: 0.375rem;
          margin: 1.5rem 0;
        }

        .file-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .file-name {
          font-weight: 500;
        }

        .file-size {
          color: #6b7280;
        }

        .format-select {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .format-select label {
          font-weight: 500;
        }

        .format-select select {
          flex: 1;
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
        }

        .upload-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }

        .upload-actions button {
          padding: 0.75rem 1.5rem;
          border-radius: 0.375rem;
          font-weight: 500;
          cursor: pointer;
          border: 1px solid #d1d5db;
          background: white;
          transition: all 0.2s;
        }

        .upload-actions button.primary {
          background: #2563eb;
          color: white;
          border-color: #2563eb;
        }

        .upload-actions button:hover {
          opacity: 0.9;
        }

        .upload-actions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
