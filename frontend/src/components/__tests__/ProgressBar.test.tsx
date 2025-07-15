import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProgressBar from '../ProgressBar';

describe('ProgressBar', () => {
  it('renders with basic progress information', () => {
    render(
      <ProgressBar
        progress={50}
        status="uploading"
      />
    );
    
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('Uploading...')).toBeInTheDocument();
  });

  it('displays speed information when provided', () => {
    render(
      <ProgressBar
        progress={25}
        speed={1024 * 1024} // 1 MB/s
        status="uploading"
      />
    );
    
    expect(screen.getByText('1.0 MB/s')).toBeInTheDocument();
  });

  it('displays estimated time remaining when provided', () => {
    render(
      <ProgressBar
        progress={75}
        speed={1024 * 1024}
        estimatedTimeRemaining={30}
        status="uploading"
      />
    );
    
    expect(screen.getByText('ETA: 30s')).toBeInTheDocument();
  });

  it('formats speed correctly for different units', () => {
    const { rerender } = render(
      <ProgressBar progress={50} speed={500} status="uploading" />
    );
    expect(screen.getByText('500 B/s')).toBeInTheDocument();

    rerender(<ProgressBar progress={50} speed={1536} status="uploading" />);
    expect(screen.getByText('1.5 KB/s')).toBeInTheDocument();

    rerender(<ProgressBar progress={50} speed={2 * 1024 * 1024} status="uploading" />);
    expect(screen.getByText('2.0 MB/s')).toBeInTheDocument();
  });

  it('formats time correctly for different durations', () => {
    const { rerender } = render(
      <ProgressBar progress={50} estimatedTimeRemaining={30} status="uploading" />
    );
    expect(screen.getByText('ETA: 30s')).toBeInTheDocument();

    rerender(<ProgressBar progress={50} estimatedTimeRemaining={90} status="uploading" />);
    expect(screen.getByText('ETA: 1m 30s')).toBeInTheDocument();

    rerender(<ProgressBar progress={50} estimatedTimeRemaining={125} status="uploading" />);
    expect(screen.getByText('ETA: 2m 5s')).toBeInTheDocument();
  });

  it('shows correct status text for different states', () => {
    const { rerender } = render(
      <ProgressBar progress={0} status="pending" />
    );
    expect(screen.getByText('Pending...')).toBeInTheDocument();

    rerender(<ProgressBar progress={50} status="uploading" />);
    expect(screen.getByText('Uploading...')).toBeInTheDocument();

    rerender(<ProgressBar progress={50} status="paused" />);
    expect(screen.getByText('Paused')).toBeInTheDocument();

    rerender(<ProgressBar progress={100} status="completed" />);
    expect(screen.getByText('Completed')).toBeInTheDocument();

    rerender(<ProgressBar progress={25} status="error" />);
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('applies correct progress bar colors for different states', () => {
    const { rerender } = render(
      <ProgressBar progress={50} status="uploading" />
    );
    
    const progressFill = document.querySelector('.progress-bar-fill');
    expect(progressFill).toHaveStyle('background-color: #3b82f6'); // blue

    rerender(<ProgressBar progress={100} status="completed" />);
    expect(progressFill).toHaveStyle('background-color: #10b981'); // green

    rerender(<ProgressBar progress={25} status="error" />);
    expect(progressFill).toHaveStyle('background-color: #ef4444'); // red

    rerender(<ProgressBar progress={50} status="paused" />);
    expect(progressFill).toHaveStyle('background-color: #f59e0b'); // yellow
  });

  it('sets correct progress bar width', () => {
    const { rerender } = render(
      <ProgressBar progress={25} status="uploading" />
    );
    
    const progressFill = document.querySelector('.progress-bar-fill');
    expect(progressFill).toHaveStyle('width: 25%');

    rerender(<ProgressBar progress={75} status="uploading" />);
    expect(progressFill).toHaveStyle('width: 75%');

    rerender(<ProgressBar progress={100} status="completed" />);
    expect(progressFill).toHaveStyle('width: 100%');
  });

  it('handles edge cases for progress values', () => {
    const { rerender } = render(
      <ProgressBar progress={-10} status="uploading" />
    );
    
    const progressFill = document.querySelector('.progress-bar-fill');
    expect(progressFill).toHaveStyle('width: 0%');

    rerender(<ProgressBar progress={150} status="uploading" />);
    expect(progressFill).toHaveStyle('width: 100%');
  });

  it('hides details when showDetails is false', () => {
    render(
      <ProgressBar
        progress={50}
        speed={1024 * 1024}
        estimatedTimeRemaining={30}
        status="uploading"
        showDetails={false}
      />
    );
    
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.queryByText('Uploading...')).not.toBeInTheDocument();
    expect(screen.queryByText('1.0 MB/s')).not.toBeInTheDocument();
    expect(screen.queryByText('ETA: 30s')).not.toBeInTheDocument();
  });

  it('does not show speed and ETA for non-uploading states', () => {
    const { rerender } = render(
      <ProgressBar
        progress={50}
        speed={1024 * 1024}
        estimatedTimeRemaining={30}
        status="paused"
      />
    );
    
    expect(screen.getByText('Paused')).toBeInTheDocument();
    expect(screen.queryByText('1.0 MB/s')).not.toBeInTheDocument();
    expect(screen.queryByText('ETA: 30s')).not.toBeInTheDocument();

    rerender(
      <ProgressBar
        progress={100}
        speed={1024 * 1024}
        estimatedTimeRemaining={30}
        status="completed"
      />
    );
    
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.queryByText('1.0 MB/s')).not.toBeInTheDocument();
    expect(screen.queryByText('ETA: 30s')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <ProgressBar
        progress={50}
        status="uploading"
        className="custom-progress"
      />
    );
    
    const container = document.querySelector('.progress-container');
    expect(container).toHaveClass('custom-progress');
  });

  it('handles zero speed gracefully', () => {
    render(
      <ProgressBar
        progress={50}
        speed={0}
        status="uploading"
      />
    );
    
    expect(screen.queryByText(/\/s/)).not.toBeInTheDocument();
  });

  it('handles zero ETA gracefully', () => {
    render(
      <ProgressBar
        progress={50}
        estimatedTimeRemaining={0}
        status="uploading"
      />
    );
    
    expect(screen.queryByText(/ETA:/)).not.toBeInTheDocument();
  });
});