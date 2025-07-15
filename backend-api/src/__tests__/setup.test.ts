import { config } from '../config';
import { logger } from '../utils/logger';
import { generateToken, authenticateToken } from '../middleware/auth';
import { createAppError } from '../middleware/errorHandler';

describe('Backend Setup Validation', () => {
  describe('Configuration', () => {
    it('should load configuration correctly', () => {
      expect(config).toBeDefined();
      expect(config.port).toBe(3001);
      expect(config.jwt.secret).toBeDefined();
      expect(config.cors.origin).toBeDefined();
    });
  });

  describe('Logger', () => {
    it('should create logger instance', () => {
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
    });
  });

  describe('JWT Functions', () => {
    it('should generate valid JWT token', () => {
      const payload = {
        userId: 'test-user',
        email: 'test@example.com',
        role: 'user'
      };

      const token = generateToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });
  });

  describe('Error Handling', () => {
    it('should create app error correctly', () => {
      const error = createAppError('Test error', 400, 'TEST_ERROR', { test: true });
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.details).toEqual({ test: true });
    });
  });

  describe('Middleware Functions', () => {
    it('should export authentication middleware', () => {
      expect(authenticateToken).toBeDefined();
      expect(typeof authenticateToken).toBe('function');
    });
  });
});