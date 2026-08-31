import { Router } from 'express';
import { carrierGuidanceController, estimatePricingController } from '../controllers/pricing.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { cacheMiddleware } from '../middleware/cache';
import { tripRateLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(tripRateLimiter);
router.get('/estimate', cacheMiddleware(60), asyncHandler(estimatePricingController));
router.get('/carrier-guidance', requireAuth, requireRole('carrier'), asyncHandler(carrierGuidanceController));

export default router;
