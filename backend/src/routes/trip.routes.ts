import { Router } from 'express';
import {
  confirmDepositController,
  createTripController,
  deleteTripController,
  getTripController,
  listTripsController,
  myTripsController,
  payDepositController,
  updateTripController
} from '../controllers/trip.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { tripRateLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { createTripSchema, updateTripSchema } from '../validators/trip.validators';

const router = Router();

router.use(tripRateLimiter);

router.post('/', requireAuth, requireRole('carrier'), validate(createTripSchema), asyncHandler(createTripController));
router.get('/', requireAuth, asyncHandler(listTripsController));
router.get('/my', requireAuth, asyncHandler(myTripsController));
router.get('/:tripId', requireAuth, asyncHandler(getTripController));
router.put('/:tripId', requireAuth, requireRole('carrier'), validate(updateTripSchema), asyncHandler(updateTripController));
router.delete('/:tripId', requireAuth, requireRole('carrier'), asyncHandler(deleteTripController));
router.post('/:tripId/pay-deposit', requireAuth, requireRole('carrier'), asyncHandler(payDepositController));
router.post('/:tripId/confirm-deposit', requireAuth, requireRole('carrier'), asyncHandler(confirmDepositController));

export default router;
