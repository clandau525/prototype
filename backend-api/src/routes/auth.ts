import { Router } from 'express';
import { body } from 'express-validator';
import { generateToken, authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { logger } from '../utils/logger';

const router = Router();

// Mock user database (in production, this would be a real database)
const mockUsers = [
  {
    userId: '1',
    email: 'user@example.com',
    password: 'password123', // In production, this would be hashed
    role: 'user'
  },
  {
    userId: '2',
    email: 'admin@example.com',
    password: 'admin123', // In production, this would be hashed
    role: 'admin'
  }
];

// Login endpoint
router.post('/login',
  validate([
    body('email')
      .isEmail()
      .withMessage('Valid email is required')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
  ]),
  (req, res) => {
    const { email, password } = req.body;

    // Find user (in production, use proper password hashing)
    const user = mockUsers.find(u => u.email === email && u.password === password);

    if (!user) {
      logger.warn('Login attempt failed', {
        email,
        requestId: req.headers['x-request-id']
      });

      res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] || 'unknown'
        }
      });
      return;
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.userId,
      email: user.email,
      role: user.role
    });

    logger.info('User logged in successfully', {
      userId: user.userId,
      email: user.email,
      requestId: req.headers['x-request-id']
    });

    res.json({
      token,
      user: {
        userId: user.userId,
        email: user.email,
        role: user.role
      }
    });
  }
);

// Get current user profile
router.get('/profile', authenticateToken, (req: AuthenticatedRequest, res) => {
  res.json({
    user: req.user
  });
});

// Verify token endpoint
router.post('/verify', authenticateToken, (req: AuthenticatedRequest, res) => {
  res.json({
    valid: true,
    user: req.user
  });
});

export { router as authRouter };