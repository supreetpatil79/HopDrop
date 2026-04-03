import { Request, Response } from 'express';
import {
  cancelRequest,
  confirmDeliveryPay,
  createDeliveryPaymentOrder,
  createDeliveryRequest,
  getRequestById,
  getRequestMatches,
  listAllRequests,
  listMyRequests,
  updateRequest
} from '../services/delivery.service';
import { ApiResponse } from '../utils/ApiResponse';

export async function createDeliveryController(req: Request, res: Response) {
  const data = await createDeliveryRequest(req.user!.id, req.body);
  res.status(201).json(new ApiResponse('Delivery request created', data));
}

export async function listDeliveriesController(_req: Request, res: Response) {
  const data = await listAllRequests();
  res.status(200).json(new ApiResponse('All delivery requests fetched', data));
}

export async function myDeliveriesController(req: Request, res: Response) {
  const data = await listMyRequests(req.user!.id);
  res.status(200).json(new ApiResponse('My delivery requests fetched', data));
}

export async function getDeliveryController(req: Request, res: Response) {
  const data = await getRequestById(req.user!.id, req.params.requestId);
  res.status(200).json(new ApiResponse('Delivery request fetched', data));
}

export async function updateDeliveryController(req: Request, res: Response) {
  const data = await updateRequest(req.user!.id, req.params.requestId, req.body);
  res.status(200).json(new ApiResponse('Delivery request updated', data));
}

export async function deleteDeliveryController(req: Request, res: Response) {
  const data = await cancelRequest(req.user!.id, req.params.requestId);
  res.status(200).json(new ApiResponse('Delivery request cancelled', data));
}

export async function payDeliveryController(req: Request, res: Response) {
  const data = await createDeliveryPaymentOrder(req.user!.id, req.params.requestId);
  res.status(200).json(new ApiResponse('Delivery payment order created', data));
}

export async function confirmPayDeliveryController(req: Request, res: Response) {
  const data = await confirmDeliveryPay(req.user!.id, {
    requestId: req.params.requestId,
    razorpayOrderId: req.body.razorpayOrderId,
    razorpayPaymentId: req.body.razorpayPaymentId,
    razorpaySignature: req.body.razorpaySignature
  });
  res.status(200).json(new ApiResponse('Delivery payment confirmed', data));
}

export async function deliveryMatchesController(req: Request, res: Response) {
  const data = await getRequestMatches(req.user!.id, req.params.requestId);
  res.status(200).json(new ApiResponse('Delivery matches fetched', data));
}
