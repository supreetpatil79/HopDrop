import { Request, Response } from 'express';
import {
  carrierAccept,
  carrierReject,
  disputeMatch,
  generateDeliveryOtp,
  generatePickupOtp,
  getMatchById,
  rateMatch,
  requestRapidoForMatch,
  senderConfirm,
  senderReject,
  verifyDeliveryOtpForMatch,
  verifyPickupOtpForMatch
} from '../services/match.service';
import { ApiResponse } from '../utils/ApiResponse';

export async function getMatchController(req: Request, res: Response) {
  const data = await getMatchById(req.params.matchId, req.user!.id);
  res.status(200).json(new ApiResponse('Match fetched', data));
}

export async function carrierAcceptController(req: Request, res: Response) {
  const data = await carrierAccept(req.params.matchId, req.user!.id);
  res.status(200).json(new ApiResponse('Match accepted by carrier', data));
}

export async function carrierRejectController(req: Request, res: Response) {
  const data = await carrierReject(req.params.matchId, req.user!.id);
  res.status(200).json(new ApiResponse('Match rejected by carrier', data));
}

export async function senderConfirmController(req: Request, res: Response) {
  const data = await senderConfirm(req.params.matchId, req.user!.id);
  res.status(200).json(new ApiResponse('Match confirmed by sender', data));
}

export async function senderRejectController(req: Request, res: Response) {
  const data = await senderReject(req.params.matchId, req.user!.id);
  res.status(200).json(new ApiResponse('Match rejected by sender', data));
}

export async function generatePickupOtpController(req: Request, res: Response) {
  const data = await generatePickupOtp(req.params.matchId, req.user!.id);
  res.status(200).json(new ApiResponse('Pickup OTP generated', data));
}

export async function verifyPickupOtpController(req: Request, res: Response) {
  const data = await verifyPickupOtpForMatch(req.params.matchId, req.user!.id, req.body.otp);
  res.status(200).json(new ApiResponse('Pickup OTP verified', data));
}

export async function generateDeliveryOtpController(req: Request, res: Response) {
  const data = await generateDeliveryOtp(req.params.matchId, req.user!.id);
  res.status(200).json(new ApiResponse('Delivery OTP generated', data));
}

export async function verifyDeliveryOtpController(req: Request, res: Response) {
  const data = await verifyDeliveryOtpForMatch(req.params.matchId, req.user!.id, req.body.otp);
  res.status(200).json(new ApiResponse('Delivery OTP verified', data));
}

export async function rateMatchController(req: Request, res: Response) {
  const data = await rateMatch(req.params.matchId, req.user!.id, req.body);
  res.status(200).json(new ApiResponse('Rating submitted', data));
}

export async function disputeMatchController(req: Request, res: Response) {
  const data = await disputeMatch(req.params.matchId, req.user!.id, req.body);
  res.status(200).json(new ApiResponse('Dispute created', data));
}

export async function requestRapidoController(req: Request, res: Response) {
  const data = await requestRapidoForMatch(req.params.matchId, req.user!.id, req.body);
  res.status(200).json(new ApiResponse('Rapido requested', data));
}
