/**
 * Mapping Studio - Main Component
 * Data Importer & Mapping Studio (Worker 22)
 */

import React, { useState } from 'react';
import type {
  ImportSession,
  FileFormat,
  MappingConfig,
  PreviewResult,
  EventContractTarget,
} from '@teei/shared-types';
import { FileUpload } from './components/FileUpload';
import { SchemaMapper } from './components/SchemaMapper';
import { PreviewTable } from './components/PreviewTable';
import { ProgressStepper } from './components/ProgressStepper';
import { ErrorDisplay } from './components/ErrorDisplay';

type Step = 'upload' | 'map' | 'preview' | 'commit' | 'complete';

export function MappingStudio() {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [session, setSession] = useState<ImportSession | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Step 1: Upload file
  const handleFileUpload = async (file: File, format: FileFormat) => {
    setLoading(true);
    setError(null);

    try {
      // Create session
      const createResponse = await fetch('/v1/imports/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileFormat: format,
          fileSize: file.size,
        }),
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create import session');
      }

      const { session: newSession } = await createResponse.json();

      // Upload file
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch(
        `/v1/imports/sessions/${newSession.id}/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      const uploadResult = await uploadResponse.json();
      setSession({ ...newSession, ...uploadResult });
      setCurrentStep('map');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Save mapping configuration
  const handleMappingSave = async (mapping: MappingConfig) => {
    if (!session) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/v1/imports/sessions/${session.id}/mapping`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mappingConfig: mapping }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save mapping');
      }

      const result = await response.json();
      setSession((prev) => (prev ? { ...prev, mappingConfig: mapping } : null));
      setCurrentStep('preview');

      // Auto-generate preview
      await generatePreview();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Generate preview
  const generatePreview = async () => {
    if (!session) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/v1/imports/sessions/${session.id}/preview`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sampleSize: 100 }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate preview');
      }

      const result = await response.json();
      setPreview(result.preview);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Commit import
  const handleCommit = async () => {
    if (!session) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/v1/imports/sessions/${session.id}/commit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skipRowsWithErrors: true }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to commit import');
      }

      const result = await response.json();
      setCurrentStep('complete');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentStep('upload');
    setSession(null);
    setPreview(null);
    setError(null);
  };

  return (
    <div className="mapping-studio">
      <div className="studio-header">
        <h1>Data Importer & Mapping Studio</h1>
        <p>
          Import historical CSR/volunteering/donation/program data with visual
          field mapping
        </p>
      </div>

      <ProgressStepper currentStep={currentStep} />

      {error && <ErrorDisplay error={error} onDismiss={() => setError(null)} />}

      <div className="studio-content">
        {currentStep === 'upload' && (
          <FileUpload onUpload={handleFileUpload} loading={loading} />
        )}

        {currentStep === 'map' && session?.inferredSchema && (
          <SchemaMapper
            inferredSchema={session.inferredSchema}
            onSave={handleMappingSave}
            onBack={() => setCurrentStep('upload')}
            loading={loading}
          />
        )}

        {currentStep === 'preview' && preview && (
          <div className="preview-section">
            <PreviewTable preview={preview} />
            <div className="preview-actions">
              <button onClick={() => setCurrentStep('map')}>Back to Mapping</button>
              <button onClick={handleCommit} disabled={loading}>
                {loading ? 'Committing...' : 'Commit Import'}
              </button>
            </div>
          </div>
        )}

        {currentStep === 'complete' && (
          <div className="complete-section">
            <div className="success-message">
              <svg className="success-icon" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                />
              </svg>
              <h2>Import Completed Successfully!</h2>
              <p>
                Your data has been imported and is being processed. You can view
                the results in the dashboard.
              </p>
            </div>
            <button onClick={handleReset}>Import Another File</button>
          </div>
        )}
      </div>

      <style>{`
        .mapping-studio {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
        }

        .studio-header {
          margin-bottom: 2rem;
        }

        .studio-header h1 {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .studio-header p {
          color: #6b7280;
          font-size: 1rem;
        }

        .studio-content {
          margin-top: 2rem;
        }

        .preview-section {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .preview-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
        }

        .preview-actions button {
          padding: 0.75rem 1.5rem;
          border-radius: 0.375rem;
          font-weight: 500;
          cursor: pointer;
          border: 1px solid #d1d5db;
          background: white;
          transition: all 0.2s;
        }

        .preview-actions button:last-child {
          background: #2563eb;
          color: white;
          border-color: #2563eb;
        }

        .preview-actions button:hover {
          opacity: 0.9;
        }

        .preview-actions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .complete-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 3rem;
          text-align: center;
        }

        .success-message {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .success-icon {
          width: 64px;
          height: 64px;
          color: #10b981;
        }

        .success-message h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #111827;
        }

        .success-message p {
          color: #6b7280;
        }

        .complete-section button {
          padding: 0.75rem 1.5rem;
          border-radius: 0.375rem;
          font-weight: 500;
          cursor: pointer;
          background: #2563eb;
          color: white;
          border: none;
          transition: all 0.2s;
        }

        .complete-section button:hover {
          background: #1d4ed8;
        }
      `}</style>
    </div>
  );
}
