/**
 * Core data models for the file upload system
 * These interfaces define the structure of data shared across services
 */

export interface UploadSession {
  sessionId: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  status: 'active' | 'completed' | 'expired';
  totalFiles: number;
  totalSize: number;
  metadata: Record<string, any>;
}

export interface FileUpload {
  fileId: string;
  sessionId: string;
  originalName: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: Date;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  checksum: string;
  metadata: {
    dimensions?: { width: number; height: number };
    pageCount?: number;
    extractedText?: string;
  };
}

export interface UploadProgress {
  fileId: string;
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;
  speed: number; // bytes per second
  estimatedTimeRemaining: number; // seconds
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'error';
  errorMessage?: string;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: Date;
    requestId: string;
  };
}

// Supported file types
export const SUPPORTED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'image/jpg'
] as const;

export const SUPPORTED_FILE_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.png',
  '.jpg',
  '.jpeg'
] as const;

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes
export const SESSION_EXPIRY_HOURS = 24;