import { Request, Response } from 'express';
import {
  cancelTrip,
  confirmDeposit,
  createDepositOrder,
  createPreTripDepositOrder,
  createTrip,
  getTripById,
  listMyTrips,
  listTrips,
  updateTrip
} from '../services/trip.service';
import { ApiResponse } from '../utils/ApiResponse';
import { tripFilterSchema } from '../validators/trip.validators';

export async function createTripController(req: Request, res: Response) {
  const data = await createTrip(req.user!.id, req.body);
  res.status(201).json(new ApiResponse('Trip created', data));
}

export async function listTripsController(req: Request, res: Response) {
  const query = tripFilterSchema.parse(req.query);
  const data = await listTrips(query);
  res.status(200).json(new ApiResponse('Trips fetched', data));
}

export async function getTripController(req: Request, res: Response) {
  const data = await getTripById(req.params.tripId);
  res.status(200).json(new ApiResponse('Trip fetched', data));
}

export async function updateTripController(req: Request, res: Response) {
  const data = await updateTrip(req.user!.id, req.params.tripId, req.body);
  res.status(200).json(new ApiResponse('Trip updated', data));
}

export async function deleteTripController(req: Request, res: Response) {
  const data = await cancelTrip(req.user!.id, req.params.tripId);
  res.status(200).json(new ApiResponse('Trip cancelled', data));
}

export async function payDepositController(req: Request, res: Response) {
  const data = await createDepositOrder(req.user!.id, req.params.tripId);
  res.status(200).json(new ApiResponse('Deposit order created', data));
}

export async function preTripDepositOrderController(req: Request, res: Response) {
  const data = await createPreTripDepositOrder(req.user!.id);
  res.status(200).json(new ApiResponse('Pre-trip deposit order created', data));
}

export async function confirmDepositController(req: Request, res: Response) {
  const data = await confirmDeposit(req.user!.id, {
    tripId: req.params.tripId,
    razorpayOrderId: req.body.razorpayOrderId,
    razorpayPaymentId: req.body.razorpayPaymentId,
    razorpaySignature: req.body.razorpaySignature
  });
  res.status(200).json(new ApiResponse('Deposit confirmed', data));
}

export async function myTripsController(req: Request, res: Response) {
  const data = await listMyTrips(req.user!.id);
  res.status(200).json(new ApiResponse('My trips fetched', data));
}
