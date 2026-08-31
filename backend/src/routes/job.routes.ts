import { Router } from 'express';
import { listAvailableJobsController } from '../controllers/job.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { cacheMiddleware } from '../middleware/cache';
import { tripRateLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(tripRateLimiter);
router.get('/available', requireAuth, requireRole('carrier'), cacheMiddleware(30), asyncHandler(listAvailableJobsController));

export default router;
