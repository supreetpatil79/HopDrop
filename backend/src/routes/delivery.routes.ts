import { Router } from 'express';
import {
  confirmPayDeliveryController,
  createDeliveryController,
  deleteDeliveryController,
  deliveryMatchesController,
  getDeliveryController,
  listDeliveriesController,
  myDeliveriesController,
  payDeliveryController,
  updateDeliveryController
} from '../controllers/delivery.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { deliveryRateLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { createDeliverySchema, updateDeliverySchema } from '../validators/delivery.validators';

const router = Router();

router.use(deliveryRateLimiter);

router.post('/', requireAuth, validate(createDeliverySchema), asyncHandler(createDeliveryController));
router.get('/', requireAuth, requireRole('admin'), asyncHandler(listDeliveriesController));
router.get('/my', requireAuth, asyncHandler(myDeliveriesController));
router.get('/:requestId', requireAuth, asyncHandler(getDeliveryController));
router.put('/:requestId', requireAuth, validate(updateDeliverySchema), asyncHandler(updateDeliveryController));
router.delete('/:requestId', requireAuth, asyncHandler(deleteDeliveryController));
router.post('/:requestId/pay', requireAuth, asyncHandler(payDeliveryController));
router.post('/:requestId/confirm-pay', requireAuth, asyncHandler(confirmPayDeliveryController));
router.get('/:requestId/matches', requireAuth, asyncHandler(deliveryMatchesController));

export default router;
