import { Request, Response } from 'express';
import { createStandaloneOrder, getTransactions, handleWebhook, verifyStandalonePayment } from '../services/payment.service';
import { ApiResponse } from '../utils/ApiResponse';

export async function createOrderController(req: Request, res: Response) {
  const { amount, currency, receipt, notes } = req.body;

  if (amount === undefined || amount === null || typeof amount !== 'number' || amount < 100) {
    res.status(400).json({
      success: false,
      error: 'Invalid amount. Minimum amount is 100 paise (₹1).'
    });
    return;
  }

  try {
    const data = await createStandaloneOrder({ amount, currency, receipt, notes });
    res.status(200).json({
      success: true,
      order_id: data.order_id,
      amount: data.amount,
      currency: data.currency,
      receipt: data.receipt
    });
  } catch (err: any) {
    const status = err?.statusCode || 500;
    res.status(status).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create payment order'
    });
  }
}

export async function verifyPaymentController(req: Request, res: Response) {
  const order_id = req.body.razorpay_order_id || req.body.order_id || req.body.orderId;
  const payment_id = req.body.razorpay_payment_id || req.body.payment_id || req.body.paymentId;
  const signature = req.body.razorpay_signature || req.body.signature;

  if (!order_id || !payment_id || !signature) {
    res.status(400).json({
      success: false,
      error: 'Missing required payment verification fields (order_id, payment_id, signature)'
    });
    return;
  }

  try {
    const data = await verifyStandalonePayment({
      order_id,
      payment_id,
      signature
    });
    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      ...data
    });
  } catch (err: any) {
    const status = err?.statusCode || 400;
    res.status(status).json({
      success: false,
      error: err instanceof Error ? err.message : 'Payment signature verification failed'
    });
  }
}

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
