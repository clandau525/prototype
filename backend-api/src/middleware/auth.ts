import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({
      error: {
        code: 'MISSING_TOKEN',
        message: 'Access token is required',
        timestamp: new Date(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience
    }) as JWTPayload;

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    logger.info('User authenticated', {
      userId: decoded.userId,
      email: decoded.email,
      requestId: req.headers['x-request-id']
    });

    next();
  } catch (error) {
    logger.warn('Token verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      token: token.substring(0, 20) + '...',
      requestId: req.headers['x-request-id']
    });

    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Access token has expired',
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] || 'unknown'
        }
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid access token',
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] || 'unknown'
        }
      });
    }

    return res.status(500).json({
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
        timestamp: new Date(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  }
};

export const generateToken = (payload: Omit<JWTPayload, 'iat' | 'exp' | 'iss' | 'aud'>): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
    issuer: config.jwt.issuer,
    audience: config.jwt.audience
  });
};