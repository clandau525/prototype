import React, { useCallback, useState, useMemo } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { MAX_FILE_SIZE, UploadProgress } from '@shared/types';
import { validateFiles, formatFileSize } from '../utils/fileValidation';
import FilePreview from './FilePreview';
import ProgressBar from './ProgressBar';
import './FileUploadComponent.css';

interface FileUploadComponentProps {
  onFilesSelected?: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number;
}

interface FileWithProgress extends File {
  id: string;
  progress: UploadProgress;
}

const FileUploadComponent: React.FC<FileUploadComponentProps> = ({
  onFilesSelected,
  maxFiles = 10,
  maxSize = MAX_FILE_SIZE,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<FileWithProgress[]>([]);
  const [rejectedFiles, setRejectedFiles] = useState<Array<{ file: File; errors: string[] }>>([]);
  const [totalSizeWarning, setTotalSizeWarning] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    // Use our enhanced validation
    const currentFiles = selectedFiles.map(f => f as File);
    const allFiles = [...currentFiles, ...acceptedFiles];
    const { validFiles, invalidFiles } = validateFiles(allFiles, {
      maxFileSize: maxSize / maxFiles, // Individual file size limit
      maxTotalSize: maxSize,
    });

    // Check total size and show warning if approaching limit
    const totalSize = validFiles.reduce((sum, file) => sum + file.size, 0);
    const warningThreshold = maxSize * 0.8; // 80% of max size
    
    if (totalSize > warningThreshold && totalSize <= maxSize) {
      const remainingMB = Math.round((maxSize - totalSize) / (1024 * 1024));
      setTotalSizeWarning(`Approaching size limit. ${remainingMB}MB remaining.`);
    } else {
      setTotalSizeWarning(null);
    }

    // Convert valid files to FileWithProgress
    const filesWithProgress: FileWithProgress[] = validFiles.map(file => {
      const existingFile = selectedFiles.find(f => f.name === file.name && f.size === file.size);
      if (existingFile) {
        return existingFile;
      }
      
      return Object.assign(file, {
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        progress: {
          fileId: `${file.name}-${Date.now()}-${Math.random()}`,
          bytesUploaded: 0,
          totalBytes: file.size,
          percentage: 0,
          speed: 0,
          estimatedTimeRemaining: 0,
          status: 'pending' as const,
        }
      });
    });

    setSelectedFiles(filesWithProgress);
    
    // Convert react-dropzone rejections to our format and merge with validation rejections
    const dropzoneRejections = fileRejections.map(rejection => ({
      file: rejection.file,
      errors: rejection.errors.map(error => error.message)
    }));
    
    setRejectedFiles([...invalidFiles, ...dropzoneRejections]);
    
    if (onFilesSelected && validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  }, [onFilesSelected, selectedFiles, maxSize, maxFiles]);

  // Create accept configuration from shared constants
  const acceptConfig = {
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'image/png': ['.png'],
    'image/jpeg': ['.jpg', '.jpeg'],
  };

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
    open
  } = useDropzone({
    onDrop,
    accept: acceptConfig,
    maxFiles,
    maxSize,
    noClick: true, // We'll handle click manually
    noKeyboard: true
  });

  const removeFile = (fileToRemove: FileWithProgress) => {
    setSelectedFiles(prev => prev.filter(file => file.id !== fileToRemove.id));
  };

  const clearRejectedFiles = () => {
    setRejectedFiles([]);
  };

  // Upload control functions
  const pauseUpload = (fileId: string) => {
    setSelectedFiles(prev => prev.map(file => 
      file.id === fileId 
        ? { ...file, progress: { ...file.progress, status: 'paused' } }
        : file
    ));
  };

  const resumeUpload = (fileId: string) => {
    setSelectedFiles(prev => prev.map(file => 
      file.id === fileId 
        ? { ...file, progress: { ...file.progress, status: 'uploading' } }
        : file
    ));
  };

  const retryUpload = (fileId: string) => {
    setSelectedFiles(prev => prev.map(file => 
      file.id === fileId 
        ? { 
            ...file, 
            progress: { 
              ...file.progress, 
              status: 'pending',
              bytesUploaded: 0,
              percentage: 0,
              speed: 0,
              estimatedTimeRemaining: 0,
              errorMessage: undefined
            } 
          }
        : file
    ));
  };

  const cancelUpload = (fileId: string) => {
    setSelectedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  // Simulate upload progress (in real implementation, this would be handled by upload service)
  const startUpload = (fileId: string) => {
    setSelectedFiles(prev => prev.map(file => 
      file.id === fileId 
        ? { ...file, progress: { ...file.progress, status: 'uploading' } }
        : file
    ));
    
    // Simulate progress updates
    const interval = setInterval(() => {
      setSelectedFiles(prev => prev.map(file => {
        if (file.id === fileId && file.progress.status === 'uploading') {
          const newProgress = Math.min(100, file.progress.percentage + Math.random() * 10);
          const speed = 1024 * 1024 * (0.5 + Math.random()); // 0.5-1.5 MB/s
          const remainingBytes = file.size * (100 - newProgress) / 100;
          const eta = remainingBytes / speed;
          
          if (newProgress >= 100) {
            clearInterval(interval);
            return {
              ...file,
              progress: {
                ...file.progress,
                percentage: 100,
                bytesUploaded: file.size,
                status: 'completed',
                speed: 0,
                estimatedTimeRemaining: 0
              }
            };
          }
          
          return {
            ...file,
            progress: {
              ...file.progress,
              percentage: newProgress,
              bytesUploaded: Math.round(file.size * newProgress / 100),
              speed,
              estimatedTimeRemaining: eta
            }
          };
        }
        return file;
      }));
    }, 500);
  };

  const startAllUploads = () => {
    setIsUploading(true);
    selectedFiles.forEach(file => {
      if (file.progress.status === 'pending') {
        startUpload(file.id);
      }
    });
  };

  const getDropzoneClassName = () => {
    let className = 'dropzone';
    if (isDragActive) className += ' dropzone--active';
    if (isDragAccept) className += ' dropzone--accept';
    if (isDragReject) className += ' dropzone--reject';
    return className;
  };



  return (
    <div className="file-upload-container">
      <div {...getRootProps({ className: getDropzoneClassName() })}>
        <input {...getInputProps()} />
        <div className="dropzone-content">
          {isDragActive ? (
            isDragAccept ? (
              <div className="dropzone-message dropzone-message--accept">
                <svg className="dropzone-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <p>Drop files here to upload</p>
              </div>
            ) : (
              <div className="dropzone-message dropzone-message--reject">
                <svg className="dropzone-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <p>Some files cannot be uploaded</p>
              </div>
            )
          ) : (
            <div className="dropzone-message">
              <svg className="dropzone-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="dropzone-title">Drag and drop files here</p>
              <p className="dropzone-subtitle">
                Supports PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, JPEG
              </p>
              <p className="dropzone-subtitle">
                Maximum {maxFiles} files, {formatFileSize(maxSize)} total
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="upload-actions">
        <button 
          type="button" 
          onClick={open}
          className="btn btn-primary"
        >
          Choose Files
        </button>
      </div>

      {totalSizeWarning && (
        <div className="size-warning">
          <svg className="warning-icon" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{totalSizeWarning}</span>
        </div>
      )}

      {selectedFiles.length > 0 && (
        <div className="selected-files">
          <div className="selected-files-header">
            <h3>Selected Files ({selectedFiles.length})</h3>
            <div className="upload-actions">
              <button
                type="button"
                onClick={startAllUploads}
                className="btn btn-primary"
                disabled={isUploading || selectedFiles.every(f => f.progress.status === 'completed')}
              >
                {isUploading ? 'Uploading...' : 'Start Upload'}
              </button>
            </div>
          </div>
          <ul className="file-list">
            {selectedFiles.map((file) => {
              const statusClass = `file-item--${file.progress.status}`;
              return (
                <li key={file.id} className={`file-item ${statusClass}`}>
                  <div className="file-preview-container">
                    <FilePreview file={file} className="file-preview-small" />
                  </div>
                  <div className="file-item-content">
                    <div className="file-item-header">
                      <div className="file-info">
                        <span className="file-name">{file.name}</span>
                        <span className="file-size">{formatFileSize(file.size)}</span>
                      </div>
                      <div className="file-actions">
                        {file.progress.status === 'uploading' && (
                          <button
                            type="button"
                            onClick={() => pauseUpload(file.id)}
                            className="btn-control btn-control--pause"
                          >
                            Pause
                          </button>
                        )}
                        {file.progress.status === 'paused' && (
                          <button
                            type="button"
                            onClick={() => resumeUpload(file.id)}
                            className="btn-control btn-control--resume"
                          >
                            Resume
                          </button>
                        )}
                        {file.progress.status === 'error' && (
                          <button
                            type="button"
                            onClick={() => retryUpload(file.id)}
                            className="btn-control btn-control--retry"
                          >
                            Retry
                          </button>
                        )}
                        {(file.progress.status === 'pending' || file.progress.status === 'paused') && (
                          <button
                            type="button"
                            onClick={() => startUpload(file.id)}
                            className="btn-control btn-control--resume"
                          >
                            Start
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeFile(file)}
                          className="btn-control btn-control--cancel"
                          aria-label={`Remove ${file.name}`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    {file.progress.status !== 'pending' && (
                      <ProgressBar
                        progress={file.progress.percentage}
                        speed={file.progress.speed}
                        estimatedTimeRemaining={file.progress.estimatedTimeRemaining}
                        status={file.progress.status}
                        showDetails={true}
                      />
                    )}
                    {file.progress.errorMessage && (
                      <div className="file-error-message">
                        <span className="error-text">{file.progress.errorMessage}</span>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {rejectedFiles.length > 0 && (
        <div className="rejected-files">
          <div className="rejected-files-header">
            <h3>Rejected Files ({rejectedFiles.length})</h3>
            <button
              type="button"
              onClick={clearRejectedFiles}
              className="btn btn-secondary"
            >
              Clear
            </button>
          </div>
          <ul className="file-list">
            {rejectedFiles.map(({ file, errors }, index) => (
              <li key={`${file.name}-${index}`} className="file-item file-item--rejected">
                <div className="file-info">
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">{formatFileSize(file.size)}</span>
                </div>
                <div className="file-errors">
                  {errors.map((error, errorIndex) => (
                    <span key={errorIndex} className="error-message">
                      {error}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FileUploadComponent;