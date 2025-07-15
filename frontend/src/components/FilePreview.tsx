import React, { useState, useEffect } from 'react';
import { getFileTypeCategory } from '../utils/fileValidation';

interface FilePreviewProps {
  file: File;
  className?: string;
}

const FilePreview: React.FC<FilePreviewProps> = ({ file, className = '' }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fileCategory = getFileTypeCategory(file);

  useEffect(() => {
    if (fileCategory === 'image') {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      
      // Cleanup URL when component unmounts
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [file, fileCategory]);

  const handleImageError = () => {
    setError('Failed to load image preview');
  };

  const getFileIcon = () => {
    switch (fileCategory) {
      case 'document':
        return (
          <svg className="file-icon" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
        );
      case 'spreadsheet':
        return (
          <svg className="file-icon" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2v2h2V6H5zm4 0v2h2V6H9zm4 0v2h2V6h-2zM5 10v2h2v-2H5zm4 0v2h2v-2H9zm4 0v2h2v-2h-2zM5 14v2h2v-2H5zm4 0v2h2v-2H9zm4 0v2h2v-2h-2z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="file-icon" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <div className={`file-preview ${className}`}>
      {fileCategory === 'image' && previewUrl && !error ? (
        <img
          src={previewUrl}
          alt={`Preview of ${file.name}`}
          className="file-preview-image"
          onError={handleImageError}
        />
      ) : (
        <div className="file-preview-icon">
          {getFileIcon()}
        </div>
      )}
      {error && (
        <div className="file-preview-error">
          <span className="error-text">{error}</span>
        </div>
      )}
    </div>
  );
};

export default FilePreview;