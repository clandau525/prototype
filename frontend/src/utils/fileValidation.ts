import { SUPPORTED_FILE_TYPES, SUPPORTED_FILE_EXTENSIONS, MAX_FILE_SIZE } from '@shared/types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FileValidationOptions {
  maxFileSize?: number;
  maxTotalSize?: number;
  allowedTypes?: readonly string[];
  allowedExtensions?: readonly string[];
}

export const validateFile = (
  file: File,
  options: FileValidationOptions = {}
): ValidationResult => {
  const {
    maxFileSize = MAX_FILE_SIZE,
    allowedTypes = SUPPORTED_FILE_TYPES,
    allowedExtensions = SUPPORTED_FILE_EXTENSIONS,
  } = options;

  const errors: string[] = [];

  // Check file size
  if (file.size > maxFileSize) {
    const maxSizeMB = Math.round(maxFileSize / (1024 * 1024));
    const fileSizeMB = Math.round(file.size / (1024 * 1024));
    errors.push(`File size (${fileSizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB)`);
  }

  // Check file type
  if (!allowedTypes.includes(file.type as any)) {
    errors.push(`File type "${file.type}" is not supported`);
  }

  // Check file extension as fallback
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!allowedExtensions.includes(fileExtension as any)) {
    errors.push(`File extension "${fileExtension}" is not supported`);
  }

  // Check for empty file
  if (file.size === 0) {
    errors.push('File is empty');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateFiles = (
  files: File[],
  options: FileValidationOptions = {}
): { validFiles: File[]; invalidFiles: Array<{ file: File; errors: string[] }> } => {
  const { maxTotalSize = MAX_FILE_SIZE } = options;
  
  const validFiles: File[] = [];
  const invalidFiles: Array<{ file: File; errors: string[] }> = [];

  // Validate individual files
  files.forEach(file => {
    const result = validateFile(file, options);
    if (result.isValid) {
      validFiles.push(file);
    } else {
      invalidFiles.push({ file, errors: result.errors });
    }
  });

  // Check total size
  const totalSize = validFiles.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > maxTotalSize) {
    const totalSizeMB = Math.round(totalSize / (1024 * 1024));
    const maxTotalSizeMB = Math.round(maxTotalSize / (1024 * 1024));
    
    // Move all files to invalid if total size exceeds limit
    validFiles.forEach(file => {
      invalidFiles.push({
        file,
        errors: [`Total upload size (${totalSizeMB}MB) exceeds limit (${maxTotalSizeMB}MB)`]
      });
    });
    
    return { validFiles: [], invalidFiles };
  }

  return { validFiles, invalidFiles };
};

export const getFileTypeCategory = (file: File): 'image' | 'document' | 'spreadsheet' | 'unknown' => {
  if (file.type.startsWith('image/')) {
    return 'image';
  }
  
  if (file.type.includes('pdf') || file.type.includes('word')) {
    return 'document';
  }
  
  if (file.type.includes('excel') || file.type.includes('spreadsheet')) {
    return 'spreadsheet';
  }
  
  return 'unknown';
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};