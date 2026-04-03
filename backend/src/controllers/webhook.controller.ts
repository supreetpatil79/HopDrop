import { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse';

export async function noopWebhookController(_req: Request, res: Response) {
  res.status(200).json(new ApiResponse('Webhook route live'));
}
