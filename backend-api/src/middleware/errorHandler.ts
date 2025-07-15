import { Request, Response, NextFunction } from 'express';
import { ValidationError } from 'express-validator';
import { logger } from '../utils/logger';
import { ErrorResponse } from '@shared/types';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: Record<string, any>;
}

export const errorHandler = (
  error: AppError | ValidationError[] | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestId = req.headers['x-request-id'] || 'unknown';

  // Handle validation errors from express-validator
  if (Array.isArray(error)) {
    const validationErrors = error.map(err => ({
      field: err.type === 'field' ? err.path : 'unknown',
      message: err.msg,
      value: err.type === 'field' ? err.value : undefined
    }));

    logger.warn('Validation error', {
      errors: validationErrors,
      requestId,
      path: req.path,
      method: req.method
    });

    const errorResponse: ErrorResponse = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: { validationErrors },
        timestamp: new Date(),
        requestId: requestId.toString()
      }
    };

    return res.status(400).json(errorResponse);
  }

  // Handle custom app errors
  if (error instanceof Error && 'statusCode' in error) {
    const appError = error as AppError;
    
    logger.error('Application error', {
      error: appError.message,
      code: appError.code,
      statusCode: appError.statusCode,
      stack: appError.stack,
      requestId,
      path: req.path,
      method: req.method
    });

    const errorResponse: ErrorResponse = {
      error: {
        code: appError.code || 'APPLICATION_ERROR',
        message: appError.message,
        details: appError.details,
        timestamp: new Date(),
        requestId: requestId.toString()
      }
    };

    return res.status(appError.statusCode || 500).json(errorResponse);
  }

  // Handle generic errors
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    requestId,
    path: req.path,
    method: req.method
  });

  const errorResponse: ErrorResponse = {
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      timestamp: new Date(),
      requestId: requestId.toString()
    }
  };

  res.status(500).json(errorResponse);
};

export const createAppError = (
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: Record<string, any>
): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
};