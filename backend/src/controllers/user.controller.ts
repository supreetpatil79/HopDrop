import { Request, Response } from 'express';
import { getMyProfile, getPublicProfile, getWallet, updateMyProfile, verifyGovernmentId } from '../services/user.service';
import { ApiResponse } from '../utils/ApiResponse';

export async function meController(req: Request, res: Response) {
  const data = await getMyProfile(req.user!.id);
  res.status(200).json(new ApiResponse('Profile fetched', data));
}

export async function updateMeController(req: Request, res: Response) {
  const data = await updateMyProfile(req.user!.id, req.body);
  res.status(200).json(new ApiResponse('Profile updated', data));
}

export async function verifyIdController(req: Request, res: Response) {
  const data = await verifyGovernmentId(req.user!.id, req.body);
  res.status(200).json(new ApiResponse('Government ID verified', data));
}

export async function walletController(req: Request, res: Response) {
  const data = await getWallet(req.user!.id);
  res.status(200).json(new ApiResponse('Wallet fetched', data));
}

export async function publicProfileController(req: Request, res: Response) {
  const data = await getPublicProfile(req.params.userId);
  res.status(200).json(new ApiResponse('Public profile fetched', data));
}
