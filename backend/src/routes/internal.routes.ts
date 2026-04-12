import { Router } from 'express';
import { requireInternalService } from '../middleware/internalService.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { findMatches, matchTripAgainstPendingRequests } from '../services/matching.service';

const router = Router();

router.use(requireInternalService);

router.post(
  '/matching/delivery-requests/:requestId',
  asyncHandler(async (req, res) => {
    const matches = await findMatches(req.params.requestId);
    res.status(202).json({
      success: true,
      processed: matches.length,
      requestId: req.params.requestId
    });
  })
);

router.post(
  '/matching/trips/:tripId',
  asyncHandler(async (req, res) => {
    const matches = await matchTripAgainstPendingRequests(req.params.tripId);
    res.status(202).json({
      success: true,
      processed: matches.length,
      tripId: req.params.tripId
    });
  })
);

export default router;
