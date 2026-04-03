import { Request, Response } from 'express';
import { getTransactions, handleWebhook } from '../services/payment.service';
import { ApiResponse } from '../utils/ApiResponse';

export async function razorpayWebhookController(req: Request, res: Response) {
  const signature = req.headers['x-razorpay-signature'] as string | undefined;
  const rawBody = req.body;
  const data = await handleWebhook(rawBody, signature);
  res.status(200).json(new ApiResponse('Webhook processed', data));
}

export async function transactionsController(req: Request, res: Response) {
  const data = await getTransactions(req.user!.id);
  res.status(200).json(new ApiResponse('Transactions fetched', data));
}
