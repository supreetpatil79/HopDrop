import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

function unauthorized(res: Response) {
  res.setHeader('WWW-Authenticate', 'Basic realm="Bull Board"');
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function bullBoardBasicAuth(req: Request, res: Response, next: NextFunction): void {
  if (!env.BULL_BOARD_PASSWORD) {
    next(new ApiError(503, 'Bull Board password is not configured'));
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Basic ')) {
    unauthorized(res);
    next(new ApiError(401, 'Bull Board authentication required'));
    return;
  }

  try {
    const decoded = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString('utf8');
    const separatorIndex = decoded.indexOf(':');
    const password = separatorIndex >= 0 ? decoded.slice(separatorIndex + 1) : '';

    if (!safeCompare(password, env.BULL_BOARD_PASSWORD)) {
      unauthorized(res);
      next(new ApiError(401, 'Invalid Bull Board credentials'));
      return;
    }

    next();
  } catch {
    unauthorized(res);
    next(new ApiError(401, 'Invalid Bull Board credentials'));
  }
}
