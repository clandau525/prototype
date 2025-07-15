import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All upload routes require authentication
router.use(authenticateToken);

// Placeholder routes - will be implemented in subsequent tasks
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'upload',
    timestamp: new Date().toISOString() 
  });
});

export { router as uploadRouter };