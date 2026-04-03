import { Router } from 'express';
import { noopWebhookController } from '../controllers/webhook.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/ping', asyncHandler(noopWebhookController));

export default router;
