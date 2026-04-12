import { Router } from 'express';
import { routeController, selectSuggestionController, suggestController } from '../controllers/maps.controller';
import { mapsRateLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(mapsRateLimiter);

router.get('/suggest', asyncHandler(suggestController));
router.post('/select', asyncHandler(selectSuggestionController));
router.get('/route', asyncHandler(routeController));

export default router;
