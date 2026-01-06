import React, { useState } from 'react';
import { FileUpload } from '../../../features/importer/components/FileUpload';

// Define local type to avoid import alias issues
type FileFormat = 'csv' | 'xlsx' | 'json';

export const CSVImporter: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = (file: File, format: any) => {
    setIsUploading(true);
    // Simulate upload
    setTimeout(() => {
        alert(`File ${file.name} uploaded! (Demo mode)`);
        setIsUploading(false);
    }, 1000);
  };

  return (
    <div className="card">
       <h3 className="text-lg font-heading font-semibold text-text-primary mb-4">Import Data</h3>
       <FileUpload onUpload={handleUpload} loading={isUploading} />
    </div>
  );
};
