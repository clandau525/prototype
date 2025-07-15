import { validateFile, validateFiles, getFileTypeCategory, formatFileSize } from '../fileValidation';
import { MAX_FILE_SIZE } from '@shared/types';

// Mock file creation helper
const createMockFile = (name: string, size: number, type: string): File => {
  const file = new File([''], name, { type });
  Object.defineProperty(file, 'size', {
    value: size,
    writable: false,
  });
  return file;
};

describe('fileValidation', () => {
  describe('validateFile', () => {
    it('validates a correct PDF file', () => {
      const file = createMockFile('document.pdf', 1024 * 1024, 'application/pdf');
      const result = validateFile(file);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('validates a correct image file', () => {
      const file = createMockFile('image.png', 2048, 'image/png');
      const result = validateFile(file);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('validates a correct Word document', () => {
      const file = createMockFile('document.docx', 1024, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      const result = validateFile(file);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('validates a correct Excel file', () => {
      const file = createMockFile('spreadsheet.xlsx', 1024, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const result = validateFile(file);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects unsupported file type', () => {
      const file = createMockFile('video.mp4', 1024, 'video/mp4');
      const result = validateFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File type "video/mp4" is not supported');
    });

    it('rejects unsupported file extension', () => {
      const file = createMockFile('document.txt', 1024, 'text/plain');
      const result = validateFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File extension ".txt" is not supported');
    });

    it('rejects file that exceeds size limit', () => {
      const largeSize = MAX_FILE_SIZE + 1024;
      const file = createMockFile('large.pdf', largeSize, 'application/pdf');
      const result = validateFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('exceeds maximum allowed size'))).toBe(true);
    });

    it('rejects empty file', () => {
      const file = createMockFile('empty.pdf', 0, 'application/pdf');
      const result = validateFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File is empty');
    });

    it('accepts file with custom size limit', () => {
      const file = createMockFile('document.pdf', 5 * 1024 * 1024, 'application/pdf'); // 5MB
      const result = validateFile(file, { maxFileSize: 10 * 1024 * 1024 }); // 10MB limit
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects file with custom size limit', () => {
      const file = createMockFile('document.pdf', 15 * 1024 * 1024, 'application/pdf'); // 15MB
      const result = validateFile(file, { maxFileSize: 10 * 1024 * 1024 }); // 10MB limit
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('exceeds maximum allowed size'))).toBe(true);
    });
  });

  describe('validateFiles', () => {
    it('validates multiple correct files', () => {
      const files = [
        createMockFile('doc1.pdf', 1024, 'application/pdf'),
        createMockFile('doc2.png', 2048, 'image/png'),
        createMockFile('doc3.xlsx', 3072, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
      ];
      
      const result = validateFiles(files);
      
      expect(result.validFiles).toHaveLength(3);
      expect(result.invalidFiles).toHaveLength(0);
    });

    it('separates valid and invalid files', () => {
      const files = [
        createMockFile('valid.pdf', 1024, 'application/pdf'),
        createMockFile('invalid.txt', 2048, 'text/plain'),
        createMockFile('valid.png', 3072, 'image/png'),
      ];
      
      const result = validateFiles(files);
      
      expect(result.validFiles).toHaveLength(2);
      expect(result.invalidFiles).toHaveLength(1);
      expect(result.validFiles[0].name).toBe('valid.pdf');
      expect(result.validFiles[1].name).toBe('valid.png');
      expect(result.invalidFiles[0].file.name).toBe('invalid.txt');
    });

    it('rejects all files when total size exceeds limit', () => {
      const files = [
        createMockFile('doc1.pdf', 60 * 1024 * 1024, 'application/pdf'), // 60MB
        createMockFile('doc2.pdf', 50 * 1024 * 1024, 'application/pdf'), // 50MB
      ];
      
      const result = validateFiles(files, { maxTotalSize: 100 * 1024 * 1024 }); // 100MB limit
      
      expect(result.validFiles).toHaveLength(0);
      expect(result.invalidFiles).toHaveLength(2);
      expect(result.invalidFiles[0].errors.some(error => error.includes('Total upload size'))).toBe(true);
    });

    it('accepts files within total size limit', () => {
      const files = [
        createMockFile('doc1.pdf', 30 * 1024 * 1024, 'application/pdf'), // 30MB
        createMockFile('doc2.pdf', 40 * 1024 * 1024, 'application/pdf'), // 40MB
      ];
      
      const result = validateFiles(files, { maxTotalSize: 100 * 1024 * 1024 }); // 100MB limit
      
      expect(result.validFiles).toHaveLength(2);
      expect(result.invalidFiles).toHaveLength(0);
    });

    it('handles mixed validation scenarios', () => {
      const files = [
        createMockFile('valid.pdf', 10 * 1024 * 1024, 'application/pdf'), // Valid
        createMockFile('invalid.txt', 5 * 1024 * 1024, 'text/plain'), // Invalid type
        createMockFile('toolarge.pdf', 200 * 1024 * 1024, 'application/pdf'), // Too large
        createMockFile('empty.pdf', 0, 'application/pdf'), // Empty
      ];
      
      const result = validateFiles(files);
      
      expect(result.validFiles).toHaveLength(1);
      expect(result.invalidFiles).toHaveLength(3);
      expect(result.validFiles[0].name).toBe('valid.pdf');
    });
  });

  describe('getFileTypeCategory', () => {
    it('categorizes image files correctly', () => {
      const pngFile = createMockFile('image.png', 1024, 'image/png');
      const jpegFile = createMockFile('image.jpeg', 1024, 'image/jpeg');
      
      expect(getFileTypeCategory(pngFile)).toBe('image');
      expect(getFileTypeCategory(jpegFile)).toBe('image');
    });

    it('categorizes document files correctly', () => {
      const pdfFile = createMockFile('doc.pdf', 1024, 'application/pdf');
      const wordFile = createMockFile('doc.docx', 1024, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      
      expect(getFileTypeCategory(pdfFile)).toBe('document');
      expect(getFileTypeCategory(wordFile)).toBe('document');
    });

    it('categorizes spreadsheet files correctly', () => {
      const xlsFile = createMockFile('sheet.xls', 1024, 'application/vnd.ms-excel');
      const xlsxFile = createMockFile('sheet.xlsx', 1024, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      expect(getFileTypeCategory(xlsFile)).toBe('spreadsheet');
      expect(getFileTypeCategory(xlsxFile)).toBe('spreadsheet');
    });

    it('categorizes unknown files correctly', () => {
      const unknownFile = createMockFile('file.txt', 1024, 'text/plain');
      
      expect(getFileTypeCategory(unknownFile)).toBe('unknown');
    });
  });

  describe('formatFileSize', () => {
    it('formats bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(500)).toBe('500 Bytes');
      expect(formatFileSize(1023)).toBe('1023 Bytes');
    });

    it('formats kilobytes correctly', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(2048)).toBe('2 KB');
    });

    it('formats megabytes correctly', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
      expect(formatFileSize(10 * 1024 * 1024)).toBe('10 MB');
    });

    it('formats gigabytes correctly', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
      expect(formatFileSize(2.5 * 1024 * 1024 * 1024)).toBe('2.5 GB');
    });

    it('handles edge cases', () => {
      expect(formatFileSize(1023)).toBe('1023 Bytes');
      expect(formatFileSize(1025)).toBe('1 KB');
      expect(formatFileSize(1048575)).toBe('1024 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
    });
  });
});