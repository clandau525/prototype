import React from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  speed?: number; // bytes per second
  estimatedTimeRemaining?: number; // seconds
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'error';
  className?: string;
  showDetails?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  speed,
  estimatedTimeRemaining,
  status,
  className = '',
  showDetails = true,
}) => {
  const formatSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`;
    if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.ceil(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getProgressBarColor = () => {
    switch (status) {
      case 'completed':
        return '#10b981'; // green
      case 'error':
        return '#ef4444'; // red
      case 'paused':
        return '#f59e0b'; // yellow
      case 'uploading':
        return '#3b82f6'; // blue
      default:
        return '#d1d5db'; // gray
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'pending':
        return 'Pending...';
      case 'uploading':
        return 'Uploading...';
      case 'paused':
        return 'Paused';
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Error';
      default:
        return '';
    }
  };

  return (
    <div className={`progress-container ${className}`}>
      <div className="progress-bar-wrapper">
        <div className="progress-bar-background">
          <div
            className="progress-bar-fill"
            style={{
              width: `${Math.min(100, Math.max(0, progress))}%`,
              backgroundColor: getProgressBarColor(),
            }}
          />
        </div>
        <div className="progress-percentage">
          {Math.round(progress)}%
        </div>
      </div>
      
      {showDetails && (
        <div className="progress-details">
          <span className="progress-status">{getStatusText()}</span>
          {speed && speed > 0 && status === 'uploading' && (
            <span className="progress-speed">{formatSpeed(speed)}</span>
          )}
          {estimatedTimeRemaining && estimatedTimeRemaining > 0 && status === 'uploading' && (
            <span className="progress-eta">ETA: {formatTime(estimatedTimeRemaining)}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default ProgressBar;