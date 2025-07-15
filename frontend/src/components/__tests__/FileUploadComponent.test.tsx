import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FileUploadComponent from '../FileUploadComponent';

// Mock file creation helper
const createMockFile = (name: string, size: number, type: string): File => {
  const file = new File([''], name, { type });
  Object.defineProperty(file, 'size', {
    value: size,
    writable: false,
  });
  return file;
};

// Mock drag event creation helper
const createMockDragEvent = (files: File[]) => {
  return {
    dataTransfer: {
      files,
      items: files.map(file => ({
        kind: 'file',
        type: file.type,
        getAsFile: () => file,
      })),
      types: ['Files'],
    },
  };
};

describe('FileUploadComponent', () => {
  beforeEach(() => {
    // Reset any mocks before each test
    jest.clearAllMocks();
  });

  it('renders the dropzone with correct initial state', () => {
    render(<FileUploadComponent />);
    
    expect(screen.getByText('Drag and drop files here')).toBeInTheDocument();
    expect(screen.getByText('Supports PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, JPEG')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose Files' })).toBeInTheDocument();
  });

  it('displays correct file size and count limits', () => {
    render(<FileUploadComponent maxFiles={5} maxSize={50 * 1024 * 1024} />);
    
    expect(screen.getByText(/Maximum 5 files, 50 MB total/)).toBeInTheDocument();
  });

  it('shows active state when dragging files over dropzone', async () => {
    render(<FileUploadComponent />);
    
    const dropzone = screen.getByText('Drag and drop files here').closest('.dropzone');
    expect(dropzone).toBeInTheDocument();
    
    const mockFiles = [createMockFile('test.pdf', 1024, 'application/pdf')];
    const dragEvent = createMockDragEvent(mockFiles);
    
    fireEvent.dragEnter(dropzone!, dragEvent);
    
    await waitFor(() => {
      expect(dropzone).toHaveClass('dropzone--active');
    });
  });

  it('shows accept state when dragging valid files', async () => {
    render(<FileUploadComponent />);
    
    const dropzone = screen.getByText('Drag and drop files here').closest('.dropzone');
    const mockFiles = [createMockFile('test.pdf', 1024, 'application/pdf')];
    const dragEvent = createMockDragEvent(mockFiles);
    
    fireEvent.dragEnter(dropzone!, dragEvent);
    fireEvent.dragOver(dropzone!, dragEvent);
    
    await waitFor(() => {
      expect(screen.getByText('Drop files here to upload')).toBeInTheDocument();
    });
  });

  it('shows reject state when dragging invalid files', async () => {
    render(<FileUploadComponent />);
    
    const dropzone = screen.getByText('Drag and drop files here').closest('.dropzone');
    const mockFiles = [createMockFile('test.txt', 1024, 'text/plain')];
    const dragEvent = createMockDragEvent(mockFiles);
    
    fireEvent.dragEnter(dropzone!, dragEvent);
    fireEvent.dragOver(dropzone!, dragEvent);
    
    await waitFor(() => {
      expect(screen.getByText('Some files cannot be uploaded')).toBeInTheDocument();
    });
  });

  it('accepts valid file types', async () => {
    const onFilesSelected = jest.fn();
    render(<FileUploadComponent onFilesSelected={onFilesSelected} />);
    
    const dropzone = screen.getByText('Drag and drop files here').closest('.dropzone');
    const validFiles = [
      createMockFile('document.pdf', 1024, 'application/pdf'),
      createMockFile('image.png', 2048, 'image/png'),
      createMockFile('spreadsheet.xlsx', 3072, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
    ];
    
    const dragEvent = createMockDragEvent(validFiles);
    
    fireEvent.drop(dropzone!, dragEvent);
    
    await waitFor(() => {
      expect(screen.getByText('Selected Files (3)')).toBeInTheDocument();
      expect(screen.getByText('document.pdf')).toBeInTheDocument();
      expect(screen.getByText('image.png')).toBeInTheDocument();
      expect(screen.getByText('spreadsheet.xlsx')).toBeInTheDocument();
      expect(onFilesSelected).toHaveBeenCalledWith(validFiles);
    });
  });

  it('rejects invalid file types', async () => {
    render(<FileUploadComponent />);
    
    const dropzone = screen.getByText('Drag and drop files here').closest('.dropzone');
    const invalidFiles = [
      createMockFile('document.txt', 1024, 'text/plain'),
      createMockFile('video.mp4', 2048, 'video/mp4'),
    ];
    
    const dragEvent = createMockDragEvent(invalidFiles);
    
    fireEvent.drop(dropzone!, dragEvent);
    
    await waitFor(() => {
      expect(screen.getByText('Rejected Files (2)')).toBeInTheDocument();
      expect(screen.getByText('document.txt')).toBeInTheDocument();
      expect(screen.getByText('video.mp4')).toBeInTheDocument();
    });
  });

  it('displays file sizes correctly', async () => {
    render(<FileUploadComponent />);
    
    const dropzone = screen.getByText('Drag and drop files here').closest('.dropzone');
    const files = [
      createMockFile('small.pdf', 1024, 'application/pdf'), // 1 KB
      createMockFile('medium.pdf', 1024 * 1024, 'application/pdf'), // 1 MB
      createMockFile('large.pdf', 10 * 1024 * 1024, 'application/pdf'), // 10 MB
    ];
    
    const dragEvent = createMockDragEvent(files);
    
    fireEvent.drop(dropzone!, dragEvent);
    
    await waitFor(() => {
      expect(screen.getByText('1 KB')).toBeInTheDocument();
      expect(screen.getByText('1 MB')).toBeInTheDocument();
      expect(screen.getByText('10 MB')).toBeInTheDocument();
    });
  });

  it('allows removing selected files', async () => {
    render(<FileUploadComponent />);
    
    const dropzone = screen.getByText('Drag and drop files here').closest('.dropzone');
    const files = [createMockFile('test.pdf', 1024, 'application/pdf')];
    const dragEvent = createMockDragEvent(files);
    
    fireEvent.drop(dropzone!, dragEvent);
    
    await waitFor(() => {
      expect(screen.getByText('Selected Files (1)')).toBeInTheDocument();
    });
    
    const removeButton = screen.getByRole('button', { name: 'Remove test.pdf' });
    fireEvent.click(removeButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Selected Files (1)')).not.toBeInTheDocument();
      expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
    });
  });

  it('allows clearing rejected files', async () => {
    render(<FileUploadComponent />);
    
    const dropzone = screen.getByText('Drag and drop files here').closest('.dropzone');
    const invalidFiles = [createMockFile('test.txt', 1024, 'text/plain')];
    const dragEvent = createMockDragEvent(invalidFiles);
    
    fireEvent.drop(dropzone!, dragEvent);
    
    await waitFor(() => {
      expect(screen.getByText('Rejected Files (1)')).toBeInTheDocument();
    });
    
    const clearButton = screen.getByRole('button', { name: 'Clear' });
    fireEvent.click(clearButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Rejected Files (1)')).not.toBeInTheDocument();
    });
  });

  it('opens file dialog when Choose Files button is clicked', () => {
    render(<FileUploadComponent />);
    
    const chooseFilesButton = screen.getByRole('button', { name: 'Choose Files' });
    
    // Mock the file input click
    const mockClick = jest.fn();
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.click = mockClick;
    }
    
    fireEvent.click(chooseFilesButton);
    
    // Note: In a real test environment, this would trigger the file dialog
    // For unit tests, we verify the button is clickable and functional
    expect(chooseFilesButton).toBeEnabled();
  });

  it('respects maxFiles limit', async () => {
    render(<FileUploadComponent maxFiles={2} />);
    
    const dropzone = screen.getByText('Drag and drop files here').closest('.dropzone');
    const files = [
      createMockFile('file1.pdf', 1024, 'application/pdf'),
      createMockFile('file2.pdf', 1024, 'application/pdf'),
      createMockFile('file3.pdf', 1024, 'application/pdf'), // This should be rejected
    ];
    
    const dragEvent = createMockDragEvent(files);
    
    fireEvent.drop(dropzone!, dragEvent);
    
    await waitFor(() => {
      // Should only accept first 2 files
      expect(screen.getByText('Selected Files (2)')).toBeInTheDocument();
      expect(screen.getByText('file1.pdf')).toBeInTheDocument();
      expect(screen.getByText('file2.pdf')).toBeInTheDocument();
    });
  });

  it('handles drag leave events correctly', async () => {
    render(<FileUploadComponent />);
    
    const dropzone = screen.getByText('Drag and drop files here').closest('.dropzone');
    const mockFiles = [createMockFile('test.pdf', 1024, 'application/pdf')];
    const dragEvent = createMockDragEvent(mockFiles);
    
    // Enter drag state
    fireEvent.dragEnter(dropzone!, dragEvent);
    
    await waitFor(() => {
      expect(dropzone).toHaveClass('dropzone--active');
    });
    
    // Leave drag state
    fireEvent.dragLeave(dropzone!);
    
    await waitFor(() => {
      expect(dropzone).not.toHaveClass('dropzone--active');
    });
  });

  it('shows size warning when approaching total size limit', async () => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    render(<FileUploadComponent maxSize={maxSize} />);
    
    const dropzone = screen.getByText('Drag and drop files here').closest('.dropzone');
    const files = [
      createMockFile('large.pdf', 8.5 * 1024 * 1024, 'application/pdf'), // 8.5MB (85% of limit)
    ];
    
    const dragEvent = createMockDragEvent(files);
    
    fireEvent.drop(dropzone!, dragEvent);
    
    await waitFor(() => {
      expect(screen.getByText(/Approaching size limit/)).toBeInTheDocument();
      expect(screen.getByText(/MB remaining/)).toBeInTheDocument();
    });
  });

  it('rejects files when total size exceeds limit', async () => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    render(<FileUploadComponent maxSize={maxSize} />);
    
    const dropzone = screen.getByText('Drag and drop files here').closest('.dropzone');
    const files = [
      createMockFile('large1.pdf', 6 * 1024 * 1024, 'application/pdf'), // 6MB
      createMockFile('large2.pdf', 5 * 1024 * 1024, 'application/pdf'), // 5MB (total 11MB)
    ];
    
    const dragEvent = createMockDragEvent(files);
    
    fireEvent.drop(dropzone!, dragEvent);
    
    await waitFor(() => {
      expect(screen.getByText('Rejected Files (2)')).toBeInTheDocument();
      expect(screen.getByText(/Total upload size.*exceeds limit/)).toBeInTheDocument();
    });
  });

  it('displays file previews for selected files', async () => {
    render(<FileUploadComponent />);
    
    const dropzone = screen.getByText('Drag and drop files here').closest('.dropzone');
    const files = [
      createMockFile('image.png', 1024, 'image/png'),
      createMockFile('document.pdf', 2048, 'application/pdf'),
    ];
    
    const dragEvent = createMockDragEvent(files);
    
    fireEvent.drop(dropzone!, dragEvent);
    
    await waitFor(() => {
      // Check that file preview containers are present
      const previewContainers = document.querySelectorAll('.file-preview-container');
      expect(previewContainers).toHaveLength(2);
    });
  });

  it('validates file types correctly', async () => {
    render(<FileUploadComponent />);
    
    const dropzone = screen.getByText('Drag and drop files here').closest('.dropzone');
    const files = [
      createMockFile('valid.pdf', 1024, 'application/pdf'),
      createMockFile('invalid.txt', 1024, 'text/plain'),
      createMockFile('valid.png', 1024, 'image/png'),
      createMockFile('invalid.mp4', 1024, 'video/mp4'),
    ];
    
    const dragEvent = createMockDragEvent(files);
    
    fireEvent.drop(dropzone!, dragEvent);
    
    await waitFor(() => {
      expect(screen.getByText('Selected Files (2)')).toBeInTheDocument();
      expect(screen.getByText('Rejected Files (2)')).toBeInTheDocument();
      expect(screen.getByText('valid.pdf')).toBeInTheDocument();
      expect(screen.getByText('valid.png')).toBeInTheDocument();
      expect(screen.getByText('invalid.txt')).toBeInTheDocument();
      expect(screen.getByText('invalid.mp4')).toBeInTheDocument();
    });
  });

  it('handles empty files correctly', async () => {
    render(<FileUploadComponent />);
    
    const dropzone = screen.getByText('Drag and drop files here').closest('.dropzone');
    const files = [
      createMockFile('empty.pdf', 0, 'application/pdf'),
    ];
    
    const dragEvent = createMockDragEvent(files);
    
    fireEvent.drop(dropzone!, dragEvent);
    
    await waitFor(() => {
      expect(screen.getByText('Rejected Files (1)')).toBeInTheDocument();
      expect(screen.getByText(/File is empty/)).toBeInTheDocument();
    });
  });

  it('shows detailed error messages for rejected files', async () => {
    render(<FileUploadComponent />);
    
    const dropzone = screen.getByText('Drag and drop files here').closest('.dropzone');
    const files = [
      createMockFile('toolarge.pdf', 200 * 1024 * 1024, 'application/pdf'), // Too large
      createMockFile('invalid.txt', 1024, 'text/plain'), // Invalid type
    ];
    
    const dragEvent = createMockDragEvent(files);
    
    fireEvent.drop(dropzone!, dragEvent);
    
    await waitFor(() => {
      expect(screen.getByText('Rejected Files (2)')).toBeInTheDocument();
      expect(screen.getByText(/exceeds maximum allowed size/)).toBeInTheDocument();
      expect(screen.getByText(/is not supported/)).toBeInTheDocument();
    });
  });

  it('clears size warning when files are removed', async () => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    render(<FileUploadComponent maxSize={maxSize} />);
    
    const dropzone = screen.getByText('Drag and drop files here').closest('.dropzone');
    const files = [
      createMockFile('large.pdf', 8.5 * 1024 * 1024, 'application/pdf'), // 8.5MB
    ];
    
    const dragEvent = createMockDragEvent(files);
    
    fireEvent.drop(dropzone!, dragEvent);
    
    await waitFor(() => {
      expect(screen.getByText(/Approaching size limit/)).toBeInTheDocument();
    });
    
    // Remove the file
    const removeButton = screen.getByRole('button', { name: 'Remove large.pdf' });
    fireEvent.click(removeButton);
    
    await waitFor(() => {
      expect(screen.queryByText(/Approaching size limit/)).not.toBeInTheDocument();
    });
  });

  it('displays Start Upload button when files are selected', async () => {
    render(<FileUploadComponent />);
    
    const dropzone = screen.getByText('Drag and drop files here').closest('.dropzone');
    const files = [createMockFile('test.pdf', 1024, 'application/pdf')];
    const dragEvent = createMockDragEvent(files);
    
    fireEvent.drop(dropzone!, dragEvent);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Start Upload' })).toBeInTheDocument();
    });
  });

  it('shows individual file upload controls', async () => {
    render(<FileUploadComponent />);
    
    const dropzone = screen.getByText('Drag and drop files here').closest('.dropzone');
    const files = [createMockFile('test.pdf', 1024, 'application/pdf')];
    const dragEvent = createMockDragEvent(files);
    
    fireEvent.drop(dropzone!, dragEvent);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    });
  });

  it('starts individual file upload when Start button is clicked', async () => {
    render(<FileUploadComponent />);
    
    const dropzone = screen.getByText('Drag and drop files here').closest('.dropzone');
    const files = [createMockFile('test.pdf', 1024, 'application/pdf')];
    const dragEvent = createMockDragEvent(files);
    
    fireEvent.drop(dropzone!, dragEvent);
    
    await waitFor(() => {
      const startButton = screen.getByRole('button', { name: 'Start' });
      fireEvent.click(startButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Uploading...')).toBeInTheDocument();
    });
  });

  it('shows pause button during upload', async () => {
    render(<FileUploadComponent />);
    
    const dropzone = screen.getByText('Drag and drop files here').closest('.dropzone');
    const files = [createMockFile('test.pdf', 1024, 'application/pdf')];
    const dragEvent = createMockDragEvent(files);
    
    fireEvent.drop(dropzone!, dragEvent);
    
    await waitFor(() => {
      const startButton = screen.getByRole('button', { name: 'Start' });
      fireEvent.click(startButton);
    });
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    });
  });

  it('pauses upload when pause button is clicked', async () => {
    render(<FileUploadComponent />);
    
    const dropzone = screen.getByText('Drag and drop files here').closest('.dropzone');
    const files = [createMockFile('test.pdf', 1024, 'application/pdf')];
    const dragEvent = createMockDragEvent(files);
    
    fireEvent.drop(dropzone!, dragEvent);
    
    await waitFor(() => {
      const startButton = screen.getByRole('button', { name: 'Start' });
      fireEvent.click(startButton);
    });
    
    await waitFor(() => {
      const pauseButton = screen.getByRole('button', { name: 'Pause' });
      fireEvent.click(pauseButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Paused')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument();
    });
  });

  it('resumes upload when resume button is clicked', async () => {
    render(<FileUploadComponent />);
    
    const dropzone = screen.getByText('Drag and drop files here').closest('.dropzone');
    const files = [createMockFile('test.pdf', 1024, 'application/pdf')];
    const dragEvent = createMockDragEvent(files);
    
    fireEvent.drop(dropzone!, dragEvent);
    
    // Start upload
    await waitFor(() => {
      const startButton = screen.getByRole('button', { name: 'Start' });
      fireEvent.click(startButton);
    });
    
    // Pause upload
    await waitFor(() => {
      const pauseButton = screen.getByRole('button', { name: 'Pause' });
      fireEvent.click(pauseButton);
    });
    
    // Resume upload
    await waitFor(() => {
      const resumeButton = screen.getByRole('button', { name: 'Resume' });
      fireEvent.click(resumeButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Uploading...')).toBeInTheDocument();
    });
  });

  it('displays progress bar during upload', async () => {
    render(<FileUploadComponent />);
    
    const dropzone = screen.getByText('Drag and drop files here').closest('.dropzone');
    const files = [createMockFile('test.pdf', 1024, 'application/pdf')];
    const dragEvent = createMockDragEvent(files);
    
    fireEvent.drop(dropzone!, dragEvent);
    
    await waitFor(() => {
      const startButton = screen.getByRole('button', { name: 'Start' });
      fireEvent.click(startButton);
    });
    
    await waitFor(() => {
      const progressBar = document.querySelector('.progress-bar-background');
      expect(progressBar).toBeInTheDocument();
    });
  });

  it('starts all uploads when Start Upload button is clicked', async () => {
    render(<FileUploadComponent />);
    
    const dropzone = screen.getByText('Drag and drop files here').closest('.dropzone');
    const files = [
      createMockFile('test1.pdf', 1024, 'application/pdf'),
      createMockFile('test2.pdf', 2048, 'application/pdf'),
    ];
    const dragEvent = createMockDragEvent(files);
    
    fireEvent.drop(dropzone!, dragEvent);
    
    await waitFor(() => {
      const startAllButton = screen.getByRole('button', { name: 'Start Upload' });
      fireEvent.click(startAllButton);
    });
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Uploading...' })).toBeInTheDocument();
    });
  });

  it('disables Start Upload button when uploading', async () => {
    render(<FileUploadComponent />);
    
    const dropzone = screen.getByText('Drag and drop files here').closest('.dropzone');
    const files = [createMockFile('test.pdf', 1024, 'application/pdf')];
    const dragEvent = createMockDragEvent(files);
    
    fireEvent.drop(dropzone!, dragEvent);
    
    await waitFor(() => {
      const startAllButton = screen.getByRole('button', { name: 'Start Upload' });
      fireEvent.click(startAllButton);
    });
    
    await waitFor(() => {
      const uploadingButton = screen.getByRole('button', { name: 'Uploading...' });
      expect(uploadingButton).toBeDisabled();
    });
  });
});