import { Router } from 'express';
import {
  analyticsLandingController,
  analyticsDwellController,
  analyticsFunnelController,
  analyticsSummaryController,
  analyticsTrendController,
  recordDwellController
} from '../controllers/analytics.controller';
import { requireInternalService } from '../middleware/internalService.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Public beacon endpoint (rate-limited, no auth) — called by frontend on page unload
router.post('/dwell', authRateLimiter, asyncHandler(recordDwellController));

// Admin analytics endpoints — protected by internal service token
router.use('/admin', requireInternalService);
router.get('/admin/all', asyncHandler(analyticsLandingController));
router.get('/admin/summary', asyncHandler(analyticsSummaryController));
router.get('/admin/funnel', asyncHandler(analyticsFunnelController));
router.get('/admin/dwell', asyncHandler(analyticsDwellController));
router.get('/admin/trend', asyncHandler(analyticsTrendController));

export default router;
