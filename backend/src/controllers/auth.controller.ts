import { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import { logoutUser, refreshAuthToken, registerUser, sendOtp, verifyOtpLogin } from '../services/auth.service';

export async function sendOtpController(req: Request, res: Response) {
  const { phone } = req.body;
  const result = await sendOtp(phone);
  res.status(200).json(new ApiResponse('OTP sent', result));
}

export async function verifyOtpController(req: Request, res: Response) {
  const { phone, otp } = req.body;
  const result = await verifyOtpLogin(phone, otp);
  res.status(200).json(new ApiResponse('OTP verified', result));
}

export async function registerController(req: Request, res: Response) {
  const result = await registerUser(req.body);
  res.status(201).json(new ApiResponse('User registered successfully', result));
}

export async function loginController(req: Request, res: Response) {
  const { phone, otp } = req.body;
  const result = await verifyOtpLogin(phone, otp);
  res.status(200).json(new ApiResponse('Login successful', result));
}

export async function refreshController(req: Request, res: Response) {
  const { refreshToken } = req.body;
  const result = await refreshAuthToken(refreshToken);
  res.status(200).json(new ApiResponse('Token refreshed', result));
}

export async function logoutController(req: Request, res: Response) {
  await logoutUser(req.user!.id);
  res.status(200).json(new ApiResponse('Logged out successfully'));
}
